#!/usr/bin/env python3
# 使い方: python3 tests/test_llm.py
# 事前条件: .env に API キーが設定済み（バックエンド起動不要）
import asyncio
import sys
sys.path.insert(0, __file__.replace('/tests/test_llm.py', ''))

from backend.config.settings import load_settings
from backend.main import _create_llm


async def main() -> None:
    settings = load_settings()
    print(f"Testing LLM: {settings.app.llm.active}")
    llm = _create_llm(settings)
    response = await llm.generate(
        messages=[{"role": "user", "content": "視聴者A: こんにちは！"}],
        system_prompt=settings.app.llm.system_prompt,
        response_schema=settings.app.llm.response_schema,
    )
    print("OK:")
    print(f"  text:        {response.text}")
    print(f"  emotion:     {response.emotion}")
    print(f"  voice_style: {response.voice_style}")


asyncio.run(main())
