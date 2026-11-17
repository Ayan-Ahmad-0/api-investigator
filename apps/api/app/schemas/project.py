from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnvironmentCreate(BaseModel):
    name: str = Field(pattern="^(production|staging|development|[a-z0-9-]+)$")


class EnvironmentResponse(BaseModel):
    id: str
    project_id: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
