from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict

class AssessmentBase(BaseModel):
    course_id: int
    title: str = Field(min_length=1, max_length=200)
    weight: float = Field(ge=0, le=100)
    due_at: str | None = None
    description: str | None = Field(default=None, max_length=10000)

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    weight: float | None = Field(default=None, ge=0, le=100)
    due_at: str | None = None
    description: str | None = Field(default=None, max_length=10000)
    is_archived: bool | None = None

class AssessmentOut(BaseModel):
    id: int
    course_id: int
    title: str
    weight: float
    due_at: str | None
    description: str | None
    is_archived: bool
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
