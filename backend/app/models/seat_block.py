from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SeatBlock(Base):
    __tablename__ = "seat_blocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_type_id: Mapped[int] = mapped_column(ForeignKey("appointment_types.id"), nullable=False, index=True)
    resource_id: Mapped[int | None] = mapped_column(ForeignKey("resources.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    seat_class: Mapped[str] = mapped_column(String(64), nullable=False, default="standard")
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    price_override_paisa: Mapped[int | None] = mapped_column(Integer, nullable=True)
    x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    appointment_type = relationship("AppointmentType", back_populates="seat_blocks")
    resource = relationship("Resource", back_populates="seat_blocks")
    seats = relationship("Seat", back_populates="block", cascade="all, delete-orphan")
