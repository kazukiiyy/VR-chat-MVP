from __future__ import annotations

import asyncio
import time
from typing import Any


class CommentQueue:
    def __init__(self) -> None:
        self._queue: asyncio.PriorityQueue[tuple[int, float, dict[str, Any]]] = asyncio.PriorityQueue()

    async def put(self, comment: dict[str, Any]) -> None:
        await self._queue.put((0, time.time(), comment))

    async def get(self) -> dict[str, Any]:
        _priority, _timestamp, comment = await self._queue.get()
        return comment

    def qsize(self) -> int:
        return self._queue.qsize()
