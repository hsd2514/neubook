from pydantic import BaseModel, Field, model_validator


class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    working_hours: dict | list | None = None


class ResourceOut(BaseModel):
    id: int
    appointment_type_id: int
    name: str
    working_hours: dict | list | None

    model_config = {"from_attributes": True}


class BlockedSlotCreate(BaseModel):
    block_type: str = "one_off"
    resource_id: int | None = None
    start_date: str
    end_date: str
    day_of_week: int | None = Field(None, ge=0, le=6)
    start_time: str | None = None
    end_time: str | None = None

    @model_validator(mode="after")
    def validate_block_fields(self):
        if self.block_type not in {"one_off", "recurring", "holiday"}:
            raise ValueError("block_type must be one_off, recurring, or holiday")
        if self.block_type == "recurring" and self.day_of_week is None:
            raise ValueError("day_of_week is required for recurring blocks")
        if self.block_type != "recurring" and self.day_of_week is not None:
            raise ValueError("day_of_week is only allowed for recurring blocks")
        if (self.start_time is None) != (self.end_time is None):
            raise ValueError("start_time and end_time must both be provided for partial-day blocks")
        return self


class BlockedSlotOut(BaseModel):
    id: int
    appointment_type_id: int
    block_type: str
    resource_id: int | None
    start_date: str
    end_date: str
    day_of_week: int | None
    start_time: str | None
    end_time: str | None

    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    schedule_mode: str = "weekly"
    resource_id: int | None = None
    day_of_week: int | None = Field(None, ge=0, le=6)
    slot_date: str | None = None
    start_time: str  # "HH:MM"
    end_time: str

    @model_validator(mode="after")
    def validate_schedule_mode_fields(self):
        if self.schedule_mode not in {"weekly", "flexible"}:
            raise ValueError("schedule_mode must be weekly or flexible")
        if self.schedule_mode == "weekly":
            if self.day_of_week is None:
                raise ValueError("day_of_week is required for weekly schedules")
            if self.slot_date is not None:
                raise ValueError("slot_date is not allowed for weekly schedules")
        else:
            if self.slot_date is None:
                raise ValueError("slot_date is required for flexible schedules")
            if self.day_of_week is not None:
                raise ValueError("day_of_week is not allowed for flexible schedules")
        return self


class ScheduleOut(BaseModel):
    id: int
    appointment_type_id: int
    schedule_mode: str
    resource_id: int | None
    day_of_week: int | None
    slot_date: str | None
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
    visibility: str = "public"
    is_published: bool = False
    manage_capacity: bool = False
    advance_payment: bool = False
    manual_confirmation: bool = False
    assignment_mode: str = "manual"
    max_bookings_per_slot: int = 1

    @model_validator(mode="after")
    def validate_visibility(self):
        if self.visibility not in {"public", "unlisted", "private"}:
            raise ValueError("visibility must be public, unlisted, or private")
        return self


class AppointmentTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    appointment_kind: str | None = None
    slot_schedule: str | None = None
    visibility: str | None = None
    is_published: bool | None = None
    manage_capacity: bool | None = None
    advance_payment: bool | None = None
    manual_confirmation: bool | None = None
    assignment_mode: str | None = None
    max_bookings_per_slot: int | None = None

    @model_validator(mode="after")
    def validate_visibility(self):
        if self.visibility is not None and self.visibility not in {"public", "unlisted", "private"}:
            raise ValueError("visibility must be public, unlisted, or private")
        return self


class AppointmentTypeOut(BaseModel):
    id: int
    organiser_id: int
    name: str
    description: str | None
    duration_minutes: int
    appointment_kind: str
    slot_schedule: str
    visibility: str
    is_published: bool
    manage_capacity: bool
    advance_payment: bool
    manual_confirmation: bool
    assignment_mode: str
    max_bookings_per_slot: int
    share_link: str | None
    resources: list[ResourceOut] = []
    schedules: list[ScheduleOut] = []
    blocked_slots: list[BlockedSlotOut] = []
    questions: list[QuestionOut] = []

    model_config = {"from_attributes": True}
