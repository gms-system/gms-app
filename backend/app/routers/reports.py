from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, String
from datetime import date, timedelta
import uuid

from app.database import get_db
from app.models.invoice import Invoice, InvoiceItem, Payment, InvoiceType
from app.models.job_card import JobCard, JobCardStatus
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id

router = APIRouter(prefix="/reports", tags=["Reports"])


def _default_range():
    today = date.today()
    return today.replace(day=1), today


# ─── Sales Report ──────────────────────────────────────────────────────────────
@router.get("/sales")
async def sales_report(
    from_date: date = Query(None),
    to_date: date = Query(None),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    if not from_date or not to_date:
        from_date, to_date = _default_range()

    # Daily revenue from payments
    daily_result = await db.execute(
        select(Payment.payment_date, func.sum(Payment.amount).label("revenue"))
        .where(
            Payment.garage_id == garage_id,
            Payment.payment_date >= from_date,
            Payment.payment_date <= to_date,
        )
        .group_by(Payment.payment_date)
        .order_by(Payment.payment_date)
    )
    daily_map = {row.payment_date: float(row.revenue) for row in daily_result.all()}

    # Fill all days in range
    daily = []
    current = from_date
    while current <= to_date:
        daily.append({"date": current.isoformat(), "revenue": daily_map.get(current, 0)})
        current += timedelta(days=1)

    # Totals
    total_result = await db.execute(
        select(
            func.coalesce(func.sum(Payment.amount), 0).label("total"),
            func.count(Payment.id).label("transactions"),
        )
        .where(
            Payment.garage_id == garage_id,
            Payment.payment_date >= from_date,
            Payment.payment_date <= to_date,
        )
    )
    totals = total_result.one()

    # Payment mode breakdown
    mode_result = await db.execute(
        select(Payment.payment_mode, func.sum(Payment.amount).label("amount"))
        .where(
            Payment.garage_id == garage_id,
            Payment.payment_date >= from_date,
            Payment.payment_date <= to_date,
        )
        .group_by(Payment.payment_mode)
    )
    by_mode = [{"mode": r.payment_mode.value, "amount": float(r.amount)} for r in mode_result.all()]

    # Invoices created in range
    inv_result = await db.execute(
        select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.grand_total), 0))
        .where(
            Invoice.garage_id == garage_id,
            Invoice.is_cancelled == False,
            Invoice.invoice_date >= from_date,
            Invoice.invoice_date <= to_date,
        )
    )
    inv_row = inv_result.one()

    return {
        "success": True,
        "data": {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "total_collected": float(totals.total),
            "total_invoiced": float(inv_row[1]),
            "transactions": totals.transactions,
            "invoices_count": inv_row[0],
            "daily": daily,
            "by_payment_mode": by_mode,
        },
    }


# ─── GST Report ────────────────────────────────────────────────────────────────
@router.get("/gst")
async def gst_report(
    from_date: date = Query(None),
    to_date: date = Query(None),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    if not from_date or not to_date:
        from_date, to_date = _default_range()

    result = await db.execute(
        select(
            Invoice.invoice_number,
            Invoice.invoice_date,
            Invoice.invoice_type,
            Invoice.taxable_amount,
            Invoice.cgst_amount,
            Invoice.sgst_amount,
            Invoice.igst_amount,
            Invoice.total_tax,
            Invoice.grand_total,
        )
        .where(
            Invoice.garage_id == garage_id,
            Invoice.is_cancelled == False,
            Invoice.invoice_date >= from_date,
            Invoice.invoice_date <= to_date,
        )
        .order_by(Invoice.invoice_date)
    )
    rows = result.all()

    invoices = [
        {
            "invoice_number": r.invoice_number,
            "invoice_date": r.invoice_date.isoformat(),
            "invoice_type": r.invoice_type.value,
            "taxable_amount": float(r.taxable_amount),
            "cgst": float(r.cgst_amount),
            "sgst": float(r.sgst_amount),
            "igst": float(r.igst_amount),
            "total_tax": float(r.total_tax),
            "grand_total": float(r.grand_total),
        }
        for r in rows
    ]

    totals = {
        "taxable_amount": sum(i["taxable_amount"] for i in invoices),
        "cgst": sum(i["cgst"] for i in invoices),
        "sgst": sum(i["sgst"] for i in invoices),
        "igst": sum(i["igst"] for i in invoices),
        "total_tax": sum(i["total_tax"] for i in invoices),
        "grand_total": sum(i["grand_total"] for i in invoices),
    }

    return {
        "success": True,
        "data": {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "invoices": invoices,
            "totals": totals,
        },
    }


# ─── Outstanding Report ─────────────────────────────────────────────────────────
@router.get("/outstanding")
async def outstanding_report(
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Invoice.id,
            Invoice.invoice_number,
            Invoice.invoice_date,
            Invoice.grand_total,
            Invoice.amount_paid,
            Invoice.amount_due,
            Customer.name.label("customer_name"),
            Customer.mobile.label("customer_mobile"),
        )
        .join(Customer, Invoice.customer_id == Customer.id)
        .where(
            Invoice.garage_id == garage_id,
            Invoice.is_cancelled == False,
            Invoice.amount_due > 0,
        )
        .order_by(Invoice.invoice_date)
    )
    rows = result.all()

    invoices = [
        {
            "invoice_id": str(r.id),
            "invoice_number": r.invoice_number,
            "invoice_date": r.invoice_date.isoformat(),
            "customer_name": r.customer_name,
            "customer_mobile": r.customer_mobile,
            "grand_total": float(r.grand_total),
            "amount_paid": float(r.amount_paid),
            "amount_due": float(r.amount_due),
            "days_overdue": (date.today() - r.invoice_date).days,
        }
        for r in rows
    ]

    total_outstanding = sum(i["amount_due"] for i in invoices)

    # Ageing buckets
    buckets = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "90_plus": 0.0}
    for i in invoices:
        d = i["days_overdue"]
        if d <= 30:
            buckets["0_30"] += i["amount_due"]
        elif d <= 60:
            buckets["31_60"] += i["amount_due"]
        elif d <= 90:
            buckets["61_90"] += i["amount_due"]
        else:
            buckets["90_plus"] += i["amount_due"]

    return {
        "success": True,
        "data": {
            "total_outstanding": total_outstanding,
            "count": len(invoices),
            "ageing": buckets,
            "invoices": invoices,
        },
    }


# ─── Job Cards Report ──────────────────────────────────────────────────────────
@router.get("/job-cards")
async def job_cards_report(
    from_date: date = Query(None),
    to_date: date = Query(None),
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    if not from_date or not to_date:
        from_date, to_date = _default_range()

    # Status distribution — cast enum to string to avoid asyncpg type resolution issues
    status_result = await db.execute(
        select(cast(JobCard.status, String).label("status"), func.count().label("count"))
        .where(JobCard.is_deleted == False, JobCard.garage_id == garage_id)
        .group_by(JobCard.status)
    )
    by_status = [{"status": r.status, "count": r.count} for r in status_result.all()]

    from sqlalchemy import Date as SADate, text
    from datetime import datetime as dt_cls

    from_dt = dt_cls.combine(from_date, dt_cls.min.time())
    to_dt = dt_cls.combine(to_date, dt_cls.max.time())

    # Created in range
    range_result = await db.execute(
        select(cast(JobCard.created_at, SADate).label("day"), func.count().label("count"))
        .where(
            JobCard.is_deleted == False,
            JobCard.garage_id == garage_id,
            JobCard.created_at >= from_dt,
            JobCard.created_at <= to_dt,
        )
        .group_by(cast(JobCard.created_at, SADate))
        .order_by(cast(JobCard.created_at, SADate))
    )
    daily_map = {str(r.day): r.count for r in range_result.all()}
    daily = []
    current = from_date
    while current <= to_date:
        daily.append({"date": current.isoformat(), "count": daily_map.get(current.isoformat(), 0)})
        current += timedelta(days=1)

    # Totals for range
    total_result = await db.execute(
        select(func.count())
        .where(
            JobCard.is_deleted == False,
            JobCard.garage_id == garage_id,
            JobCard.created_at >= from_dt,
            JobCard.created_at <= to_dt,
        )
    )
    total_in_range = total_result.scalar()

    # Average turnaround (delivered cards)
    delivered_result = await db.execute(
        select(JobCard.created_at, JobCard.actual_delivery_date)
        .where(
            JobCard.is_deleted == False,
            JobCard.garage_id == garage_id,
            cast(JobCard.status, String) == "delivered",
            JobCard.actual_delivery_date.is_not(None),
        )
        .limit(100)
    )
    delivered = delivered_result.all()
    if delivered:
        turnarounds = [(r.actual_delivery_date - r.created_at).total_seconds() / 3600 for r in delivered]
        avg_hrs = round(sum(turnarounds) / len(turnarounds), 1)
    else:
        avg_hrs = None

    return {
        "success": True,
        "data": {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "total_in_range": total_in_range,
            "avg_turnaround_hours": avg_hrs,
            "by_status": by_status,
            "daily": daily,
        },
    }
