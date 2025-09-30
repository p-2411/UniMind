#!/usr/bin/env python3
"""
Seed script to load course data from JSON file into the database.
Usage: python -m backend.seed_data <json_file_path>
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.assessment import Assessment
from backend.models.content import Content
from backend.models.course import Course
from backend.models.question import Question
from backend.models.subtopic import Subtopic
from backend.models.topic import Topic


def parse_iso_datetime(date_str: str | None) -> datetime | None:
    """Parse ISO 8601 datetime string."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def seed_course_data(db: Session, json_file_path: str) -> None:
    """Load course data from JSON file into database."""

    # Load JSON data
    with open(json_file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    course_data = data.get("course", {})
    course_code = course_data.get("code")

    if not course_code:
        raise ValueError("Course code is required in JSON data")

    print(f"Seeding data for course: {course_code}")

    # Check if course already exists
    existing_course = db.get(Course, course_code)
    if existing_course:
        print(f"Course {course_code} already exists. Skipping course creation.")
        course = existing_course
    else:
        # Create course
        course = Course(
            code=course_code,
            name=course_data.get("name", ""),
            description=course_data.get("description"),
        )
        db.add(course)
        db.commit()
        print(f"Created course: {course_code}")

    # Create assessments
    assessments_data = data.get("assessments", [])
    assessment_count = 0
    for assessment_data in assessments_data:
        # Check if assessment already exists by title and course
        existing = (
            db.query(Assessment)
            .filter_by(course_code=course_code, title=assessment_data.get("title"))
            .first()
        )
        if not existing:
            assessment = Assessment(
                course_code=course_code,
                title=assessment_data.get("title", ""),
                description=assessment_data.get("description"),
                due_at=parse_iso_datetime(assessment_data.get("due_at")),
                weight=assessment_data.get("weight"),
            )
            db.add(assessment)
            assessment_count += 1

    db.commit()
    print(f"Created {assessment_count} assessments")

    # Create topics, subtopics, contents, and questions
    topics_data = data.get("topics", [])
    topic_count = 0
    subtopic_count = 0
    content_count = 0
    question_count = 0

    for topic_data in topics_data:
        topic_name = topic_data.get("name", "")

        # Check if topic already exists
        existing_topic = (
            db.query(Topic)
            .filter_by(course_code=course_code, name=topic_name)
            .first()
        )

        if existing_topic:
            topic = existing_topic
        else:
            topic = Topic(
                course_code=course_code,
                name=topic_name,
                description=topic_data.get("description"),
            )
            db.add(topic)
            db.flush()  # Get topic.id for relationships
            topic_count += 1

        # Create subtopics
        for subtopic_data in topic_data.get("subtopics", []):
            subtopic_name = subtopic_data.get("name", "")

            # Check if subtopic already exists
            existing_subtopic = (
                db.query(Subtopic)
                .filter_by(topic_id=topic.id, name=subtopic_name)
                .first()
            )

            if not existing_subtopic:
                subtopic = Subtopic(
                    topic_id=topic.id,
                    name=subtopic_name,
                    description=subtopic_data.get("description"),
                )
                db.add(subtopic)
                subtopic_count += 1

        # Create contents
        for content_data in topic_data.get("contents", []):
            content_title = content_data.get("title", "")

            # Check if content already exists
            existing_content = (
                db.query(Content)
                .filter_by(topic_id=topic.id, title=content_title)
                .first()
            )

            if not existing_content:
                content = Content(
                    topic_id=topic.id,
                    title=content_title,
                    summary=content_data.get("summary"),
                    body=content_data.get("body"),
                    resource_url=content_data.get("resource_url"),
                )
                db.add(content)
                content_count += 1

        # Create questions
        for question_data in topic_data.get("questions", []):
            prompt = question_data.get("prompt", "")

            # Check if question already exists
            existing_question = (
                db.query(Question)
                .filter_by(topic_id=topic.id, prompt=prompt)
                .first()
            )

            if not existing_question:
                question = Question(
                    topic_id=topic.id,
                    prompt=prompt,
                    choices=question_data.get("choices", []),
                    correct_index=question_data.get("correct_index", 0),
                    difficulty=question_data.get("difficulty", "medium"),
                    explanation=question_data.get("explanation"),
                )
                db.add(question)
                question_count += 1

    db.commit()
    print(f"Created {topic_count} topics")
    print(f"Created {subtopic_count} subtopics")
    print(f"Created {content_count} contents")
    print(f"Created {question_count} questions")
    print("Data seeding completed successfully!")


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m backend.seed_data <json_file_path>")
        sys.exit(1)

    json_file_path = sys.argv[1]

    if not Path(json_file_path).exists():
        print(f"Error: File not found: {json_file_path}")
        sys.exit(1)

    db = SessionLocal()
    try:
        seed_course_data(db, json_file_path)
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()