from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.settings import GarageSettings


async def generate_job_card_number(db: AsyncSession) -> str:
    result = await db.execute(select(GarageSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        today = date.today()
        return f"JC-{today.strftime('%Y%m%d')}-0001"

    counter = settings.job_card_counter
    today = date.today()
    number = f"{settings.job_card_prefix}-{today.strftime('%Y%m%d')}-{counter:04d}"

    await db.execute(
        update(GarageSettings)
        .where(GarageSettings.id == settings.id)
        .values(job_card_counter=counter + 1)
    )
    return number


async def generate_invoice_number(db: AsyncSession) -> str:
    result = await db.execute(select(GarageSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        today = date.today()
        return f"INV-{today.strftime('%Y%m')}-0001"

    counter = settings.invoice_counter
    today = date.today()
    number = f"{settings.invoice_prefix}-{today.strftime('%Y%m')}-{counter:04d}"

    await db.execute(
        update(GarageSettings)
        .where(GarageSettings.id == settings.id)
        .values(invoice_counter=counter + 1)
    )
    return number


async def generate_customer_code(db: AsyncSession) -> str:
    from app.models.customer import Customer
    result = await db.execute(select(Customer).order_by(Customer.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    if not last:
        return "CUST-0001"
    try:
        num = int(last.customer_code.split("-")[1]) + 1
    except (IndexError, ValueError):
        num = 1
    return f"CUST-{num:04d}"


async def generate_supplier_code(db: AsyncSession) -> str:
    from app.models.supplier import Supplier
    result = await db.execute(select(Supplier).order_by(Supplier.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    if not last:
        return "SUP-0001"
    try:
        num = int(last.supplier_code.split("-")[1]) + 1
    except (IndexError, ValueError):
        num = 1
    return f"SUP-{num:04d}"


async def generate_employee_code(db: AsyncSession) -> str:
    from app.models.employee import Employee
    result = await db.execute(select(Employee).order_by(Employee.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    if not last:
        return "EMP-0001"
    try:
        num = int(last.employee_code.split("-")[1]) + 1
    except (IndexError, ValueError):
        num = 1
    return f"EMP-{num:04d}"


async def generate_sku(db: AsyncSession) -> str:
    from app.models.inventory import InventoryItem
    result = await db.execute(select(InventoryItem).order_by(InventoryItem.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    if not last:
        return "SKU-0001"
    try:
        num = int(last.sku.split("-")[1]) + 1
    except (IndexError, ValueError):
        num = 1
    return f"SKU-{num:04d}"
