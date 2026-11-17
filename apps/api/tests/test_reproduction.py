from datetime import datetime, timezone
from app.models.incident import Incident
from app.models.telemetry import TelemetryEvent


def test_failure_reproduction_and_safe_curl(client, db, test_project, auth_headers):
    # Create an incident
    inc = Incident(
        project_id=test_project.id,
        title="Payment gateway timeout",
        severity="critical",
        status="open",
        started_at=datetime.now(timezone.utc),
        detected_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    # Insert a failed telemetry event with sensitive data
    failed_ev = TelemetryEvent(
        project_id=test_project.id,
        event_type="error",
        timestamp=datetime.now(timezone.utc),
        http_method="POST",
        route_template="/api/v1/checkout/charge",
        status_code=500,
        duration_ms=5200.0,
        exception_type="GatewayTimeout",
        sanitized_message="Downstream merchant processor timed out",
    )
    db.add(failed_ev)
    db.commit()

    # Get reproduction package
    repro_resp = client.get(f"/api/v1/incidents/{inc.id}/reproduction", headers=auth_headers)
    assert repro_resp.status_code == 200
    data = repro_resp.json()
    assert data["http_method"] == "POST"
    assert data["normalized_route"] == "/api/v1/checkout/charge"
    assert "curl_command" in data
    # Verify curl has NO real credentials but has safe placeholders
    assert "Bearer <REDACTED>" in data["curl_command"]

    # Get safe cURL endpoint
    curl_resp = client.get(f"/api/v1/incidents/{inc.id}/reproduction/curl", headers=auth_headers)
    assert curl_resp.status_code == 200
    assert curl_resp.json()["is_safe"] is True

    # Get request diff
    diff_resp = client.get(f"/api/v1/incidents/{inc.id}/reproduction/diff", headers=auth_headers)
    assert diff_resp.status_code == 200
    diff_data = diff_resp.json()
    assert "failed_request_summary" in diff_data
