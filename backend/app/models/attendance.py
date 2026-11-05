import uuid
import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Date, DateTime, Numeric, Text, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"
    leave = "leave"


class LeaveType(str, enum.Enum):
    casual = "casual"
    sick = "sick"
    privilege = "privilege"
    unpaid = "unpaid"


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("employee_id", "attendance_date", name="uq_attendance_emp_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus, name="attendance_status", create_type=False), nullable=False, default=AttendanceStatus.present)
    punch_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    punch_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    working_hours: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    leave_type: Mapped[Optional[LeaveType]] = mapped_column(SAEnum(LeaveType, name="leave_type", create_type=False))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    marked_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
