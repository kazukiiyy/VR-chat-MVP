#!/usr/bin/env python3
import json
import sys
import urllib.request

author = sys.argv[1] if len(sys.argv) > 2 else "テスト"
text = sys.argv[-1] if len(sys.argv) > 1 else "こんにちは"

data = json.dumps({"author": author, "text": text}).encode()
req = urllib.request.Request(
    "http://localhost:8000/comment",
    data=data,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as res:
    print(res.read().decode())
