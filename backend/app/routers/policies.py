from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.policy import Policy
from app.schemas.policy import PolicyCreate


router = APIRouter(
    prefix="/policies",
    tags=["Policies"],
)


@router.get("/")
def get_policies(db: Session = Depends(get_db)):
    policies = db.query(Policy).all()

    return policies


@router.post("/")
def create_policy(
    policy: PolicyCreate,
    db: Session = Depends(get_db),
):
    db_policy = Policy(
        title=policy.title,
        department=policy.department,
        description=policy.description,
        status=policy.status,
        version=policy.version,
        effective_date=policy.effective_date,
    )

    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)

    return db_policy