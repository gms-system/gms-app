from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime, timedelta

import uuid
from app.database import get_db
from app.models.attendance import Attendance, AttendanceStatus, LeaveType
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager

router = APIRouter(prefix="/attendance", tags=["Attendance"])


class AttendanceMark(BaseModel):
    employee_id: str
    attendance_date: date
    status: AttendanceStatus
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    leave_type: Optional[LeaveType] = None
    notes: Optional[str] = None


def att_to_dict(a: Attendance) -> dict:
    working_hours = None
    if a.punch_in and a.punch_out:
        diff = (a.punch_out - a.punch_in).total_seconds() / 3600
        working_hours = round(diff, 2)
    return {
        "id": str(a.id),
        "employee_id": str(a.employee_id),
        "attendance_date": a.attendance_date.isoformat(),
        "status": a.status.value,
        "punch_in": a.punch_in.isoformat() if a.punch_in else None,
        "punch_out": a.punch_out.isoformat() if a.punch_out else None,
        "working_hours": working_hours,
        "leave_type": a.leave_type.value if a.leave_type else None,
        "notes": a.notes,
    }


@router.get("/today")
async def today_summary(
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    result = await db.execute(
        select(Attendance).where(Attendance.attendance_date == today, Attendance.garage_id == garage_id)
    )
    records = result.scalars().all()
    summary = {
        "present": sum(1 for r in records if r.status == AttendanceStatus.present),
        "absent": sum(1 for r in records if r.status == AttendanceStatus.absent),
        "half_day": sum(1 for r in records if r.status == AttendanceStatus.half_day),
        "leave": sum(1 for r in records if r.status == AttendanceStatus.leave),
        "records": [att_to_dict(r) for r in records],
    }
    return {"success": True, "data": summary}


@router.get("")
async def list_attendance(
    employee_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(31, ge=1, le=100),
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Attendance).where(Attendance.garage_id == garage_id)
    if employee_id:
        query = query.where(Attendance.employee_id == employee_id)
    if from_date:
        query = query.where(Attendance.attendance_date >= from_date)
    if to_date:
        query = query.where(Attendance.attendance_date <= to_date)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Attendance.attendance_date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    return {
        "success": True,
        "data": [att_to_dict(r) for r in records],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    data: AttendanceMark,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Attendance).where(
            Attendance.employee_id == data.employee_id,
            Attendance.attendance_date == data.attendance_date,
            Attendance.garage_id == garage_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance already marked for this date")

    record = Attendance(marked_by=current_user.id, garage_id=garage_id, **data.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return {"success": True, "data": att_to_dict(record)}


@router.put("/{attendance_id}")
async def update_attendance(
    attendance_id: str,
    data: AttendanceMark,
    current_user: Employee = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    record.updated_at = datetime.utcnow()
    return {"success": True, "data": att_to_dict(record)}
