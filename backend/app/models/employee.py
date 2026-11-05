import uuid
import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Boolean, Date, DateTime, Numeric, Enum as SAEnum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class EmployeeRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    service_advisor = "service_advisor"
    technician = "technician"
    receptionist = "receptionist"
    store_manager = "store_manager"


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    garage_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("garages.id"), nullable=True, index=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    mobile: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    role: Mapped[EmployeeRole] = mapped_column(SAEnum(EmployeeRole, name="employee_role", create_type=False), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String)
    date_of_joining: Mapped[Optional[date]] = mapped_column(Date)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date)
    address: Mapped[Optional[str]] = mapped_column(String)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(20))
    pan_number: Mapped[Optional[str]] = mapped_column(String(15))
    salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    avatar_url: Mapped[Optional[str]] = mapped_column(String)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name or ''}".strip()

    def __repr__(self) -> str:
        return f"<Employee {self.employee_code} {self.full_name}>"
