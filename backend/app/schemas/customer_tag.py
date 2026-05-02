from datetime import datetime
from pydantic import BaseModel


class CustomerTagCreate(BaseModel):
    customer_id: int
    label: str
    color: str | None = "#e5e7eb"
    is_system_suggested: bool = False


class CustomerTagOut(BaseModel):
    id: int
    provider_id: int
    customer_id: int
    label: str
    color: str
    is_system_suggested: bool
    created_at: datetime | None

    model_config = {"from_attributes": True}
