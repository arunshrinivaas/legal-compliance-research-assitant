from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.policies import router as policies_router
from app.routers.regulations import router as regulations_router
from app.routers.compliance import router as compliance_router
from app.routers.research import router as research_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(regulations_router)
app.include_router(policies_router)
app.include_router(compliance_router)
app.include_router(research_router)


@app.get("/")
def home():
    return {
        "message": "Legal Compliance Research Assistant API"
    }