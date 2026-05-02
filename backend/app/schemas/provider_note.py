from datetime import datetime
from pydantic import BaseModel


class ProviderNoteCreate(BaseModel):
    customer_id: int
    content: str


class ProviderNoteOut(BaseModel):
    id: int
    provider_id: int
    customer_id: int
    content: str
    created_at: datetime | None

    model_config = {"from_attributes": True}
