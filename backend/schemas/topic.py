from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class TopicBase(BaseModel):
    course_code: str
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None)

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None

class TopicOut(BaseModel):
    id: uuid.UUID
    course_code: str
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicPriorityOut(TopicOut):
    priority_score: float = Field(ge=-1e9, le=1e9)
