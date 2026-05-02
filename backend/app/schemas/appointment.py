from pydantic import BaseModel, Field


class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    working_hours: dict | list | None = None


class ResourceOut(BaseModel):
    id: int
    appointment_type_id: int
    name: str
    working_hours: dict | list | None

    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    resource_id: int | None = None
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str  # "HH:MM"
    end_time: str


class ScheduleOut(BaseModel):
    id: int
    appointment_type_id: int
    resource_id: int | None
    day_of_week: int
    start_time: str
    end_time: str

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    label: str
    field_type: str = "text"
    is_required: bool = False
    options: dict | list | None = None
    sort_order: int = 0


class QuestionOut(BaseModel):
    id: int
    appointment_type_id: int
    label: str
    field_type: str
    is_required: bool
    options: dict | list | None
    sort_order: int

    model_config = {"from_attributes": True}


class AppointmentTypeCreate(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int = 30
    appointment_kind: str = "resource"
    slot_schedule: str = "weekly"
    is_published: bool = False
    manage_capacity: bool = False
    advance_payment: bool = False
    manual_confirmation: bool = False
    assignment_mode: str = "manual"
    max_bookings_per_slot: int = 1


class AppointmentTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    appointment_kind: str | None = None
    slot_schedule: str | None = None
    is_published: bool | None = None
    manage_capacity: bool | None = None
    advance_payment: bool | None = None
    manual_confirmation: bool | None = None
    assignment_mode: str | None = None
    max_bookings_per_slot: int | None = None


class AppointmentTypeOut(BaseModel):
    id: int
    organiser_id: int
    name: str
    description: str | None
    duration_minutes: int
    appointment_kind: str
    slot_schedule: str
    is_published: bool
    manage_capacity: bool
    advance_payment: bool
    manual_confirmation: bool
    assignment_mode: str
    max_bookings_per_slot: int
    share_link: str | None
    resources: list[ResourceOut] = []
    schedules: list[ScheduleOut] = []
    questions: list[QuestionOut] = []

    model_config = {"from_attributes": True}
