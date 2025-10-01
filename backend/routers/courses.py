from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.course import Course
from backend.models.user import User
from backend.models.topic import Topic
from backend.models.question import Question
from backend.models.question_metric import QuestionMetric
from backend.models.attempt import QuestionAttempt
from backend.models.assessment import Assessment
from backend.models.progress import TopicProgress
from backend.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return courses


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    code = payload.code.upper()
    if db.get(Course, code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course code already exists")

    course = Course(code=code, name=payload.name, description=payload.description)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_code}", response_model=CourseOut)
def get_course(
    course_code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = db.get(Course, course_code.upper())
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_code}", response_model=CourseOut)
def update_course(
    course_code: str,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = db.get(Course, course_code.upper())
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if payload.name is not None:
        course.name = payload.name
    if payload.description is not None:
        course.description = payload.description

    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}/overview")
def get_course_overview(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get course overview including due questions, mastery, and upcoming assessments."""

    # Try to find course by ID first, then by code
    try:
        course_id_int = int(course_id)
        course = db.query(Course).filter(Course.id == course_id_int).first()
    except ValueError:
        course = db.get(Course, course_id.upper())

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Get all topics for this course
    topic_ids = db.query(Topic.id).filter(Topic.course_code == course.code).subquery()

    # Get all questions for this course
    question_ids = db.query(Question.id).filter(Question.topic_id.in_(topic_ids)).subquery()

    # Count questions that are due today or earlier
    now = datetime.now(timezone.utc)
    due_count = (
        db.query(func.count(QuestionMetric.question_id))
        .filter(
            QuestionMetric.user_id == current_user.id,
            QuestionMetric.question_id.in_(question_ids),
            QuestionMetric.next_due_at <= now
        )
        .scalar() or 0
    )

    # Count questions that were completed today (attempted today AND due today or earlier)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completed_due_today = (
        db.query(func.count(func.distinct(QuestionAttempt.question_id)))
        .join(QuestionMetric, QuestionMetric.question_id == QuestionAttempt.question_id)
        .filter(
            QuestionAttempt.user_id == current_user.id,
            QuestionAttempt.question_id.in_(question_ids),
            QuestionAttempt.answered_at >= today_start,
            QuestionMetric.next_due_at <= now
        )
        .scalar() or 0
    )

    # Calculate overall mastery
    topic_progress = (
        db.query(func.avg(TopicProgress.percentage_mastery))
        .filter(
            TopicProgress.user_id == current_user.id,
            TopicProgress.topic_id.in_(topic_ids)
        )
        .scalar() or 0.0
    )

    overall_mastery = float(topic_progress) / 100.0 if topic_progress else 0.0

    # Get upcoming assessments
    upcoming_assessments = (
        db.query(Assessment)
        .filter(
            Assessment.course_code == course.code,
            Assessment.due_at >= now
        )
        .order_by(Assessment.due_at.asc())
        .limit(5)
        .all()
    )

    return {
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "overall_mastery": overall_mastery,
        "due_count": due_count,
        "completed_due_count": completed_due_today,
        "upcoming_assessments": [
            {
                "id": a.id,
                "title": a.title,
                "due_at": a.due_at.isoformat() if a.due_at else None
            }
            for a in upcoming_assessments
        ]
    }
