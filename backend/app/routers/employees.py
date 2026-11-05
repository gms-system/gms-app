from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

import uuid
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.utils.dependencies import get_current_user, get_garage_id, require_manager, require_owner
from app.utils.security import hash_password
from app.utils.number_generator import generate_employee_code

router = APIRouter(prefix="/employees", tags=["Employees"])


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    role: EmployeeRole
    password: Optional[str] = None
    date_of_joining: Optional[date] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    salary: Optional[float] = None


def emp_to_dict(e: Employee, include_sensitive: bool = False) -> dict:
    data = {
        "id": str(e.id),
        "employee_code": e.employee_code,
        "first_name": e.first_name,
        "last_name": e.last_name,
        "full_name": e.full_name,
        "mobile": e.mobile,
        "email": e.email,
        "role": e.role.value,
        "date_of_joining": e.date_of_joining.isoformat() if e.date_of_joining else None,
        "is_active": e.is_active,
        "last_login": e.last_login.isoformat() if e.last_login else None,
        "avatar_url": e.avatar_url,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
    if include_sensitive:
        data.update({
            "address": e.address,
            "city": e.city,
            "salary": float(e.salary) if e.salary else None,
            "aadhaar_number": e.aadhaar_number,
            "pan_number": e.pan_number,
            "date_of_birth": e.date_of_birth.isoformat() if e.date_of_birth else None,
        })
    return data


@router.get("")
async def list_employees(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Employee).where(Employee.is_deleted == False, Employee.garage_id == garage_id)
    if search:
        from sqlalchemy import or_
        query = query.where(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.mobile.ilike(f"%{search}%"),
            )
        )
    if role:
        query = query.where(Employee.role == role)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    query = query.order_by(Employee.first_name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    employees = result.scalars().all()

    return {
        "success": True,
        "data": [emp_to_dict(e) for e in employees],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    current_user: Employee = Depends(require_owner),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Employee).where(Employee.mobile == data.mobile, Employee.is_deleted == False, Employee.garage_id == garage_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee with this mobile already exists")

    code = await generate_employee_code(db)
    emp_data = data.model_dump(exclude={"password"})
    password_hash = hash_password(data.password) if data.password else hash_password("Password@123")

    employee = Employee(employee_code=code, garage_id=garage_id, password_hash=password_hash, **emp_data)
    db.add(employee)
    await db.flush()
    await db.refresh(employee)
    return {"success": True, "data": emp_to_dict(employee, include_sensitive=True)}


@router.get("/{employee_id}")
async def get_employee(
    employee_id: str,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False, Employee.garage_id == garage_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return {"success": True, "data": emp_to_dict(employee, include_sensitive=True)}


@router.put("/{employee_id}")
async def update_employee(
    employee_id: str,
    data: EmployeeCreate,
    current_user: Employee = Depends(require_owner),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False, Employee.garage_id == garage_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    update_data = data.model_dump(exclude={"password"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)
    if data.password:
        employee.password_hash = hash_password(data.password)
    employee.updated_at = datetime.utcnow()
    return {"success": True, "data": emp_to_dict(employee, include_sensitive=True)}


@router.patch("/{employee_id}/deactivate")
async def deactivate_employee(
    employee_id: str,
    current_user: Employee = Depends(require_owner),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False, Employee.garage_id == garage_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    employee.is_active = False
    return {"success": True, "message": "Employee deactivated"}


@router.patch("/{employee_id}/reactivate")
async def reactivate_employee(
    employee_id: str,
    current_user: Employee = Depends(require_owner),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False, Employee.garage_id == garage_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    employee.is_active = True
    return {"success": True, "message": "Employee reactivated"}
