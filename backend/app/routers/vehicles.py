from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

import uuid
from app.database import get_db
from app.models.vehicle import Vehicle, FuelType, TransmissionType
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


class VehicleCreate(BaseModel):
    registration_number: str
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    make: str
    model: str
    variant: Optional[str] = None
    manufacturing_year: Optional[int] = None
    fuel_type: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    color: Optional[str] = None
    current_odometer: Optional[int] = None
    owner_id: str
    notes: Optional[str] = None


def vehicle_to_dict(v: Vehicle) -> dict:
    return {
        "id": str(v.id),
        "registration_number": v.registration_number,
        "chassis_number": v.chassis_number,
        "engine_number": v.engine_number,
        "make": v.make,
        "model": v.model,
        "variant": v.variant,
        "manufacturing_year": v.manufacturing_year,
        "fuel_type": v.fuel_type.value if v.fuel_type else None,
        "transmission": v.transmission.value if v.transmission else None,
        "color": v.color,
        "current_odometer": v.current_odometer,
        "owner_id": str(v.owner_id),
        "notes": v.notes,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("")
async def list_vehicles(
    search: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Vehicle).where(Vehicle.is_deleted == False, Vehicle.garage_id == garage_id)

    if search:
        query = query.where(
            or_(
                Vehicle.registration_number.ilike(f"%{search}%"),
                Vehicle.make.ilike(f"%{search}%"),
                Vehicle.model.ilike(f"%{search}%"),
            )
        )
    if owner_id:
        query = query.where(Vehicle.owner_id == owner_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Vehicle.registration_number).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    vehicles = result.scalars().all()

    return {
        "success": True,
        "data": [vehicle_to_dict(v) for v in vehicles],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: VehicleCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Vehicle).where(
            Vehicle.registration_number == data.registration_number.upper(),
            Vehicle.is_deleted == False,
            Vehicle.garage_id == garage_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle with this registration number already exists")

    vehicle = Vehicle(
        registration_number=data.registration_number.upper(),
        chassis_number=data.chassis_number,
        engine_number=data.engine_number,
        make=data.make,
        model=data.model,
        variant=data.variant,
        manufacturing_year=data.manufacturing_year,
        fuel_type=data.fuel_type,
        transmission=data.transmission,
        color=data.color,
        current_odometer=data.current_odometer,
        owner_id=data.owner_id,
        notes=data.notes,
        garage_id=garage_id,
        created_by=current_user.id,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return {"success": True, "data": vehicle_to_dict(vehicle)}


@router.get("/{vehicle_id}")
async def get_vehicle(
    vehicle_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False, Vehicle.garage_id == garage_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return {"success": True, "data": vehicle_to_dict(vehicle)}


@router.put("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    data: VehicleCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False, Vehicle.garage_id == garage_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    vehicle.updated_at = datetime.utcnow()
    return {"success": True, "data": vehicle_to_dict(vehicle)}


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False, Vehicle.garage_id == garage_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    vehicle.is_deleted = True
    return {"success": True, "message": "Vehicle deleted"}
