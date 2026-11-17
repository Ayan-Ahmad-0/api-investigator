from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(default="Default Key", max_length=100)
    key_type: str = Field(default="ingest", pattern="^(ingest|admin)$")
    expires_in_days: Optional[int] = None


class ApiKeyCreatedResponse(BaseModel):
    id: str
    project_id: str
    name: str
    key_prefix: str
    full_key: str  # Only returned upon creation
    key_type: str
    created_at: datetime


class ApiKeyResponse(BaseModel):
    id: str
    project_id: str
    name: str
    key_prefix: str
    key_type: str
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
