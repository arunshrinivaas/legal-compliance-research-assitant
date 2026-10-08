import asyncio
from httpx import AsyncClient, ASGITransport
from mcp.client.streamable_http import streamable_http_client
from mcp.client.session import ClientSession
from app.main import app
from app.routers.auth import create_access_token
from contextlib import AsyncExitStack

async def run():
    token = create_access_token({"sub": "1"})
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(app.router.lifespan_context(app))
        async with streamable_http_client("http://test/api/v1/mcp/", http_client=AsyncClient(transport=ASGITransport(app=app), headers={"Authorization": f"Bearer {token}"})) as streams:
            async with ClientSession(streams[0], streams[1]) as session:
                await session.initialize()
                tools = await session.list_tools()
                print("Tools:", [t.name for t in tools.tools])
                result = await session.call_tool("list_policies", {})
                print("Policies:", result.content[0].text[:50])

if __name__ == "__main__":
    asyncio.run(run())
