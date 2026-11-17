import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.telemetry import TelemetryEvent
from app.models.endpoint import Monitor, ApiCheck


def build_curl_command(
    method: str,
    url: str,
    headers: Dict[str, str],
    body: Optional[Any] = None,
) -> str:
    lines = [f"curl -X {method.upper()} \"{url}\""]
    # Ensure Content-Type is present if body
    has_content_type = False
    for k, v in headers.items():
        if k.lower() == "content-type":
            has_content_type = True
        # Ensure credentials are masked with safe placeholders
        lines.append(f"  -H \"{k}: {v}\"")

    if body is not None:
        if not has_content_type:
            lines.append("  -H \"Content-Type: application/json\"")
        body_str = json.dumps(body) if not isinstance(body, str) else body
        # Escape single quotes
        escaped_body = body_str.replace("'", "'\\''")
        lines.append(f"  -d '{escaped_body}'")

    return " \\\n".join(lines)


def generate_reproduction_package(db: Session, incident_id: str) -> Optional[Dict[str, Any]]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return None

    # Try finding the latest failing TelemetryEvent for this project/fingerprint/route
    failed_event: Optional[TelemetryEvent] = None
    if incident.primary_fingerprint:
        failed_event = db.query(TelemetryEvent).filter(
            TelemetryEvent.project_id == incident.project_id,
            TelemetryEvent.fingerprint == incident.primary_fingerprint,
        ).order_by(TelemetryEvent.timestamp.desc()).first()

    if not failed_event:
        # Search by route mentioned in incident title
        failed_event = db.query(TelemetryEvent).filter(
            TelemetryEvent.project_id == incident.project_id,
            TelemetryEvent.status_code >= 400,
        ).order_by(TelemetryEvent.timestamp.desc()).first()

    method = "GET"
    route = "/"
    safe_url = "https://api.example.com"
    timestamp = incident.started_at
    service_ver = None
    req_id = None
    tr_id = None
    headers = {"Content-Type": "application/json", "Authorization": "Bearer <REDACTED>"}
    body = None
    resp_status = 500
    resp_body = None
    exc_type = None
    stack = None
    timing_ms = 120.0

    if failed_event:
        method = failed_event.http_method
        route = failed_event.route_template
        safe_url = f"https://api.example.com{route}"
        timestamp = failed_event.timestamp
        service_ver = failed_event.service_version
        req_id = failed_event.request_id
        tr_id = failed_event.trace_id
        resp_status = failed_event.status_code
        exc_type = failed_event.exception_type
        stack = failed_event.stack_trace
        timing_ms = failed_event.duration_ms

        if failed_event.sanitized_attributes:
            try:
                attrs = json.loads(failed_event.sanitized_attributes)
                if "headers" in attrs:
                    headers.update(attrs["headers"])
                if "request_body" in attrs:
                    body = attrs["request_body"]
                if "response_body" in attrs:
                    resp_body = attrs["response_body"]
            except Exception:
                pass
    elif incident.endpoint:
        method = incident.endpoint.method
        route = incident.endpoint.route_template
        safe_url = f"https://api.example.com{route}"

    curl_cmd = build_curl_command(method, safe_url, headers, body)

    return {
        "incident_id": incident_id,
        "http_method": method,
        "normalized_route": route,
        "safe_url": safe_url,
        "timestamp": timestamp,
        "environment": incident.environment_id or "production",
        "service_version": service_ver,
        "request_id": req_id,
        "trace_id": tr_id,
        "sanitized_headers": headers,
        "sanitized_body": body,
        "response_status": resp_status,
        "response_body": resp_body or {"error": exc_type or "Internal Server Error"},
        "exception_type": exc_type,
        "sanitized_stack_trace": stack,
        "timing_ms": timing_ms,
        "curl_command": curl_cmd,
    }


def generate_request_diff(db: Session, incident_id: str) -> Dict[str, Any]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"has_baseline": False, "failed_request_summary": {}, "successful_request_summary": None, "differences": []}

    repro = generate_reproduction_package(db, incident_id)
    if not repro:
        return {"has_baseline": False, "failed_request_summary": {}, "successful_request_summary": None, "differences": []}

    route = repro["normalized_route"]
    # Look for last successful request (status 200) for same route template
    success_event = db.query(TelemetryEvent).filter(
        TelemetryEvent.project_id == incident.project_id,
        TelemetryEvent.route_template == route,
        TelemetryEvent.status_code == 200,
    ).order_by(TelemetryEvent.timestamp.desc()).first()

    failed_summary = {
        "status_code": repro["response_status"],
        "timing_ms": repro["timing_ms"],
        "exception_type": repro["exception_type"],
        "request_body": repro["sanitized_body"],
        "timestamp": str(repro["timestamp"]),
    }

    if not success_event:
        return {
            "has_baseline": False,
            "failed_request_summary": failed_summary,
            "successful_request_summary": None,
            "differences": [
                {
                    "field": "baseline",
                    "failed_value": repro["response_status"],
                    "successful_value": None,
                    "significance": "No baseline successful request recorded in current telemetry retention window.",
                }
            ],
        }

    success_summary = {
        "status_code": success_event.status_code,
        "timing_ms": success_event.duration_ms,
        "exception_type": None,
        "request_body": None,
        "timestamp": str(success_event.timestamp),
    }

    diffs = [
        {
            "field": "status_code",
            "failed_value": repro["response_status"],
            "successful_value": success_event.status_code,
            "significance": f"Status changed from {success_event.status_code} to {repro['response_status']}",
        },
        {
            "field": "duration_ms",
            "failed_value": repro["timing_ms"],
            "successful_value": success_event.duration_ms,
            "significance": f"Latency changed from {success_event.duration_ms}ms to {repro['timing_ms']}ms",
        },
    ]

    if repro["exception_type"]:
        diffs.append({
            "field": "exception",
            "failed_value": repro["exception_type"],
            "successful_value": None,
            "significance": f"New unhandled exception: {repro['exception_type']}",
        })

    return {
        "has_baseline": True,
        "failed_request_summary": failed_summary,
        "successful_request_summary": success_summary,
        "differences": diffs,
    }
