from datetime import datetime, timezone
from app.models.endpoint import Monitor, ApiCheck
from app.services.monitoring_service import execute_monitor_check


def test_consecutive_check_failures_create_incident(client, db, test_project, auth_headers):
    # Register an endpoint & monitor
    ep_resp = client.post(
        f"/api/v1/projects/{test_project.id}/endpoints",
        headers=auth_headers,
        json={"name": "Billing API", "method": "POST", "route_template": "/api/v1/billing"},
    )
    assert ep_resp.status_code == 201
    ep_id = ep_resp.json()["id"]

    # Create monitor with valid url pattern
    monitor = Monitor(
        project_id=test_project.id,
        endpoint_id=ep_id,
        name="Billing Health Monitor",
        url="https://api.example.com/health",
        method="GET",
        interval_seconds=60,
        timeout_ms=5000,
        expected_status_codes="200",
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)

    # Simulate 2 consecutive failing checks
    from app.services.detection_service import handle_check_result

    check1 = ApiCheck(
        project_id=test_project.id,
        monitor_id=monitor.id,
        checked_at=datetime.now(timezone.utc),
        status="failing",
        http_status_code=503,
        duration_ms=450.0,
        error_category="http_503",
    )
    db.add(check1)
    db.commit()
    handle_check_result(db, monitor, check1)

    # 1 failure shouldn't open an incident yet
    incidents_resp = client.get(f"/api/v1/projects/{test_project.id}/incidents", headers=auth_headers)
    assert len(incidents_resp.json()) == 0

    # 2nd failure triggers incident
    check2 = ApiCheck(
        project_id=test_project.id,
        monitor_id=monitor.id,
        checked_at=datetime.now(timezone.utc),
        status="failing",
        http_status_code=503,
        duration_ms=480.0,
        error_category="http_503",
    )
    db.add(check2)
    db.commit()
    handle_check_result(db, monitor, check2)

    incidents_resp2 = client.get(f"/api/v1/projects/{test_project.id}/incidents", headers=auth_headers)
    incidents = incidents_resp2.json()
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc["status"] == "open"
    assert "Billing Health Monitor" in inc["title"]
    inc_id = inc["id"]

    # Add a user note
    note_resp = client.post(
        f"/api/v1/incidents/{inc_id}/notes",
        headers=auth_headers,
        json={"note": "Investigating potential upstream payment gateway disruption."},
    )
    assert note_resp.status_code == 200

    # Resolve the incident
    res_resp = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        headers=auth_headers,
        json={
            "resolution_summary": "Upstream gateway returned to service. Added circuit breaker with automatic fallback.",
            "root_cause_confirmed": "Upstream provider maintenance window timeout",
        },
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"
    assert res_resp.json()["resolved_at"] is not None
