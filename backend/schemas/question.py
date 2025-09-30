from __future__ import annotations
from typing import List
from pydantic import BaseModel, Field, ConfigDict

class QuestionBase(BaseModel):
    subtopic_id: int
    prompt: str = Field(min_length=1)
    choices: List[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    difficulty: int | None = Field(default=None, ge=1, le=5)
    explanation: str | None = None
    tags: List[str] = []

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    prompt: str | None = None
    choices: List[str] | None = None
    correct_index: int | None = Field(default=None, ge=0, le=3)
    difficulty: int | None = Field(default=None, ge=1, le=5)
    explanation: str | None = None
    tags: List[str] | None = None
    is_archived: bool | None = None

class QuestionOut(BaseModel):
    id: int
    subtopic_id: int
    prompt: str
    choices: List[str]
    correct_index: int
    difficulty: int | None
    explanation: str | None
    tags: List[str]
    is_archived: bool
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
