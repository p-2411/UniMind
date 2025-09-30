from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.course import Course
from backend.models.enrolment import Enrolment
from backend.models.question import Question
from backend.models.attempt import QuestionAttempt
from backend.models.topic import Topic
from backend.models.progress import TopicProgress
from backend.models.user import User
from backend.schemas import AttemptCreate, AttemptResult, CourseOut, EnrolRequest, ProgressItem
from backend.services.progress import apply_attempt, ensure_topic_progress, stage_from_percent
from backend.services.streaks import update_streak

router = APIRouter(prefix="/students", tags=["students"])


def _assert_same_user(path_user_id: str, current_user: User) -> uuid.UUID:
    try:
        requested_id = uuid.UUID(path_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user_id format") from exc

    if requested_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own resources")
    return requested_id


@router.get("/{user_id}/enrolments", response_model=list[CourseOut])
def list_enrolments(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    rows = (
        db.query(Course)
        .join(Enrolment, Enrolment.course_code == Course.code)
        .filter(Enrolment.user_id == current_user.id)
        .order_by(Course.name.asc())
        .all()
    )
    return rows


@router.post("/{user_id}/enrolments", status_code=status.HTTP_201_CREATED, response_model=CourseOut)
def enrol_student(
    user_id: str,
    payload: EnrolRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    course = db.get(Course, payload.course_code.upper())
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if db.get(Enrolment, (current_user.id, course.code)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")

    db.add(Enrolment(user_id=current_user.id, course_code=course.code))
    db.commit()

    return course


@router.post("/{user_id}/attempts", response_model=AttemptResult)
def submit_attempt(
    user_id: str,
    payload: AttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    question = db.get(Question, payload.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if payload.answer_index >= len(question.choices):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="answer_index out of range")

    is_correct = payload.answer_index == question.correct_index
    attempt = QuestionAttempt(
        user_id=current_user.id,
        question_id=question.id,
        was_correct=is_correct,
        seconds=payload.seconds or 0,
    )
    db.add(attempt)

    progress = ensure_topic_progress(db, current_user.id, question.topic_id)
    apply_attempt(progress, is_correct, payload.seconds)

    update_streak(db, current_user.id, datetime.utcnow())

    db.commit()
    db.refresh(progress)

    return AttemptResult(
        correct=is_correct,
        explanation=question.explanation or "",
        topic_id=question.topic_id,
        stage=progress.stage,
        percent_complete=progress.percent_complete,
    )


@router.get("/{user_id}/progress", response_model=list[ProgressItem])
def list_progress(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    rows = (
        db.query(Topic, TopicProgress)
        .join(TopicProgress, TopicProgress.topic_id == Topic.id)
        .filter(TopicProgress.user_id == current_user.id)
        .all()
    )

    items: list[ProgressItem] = []
    for topic, progress in rows:
        items.append(
            ProgressItem(
                topic_id=topic.id,
                topic_name=topic.name,
                course_code=topic.course_code,
                stage=progress.stage,
                percent_complete=progress.percent_complete,
            )
        )
    return items


@router.get("/{user_id}/progress/{topic_id}", response_model=ProgressItem)
def get_progress(
    user_id: str,
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    progress = (
        db.query(TopicProgress)
        .filter(
            TopicProgress.user_id == current_user.id,
            TopicProgress.topic_id == topic_id,
        )
        .first()
    )

    if progress is None:
        stage = stage_from_percent(0)
        percent = 0
    else:
        stage = progress.stage
        percent = progress.percent_complete

    return ProgressItem(
        topic_id=topic.id,
        topic_name=topic.name,
        course_code=topic.course_code,
        stage=stage,
        percent_complete=percent,
    )
