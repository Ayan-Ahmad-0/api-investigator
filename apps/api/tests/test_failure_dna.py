from datetime import datetime, timezone
from app.services.failure_dna_service import generate_failure_fingerprint, find_similar_incidents
from app.models.incident import Incident, IncidentResolution


def test_deterministic_dna_fingerprinting():
    fp1, feat1 = generate_failure_fingerprint("POST", "/api/v1/payments", 500, "ConnectionError", "Failed to connect to 10.0.0.1:5432")
    fp2, feat2 = generate_failure_fingerprint("POST", "/api/v1/payments", 500, "ConnectionError", "Failed to connect to 10.0.0.2:5432")

    # Due to normalization of IP addresses / numbers, normalized message and fingerprint should match!
    assert fp1 == fp2
    assert fp1.startswith("dna_")


def test_find_similar_historical_incidents(client, db, test_project, auth_headers):
    now = datetime.now(timezone.utc)
    # Historical resolved incident with fingerprint
    past_inc = Incident(
        project_id=test_project.id,
        title="PostgreSQL connection exhaustion",
        severity="critical",
        status="resolved",
        started_at=now,
        detected_at=now,
        resolved_at=now,
        primary_fingerprint="dna_sample_postgres_timeout",
    )
    db.add(past_inc)
    db.flush()

    res = IncidentResolution(
        incident_id=past_inc.id,
        project_id=test_project.id,
        resolution_summary="Scaled pgBouncer pool size to 50 connections",
        root_cause_confirmed="Connection spike during flash sale",
        resolved_by="lead_sre@test.com",
    )
    db.add(res)
    db.commit()

    # Current new incident with same fingerprint
    current_inc = Incident(
        project_id=test_project.id,
        title="New database timeout on checkout",
        severity="critical",
        status="open",
        started_at=now,
        detected_at=now,
        primary_fingerprint="dna_sample_postgres_timeout",
    )
    db.add(current_inc)
    db.commit()

    similar_resp = client.get(f"/api/v1/incidents/{current_inc.id}/similar", headers=auth_headers)
    assert similar_resp.status_code == 200
    matches = similar_resp.json()
    assert len(matches) >= 1
    match = matches[0]
    assert match["incident_id"] == past_inc.id
    assert match["similarity_score"] >= 0.6
    assert "Identical Failure DNA fingerprint" in match["matching_signals"]
    assert match["previous_resolution"] == "Scaled pgBouncer pool size to 50 connections"
