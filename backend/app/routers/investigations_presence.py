from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models.investigation import Investigation
from app.models.investigation_presence import InvestigationPresence
from app.models.investigation_collaborator import InvestigationCollaborator
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/investigations", tags=["presence"])

class PresenceResponse(BaseModel):
    user_id: int
    initials: str
    is_current_user: bool = False

def check_access(db: Session, investigation_id: int, current_user):
    inv = db.scalar(select(Investigation).where(Investigation.id == investigation_id))
    if not inv: raise HTTPException(status_code=404)
    if inv.user_id == current_user.id: return True
    collab = db.scalar(select(InvestigationCollaborator).where(InvestigationCollaborator.investigation_id == investigation_id, InvestigationCollaborator.user_id == current_user.id))
    if collab: return True
    raise HTTPException(status_code=403)

@router.post("/{investigation_id}/presence")
def heartbeat(investigation_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    check_access(db, investigation_id, current_user)
    db.execute(delete(InvestigationPresence).where(
        InvestigationPresence.investigation_id == investigation_id, 
        InvestigationPresence.user_id == current_user.id
    ))
    db.add(InvestigationPresence(
        investigation_id=investigation_id, 
        user_id=current_user.id,
        last_seen_at=datetime.now(timezone.utc)
    ))
    db.commit()
    return {"status": "ok"}

@router.get("/{investigation_id}/presence", response_model=List[PresenceResponse])
def get_presence(investigation_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    check_access(db, investigation_id, current_user)
    threshold = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.execute(delete(InvestigationPresence).where(InvestigationPresence.last_seen_at < threshold))
    db.commit()
    presences = db.scalars(select(InvestigationPresence).where(InvestigationPresence.investigation_id == investigation_id)).all()
    res = []
    for p in presences:
        res.append(PresenceResponse(user_id=p.user_id, initials=f"U{p.user_id}", is_current_user=(p.user_id == current_user.id)))
    return res

@router.delete("/{investigation_id}/presence")
def leave(investigation_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db.execute(delete(InvestigationPresence).where(InvestigationPresence.investigation_id == investigation_id, InvestigationPresence.user_id == current_user.id))
    db.commit()
    return {"status": "ok"}
