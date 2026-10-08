import requests
import json

r = requests.get("http://localhost:8000/api/v1/integrations/google-drive/auth-url")
print(r.status_code, r.text)
