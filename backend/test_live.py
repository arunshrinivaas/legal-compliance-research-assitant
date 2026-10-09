import asyncio
import time
import json
from copilot import CopilotClient, SessionEventType
from app.services.embedding_service import generate_embedding

async def test_live_copilot():
    print("--- Live Copilot Connectivity Test ---")
    start = time.time()
    try:
        client = CopilotClient()
        await client.start()
        
        session = await client.create_session(model="auto")
        
        response_text = ""
        done = asyncio.Event()

        def handle_event(event):
            nonlocal response_text
            if event.type == SessionEventType.ASSISTANT_MESSAGE:
                response_text = event.data.content
            elif event.type == SessionEventType.SESSION_IDLE:
                done.set()
            elif event.type == SessionEventType.SESSION_ERROR:
                error_data = event.data
                response_text = f"SESSION_ERROR: {error_data.message if hasattr(error_data, 'message') else str(error_data)}"
                done.set()

        session.on(handle_event)
        
        await session.send("Respond with exactly: Copilot connection successful.")
        
        await asyncio.wait_for(done.wait(), timeout=30.0)
        await session.disconnect()
        await client.stop()
        
        latency = time.time() - start
        print(f"Provider: CopilotClient (model=auto)")
        print(f"Status: Success")
        print(f"Response: {response_text}")
        print(f"Latency: {latency:.2f}s")
        return True
    except Exception as e:
        latency = time.time() - start
        print(f"Provider: CopilotClient (model=auto)")
        print(f"Status: Failed")
        print(f"Error: {str(e)}")
        print(f"Latency: {latency:.2f}s")
        return False

def test_live_embeddings():
    print("\n--- Live Embeddings Connectivity Test ---")
    start = time.time()
    try:
        vec = generate_embedding("This is a short input.")
        latency = time.time() - start
        print(f"Provider: sentence-transformers (all-MiniLM-L6-v2)")
        print(f"Status: Success")
        print(f"Vector dimension: {len(vec)}")
        print(f"Latency: {latency:.2f}s")
    except Exception as e:
        latency = time.time() - start
        print(f"Provider: sentence-transformers (all-MiniLM-L6-v2)")
        print(f"Status: Failed")
        print(f"Error: {str(e)}")
        print(f"Latency: {latency:.2f}s")

if __name__ == "__main__":
    test_live_embeddings()
    asyncio.run(test_live_copilot())
