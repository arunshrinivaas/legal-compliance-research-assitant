import asyncio

from app.services.copilot_service import test_copilot


async def main():
    result = await test_copilot()
    print(result)


asyncio.run(main())
