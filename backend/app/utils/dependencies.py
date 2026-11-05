import uuid
from fastapi import Depends, HTTPException, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from jose import JWTError
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.models.super_admin import SuperAdmin
from app.utils.security import decode_token


# ---------------------------------------------------------------------------
# Garage employee auth
# ---------------------------------------------------------------------------

async def get_current_user(
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not access_token:
        raise credentials_exception
    try:
        payload = decode_token(access_token)
        employee_id: str = payload.get("sub")
        if employee_id is None or payload.get("type") != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,
            Employee.is_active == True,
        )
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise credentials_exception
    return employee


def get_garage_id(current_user: Employee = Depends(get_current_user)) -> uuid.UUID:
    """Extracts garage_id from the logged-in employee. Used by all routers."""
    if current_user.garage_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee is not associated with a garage",
        )
    return current_user.garage_id


def require_role(*roles: EmployeeRole):
    async def role_checker(current_user: Employee = Depends(get_current_user)) -> Employee:
        if current_user.role not in roles and current_user.role != EmployeeRole.owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker


# Convenience role dependencies
require_owner          = require_role(EmployeeRole.owner)
require_manager        = require_role(EmployeeRole.owner, EmployeeRole.manager)
require_service_advisor = require_role(
    EmployeeRole.owner, EmployeeRole.manager, EmployeeRole.service_advisor
)
require_store_manager  = require_role(
    EmployeeRole.owner, EmployeeRole.manager, EmployeeRole.store_manager
)
require_any = get_current_user


# ---------------------------------------------------------------------------
# Super Admin auth (separate token type)
# ---------------------------------------------------------------------------

async def get_super_admin(
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> SuperAdmin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Super admin authentication required",
    )
    if not access_token:
        raise credentials_exception
    try:
        payload = decode_token(access_token)
        admin_id: str = payload.get("sub")
        if admin_id is None or payload.get("type") != "super_admin_access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(SuperAdmin).where(SuperAdmin.id == admin_id, SuperAdmin.is_active == True)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise credentials_exception
    return admin
