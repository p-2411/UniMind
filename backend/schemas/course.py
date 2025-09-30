from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


class MCQ(BaseModel):
    id: str
    type: str = Field("mcq", description="Question type, must be 'mcq'")
    topic: str
    text: str
    choices: List[str]
    difficulty: str = Field(..., description="easy|medium|hard")


class Subtopic(BaseModel):
    name: str
    topic_strength: float = Field(..., ge=0, le=1)


class Topic(BaseModel):
    name: str
    topic_strength: float = Field(..., ge=0, le=1)
    subtopics: List[Subtopic] = Field(default_factory=list)


class Analysis(BaseModel):
    topics: List[Topic] = Field(default_factory=list)


class CourseCreateRequest(BaseModel):
    name: str
    slides_content: str


class CourseUpdateRequest(BaseModel):
    name: Optional[str] = None
    slides_content: Optional[str] = None


class CourseResponse(BaseModel):
    course_id: str
    name: str
    slides_content: str
    analysis: Optional[Analysis] = None
    questions: List[MCQ] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True

