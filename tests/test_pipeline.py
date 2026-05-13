#!/usr/bin/env python3
# 使い方: python3 tests/test_pipeline.py
# 事前条件: ./start.sh でバックエンド起動中、▶ ボタンで pipeline が running
import asyncio
import json
import sys
import urllib.request

BACKEND = "http://localhost:8000"
TIMEOUT = 30


async def main() -> None:
    try:
        import websockets
    except ImportError:
        print("ERROR: pip install websockets")
        sys.exit(1)

    with urllib.request.urlopen(f"{BACKEND}/status") as res:
        status = json.loads(res.read())
    print(f"Status: {status}")
    if not status.get("running"):
        print("ERROR: Pipeline is not running. Press ▶ first.")
        sys.exit(1)

    print(f"Waiting for response (timeout: {TIMEOUT}s)...")
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        data = json.dumps({"author": "テスト", "text": "今日の調子はどうですか？"}).encode()
        req = urllib.request.Request(
            f"{BACKEND}/comment", data=data, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            print(f"Comment queued: {json.loads(res.read())}")
        try:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=TIMEOUT))
            print("OK:")
            print(f"  comment: {msg.get('comment')}")
            print(f"  reply:   {msg.get('reply')}")
            print(f"  emotion: {msg.get('emotion')}")
            print(f"  audio:   {len(msg.get('audio', ''))} chars (base64)")
            if len(msg.get("audio", "")) < 100:
                print("WARN: audio is very small (TTS may have failed)")
        except asyncio.TimeoutError:
            print(f"FAIL: No response within {TIMEOUT}s")
            sys.exit(1)


asyncio.run(main())
