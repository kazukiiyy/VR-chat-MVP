#!/usr/bin/env python3
# 使い方: python3 tests/test_voicevox.py
# 事前条件: VOICEVOX が起動中 (http://localhost:50021)
import asyncio
import sys
sys.path.insert(0, __file__.replace('/tests/test_voicevox.py', ''))

from backend.plugins.tts.voicevox import VoicevoxPlugin


async def main() -> None:
    plugin = VoicevoxPlugin(endpoint="http://localhost:50021")
    print("Testing VOICEVOX...")
    audio = await plugin.synthesize(
        "こんにちは、テストです。",
        {"speaker_id": 3, "speed": 1.0, "pitch": 0.0, "volume": 1.0, "intonation": 1.0},
    )
    if len(audio) < 1000:
        print("FAIL: audio too small (possibly silent WAV fallback)")
        sys.exit(1)
    output_path = "/tmp/voicevox_test.wav"
    with open(output_path, "wb") as f:
        f.write(audio)
    print(f"OK: {len(audio)} bytes -> {output_path}")


asyncio.run(main())
