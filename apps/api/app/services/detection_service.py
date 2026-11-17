from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.endpoint import Monitor, ApiCheck
from app.models.telemetry import TelemetryEvent
from app.models.incident import Incident, IncidentEvent


def handle_check_result(db: Session, monitor: Monitor, check: ApiCheck):
    if check.status not in ("failing", "timeout", "degraded"):
        return

    # Check recent checks for this monitor in the last 15 minutes
    recent_checks = db.query(ApiCheck).filter(
        ApiCheck.monitor_id == monitor.id,
    ).order_by(ApiCheck.checked_at.desc()).limit(3).all()

    failed_count = sum(1 for c in recent_checks if c.status in ("failing", "timeout"))
    if failed_count < 2:
        return

    # Look for existing active incident for this endpoint or project
    active_incident = db.query(Incident).filter(
        Incident.project_id == monitor.project_id,
        Incident.endpoint_id == monitor.endpoint_id,
        Incident.status.in_(["open", "investigating", "identified", "monitoring"]),
    ).first()

    now = datetime.now(timezone.utc)
    severity = "critical" if check.status == "timeout" or check.http_status_code == 500 else "high"

    if active_incident:
        # Append timeline event
        event = IncidentEvent(
            incident_id=active_incident.id,
            project_id=monitor.project_id,
            event_type="check_failure",
            source_record_id=check.id,
            timestamp=now,
            summary=f"Monitor check failed: {check.error_category or 'status ' + str(check.http_status_code)} ({check.duration_ms}ms)",
        )
        db.add(event)
        active_incident.updated_at = now
        db.commit()
    else:
        # Create new incident
        title = f"Availability failure on {monitor.name}"
        desc = f"External HTTP check returned {check.error_category or 'HTTP ' + str(check.http_status_code)} on {monitor.url}"
        incident = Incident(
            project_id=monitor.project_id,
            endpoint_id=monitor.endpoint_id,
            title=title,
            description=desc,
            severity=severity,
            status="open",
            started_at=check.checked_at,
            detected_at=now,
        )
        db.add(incident)
        db.flush()

        event = IncidentEvent(
            incident_id=incident.id,
            project_id=monitor.project_id,
            event_type="check_failure",
            source_record_id=check.id,
            timestamp=now,
            summary=f"Incident opened: {title}. Consecutive check failures detected.",
        )
        db.add(event)
        db.commit()


def handle_telemetry_event(db: Session, event: TelemetryEvent):
    # Only evaluate for 5xx or unhandled exceptions
    if event.status_code < 500 and not event.exception_type:
        return

    now = datetime.now(timezone.utc)

    # Search for an active incident matching fingerprint or route template
    active_incident = db.query(Incident).filter(
        Incident.project_id == event.project_id,
        Incident.status.in_(["open", "investigating", "identified", "monitoring"]),
    )
    if event.fingerprint:
        active_incident = active_incident.filter(
            (Incident.primary_fingerprint == event.fingerprint) |
            (Incident.title.contains(event.route_template))
        ).first()
    else:
        active_incident = active_incident.filter(
            Incident.title.contains(event.route_template)
        ).first()

    if active_incident:
        # Correlate event with existing incident
        inc_event = IncidentEvent(
            incident_id=active_incident.id,
            project_id=event.project_id,
            event_type="error_spike",
            source_record_id=event.id,
            timestamp=now,
            summary=f"Correlated error: {event.exception_type or f'HTTP {event.status_code}'} on {event.http_method} {event.route_template}",
        )
        db.add(inc_event)
        active_incident.updated_at = now
        db.commit()
    else:
        # Check error frequency in last 10 minutes
        window_start = now - timedelta(minutes=10)
        recent_errors_count = db.query(TelemetryEvent).filter(
            TelemetryEvent.project_id == event.project_id,
            TelemetryEvent.route_template == event.route_template,
            TelemetryEvent.status_code >= 500,
            TelemetryEvent.timestamp >= window_start,
        ).count()

        # If count >= 2 or high severity exception
        is_severe = event.exception_type in ["DatabaseError", "OperationalError", "TimeoutError", "ConnectionRefusedError"]
        if recent_errors_count >= 2 or is_severe:
            severity = "critical" if is_severe or recent_errors_count >= 5 else "high"
            title = f"Error spike on {event.http_method} {event.route_template}"
            desc = f"Observed {recent_errors_count} error occurrences. Latest: {event.exception_type or 'HTTP ' + str(event.status_code)} - {event.sanitized_message or 'Internal Server Error'}"

            incident = Incident(
                project_id=event.project_id,
                title=title,
                description=desc,
                severity=severity,
                status="open",
                started_at=event.timestamp,
                detected_at=now,
                primary_fingerprint=event.fingerprint,
            )
            db.add(incident)
            db.flush()

            inc_event = IncidentEvent(
                incident_id=incident.id,
                project_id=event.project_id,
                event_type="error_spike",
                source_record_id=event.id,
                timestamp=now,
                summary=f"Incident opened: {title}",
            )
            db.add(inc_event)
            db.commit()
