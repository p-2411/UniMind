from __future__ import annotations

import uuid
from datetime import datetime, timedelta

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
from backend.models.question_metric import QuestionMetric
from backend.models.streak import DailyStreak
from backend.models.blocked_site import BlockedSite
from backend.schemas import AttemptCreate, AttemptResult, CourseOut, EnrolRequest, ProgressItem, UserResponse, BlockedSiteCreate, BlockedSiteOut
from backend.schemas.auth import UserUpdate
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


@router.delete("/{user_id}/enrolments/{course_code}", status_code=status.HTTP_204_NO_CONTENT)
def unenrol_student(
    user_id: str,
    course_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    code = course_code.upper()

    # Identify all topics (and questions) that belong to this course
    topic_ids_subq = db.query(Topic.id).filter(Topic.course_code == code).subquery()
    question_ids_subq = db.query(Question.id).filter(Question.topic_id.in_(topic_ids_subq)).subquery()

    # Delete user progress for these topics
    (
        db.query(TopicProgress)
        .filter(
            TopicProgress.user_id == current_user.id,
            TopicProgress.topic_id.in_(topic_ids_subq),
        )
        .delete(synchronize_session=False)
    )

    # Delete user attempts for questions from these topics
    (
        db.query(QuestionAttempt)
        .filter(
            QuestionAttempt.user_id == current_user.id,
            QuestionAttempt.question_id.in_(question_ids_subq),
        )
        .delete(synchronize_session=False)
    )

    # Delete per-question metrics for these questions
    (
        db.query(QuestionMetric)
        .filter(
            QuestionMetric.user_id == current_user.id,
            QuestionMetric.question_id.in_(question_ids_subq),
        )
        .delete(synchronize_session=False)
    )

    # Finally, remove enrolment row if present (idempotent)
    enrol = db.get(Enrolment, (current_user.id, code))
    if enrol:
        db.delete(enrol)

    db.commit()
    return


@router.patch("/{user_id}/profile", response_model=UserResponse)
def update_profile(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_same_user(user_id, current_user)

    # Update email if provided (ensure unique)
    if payload.email and payload.email.lower() != current_user.email:
        exists = (
            db.query(User)
            .filter(User.email == payload.email.lower())
            .first()
        )
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        current_user.email = payload.email.lower()

    if payload.display_name is not None:
        current_user.display_name = payload.display_name

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


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

    # Update per-question metrics so extension and in-app review stay in sync
    now = datetime.utcnow()
    metrics = (
        db.query(QuestionMetric)
        .filter(
            QuestionMetric.user_id == current_user.id,
            QuestionMetric.question_id == question.id,
        )
        .first()
    )
    if metrics is None:
        metrics = QuestionMetric(
            user_id=current_user.id,
            question_id=question.id,
            rolling_accuracy=0.5,
            attempts=0,
        )
        db.add(metrics)

    EMA_ALPHA = 0.2
    prev = metrics.rolling_accuracy or 0.5
    target = 1.0 if is_correct else 0.0
    metrics.rolling_accuracy = max(0.0, min(1.0, EMA_ALPHA * target + (1 - EMA_ALPHA) * prev))

    metrics.attempts = max(0, (metrics.attempts or 0)) + 1

    DAY = timedelta(days=1)
    SIX_HOURS = timedelta(hours=6)
    if metrics.last_seen_at and metrics.next_due_at:
        prev_interval = max(timedelta(seconds=1), metrics.next_due_at - metrics.last_seen_at)
    else:
        prev_interval = DAY
    next_interval = max(DAY, prev_interval * 2) if is_correct else max(SIX_HOURS, prev_interval * 0.5)
    metrics.last_seen_at = now
    metrics.next_due_at = now + next_interval

    update_streak(db, current_user.id, now)

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


## Removed: questions-for-extension endpoint

@router.get("/{user_id}/questions-for-extension")
def get_questions_for_extension(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return questions with per-user metrics (used by extension and in-app)."""
    _assert_same_user(user_id, current_user)

    # Get all questions from enrolled courses
    questions_query = (
        db.query(Question, Topic, QuestionMetric)
        .join(Topic, Question.topic_id == Topic.id)
        .join(Course, Topic.course_code == Course.code)
        .join(Enrolment, Enrolment.course_code == Course.code)
        .outerjoin(
            QuestionMetric,
            (QuestionMetric.user_id == current_user.id) & (QuestionMetric.question_id == Question.id),
        )
        .filter(Enrolment.user_id == current_user.id)
        .all()
    )

    if not questions_query:
        return []

    # Get user's attempts for these questions
    question_ids = [q.id for q, _, _ in questions_query]
    attempts_query = (
        db.query(QuestionAttempt)
        .filter(
            QuestionAttempt.user_id == current_user.id,
            QuestionAttempt.question_id.in_(question_ids)
        )
        .all()
    )

    # Calculate metadata for each question
    attempts_by_question: dict = {}
    for attempt in attempts_query:
        attempts_by_question.setdefault(attempt.question_id, []).append(attempt)

    result = []
    for question, topic, metrics in questions_query:
        question_attempts = attempts_by_question.get(question.id, [])

        if metrics is not None:
            last_seen_at = int(metrics.last_seen_at.timestamp() * 1000) if metrics.last_seen_at else None
            next_due_at = int(metrics.next_due_at.timestamp() * 1000) if metrics.next_due_at else None
            rolling_accuracy = float(metrics.rolling_accuracy or 0.5)
            attempts_count = int(metrics.attempts or 0)
        else:
            # Fallback: derive from attempts
            rolling_accuracy = 0.5
            if question_attempts:
                acc = rolling_accuracy
                for attempt in sorted(question_attempts, key=lambda a: a.answered_at):
                    target = 1.0 if attempt.was_correct else 0.0
                    acc = 0.2 * target + 0.8 * acc
                rolling_accuracy = acc
            last_seen_at = None
            next_due_at = None
            if question_attempts:
                last_attempt = max(question_attempts, key=lambda a: a.answered_at)
                last_seen_at = int(last_attempt.answered_at.timestamp() * 1000)
                next_due_at = last_seen_at + (24 * 60 * 60 * 1000) if last_attempt.was_correct else last_seen_at + (6 * 60 * 60 * 1000)
            attempts_count = len(question_attempts)

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
            "attempts": attempts_count,
        })

    return result

@router.get("/{user_id}/review-questions")
def get_review_questions(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Delegate to the same core to keep in sync
    return get_questions_for_extension(user_id, db, current_user)


@router.get("/{user_id}/streak")
def get_streak(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's daily streak without mutating it."""
    _assert_same_user(user_id, current_user)

    streak = db.get(DailyStreak, current_user.id)
    if streak is None:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_active_date": None,
        }
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_active_date": streak.last_active_date.isoformat() if streak.last_active_date else None,
    }


@router.get("/{user_id}/today-stats")
def get_today_stats(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return stats for today, including completed questions count."""
    _assert_same_user(user_id, current_user)

    # Get today's start time (midnight UTC)
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count unique questions answered today
    completed_today = (
        db.query(QuestionAttempt.question_id)
        .filter(
            QuestionAttempt.user_id == current_user.id,
            QuestionAttempt.answered_at >= today_start,
        )
        .distinct()
        .count()
    )

    return {
        "completed_questions_today": completed_today,
    }


@router.get("/{user_id}/blocked-sites", response_model=list[BlockedSiteOut])
def get_blocked_sites(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's list of blocked sites."""
    _assert_same_user(user_id, current_user)

    blocked_sites = (
        db.query(BlockedSite)
        .filter(BlockedSite.user_id == current_user.id)
        .order_by(BlockedSite.created_at.asc())
        .all()
    )

    return [BlockedSiteOut(id=str(site.id), domain=site.domain) for site in blocked_sites]


@router.post("/{user_id}/blocked-sites", status_code=status.HTTP_201_CREATED, response_model=BlockedSiteOut)
def add_blocked_site(
    user_id: str,
    payload: BlockedSiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new blocked site for the user."""
    _assert_same_user(user_id, current_user)

    # Normalize domain (remove www., convert to lowercase)
    domain = payload.domain.replace("www.", "").lower().strip()

    # Check if already blocked
    exists = (
        db.query(BlockedSite)
        .filter(
            BlockedSite.user_id == current_user.id,
            BlockedSite.domain == domain,
        )
        .first()
    )

    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Site already blocked")

    blocked_site = BlockedSite(user_id=current_user.id, domain=domain)
    db.add(blocked_site)
    db.commit()
    db.refresh(blocked_site)

    return BlockedSiteOut(id=str(blocked_site.id), domain=blocked_site.domain)


@router.delete("/{user_id}/blocked-sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_blocked_site(
    user_id: str,
    site_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a blocked site for the user."""
    _assert_same_user(user_id, current_user)

    try:
        site_uuid = uuid.UUID(site_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid site_id format") from exc

    blocked_site = (
        db.query(BlockedSite)
        .filter(
            BlockedSite.id == site_uuid,
            BlockedSite.user_id == current_user.id,
        )
        .first()
    )

    if not blocked_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked site not found")

    db.delete(blocked_site)
    db.commit()

    return
