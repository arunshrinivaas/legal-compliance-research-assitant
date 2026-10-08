import requests

try:
    response = requests.get("http://localhost:8000/api/v1/integrations/google-drive/auth-url")
    print(f"Server returned: {response.status_code}")
    print(f"Content: {response.text}")
except Exception as e:
    print(f"Failed to connect: {e}")
