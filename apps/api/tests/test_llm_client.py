import json
from unittest.mock import patch, MagicMock
import httpx
from app.services.llm_client import (
    resolve_llm_config,
    clean_json_response,
    analyze_incident_with_llm,
    get_llm_status,
)
from app.core.config import settings


def test_clean_json_response():
    # Clean json in markdown block
    md_content = """```json
    {
      "summary": "Stripe rate limit hit",
      "hypotheses": []
    }
    ```"""
    cleaned = clean_json_response(md_content)
    parsed = json.loads(cleaned)
    assert parsed["summary"] == "Stripe rate limit hit"

    # Bare json
    bare_content = '{"key": "value"}'
    assert clean_json_response(bare_content) == '{"key": "value"}'


def test_resolve_llm_config_presets(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "AI_API_KEY", "gsk_test123")
    monkeypatch.setattr(settings, "AI_MODEL", "")
    monkeypatch.setattr(settings, "AI_BASE_URL", "")

    provider, base_url, model, key = resolve_llm_config()
    assert provider == "groq"
    assert "api.groq.com" in base_url
    assert "gpt-oss" in model.lower()
    assert key == "gsk_test123"

    # Ollama preset
    monkeypatch.setattr(settings, "AI_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "AI_API_KEY", "")
    monkeypatch.setattr(settings, "GROK_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "AI_BASE_URL", "")
    provider, base_url, model, key = resolve_llm_config()
    assert provider == "ollama"
    assert "localhost:11434" in base_url
    assert key == "ollama"  # Ollama provides dummy auth


def test_analyze_incident_mock_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")
    monkeypatch.setattr(settings, "AI_API_KEY", "")
    monkeypatch.setattr(settings, "GROK_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    res = analyze_incident_with_llm({"id": "inc_1"}, {})
    assert res is None


def test_analyze_incident_handles_network_failure(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "AI_API_KEY", "gsk_fake")

    with patch("httpx.Client.post", side_effect=httpx.ConnectError("Network unreachable")):
        res = analyze_incident_with_llm({"id": "inc_1"}, {})
        # Must return None and not raise exception
        assert res is None


def test_analyze_incident_handles_rate_limit(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "AI_API_KEY", "gsk_fake")

    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.text = '{"error": {"message": "Rate limit reached"}}'

    with patch("httpx.Client.post", return_value=mock_resp):
        res = analyze_incident_with_llm({"id": "inc_1"}, {})
        assert res is None


def test_analyze_incident_successful_response(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "AI_API_KEY", "gsk_fake")

    expected_payload = {
        "summary": "Database connection pool saturated during morning peak",
        "confidence_score": 90,
        "confidence_level": "high",
        "confidence_explanation": "Direct metric correlation",
        "hypotheses": [
            {
                "title": "PostgreSQL Connection Pool Saturated",
                "is_primary": True,
                "probability": 0.9,
                "explanation": "Active connections hit max pool limit.",
                "supporting_evidence": ["Asyncpg PoolTimeoutError"],
                "contradicting_evidence": [],
                "missing_evidence": [],
                "verification_steps": ["Increase max pool size to 50"],
            }
        ],
        "verification_steps": ["Check DB pool telemetry"],
        "facts": ["HTTP 500 error traces observed"],
        "unknowns": [],
        "limitations": [],
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(expected_payload)
                }
            }
        ]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = analyze_incident_with_llm({"id": "inc_1"}, {})
        assert res is not None
        assert res["summary"] == "Database connection pool saturated during morning peak"
        assert len(res["hypotheses"]) == 1
        assert res["hypotheses"][0]["title"] == "PostgreSQL Connection Pool Saturated"
