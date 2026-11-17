import json
from datetime import datetime, timezone
from app.models.incident import Incident
from app.models.telemetry import TelemetryEvent
from app.models.investigation import Investigation, Evidence, Hypothesis


def test_investigation_with_evidence_and_calibrated_hypotheses(client, db, test_project, auth_headers):
    now = datetime.now(timezone.utc)

    # Create incident
    incident = Incident(
        project_id=test_project.id,
        title="Spike in HTTP 500 on /api/v1/payments",
        severity="critical",
        status="open",
        started_at=now,
        detected_at=now,
        primary_fingerprint="dna_test_db_timeout",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Add telemetry error event
    err = TelemetryEvent(
        project_id=test_project.id,
        event_type="error",
        timestamp=now,
        http_method="POST",
        route_template="/api/v1/payments",
        status_code=500,
        duration_ms=4500.0,
        exception_type="DatabaseError",
        sanitized_message="could not obtain connection from pool",
        fingerprint="dna_test_db_timeout",
    )
    db.add(err)
    db.commit()

    # Trigger investigation
    inv_resp = client.post(f"/api/v1/incidents/{incident.id}/investigations", headers=auth_headers)
    assert inv_resp.status_code == 201
    data = inv_resp.json()
    assert data["status"] in ("completed", "running")
    inv_id = data["id"]

    # Verify report JSON schema
    inv = db.query(Investigation).filter(Investigation.id == inv_id).first()
    assert inv.report_json is not None
    report = json.loads(inv.report_json)

    assert "incident_summary" in report
    assert "impact" in report
    assert "root_cause_hypotheses" in report
    assert len(report["root_cause_hypotheses"]) >= 1

    top_hyp = report["root_cause_hypotheses"][0]
    assert top_hyp["confidence"] in ("low", "medium", "high")
    assert len(top_hyp["verification_steps"]) >= 1
    assert len(top_hyp["supporting_evidence_ids"]) >= 1

    # Check evidence table records
    evidence_count = db.query(Evidence).filter(Evidence.investigation_id == inv_id).count()
    assert evidence_count >= 1


def test_investigation_inconclusive_when_no_telemetry(client, db, test_project, auth_headers):
    now = datetime.now(timezone.utc)
    # Incident without any telemetry
    incident = Incident(
        project_id=test_project.id,
        title="Phantom alert without traces",
        severity="medium",
        status="open",
        started_at=now,
        detected_at=now,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    inv_resp = client.post(f"/api/v1/incidents/{incident.id}/investigations", headers=auth_headers)
    assert inv_resp.status_code == 201
    inv_data = inv_resp.json()
    assert inv_data["status"] == "inconclusive"
    assert "insufficient telemetry" in inv_data["summary"].lower()
