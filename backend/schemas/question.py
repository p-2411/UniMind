from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class QuestionCreate(BaseModel):
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID | None = None
    prompt: str = Field(min_length=1)
    choices: List[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    difficulty: str = Field(pattern="^(easy|medium|hard)$")
    explanation: str | None = None


class QuestionOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID | None
    prompt: str
    choices: List[str]
    difficulty: str
    explanation: str | None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
