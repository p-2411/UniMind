from __future__ import annotations
from typing import Generic, TypeVar, List
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PageMeta(BaseModel):
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    size: int = Field(ge=1)
    pages: int = Field(ge=0)

class Page(ORMModel, Generic[T]):
    items: List[T]
    meta: PageMeta
