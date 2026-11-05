from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, timedelta
from decimal import Decimal

import uuid
from app.database import get_db
from app.models.job_card import JobCard, JobCardStatus
from app.models.invoice import Invoice, Payment
from app.models.inventory import InventoryItem
from app.models.customer import Customer
from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, get_garage_id

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_summary(
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    first_of_month = today.replace(day=1)

    today_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date == today, Payment.garage_id == garage_id)
    )
    today_revenue = float(today_revenue_result.scalar())

    monthly_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date >= first_of_month, Payment.garage_id == garage_id)
    )
    monthly_revenue = float(monthly_revenue_result.scalar())

    open_jc_result = await db.execute(
        select(func.count()).where(
            and_(
                JobCard.is_deleted == False,
                JobCard.garage_id == garage_id,
                JobCard.status.notin_([JobCardStatus.delivered, JobCardStatus.cancelled]),
            )
        )
    )
    open_job_cards = open_jc_result.scalar()

    today_jc_result = await db.execute(
        select(func.count()).where(
            and_(
                JobCard.is_deleted == False,
                JobCard.garage_id == garage_id,
                func.date(JobCard.created_at) == today,
            )
        )
    )
    today_job_cards = today_jc_result.scalar()

    outstanding_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.amount_due), 0)).where(
            Invoice.is_cancelled == False, Invoice.garage_id == garage_id)
    )
    outstanding = float(outstanding_result.scalar())

    low_stock_result = await db.execute(
        select(func.count()).where(
            and_(
                InventoryItem.is_deleted == False,
                InventoryItem.is_active == True,
                InventoryItem.garage_id == garage_id,
                InventoryItem.current_stock <= InventoryItem.min_stock_level,
            )
        )
    )
    low_stock_count = low_stock_result.scalar()

    attendance_result = await db.execute(
        select(func.count()).where(
            and_(
                Attendance.attendance_date == today,
                Attendance.garage_id == garage_id,
                Attendance.status == AttendanceStatus.present,
            )
        )
    )
    present_today = attendance_result.scalar()

    status_dist_result = await db.execute(
        select(JobCard.status, func.count().label("count"))
        .where(JobCard.is_deleted == False, JobCard.garage_id == garage_id, JobCard.status != JobCardStatus.delivered)
        .group_by(JobCard.status)
    )
    status_dist = {row.status.value: row.count for row in status_dist_result}

    return {
        "success": True,
        "data": {
            "today_revenue": today_revenue,
            "monthly_revenue": monthly_revenue,
            "open_job_cards": open_job_cards,
            "today_job_cards": today_job_cards,
            "outstanding": outstanding,
            "low_stock_count": low_stock_count,
            "present_today": present_today,
            "job_card_status_distribution": status_dist,
        }
    }


@router.get("/revenue-trend")
async def get_revenue_trend(
    days: int = 30,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    start_date = date.today() - timedelta(days=days)
    result = await db.execute(
        select(
            Payment.payment_date,
            func.sum(Payment.amount).label("total"),
        )
        .where(Payment.payment_date >= start_date, Payment.garage_id == garage_id)
        .group_by(Payment.payment_date)
        .order_by(Payment.payment_date)
    )
    rows = result.all()

    # Fill missing days with 0
    date_map = {row.payment_date: float(row.total) for row in rows}
    trend = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        trend.append({"date": d.isoformat(), "revenue": date_map.get(d, 0)})

    return {"success": True, "data": trend}


@router.get("/top-customers")
async def get_top_customers(
    limit: int = 10,
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer.id, Customer.name, Customer.mobile, Customer.lifetime_spending)
        .where(Customer.is_deleted == False, Customer.garage_id == garage_id)
        .order_by(Customer.lifetime_spending.desc())
        .limit(limit)
    )
    rows = result.all()
    return {
        "success": True,
        "data": [
            {"id": str(r.id), "name": r.name, "mobile": r.mobile, "lifetime_spending": float(r.lifetime_spending)}
            for r in rows
        ],
    }


@router.get("/recent-activity")
async def get_recent_activity(
    current_user: Employee = Depends(get_current_user),
    garage_id: uuid.UUID = Depends(get_garage_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobCard)
        .where(JobCard.is_deleted == False, JobCard.garage_id == garage_id)
        .order_by(JobCard.updated_at.desc())
        .limit(10)
    )
    job_cards = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(jc.id),
                "job_card_number": jc.job_card_number,
                "status": jc.status.value,
                "updated_at": jc.updated_at.isoformat() if jc.updated_at else None,
            }
            for jc in job_cards
        ],
    }
