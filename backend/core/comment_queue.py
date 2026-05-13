from __future__ import annotations

import asyncio
from typing import Any


class CommentQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def put(self, comment: dict[str, Any]) -> None:
        await self._queue.put(comment)

    async def get(self) -> dict[str, Any]:
        return await self._queue.get()

    def qsize(self) -> int:
        return self._queue.qsize()
