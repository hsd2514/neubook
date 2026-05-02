import datetime

from sqlalchemy import Date, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_type_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_types.id"), nullable=False, index=True
    )
    resource_id: Mapped[int | None] = mapped_column(
        ForeignKey("resources.id"), nullable=True, index=True
    )
    schedule_mode: Mapped[str] = mapped_column(String(32), nullable=False, default="weekly")  # weekly | flexible
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0=Monday .. 6=Sunday
    slot_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[datetime.time] = mapped_column(Time, nullable=False)

    appointment_type = relationship("AppointmentType", back_populates="schedules")
    resource = relationship("Resource", back_populates="schedules")
