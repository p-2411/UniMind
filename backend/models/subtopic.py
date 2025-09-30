from pydantic import BaseModel
from datetime import datetime
import uuid

class SubtopicCreate(BaseModel):
    topic_id: uuid.UUID
    name: str
    description: str | None = None

class SubtopicOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime

    class Config:
        orm_mode = True