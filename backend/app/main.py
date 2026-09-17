from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models

from app.routers import (
    auth,
    compliance,
    document,
    investigations,
    policies,
    rag,
    regulations,
    research,
)


app = FastAPI(
    title="Legal Compliance Research Assistant",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(regulations.router)
app.include_router(policies.router)
app.include_router(compliance.router)
app.include_router(research.router)
app.include_router(document.router)
app.include_router(rag.router)
app.include_router(investigations.router)


@app.get("/")
def root():
    return {
        "name": "Legal Compliance Research Assistant",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/ready")
def ready():
    return {"status": "ready"}