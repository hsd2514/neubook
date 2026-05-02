from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    appointment_type_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_types.id"), nullable=False, index=True
    )
    resource_id: Mapped[int | None] = mapped_column(ForeignKey("resources.id"), nullable=True, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    seat_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)  # for seat_map mode
    answers: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-based queue position
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="waiting"
    )  # waiting | notified | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("User", back_populates="waitlist_entries", foreign_keys=[customer_id])
    appointment_type = relationship("AppointmentType", back_populates="waitlist_entries")
    resource = relationship("Resource")
