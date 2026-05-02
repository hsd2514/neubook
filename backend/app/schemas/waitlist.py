from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WaitlistJoinRequest(BaseModel):
    appointment_type_id: int
    resource_id: Optional[int] = None
    start_time: datetime
    seat_ids: Optional[list[int]] = None
    answers: Optional[dict | list] = None


class WaitlistEntryOut(BaseModel):
    id: int
    customer_id: int
    appointment_type_id: int
    resource_id: Optional[int]
    start_time: datetime
    seat_ids: Optional[list[int]]
    answers: Optional[dict | list]
    position: int
    status: str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SlotWaitlistInfo(BaseModel):
    """Returned by the availability endpoint — how many people are waiting."""
    appointment_type_id: int
    resource_id: Optional[int]
    start_time: datetime
    waiting_count: int
    user_position: Optional[int] = None  # None if user is not on the waitlist
