from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=256)

class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    password: str | None = Field(default=None, min_length=8, max_length=256)
    is_active: bool | None = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
