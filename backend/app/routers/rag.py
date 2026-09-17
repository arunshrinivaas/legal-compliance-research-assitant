from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.investigation import Investigation
from app.models.investigation_document import InvestigationDocument
from app.services.rag_service import answer_with_rag
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/api/v1/rag",
    tags=["RAG"],
)


class RAGRequest(BaseModel):
    question: str
    limit: int = 5
    investigation_id: int | None = None


@router.post("/ask")
async def ask_rag(
    request: RAGRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document_ids = None

    # ---------------------------------------------------------
    # [DIAG] Log the raw incoming request
    # ---------------------------------------------------------
    print(f"[DIAG] POST /rag/ask — question={request.question!r}")
    print(f"[DIAG] investigation_id received = {request.investigation_id!r}  (type={type(request.investigation_id).__name__})")
    print(f"[DIAG] current_user.id = {current_user.id}")

    # ---------------------------------------------------------
    # Investigation-scoped RAG
    # ---------------------------------------------------------

    if request.investigation_id is not None:
        investigation = db.scalar(
            select(Investigation).where(
                Investigation.id == request.investigation_id,
                Investigation.user_id == current_user.id,
            )
        )

        print(f"[DIAG] investigation lookup result = {investigation!r}")

        if investigation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investigation not found",
            )

        document_ids = db.scalars(
            select(InvestigationDocument.document_id).where(
                InvestigationDocument.investigation_id
                == request.investigation_id
            )
        ).all()

        print(f"[DIAG] document_ids from DB = {list(document_ids)!r}  (type={type(document_ids).__name__}, len={len(document_ids)})")

        if not document_ids:
            print("[DIAG] ⚠ document_ids is empty → returning 'No documents attached'")
            return {
                "question": request.question,
                "answer": "No documents are attached to this investigation.",
                "sources": [],
            }

    # ---------------------------------------------------------
    # RAG
    #
    # If investigation_id is provided:
    #   Search ONLY attached documents.
    #   Never fall back to global document library.
    #
    # If investigation_id is omitted:
    #   Preserve existing global RAG behavior.
    # ---------------------------------------------------------

    print(f"[DIAG] Calling answer_with_rag with document_ids={list(document_ids) if document_ids is not None else None!r}")

    result = await answer_with_rag(
        db=db,
        question=request.question,
        limit=request.limit,
        document_ids=document_ids,
    )

    print(f"[DIAG] answer_with_rag returned sources count = {len(result['sources'])}")
    for s in result["sources"]:
        print(f"[DIAG]   source: doc_id={s['document_id']}  chunk={s['chunk']}  dist={s['distance']:.4f}")

    # ---------------------------------------------------------
    # Investigation-scoped: if retrieval found no usable chunks,
    # return a clear message rather than an LLM answer grounded
    # on an empty context. This prevents silent fallback.
    # ---------------------------------------------------------

    if request.investigation_id is not None and not result["sources"]:
        print("[DIAG] ⚠ sources empty after retrieval → returning 'No relevant evidence' message")
        return {
            "question": request.question,
            "answer": (
                "No relevant evidence was found in the documents currently "
                "attached to this investigation. The documents may not yet "
                "be fully processed (embedded), or the question may not "
                "match the available content."
            ),
            "sources": [],
        }

    return {
        "question": request.question,
        "answer": result["answer"],
        "sources": result["sources"],
    }