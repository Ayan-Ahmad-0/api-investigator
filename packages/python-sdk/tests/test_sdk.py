import sys
from pathlib import Path
sdk_path = Path(__file__).resolve().parent.parent
if str(sdk_path) not in sys.path:
    sys.path.insert(0, str(sdk_path))

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from api_investigator import Investigator


class MockInvestigator(Investigator):
    def __init__(self):
        self.sent_events = []
        super().__init__(
            api_key="inv_ingest_testkey12345",
            api_url="http://localhost:8000",
            flush_interval_seconds=60.0,
        )

    def send_event(self, event_data):
        self.sent_events.append(event_data)


def test_fastapi_instrumentation_success_and_exception():
    app = FastAPI()
    investigator = MockInvestigator()
    investigator.instrument(app)

    @app.get("/users/{user_id}")
    def get_user(user_id: str):
        return {"id": user_id, "name": "Jane"}

    @app.get("/fail")
    def fail():
        raise ValueError("Simulated unexpected crash")

    client = TestClient(app, raise_server_exceptions=False)

    # Normal request
    resp = client.get("/users/123", headers={"Authorization": "Bearer secret_user_token"})
    assert resp.status_code == 200
    assert len(investigator.sent_events) == 1
    ev1 = investigator.sent_events[0]
    assert ev1["http_method"] == "GET"
    assert ev1["status_code"] == 200
    assert ev1["route_template"] == "/users/{user_id}"
    assert "Bearer <REDACTED>" in ev1["request_headers"]["authorization"]

    # Failing request
    resp2 = client.get("/fail")
    assert resp2.status_code == 500
    assert len(investigator.sent_events) == 2
    ev2 = investigator.sent_events[1]
    assert ev2["event_type"] == "error"
    assert ev2["exception_type"] == "ValueError"
    assert "Simulated unexpected crash" in ev2["exception_message"]
    assert "Traceback" in ev2["stack_trace"]
