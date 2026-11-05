from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime, timezone
import uuid

from app.database import get_db
from app.models.estimate import Estimate, EstimateItem, EstimateStatus, ApprovalStatus
from app.models.invoice import Invoice, InvoiceItem, InvoiceType
from app.models.inventory import InventoryItem, StockMovement, StockMovementType
from app.models.job_card import JobCard
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id, require_manager, require_service_advisor
from app.utils.number_generator import generate_invoice_number

router = APIRouter(prefix="/estimates", tags=["Estimates"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EstimateLineItem(BaseModel):
    item_type: str           # labor | part | external
    inventory_item_id: Optional[str] = None
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")
    hsn_code: Optional[str] = None
    gst_rate: Decimal = Decimal("18")


class EstimateCreate(BaseModel):
    job_card_id: str
    items: list[EstimateLineItem]
    discount_type: str = "flat"      # flat | percent
    discount_value: Decimal = Decimal("0")
    notes: Optional[str] = None
    valid_until: Optional[date] = None


class ApprovalRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _calc_totals(items: list[EstimateLineItem], discount_type: str, discount_value: Decimal):
    subtotal = Decimal("0")
    total_cgst = Decimal("0")
    total_sgst = Decimal("0")

    line_results = []
    for item in items:
        base = item.quantity * item.unit_price
        disc = base * item.discount_percent / 100
        line_amt = base - disc
        cgst = line_amt * (item.gst_rate / 2) / 100
        sgst = cgst
        subtotal += line_amt
        total_cgst += cgst
        total_sgst += sgst
        line_results.append({"amount": line_amt, "cgst": cgst, "sgst": sgst})

    if discount_type == "percent":
        discount_amount = subtotal * discount_value / 100
    else:
        discount_amount = discount_value

    taxable = subtotal - discount_amount
    total_tax = total_cgst + total_sgst
    grand_total = taxable + total_tax

    return subtotal, discount_amount, taxable, total_cgst, total_sgst, total_tax, grand_total, line_results


def est_to_dict(e: Estimate, include_items: bool = False) -> dict:
    data = {
        "id": str(e.id),
        "estimate_number": e.estimate_number,
        "job_card_id": str(e.job_card_id),
        "version": e.version,
        "status": e.status.value,
        "approval_status": e.approval_status.value,
        "subtotal": float(e.subtotal),
        "discount_type": e.discount_type,
        "discount_value": float(e.discount_value),
        "discount_amount": float(e.discount_amount),
        "taxable_amount": float(e.taxable_amount),
        "cgst_amount": float(e.cgst_amount),
        "sgst_amount": float(e.sgst_amount),
        "total_tax": float(e.total_tax),
        "grand_total": float(e.grand_total),
        "notes": e.notes,
        "valid_until": e.valid_until.isoformat() if e.valid_until else None,
        "approved_at": e.approved_at.isoformat() if e.approved_at else None,
        "approved_by": str(e.approved_by) if e.approved_by else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
    if include_items and hasattr(e, "items"):
        data["items"] = [
            {
                "id": str(i.id),
                "item_type": i.item_type,
                "inventory_item_id": str(i.inventory_item_id) if i.inventory_item_id else None,
                "description": i.description,
                "quantity": float(i.quantity),
                "unit_price": float(i.unit_price),
                "discount_percent": float(i.discount_percent),
                "amount": float(i.amount),
                "hsn_code": i.hsn_code,
                "gst_rate": float(i.gst_rate),
                "sort_order": i.sort_order,
            }
            for i in e.items
        ]
    return data


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def list_estimates(
    job_card_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Estimate).where(Estimate.garage_id == garage_id)
    if job_card_id:
        query = query.where(Estimate.job_card_id == job_card_id)
    if status_filter:
        query = query.where(Estimate.status == status_filter)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Estimate.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    estimates = result.scalars().all()

    return {
        "success": True,
        "data": [est_to_dict(e) for e in estimates],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_estimate(
    data: EstimateCreate,
    current_user: Employee = Depends(require_service_advisor),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify job card belongs to this garage
    jc_result = await db.execute(
        select(JobCard).where(JobCard.id == data.job_card_id, JobCard.garage_id == garage_id, JobCard.is_deleted == False)
    )
    if not jc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job card not found")

    # Get version number (how many estimates already for this job card)
    count_result = await db.execute(
        select(func.count()).select_from(Estimate).where(Estimate.job_card_id == data.job_card_id)
    )
    version = (count_result.scalar() or 0) + 1

    # Calculate totals
    subtotal, discount_amount, taxable, cgst, sgst, total_tax, grand_total, line_results = \
        _calc_totals(data.items, data.discount_type, data.discount_value)

    # Build estimate number: EST-YYYYMMDD-XXXX
    from datetime import date as dt_date
    today_str = dt_date.today().strftime("%Y%m%d")
    count_all = await db.execute(select(func.count()).select_from(Estimate))
    seq = (count_all.scalar() or 0) + 1
    estimate_number = f"EST-{today_str}-{seq:04d}"

    estimate = Estimate(
        estimate_number=estimate_number,
        job_card_id=data.job_card_id,
        garage_id=garage_id,
        version=version,
        status=EstimateStatus.draft,
        approval_status=ApprovalStatus.pending,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        discount_amount=discount_amount,
        subtotal=subtotal,
        taxable_amount=taxable,
        cgst_amount=cgst,
        sgst_amount=sgst,
        total_tax=total_tax,
        grand_total=grand_total,
        notes=data.notes,
        valid_until=data.valid_until,
        created_by=current_user.id,
    )
    db.add(estimate)
    await db.flush()

    for idx, (item, line) in enumerate(zip(data.items, line_results)):
        db.add(EstimateItem(
            estimate_id=estimate.id,
            item_type=item.item_type,
            inventory_item_id=item.inventory_item_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percent=item.discount_percent,
            amount=line["amount"],
            hsn_code=item.hsn_code,
            gst_rate=item.gst_rate,
            sort_order=idx,
        ))

    await db.flush()
    await db.refresh(estimate)
    # Reload with items
    result = await db.execute(
        select(Estimate).options(selectinload(Estimate.items)).where(Estimate.id == estimate.id)
    )
    estimate = result.scalar_one()
    return {"success": True, "data": est_to_dict(estimate, include_items=True)}


@router.get("/{estimate_id}")
async def get_estimate(
    estimate_id: str,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Estimate)
        .options(selectinload(Estimate.items))
        .where(Estimate.id == estimate_id, Estimate.garage_id == garage_id)
    )
    estimate = result.scalar_one_or_none()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return {"success": True, "data": est_to_dict(estimate, include_items=True)}


@router.patch("/{estimate_id}/send")
async def send_estimate(
    estimate_id: str,
    current_user: Employee = Depends(require_service_advisor),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id, Estimate.garage_id == garage_id)
    )
    estimate = result.scalar_one_or_none()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    if estimate.status not in (EstimateStatus.draft,):
        raise HTTPException(status_code=400, detail="Only draft estimates can be sent")

    estimate.status = EstimateStatus.sent
    return {"success": True, "message": "Estimate marked as sent", "status": estimate.status.value}


@router.patch("/{estimate_id}/approval")
async def update_approval(
    estimate_id: str,
    data: ApprovalRequest,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id, Estimate.garage_id == garage_id)
    )
    estimate = result.scalar_one_or_none()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    if data.approved:
        estimate.approval_status = ApprovalStatus.approved
        estimate.status = EstimateStatus.approved
        estimate.approved_by = current_user.id
        estimate.approved_at = datetime.now(timezone.utc)
    else:
        estimate.approval_status = ApprovalStatus.rejected
        estimate.status = EstimateStatus.rejected

    if data.notes:
        estimate.notes = (estimate.notes or "") + f"\n[Approval note]: {data.notes}"

    return {
        "success": True,
        "message": "Estimate approved" if data.approved else "Estimate rejected",
        "approval_status": estimate.approval_status.value,
    }


@router.post("/{estimate_id}/convert-to-invoice", status_code=status.HTTP_201_CREATED)
async def convert_to_invoice(
    estimate_id: str,
    current_user: Employee = Depends(require_manager),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Estimate)
        .options(selectinload(Estimate.items), selectinload(Estimate.job_card))
        .where(Estimate.id == estimate_id, Estimate.garage_id == garage_id)
    )
    estimate = result.scalar_one_or_none()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    if estimate.approval_status != ApprovalStatus.approved:
        raise HTTPException(status_code=400, detail="Estimate must be approved before converting to invoice")
    if estimate.status == EstimateStatus.converted:
        raise HTTPException(status_code=400, detail="Estimate already converted to invoice")

    inv_number = await generate_invoice_number(db)

    invoice = Invoice(
        invoice_number=inv_number,
        invoice_date=datetime.now(timezone.utc).date(),
        invoice_type=InvoiceType.tax_invoice,
        job_card_id=estimate.job_card_id,
        estimate_id=estimate.id,
        customer_id=estimate.job_card.customer_id,
        vehicle_id=estimate.job_card.vehicle_id,
        garage_id=garage_id,
        subtotal=estimate.subtotal,
        discount_amount=estimate.discount_amount,
        taxable_amount=estimate.taxable_amount,
        cgst_amount=estimate.cgst_amount,
        sgst_amount=estimate.sgst_amount,
        total_tax=estimate.total_tax,
        grand_total=estimate.grand_total,
        amount_due=estimate.grand_total,
        notes=estimate.notes,
        created_by=current_user.id,
    )
    db.add(invoice)
    await db.flush()

    for item in estimate.items:
        cgst_rate = item.gst_rate / 2
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
            cgst_rate=cgst_rate,
            sgst_rate=cgst_rate,
            sort_order=item.sort_order,
        ))

    estimate.status = EstimateStatus.converted

    # ── Auto-deduct inventory stock for all "part" line items ──────────────────
    for item in estimate.items:
        if item.inventory_item_id is None:
            continue  # skip labour and external items

        inv_result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.id == item.inventory_item_id,
                InventoryItem.garage_id == garage_id,
            )
        )
        inv_item = inv_result.scalar_one_or_none()
        if inv_item is None:
            continue  # item was deleted — skip silently

        qty_used = item.quantity
        stock_before = inv_item.current_stock
        stock_after = max(stock_before - qty_used, 0)  # never go below 0

        inv_item.current_stock = stock_after

        db.add(StockMovement(
            inventory_item_id=inv_item.id,
            movement_type=StockMovementType.sale,
            quantity=qty_used,
            quantity_before=stock_before,
            quantity_after=stock_after,
            unit_cost=inv_item.purchase_price,
            reference_type="invoice",
            reference_id=invoice.id,
            notes=f"Auto-deducted on invoice {invoice.invoice_number}",
            created_by=current_user.id,
        ))
    # ───────────────────────────────────────────────────────────────────────────

    await db.flush()
    await db.refresh(invoice)

    return {
        "success": True,
        "message": "Invoice created from estimate",
        "data": {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "grand_total": float(invoice.grand_total),
        },
    }
