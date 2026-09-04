from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin
from app.security import hash_password, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)



@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    hashed_password = hash_password(user.password)

    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "message": "User registered successfully",
        "email": db_user.email,
        "full_name": db_user.full_name,
    }
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    return {
    "message": "Login successful",
    "user_id": db_user.id,
    "email": db_user.email,
    "full_name": db_user.full_name,
}