from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer

from app.models.document import Document
from app.models.document_chunk import DocumentChunk


MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    embedding = model.encode(
        text,
        normalize_embeddings=True,
    )

    return embedding.tolist()


def embed_document_chunks(
    db: Session,
    document_id: int,
) -> int:
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )

    for chunk in chunks:
        chunk.embedding = generate_embedding(chunk.content)

    db.commit()

    return len(chunks)