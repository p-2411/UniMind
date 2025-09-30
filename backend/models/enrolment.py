from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class Enrolment(Base):
    __tablename__ = "enrolments"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    course_code: Mapped[str] = mapped_column(String(32),
        ForeignKey("courses.code", ondelete="CASCADE"), primary_key=True)

    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="NOW()", nullable=False)

    user:   Mapped["User"]   = relationship(back_populates="enrolments")
    course: Mapped["Course"] = relationship(back_populates="enrolments")
