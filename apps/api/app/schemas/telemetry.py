from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class TelemetryIngestEvent(BaseModel):
    event_type: str = Field(default="request", pattern="^(request|error|dependency)$")
    service_name: str = Field(default="api", max_length=100)
    service_version: Optional[str] = None
    http_method: str = Field(pattern="^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$")
    route_template: str = Field(min_length=1, max_length=500)
    status_code: int = Field(ge=100, le=599)
    duration_ms: float = Field(ge=0.0)
    timestamp: Optional[datetime] = None
    exception_type: Optional[str] = None
    exception_message: Optional[str] = None
    stack_trace: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    request_headers: Optional[Dict[str, Any]] = None
    request_body: Optional[Any] = None
    response_body: Optional[Any] = None


class TelemetryBatchIngest(BaseModel):
    events: List[TelemetryIngestEvent] = Field(min_length=1, max_length=500)


class TelemetryResponse(BaseModel):
    accepted: int
    rejected: int = 0
    message: str = "Telemetry ingested successfully"


class TelemetryEventResponse(BaseModel):
    id: str
    project_id: str
    environment_id: Optional[str] = None
    event_type: str
    timestamp: datetime
    service_name: str
    service_version: Optional[str] = None
    http_method: str
    route_template: str
    status_code: int
    duration_ms: float
    exception_type: Optional[str] = None
    sanitized_message: Optional[str] = None
    stack_trace: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    fingerprint: Optional[str] = None

    class Config:
        from_attributes = True
