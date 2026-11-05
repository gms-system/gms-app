from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime

import uuid
from app.database import get_db
from app.models.invoice import Invoice, InvoiceItem, Payment, InvoiceType, PaymentMode
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager
from app.utils.number_generator import generate_invoice_number

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class InvoiceItemSchema(BaseModel):
    item_type: str
    inventory_item_id: Optional[str] = None
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")
    amount: Decimal
    hsn_code: Optional[str] = None
    gst_rate: Decimal = Decimal("18")
    cgst_rate: Decimal = Decimal("9")
    sgst_rate: Decimal = Decimal("9")
    sort_order: int = 0


class InvoiceCreate(BaseModel):
    invoice_date: date
    invoice_type: InvoiceType = InvoiceType.tax_invoice
    job_card_id: Optional[str] = None
    estimate_id: Optional[str] = None
    customer_id: str
    vehicle_id: Optional[str] = None
    items: list[InvoiceItemSchema]
    discount_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    payment_date: date
    amount: Decimal
    payment_mode: PaymentMode
    reference_number: Optional[str] = None
    notes: Optional[str] = None


def inv_to_dict(inv: Invoice) -> dict:
    return {
        "id": str(inv.id),
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.isoformat(),
        "invoice_type": inv.invoice_type.value,
        "customer_id": str(inv.customer_id),
        "vehicle_id": str(inv.vehicle_id) if inv.vehicle_id else None,
        "job_card_id": str(inv.job_card_id) if inv.job_card_id else None,
        "subtotal": float(inv.subtotal),
        "discount_amount": float(inv.discount_amount),
        "taxable_amount": float(inv.taxable_amount),
        "cgst_amount": float(inv.cgst_amount),
        "sgst_amount": float(inv.sgst_amount),
        "total_tax": float(inv.total_tax),
        "grand_total": float(inv.grand_total),
        "round_off": float(inv.round_off),
        "amount_paid": float(inv.amount_paid),
        "amount_due": float(inv.amount_due),
        "is_cancelled": inv.is_cancelled,
        "notes": inv.notes,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.get("")
async def list_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).where(Invoice.is_cancelled == False, Invoice.garage_id == garage_id)
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    query = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    invoices = result.scalars().all()
    return {
        "success": True,
        "data": [inv_to_dict(inv) for inv in invoices],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    inv_number = await generate_invoice_number(db)

    # Calculate totals
    subtotal = sum(item.amount for item in data.items)
    taxable = subtotal - data.discount_amount
    cgst = sum((item.amount * item.cgst_rate / 100) for item in data.items)
    sgst = sum((item.amount * item.sgst_rate / 100) for item in data.items)
    total_tax = cgst + sgst
    grand_total = taxable + total_tax + data.round_off

    invoice = Invoice(
        invoice_number=inv_number,
        invoice_date=data.invoice_date,
        invoice_type=data.invoice_type,
        job_card_id=data.job_card_id,
        estimate_id=data.estimate_id,
        customer_id=data.customer_id,
        vehicle_id=data.vehicle_id,
        garage_id=garage_id,
        subtotal=subtotal,
        discount_amount=data.discount_amount,
        taxable_amount=taxable,
        cgst_amount=cgst,
        sgst_amount=sgst,
        total_tax=total_tax,
        grand_total=grand_total,
        round_off=data.round_off,
        amount_due=grand_total,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(invoice)
    await db.flush()

    for i, item in enumerate(data.items):
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            item_type=item.item_type,
            inventory_item_id=item.inventory_item_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percent=item.discount_percent,
            amount=item.amount,
            hsn_code=item.hsn_code,
            gst_rate=item.gst_rate,
            cgst_rate=item.cgst_rate,
            sgst_rate=item.sgst_rate,
            sort_order=i,
        ))

    await db.flush()
    await db.refresh(invoice)
    return {"success": True, "data": inv_to_dict(invoice)}


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.payments),
            selectinload(Invoice.customer),
            selectinload(Invoice.vehicle),
        )
        .where(Invoice.id == invoice_id, Invoice.garage_id == garage_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    data = inv_to_dict(invoice)
    data["items"] = [
        {
            "id": str(i.id),
            "item_type": i.item_type,
            "description": i.description,
            "quantity": float(i.quantity),
            "unit_price": float(i.unit_price),
            "discount_percent": float(i.discount_percent),
            "amount": float(i.amount),
            "gst_rate": float(i.gst_rate),
            "cgst_rate": float(i.cgst_rate),
            "sgst_rate": float(i.sgst_rate),
            "hsn_code": i.hsn_code,
        }
        for i in invoice.items
    ]
    data["payments"] = [
        {
            "id": str(p.id),
            "payment_date": p.payment_date.isoformat(),
            "amount": float(p.amount),
            "payment_mode": p.payment_mode.value,
            "reference_number": p.reference_number,
            "notes": p.notes,
        }
        for p in invoice.payments
    ]
    data["customer_name"] = invoice.customer.name if invoice.customer else None
    data["vehicle_reg"] = invoice.vehicle.registration_number if invoice.vehicle else None
    return {"success": True, "data": data}


@router.patch("/{invoice_id}/cancel", dependencies=[Depends(require_manager)])
async def cancel_invoice(
    invoice_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    invoice.is_cancelled = True
    invoice.cancellation_reason = reason
    return {"success": True, "message": "Invoice cancelled"}


@router.post("/{invoice_id}/payments")
async def record_payment(
    invoice_id: str,
    data: PaymentCreate,
    current_user: Employee = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if data.amount > invoice.amount_due:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment exceeds outstanding amount")

    payment = Payment(
        invoice_id=invoice.id,
        customer_id=invoice.customer_id,
        payment_date=data.payment_date,
        amount=data.amount,
        payment_mode=data.payment_mode,
        reference_number=data.reference_number,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(payment)

    invoice.amount_paid += data.amount
    invoice.amount_due -= data.amount

    return {"success": True, "message": "Payment recorded", "amount_due": float(invoice.amount_due)}
