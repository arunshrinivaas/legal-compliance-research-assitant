import asyncio

from copilot import CopilotClient, SessionEventType


client = CopilotClient()


async def test_copilot() -> str:
    await client.start()

    session = await client.create_session(
        model="auto",
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

    await session.send(
        "Respond with exactly: Copilot connection successful."
    )

    await done.wait()

    await session.disconnect()
    await client.stop()

    if not response_text:
        return "No response received from Copilot."

    return response_text


async def ask_copilot_with_context(
    question: str,
    context: str,
) -> str:
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

    prompt = f"""
You are a legal and compliance research assistant.

Your task is to answer the user's question using ONLY the provided document
context.

STRICT GROUNDING RULES:

1. Use only information explicitly supported by the provided context.
2. Do not invent facts, sources, skills, technologies, legal requirements,
   or interpretations.
3. Preserve the terminology used in the source documents whenever possible.
4. Do not replace a source term with a similar or assumed term.
5. If the context does not contain enough information to answer the question,
   clearly say that the available documents do not contain enough information.
6. Distinguish between established information and areas of interest or
   future learning when the source makes that distinction.
7. Every factual statement derived from the documents must include a source
   citation.
8. Use this exact citation format:
   [Source: filename, Chunk: number]
9. Only cite sources that actually appear in the provided document context.
10. Do not create or modify filenames, chunk numbers, or source references.

Write the answer clearly and concisely.

User question:
{question}

Document context:
{context}
"""

    print("Sending RAG prompt to Copilot...")

    await session.send(prompt)

    await done.wait()

    print("Copilot finished generating the answer.")

    await session.disconnect()
    await client.stop()

    if not response_text:
        return "No response received from Copilot."

    return response_text