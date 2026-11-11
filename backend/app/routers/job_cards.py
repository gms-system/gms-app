from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
import os, re, shutil, uuid

from app.database import get_db
from app.models.job_card import JobCard, JobCardStatus, JobCardStatusHistory, JobCardPhoto, JobCardTechnician
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.employee import Employee
from app.services.default_work import WorkType, WORK_TYPE_LABELS, default_work_items
from app.utils.dependencies import get_current_user, get_garage_id, require_manager, require_service_advisor
from app.utils.number_generator import generate_job_card_number, generate_customer_code
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


class QuickJobCardCreate(BaseModel):
    """Minimal job card from the voice / quick flow. Customer + vehicle are found or created."""
    customer_name: str = Field(min_length=1, max_length=200)
    mobile: str
    vehicle_make: str = Field(min_length=1, max_length=100)
    vehicle_model: str = Field(min_length=1, max_length=100)
    registration_number: str
    work_type: WorkType
    work_items: Optional[List[str]] = None
    source: Literal["voice", "quick"] = "voice"
    language: Optional[str] = None
    transcript: Optional[dict] = None

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        digits = digits.lstrip("0") if len(digits) == 11 else digits
        if not re.fullmatch(r"[6-9]\d{9}", digits):
            raise ValueError("Enter a valid 10-digit mobile number")
        return digits

    @field_validator("registration_number")
    @classmethod
    def _reg(cls, v: str) -> str:
        reg = re.sub(r"[^A-Za-z0-9]", "", v).upper()
        if not 4 <= len(reg) <= 13:
            raise ValueError("Enter a valid vehicle number")
        return reg


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
        "work_type": jc.work_type,
        "work_items": jc.work_items or [],
        "source": jc.source,
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


@router.get("/default-work")
async def get_default_work(
    work_type: WorkType,
    make: str = "",
    model: str = "",
    _: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Default work list for the quick / voice job card review screen."""
    return {"success": True, "data": {
        "work_type": work_type,
        "label": WORK_TYPE_LABELS[work_type],
        "items": await default_work_items(db, work_type, make, model),
    }}


@router.post("/quick", status_code=status.HTTP_201_CREATED)
async def create_quick_job_card(
    data: QuickJobCardCreate,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Voice / quick job card. Re-uses the vehicle if its number is already known
    (keeping its owner), else re-uses the customer by mobile, else creates both.
    """
    vehicle = (await db.execute(
        select(Vehicle).where(
            Vehicle.registration_number == data.registration_number,
            Vehicle.garage_id == garage_id, Vehicle.is_deleted == False,
        )
    )).scalar_one_or_none()
    existing_vehicle = vehicle is not None
    existing_customer = existing_vehicle

    if vehicle:
        customer = (await db.execute(select(Customer).where(Customer.id == vehicle.owner_id))).scalar_one()
    else:
        customer = (await db.execute(
            select(Customer).where(
                Customer.mobile == data.mobile, Customer.garage_id == garage_id, Customer.is_deleted == False,
            )
        )).scalar_one_or_none()
        existing_customer = customer is not None
        if not customer:
            customer = Customer(
                customer_code=await generate_customer_code(db),
                garage_id=garage_id, name=data.customer_name.strip(), mobile=data.mobile,
                created_by=current_user.id,
            )
            db.add(customer)
            await db.flush()
        vehicle = Vehicle(
            garage_id=garage_id, registration_number=data.registration_number,
            make=data.vehicle_make.strip(), model=data.vehicle_model.strip(),
            owner_id=customer.id, created_by=current_user.id,
        )
        db.add(vehicle)
        await db.flush()

    items = [i.strip() for i in (data.work_items or []) if i.strip()] \
        or await default_work_items(db, data.work_type, vehicle.make, vehicle.model)

    jc = JobCard(
        job_card_number=await generate_job_card_number(db),
        garage_id=garage_id, vehicle_id=vehicle.id, customer_id=customer.id,
        customer_complaint=WORK_TYPE_LABELS[data.work_type],
        work_type=data.work_type, work_items=items, source=data.source,
        voice_transcript={"language": data.language, "steps": data.transcript} if data.transcript else None,
        created_by=current_user.id,
    )
    db.add(jc)
    await db.flush()
    db.add(JobCardStatusHistory(
        job_card_id=jc.id, old_status=None, new_status=JobCardStatus.received, changed_by=current_user.id,
        notes="Job card created by voice" if data.source == "voice" else "Quick job card created",
    ))
    await db.flush()
    await db.refresh(jc)
    return {"success": True, "data": {
        **jc_to_dict(jc),
        "customer_name": customer.name, "customer_mobile": customer.mobile,
        "vehicle": {"registration_number": vehicle.registration_number, "make": vehicle.make, "model": vehicle.model},
        "existing_customer": existing_customer, "existing_vehicle": existing_vehicle,
    }}


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
