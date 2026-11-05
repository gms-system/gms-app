from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

import uuid
from app.database import get_db
from app.models.inventory import InventoryItem, ItemCategory, StockMovement, StockMovementType
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager, require_store_manager
from app.utils.number_generator import generate_sku

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class ItemCreate(BaseModel):
    name: str
    category: ItemCategory
    part_number: Optional[str] = None
    brand: Optional[str] = None
    unit_of_measure: str = "pcs"
    current_stock: Decimal = Decimal("0")
    min_stock_level: Decimal = Decimal("0")
    purchase_price: Decimal = Decimal("0")
    selling_price: Decimal = Decimal("0")
    hsn_code: Optional[str] = None
    gst_rate: Decimal = Decimal("18")
    rack_location: Optional[str] = None
    preferred_supplier_id: Optional[str] = None


class StockAdjustRequest(BaseModel):
    quantity: Decimal
    notes: Optional[str] = None


def item_to_dict(item: InventoryItem) -> dict:
    return {
        "id": str(item.id),
        "sku": item.sku,
        "part_number": item.part_number,
        "name": item.name,
        "category": item.category.value,
        "brand": item.brand,
        "unit_of_measure": item.unit_of_measure,
        "current_stock": float(item.current_stock),
        "min_stock_level": float(item.min_stock_level),
        "purchase_price": float(item.purchase_price),
        "selling_price": float(item.selling_price),
        "hsn_code": item.hsn_code,
        "gst_rate": float(item.gst_rate),
        "rack_location": item.rack_location,
        "is_active": item.is_active,
        "is_low_stock": item.is_low_stock,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("")
async def list_items(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(InventoryItem).where(InventoryItem.is_deleted == False, InventoryItem.is_active == True, InventoryItem.garage_id == garage_id)

    if search:
        query = query.where(
            or_(
                InventoryItem.name.ilike(f"%{search}%"),
                InventoryItem.sku.ilike(f"%{search}%"),
                InventoryItem.part_number.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.where(InventoryItem.category == category)
    if low_stock:
        query = query.where(InventoryItem.current_stock <= InventoryItem.min_stock_level)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(InventoryItem.name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "success": True,
        "data": [item_to_dict(i) for i in items],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.get("/low-stock")
async def get_low_stock(
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.is_deleted == False,
            InventoryItem.is_active == True,
            InventoryItem.current_stock <= InventoryItem.min_stock_level,
            InventoryItem.garage_id == garage_id,
        ).order_by(InventoryItem.name)
    )
    items = result.scalars().all()
    return {"success": True, "data": [item_to_dict(i) for i in items]}


@router.get("/search")
async def search_items(
    q: str = Query(..., min_length=1),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem)
        .where(
            InventoryItem.is_deleted == False,
            InventoryItem.is_active == True,
            InventoryItem.garage_id == garage_id,
            or_(
                InventoryItem.name.ilike(f"%{q}%"),
                InventoryItem.sku.ilike(f"%{q}%"),
                InventoryItem.part_number.ilike(f"%{q}%"),
            ),
        )
        .limit(20)
    )
    items = result.scalars().all()
    return {"success": True, "data": [item_to_dict(i) for i in items]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemCreate,
    current_user: Employee = Depends(require_store_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    sku = await generate_sku(db)
    item = InventoryItem(sku=sku, garage_id=garage_id, created_by=current_user.id, **data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return {"success": True, "data": item_to_dict(item)}


@router.get("/{item_id}")
async def get_item(
    item_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.is_deleted == False, InventoryItem.garage_id == garage_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"success": True, "data": item_to_dict(item)}


@router.put("/{item_id}")
async def update_item(
    item_id: str,
    data: ItemCreate,
    current_user: Employee = Depends(require_store_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.is_deleted == False, InventoryItem.garage_id == garage_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    item.updated_at = datetime.utcnow()
    return {"success": True, "data": item_to_dict(item)}


@router.post("/{item_id}/adjust")
async def adjust_stock(
    item_id: str,
    data: StockAdjustRequest,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.is_deleted == False, InventoryItem.garage_id == garage_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    before = item.current_stock
    item.current_stock += data.quantity
    if item.current_stock < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock cannot go below zero")

    movement = StockMovement(
        inventory_item_id=item.id,
        movement_type=StockMovementType.adjustment,
        quantity=data.quantity,
        quantity_before=before,
        quantity_after=item.current_stock,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(movement)
    return {"success": True, "data": item_to_dict(item)}


@router.get("/{item_id}/movements")
async def get_movements(
    item_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(StockMovement).where(StockMovement.inventory_item_id == item_id)
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(StockMovement.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    movements = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(m.id),
                "movement_type": m.movement_type.value,
                "quantity": float(m.quantity),
                "quantity_before": float(m.quantity_before),
                "quantity_after": float(m.quantity_after),
                "notes": m.notes,
                "created_at": m.created_at.isoformat(),
            }
            for m in movements
        ],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }
