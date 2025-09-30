from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CourseCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)


class CourseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)


class CourseOut(BaseModel):
    code: str
    name: str
    description: str | None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
