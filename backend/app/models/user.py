from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32), nullable=False, default="customer"
    )  # customer, organiser, admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    brand_display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand_logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    brand_primary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#714b67")
    brand_accent_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#006a68")
    brand_theme: Mapped[str] = mapped_column(String(16), nullable=False, default="light")
    brand_booking_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    appointment_types = relationship("AppointmentType", back_populates="organiser")
    bookings = relationship("Booking", back_populates="customer")
