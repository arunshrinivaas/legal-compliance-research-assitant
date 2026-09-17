from pydantic import BaseModel, EmailStr

VALID_ROLES = ["admin", "legal_analyst", "compliance_officer", "risk_analyst", "auditor", "viewer"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    role: str = "viewer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    is_active: bool

    class Config:
        from_attributes = True
