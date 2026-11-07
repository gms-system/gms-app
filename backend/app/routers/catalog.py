"""
Cloud catalog — vehicle makes/models, spare parts, lubes.

GET /catalog                 : public, used by every app for the daily sync.
                               Pass ?version=<last version> to get {changed:false}
                               when nothing changed (tiny response).
/admin/catalog[...]          : super-admin CRUD.
"""
import uuid
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select, func, Text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.catalog import CatalogItem
from app.models.super_admin import SuperAdmin
from app.utils.dependencies import get_super_admin

router = APIRouter(tags=["Catalog"])

Kind = Literal["car", "two_wheeler", "spare_part", "lubricant"]


class VehicleData(BaseModel):
    make: str = Field(min_length=1)
    models: list[str] = []


class SparePartData(BaseModel):
    vehicle: str = Field(min_length=1)
    part: str = Field(min_length=1)
    cost_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    hsn_code: Optional[str] = None


class LubeData(BaseModel):
    brand: str = Field(min_length=1)
    name: str = Field(min_length=1)
    grade: str = ""
    type: str = "Engine Oil"
    pack: str = ""
    cost_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    hsn_code: Optional[str] = None


DATA_SCHEMAS = {"car": VehicleData, "two_wheeler": VehicleData, "spare_part": SparePartData, "lubricant": LubeData}


def validate_data(kind: str, data: dict) -> dict:
    try:
        return DATA_SCHEMAS[kind](**data).model_dump(exclude_none=True)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())


class CatalogCreate(BaseModel):
    kind: Kind
    data: dict
    sort_order: int = 0


class CatalogUpdate(BaseModel):
    data: Optional[dict] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


async def catalog_version(db: AsyncSession) -> str:
    count, latest = (await db.execute(select(func.count(CatalogItem.id), func.max(CatalogItem.updated_at)))).one()
    return f"{count}-{int(latest.timestamp()) if latest else 0}"


# ---------------------------------------------------------------------------
# Public sync endpoint
# ---------------------------------------------------------------------------

@router.get("/catalog")
async def get_catalog(version: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    current = await catalog_version(db)
    if version and version == current:
        return {"success": True, "data": {"changed": False, "version": current}}

    rows = (await db.execute(
        select(CatalogItem).where(CatalogItem.is_active == True)
        .order_by(CatalogItem.kind, CatalogItem.sort_order, CatalogItem.created_at)
    )).scalars().all()
    out: dict[str, list] = {"cars": [], "two_wheelers": [], "spare_parts": [], "lubes": []}
    key = {"car": "cars", "two_wheeler": "two_wheelers", "spare_part": "spare_parts", "lubricant": "lubes"}
    for r in rows:
        out[key[r.kind]].append(r.data)
    return {"success": True, "data": {"changed": True, "version": current, **out}}


# ---------------------------------------------------------------------------
# Super admin CRUD
# ---------------------------------------------------------------------------

@router.get("/admin/catalog")
async def admin_list_catalog(
    kind: Kind = Query(...),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: SuperAdmin = Depends(get_super_admin),
):
    q = select(CatalogItem).where(CatalogItem.kind == kind)
    if search:
        q = q.where(CatalogItem.data.cast(Text).ilike(f"%{search}%"))
    rows = (await db.execute(q.order_by(CatalogItem.sort_order, CatalogItem.created_at))).scalars().all()
    return {"success": True, "data": [r.to_dict() for r in rows], "version": await catalog_version(db)}


@router.post("/admin/catalog", status_code=201)
async def admin_create_catalog(
    body: CatalogCreate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdmin = Depends(get_super_admin),
):
    item = CatalogItem(kind=body.kind, data=validate_data(body.kind, body.data), sort_order=body.sort_order)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"success": True, "data": item.to_dict()}


async def _get_item(db: AsyncSession, item_id: uuid.UUID) -> CatalogItem:
    item = (await db.execute(select(CatalogItem).where(CatalogItem.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return item


@router.patch("/admin/catalog/{item_id}")
async def admin_update_catalog(
    item_id: uuid.UUID,
    body: CatalogUpdate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdmin = Depends(get_super_admin),
):
    item = await _get_item(db, item_id)
    if body.data is not None:
        item.data = validate_data(item.kind, body.data)
    if body.sort_order is not None:
        item.sort_order = body.sort_order
    if body.is_active is not None:
        item.is_active = body.is_active
    await db.commit()
    await db.refresh(item)
    return {"success": True, "data": item.to_dict()}


@router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdmin = Depends(get_super_admin),
):
    item = await _get_item(db, item_id)
    await db.delete(item)
    await db.commit()
    return {"success": True, "message": "Deleted"}
