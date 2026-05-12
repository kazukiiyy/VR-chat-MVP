from __future__ import annotations

import asyncio
import base64
from abc import ABC, abstractmethod
from contextlib import suppress
from typing import Any, Protocol

from backend.config.settings import AppSettings
from backend.core.comment_queue import CommentQueue
from backend.core.context_manager import ContextManager
from backend.plugins.llm.base import LLMPlugin
from backend.plugins.tts.base import TTSPlugin


class WebSocketClient(Protocol):
    async def send_json(self, data: Any) -> None:
        ...


class CommentSource(ABC):
    @abstractmethod
    async def poll(self) -> list[dict[str, Any]]:
        ...


class MockYouTubeCommentSource(CommentSource):
    def __init__(self, polling_interval_sec: float) -> None:
        self.polling_interval_sec = polling_interval_sec
        self._counter = 0

    async def poll(self) -> list[dict[str, Any]]:
        await asyncio.sleep(self.polling_interval_sec)
        self._counter += 1
        return [
            {
                "author": f"viewer{self._counter}",
                "text": f"モックコメント {self._counter}",
            }
        ]


class Pipeline:
    def __init__(
        self,
        app_settings: AppSettings,
        llm: LLMPlugin,
        tts: TTSPlugin,
        comment_source: CommentSource | None = None,
    ) -> None:
        self.app_settings = app_settings
        self.llm = llm
        self.tts = tts
        self.comment_source = comment_source or MockYouTubeCommentSource(
            app_settings.youtube.polling_interval_sec
        )
        self.queue = CommentQueue()
        self.context = ContextManager()
        self._producer_task: asyncio.Task[None] | None = None
        self._consumer_task: asyncio.Task[None] | None = None
        self._websockets: set[WebSocketClient] = set()
        self._running = False

    @property
    def running(self) -> bool:
        return self._running

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._producer_task = asyncio.create_task(self._poll_comments())
        self._consumer_task = asyncio.create_task(self._process_comments())

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        for task in (self._producer_task, self._consumer_task):
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
        self._producer_task = None
        self._consumer_task = None

    def add_websocket(self, websocket: WebSocketClient) -> None:
        self._websockets.add(websocket)

    def remove_websocket(self, websocket: WebSocketClient) -> None:
        self._websockets.discard(websocket)

    def status(self) -> dict[str, Any]:
        return {
            "running": self._running,
            "queue_size": self.queue.qsize(),
            "websocket_clients": len(self._websockets),
        }

    async def _poll_comments(self) -> None:
        while self._running:
            try:
                comments = await self.comment_source.poll()
                for comment in comments:
                    await self.queue.put(comment)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[pipeline] poll error: {exc}")

    async def _process_comments(self) -> None:
        while self._running:
            try:
                comment = await self.queue.get()
            except asyncio.CancelledError:
                raise

            if not self._running:
                break

            text = str(comment.get("text", ""))
            author = str(comment.get("author", "anonymous"))
            self.context.add("user", f"{author}: {text}")

            try:
                llm_response = await self.llm.generate(
                    messages=self.context.get_messages(),
                    system_prompt=self.app_settings.llm.system_prompt,
                    response_schema=self.app_settings.llm.response_schema,
                )
                self.context.add("assistant", llm_response.text)

                style_params = self.app_settings.tts.styles.get(
                    llm_response.voice_style,
                    self.app_settings.tts.styles.get("normal", {}),
                )
                audio = await self.tts.synthesize(llm_response.text, style_params)
                await self._broadcast(
                    {
                        "type": "response",
                        "comment": {"author": author, "text": text},
                        "reply": llm_response.text,
                        "emotion": llm_response.emotion,
                        "voice_style": llm_response.voice_style,
                        "audio": base64.b64encode(audio).decode("ascii"),
                    }
                )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[pipeline] process error: {exc}")

    async def _broadcast(self, message: dict[str, Any]) -> None:
        stale: list[WebSocketClient] = []
        for websocket in list(self._websockets):
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.remove_websocket(websocket)
