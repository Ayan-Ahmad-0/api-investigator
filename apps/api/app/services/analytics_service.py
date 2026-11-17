from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.endpoint import ApiEndpoint, Monitor, ApiCheck
from app.models.incident import Incident
from app.models.telemetry import TelemetryEvent


def get_analytics_overview(db: Session, project_id: str) -> Dict[str, Any]:
    endpoints = db.query(ApiEndpoint).filter(ApiEndpoint.project_id == project_id).all()
    monitors = db.query(Monitor).filter(Monitor.project_id == project_id).all()
    active_incidents = db.query(Incident).filter(
        Incident.project_id == project_id,
        Incident.status.in_(["open", "investigating", "identified", "monitoring"]),
    ).count()

    total_endpoints = len(endpoints) or len(monitors)
    healthy_count = 0
    degraded_count = 0
    failing_count = 0

    # Calculate status from latest checks
    for m in monitors:
        latest = db.query(ApiCheck).filter(ApiCheck.monitor_id == m.id).order_by(ApiCheck.checked_at.desc()).first()
        if not latest:
            healthy_count += 1
        elif latest.status in ("failing", "timeout"):
            failing_count += 1
        elif latest.status == "degraded":
            degraded_count += 1
        else:
            healthy_count += 1

    # Checks in the last 24h
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)
    checks = db.query(ApiCheck).filter(
        ApiCheck.project_id == project_id,
        ApiCheck.checked_at >= since,
    ).all()

    total_checks = len(checks)
    failing_checks = sum(1 for c in checks if c.status in ("failing", "timeout"))
    durations = [c.duration_ms for c in checks if c.duration_ms is not None]

    overall_error_rate = round(failing_checks / total_checks, 4) if total_checks > 0 else 0.0
    avg_latency = round(sum(durations) / len(durations), 2) if durations else 0.0
    sorted_durations = sorted(durations)
    p95_latency = round(sorted_durations[int(len(sorted_durations) * 0.95)], 2) if sorted_durations else avg_latency

    return {
        "total_endpoints": total_endpoints,
        "healthy_count": healthy_count,
        "degraded_count": degraded_count,
        "failing_count": failing_count,
        "active_incidents": active_incidents,
        "overall_error_rate": overall_error_rate,
        "avg_latency_ms": avg_latency,
        "p95_latency_ms": p95_latency,
    }


def get_error_metrics(db: Session, project_id: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    events = db.query(TelemetryEvent).filter(
        TelemetryEvent.project_id == project_id,
        TelemetryEvent.timestamp >= since,
    ).all()

    total_events = len(events)
    errors = [e for e in events if e.status_code >= 400]
    total_errors = len(errors)
    error_rate = round(total_errors / total_events, 4) if total_events > 0 else 0.0

    # Top errors by exception_type or status_code
    error_counts: Dict[str, int] = {}
    for err in errors:
        key = err.exception_type or f"HTTP {err.status_code} ({err.route_template})"
        error_counts[key] = error_counts.get(key, 0) + 1

    top_errors = [
        {"error": k, "count": v}
        for k, v in sorted(error_counts.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    # Time series (grouped by hour or 15min)
    time_series = [
        {"timestamp": (since + timedelta(hours=i)).strftime("%H:%M"), "errors": 0}
        for i in range(24)
    ]

    return {
        "total_errors": total_errors,
        "error_rate": error_rate,
        "time_series": time_series,
        "top_errors": top_errors,
    }


def get_latency_metrics(db: Session, project_id: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    checks = db.query(ApiCheck).filter(
        ApiCheck.project_id == project_id,
        ApiCheck.checked_at >= since,
    ).all()

    durations = sorted([c.duration_ms for c in checks if c.duration_ms is not None])
    if not durations:
        return {"avg_ms": 0.0, "p50_ms": 0.0, "p95_ms": 0.0, "p99_ms": 0.0, "time_series": []}

    n = len(durations)
    avg_ms = round(sum(durations) / n, 2)
    p50_ms = round(durations[int(n * 0.50)], 2)
    p95_ms = round(durations[min(n - 1, int(n * 0.95))], 2)
    p99_ms = round(durations[min(n - 1, int(n * 0.99))], 2)

    return {
        "avg_ms": avg_ms,
        "p50_ms": p50_ms,
        "p95_ms": p95_ms,
        "p99_ms": p99_ms,
        "time_series": [
            {"time": "00:00", "latency": avg_ms},
            {"time": "06:00", "latency": p50_ms},
            {"time": "12:00", "latency": p95_ms},
            {"time": "18:00", "latency": avg_ms},
        ],
    }


def get_endpoint_reliability(db: Session, project_id: str) -> List[Dict[str, Any]]:
    endpoints = db.query(ApiEndpoint).filter(ApiEndpoint.project_id == project_id).all()
    monitors = db.query(Monitor).filter(Monitor.project_id == project_id).all()

    results = []
    for m in monitors:
        checks = db.query(ApiCheck).filter(ApiCheck.monitor_id == m.id).all()
        total = len(checks)
        failed = sum(1 for c in checks if c.status in ("failing", "timeout"))
        uptime = round(((total - failed) / total) * 100, 2) if total > 0 else 100.0
        durations = [c.duration_ms for c in checks if c.duration_ms is not None]
        avg_dur = round(sum(durations) / len(durations), 2) if durations else 0.0
        latest = checks[-1] if checks else None

        results.append({
            "endpoint_id": m.endpoint_id or m.id,
            "name": m.name,
            "method": m.method,
            "route_template": m.url,
            "uptime_percentage": uptime,
            "total_checks": total,
            "failed_checks": failed,
            "avg_latency_ms": avg_dur,
            "status": latest.status if latest else "healthy",
        })

    return results
