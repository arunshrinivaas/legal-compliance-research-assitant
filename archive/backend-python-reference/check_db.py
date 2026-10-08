import sys
from app.database import SessionLocal
from app.models.user import User
from app.models.integration import Integration

db = SessionLocal()
integrations = db.query(Integration).filter(Integration.provider == "google_drive").all()
if not integrations:
    print("No Google Drive integrations found.")
for i in integrations:
    print(f"ID: {i.id}, User ID: {i.user_id}, Provider: {i.provider}, Scopes: {bool(i.scopes)}, Created: {i.created_at}")
