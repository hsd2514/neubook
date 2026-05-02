from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_type_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_types.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    working_hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    appointment_type = relationship("AppointmentType", back_populates="resources")
    schedules = relationship("Schedule", back_populates="resource")
    bookings = relationship("Booking", back_populates="resource")
