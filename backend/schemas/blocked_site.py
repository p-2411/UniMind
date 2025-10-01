from __future__ import annotations

from pydantic import BaseModel, Field


class BlockedSiteCreate(BaseModel):
    domain: str = Field(..., min_length=1, max_length=255, description="Domain to block (e.g., 'youtube.com')")


class BlockedSiteOut(BaseModel):
    id: str
    domain: str

    class Config:
        from_attributes = True
