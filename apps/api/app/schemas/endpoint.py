from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class EndpointCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    method: str = Field(default="GET", pattern="^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$")
    route_template: str = Field(min_length=1, max_length=500)
    environment_id: Optional[str] = None


class EndpointResponse(BaseModel):
    id: str
    project_id: str
    environment_id: Optional[str] = None
    name: str
    method: str
    route_template: str
    created_at: datetime
    status: Optional[str] = "healthy"  # healthy, degraded, failing
    last_latency_ms: Optional[float] = None
    success_rate: Optional[float] = 100.0

    class Config:
        from_attributes = True


class MonitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=1000)
    method: str = Field(default="GET", pattern="^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$")
    interval_seconds: int = Field(default=60, ge=10, le=86400)
    timeout_ms: int = Field(default=5000, ge=100, le=60000)
    expected_status_codes: str = Field(default="200,201,204")
    expected_conditions: Optional[str] = None
    endpoint_id: Optional[str] = None
    enabled: bool = True


class MonitorUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    method: Optional[str] = None
    interval_seconds: Optional[int] = Field(None, ge=10, le=86400)
    timeout_ms: Optional[int] = Field(None, ge=100, le=60000)
    expected_status_codes: Optional[str] = None
    enabled: Optional[bool] = None


class ApiCheckResponse(BaseModel):
    id: str
    project_id: str
    monitor_id: str
    checked_at: datetime
    status: str  # healthy, degraded, failing, timeout
    http_status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    dns_duration_ms: Optional[float] = None
    connect_duration_ms: Optional[float] = None
    tls_duration_ms: Optional[float] = None
    ttfb_ms: Optional[float] = None
    error_category: Optional[str] = None
    sanitized_response_sample: Optional[str] = None

    class Config:
        from_attributes = True


class MonitorResponse(BaseModel):
    id: str
    project_id: str
    endpoint_id: Optional[str] = None
    name: str
    url: str
    method: str
    interval_seconds: int
    timeout_ms: int
    expected_status_codes: str
    enabled: bool
    created_at: datetime
    updated_at: datetime
    last_status: Optional[str] = "healthy"
    last_latency_ms: Optional[float] = None
    last_checked_at: Optional[datetime] = None

    class Config:
        from_attributes = True
