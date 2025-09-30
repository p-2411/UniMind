from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

DifficultyEnum = Enum("easy", "medium", "hard", name="difficulty_enum")

class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("array_length(choices, 1) = 4", name="ck_questions_choices_len4"),
        CheckConstraint("correct_index >= 0 AND correct_index <= 3", name="ck_questions_correct_index_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    topic_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)

    # Optional subtopic refinement
    subtopic_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("subtopics.id", ondelete="SET NULL"))

    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    choices: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)  # 4 choices
    correct_index: Mapped[int] = mapped_column(nullable=False)                 # 0..3
    difficulty: Mapped[str] = mapped_column(DifficultyEnum, nullable=False, default="medium")
    explanation: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic:     Mapped["Topic"]     = relationship(back_populates="questions")
    subtopic:  Mapped["Subtopic"]  = relationship(back_populates="questions")
    attempts:  Mapped[list["QuestionAttempt"]] = relationship(back_populates="question", cascade="all, delete-orphan")
