from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EnrolRequest(BaseModel):
    course_code: str = Field(min_length=1, max_length=32)


class EnrolmentOut(BaseModel):
    user_id: uuid.UUID
    course_code: str
    enrolled_at: datetime | None = None

    class Config:
        from_attributes = True
