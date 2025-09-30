from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict

class SubtopicBase(BaseModel):
    topic_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    order_index: int | None = Field(default=None, ge=0)

class SubtopicCreate(SubtopicBase):
    pass

class SubtopicUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    order_index: int | None = Field(default=None, ge=0)
    is_archived: bool | None = None

class SubtopicOut(BaseModel):
    id: int
    topic_id: int
    title: str
    description: str | None
    order_index: int | None
    is_archived: bool
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
