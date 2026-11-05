import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin


class GarageSettings(Base, TimestampMixin):
    __tablename__ = "garage_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_name: Mapped[Optional[str]] = mapped_column(String(100))
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    pincode: Mapped[Optional[str]] = mapped_column(String(10))
    mobile: Mapped[Optional[str]] = mapped_column(String(15))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    gstin: Mapped[Optional[str]] = mapped_column(String(20))
    pan: Mapped[Optional[str]] = mapped_column(String(15))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    invoice_prefix: Mapped[str] = mapped_column(String(10), default="INV")
    invoice_counter: Mapped[int] = mapped_column(Integer, default=1)
    job_card_prefix: Mapped[str] = mapped_column(String(10), default="JC")
    job_card_counter: Mapped[int] = mapped_column(Integer, default=1)
    default_gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("18.00"))
    currency: Mapped[str] = mapped_column(String(5), default="INR")
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
