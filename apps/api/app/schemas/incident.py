from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    severity: str = Field(default="high", pattern="^(critical|high|medium|low)$")
    endpoint_id: Optional[str] = None
    environment_id: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(critical|high|medium|low)$")
    status: Optional[str] = Field(None, pattern="^(open|investigating|identified|monitoring|resolved|inconclusive)$")


class IncidentResolveRequest(BaseModel):
    resolution_summary: str = Field(min_length=5)
    root_cause_confirmed: Optional[str] = None


class IncidentNoteRequest(BaseModel):
    note: str = Field(min_length=1)


class IncidentEventResponse(BaseModel):
    id: str
    incident_id: str
    project_id: str
    event_type: str
    source_record_id: Optional[str] = None
    timestamp: datetime
    summary: str
    metadata_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentResolutionResponse(BaseModel):
    id: str
    incident_id: str
    project_id: str
    resolution_summary: str
    root_cause_confirmed: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentResponse(BaseModel):
    id: str
    project_id: str
    environment_id: Optional[str] = None
    endpoint_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    started_at: datetime
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    primary_fingerprint: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    events: Optional[List[IncidentEventResponse]] = None
    resolution: Optional[IncidentResolutionResponse] = None

    model_config = ConfigDict(from_attributes=True)
