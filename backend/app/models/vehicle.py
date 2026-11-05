import uuid
import enum
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class FuelType(str, enum.Enum):
    petrol = "petrol"
    diesel = "diesel"
    cng = "cng"
    electric = "electric"
    hybrid = "hybrid"
    lpg = "lpg"


class TransmissionType(str, enum.Enum):
    manual = "manual"
    automatic = "automatic"
    amt = "amt"
    dct = "dct"
    cvt = "cvt"
    imt = "imt"


class Vehicle(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    registration_number: Mapped[str] = mapped_column(String(20), nullable=False)
    chassis_number: Mapped[Optional[str]] = mapped_column(String(50))
    engine_number: Mapped[Optional[str]] = mapped_column(String(50))
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    variant: Mapped[Optional[str]] = mapped_column(String(100))
    manufacturing_year: Mapped[Optional[int]] = mapped_column(Integer)
    fuel_type: Mapped[Optional[FuelType]] = mapped_column(SAEnum(FuelType, name="fuel_type", create_type=False))
    transmission: Mapped[Optional[TransmissionType]] = mapped_column(SAEnum(TransmissionType, name="transmission_type", create_type=False))
    color: Mapped[Optional[str]] = mapped_column(String(50))
    current_odometer: Mapped[Optional[int]] = mapped_column(Integer)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))

    owner: Mapped["Customer"] = relationship("Customer", back_populates="vehicles")
    job_cards: Mapped[list] = relationship("JobCard", back_populates="vehicle", lazy="select")

    def __repr__(self) -> str:
        return f"<Vehicle {self.registration_number} {self.make} {self.model}>"
