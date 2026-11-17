def test_create_and_revoke_api_key(client, test_project, auth_headers):
    # Create new API key
    create_resp = client.post(
        f"/api/v1/projects/{test_project.id}/keys",
        headers=auth_headers,
        json={"name": "Production Ingestion Key", "key_type": "ingest"},
    )
    assert create_resp.status_code == 201
    key_data = create_resp.json()
    assert "full_key" in key_data
    assert key_data["full_key"].startswith("inv_ingest_")
    key_id = key_data["id"]

    # List keys - full_key must NOT be returned in subsequent lists (Section 16.2 / 18.1)
    list_resp = client.get(f"/api/v1/projects/{test_project.id}/keys", headers=auth_headers)
    assert list_resp.status_code == 200
    keys = list_resp.json()
    assert any(k["id"] == key_id for k in keys)
    for k in keys:
        assert "full_key" not in k

    # Revoke key
    del_resp = client.delete(f"/api/v1/projects/{test_project.id}/keys/{key_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Subsequent list should not include revoked key
    list_resp_after = client.get(f"/api/v1/projects/{test_project.id}/keys", headers=auth_headers)
    assert not any(k["id"] == key_id for k in list_resp_after.json())
