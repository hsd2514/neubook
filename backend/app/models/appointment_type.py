from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organiser_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    appointment_kind: Mapped[str] = mapped_column(
        String(32), nullable=False, default="resource"
    )  # user | resource
    slot_schedule: Mapped[str] = mapped_column(
        String(32), nullable=False, default="weekly"
    )  # weekly | flexible
    visibility: Mapped[str] = mapped_column(
        String(32), nullable=False, default="public"
    )  # public | unlisted | private
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    manage_capacity: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    advance_payment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    manual_confirmation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assignment_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="manual"
    )  # auto | manual
    service_amount_paisa: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    max_bookings_per_slot: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    share_link: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)

    organiser = relationship("User", back_populates="appointment_types")
    resources = relationship("Resource", back_populates="appointment_type", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="appointment_type", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="appointment_type", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="appointment_type")
