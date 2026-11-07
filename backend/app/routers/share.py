"""
Customer share links for invoices and job cards (WhatsApp "view link").

POST /share/{doc}/{doc_id}   : garage employee creates a signed link (180 days)
GET  /public/share/{token}   : no login; returns customer-safe data only
                               (no internal notes, cost prices or staff info)
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.garage import Garage
from app.models.invoice import Invoice
from app.models.job_card import JobCard
from app.utils.dependencies import get_garage_id

router = APIRouter(tags=["Share"])

Doc = Literal["invoice", "job_card"]
SHARE_TTL = timedelta(days=180)


def _sign(doc: str, doc_id: uuid.UUID, garage_id: uuid.UUID) -> str:
    payload = {
        "type": "share", "doc": doc, "id": str(doc_id), "gid": str(garage_id),
        "exp": datetime.now(timezone.utc) + SHARE_TTL,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def _load(db: AsyncSession, doc: str, doc_id: str, garage_id) -> Invoice | JobCard | None:
    if doc == "invoice":
        q = select(Invoice).options(
            selectinload(Invoice.items), selectinload(Invoice.customer), selectinload(Invoice.vehicle),
        ).where(Invoice.id == doc_id, Invoice.garage_id == garage_id)
    else:
        q = select(JobCard).options(
            selectinload(JobCard.customer), selectinload(JobCard.vehicle), selectinload(JobCard.status_history),
        ).where(JobCard.id == doc_id, JobCard.garage_id == garage_id, JobCard.is_deleted == False)
    return (await db.execute(q)).scalar_one_or_none()


@router.post("/share/{doc}/{doc_id}")
async def create_share_link(
    doc: Doc,
    doc_id: uuid.UUID,
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    obj = await _load(db, doc, str(doc_id), garage_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Document not found")
    token = _sign(doc, doc_id, garage_id)
    garage = (await db.execute(select(Garage).where(Garage.id == garage_id))).scalar_one_or_none()
    return {"success": True, "data": {
        "token": token,
        "path": f"/s/{token}",
        "garage_name": garage.name if garage else None,
        "customer_name": obj.customer.name if obj.customer else None,
        "customer_mobile": obj.customer.mobile if obj.customer else None,
    }}


def _vehicle(v) -> dict | None:
    return {"registration_number": v.registration_number, "make": v.make, "model": v.model} if v else None


@router.get("/public/share/{token}")
async def view_shared(token: str, db: AsyncSession = Depends(get_db)):
    try:
        p = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if p.get("type") != "share":
            raise JWTError()
    except JWTError:
        raise HTTPException(status_code=404, detail="This link is invalid or has expired")

    obj = await _load(db, p["doc"], p["id"], p["gid"])
    garage = (await db.execute(select(Garage).where(Garage.id == p["gid"]))).scalar_one_or_none()
    if not obj or not garage:
        raise HTTPException(status_code=404, detail="This link is invalid or has expired")

    data: dict = {
        "doc": p["doc"],
        "garage": {
            "name": garage.name, "mobile": garage.mobile, "email": garage.email,
            "address": garage.address, "city": garage.city, "state": garage.state, "gstin": garage.gstin,
        },
        "customer_name": obj.customer.name if obj.customer else None,
        "vehicle": _vehicle(obj.vehicle),
    }
    if p["doc"] == "invoice":
        inv: Invoice = obj
        data.update({
            "number": inv.invoice_number,
            "date": inv.invoice_date.isoformat(),
            "invoice_type": inv.invoice_type.value,
            "is_cancelled": inv.is_cancelled,
            "items": [{
                "description": i.description, "quantity": float(i.quantity), "unit_price": float(i.unit_price),
                "discount_percent": float(i.discount_percent), "amount": float(i.amount),
                "gst_rate": float(i.gst_rate), "hsn_code": i.hsn_code,
            } for i in sorted(inv.items, key=lambda x: x.sort_order)],
            "subtotal": float(inv.subtotal), "discount_amount": float(inv.discount_amount),
            "cgst_amount": float(inv.cgst_amount), "sgst_amount": float(inv.sgst_amount),
            "round_off": float(inv.round_off), "grand_total": float(inv.grand_total),
            "amount_paid": float(inv.amount_paid), "amount_due": float(inv.amount_due),
        })
    else:
        jc: JobCard = obj
        data.update({
            "number": jc.job_card_number,
            "date": jc.created_at.isoformat() if jc.created_at else None,
            "status": jc.status.value,
            "customer_complaint": jc.customer_complaint,
            "odometer_in": jc.odometer_in,
            "expected_delivery_date": jc.expected_delivery_date.isoformat() if jc.expected_delivery_date else None,
            "status_history": [
                {"status": h.new_status.value, "changed_at": h.changed_at.isoformat()}
                for h in sorted(jc.status_history, key=lambda h: h.changed_at)
            ],
        })
    return {"success": True, "data": data}
