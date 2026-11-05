import uuid
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class ItemCategory(str, enum.Enum):
    spare_part = "spare_part"
    lubricant = "lubricant"
    paint = "paint"
    consumable = "consumable"
    external = "external"
    tool = "tool"
    labour = "labour"


class StockMovementType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"
    adjustment = "adjustment"
    return_ = "return"
    transfer = "transfer"


class InventoryItem(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    part_number: Mapped[Optional[str]] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[ItemCategory] = mapped_column(SAEnum(ItemCategory, name="item_category", create_type=False), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(100))
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="pcs")
    current_stock: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("0"))
    min_stock_level: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("0"))
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20))
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("18"))
    rack_location: Mapped[Optional[str]] = mapped_column(String(50))
    preferred_supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))

    movements: Mapped[list["StockMovement"]] = relationship("StockMovement", back_populates="item", lazy="select")

    @property
    def is_low_stock(self) -> bool:
        return self.current_stock <= self.min_stock_level

    def __repr__(self) -> str:
        return f"<InventoryItem {self.sku} {self.name}>"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    movement_type: Mapped[StockMovementType] = mapped_column(SAEnum(StockMovementType, name="stock_movement_type", create_type=False), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    quantity_before: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    reference_type: Mapped[Optional[str]] = mapped_column(String(50))
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="movements")
