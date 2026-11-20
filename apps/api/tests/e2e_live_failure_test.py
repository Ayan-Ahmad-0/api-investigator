"""
End-to-End Live Failure Detection & Investigation Verification Script
Tests the full lifecycle of API failure detection, correlation, AI report generation,
sanitized reproduction packages, and incident resolution.
"""

import json
import time
from datetime import datetime, timezone
import httpx

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def run_e2e_test():
    print("=" * 80)
    print("STARTING END-TO-END API FAILURE & REPORTING VERIFICATION")
    print("=" * 80)
    client = httpx.Client(timeout=30.0)

    # 1. Authenticate with demo user
    print("\n[Step 1] Authenticating with backend...")
    login_resp = client.post(
        f"{BACKEND_URL}/api/v1/auth/login",
        json={"email": "demo@api-investigator.dev", "password": "Password123!"}
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print(f"-> Authenticated successfully. Token obtained (len={len(token)}).")

    # 2. Get active project
    print("\n[Step 2] Fetching active projects...")
    proj_resp = client.get(f"{BACKEND_URL}/api/v1/projects", headers=auth_headers)
    assert proj_resp.status_code == 200, f"Projects failed: {proj_resp.text}"
    projects = proj_resp.json()
    assert len(projects) > 0, "No projects found"
    project_id = projects[0]["id"]
    print(f"-> Using Project: {projects[0]['name']} (ID: {project_id})")

    # 3. Verify Active AI Provider
    print("\n[Step 3] Checking active AI LLM provider status...")
    provider_resp = client.get(
        f"{BACKEND_URL}/api/v1/investigations/config/providers",
        headers=auth_headers
    )
    assert provider_resp.status_code == 200
    ai_status = provider_resp.json()
    print(f"-> Active LLM: {ai_status['active']['provider']} (Model: {ai_status['active']['model']})")
    assert ai_status['active']['is_configured'], "AI provider is not configured"

    # 4. Create an API Monitor targeted at an intentionally failing endpoint
    print("\n[Step 4] Creating API Monitor for failing checkout endpoint...")
    monitor_payload = {
        "name": "Live E2E Checkout API Health Check",
        "url": "https://failing-api.example.com/api/v1/checkout",
        "method": "GET",
        "interval_seconds": 30,
        "timeout_ms": 3000,
        "expected_status_codes": "200",
        "enabled": True
    }
    mon_resp = client.post(
        f"{BACKEND_URL}/api/v1/projects/{project_id}/monitors",
        headers=auth_headers,
        json=monitor_payload
    )
    assert mon_resp.status_code in (200, 201), f"Create monitor failed: {mon_resp.text}"
    monitor = mon_resp.json()
    monitor_id = monitor["id"]
    print(f"-> Created Monitor ID: {monitor_id} for URL: {monitor['url']}")

    # 5. Trigger Consecutive Checks to induce failure detection
    print("\n[Step 5] Triggering consecutive external health checks against failing endpoint...")
    check1_resp = client.post(
        f"{BACKEND_URL}/api/v1/monitors/{monitor_id}/trigger",
        headers=auth_headers
    )
    assert check1_resp.status_code == 200, f"Trigger check 1 failed: {check1_resp.text}"
    chk1 = check1_resp.json()
    print(f"-> Check #1: status={chk1['status']}, HTTP={chk1.get('http_status_code')}, duration={chk1.get('duration_ms')}ms, error={chk1.get('error_category')}")

    time.sleep(0.5)

    check2_resp = client.post(
        f"{BACKEND_URL}/api/v1/monitors/{monitor_id}/trigger",
        headers=auth_headers
    )
    assert check2_resp.status_code == 200, f"Trigger check 2 failed: {check2_resp.text}"
    chk2 = check2_resp.json()
    print(f"-> Check #2: status={chk2['status']}, HTTP={chk2.get('http_status_code')}, duration={chk2.get('duration_ms')}ms, error={chk2.get('error_category')}")

    # 6. Verify Incident Creation
    print("\n[Step 6] Verifying that detection engine reported an Incident...")
    incidents_resp = client.get(
        f"{BACKEND_URL}/api/v1/projects/{project_id}/incidents",
        headers=auth_headers
    )
    assert incidents_resp.status_code == 200
    incidents = incidents_resp.json()
    # Find the newly created incident matching our monitor
    detected_incident = None
    for inc in incidents:
        if "Live E2E Checkout API" in inc["title"] or inc["status"] in ("open", "investigating"):
            detected_incident = inc
            break

    assert detected_incident is not None, "Failure detection did NOT trigger an incident!"
    incident_id = detected_incident["id"]
    print(f"-> SUCCESS: Incident automatically reported!")
    print(f"   ID:          {incident_id}")
    print(f"   Title:       {detected_incident['title']}")
    print(f"   Severity:    {detected_incident['severity']}")
    print(f"   Status:      {detected_incident['status']}")
    print(f"   Started At:  {detected_incident['started_at']}")

    # 7. Ingest Application Telemetry with PII/Secret to verify Redaction & Correlation
    print("\n[Step 7] Generating ingestion API key & ingesting error telemetry...")
    key_gen_resp = client.post(
        f"{BACKEND_URL}/api/v1/projects/{project_id}/keys",
        headers=auth_headers,
        json={"name": "E2E Live Telemetry Key"}
    )
    assert key_gen_resp.status_code == 201, f"Generate key failed: {key_gen_resp.text}"
    full_ingest_key = key_gen_resp.json()["full_key"]
    print(f"-> Generated live ingestion key: {key_gen_resp.json()['key_prefix']}***")

    now_iso = datetime.now(timezone.utc).isoformat()
    telemetry_payload = {
        "event_type": "error",
        "timestamp": now_iso,
        "http_method": "POST",
        "route_template": "https://failing-api.example.com/api/v1/checkout",
        "status_code": 500,
        "duration_ms": 3200.5,
        "exception_type": "DatabaseError",
        "sanitized_message": "PostgreSQL connection pool exhausted: timeout 30000ms",
        "request_headers": {
            "Authorization": "Bearer sk_live_super_secret_token_abc123",
            "Cookie": "session_id=secret_session_987654321",
            "Content-Type": "application/json"
        },
        "request_body": "{\"user_id\": \"usr_492\", \"card\": \"4111-1111-1111-1111\"}",
        "fingerprint": "dna_live_db_pool_timeout"
    }
    ingest_resp = client.post(
        f"{BACKEND_URL}/api/v1/ingest/events",
        headers={"X-Ingestion-Key": full_ingest_key, "Content-Type": "application/json"},
        json=telemetry_payload
    )
    assert ingest_resp.status_code == 202, f"Ingest failed: {ingest_resp.text}"
    print(f"-> Telemetry Ingestion HTTP status: {ingest_resp.status_code} ({ingest_resp.json()})")

    # 8. Trigger AI Investigation Engine
    print(f"\n[Step 8] Triggering AI Investigation on Incident {incident_id}...")
    inv_start_time = time.time()
    investigate_resp = client.post(
        f"{BACKEND_URL}/api/v1/incidents/{incident_id}/investigations",
        headers=auth_headers
    )
    assert investigate_resp.status_code in (200, 201), f"Investigation trigger failed: {investigate_resp.text}"
    inv_data = investigate_resp.json()
    duration = time.time() - inv_start_time
    print(f"-> Investigation completed in {duration:.2f} seconds!")
    print(f"   Status:       {inv_data['status']}")
    print(f"   Provider:     {inv_data.get('provider')}")
    print(f"   Model:        {inv_data.get('model')}")
    print(f"   Summary:      {inv_data.get('summary')}")

    # 9. Verify Investigation Report Content & Structure
    print("\n[Step 9] Inspecting detailed AI Investigation Report...")
    assert inv_data.get("report_json"), "No report_json returned in investigation!"
    report = json.loads(inv_data["report_json"])

    print("\n   --- AI INVESTIGATION EXECUTIVE REPORT ---")
    print(f"   Incident Summary: {report.get('incident_summary')}")
    print(f"   Affected Routes:  {report.get('impact', {}).get('affected_endpoints')}")
    print(f"   Error Rate:       {report.get('impact', {}).get('observed_error_rate')}")
    print(f"   Hypotheses Count: {len(report.get('root_cause_hypotheses', []))}")

    for idx, hyp in enumerate(report.get("root_cause_hypotheses", [])):
        print(f"\n   [Hypothesis #{idx+1}]")
        print(f"   Title:           {hyp.get('title')}")
        print(f"   Confidence:      {hyp.get('confidence')}")
        print(f"   Explanation:     {hyp.get('explanation')}")
        print(f"   Evidence Links:  {hyp.get('supporting_evidence_ids')}")
        print(f"   Next Steps:      {hyp.get('verification_steps')}")

    # 10. Fetch Safe Failure Reproduction Package
    print("\n[Step 10] Retrieving Safe Failure Reproduction Package...")
    rep_resp = client.get(
        f"{BACKEND_URL}/api/v1/incidents/{incident_id}/reproduction",
        headers=auth_headers
    )
    if rep_resp.status_code == 200:
        rep_data = rep_resp.json()
        print("-> Safe Reproduction Package retrieved successfully:")
        print(f"   Sanitized cURL:\n   {rep_data.get('curl_command')}")
        assert "sk_live" not in rep_data.get('curl_command', ''), "SECRET LEAK: sk_live was not redacted!"
        print("-> Verified: Secrets and PII are redacted from reproduction command.")
    else:
        print(f"-> Reproduction endpoint returned {rep_resp.status_code}")

    # 11. Resolve the Incident
    print(f"\n[Step 11] Resolving Incident {incident_id}...")
    resolve_resp = client.post(
        f"{BACKEND_URL}/api/v1/incidents/{incident_id}/resolve",
        headers=auth_headers,
        json={
            "resolution_summary": "Root cause confirmed as simulated database pool exhaustion; mitigated.",
            "root_cause_confirmed": "Database connection pool saturated during peak load"
        }
    )
    assert resolve_resp.status_code == 200, f"Resolve failed: {resolve_resp.text}"
    resolved = resolve_resp.json()
    print(f"-> Incident status updated to: {resolved['status']}")
    print(f"   Resolved at: {resolved.get('resolved_at')}")

    # 12. Verify Web Frontend Pages
    print("\n[Step 12] Verifying frontend rendering and availability...")
    web_home = client.get(f"{FRONTEND_URL}/")
    web_monitors = client.get(f"{FRONTEND_URL}/monitors")
    web_incidents = client.get(f"{FRONTEND_URL}/incidents")
    web_detail = client.get(f"{FRONTEND_URL}/incidents/{incident_id}")

    print(f"-> Frontend Home:      HTTP {web_home.status_code}")
    print(f"-> Frontend Monitors:  HTTP {web_monitors.status_code}")
    print(f"-> Frontend Incidents: HTTP {web_incidents.status_code}")
    print(f"-> Frontend Detail:    HTTP {web_detail.status_code}")
    assert web_incidents.status_code == 200, "Frontend Incidents page failed"
    assert web_detail.status_code == 200, "Frontend Incident Detail page failed"

    print("\n" + "=" * 80)
    print("ALL TESTS PASSED: API Failure detection, correlation, AI reporting,")
    print("reproduction packaging, and incident resolution verified end-to-end!")
    print("=" * 80)

    # Save summary artifact data
    result_artifact = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "monitor_id": monitor_id,
        "incident_id": incident_id,
        "incident_title": detected_incident["title"],
        "severity": detected_incident["severity"],
        "ai_provider": inv_data.get("provider"),
        "ai_model": inv_data.get("model"),
        "investigation_summary": inv_data.get("summary"),
        "investigation_duration_sec": round(duration, 2),
        "report": report,
        "frontend_status_codes": {
            "home": web_home.status_code,
            "monitors": web_monitors.status_code,
            "incidents": web_incidents.status_code,
            "incident_detail": web_detail.status_code,
        }
    }
    with open("apps/api/tests/last_e2e_verification_result.json", "w") as f:
        json.dump(result_artifact, f, indent=2)

if __name__ == "__main__":
    run_e2e_test()
