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
from backend.models.assessment import Assessment
from backend.schemas import AttemptCreate, AttemptResult, CourseOut, EnrolRequest, ProgressItem
from backend.schemas.topic import TopicOut, TopicPriorityOut
from backend.schemas.assessment import AssessmentOut
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


@router.get("/{user_id}/priority-topics", response_model=list[TopicPriorityOut])
def get_priority_topics(
    user_id: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get priority topics for the user based on their progress and course enrolments."""
    _assert_same_user(user_id, current_user)

    # Get all topics from enrolled courses
    enrolled_topics = (
        db.query(Topic)
        .join(Course, Topic.course_code == Course.code)
        .join(Enrolment, Enrolment.course_code == Course.code)
        .filter(Enrolment.user_id == current_user.id)
        .all()
    )

    # Get user's progress for these topics
    progress_map = {
        p.topic_id: p
        for p in db.query(TopicProgress)
        .filter(TopicProgress.user_id == current_user.id)
        .all()
    }

    # Calculate priority score for each topic
    topic_scores = []
    for topic in enrolled_topics:
        progress = progress_map.get(topic.id)
        if progress:
            # Prioritize topics that are started but not completed
            if progress.percent_complete < 100:
                priority_score = 100 - progress.percent_complete
            else:
                priority_score = -1  # Completed topics get low priority
        else:
            # Unseen topics get medium priority
            priority_score = 50

        topic_scores.append((topic, priority_score))

    # Sort by priority score (highest first) and return top N
    topic_scores.sort(key=lambda x: x[1], reverse=True)
    priority_topics: list[TopicPriorityOut] = []
    for topic, score in topic_scores[:limit]:
        if score < 0:
            continue
        priority_topics.append(
            TopicPriorityOut(
                id=topic.id,
                course_code=topic.course_code,
                name=topic.name,
                description=topic.description,
                created_at=topic.created_at,
                priority_score=float(score),
            )
        )

    return priority_topics


@router.get("/{user_id}/upcoming-assessments", response_model=list[AssessmentOut])
def get_upcoming_assessments(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming assessments for the user's enrolled courses."""
    _assert_same_user(user_id, current_user)

    # Get all assessments from enrolled courses, ordered by due date
    # This shows both past and future assessments for demonstration purposes
    assessments = (
        db.query(Assessment)
        .join(Course, Assessment.course_code == Course.code)
        .join(Enrolment, Enrolment.course_code == Course.code)
        .filter(Enrolment.user_id == current_user.id)
        .filter(Assessment.due_at.isnot(None))
        .order_by(Assessment.due_at.asc())
        .limit(limit)
        .all()
    )

    return assessments


@router.get("/{user_id}/questions-for-extension")
def get_questions_for_extension(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all questions from enrolled courses with attempt metadata for the extension algorithm."""
    _assert_same_user(user_id, current_user)

    # Get all questions from enrolled courses
    questions_query = (
        db.query(Question, Topic)
        .join(Topic, Question.topic_id == Topic.id)
        .join(Course, Topic.course_code == Course.code)
        .join(Enrolment, Enrolment.course_code == Course.code)
        .filter(Enrolment.user_id == current_user.id)
        .all()
    )

    # Get user's attempts for these questions
    question_ids = [q.id for q, _ in questions_query]
    attempts_query = (
        db.query(QuestionAttempt)
        .filter(
            QuestionAttempt.user_id == current_user.id,
            QuestionAttempt.question_id.in_(question_ids)
        )
        .all()
    )

    # Calculate metadata for each question
    attempts_by_question = {}
    for attempt in attempts_query:
        if attempt.question_id not in attempts_by_question:
            attempts_by_question[attempt.question_id] = []
        attempts_by_question[attempt.question_id].append(attempt)

    result = []
    for question, topic in questions_query:
        question_attempts = attempts_by_question.get(question.id, [])

        # Calculate rolling accuracy (EMA with alpha=0.2)
        rolling_accuracy = 0.5  # default
        if question_attempts:
            acc = rolling_accuracy
            for attempt in sorted(question_attempts, key=lambda a: a.answered_at):
                target = 1.0 if attempt.was_correct else 0.0
                acc = 0.2 * target + 0.8 * acc
            rolling_accuracy = acc

        # Calculate last_seen_at and next_due_at
        last_seen_at = None
        next_due_at = None
        if question_attempts:
            last_attempt = max(question_attempts, key=lambda a: a.answered_at)
            last_seen_at = int(last_attempt.answered_at.timestamp() * 1000)  # ms

            # Simple spaced repetition: if last was correct, due in 24h, else 6h
            if last_attempt.was_correct:
                next_due_at = last_seen_at + (24 * 60 * 60 * 1000)
            else:
                next_due_at = last_seen_at + (6 * 60 * 60 * 1000)

        result.append({
            "id": str(question.id),
            "topic": topic.name,
            "prompt": question.prompt,
            "options": question.choices,
            "correctAnswer": question.correct_index,
            "difficulty": question.difficulty,
            "explanation": question.explanation,
            "last_seen_at": last_seen_at,
            "next_due_at": next_due_at,
            "rolling_accuracy": rolling_accuracy,
            "attempts": len(question_attempts),
        })

    return result
