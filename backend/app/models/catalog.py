import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

# Global (not per-garage) reference data managed by the super admin and synced
# to every app daily.
#   car / two_wheeler : {"make": "Maruti Suzuki", "models": ["Alto", ...]}
#   spare_part        : {"vehicle", "part", "cost_price", "selling_price", "hsn_code"}
#   lubricant         : {"brand", "name", "grade", "type", "pack", "cost_price", "selling_price", "hsn_code"}
CATALOG_KINDS = ("car", "two_wheeler", "spare_part", "lubricant")


class CatalogItem(Base):
    __tablename__ = "catalog_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "kind": self.kind,
            "data": self.data,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
