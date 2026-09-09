from copilot import CopilotClient, SessionEventType
from copilot.generated.session_events import AssistantMessageData


client = CopilotClient()


async def test_copilot() -> str:
    await client.start()

    session = await client.create_session(
        model="auto",
    )

    response = await session.send_and_wait(
        "Respond with exactly: Copilot connection successful."
    )

    if response is None:
        await session.disconnect()
        await client.stop()
        return "No response received from Copilot."

    if response.type != SessionEventType.ASSISTANT_MESSAGE:
        await session.disconnect()
        await client.stop()
        return f"Unexpected response type: {response.type}"

    # pyrefly: ignore [missing-attribute]
    result = response.data.content

    await session.disconnect()
    await client.stop()

    return result
    