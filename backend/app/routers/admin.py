"""
Super Admin Router — /api/admin/*
Used by the product owner to manage all garages.
Completely separate from garage employee auth.
"""
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone, date
import uuid

from app.database import get_db
from app.models.super_admin import SuperAdmin
from app.models.garage import Garage
from app.models.employee import Employee, EmployeeRole
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.job_card import JobCard, JobCardStatus
from app.models.invoice import Invoice
from app.models.estimate import Estimate
from app.models.inventory import InventoryItem
from app.utils.dependencies import get_super_admin
from app.utils.security import verify_password, hash_password, create_super_admin_token
from app.routers.customers import customer_to_dict
from app.routers.vehicles import vehicle_to_dict
from app.routers.job_cards import jc_to_dict
from app.routers.invoices import inv_to_dict
from app.routers.inventory import item_to_dict

router = APIRouter(prefix="/admin", tags=["Super Admin"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class GarageCreate(BaseModel):
    name: str
    owner_name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    garage_type: str = "4_wheeler"
    plan: str = "basic"
    max_users: int = 5
    subscription_start: Optional[date] = None
    subscription_end: Optional[date] = None
    notes: Optional[str] = None
    # First owner account details
    owner_password: str = "Admin@123"


class GarageUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    garage_type: Optional[str] = None
    plan: Optional[str] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None
    subscription_start: Optional[date] = None
    subscription_end: Optional[date] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@router.post("/auth/login")
async def admin_login(
    data: AdminLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SuperAdmin).where(SuperAdmin.email == data.email, SuperAdmin.is_active == True)
    )
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_super_admin_token({"sub": str(admin.id), "role": "super_admin"})
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=43200)

    await db.execute(
        update(SuperAdmin).where(SuperAdmin.id == admin.id).values(last_login=datetime.now(timezone.utc))
    )

    return {
        "success": True,
        "data": admin.to_dict(),
    }


@router.post("/auth/logout")
async def admin_logout(response: Response, _: SuperAdmin = Depends(get_super_admin)):
    response.delete_cookie("access_token")
    return {"success": True, "message": "Logged out"}


@router.get("/auth/me")
async def admin_me(admin: SuperAdmin = Depends(get_super_admin)):
    return {"success": True, "data": admin.to_dict()}


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def admin_dashboard(
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count()).select_from(Garage))
    total_garages = total_result.scalar()

    active_result = await db.execute(select(func.count()).select_from(Garage).where(Garage.is_active == True))
    active_garages = active_result.scalar()

    today = date.today()
    expiring_result = await db.execute(
        select(func.count()).select_from(Garage).where(
            Garage.is_active == True,
            Garage.subscription_end != None,
            Garage.subscription_end <= date(today.year, today.month + 1 if today.month < 12 else 1, today.day),
        )
    )
    expiring_soon = expiring_result.scalar()

    return {
        "success": True,
        "data": {
            "total_garages": total_garages,
            "active_garages": active_garages,
            "inactive_garages": total_garages - active_garages,
            "expiring_soon": expiring_soon,
        }
    }


# ---------------------------------------------------------------------------
# Garages CRUD
# ---------------------------------------------------------------------------

@router.get("/garages")
async def list_garages(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Garage)
    if search:
        query = query.where(
            Garage.name.ilike(f"%{search}%") | Garage.mobile.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.where(Garage.is_active == is_active)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Garage.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    garages = result.scalars().all()

    return {
        "success": True,
        "data": [g.to_dict() for g in garages],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("/garages", status_code=status.HTTP_201_CREATED)
async def create_garage(
    data: GarageCreate,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate mobile
    existing = await db.execute(select(Garage).where(Garage.mobile == data.mobile))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A garage with this mobile already exists")

    # Create garage
    garage = Garage(
        name=data.name,
        owner_name=data.owner_name,
        mobile=data.mobile,
        email=data.email,
        address=data.address,
        city=data.city,
        state=data.state,
        gstin=data.gstin,
        garage_type=data.garage_type,
        plan=data.plan,
        max_users=data.max_users,
        subscription_start=data.subscription_start,
        subscription_end=data.subscription_end,
        notes=data.notes,
        is_active=True,
    )
    db.add(garage)
    await db.flush()

    # Create owner employee account for this garage
    employee_count = await db.execute(select(func.count()).select_from(Employee))
    count = employee_count.scalar() or 0
    emp_code = f"EMP-{str(count + 1).zfill(4)}"

    owner = Employee(
        garage_id=garage.id,
        employee_code=emp_code,
        first_name=data.owner_name.split()[0] if data.owner_name else "Owner",
        last_name=" ".join(data.owner_name.split()[1:]) if data.owner_name and len(data.owner_name.split()) > 1 else None,
        mobile=data.mobile,
        role=EmployeeRole.owner,
        password_hash=hash_password(data.owner_password),
        is_active=True,
    )
    db.add(owner)
    await db.flush()
    await db.refresh(garage)

    return {
        "success": True,
        "data": garage.to_dict(),
        "message": f"Garage created. Owner login — Mobile: {data.mobile}, Password: {data.owner_password}",
    }


@router.get("/garages/{garage_id}")
async def get_garage(
    garage_id: str,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Garage).where(Garage.id == garage_id))
    garage = result.scalar_one_or_none()
    if not garage:
        raise HTTPException(status_code=404, detail="Garage not found")

    # Get employee count
    emp_count_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.garage_id == garage_id, Employee.is_deleted == False
        )
    )
    emp_count = emp_count_result.scalar()

    data = garage.to_dict()
    data["employee_count"] = emp_count
    return {"success": True, "data": data}


@router.put("/garages/{garage_id}")
async def update_garage(
    garage_id: str,
    data: GarageUpdate,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Garage).where(Garage.id == garage_id))
    garage = result.scalar_one_or_none()
    if not garage:
        raise HTTPException(status_code=404, detail="Garage not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(garage, key, value)
    return {"success": True, "data": garage.to_dict()}


@router.patch("/garages/{garage_id}/toggle-active")
async def toggle_garage_active(
    garage_id: str,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Garage).where(Garage.id == garage_id))
    garage = result.scalar_one_or_none()
    if not garage:
        raise HTTPException(status_code=404, detail="Garage not found")
    garage.is_active = not garage.is_active
    action = "activated" if garage.is_active else "deactivated"
    return {"success": True, "message": f"Garage {action}", "is_active": garage.is_active}


@router.get("/garages/{garage_id}/employees")
async def get_garage_employees(
    garage_id: str,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.garage_id == garage_id, Employee.is_deleted == False)
        .order_by(Employee.role)
    )
    employees = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(e.id),
                "employee_code": e.employee_code,
                "full_name": e.full_name,
                "mobile": e.mobile,
                "role": e.role.value,
                "is_active": e.is_active,
                "last_login": e.last_login.isoformat() if e.last_login else None,
            }
            for e in employees
        ],
    }


# ---------------------------------------------------------------------------
# Garage data visibility — super admin can view every garage's business data
# ---------------------------------------------------------------------------

async def _get_garage_or_404(garage_id: str, db: AsyncSession) -> Garage:
    result = await db.execute(select(Garage).where(Garage.id == garage_id))
    garage = result.scalar_one_or_none()
    if not garage:
        raise HTTPException(status_code=404, detail="Garage not found")
    return garage


async def _paginate(db: AsyncSession, query, page: int, limit: int, serializer):
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    rows = result.scalars().all()
    return {
        "success": True,
        "data": [serializer(r) for r in rows],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.get("/garages/{garage_id}/overview")
async def get_garage_overview(
    garage_id: str,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate business snapshot of one garage (counts + revenue)."""
    await _get_garage_or_404(garage_id, db)

    async def count(stmt) -> int:
        return (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0

    customers = await count(select(Customer).where(Customer.garage_id == garage_id, Customer.is_deleted == False))
    vehicles = await count(select(Vehicle).where(Vehicle.garage_id == garage_id, Vehicle.is_deleted == False))
    employees = await count(select(Employee).where(Employee.garage_id == garage_id, Employee.is_deleted == False))
    estimates = await count(select(Estimate).where(Estimate.garage_id == garage_id))
    inventory_items = await count(select(InventoryItem).where(
        InventoryItem.garage_id == garage_id, InventoryItem.is_deleted == False, InventoryItem.is_active == True))
    low_stock = await count(select(InventoryItem).where(
        InventoryItem.garage_id == garage_id, InventoryItem.is_deleted == False, InventoryItem.is_active == True,
        InventoryItem.current_stock <= InventoryItem.min_stock_level))

    # Job cards by status
    jc_rows = await db.execute(
        select(JobCard.status, func.count()).where(JobCard.garage_id == garage_id, JobCard.is_deleted == False)
        .group_by(JobCard.status)
    )
    jc_by_status = {s.value: 0 for s in JobCardStatus}
    for status_val, cnt in jc_rows.all():
        jc_by_status[status_val.value if hasattr(status_val, "value") else str(status_val)] = cnt
    job_cards_total = sum(jc_by_status.values())
    open_job_cards = job_cards_total - jc_by_status.get("delivered", 0) - jc_by_status.get("cancelled", 0)

    # Invoice money
    inv_row = (await db.execute(
        select(
            func.count(),
            func.coalesce(func.sum(Invoice.grand_total), 0),
            func.coalesce(func.sum(Invoice.amount_paid), 0),
            func.coalesce(func.sum(Invoice.amount_due), 0),
        ).where(Invoice.garage_id == garage_id, Invoice.is_cancelled == False)
    )).one()
    inv_count, revenue, collected, outstanding = inv_row

    return {
        "success": True,
        "data": {
            "customers": customers,
            "vehicles": vehicles,
            "employees": employees,
            "estimates": estimates,
            "inventory_items": inventory_items,
            "low_stock_items": low_stock,
            "job_cards_total": job_cards_total,
            "job_cards_open": open_job_cards,
            "job_cards_by_status": jc_by_status,
            "invoices": inv_count,
            "revenue": float(revenue),
            "collected": float(collected),
            "outstanding": float(outstanding),
        },
    }


@router.get("/garages/{garage_id}/customers")
async def get_garage_customers(
    garage_id: str, page: int = 1, limit: int = 20, search: Optional[str] = None,
    admin: SuperAdmin = Depends(get_super_admin), db: AsyncSession = Depends(get_db),
):
    await _get_garage_or_404(garage_id, db)
    q = select(Customer).where(Customer.garage_id == garage_id, Customer.is_deleted == False)
    if search:
        q = q.where(Customer.name.ilike(f"%{search}%") | Customer.mobile.ilike(f"%{search}%"))
    return await _paginate(db, q.order_by(Customer.created_at.desc()), page, limit, customer_to_dict)


@router.get("/garages/{garage_id}/vehicles")
async def get_garage_vehicles(
    garage_id: str, page: int = 1, limit: int = 20, search: Optional[str] = None,
    admin: SuperAdmin = Depends(get_super_admin), db: AsyncSession = Depends(get_db),
):
    await _get_garage_or_404(garage_id, db)
    q = select(Vehicle).where(Vehicle.garage_id == garage_id, Vehicle.is_deleted == False)
    if search:
        q = q.where(Vehicle.registration_number.ilike(f"%{search}%"))
    return await _paginate(db, q.order_by(Vehicle.created_at.desc()), page, limit, vehicle_to_dict)


@router.get("/garages/{garage_id}/job-cards")
async def get_garage_job_cards(
    garage_id: str, page: int = 1, limit: int = 20, status: Optional[str] = None,
    admin: SuperAdmin = Depends(get_super_admin), db: AsyncSession = Depends(get_db),
):
    await _get_garage_or_404(garage_id, db)
    q = select(JobCard).where(JobCard.garage_id == garage_id, JobCard.is_deleted == False)
    if status:
        q = q.where(JobCard.status == status)
    return await _paginate(db, q.order_by(JobCard.created_at.desc()), page, limit, jc_to_dict)


@router.get("/garages/{garage_id}/invoices")
async def get_garage_invoices(
    garage_id: str, page: int = 1, limit: int = 20,
    admin: SuperAdmin = Depends(get_super_admin), db: AsyncSession = Depends(get_db),
):
    await _get_garage_or_404(garage_id, db)
    q = select(Invoice).where(Invoice.garage_id == garage_id)
    return await _paginate(db, q.order_by(Invoice.created_at.desc()), page, limit, inv_to_dict)


@router.get("/garages/{garage_id}/inventory")
async def get_garage_inventory(
    garage_id: str, page: int = 1, limit: int = 20, low_stock: bool = False,
    admin: SuperAdmin = Depends(get_super_admin), db: AsyncSession = Depends(get_db),
):
    await _get_garage_or_404(garage_id, db)
    q = select(InventoryItem).where(InventoryItem.garage_id == garage_id, InventoryItem.is_deleted == False)
    if low_stock:
        q = q.where(InventoryItem.current_stock <= InventoryItem.min_stock_level)
    return await _paginate(db, q.order_by(InventoryItem.name), page, limit, item_to_dict)


@router.post("/garages/{garage_id}/reset-owner-password")
async def reset_owner_password(
    garage_id: str,
    new_password: str,
    admin: SuperAdmin = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(
            Employee.garage_id == garage_id,
            Employee.role == EmployeeRole.owner,
            Employee.is_deleted == False,
        )
    )
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found for this garage")

    owner.password_hash = hash_password(new_password)
    return {"success": True, "message": f"Password reset. New password: {new_password}"}
