import uuid
import enum
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Boolean, Date, DateTime, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class GaragePlan(str, enum.Enum):
    basic = "basic"
    pro = "pro"
    enterprise = "enterprise"


class GarageType(str, enum.Enum):
    four_wheeler = "4_wheeler"
    two_wheeler = "2_wheeler"
    both = "both"


class Garage(Base):
    __tablename__ = "garages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_name: Mapped[Optional[str]] = mapped_column(String(100))
    mobile: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100))
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    gstin: Mapped[Optional[str]] = mapped_column(String(20))
    garage_type: Mapped[str] = mapped_column(String(20), default="4_wheeler", nullable=False)

    # Subscription
    plan: Mapped[str] = mapped_column(String(20), default="basic")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subscription_start: Mapped[Optional[date]] = mapped_column(Date)
    subscription_end: Mapped[Optional[date]] = mapped_column(Date)
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    grace_period_days: Mapped[int] = mapped_column(Integer, default=7)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "owner_name": self.owner_name,
            "mobile": self.mobile,
            "email": self.email,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "gstin": self.gstin,
            "garage_type": self.garage_type,
            "plan": self.plan,
            "is_active": self.is_active,
            "subscription_start": self.subscription_start.isoformat() if self.subscription_start else None,
            "subscription_end": self.subscription_end.isoformat() if self.subscription_end else None,
            "max_users": self.max_users,
            "grace_period_days": self.grace_period_days,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
