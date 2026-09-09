from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentCreate
from app.services.pdf_extractor import extract_text_from_pdf

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/")
def get_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return documents


@router.post("/")
def create_document(
    document: DocumentCreate,
    db: Session = Depends(get_db),
):
    db_document = Document(
        title=document.title,
        filename=document.filename,
        document_type=document.document_type,
        jurisdiction=document.jurisdiction,
        description=document.description,
        user_id=document.user_id,
    )

    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    return db_document


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    upload_directory = Path("uploads")
    upload_directory.mkdir(exist_ok=True)

    if not file.filename:
        return {"error": "Filename is required"}

    file_path = upload_directory / file.filename

    with file_path.open("wb") as buffer:
        buffer.write(await file.read())

    extracted_text = extract_text_from_pdf(str(file_path))

    db_document = Document(
        title=file.filename,
        filename=file.filename,
        document_type="PDF",
        jurisdiction="Unknown",
        description=None,
        user_id=1,
        extracted_text=extracted_text,
    )

    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "saved_path": str(file_path),
        "text_length": len(extracted_text),
        "text_preview": extracted_text[:500],
        "document_id": db_document.id,
    }