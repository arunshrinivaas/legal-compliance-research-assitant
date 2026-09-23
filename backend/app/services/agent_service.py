import asyncio
import json
import logging
from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.investigation import Investigation
from app.schemas.agent import AgentFinding
from app.services.copilot_service import SessionEventType
from app.services.rag_service import build_rag_context
from copilot import CopilotClient

logger = logging.getLogger(__name__)


async def _run_agent_llm(prompt: str) -> str:
    """
    Executes the LLM prompt using a dedicated local CopilotClient instance.
    This prevents concurrency issues that arise from sharing the global singleton
    across concurrent Agent API requests.
    """
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        model="auto",
        streaming=True,
    )

    response_text = ""
    done = asyncio.Event()

    def handle_event(event):
        nonlocal response_text

        if event.type == SessionEventType.ASSISTANT_MESSAGE:
            response_text = event.data.content

        elif event.type == SessionEventType.SESSION_IDLE:
            done.set()

        elif event.type == SessionEventType.SESSION_ERROR:
            done.set()

    session.on(handle_event)
    await session.send(prompt)
    await done.wait()
    await session.disconnect()
    await client.stop()

    if not response_text:
        raise ValueError("No response received from Copilot.")

    return response_text


def _parse_structured_output(raw_text: str) -> dict[str, Any]:
    """Extracts JSON from LLM response, stripping markdown fences."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    if text.lower().startswith("json"):
        text = text[4:].strip()
    return json.loads(text)


async def run_compliance_investigation(
    db: Session,
    investigation_id: int,
    user_id: int,
    question: str,
) -> AgentRun:
    """
    Executes a Compliance Investigation Agent run.
    Ensures investigation scope, retrieves evidence, prompts the LLM for structured
    output, and persists the result.
    """
    # 1. Scope Enforcement & Ownership Check
    investigation = db.scalar(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.user_id == user_id,
        )
    )

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found",
        )

    # 2. Initialize AgentRun (Persistence)
    agent_run = AgentRun(
        investigation_id=investigation_id,
        user_id=user_id,
        question=question,
        status="pending",
        evidence=[],
        conflicts=[],
        evidence_gaps=[],
        applicable_requirements=[],
        suggested_actions=[],
        citations=[],
    )
    db.add(agent_run)
    db.commit()
    db.refresh(agent_run)

    # 3. Resolve Attached Documents
    document_ids = [doc.id for doc in investigation.documents]

    # Explicit handling for insufficient evidence
    if not document_ids:
        agent_run.status = "completed"
        agent_run.finding = "No documents are currently attached to this investigation. Evidence is insufficient to answer the question."
        db.commit()
        db.refresh(agent_run)
        return agent_run

    # 4. Evidence Retrieval (reuse build_rag_context)
    context, _ = build_rag_context(
        db=db,
        query=question,
        limit=5,
        document_ids=document_ids,
    )

    # 5. Build LLM Prompt
    schema_json = json.dumps(AgentFinding.model_json_schema(), indent=2)

    prompt = f"""
ROLE:
You are a Compliance Investigation Agent.

SCOPE:
You may reason ONLY from the evidence supplied in this request.

RULES:
- Do not use outside legal knowledge.
- Do not invent requirements, regulators, penalties, deadlines, evidence, or citations.
- Preserve source terminology.
- Distinguish directly supported facts from inference.
- If evidence is insufficient, explicitly say so.
- If documents contain different requirements, report the difference rather than silently resolving it.
- Every substantive finding must be traceable to supplied evidence.
- Suggested actions must not be presented as existing policy requirements unless the evidence explicitly supports them.

Respond ONLY with valid JSON matching this schema:
{schema_json}

User question:
{question}

Document context:
{context}
"""

    # 6. Execute LLM Reasoning & Validate Structured Output
    try:
        raw_response = await _run_agent_llm(prompt)
        parsed_json = _parse_structured_output(raw_response)
        finding_obj = AgentFinding.model_validate(parsed_json)

        # 7. Persist Successful Run
        agent_run.status = "completed"
        agent_run.finding = finding_obj.finding
        agent_run.evidence = [e.model_dump() for e in finding_obj.evidence]
        agent_run.conflicts = [c.model_dump() for c in finding_obj.conflicts]
        agent_run.evidence_gaps = [g.model_dump() for g in finding_obj.evidence_gaps]
        agent_run.applicable_requirements = [r.model_dump() for r in finding_obj.applicable_requirements]
        agent_run.suggested_actions = [a.model_dump() for a in finding_obj.suggested_actions]
        agent_run.citations = [c.model_dump() for c in finding_obj.citations]

    except (json.JSONDecodeError, ValidationError) as e:
        db.rollback()
        logger.error(f"Agent structured output validation failed: {e}")
        agent_run.status = "failed"
        agent_run.finding = f"Failed to parse or validate LLM response: {str(e)}"
    except Exception as e:
        db.rollback()
        logger.error(f"Agent execution failed: {e}")
        agent_run.status = "failed"
        agent_run.finding = f"Execution error: {str(e)}"

    db.commit()
    db.refresh(agent_run)

    return agent_run
