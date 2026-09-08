from fastapi import APIRouter, Depends
router = APIRouter(prefix="/research", tags=["Research"])
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.research import ResearchQuery
from app.schemas.research import ResearchQueryCreate

router = APIRouter(prefix="/research", tags=["Research"])


@router.get("/")
def get_research_queries(db: Session = Depends(get_db)):
    queries = db.query(ResearchQuery).order_by(ResearchQuery.created_at.desc()).all()
    return queries


@router.post("/")
def create_research_query(
    research_query: ResearchQueryCreate,
    db: Session = Depends(get_db),
):
    db_query = ResearchQuery(
        question=research_query.question,
        status=research_query.status,
    )

    db.add(db_query)
    db.commit()
    db.refresh(db_query)

    return db_query