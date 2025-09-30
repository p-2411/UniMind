from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict

class AttemptBase(BaseModel):
    user_id: int
    question_id: int
    selected_index: int = Field(ge=0, le=3)
    was_correct: bool
    time_taken_ms: int = Field(ge=0)

class AttemptCreate(AttemptBase):
    pass

class AttemptUpdate(BaseModel):
    selected_index: int | None = Field(default=None, ge=0, le=3)
    was_correct: bool | None = None
    time_taken_ms: int | None = Field(default=None, ge=0)

class AttemptOut(BaseModel):
    id: int
    user_id: int
    question_id: int
    selected_index: int
    was_correct: bool
    time_taken_ms: int
    answered_at: str

    model_config = ConfigDict(from_attributes=True)
