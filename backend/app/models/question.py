from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_type_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_types.id"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    field_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="text"
    )  # text | select | checkbox
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    options: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    appointment_type = relationship("AppointmentType", back_populates="questions")
