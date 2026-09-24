import asyncio
from copilot import CopilotClient

async def get_models():
    client = CopilotClient()
    await client.start()
    
    try:
        models = await client.list_models()
        for m in models:
            print(f"- {m.id} (name: {getattr(m, 'name', '')})")
    except Exception as e:
        print(f"Error listing models: {e}")
        
    await client.stop()

if __name__ == "__main__":
    asyncio.run(get_models())
