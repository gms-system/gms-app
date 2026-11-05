from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from jose import JWTError

from app.database import get_db
from app.models.employee import Employee
from app.utils.security import verify_password, create_access_token, create_refresh_token, decode_token, hash_password
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    mobile: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Employee).where(Employee.mobile == data.mobile, Employee.is_deleted == False, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee or not employee.password_hash or not verify_password(data.password, employee.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mobile or password")

    token_data = {
        "sub": str(employee.id),
        "role": employee.role.value,
        "garage_id": str(employee.garage_id) if employee.garage_id else None,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Update last login
    await db.execute(
        update(Employee).where(Employee.id == employee.id).values(last_login=datetime.now(timezone.utc))
    )

    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=28800)
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=604800)

    return {
        "success": True,
        "data": {
            "id": str(employee.id),
            "name": employee.full_name,
            "role": employee.role.value,
            "mobile": employee.mobile,
            "garage_id": str(employee.garage_id) if employee.garage_id else None,
        }
    }


@router.post("/logout")
async def logout(response: Response, _: Employee = Depends(get_current_user)):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"success": True, "message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        employee_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False, Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_data = {
        "sub": str(employee.id),
        "role": employee.role.value,
        "garage_id": str(employee.garage_id) if employee.garage_id else None,
    }
    new_access_token = create_access_token(token_data)
    # Sliding session: also issue a fresh refresh token so an actively-used
    # app never expires mid-session (prevents unexpected logouts).
    new_refresh_token = create_refresh_token(token_data)
    response.set_cookie("access_token", new_access_token, httponly=True, samesite="lax", max_age=28800)
    response.set_cookie("refresh_token", new_refresh_token, httponly=True, samesite="lax", max_age=604800)

    return {"success": True, "message": "Token refreshed"}


@router.get("/me")
async def get_me(current_user: Employee = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "name": current_user.full_name,
            "role": current_user.role.value,
            "mobile": current_user.mobile,
            "email": current_user.email,
            "avatar_url": current_user.avatar_url,
            "garage_id": str(current_user.garage_id) if current_user.garage_id else None,
        }
    }


@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    await db.execute(
        update(Employee)
        .where(Employee.id == current_user.id)
        .values(password_hash=hash_password(data.new_password))
    )
    return {"success": True, "message": "Password changed successfully"}
