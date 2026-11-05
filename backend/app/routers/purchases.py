from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime

from app.database import get_db
from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder, PurchaseOrderItem, GRN, GRNItem, POStatus
from app.models.inventory import InventoryItem, StockMovement, StockMovementType
from app.models.employee import Employee
from app.utils.dependencies import get_current_user, require_store_manager, require_manager
from app.utils.number_generator import generate_supplier_code

router = APIRouter(tags=["Purchases"])

# ── Suppliers ───────────────────────────────────────────────

suppliers_router = APIRouter(prefix="/suppliers")


class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    payment_terms_days: int = 30
    notes: Optional[str] = None


def sup_to_dict(s: Supplier) -> dict:
    return {
        "id": str(s.id),
        "supplier_code": s.supplier_code,
        "name": s.name,
        "contact_person": s.contact_person,
        "mobile": s.mobile,
        "email": s.email,
        "city": s.city,
        "gstin": s.gstin,
        "payment_terms_days": s.payment_terms_days,
        "outstanding_payable": float(s.outstanding_payable),
        "is_active": s.is_active,
    }


@suppliers_router.get("")
async def list_suppliers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Supplier).where(Supplier.is_deleted == False)
    if search:
        query = query.where(Supplier.name.ilike(f"%{search}%"))
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    query = query.order_by(Supplier.name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    suppliers = result.scalars().all()
    return {
        "success": True,
        "data": [sup_to_dict(s) for s in suppliers],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@suppliers_router.post("", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    current_user: Employee = Depends(require_store_manager),
    db: AsyncSession = Depends(get_db),
):
    code = await generate_supplier_code(db)
    supplier = Supplier(supplier_code=code, **data.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return {"success": True, "data": sup_to_dict(supplier)}


@suppliers_router.get("/{supplier_id}")
async def get_supplier(supplier_id: str, db: AsyncSession = Depends(get_db),
                       current_user: Employee = Depends(get_current_user)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.is_deleted == False))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return {"success": True, "data": sup_to_dict(s)}


@suppliers_router.put("/{supplier_id}")
async def update_supplier(supplier_id: str, data: SupplierCreate,
                          current_user: Employee = Depends(require_store_manager),
                          db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.is_deleted == False))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    return {"success": True, "data": sup_to_dict(s)}


# ── Purchase Orders ──────────────────────────────────────────

po_router = APIRouter(prefix="/purchase-orders")


class POItemSchema(BaseModel):
    inventory_item_id: str
    quantity_ordered: Decimal
    unit_price: Decimal
    gst_rate: Decimal = Decimal("18")


class POCreate(BaseModel):
    supplier_id: str
    po_date: date
    expected_date: Optional[date] = None
    items: list[POItemSchema]
    notes: Optional[str] = None


def po_to_dict(po: PurchaseOrder) -> dict:
    return {
        "id": str(po.id),
        "po_number": po.po_number,
        "supplier_id": str(po.supplier_id),
        "po_date": po.po_date.isoformat(),
        "expected_date": po.expected_date.isoformat() if po.expected_date else None,
        "status": po.status.value,
        "subtotal": float(po.subtotal),
        "tax_amount": float(po.tax_amount),
        "grand_total": float(po.grand_total),
        "notes": po.notes,
        "created_at": po.created_at.isoformat() if po.created_at else None,
    }


@po_router.get("")
async def list_pos(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    query = select(PurchaseOrder)
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    query = query.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    pos = result.scalars().all()
    return {"success": True, "data": [po_to_dict(p) for p in pos],
            "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}}


@po_router.post("", status_code=status.HTTP_201_CREATED)
async def create_po(
    data: POCreate,
    current_user: Employee = Depends(require_store_manager),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as date_cls
    # Generate PO number
    result = await db.execute(select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    po_num = f"PO-{date_cls.today().strftime('%Y%m%d')}-{((int(last.po_number.split('-')[-1]) + 1) if last else 1):04d}"

    subtotal = sum(i.unit_price * i.quantity_ordered for i in data.items)
    tax = sum(i.unit_price * i.quantity_ordered * i.gst_rate / 100 for i in data.items)

    po = PurchaseOrder(
        po_number=po_num,
        supplier_id=data.supplier_id,
        po_date=data.po_date,
        expected_date=data.expected_date,
        subtotal=subtotal,
        tax_amount=tax,
        grand_total=subtotal + tax,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(po)
    await db.flush()

    for item in data.items:
        db.add(PurchaseOrderItem(
            po_id=po.id,
            inventory_item_id=item.inventory_item_id,
            quantity_ordered=item.quantity_ordered,
            unit_price=item.unit_price,
            gst_rate=item.gst_rate,
            amount=item.unit_price * item.quantity_ordered,
        ))

    await db.flush()
    await db.refresh(po)
    return {"success": True, "data": po_to_dict(po)}


# ── GRN ─────────────────────────────────────────────────────

grn_router = APIRouter(prefix="/grn")


class GRNItemSchema(BaseModel):
    inventory_item_id: str
    quantity_received: Decimal
    unit_price: Decimal
    gst_rate: Decimal = Decimal("18")
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None


class GRNCreate(BaseModel):
    po_id: Optional[str] = None
    supplier_id: str
    grn_date: date
    supplier_invoice_no: Optional[str] = None
    supplier_invoice_date: Optional[date] = None
    items: list[GRNItemSchema]
    notes: Optional[str] = None


@grn_router.get("")
async def list_grn(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    current_user: Employee = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    query = select(GRN)
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    query = query.order_by(GRN.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    grns = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(g.id),
                "grn_number": g.grn_number,
                "supplier_id": str(g.supplier_id),
                "grn_date": g.grn_date.isoformat(),
                "supplier_invoice_no": g.supplier_invoice_no,
                "grand_total": float(g.grand_total),
                "created_at": g.created_at.isoformat(),
            }
            for g in grns
        ],
        "meta": {"total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit},
    }


@grn_router.post("", status_code=status.HTTP_201_CREATED)
async def create_grn(
    data: GRNCreate,
    current_user: Employee = Depends(require_store_manager),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as date_cls
    result = await db.execute(select(GRN).order_by(GRN.created_at.desc()).limit(1))
    last = result.scalar_one_or_none()
    grn_num = f"GRN-{date_cls.today().strftime('%Y%m%d')}-{((int(last.grn_number.split('-')[-1]) + 1) if last else 1):04d}"

    subtotal = sum(i.unit_price * i.quantity_received for i in data.items)
    tax = sum(i.unit_price * i.quantity_received * i.gst_rate / 100 for i in data.items)

    grn = GRN(
        grn_number=grn_num,
        po_id=data.po_id,
        supplier_id=data.supplier_id,
        grn_date=data.grn_date,
        supplier_invoice_no=data.supplier_invoice_no,
        supplier_invoice_date=data.supplier_invoice_date,
        subtotal=subtotal,
        tax_amount=tax,
        grand_total=subtotal + tax,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(grn)
    await db.flush()

    for item in data.items:
        db.add(GRNItem(
            grn_id=grn.id,
            inventory_item_id=item.inventory_item_id,
            quantity_received=item.quantity_received,
            unit_price=item.unit_price,
            gst_rate=item.gst_rate,
            amount=item.unit_price * item.quantity_received,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
        ))

        # Update inventory stock
        inv_result = await db.execute(
            select(InventoryItem).where(InventoryItem.id == item.inventory_item_id)
        )
        inv_item = inv_result.scalar_one_or_none()
        if inv_item:
            before = inv_item.current_stock
            inv_item.current_stock += item.quantity_received
            db.add(StockMovement(
                inventory_item_id=inv_item.id,
                movement_type=StockMovementType.purchase,
                quantity=item.quantity_received,
                quantity_before=before,
                quantity_after=inv_item.current_stock,
                unit_cost=item.unit_price,
                reference_type="grn",
                reference_id=grn.id,
                created_by=current_user.id,
            ))

    await db.flush()
    return {"success": True, "data": {"id": str(grn.id), "grn_number": grn.grn_number}}


# Register sub-routers on the main router
router.include_router(suppliers_router)
router.include_router(po_router)
router.include_router(grn_router)
