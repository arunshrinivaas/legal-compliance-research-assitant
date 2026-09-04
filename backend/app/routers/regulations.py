from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.regulation import Regulation
from app.schemas.regulation import RegulationCreate


router = APIRouter(
    prefix="/regulations",
    tags=["Regulations"],
)


@router.get("/")
def get_regulations(db: Session = Depends(get_db)):
    regulations = db.query(Regulation).all()

    return regulations


@router.post("/")
def create_regulation(
    regulation: RegulationCreate,
    db: Session = Depends(get_db),
):
    db_regulation = Regulation(
        title=regulation.title,
        issuing_authority=regulation.issuing_authority,
        jurisdiction=regulation.jurisdiction,
        description=regulation.description,
        status=regulation.status,
        effective_date=regulation.effective_date,
    )

    db.add(db_regulation)
    db.commit()
    db.refresh(db_regulation)

    return db_regulation