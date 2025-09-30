from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.database import get_db
from backend.models.user import User
from backend.schemas.auth import SignupRequest, LoginRequest, VerifyEmailRequest, TokenResponse, UserResponse
from backend.services.auth import hash_password, verify_password, create_access_token, generate_verification_token
from backend.services.email import send_verification_email

router = APIRouter(prefix="/auth", tags=["authentication"])

AVAILABLE_SUBJECTS = ["COMP2521"]  # Discrete options for subjects

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(signup_data: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user with email verification
    """
    # Validate subjects
    for subject in signup_data.subjects:
        if subject not in AVAILABLE_SUBJECTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid subject: {subject}. Available subjects: {', '.join(AVAILABLE_SUBJECTS)}"
            )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if user_id already exists
    existing_user_id = db.query(User).filter(User.user_id == signup_data.user_id).first()
    if existing_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID already taken"
        )

    # Generate verification token
    verification_token = generate_verification_token()
    token_expires = datetime.utcnow() + timedelta(hours=24)

    # Create new user
    new_user = User(
        user_id=signup_data.user_id,
        first_name=signup_data.first_name,
        last_name=signup_data.last_name,
        email=signup_data.email,
        password_hash=hash_password(signup_data.password),
        subjects=signup_data.subjects,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires=token_expires
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email
    await send_verification_email(
        email=new_user.email,
        token=verification_token,
        user_name=new_user.first_name
    )

    return {
        "message": "User created successfully. Please check your email to verify your account.",
        "user_id": new_user.user_id,
        "email": new_user.email
    }

@router.post("/verify-email")
async def verify_email(verify_data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verify user email with token
    """
    print(f"DEBUG: Received token: {verify_data.token}")
    print(f"DEBUG: Token length: {len(verify_data.token)}")

    user = db.query(User).filter(User.verification_token == verify_data.token).first()

    print(f"DEBUG: User found: {user is not None}")
    if user:
        print(f"DEBUG: User email: {user.email}")
        print(f"DEBUG: Token matches: {user.verification_token == verify_data.token}")

    if not user:
        # Let's check all users to see what tokens exist
        all_users = db.query(User).all()
        print(f"DEBUG: Total users in DB: {len(all_users)}")
        for u in all_users:
            print(f"DEBUG: User {u.email} has token: {u.verification_token}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    if user.verification_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token expired"
        )

    # Mark user as verified
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()

    return {"message": "Email verified successfully"}

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token
    """
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": user.user_id, "email": user.email}
    )

    user_response = UserResponse(
        user_id=user.user_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        subjects=user.subjects,
        is_verified=user.is_verified,
        created_at=user.created_at
    )

    return TokenResponse(
        access_token=access_token,
        user=user_response
    )

@router.get("/available-subjects")
async def get_available_subjects():
    """
    Get list of available subjects for selection
    """
    return {"subjects": AVAILABLE_SUBJECTS}
