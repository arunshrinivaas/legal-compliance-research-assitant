from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.copilot_service import ask_copilot_with_context
from app.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/help",
    tags=["Help"],
)

class HelpRequest(BaseModel):
    query: str

@router.post("/ask")
async def ask_help(
    request: HelpRequest,
    current_user=Depends(get_current_user),
):
    system_prompt = (
        "Explain how to use the OpusLex application. "
        "Answer only from documented/implemented OpusLex functionality. "
        "Do not provide legal advice. "
        "Do not invent features, integrations, permissions, workflows, or capabilities. "
        "When the answer is not supported, say so."
    )
    
    answer = await ask_copilot_with_context(
        question=request.query,
        context="",  # No retrieved documents for help yet
        system_prompt=system_prompt,
        strict_grounding=False,
    )

    return {"answer": answer}
