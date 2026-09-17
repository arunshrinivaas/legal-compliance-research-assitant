import requests
import json
import sqlite3

# 1. Get an existing user email
conn = sqlite3.connect('backend/data/app.db')
c = conn.cursor()
c.execute("SELECT email FROM users LIMIT 1")
row = c.fetchone()
if not row:
    # try dev.db
    conn = sqlite3.connect('backend/dev.db')
    c = conn.cursor()
    c.execute("SELECT email FROM users LIMIT 1")
    row = c.fetchone()
conn.close()

email = row[0] if row else "test@example.com"
password = "password" # default test password usually

# just login
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", json={"email": email, "password": "password123"})
if login_res.status_code != 200:
    login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", json={"email": "admin@example.com", "password": "password"})
if login_res.status_code != 200:
    login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", json={"email": "user@example.com", "password": "password"})

if login_res.status_code == 200:
    token = login_res.json()["access_token"]
    print(f"Got token for {login_res.json()['user']['email']}")
    
    # Run comparison on investigation 3
    res = requests.post(
        "http://127.0.0.1:8000/api/v1/investigations/3/compare",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question": "Compare these documents and tell me who has a stronger chance of getting into a company with a good CTC with supporting points. Also give me the ATS score of all of these docs",
            "limit": 5
        }
    )
    
    print("API Status:", res.status_code)
    try:
        data = res.json()
        print("Comparison output length:", len(data.get("comparison", "")))
        # We don't need to print everything, the backend logs will show what we need!
    except:
        print("Error parsing response")
else:
    print("Failed to login:", login_res.text)

