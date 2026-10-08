from fastapi import FastAPI
from fastapi.security import HTTPAuthorizationCredentials
from app.routers.auth import get_current_user
from app.database import get_db

print("Functions available")
