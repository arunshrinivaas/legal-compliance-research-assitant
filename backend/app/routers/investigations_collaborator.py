from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models.investigation import Investigation
from app.models.investigation_collaborator import InvestigationCollaborator
from app.models.user import User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/investigations", tags=["collaborators"])

class CollaboratorCreate(BaseModel):
    user_id: int
    role: str = "Viewer"

class CollaboratorResponse(BaseModel):
    id: int
    user_id: int
    role: str
    email: str | None = None
    initials: str | None = None

def check_owner(db, investigation_id, current_user):
    inv = db.scalar(select(Investigation).where(Investigation.id == investigation_id))
    if not inv: raise HTTPException(status_code=404)
    if inv.user_id != current_user.id: raise HTTPException(status_code=403, detail="Only owners can manage collaborators")
    return inv

@router.get("/{investigation_id}/collaborators", response_model=List[CollaboratorResponse])
def get_collaborators(investigation_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Anyone who has access can view collaborators
    from app.routers.investigations_presence import check_access
    check_access(db, investigation_id, current_user)
    
    collabs = db.scalars(select(InvestigationCollaborator).where(InvestigationCollaborator.investigation_id == investigation_id)).all()
    res = []
    for c in collabs:
        u = db.scalar(select(User).where(User.id == c.user_id))
        res.append(CollaboratorResponse(id=c.id, user_id=c.user_id, role=c.role, email=u.email if u else "unknown", initials=f"U{c.user_id}"))
    return res

@router.post("/{investigation_id}/collaborators", response_model=CollaboratorResponse)
def add_collaborator(investigation_id: int, payload: CollaboratorCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    check_owner(db, investigation_id, current_user)
    u = db.scalar(select(User).where(User.id == payload.user_id))
    if not u: raise HTTPException(status_code=400, detail="User not found")
    
    existing = db.scalar(select(InvestigationCollaborator).where(
        InvestigationCollaborator.investigation_id == investigation_id,
        InvestigationCollaborator.user_id == payload.user_id
    ))
    if existing: raise HTTPException(status_code=400, detail="Already a collaborator")
    
    c = InvestigationCollaborator(investigation_id=investigation_id, user_id=payload.user_id, role=payload.role)
    db.add(c)
    db.commit()
    db.refresh(c)
    return CollaboratorResponse(id=c.id, user_id=c.user_id, role=c.role, email=u.email, initials=f"U{c.user_id}")

@router.delete("/{investigation_id}/collaborators/{collaborator_id}")
def remove_collaborator(investigation_id: int, collaborator_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    check_owner(db, investigation_id, current_user)
    db.execute(delete(InvestigationCollaborator).where(
        InvestigationCollaborator.id == collaborator_id,
        InvestigationCollaborator.investigation_id == investigation_id
    ))
    db.commit()
    return {"status": "ok"}
