from __future__ import annotations

from collections import deque


class ContextManager:
    def __init__(self, max_messages: int = 10) -> None:
        self._messages: deque[dict[str, str]] = deque(maxlen=max_messages)

    def add(self, role: str, content: str) -> None:
        self._messages.append({"role": role, "content": content})

    def get_messages(self) -> list[dict[str, str]]:
        return list(self._messages)

    def clear(self) -> None:
        self._messages.clear()
