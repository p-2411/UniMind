from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from backend.database import Base
import uuid


class Course(Base):
    __tablename__ = "courses"

    course_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)

    # Raw lecture slides/content as a single text blob
    slides_content = Column(Text, nullable=False)

    # Structured analysis produced by the AI
    # Expected shape (example):
    # {
    #   "topics": [
    #     {
    #       "name": "Topic Name",
    #       "topic_strength": 0.0..1.0,
    #       "subtopics": [
    #         {"name": "Subtopic Name", "topic_strength": 0.0..1.0}
    #       ]
    #     }
    #   ]
    # }
    analysis = Column(JSONB, nullable=True)

    # Flattened list of generated MCQs across topics/subtopics
    # Each element should include at least the fields specified in main.py demo:
    # {"id": str, "type": "mcq", "topic": str, "text": str,
    #  "choices": [str, ...], "difficulty": "easy|medium|hard"}
    questions = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assessments=Column(JSONB, nullable=True)  # New field for assessments
