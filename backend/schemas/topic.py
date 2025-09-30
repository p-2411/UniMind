from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict

class TopicBase(BaseModel):
    course_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    order_index: int | None = Field(default=None, ge=0)

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    order_index: int | None = Field(default=None, ge=0)
    is_archived: bool | None = None

class TopicOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: str | None
    order_index: int | None
    is_archived: bool
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
