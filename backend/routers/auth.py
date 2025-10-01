from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.course import Course
from backend.models.enrolment import Enrolment
from backend.models.user import User
from backend.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from backend.services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Resolve course selections
    available_course_codes = {
        code
        for (code,) in db.query(Course.code).all()
    }

    requested_codes = {code.upper() for code in payload.course_codes}
    unknown = requested_codes - available_course_codes
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown course codes: {', '.join(sorted(unknown))}"
        )

    user = User(
        email=payload.email.lower(),
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()  # Get user.id before creating enrolments

    # Enroll user in selected courses
    for course_code in sorted(requested_codes):
        enrolment = Enrolment(user_id=user.id, course_code=course_code)
        db.add(enrolment)

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    user_out = UserResponse.model_validate(user)

    return TokenResponse(access_token=token, user=user_out)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    token = create_access_token({"sub": str(user.id), "email": user.email})
    user_out = UserResponse.model_validate(user)
    return TokenResponse(access_token=token, user=user_out)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.get("/course-options")
def list_course_options(db: Session = Depends(get_db)):
    """Public endpoint returning available courses for sign-up flows."""
    courses = (
        db.query(Course)
        .order_by(Course.name.asc())
        .all()
    )
    return {
        "courses": [
            {
                "code": course.code,
                "name": course.name,
                "description": course.description,
            }
            for course in courses
        ]
    }
