from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from .progress import ProgressStage


class AttemptCreate(BaseModel):
    question_id: uuid.UUID
    answer_index: int = Field(ge=0, le=3)
    seconds: int | None = Field(default=None, ge=0)


class AttemptResult(BaseModel):
    correct: bool
    explanation: str | None
    topic_id: uuid.UUID
    stage: ProgressStage
    percent_complete: int
