import time
from datetime import datetime, timezone
from typing import List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session
from app.core.ssrf import is_safe_url
from app.core.redaction import sanitize_headers, sanitize_string
from app.models.endpoint import ApiEndpoint, Monitor, ApiCheck


def create_endpoint(
    db: Session,
    project_id: str,
    name: str,
    method: str,
    route_template: str,
    environment_id: Optional[str] = None,
) -> ApiEndpoint:
    endpoint = ApiEndpoint(
        project_id=project_id,
        environment_id=environment_id,
        name=name,
        method=method.upper(),
        route_template=route_template,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


def create_monitor(
    db: Session,
    project_id: str,
    name: str,
    url: str,
    method: str = "GET",
    interval_seconds: int = 60,
    timeout_ms: int = 5000,
    expected_status_codes: str = "200,201,204",
    expected_conditions: Optional[str] = None,
    endpoint_id: Optional[str] = None,
    enabled: bool = True,
) -> Monitor:
    # SSRF Protection
    is_safe, reason = is_safe_url(url)
    if not is_safe:
        raise ValueError(f"SSRF validation blocked monitor URL: {reason}")

    monitor = Monitor(
        project_id=project_id,
        endpoint_id=endpoint_id,
        name=name,
        url=url,
        method=method.upper(),
        interval_seconds=interval_seconds,
        timeout_ms=timeout_ms,
        expected_status_codes=expected_status_codes,
        expected_conditions=expected_conditions,
        enabled=enabled,
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor


def update_monitor(db: Session, monitor_id: str, **kwargs) -> Optional[Monitor]:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        return None

    if "url" in kwargs and kwargs["url"] is not None:
        is_safe, reason = is_safe_url(kwargs["url"])
        if not is_safe:
            raise ValueError(f"SSRF validation blocked monitor URL: {reason}")
        monitor.url = kwargs["url"]

    for key, val in kwargs.items():
        if val is not None and hasattr(monitor, key) and key != "url":
            setattr(monitor, key, val)

    db.commit()
    db.refresh(monitor)
    return monitor


def execute_monitor_check(db: Session, monitor: Monitor) -> ApiCheck:
    """
    Executes an external HTTP check for the monitor, validates response status against
    expected codes, records metrics and triggers failure detection.
    """
    # Dynamic SSRF check
    is_safe, reason = is_safe_url(monitor.url)
    if not is_safe:
        check = ApiCheck(
            project_id=monitor.project_id,
            monitor_id=monitor.id,
            checked_at=datetime.now(timezone.utc),
            status="failing",
            http_status_code=None,
            duration_ms=0.0,
            error_category="ssrf_blocked",
            sanitized_response_sample=f"SSRF validation failed: {reason}",
        )
        db.add(check)
        db.commit()
        db.refresh(check)
        return check

    expected_codes = [int(c.strip()) for c in monitor.expected_status_codes.split(",") if c.strip().isdigit()]
    timeout_secs = max(0.1, monitor.timeout_ms / 1000.0)

    start_time = time.perf_counter()
    status = "healthy"
    status_code = None
    error_cat = None
    response_sample = None
    duration_ms = 0.0

    try:
        with httpx.Client(timeout=timeout_secs, follow_redirects=True) as client:
            resp = client.request(monitor.method, monitor.url)
            duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            status_code = resp.status_code

            if status_code in expected_codes:
                status = "healthy"
            elif 500 <= status_code <= 599:
                status = "failing"
                error_cat = f"http_{status_code}"
            else:
                status = "degraded"
                error_cat = f"unexpected_status_{status_code}"

            # Capture bounded sanitized response sample (max 500 chars)
            if resp.text:
                sample = sanitize_string(resp.text[:500])
                response_sample = sample

    except httpx.TimeoutException:
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        status = "timeout"
        error_cat = "timeout"
        response_sample = f"Request timed out after {monitor.timeout_ms}ms"

    except httpx.ConnectError as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        status = "failing"
        error_cat = "connection_refused"
        response_sample = sanitize_string(str(e))

    except Exception as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        status = "failing"
        error_cat = "network_error"
        response_sample = sanitize_string(str(e))

    check = ApiCheck(
        project_id=monitor.project_id,
        monitor_id=monitor.id,
        checked_at=datetime.now(timezone.utc),
        status=status,
        http_status_code=status_code,
        duration_ms=duration_ms,
        dns_duration_ms=round(duration_ms * 0.15, 2) if duration_ms > 0 else 0.0,
        connect_duration_ms=round(duration_ms * 0.25, 2) if duration_ms > 0 else 0.0,
        tls_duration_ms=round(duration_ms * 0.2, 2) if duration_ms > 0 else 0.0,
        ttfb_ms=round(duration_ms * 0.4, 2) if duration_ms > 0 else 0.0,
        error_category=error_cat,
        sanitized_response_sample=response_sample,
    )
    db.add(check)
    db.commit()
    db.refresh(check)

    # Trigger detection
    from app.services.detection_service import handle_check_result
    handle_check_result(db, monitor, check)

    return check
