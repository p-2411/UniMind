from __future__ import annotations
from typing import List
from pydantic import BaseModel, Field, AnyUrl, ConfigDict

class ContentBase(BaseModel):
    subtopic_id: int
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=10000)
    resource_urls: List[AnyUrl] = []

class ContentCreate(ContentBase):
    body: str | None = None

class ContentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=10000)
    resource_urls: List[AnyUrl] | None = None
    body: str | None = None
    is_archived: bool | None = None

class ContentOut(BaseModel):
    id: int
    subtopic_id: int
    title: str
    summary: str | None
    body: str | None
    resource_urls: List[AnyUrl]
    is_archived: bool
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)
