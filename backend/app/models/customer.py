import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class Customer(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    customer_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    alternate_mobile: Mapped[Optional[str]] = mapped_column(String(15))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    gstin: Mapped[Optional[str]] = mapped_column(String(20))
    pan_number: Mapped[Optional[str]] = mapped_column(String(15))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    lifetime_spending: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))

    vehicles: Mapped[list] = relationship("Vehicle", back_populates="owner", lazy="select")
    job_cards: Mapped[list] = relationship("JobCard", back_populates="customer", lazy="select")

    def __repr__(self) -> str:
        return f"<Customer {self.customer_code} {self.name}>"
