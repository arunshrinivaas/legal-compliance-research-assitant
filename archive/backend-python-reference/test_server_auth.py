import requests

login_resp = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": "test@example.com", "password": "password"})
token = login_resp.json().get("access_token")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("http://localhost:8000/api/v1/integrations/google-drive/auth-url", headers=headers)
    print(f"Server returned: {response.status_code}")
    print(f"Content: {response.text}")
else:
    print("Failed to login", login_resp.text)
