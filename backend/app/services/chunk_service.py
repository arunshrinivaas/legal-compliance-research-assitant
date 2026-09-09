from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.services.text_chunker import chunk_text


def create_document_chunks(
    db: Session,
    document_id: int,
    text: str,
) -> list[DocumentChunk]:
    chunks = chunk_text(text)

    document_chunks: list[DocumentChunk] = []

    for index, chunk in enumerate(chunks):
        document_chunk = DocumentChunk(
            document_id=document_id,
            chunk_index=index,
            content=chunk,
        )

        db.add(document_chunk)
        document_chunks.append(document_chunk)

    db.commit()

    return document_chunks