from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class TTSPlugin(ABC):
    @abstractmethod
    async def synthesize(self, text: str, style_params: dict[str, Any]) -> bytes:
        ...
