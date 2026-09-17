from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.investigation import Investigation
from app.models.investigation_document import InvestigationDocument
from app.models.investigation_query import InvestigationQuery
from app.routers.auth import get_current_user
from app.services.rag_service import compare_documents


router = APIRouter(
    prefix="/api/v1/investigations",
    tags=["Investigations"],
)


# =========================================================
# SCHEMAS
# =========================================================


class InvestigationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class InvestigationResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    user_id: int

    model_config = {"from_attributes": True}


class InvestigationQueryCreate(BaseModel):
    question: str = Field(min_length=1)
    answer: str | None = None


class InvestigationQueryResponse(BaseModel):
    id: int
    investigation_id: int
    question: str
    answer: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvestigationDocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    file_hash: str | None = None
    document_type: str
    jurisdiction: str
    description: str | None
    user_id: int
    uploaded_at: datetime | None
    chunks: int
    embedded_chunks: int
    processing_status: str


class CompareRequest(BaseModel):
    question: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


# =========================================================
# INVESTIGATIONS
# =========================================================


@router.get(
    "/",
    response_model=list[InvestigationResponse],
)
def list_investigations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    investigations = db.scalars(
        select(Investigation)
        .where(
            Investigation.user_id == current_user.id
        )
        .order_by(
            Investigation.updated_at.desc()
        )
    ).all()

    return investigations


@router.post(
    "/",
    response_model=InvestigationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    investigation = Investigation(
        title=payload.title,
        description=payload.description,
        status="Active",
        user_id=current_user.id,
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return investigation


@router.get(
    "/{investigation_id}",
    response_model=InvestigationResponse,
)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    return investigation


# =========================================================
# INVESTIGATION DOCUMENTS
# =========================================================


@router.get(
    "/{investigation_id}/documents",
    response_model=list[InvestigationDocumentResponse],
)
def list_investigation_documents(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    documents = db.scalars(
        select(Document)
        .join(
            InvestigationDocument,
            InvestigationDocument.document_id == Document.id,
        )
        .where(
            InvestigationDocument.investigation_id == investigation_id,
            Document.user_id == current_user.id,
        )
        .order_by(
            Document.uploaded_at.desc()
        )
    ).all()

    result = []

    for doc in documents:
        chunk_count = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.document_id == doc.id
            )
            .count()
        )

        embedded_count = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.document_id == doc.id,
                DocumentChunk.embedding.is_not(None),
            )
            .count()
        )

        if chunk_count == 0:
            processing_status = "Not processed"
        elif embedded_count == chunk_count:
            processing_status = "Ready"
        else:
            processing_status = "Processing"

        result.append(
            {
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
        )

    return result


@router.post(
    "/{investigation_id}/documents/{document_id}",
    response_model=InvestigationDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def attach_document_to_investigation(
    investigation_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ---------------------------------------------------------
    # Verify investigation belongs to current user
    # ---------------------------------------------------------

    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    # ---------------------------------------------------------
    # Verify document belongs to current user
    # ---------------------------------------------------------

    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # ---------------------------------------------------------
    # Prevent duplicate attachment
    #
    # Same document + same investigation = NOT allowed.
    #
    # Same document + different investigation = allowed.
    # ---------------------------------------------------------

    existing = db.scalar(
        select(InvestigationDocument).where(
            InvestigationDocument.investigation_id
            == investigation_id,
            InvestigationDocument.document_id
            == document_id,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is already attached to this investigation",
        )

    # ---------------------------------------------------------
    # Create association
    # ---------------------------------------------------------

    association = InvestigationDocument(
        investigation_id=investigation_id,
        document_id=document_id,
    )

    db.add(association)
    db.commit()

    # ---------------------------------------------------------
    # Processing status
    # ---------------------------------------------------------

    chunk_count = (
        db.query(DocumentChunk)
        .filter(
            DocumentChunk.document_id == document.id
        )
        .count()
    )

    embedded_count = (
        db.query(DocumentChunk)
        .filter(
            DocumentChunk.document_id == document.id,
            DocumentChunk.embedding.is_not(None),
        )
        .count()
    )

    if chunk_count == 0:
        processing_status = "Not processed"
    elif embedded_count == chunk_count:
        processing_status = "Ready"
    else:
        processing_status = "Processing"

    return {
        "id": document.id,
        "title": document.title,
        "filename": document.filename,
        "file_hash": document.file_hash,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "description": document.description,
        "user_id": document.user_id,
        "uploaded_at": document.uploaded_at,
        "chunks": chunk_count,
        "embedded_chunks": embedded_count,
        "processing_status": processing_status,
    }


@router.delete(
    "/{investigation_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def detach_document_from_investigation(
    investigation_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ---------------------------------------------------------
    # Verify investigation belongs to current user
    # ---------------------------------------------------------

    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    # ---------------------------------------------------------
    # Find attachment
    # ---------------------------------------------------------

    association = db.scalar(
        select(InvestigationDocument).where(
            InvestigationDocument.investigation_id
            == investigation_id,
            InvestigationDocument.document_id
            == document_id,
        )
    )

    if association is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document is not attached to this investigation",
        )

    # ---------------------------------------------------------
    # Detach ONLY
    #
    # This does NOT delete:
    # - the Document
    # - the PDF
    # - the chunks
    # - the embeddings
    #
    # It only removes the relationship.
    # ---------------------------------------------------------

    db.delete(association)
    db.commit()


# =========================================================
# INVESTIGATION QUERIES
# =========================================================


@router.get(
    "/{investigation_id}/queries",
    response_model=list[InvestigationQueryResponse],
)
def list_investigation_queries(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    queries = db.scalars(
        select(InvestigationQuery)
        .where(
            InvestigationQuery.investigation_id
            == investigation_id
        )
        .order_by(
            InvestigationQuery.created_at.desc()
        )
    ).all()

    return queries


@router.post(
    "/{investigation_id}/queries",
    response_model=InvestigationQueryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_investigation_query(
    investigation_id: int,
    payload: InvestigationQueryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ---------------------------------------------------------
    # Verify investigation belongs to current user
    # ---------------------------------------------------------

    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    # ---------------------------------------------------------
    # Create query
    # ---------------------------------------------------------

    query = InvestigationQuery(
        investigation_id=investigation_id,
        question=payload.question,
        answer=payload.answer,
    )

    db.add(query)
    db.commit()
    db.refresh(query)

    return query


# =========================================================
# REGULATORY COMPARISON
# =========================================================


@router.post(
    "/{investigation_id}/compare",
)
async def compare_investigation_documents(
    investigation_id: int,
    payload: CompareRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Verify investigation exists and belongs to current user
    # ---------------------------------------------------------

    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == current_user.id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    # ---------------------------------------------------------
    # 2. Fetch the ORDERED list of currently attached documents.
    #
    #    Ordered by InvestigationDocument.id (insertion order).
    #    This is the authoritative, deterministic attachment sequence:
    #
    #        position 0 → Document A
    #        position 1 → Document B
    #        position 2 → Document C
    #        ...
    #
    #    Document identity is NEVER derived from semantic similarity.
    # ---------------------------------------------------------

    print(f"[DIAG:compare_endpoint] investigation_id={investigation_id}")
    print(f"[DIAG:compare_endpoint] question={payload.question!r}")

    attachment_rows = db.execute(
        select(InvestigationDocument.document_id)
        .where(
            InvestigationDocument.investigation_id == investigation_id
        )
        .order_by(InvestigationDocument.document_id)
    ).scalars().all()

    print(f"[DIAG:compare_endpoint] attached document_ids (ordered) = {list(attachment_rows)!r}")

    # ---------------------------------------------------------
    # 3. Guard: 0 documents attached
    # ---------------------------------------------------------

    if not attachment_rows:
        return {
            "investigation_id": investigation_id,
            "question": payload.question,
            "documents": [],
            "comparison": (
                "No documents are currently attached to this investigation. "
                "Please attach at least two documents before running a comparison."
            ),
            "sources": {},
        }

    # ---------------------------------------------------------
    # 4. Guard: only 1 document attached
    # ---------------------------------------------------------

    if len(attachment_rows) < 2:
        # Still fetch the single doc for context in the message.
        single_doc = db.scalar(
            select(Document).where(
                Document.id == attachment_rows[0],
                Document.user_id == current_user.id,
            )
        )
        single_name = single_doc.filename if single_doc else f"ID {attachment_rows[0]}"
        return {
            "investigation_id": investigation_id,
            "question": payload.question,
            "documents": [
                {
                    "label": "A",
                    "id": single_doc.id if single_doc else attachment_rows[0],
                    "title": single_doc.title if single_doc else "",
                    "filename": single_name,
                    "jurisdiction": single_doc.jurisdiction if single_doc else "",
                }
            ],
            "comparison": (
                f"Comparison requires at least 2 attached documents. "
                f"This investigation currently has only 1: {single_name}. "
                f"Please attach a second document to enable comparison."
            ),
            "sources": {},
        }

    # ---------------------------------------------------------
    # 5. Fetch Document rows for all attached IDs.
    #    Verify ownership (must belong to current user) and silently
    #    skip any document that cannot be found (edge case: document
    #    deleted from library without detaching).
    # ---------------------------------------------------------

    ordered_docs: list[dict] = []
    
    print("\n[DIAG:COMPARE_AUTH]")
    print(f"current_user.id = {current_user.id}")
    print(f"investigation_id = {investigation_id}")
    print(f"attached document IDs from InvestigationDocument = {list(attachment_rows)}")
    
    owned_ids = []
    for doc_id in attachment_rows:
        # Check raw document info
        raw_doc = db.scalar(select(Document).where(Document.id == doc_id))
        if raw_doc:
            ownership_check = raw_doc.user_id == current_user.id
            print(f"  document_id={doc_id} filename={raw_doc.filename!r} document.user_id={raw_doc.user_id} current_user.id={current_user.id} ownership_check={ownership_check}")
            if ownership_check:
                owned_ids.append(doc_id)
        else:
            print(f"  document_id={doc_id} NOT FOUND in Document table")

    print(f"document IDs that pass the ownership check = {owned_ids}")

    for doc_id in attachment_rows:
        doc = db.scalar(
            select(Document).where(
                Document.id == doc_id,
                Document.user_id == current_user.id,
            )
        )
        if doc is None:
            # We already printed details in the block above
            continue
        ordered_docs.append(
            {
                "id": doc.id,
                "title": doc.title,
                "filename": doc.filename,
                "jurisdiction": doc.jurisdiction,
            }
        )

    print("\n[DIAG:COMPARE_FINAL_DOCS]")
    print(f"count = {len(ordered_docs)}")
    print(f"exact ordered IDs = {[d['id'] for d in ordered_docs]}")
    print(f"exact filenames = {[d['filename'] for d in ordered_docs]}")

    # After ownership filtering, re-check the count.
    if len(ordered_docs) < 2:
        return {
            "investigation_id": investigation_id,
            "question": payload.question,
            "documents": ordered_docs,
            "comparison": (
                "Comparison requires at least 2 accessible documents. "
                "One or more attached documents could not be resolved. "
                "Please verify your document library."
            ),
            "sources": {},
        }

    # ---------------------------------------------------------
    # [DIAG:COMPARE_REQUEST]
    # ---------------------------------------------------------
    print("[DIAG:COMPARE_REQUEST]")
    print(f"  investigation_id={investigation_id}")
    print(f"  number of documents={len(ordered_docs)}")
    print(f"  exact ordered document IDs={[d['id'] for d in ordered_docs]}")
    print(f"  exact filenames/titles={[(d['filename'], d['title']) for d in ordered_docs]}")

    result = await compare_documents(
        db=db,
        question=payload.question,
        documents=ordered_docs,
        limit=payload.limit,
    )

    # Build the documents array for the response (includes label for UI)
    _LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    response_documents = [
        {
            "label": _LABELS[i] if i < len(_LABELS) else str(i),
            "id": d["id"],
            "title": d["title"],
            "filename": d["filename"],
            "jurisdiction": d["jurisdiction"],
        }
        for i, d in enumerate(ordered_docs)
    ]

    response_json = {
        "investigation_id": investigation_id,
        "question": payload.question,
        "documents": response_documents,
        "comparison": result["comparison"],
        "sources": result["sources"],
    }
    
    print("[DIAG:COMPARE_ROUTER_OUTPUT]")
    print(f"  response keys: {list(response_json.keys())}")
    print(f"  documents count: {len(response_json['documents'])}")
    print(f"  exact documents array: {response_json['documents']}")
    print(f"  sources keys: {list(response_json['sources'].keys())}")
    print(f"  comparison response length: {len(response_json['comparison'])}")
    for lbl in ['A', 'B', 'C', 'D']:
        print(f"  appears {lbl}: {'Document ' + lbl in response_json['comparison']}")

    return response_json