from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.compliance import Compliance
from app.schemas.compliance import ComplianceCreate


router = APIRouter(
    prefix="/compliance",
    tags=["Compliance"],
)


@router.get("/")
def get_compliance(db: Session = Depends(get_db)):
    compliance_items = db.query(Compliance).all()
    return compliance_items


@router.post("/")
def create_compliance(
    compliance: ComplianceCreate,
    db: Session = Depends(get_db),
):
    db_compliance = Compliance(
        title=compliance.title,
        regulation=compliance.regulation,
        description=compliance.description,
        department=compliance.department,
        status=compliance.status,
        risk_level=compliance.risk_level,
        due_date=compliance.due_date,
    )

    db.add(db_compliance)
    db.commit()
    db.refresh(db_compliance)

    return db_compliance