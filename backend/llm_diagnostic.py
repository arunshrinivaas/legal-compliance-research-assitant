import asyncio
import time
from copilot import CopilotClient, SessionEventType
from app.services.copilot_service import client as global_client

async def run_diagnostic():
    print("=========================================")
    print("       LLM LATENCY DIAGNOSTIC           ")
    print("=========================================\n")

    # 1. Cold vs Warm
    print("--- 1. Cold vs Warm ---")
    t0 = time.perf_counter()
    client = CopilotClient()
    t1 = time.perf_counter()
    client_init_ms = (t1 - t0) * 1000

    t0 = time.perf_counter()
    await client.start()
    t1 = time.perf_counter()
    client_start_ms = (t1 - t0) * 1000

    t0 = time.perf_counter()
    session = await client.create_session(model="auto", streaming=True)
    t1 = time.perf_counter()
    session_create_ms = (t1 - t0) * 1000

    print(f"Cold Start: client_init_ms={client_init_ms:.2f}ms, start_ms={client_start_ms:.2f}ms, session_create_ms={session_create_ms:.2f}ms")

    # 2. Timing the Events (Streaming internally?)
    print("\n--- 2. Internal Streaming & Latency ---")
    
    first_event_ms = None
    last_event_ms = None
    idle_ms = None
    response_text = ""
    event_count = 0
    t_start_gen = None

    done = asyncio.Event()

    def handle_event(event):
        nonlocal first_event_ms, last_event_ms, idle_ms, response_text, event_count
        now = time.perf_counter()
        
        if event.type == SessionEventType.ASSISTANT_MESSAGE:
            if first_event_ms is None:
                first_event_ms = (now - t_start_gen) * 1000
            last_event_ms = (now - t_start_gen) * 1000
            response_text = event.data.content
            event_count += 1
            
        elif event.type == SessionEventType.SESSION_IDLE:
            idle_ms = (now - t_start_gen) * 1000
            done.set()
            
        elif event.type == SessionEventType.SESSION_ERROR:
            done.set()

    session.on(handle_event)
    
    prompt = "This is a simple factual question: What is 2+2? Respond with exactly one word."
    
    t0 = time.perf_counter()
    await session.send(prompt)
    t_start_gen = time.perf_counter()
    submit_ms = (t_start_gen - t0) * 1000
    
    try:
        await asyncio.wait_for(done.wait(), timeout=45.0)
    except asyncio.TimeoutError:
        print("Timeout waiting for LLM.")
        
    t_end = time.perf_counter()
    total_wait_ms = (t_end - t_start_gen) * 1000
    
    print(f"Submit prompt: {submit_ms:.2f}ms")
    print(f"First event: {first_event_ms}ms")
    print(f"Last event: {last_event_ms}ms")
    print(f"Idle event: {idle_ms}ms")
    print(f"Total wait: {total_wait_ms:.2f}ms")
    print(f"Total events received: {event_count}")
    print(f"Response length: {len(response_text)}")
    
    t0 = time.perf_counter()
    await session.disconnect()
    await client.stop()
    t1 = time.perf_counter()
    print(f"Cleanup ms: {(t1 - t0) * 1000:.2f}ms")

    # 3. Model Configuration Options
    # We will print out what methods/properties are available on client and session
    print("\n--- 3. Client & Session Introspection ---")
    print(f"Session model: getattr(session, 'model', 'unknown')")
    
if __name__ == "__main__":
    asyncio.run(run_diagnostic())
