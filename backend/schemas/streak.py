from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict

class StreakBase(BaseModel):
    user_id: int
    current_streak: int = Field(ge=0, default=0)
    longest_streak: int = Field(ge=0, default=0)
    last_active_date: str | None = None

class StreakUpdate(BaseModel):
    current_streak: int | None = Field(default=None, ge=0)
    longest_streak: int | None = Field(default=None, ge=0)
    last_active_date: str | None = None

class StreakOut(BaseModel):
    id: int
    user_id: int
    current_streak: int
    longest_streak: int
    last_active_date: str | None
    updated_at: str | None = None
    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
