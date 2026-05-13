from __future__ import annotations

import asyncio
from typing import Any

import httpx

from backend.core.pipeline import CommentSource

BASE_URL = "https://www.googleapis.com/youtube/v3"


class YouTubeCommentSource(CommentSource):
    def __init__(self, api_key: str, video_id: str, polling_interval_sec: float = 5.0) -> None:
        self.api_key = api_key
        self.video_id = video_id
        self._default_interval_sec = polling_interval_sec
        self._live_chat_id: str | None = None
        self._next_page_token: str | None = None
        self._initialized = False

    async def _get_live_chat_id(self, client: httpx.AsyncClient) -> str:
        response = await client.get(
            f"{BASE_URL}/videos",
            params={
                "id": self.video_id,
                "part": "liveStreamingDetails",
                "key": self.api_key,
            },
        )
        response.raise_for_status()
        items = response.json().get("items", [])
        if not items:
            raise RuntimeError(f"Video not found: {self.video_id}")
        live_chat_id = items[0].get("liveStreamingDetails", {}).get("activeLiveChatId")
        if not live_chat_id:
            raise RuntimeError(f"No active live chat for video: {self.video_id}")
        return live_chat_id

    async def poll(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if not self._live_chat_id:
                self._live_chat_id = await self._get_live_chat_id(client)
                self._initialized = True

            params: dict[str, Any] = {
                "liveChatId": self._live_chat_id,
                "part": "snippet,authorDetails",
                "key": self.api_key,
                "maxResults": 200,
            }
            if self._next_page_token:
                params["pageToken"] = self._next_page_token

            response = await client.get(f"{BASE_URL}/liveChat/messages", params=params)
            response.raise_for_status()
            data = response.json()

            self._next_page_token = data.get("nextPageToken")
            poll_interval_sec = data.get("pollingIntervalMillis", self._default_interval_sec * 1000) / 1000
            await asyncio.sleep(poll_interval_sec)

            comments: list[dict[str, Any]] = []
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                author = item.get("authorDetails", {})
                if snippet.get("type") == "textMessageEvent":
                    text = snippet.get("textMessageDetails", {}).get("messageText", "").strip()
                    if text:
                        comments.append(
                            {
                                "author": author.get("displayName", "anonymous"),
                                "text": text,
                            }
                        )
            return comments
