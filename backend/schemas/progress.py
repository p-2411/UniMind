from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

class ProgressStatus(str, Enum):
    unseen = "unseen"
    in_progress = "in_progress"
    mastered = "mastered"

class TopicProgressBase(BaseModel):
    user_id: int
    topic_id: int
    status: ProgressStatus = ProgressStatus.unseen
    percent_complete: int = Field(ge=0, le=100, default=0)

class TopicProgressCreate(TopicProgressBase):
    pass

class TopicProgressUpdate(BaseModel):
    status: ProgressStatus | None = None
    percent_complete: int | None = Field(default=None, ge=0, le=100)
    last_seen_at: str | None = None
    last_practised_at: str | None = None

class TopicProgressOut(BaseModel):
    id: int
    user_id: int
    topic_id: int
    status: ProgressStatus
    percent_complete: int
    last_seen_at: str | None
    last_practised_at: str | None
    updated_at: str | None = None
    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
