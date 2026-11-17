def test_register_and_login(client):
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "alice@test.com",
        "name": "Alice Smith",
        "password": "SecurePassword123!",
    })
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == "alice@test.com"
    assert user_data["name"] == "Alice Smith"
    assert "id" in user_data

    # Duplicate registration should fail
    dup_resp = client.post("/api/v1/auth/register", json={
        "email": "alice@test.com",
        "name": "Alice Duplicate",
        "password": "SecurePassword123!",
    })
    assert dup_resp.status_code == 400

    # Successful login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "alice@test.com",
        "password": "SecurePassword123!",
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Authenticated /me
    token = token_data["access_token"]
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@test.com"


def test_login_invalid_password(client, test_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword!",
    })
    assert resp.status_code == 401


def test_auth_me_unauthorized(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
