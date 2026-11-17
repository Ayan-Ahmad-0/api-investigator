from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AnalyticsOverviewResponse(BaseModel):
    total_endpoints: int
    healthy_count: int
    degraded_count: int
    failing_count: int
    active_incidents: int
    overall_error_rate: float
    avg_latency_ms: float
    p95_latency_ms: float


class ErrorMetricsResponse(BaseModel):
    total_errors: int
    error_rate: float
    time_series: List[Dict[str, Any]]
    top_errors: List[Dict[str, Any]]


class LatencyMetricsResponse(BaseModel):
    avg_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    time_series: List[Dict[str, Any]]


class EndpointReliabilityItem(BaseModel):
    endpoint_id: str
    name: str
    method: str
    route_template: str
    uptime_percentage: float
    total_checks: int
    failed_checks: int
    avg_latency_ms: float
    status: str


class EndpointReliabilityResponse(BaseModel):
    endpoints: List[EndpointReliabilityItem]
