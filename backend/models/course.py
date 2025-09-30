from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class Course(Base):
    __tablename__ = "courses"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g., COMP2521
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    enrolments: Mapped[list["Enrolment"]] = relationship(back_populates="course", cascade="all, delete-orphan")
    topics:     Mapped[list["Topic"]]     = relationship(back_populates="course", cascade="all, delete-orphan")
    assessments:Mapped[list["Assessment"]] = relationship(back_populates="course", cascade="all, delete-orphan")

