def test_multi_tenant_project_isolation(client, test_project, auth_headers, other_auth_headers):
    # Owner can access their project
    resp_owner = client.get(f"/api/v1/projects/{test_project.id}", headers=auth_headers)
    assert resp_owner.status_code == 200
    assert resp_owner.json()["id"] == test_project.id

    # Another user cannot access or list this project
    resp_other = client.get(f"/api/v1/projects/{test_project.id}", headers=other_auth_headers)
    assert resp_other.status_code == 404

    # Other user listing projects should see an empty list
    list_resp = client.get("/api/v1/projects", headers=other_auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0
