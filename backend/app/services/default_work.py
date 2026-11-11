"""
Default work list added to quick / voice job cards, by work type and vehicle class.
Later this can move to the cloud catalog and be suggested per model / odometer.
"""
from typing import Literal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import CatalogItem

WorkType = Literal["service", "repair"]

WORK_TYPE_LABELS = {"service": "Periodic service", "repair": "Repair"}

DEFAULT_WORK: dict[str, dict[str, list[str]]] = {
    "service": {
        "4_wheeler": [
            "Engine oil change",
            "Oil filter replacement",
            "Air filter cleaning / replacement",
            "AC filter cleaning",
            "Brake inspection & cleaning",
            "Coolant, brake & washer fluid top-up",
            "Battery check",
            "Tyre pressure check & rotation",
            "General inspection (lights, wipers, suspension)",
            "Car wash",
        ],
        "2_wheeler": [
            "Engine oil change",
            "Air filter cleaning",
            "Spark plug check / cleaning",
            "Chain cleaning, lubrication & adjustment",
            "Brake adjustment",
            "Battery check",
            "Tyre pressure check",
            "General inspection (lights, horn, cables)",
            "Bike wash",
        ],
    },
    "repair": {
        "4_wheeler": [
            "Inspection & diagnosis",
            "Repair as per customer complaint",
            "Test drive & quality check",
        ],
        "2_wheeler": [
            "Inspection & diagnosis",
            "Repair as per customer complaint",
            "Test ride & quality check",
        ],
    },
}


async def vehicle_class(db: AsyncSession, make: str, model: str) -> str:
    """'2_wheeler' if the make/model is in the two-wheeler catalog, else '4_wheeler'."""
    rows = (await db.execute(
        select(CatalogItem.kind, CatalogItem.data).where(
            CatalogItem.kind.in_(["car", "two_wheeler"]),
            func.lower(CatalogItem.data["make"].astext) == make.strip().lower(),
        )
    )).all()
    kinds = {k for k, _ in rows}
    m = model.strip().lower()
    for kind, data in rows:
        if m and m in [x.lower() for x in data.get("models", [])]:
            return "2_wheeler" if kind == "two_wheeler" else "4_wheeler"
    return "2_wheeler" if kinds == {"two_wheeler"} else "4_wheeler"


async def default_work_items(db: AsyncSession, work_type: str, make: str = "", model: str = "") -> list[str]:
    cls = await vehicle_class(db, make, model) if make else "4_wheeler"
    return list(DEFAULT_WORK[work_type][cls])
