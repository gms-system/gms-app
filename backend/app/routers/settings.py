from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal

from app.database import get_db
from app.models.settings import GarageSettings
from app.models.employee import Employee
from app.models.garage import Garage
from app.utils.dependencies import get_current_user, get_garage_id, require_owner
from datetime import date
import uuid

router = APIRouter(prefix="/settings", tags=["Settings"])


class GarageSettingsUpdate(BaseModel):
    garage_name: Optional[str] = None
    owner_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    invoice_prefix: Optional[str] = None
    job_card_prefix: Optional[str] = None
    default_gst_rate: Optional[Decimal] = None


def settings_to_dict(s: GarageSettings) -> dict:
    return {
        "id": str(s.id),
        "garage_name": s.garage_name,
        "owner_name": s.owner_name,
        "address": s.address,
        "city": s.city,
        "state": s.state,
        "pincode": s.pincode,
        "mobile": s.mobile,
        "email": s.email,
        "gstin": s.gstin,
        "pan": s.pan,
        "logo_url": s.logo_url,
        "invoice_prefix": s.invoice_prefix,
        "invoice_counter": s.invoice_counter,
        "job_card_prefix": s.job_card_prefix,
        "job_card_counter": s.job_card_counter,
        "default_gst_rate": float(s.default_gst_rate) if s.default_gst_rate else 18.0,
        "currency": s.currency,
        "timezone": s.timezone,
    }


@router.get("/garage")
async def get_garage_settings(
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GarageSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garage settings not found")
    return {"success": True, "data": settings_to_dict(settings)}


@router.put("/garage", dependencies=[Depends(require_owner)])
async def update_garage_settings(
    data: GarageSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GarageSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garage settings not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(settings, key, value)

    return {"success": True, "data": settings_to_dict(settings)}


@router.get("/subscription")
async def get_subscription_status(
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    """Return subscription details for the logged-in garage."""
    result = await db.execute(select(Garage).where(Garage.id == garage_id))
    garage = result.scalar_one_or_none()
    if not garage:
        return {"success": True, "data": None}

    today = date.today()
    days_left = None
    is_expired = False
    is_expiring_soon = False

    if garage.subscription_end:
        days_left = (garage.subscription_end - today).days
        is_expired = days_left < 0
        is_expiring_soon = 0 <= days_left <= 14

    return {
        "success": True,
        "data": {
            "plan": garage.plan,
            "is_active": garage.is_active,
            "garage_type": garage.garage_type,
            "subscription_start": garage.subscription_start.isoformat() if garage.subscription_start else None,
            "subscription_end": garage.subscription_end.isoformat() if garage.subscription_end else None,
            "days_left": days_left,
            "is_expired": is_expired,
            "is_expiring_soon": is_expiring_soon,
            "max_users": garage.max_users,
            "grace_period_days": garage.grace_period_days,
        },
    }
