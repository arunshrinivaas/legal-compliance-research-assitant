"""
Diagnostic: trace ATS scores through MAP → REDUCE for investigation 3.
Hits the real live backend (http://127.0.0.1:8000) with a valid user-1 token.
All [DIAG:MAP_RESULT], [DIAG:REDUCE_INPUT], [DIAG:REDUCE_OUTPUT] output
comes from the server logs — this script just triggers the comparison.
"""
import urllib.request
import json
from app.security import create_access_token

token = create_access_token(data={"sub": "1"})

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/investigations/3/compare",
    data=json.dumps({
        "question": "Compare these documents and tell me who has a stronger chance of getting a software engineer role.",
        "limit": 5
    }).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
)

print("Sending comparison request for investigation 3 (4 documents)…")
print("Watch the BACKEND terminal for [DIAG:MAP_RESULT], [DIAG:REDUCE_INPUT], [DIAG:REDUCE_OUTPUT] lines.")
print()

try:
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("=== HTTP STATUS: 200 OK ===")
        print(f"documents returned: {len(data['documents'])}")
        for d in data["documents"]:
            print(f"  {d['label']}: {d['filename']}")
        print(f"\ncomparison length: {len(data['comparison'])} chars")
        print("\n=== COMPARISON TEXT ===")
        print(data["comparison"])
except urllib.error.HTTPError as e:
    print(f"HTTP error: {e.code} {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
