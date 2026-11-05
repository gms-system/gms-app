import uuid
import enum
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class JobCardStatus(str, enum.Enum):
    received = "received"
    work_in_progress = "work_in_progress"
    quality_check = "quality_check"
    ready_for_delivery = "ready_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class JobCard(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "job_cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    job_card_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    service_advisor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    status: Mapped[JobCardStatus] = mapped_column(SAEnum(JobCardStatus, name="job_card_status", create_type=False), default=JobCardStatus.received)
    customer_complaint: Mapped[Optional[str]] = mapped_column(Text)
    inspection_notes: Mapped[Optional[str]] = mapped_column(Text)
    odometer_in: Mapped[Optional[int]] = mapped_column(Integer)
    odometer_out: Mapped[Optional[int]] = mapped_column(Integer)
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(Date)
    actual_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="job_cards")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="job_cards")
    service_advisor: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[service_advisor_id])
    status_history: Mapped[list["JobCardStatusHistory"]] = relationship("JobCardStatusHistory", back_populates="job_card", lazy="select")
    photos: Mapped[list["JobCardPhoto"]] = relationship("JobCardPhoto", back_populates="job_card", lazy="select")
    technicians: Mapped[list["JobCardTechnician"]] = relationship("JobCardTechnician", back_populates="job_card", lazy="select")

    def __repr__(self) -> str:
        return f"<JobCard {self.job_card_number} {self.status}>"


class JobCardStatusHistory(Base):
    __tablename__ = "job_card_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False)
    old_status: Mapped[Optional[JobCardStatus]] = mapped_column(SAEnum(JobCardStatus, name="job_card_status", create_type=False))
    new_status: Mapped[JobCardStatus] = mapped_column(SAEnum(JobCardStatus, name="job_card_status", create_type=False), nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    job_card: Mapped["JobCard"] = relationship("JobCard", back_populates="status_history")


class JobCardPhoto(Base):
    __tablename__ = "job_card_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False)
    photo_type: Mapped[str] = mapped_column(String(20), default="before")
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    job_card: Mapped["JobCard"] = relationship("JobCard", back_populates="photos")


class JobCardTechnician(Base):
    __tablename__ = "job_card_technicians"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False)
    technician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    job_card: Mapped["JobCard"] = relationship("JobCard", back_populates="technicians")
    technician: Mapped["Employee"] = relationship("Employee", foreign_keys=[technician_id])
