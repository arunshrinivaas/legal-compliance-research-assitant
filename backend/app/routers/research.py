from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.research import ResearchQuery
from app.routers.auth import get_current_user
from app.schemas.research import ResearchQueryCreate

router = APIRouter(prefix="/api/v1/research", tags=["Research"])


@router.get("/sessions")
def get_research_sessions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    queries = (
        db.query(ResearchQuery).order_by(ResearchQuery.created_at.desc()).all()
    )
    return {"total": len(queries), "items": queries}


@router.post("/sessions", status_code=201)
def create_research_session(
    research_query: ResearchQueryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_query = ResearchQuery(
        question=research_query.question,
        status="Pending",
    )
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    return db_query


@router.post("/query")
async def query_research(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Run a RAG query against the knowledge base."""
    from app.services.rag_service import answer_with_rag

    question = body.get("question", "")
    if not question:
        return {"error": "question is required"}

    result = await answer_with_rag(db=db, question=question, limit=5)
    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
    }
