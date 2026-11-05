from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date
import os, shutil, uuid

from app.database import get_db
from app.models.job_card import JobCard, JobCardStatus, JobCardStatusHistory, JobCardPhoto, JobCardTechnician
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager, require_service_advisor
from app.utils.number_generator import generate_job_card_number
from app.config import settings

router = APIRouter(prefix="/job-cards", tags=["Job Cards"])


class JobCardCreate(BaseModel):
    vehicle_id: str
    customer_id: str
    service_advisor_id: Optional[str] = None
    customer_complaint: Optional[str] = None
    inspection_notes: Optional[str] = None
    odometer_in: Optional[int] = None
    expected_delivery_date: Optional[date] = None
    internal_notes: Optional[str] = None


class StatusChangeRequest(BaseModel):
    status: JobCardStatus
    notes: Optional[str] = None


def jc_to_dict(jc: JobCard) -> dict:
    return {
        "id": str(jc.id),
        "job_card_number": jc.job_card_number,
        "vehicle_id": str(jc.vehicle_id),
        "customer_id": str(jc.customer_id),
        "service_advisor_id": str(jc.service_advisor_id) if jc.service_advisor_id else None,
        "status": jc.status.value,
        "customer_complaint": jc.customer_complaint,
        "inspection_notes": jc.inspection_notes,
        "odometer_in": jc.odometer_in,
        "odometer_out": jc.odometer_out,
        "expected_delivery_date": jc.expected_delivery_date.isoformat() if jc.expected_delivery_date else None,
        "actual_delivery_date": jc.actual_delivery_date.isoformat() if jc.actual_delivery_date else None,
        "internal_notes": jc.internal_notes,
        "created_at": jc.created_at.isoformat() if jc.created_at else None,
        "updated_at": jc.updated_at.isoformat() if jc.updated_at else None,
    }


@router.get("")
async def list_job_cards(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(JobCard).where(JobCard.is_deleted == False, JobCard.garage_id == garage_id)

    if search:
        query = query.where(JobCard.job_card_number.ilike(f"%{search}%"))
    if status:
        query = query.where(JobCard.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(JobCard.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    job_cards = result.scalars().all()

    return {
        "success": True,
        "data": [jc_to_dict(jc) for jc in job_cards],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_job_card(
    data: JobCardCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    number = await generate_job_card_number(db)
    jc = JobCard(
        job_card_number=number,
        garage_id=garage_id,
        created_by=current_user.id,
        **data.model_dump(),
    )
    db.add(jc)
    await db.flush()

    # Initial status history
    history = JobCardStatusHistory(
        job_card_id=jc.id,
        old_status=None,
        new_status=JobCardStatus.received,
        changed_by=current_user.id,
        notes="Job card created",
    )
    db.add(history)
    await db.flush()
    await db.refresh(jc)
    return {"success": True, "data": jc_to_dict(jc)}


@router.get("/{job_card_id}")
async def get_job_card(
    job_card_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCard)
        .options(
            selectinload(JobCard.status_history),
            selectinload(JobCard.photos),
            selectinload(JobCard.technicians),
        )
        .where(JobCard.id == job_card_id, JobCard.is_deleted == False, JobCard.garage_id == garage_id)
    )
    jc = result.scalar_one_or_none()
    if not jc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")

    data = jc_to_dict(jc)
    data["photos"] = [
        {
            "id": str(p.id),
            "photo_type": p.photo_type,
            "file_path": p.file_path,
            "file_name": p.file_name,
            "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
        }
        for p in jc.photos
    ]
    data["technicians"] = [
        {"technician_id": str(t.technician_id), "assigned_at": t.assigned_at.isoformat()}
        for t in jc.technicians
    ]
    data["status_history"] = [
        {
            "old_status": h.old_status.value if h.old_status else None,
            "new_status": h.new_status.value,
            "notes": h.notes,
            "changed_at": h.changed_at.isoformat(),
        }
        for h in jc.status_history
    ]
    return {"success": True, "data": data}


@router.put("/{job_card_id}")
async def update_job_card(
    job_card_id: str,
    data: JobCardCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCard).where(JobCard.id == job_card_id, JobCard.is_deleted == False, JobCard.garage_id == garage_id)
    )
    jc = result.scalar_one_or_none()
    if not jc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(jc, key, value)
    jc.updated_at = datetime.utcnow()
    return {"success": True, "data": jc_to_dict(jc)}


@router.patch("/{job_card_id}/status")
async def change_status(
    job_card_id: str,
    data: StatusChangeRequest,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCard).where(JobCard.id == job_card_id, JobCard.is_deleted == False, JobCard.garage_id == garage_id)
    )
    jc = result.scalar_one_or_none()
    if not jc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")

    old_status = jc.status
    jc.status = data.status
    jc.updated_at = datetime.utcnow()

    if data.status == JobCardStatus.delivered:
        jc.actual_delivery_date = datetime.utcnow()

    history = JobCardStatusHistory(
        job_card_id=jc.id,
        old_status=old_status,
        new_status=data.status,
        changed_by=current_user.id,
        notes=data.notes,
    )
    db.add(history)
    return {"success": True, "data": jc_to_dict(jc)}


@router.post("/{job_card_id}/photos")
async def upload_photo(
    job_card_id: str,
    photo_type: str = Query("before"),
    file: UploadFile = File(...),
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCard).where(JobCard.id == job_card_id, JobCard.is_deleted == False)
    )
    jc = result.scalar_one_or_none()
    if not jc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found")

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG, PNG, WebP files are allowed")

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, "job-cards", job_card_id)
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    relative_path = f"/uploads/job-cards/{job_card_id}/{filename}"
    photo = JobCardPhoto(
        job_card_id=jc.id,
        photo_type=photo_type,
        file_path=relative_path,
        file_name=file.filename,
        file_size=file.size,
        uploaded_by=current_user.id,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    return {"success": True, "data": {"id": str(photo.id), "file_path": relative_path}}


@router.delete("/{job_card_id}/photos/{photo_id}")
async def delete_photo(
    job_card_id: str,
    photo_id: str,
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCardPhoto).where(JobCardPhoto.id == photo_id, JobCardPhoto.job_card_id == job_card_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    # Delete file
    full_path = photo.file_path.replace("/uploads", settings.UPLOAD_DIR)
    if os.path.exists(full_path):
        os.remove(full_path)

    await db.delete(photo)
    return {"success": True, "message": "Photo deleted"}
