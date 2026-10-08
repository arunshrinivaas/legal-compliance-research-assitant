import requests

def test_comments():
    base_url = "http://127.0.0.1:8000"
    
    # Login
    resp = requests.post(f"{base_url}/api/v1/auth/token", data={
        "username": "demo@opuslex.placeholder",
        "password": "demopassword"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Investigations
    resp = requests.get(f"{base_url}/api/v1/investigations/", headers=headers)
    invs = resp.json()
    if not invs:
        # Create one
        resp = requests.post(f"{base_url}/api/v1/investigations/", headers=headers, json={"title": "Test Inv"})
        inv_id = resp.json()["id"]
    else:
        inv_id = invs[0]["id"]
        
    # POST empty comment
    resp = requests.post(f"{base_url}/api/v1/investigations/{inv_id}/comments", headers=headers, json={"text": "   "})
    assert resp.status_code == 422
    
    # POST valid comment
    resp = requests.post(f"{base_url}/api/v1/investigations/{inv_id}/comments", headers=headers, json={"text": "Hello world!"})
    assert resp.status_code == 200
    
    # GET comments
    resp = requests.get(f"{base_url}/api/v1/investigations/{inv_id}/comments", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) > 0
    
    # POST to non-existent inv
    resp = requests.post(f"{base_url}/api/v1/investigations/9999/comments", headers=headers, json={"text": "Hello world!"})
    assert resp.status_code == 404
    
    print("ALL TESTS PASSED")

if __name__ == "__main__":
    test_comments()
