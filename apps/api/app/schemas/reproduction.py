from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class ReproductionPackageResponse(BaseModel):
    incident_id: str
    http_method: str
    normalized_route: str
    safe_url: str
    timestamp: datetime
    environment: Optional[str] = None
    service_version: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    sanitized_headers: Dict[str, str] = {}
    sanitized_body: Optional[Any] = None
    response_status: Optional[int] = None
    response_body: Optional[Any] = None
    exception_type: Optional[str] = None
    sanitized_stack_trace: Optional[str] = None
    timing_ms: Optional[float] = None
    curl_command: str


class CurlReproductionResponse(BaseModel):
    curl_command: str
    is_safe: bool = True
    notice: str = "Credentials and sensitive headers have been masked with safe placeholders."


class RequestDiffItem(BaseModel):
    field: str
    failed_value: Any
    successful_value: Any
    significance: str


class RequestDiffResponse(BaseModel):
    has_baseline: bool
    failed_request_summary: Dict[str, Any]
    successful_request_summary: Optional[Dict[str, Any]] = None
    differences: List[RequestDiffItem] = []
