from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

import uuid
from app.database import get_db
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.job_card import JobCard
from app.models.invoice import Invoice
from app.models.job_card import JobCard
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager
from app.utils.number_generator import generate_customer_code

router = APIRouter(prefix="/customers", tags=["Customers"])


class CustomerCreate(BaseModel):
    name: str
    mobile: str
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(CustomerCreate):
    pass


def customer_to_dict(c: Customer) -> dict:
    return {
        "id": str(c.id),
        "customer_code": c.customer_code,
        "name": c.name,
        "mobile": c.mobile,
        "alternate_mobile": c.alternate_mobile,
        "email": c.email,
        "address": c.address,
        "city": c.city,
        "gstin": c.gstin,
        "pan_number": c.pan_number,
        "notes": c.notes,
        "outstanding_balance": float(c.outstanding_balance),
        "lifetime_spending": float(c.lifetime_spending),
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("")
async def list_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Customer).where(Customer.is_deleted == False, Customer.garage_id == garage_id)

    if search:
        query = query.where(
            or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.mobile.ilike(f"%{search}%"),
                Customer.customer_code.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    # Paginate
    query = query.order_by(Customer.name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    customers = result.scalars().all()

    return {
        "success": True,
        "data": [customer_to_dict(c) for c in customers],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate mobile within same garage
    existing = await db.execute(
        select(Customer).where(Customer.mobile == data.mobile, Customer.is_deleted == False, Customer.garage_id == garage_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A customer with this mobile already exists")

    code = await generate_customer_code(db)
    customer = Customer(
        customer_code=code,
        garage_id=garage_id,
        created_by=current_user.id,
        **data.model_dump(),
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return {"success": True, "data": customer_to_dict(customer)}


@router.get("/{customer_id}")
async def get_customer(
    customer_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.is_deleted == False, Customer.garage_id == garage_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return {"success": True, "data": customer_to_dict(customer)}


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.is_deleted == False, Customer.garage_id == garage_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    customer.updated_at = datetime.utcnow()

    return {"success": True, "data": customer_to_dict(customer)}


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.is_deleted == False, Customer.garage_id == garage_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    customer.is_deleted = True
    return {"success": True, "message": "Customer deleted"}


@router.get("/{customer_id}/history")
async def get_customer_history(
    customer_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    """Return full history: customer info + vehicles + job cards + invoices."""
    # Customer
    cust_res = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.is_deleted == False, Customer.garage_id == garage_id)
    )
    customer = cust_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    # Vehicles
    veh_res = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == customer_id, Vehicle.is_deleted == False, Vehicle.garage_id == garage_id)
    )
    vehicles = veh_res.scalars().all()

    # Job cards
    jc_res = await db.execute(
        select(JobCard)
        .where(JobCard.customer_id == customer_id, JobCard.is_deleted == False, JobCard.garage_id == garage_id)
        .order_by(JobCard.created_at.desc())
    )
    job_cards = jc_res.scalars().all()

    # Invoices
    inv_res = await db.execute(
        select(Invoice)
        .where(Invoice.customer_id == customer_id, Invoice.is_cancelled == False, Invoice.garage_id == garage_id)
        .order_by(Invoice.invoice_date.desc())
    )
    invoices = inv_res.scalars().all()

    return {
        "success": True,
        "data": {
            "customer": customer_to_dict(customer),
            "vehicles": [
                {
                    "id": str(v.id),
                    "registration_number": v.registration_number,
                    "make": v.make,
                    "model": v.model,
                    "variant": v.variant,
                    "fuel_type": v.fuel_type.value if v.fuel_type else None,
                    "color": v.color,
                    "manufacturing_year": v.manufacturing_year,
                }
                for v in vehicles
            ],
            "job_cards": [
                {
                    "id": str(jc.id),
                    "job_card_number": jc.job_card_number,
                    "status": jc.status.value,
                    "customer_complaint": jc.customer_complaint,
                    "created_at": jc.created_at.isoformat() if jc.created_at else None,
                    "actual_delivery_date": jc.actual_delivery_date.isoformat() if jc.actual_delivery_date else None,
                }
                for jc in job_cards
            ],
            "invoices": [
                {
                    "id": str(inv.id),
                    "invoice_number": inv.invoice_number,
                    "invoice_date": inv.invoice_date.isoformat(),
                    "grand_total": float(inv.grand_total),
                    "amount_paid": float(inv.amount_paid),
                    "amount_due": float(inv.amount_due),
                }
                for inv in invoices
            ],
            "summary": {
                "total_visits": len(job_cards),
                "total_invoiced": float(sum(inv.grand_total for inv in invoices)),
                "total_paid": float(sum(inv.amount_paid for inv in invoices)),
                "total_outstanding": float(sum(inv.amount_due for inv in invoices)),
                "lifetime_spending": float(customer.lifetime_spending),
            },
        },
    }


@router.get("/{customer_id}/vehicles")
async def get_customer_vehicles(
    customer_id: str,
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == customer_id, Vehicle.is_deleted == False)
    )
    vehicles = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(v.id),
                "registration_number": v.registration_number,
                "make": v.make,
                "model": v.model,
                "variant": v.variant,
                "fuel_type": v.fuel_type.value if v.fuel_type else None,
                "color": v.color,
                "manufacturing_year": v.manufacturing_year,
            }
            for v in vehicles
        ],
    }
