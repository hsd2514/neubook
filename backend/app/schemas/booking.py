from datetime import datetime

from pydantic import BaseModel, Field


class SlotOut(BaseModel):
    start: datetime
    end: datetime
    available_capacity: int


class AvailabilityDay(BaseModel):
    date: str
    slots: list[SlotOut]


class BookingCreate(BaseModel):
    appointment_type_id: int
    resource_id: int | None = None
    start_time: datetime
    capacity: int = 1
    answers: dict | list | None = None


class BookingOut(BaseModel):
    id: int
    customer_id: int
    appointment_type_id: int
    resource_id: int | None
    start_time: datetime
    end_time: datetime
    capacity: int
    status: str
    answers: dict | list | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class BookingReschedule(BaseModel):
    start_time: datetime
