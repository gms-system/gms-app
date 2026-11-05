import uuid
import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Integer, Date, DateTime, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin


class EstimateStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    converted = "converted"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Estimate(Base, TimestampMixin):
    __tablename__ = "estimates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    estimate_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[EstimateStatus] = mapped_column(SAEnum(EstimateStatus, name="estimate_status", create_type=False), default=EstimateStatus.draft)
    approval_status: Mapped[ApprovalStatus] = mapped_column(SAEnum(ApprovalStatus, name="approval_status", create_type=False), default=ApprovalStatus.pending)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount_type: Mapped[str] = mapped_column(String(10), default="flat")
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    taxable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    cgst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    sgst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    igst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    round_off: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    valid_until: Mapped[Optional[date]] = mapped_column(Date)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    job_card: Mapped["JobCard"] = relationship("JobCard")
    items: Mapped[list["EstimateItem"]] = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Estimate {self.estimate_number}>"


class EstimateItem(Base):
    __tablename__ = "estimate_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estimate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False)
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)  # labor / part / external
    inventory_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"))
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=Decimal("1"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20))
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("18"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    estimate: Mapped["Estimate"] = relationship("Estimate", back_populates="items")
    inventory_item: Mapped[Optional["InventoryItem"]] = relationship("InventoryItem")
