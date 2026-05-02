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
    payment_confirmed: bool = False
    payment_reference: str | None = None
    share_token: str | None = None


class BookingOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str | None = None
    appointment_type_id: int
    appointment_type_name: str | None = None
    resource_id: int | None
    resource_name: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int
    status: str
    payment_status: str
    payment_reference: str | None
    answers: dict | list | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class BookingReschedule(BaseModel):
    start_time: datetime


class PhonePePaymentInitiateIn(BaseModel):
    amount_paisa: int = Field(ge=100)
    redirect_url: str
    merchant_order_id: str | None = None


class PhonePePaymentInitiateOut(BaseModel):
    merchant_order_id: str
    state: str
    redirect_url: str
    order_id: str
    expire_at: int | None = None


class PhonePePaymentStatusIn(BaseModel):
    merchant_order_id: str


class PhonePePaymentStatusOut(BaseModel):
    state: str | None = None
    amount: int | None = None
    merchant_order_id: str | None = None
    raw: dict


class PhonePeCallbackValidateIn(BaseModel):
    authorization_header: str
    callback_body: str
