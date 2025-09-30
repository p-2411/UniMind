from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

class EnrolRole(str, Enum):
    student = "student"
    tutor = "tutor"
    admin = "admin"

class EnrolmentBase(BaseModel):
    user_id: int
    course_id: int
    role: EnrolRole = EnrolRole.student

class EnrolmentCreate(EnrolmentBase):
    pass

class EnrolmentUpdate(BaseModel):
    role: EnrolRole | None = None
    is_active: bool | None = None

class EnrolmentOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    role: EnrolRole
    is_active: bool
    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
