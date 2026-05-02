from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_type_id: Mapped[int] = mapped_column(ForeignKey("appointment_types.id"), nullable=False, index=True)
    block_id: Mapped[int] = mapped_column(ForeignKey("seat_blocks.id"), nullable=False, index=True)
    resource_id: Mapped[int | None] = mapped_column(ForeignKey("resources.id"), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    row_label: Mapped[str | None] = mapped_column(String(16), nullable=True)
    col_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seat_type: Mapped[str] = mapped_column(String(32), nullable=False, default="normal")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    appointment_type = relationship("AppointmentType", back_populates="seats")
    block = relationship("SeatBlock", back_populates="seats")
    resource = relationship("Resource", back_populates="seats")
    booking_links = relationship("BookingSeat", back_populates="seat", cascade="all, delete-orphan")
