from app.core.ssrf import is_safe_url


def test_ssrf_validator_blocks_internal_destinations():
    # Loopback
    assert is_safe_url("http://127.0.0.1:8000")[0] is False
    assert is_safe_url("http://localhost:3000")[0] is False
    assert is_safe_url("http://[::1]:8080")[0] is False

    # Cloud metadata service (AWS/GCP/Azure)
    assert is_safe_url("http://169.254.169.254/latest/meta-data/")[0] is False
    assert is_safe_url("http://metadata.google.internal")[0] is False

    # Private RFC1918 ranges
    assert is_safe_url("http://10.0.0.1/status")[0] is False
    assert is_safe_url("http://192.168.1.1/admin")[0] is False
    assert is_safe_url("http://172.16.0.5/api")[0] is False

    # Disallowed schemes
    assert is_safe_url("ftp://example.com/file")[0] is False
    assert is_safe_url("file:///etc/passwd")[0] is False
    assert is_safe_url("gopher://example.com")[0] is False


def test_monitor_creation_ssrf_rejection(client, test_project, auth_headers):
    resp = client.post(
        f"/api/v1/projects/{test_project.id}/monitors",
        headers=auth_headers,
        json={
            "name": "Internal AWS Metadata Prober",
            "url": "http://169.254.169.254/latest/meta-data/",
            "interval_seconds": 60,
        },
    )
    assert resp.status_code == 400
    assert "SSRF" in resp.json()["detail"]
