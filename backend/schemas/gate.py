from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from .progress import ProgressStage


class GatePolicy(BaseModel):
    allow_ms_on_correct: int = Field(ge=0)
    lockout_seconds_on_fail: int = Field(default=0, ge=0)


class GateQuestion(BaseModel):
    question_id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    prompt: str
    choices: list[str]
    difficulty: str
    policy: GatePolicy


class GateAnswerRequest(BaseModel):
    question_id: uuid.UUID
    answer_index: int = Field(ge=0, le=3)
    seconds: int | None = Field(default=None, ge=0)


class GateAnswerResult(BaseModel):
    correct: bool
    allow_ms: int
    explanation: str | None
    topic_id: uuid.UUID
    stage: ProgressStage
    percent_complete: int
