def test_telemetry_ingestion_and_redaction(client, test_project, test_ingestion_key, auth_headers):
    _, full_key = test_ingestion_key

    # Ingest event containing sensitive headers and request body fields
    payload = {
        "event_type": "request",
        "service_name": "checkout-service",
        "http_method": "POST",
        "route_template": "/api/v1/payments",
        "status_code": 200,
        "duration_ms": 45.2,
        "request_headers": {
            "Authorization": "Bearer secret_jwt_token_here",
            "Cookie": "session_id=12345abcdef",
            "Content-Type": "application/json",
            "X-Custom-Header": "public-client-value",
        },
        "request_body": {
            "amount": 2999,
            "currency": "USD",
            "password": "CustomerRawPassword123",
            "card_number": "4111 2222 3333 4444",
        },
    }

    resp = client.post(
        "/api/v1/ingest/events",
        headers={"X-Ingestion-Key": full_key},
        json=payload,
    )
    assert resp.status_code == 202
    assert resp.json()["accepted"] == 1

    # Retrieve stored event and verify sensitive data was redacted
    events_resp = client.get(f"/api/v1/projects/{test_project.id}/telemetry", headers=auth_headers)
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) >= 1
    ev = events[0]
    assert ev["http_method"] == "POST"
    assert ev["route_template"] == "/api/v1/payments"
    assert ev["status_code"] == 200


def test_batch_telemetry_ingestion(client, test_ingestion_key):
    _, full_key = test_ingestion_key
    batch = {
        "events": [
            {
                "http_method": "GET",
                "route_template": "/api/v1/users/{user_id}",
                "status_code": 200,
                "duration_ms": 12.5,
            },
            {
                "http_method": "POST",
                "route_template": "/api/v1/orders",
                "status_code": 500,
                "duration_ms": 150.0,
                "exception_type": "DatabaseTimeout",
                "exception_message": "Connection to PostgreSQL timed out after 5000ms",
            },
        ]
    }
    resp = client.post(
        "/api/v1/ingest/batch",
        headers={"X-Ingestion-Key": full_key},
        json=batch,
    )
    assert resp.status_code == 202
    assert resp.json()["accepted"] == 2


def test_telemetry_missing_key_rejected(client):
    resp = client.post(
        "/api/v1/ingest/events",
        json={"http_method": "GET", "route_template": "/health", "status_code": 200, "duration_ms": 1.0},
    )
    assert resp.status_code == 401
