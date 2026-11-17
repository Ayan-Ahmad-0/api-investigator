import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.incident import Incident, IncidentEvent
from app.models.investigation import Investigation, Hypothesis, Evidence
from app.models.telemetry import TelemetryEvent
from app.models.endpoint import ApiEndpoint, Monitor, ApiCheck
from app.models.deployment import Deployment
from app.services.failure_dna_service import find_similar_incidents


# --------------------------------------------------------------------------
# Scoped Read-Only Tools (Section 11.3)
# --------------------------------------------------------------------------

def get_incident_summary(db: Session, incident_id: str) -> Dict[str, Any]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {}
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "status": incident.status,
        "started_at": str(incident.started_at),
        "primary_fingerprint": incident.primary_fingerprint,
        "endpoint_id": incident.endpoint_id,
    }


def get_incident_timeline(
    db: Session,
    incident_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(IncidentEvent).filter(IncidentEvent.incident_id == incident_id)
    if start_time:
        query = query.filter(IncidentEvent.timestamp >= start_time)
    if end_time:
        query = query.filter(IncidentEvent.timestamp <= end_time)
    events = query.order_by(IncidentEvent.timestamp.asc()).all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "timestamp": str(e.timestamp),
            "summary": e.summary,
            "source_record_id": e.source_record_id,
        }
        for e in events
    ]


def get_endpoint_metrics(
    db: Session,
    project_id: str,
    endpoint_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    query = db.query(ApiCheck).filter(ApiCheck.project_id == project_id)
    if start_time:
        query = query.filter(ApiCheck.checked_at >= start_time)
    if end_time:
        query = query.filter(ApiCheck.checked_at <= end_time)
    checks = query.limit(100).all()

    total = len(checks)
    if total == 0:
        return {"total_checks": 0, "failing_checks": 0, "error_rate": 0.0, "avg_duration_ms": 0.0}

    failing = sum(1 for c in checks if c.status in ("failing", "timeout"))
    durations = [c.duration_ms for c in checks if c.duration_ms is not None]
    avg_dur = round(sum(durations) / len(durations), 2) if durations else 0.0

    return {
        "total_checks": total,
        "failing_checks": failing,
        "error_rate": round(failing / total, 4),
        "avg_duration_ms": avg_dur,
    }


def get_related_errors(
    db: Session,
    project_id: str,
    fingerprint: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    query = db.query(TelemetryEvent).filter(
        TelemetryEvent.project_id == project_id,
        TelemetryEvent.status_code >= 400,
    )
    if fingerprint:
        query = query.filter(TelemetryEvent.fingerprint == fingerprint)
    events = query.order_by(TelemetryEvent.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "timestamp": str(e.timestamp),
            "method": e.http_method,
            "route": e.route_template,
            "status_code": e.status_code,
            "exception_type": e.exception_type,
            "message": e.sanitized_message,
            "duration_ms": e.duration_ms,
        }
        for e in events
    ]


def get_deployment_history(
    db: Session,
    project_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(Deployment).filter(Deployment.project_id == project_id)
    if start_time:
        query = query.filter(Deployment.deployed_at >= start_time)
    if end_time:
        query = query.filter(Deployment.deployed_at <= end_time)
    deployments = query.order_by(Deployment.deployed_at.desc()).limit(10).all()
    return [
        {
            "id": d.id,
            "commit_sha": d.commit_sha[:8],
            "repository": d.repository,
            "branch": d.branch,
            "deployed_at": str(d.deployed_at),
        }
        for d in deployments
    ]


# --------------------------------------------------------------------------
# Investigation Engine Execution
# --------------------------------------------------------------------------

def run_investigation(
    db: Session,
    incident_id: str,
    created_by: Optional[str] = None,
) -> Investigation:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise ValueError("Incident not found")

    now = datetime.now(timezone.utc)
    investigation = Investigation(
        incident_id=incident_id,
        project_id=incident.project_id,
        status="running",
        provider="hybrid-calibrated-engine",
        model="calibrated-analyzer",
        started_at=now,
        created_by=created_by,
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    # Scoped evidence gathering window: 30 minutes before incident to now
    window_start = incident.started_at - timedelta(minutes=30)
    window_end = now + timedelta(minutes=5)

    summary_data = get_incident_summary(db, incident_id)
    timeline_events = get_incident_timeline(db, incident_id, window_start, window_end)
    metrics_data = get_endpoint_metrics(db, incident.project_id, incident.endpoint_id, window_start, window_end)
    related_errors = get_related_errors(db, incident.project_id, incident.primary_fingerprint, limit=20)
    deployments = get_deployment_history(db, incident.project_id, window_start - timedelta(hours=2), window_end)
    similar_incidents = find_similar_incidents(db, incident.project_id, incident_id, limit=3)

    evidence_records: List[Evidence] = []
    hypotheses: List[Dict[str, Any]] = []

    # Check whether enough telemetry exists (Principle: Evidence before explanation)
    has_telemetry = len(related_errors) > 0 or metrics_data["total_checks"] > 0 or len(timeline_events) > 0

    if not has_telemetry:
        # Mark inconclusive
        investigation.status = "inconclusive"
        investigation.completed_at = datetime.now(timezone.utc)
        investigation.summary = "Investigation inconclusive due to insufficient telemetry data within the incident time window."
        report = {
            "incident_summary": f"Incident '{incident.title}' was triggered but no application error traces or monitor checks were recorded.",
            "impact": {
                "affected_endpoints": [incident.endpoint.route_template] if incident.endpoint else [],
                "observed_error_rate": 0.0,
                "latency_change": None,
                "time_window": {"start": window_start.isoformat(), "end": window_end.isoformat()},
            },
            "root_cause_hypotheses": [],
            "timeline_event_ids": [e["id"] for e in timeline_events],
            "similar_incident_ids": [],
            "recommended_next_steps": [
                "Verify that the API Investigator Python SDK or OTel exporter is configured with a valid ingestion key.",
                "Ensure monitored endpoints are enabled and reachable from the monitoring network.",
                "Inspect external network firewall or ingress controller rules.",
            ],
            "limitations": [
                "No telemetry events or check logs matched the incident time window.",
                "Root cause cannot be established without diagnostic traces.",
            ],
            "status": "inconclusive",
        }
        investigation.report_json = json.dumps(report)
        db.commit()
        db.refresh(investigation)
        return investigation

    # Build Evidence Records
    # 1. Metric Evidence
    if metrics_data["total_checks"] > 0:
        ev_metric = Evidence(
            investigation_id=investigation.id,
            project_id=incident.project_id,
            evidence_type="metric",
            timestamp=now,
            summary=f"External check error rate observed at {metrics_data['error_rate']*100:.1f}% ({metrics_data['failing_checks']}/{metrics_data['total_checks']} checks failing).",
            sanitized_excerpt=json.dumps(metrics_data),
            relationship="supporting",
        )
        db.add(ev_metric)
        evidence_records.append(ev_metric)

    # 2. Log / Telemetry Error Evidence
    if related_errors:
        top_err = related_errors[0]
        ev_err = Evidence(
            investigation_id=investigation.id,
            project_id=incident.project_id,
            evidence_type="log",
            source_record_id=top_err["id"],
            timestamp=datetime.fromisoformat(top_err["timestamp"]) if "T" in top_err["timestamp"] else None,
            summary=f"Exception '{top_err['exception_type'] or 'HTTP ' + str(top_err['status_code'])}' detected on route {top_err['route']}: {top_err['message'] or 'Internal Server Error'}",
            sanitized_excerpt=f"Status: {top_err['status_code']}, Duration: {top_err['duration_ms']}ms, Message: {top_err['message']}",
            relationship="supporting",
        )
        db.add(ev_err)
        evidence_records.append(ev_err)

    # 3. Deployment Evidence (if any occurred within 2 hours)
    recent_deploy = deployments[0] if deployments else None
    if recent_deploy:
        ev_deploy = Evidence(
            investigation_id=investigation.id,
            project_id=incident.project_id,
            evidence_type="deployment",
            source_record_id=recent_deploy["id"],
            summary=f"Deployment of commit {recent_deploy['commit_sha']} to branch {recent_deploy['branch']} occurred shortly before the incident.",
            sanitized_excerpt=json.dumps(recent_deploy),
            relationship="supporting",
        )
        db.add(ev_deploy)
        evidence_records.append(ev_deploy)

    db.flush()  # assign IDs to evidence_records

    # Generate Calibrated Hypotheses based on gathered evidence
    supporting_ids = [e.id for e in evidence_records]

    # Check top error patterns
    primary_exc = related_errors[0]["exception_type"] if related_errors else None
    primary_status = related_errors[0]["status_code"] if related_errors else None

    if primary_exc in ["DatabaseError", "OperationalError", "TimeoutError"] or (primary_status == 504):
        h1 = {
            "title": "Downstream Database or Upstream Service Latency/Exhaustion",
            "confidence": "high",
            "explanation": f"Observed exception '{primary_exc or f'HTTP {primary_status}'}' with elevated latency suggests downstream dependency timeout or connection pool exhaustion.",
            "supporting_evidence_ids": supporting_ids,
            "contradicting_evidence_ids": [],
            "missing_evidence": ["Database connection pool saturation telemetry", "Slow query log samples"],
            "verification_steps": [
                "Inspect database connection pool metrics for active and idle connection exhaustion.",
                "Review slow query logs for queries executing longer than the client socket timeout.",
                "Check whether read-replica lag or lock contention occurred during the incident window.",
            ],
        }
        hypotheses.append(h1)
    elif recent_deploy:
        h1 = {
            "title": f"Regression Introduced in Recent Deployment ({recent_deploy['commit_sha']})",
            "confidence": "medium",
            "explanation": f"The onset of failures temporally correlates with the deployment of commit {recent_deploy['commit_sha']}. Contract or configuration change may have caused unhandled exceptions.",
            "supporting_evidence_ids": supporting_ids,
            "contradicting_evidence_ids": [],
            "missing_evidence": ["Commit diff inspection", "Environment configuration drift check"],
            "verification_steps": [
                f"Review commit {recent_deploy['commit_sha']} git diff for endpoint handler modifications.",
                "Verify whether environment variables or database schema migrations were deployed with the release.",
                "Test reproduction package cURL against a rollback staging container.",
            ],
        }
        hypotheses.append(h1)
    else:
        h1 = {
            "title": "Unhandled Application Exception in Request Handler",
            "confidence": "medium" if related_errors else "low",
            "explanation": f"API handler failed with status code {primary_status or 500} when processing request payload.",
            "supporting_evidence_ids": supporting_ids,
            "contradicting_evidence_ids": [],
            "missing_evidence": ["Detailed application stack trace", "Third party dependency response telemetry"],
            "verification_steps": [
                "Execute the sanitized failure reproduction cURL against the local development environment.",
                "Check application error logs for unhandled validation or type exceptions.",
            ],
        }
        hypotheses.append(h1)

    # Persist Hypotheses
    for idx, h in enumerate(hypotheses):
        db_hyp = Hypothesis(
            investigation_id=investigation.id,
            title=h["title"],
            explanation=h["explanation"],
            confidence=h["confidence"],
            rank=idx + 1,
        )
        db.add(db_hyp)

    # Save Investigation Report JSON
    affected_routes = list({e["route"] for e in related_errors if "route" in e})
    if not affected_routes and incident.endpoint:
        affected_routes.append(incident.endpoint.route_template)

    report_payload = {
        "incident_summary": f"Automated evidence retrieval identified {len(related_errors)} error traces and {metrics_data['failing_checks']} failing external checks.",
        "impact": {
            "affected_endpoints": affected_routes,
            "observed_error_rate": metrics_data["error_rate"],
            "latency_change": f"Observed avg latency: {metrics_data['avg_duration_ms']}ms",
            "time_window": {"start": window_start.isoformat(), "end": window_end.isoformat()},
        },
        "root_cause_hypotheses": hypotheses,
        "timeline_event_ids": [e["id"] for e in timeline_events],
        "similar_incident_ids": [s["incident_id"] for s in similar_incidents],
        "recommended_next_steps": hypotheses[0]["verification_steps"] if hypotheses else [],
        "limitations": [
            "Network-level packet traces were not available for deep TLS analysis.",
            "Database engine internal query telemetry requires database agent instrumentation.",
        ],
        "status": "investigated",
    }

    investigation.status = "completed"
    investigation.completed_at = datetime.now(timezone.utc)
    investigation.summary = hypotheses[0]["title"] if hypotheses else "Investigation completed."
    investigation.report_json = json.dumps(report_payload)

    # Update incident status to investigating/identified
    if incident.status == "open":
        incident.status = "investigating"
    incident.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(investigation)
    return investigation
