import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.core.redaction import sanitize_headers, sanitize_body, sanitize_stack_trace, sanitize_string
from app.models.telemetry import TelemetryEvent
from app.schemas.telemetry import TelemetryIngestEvent
from app.services.failure_dna_service import generate_failure_fingerprint, record_failure_fingerprint
from app.services.detection_service import handle_telemetry_event


def ingest_single_event(
    db: Session,
    project_id: str,
    event: TelemetryIngestEvent,
) -> TelemetryEvent:
    now = event.timestamp or datetime.now(timezone.utc)

    # Sanitize message and stack trace
    sanitized_msg = sanitize_string(event.exception_message) if event.exception_message else None
    sanitized_stack = sanitize_stack_trace(event.stack_trace) if event.stack_trace else None

    # Merge and sanitize attributes
    attributes: Dict[str, Any] = {}
    if event.attributes:
        attributes["custom"] = sanitize_body(event.attributes)
    if event.request_headers:
        attributes["headers"] = sanitize_headers(event.request_headers)
    if event.request_body is not None:
        attributes["request_body"] = sanitize_body(event.request_body)
    if event.response_body is not None:
        attributes["response_body"] = sanitize_body(event.response_body)

    # Generate DNA fingerprint
    fingerprint = None
    if event.status_code >= 400 or event.exception_type:
        fp, features = generate_failure_fingerprint(
            http_method=event.http_method,
            route_template=event.route_template,
            status_code=event.status_code,
            exception_type=event.exception_type,
            sanitized_message=sanitized_msg,
        )
        fingerprint = fp
        record_failure_fingerprint(db, project_id, fp, features)

    db_event = TelemetryEvent(
        project_id=project_id,
        event_type=event.event_type,
        timestamp=now,
        service_name=event.service_name,
        service_version=event.service_version,
        http_method=event.http_method.upper(),
        route_template=event.route_template,
        status_code=event.status_code,
        duration_ms=event.duration_ms,
        exception_type=event.exception_type,
        sanitized_message=sanitized_msg,
        stack_trace=sanitized_stack,
        request_id=event.request_id,
        trace_id=event.trace_id,
        span_id=event.span_id,
        sanitized_attributes=json.dumps(attributes) if attributes else None,
        fingerprint=fingerprint,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # Trigger detection logic for 5xx/exceptions
    handle_telemetry_event(db, db_event)

    return db_event


def ingest_batch_events(
    db: Session,
    project_id: str,
    events: List[TelemetryIngestEvent],
) -> int:
    accepted = 0
    for evt in events:
        try:
            ingest_single_event(db, project_id, evt)
            accepted += 1
        except Exception:
            pass
    return accepted
