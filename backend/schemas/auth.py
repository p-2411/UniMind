from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class SignupRequest(BaseModel):
    user_id: str = Field(..., min_length=1, description="Unique user ID")
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)
    subjects: List[str] = Field(default_factory=list, description="List of subject codes")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    token: str

class UserResponse(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    email: str
    subjects: List[str]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
