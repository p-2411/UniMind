from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProgressStage(str, enum.Enum):
    unseen = "unseen"
    in_progress = "in_progress"
    mastered = "mastered"


class TopicProgressOut(BaseModel):
    user_id: uuid.UUID
    topic_id: uuid.UUID
    stage: ProgressStage
    percent_complete: int = Field(ge=0, le=100)
    last_seen_at: datetime | None
    last_practised_at: datetime | None
    updated_at: datetime | None
    created_at: datetime | None

    class Config:
        from_attributes = True


class ProgressItem(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    course_code: str
    stage: ProgressStage
    percent_complete: int = Field(ge=0, le=100)
