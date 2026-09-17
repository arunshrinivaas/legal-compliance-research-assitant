import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.routers.auth import get_current_user
from app.services.chunk_service import create_document_chunks
from app.services.embedding_service import embed_document_chunks
from app.services.pdf_extractor import extract_text_from_pdf

router = APIRouter(
    prefix="/api/v1/documents",
    tags=["Documents"],
)


def _document_response(db: Session, doc: Document) -> dict:
    chunk_count = (
        db.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.document_id == doc.id)
        .scalar()
    )

    embedded_count = (
        db.query(func.count(DocumentChunk.id))
        .filter(
            DocumentChunk.document_id == doc.id,
            DocumentChunk.embedding.is_not(None),
        )
        .scalar()
    )

    if chunk_count == 0:
        processing_status = "Not processed"
    elif embedded_count == chunk_count:
        processing_status = "Ready"
    else:
        processing_status = "Processing"

    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_hash": doc.file_hash,
        "document_type": doc.document_type,
        "jurisdiction": doc.jurisdiction,
        "description": doc.description,
        "user_id": doc.user_id,
        "uploaded_at": doc.uploaded_at,
        "chunks": chunk_count,
        "embedded_chunks": embedded_count,
        "processing_status": processing_status,
    }


@router.get("/")
def get_documents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )

    items = [
        _document_response(db, document)
        for document in documents
    ]

    return {
        "total": len(items),
        "items": items,
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    file_hash = hashlib.sha256(file_bytes).hexdigest()

    existing_document = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.file_hash == file_hash,
        )
        .first()
    )

    if existing_document:
        return {
            "duplicate": True,
            "message": "This document has already been uploaded.",
            "filename": existing_document.filename,
            "document_id": existing_document.id,
            "file_hash": existing_document.file_hash,
            "text_length": len(
                existing_document.extracted_text or ""
            ),
            "processing_status": "Already uploaded",
        }

    safe_filename = Path(file.filename).name

    file_path = upload_dir / f"{file_hash}_{safe_filename}"

    with file_path.open("wb") as buffer:
        buffer.write(file_bytes)

    try:
        extracted_text = extract_text_from_pdf(
            str(file_path)
        )
    except Exception:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=400,
            detail="Unable to process the uploaded PDF.",
        )

    db_document = Document(
        title=safe_filename,
        filename=safe_filename,
        file_hash=file_hash,
        document_type="PDF",
        jurisdiction="Unknown",
        description=None,
        user_id=current_user.id,
        extracted_text=extracted_text,
    )

    try:
        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        chunks = create_document_chunks(
            db=db,
            document_id=db_document.id,
            text=extracted_text,
        )

        embedded_chunks = embed_document_chunks(
            db=db,
            document_id=db_document.id,
        )

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise

    return {
        "duplicate": False,
        "message": "Document uploaded successfully.",
        "filename": safe_filename,
        "document_id": db_document.id,
        "file_hash": db_document.file_hash,
        "text_length": len(extracted_text),
        "chunks_created": len(chunks),
        "chunks_embedded": embedded_chunks,
        "processing_status": (
            "Ready"
            if embedded_chunks == len(chunks)
            else "Processing"
        ),
    }


@router.get("/{document_id}/preview")
def preview_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    upload_dir = Path(settings.upload_dir)

    new_file_path = (
        upload_dir
        / f"{document.file_hash}_{document.filename}"
    )

    old_file_path = upload_dir / document.filename

    if new_file_path.exists():
        file_path = new_file_path
    elif old_file_path.exists():
        file_path = old_file_path
    else:
        raise HTTPException(
            status_code=404,
            detail="Document file not found",
        )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=document.filename,
        content_disposition_type="inline",
    )


@router.delete(
    "/{document_id}",
    status_code=204,
)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).delete(
        synchronize_session=False
    )

    upload_dir = Path(settings.upload_dir)

    new_file_path = (
        upload_dir
        / f"{document.file_hash}_{document.filename}"
    )

    old_file_path = upload_dir / document.filename

    if new_file_path.exists():
        new_file_path.unlink()
    elif old_file_path.exists():
        old_file_path.unlink()

    db.delete(document)
    db.commit()
    