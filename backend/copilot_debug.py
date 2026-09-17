import asyncio

from copilot import CopilotClient, SessionEventType


async def main():
    client = CopilotClient()

    print("Starting Copilot client...")
    await client.start()
    print("Copilot client started.")

    session = await client.create_session(
        model="auto",
        streaming=True,
    )

    print("Copilot session created.")

    done = asyncio.Event()

    def handle_event(event):
        print(f"EVENT: {event.type}")

        if event.type == SessionEventType.ASSISTANT_MESSAGE:
            print("ASSISTANT MESSAGE:")
            print(event.data.content)

        elif event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            print(event.data.delta_content, end="", flush=True)

        elif event.type == SessionEventType.SESSION_IDLE:
            print("\nSESSION IDLE")
            done.set()

        elif event.type == SessionEventType.SESSION_ERROR:
            print("SESSION ERROR:")
            print(event.data)
            done.set()

    session.on(handle_event)

    print("Sending prompt to Copilot...")

    await session.send(
        "Respond with exactly: HELLO"
    )

    await done.wait()

    await session.disconnect()
    await client.stop()

    print("Copilot client stopped.")


asyncio.run(main())