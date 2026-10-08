import requests
import json
from app.config import settings

# Just checking if the endpoint accepts the json format
r = requests.post(
    "http://localhost:8000/api/v1/integrations/google-drive/callback",
    json={"code": "123", "state": "abc", "expected_state": "abc"}
)
print(r.status_code, r.text)
