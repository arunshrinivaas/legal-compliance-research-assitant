from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.knowledge_post import KnowledgePost
from app.routers.auth import get_current_user
from app.schemas.knowledge import KnowledgePostCreate, KnowledgePostResponse

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])

@router.post("/", response_model=KnowledgePostResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_post(
    post_in: KnowledgePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_post = KnowledgePost(
        user_id=current_user.id,
        title=post_in.title,
        content=post_in.content,
        source_citation=post_in.source_citation,
        investigation_id=post_in.investigation_id,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/", response_model=list[KnowledgePostResponse])
def get_knowledge_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(KnowledgePost).order_by(KnowledgePost.created_at.desc())
    posts = db.execute(stmt).scalars().all()
    return list(posts)
