from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AssessmentBase(BaseModel):
    course_code: str
    title: str = Field(min_length=1, max_length=255)
    weight: float | None = Field(default=None, ge=0, le=100)
    due_at: datetime | None = None
    description: str | None = Field(default=None)

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    weight: float | None = Field(default=None, ge=0, le=100)
    due_at: datetime | None = None
    description: str | None = None

class AssessmentOut(BaseModel):
    id: uuid.UUID
    course_code: str
    title: str
    weight: float | None
    due_at: datetime | None
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
