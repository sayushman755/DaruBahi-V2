"""DaruBahi auth tests — phone + password (JWT bearer). No OTP.

Covers:
- POST /api/auth/register (happy path, dup, short password, short phone)
- POST /api/auth/login (wrong pw, no account, correct)
- POST /api/auth/setup-shop (Bearer)
- GET  /api/auth/me (no header, garbage token, before/after setup)
- password_hash MUST never appear in any response
"""
import os
import random
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://e94e1740-ce9c-4aed-811a-c6f0e054b4a0.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

PASSWORD = "test1234"
SHORT_PASSWORD = "123"


def _fresh_phone() -> str:
    """Return a 10-digit phone that is (very likely) unused."""
    # Use timestamp + random suffix, keep valid Indian mobile (starts 6-9)
    ts = int(time.time() * 1000) % 10_000_000
    return f"9{ts:07d}{random.randint(10, 99)}"[:10]


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --------------------------------------------------------------------------
# Register
# --------------------------------------------------------------------------
def test_register_happy_path(s):
    phone = _fresh_phone()
    r = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("token"), str) and len(body["token"]) > 20
    assert body.get("is_new_user") is True
    assert body.get("user") is None
    # sanity: no password_hash anywhere
    assert "password_hash" not in r.text


def test_register_duplicate_returns_400(s):
    phone = _fresh_phone()
    r1 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r1.status_code == 200, r1.text

    r2 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r2.status_code == 400, r2.text
    assert "already exists" in r2.json().get("detail", "").lower()


def test_register_short_password_rejected(s):
    phone = _fresh_phone()
    r = s.post(f"{API}/auth/register", json={"phone": phone, "password": SHORT_PASSWORD})
    assert r.status_code == 400
    assert "6 characters" in r.json()["detail"] or "password" in r.json()["detail"].lower()


def test_register_short_phone_rejected(s):
    r = s.post(f"{API}/auth/register", json={"phone": "12345", "password": PASSWORD})
    assert r.status_code == 400


# --------------------------------------------------------------------------
# Login
# --------------------------------------------------------------------------
def test_login_wrong_password(s):
    phone = _fresh_phone()
    # register first
    r0 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r0.status_code == 200

    r = s.post(f"{API}/auth/login", json={"phone": phone, "password": "wrongpassword"})
    assert r.status_code == 400, r.text
    assert "Incorrect" in r.json()["detail"] or "password" in r.json()["detail"].lower()


def test_login_nonexistent_phone(s):
    r = s.post(f"{API}/auth/login", json={"phone": _fresh_phone(), "password": PASSWORD})
    assert r.status_code == 400, r.text
    assert "No account" in r.json()["detail"] or "sign up" in r.json()["detail"].lower()


def test_login_success_before_setup_returns_is_new_user_true(s):
    phone = _fresh_phone()
    r0 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r0.status_code == 200

    r = s.post(f"{API}/auth/login", json={"phone": phone, "password": PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body["token"], str) and len(body["token"]) > 20
    assert body["is_new_user"] is True
    assert body["user"] is None
    assert "password_hash" not in r.text


# --------------------------------------------------------------------------
# /auth/me — no header, garbage, pre-setup
# --------------------------------------------------------------------------
def test_me_without_authorization_returns_401(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_with_garbage_token_returns_401(s):
    r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbagegarbagegarbage.xxx.yyy"})
    assert r.status_code == 401


def test_me_before_setup_returns_404(s):
    phone = _fresh_phone()
    r0 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r0.status_code == 200
    token = r0.json()["token"]

    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404, r.text


# --------------------------------------------------------------------------
# Setup-shop + full flow
# --------------------------------------------------------------------------
@pytest.fixture(scope="module")
def full_user(s):
    """Registers, sets up shop, returns dict with phone/password/token/user."""
    phone = _fresh_phone()
    r = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    r2 = s.post(
        f"{API}/auth/setup-shop",
        headers=headers,
        json={
            "shop_name": "TEST_Shop",
            "owner_name": "TEST_Owner",
            "shop_type": "Composite (FL+BB)",
            "address": "TEST addr",
            "license_number": "TEST-LIC",
        },
    )
    assert r2.status_code == 200, r2.text
    return {"phone": phone, "password": PASSWORD, "token": token, "headers": headers, "user": r2.json()}


def test_setup_shop_returns_user_without_password_hash(full_user):
    u = full_user["user"]
    assert u["shop_name"] == "TEST_Shop"
    assert u["owner_name"] == "TEST_Owner"
    assert u["shop_type"] == "Composite (FL+BB)"
    assert "password_hash" not in u
    assert u.get("phone", "").startswith("+91")


def test_login_after_setup_returns_is_new_user_false(s, full_user):
    r = s.post(
        f"{API}/auth/login",
        json={"phone": full_user["phone"], "password": full_user["password"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_new_user"] is False
    assert body["user"] is not None
    assert body["user"]["shop_name"] == "TEST_Shop"
    assert "password_hash" not in r.text


def test_me_after_setup_returns_full_user(s, full_user):
    r = s.get(f"{API}/auth/me", headers=full_user["headers"])
    assert r.status_code == 200, r.text
    u = r.json()
    assert u["shop_name"] == "TEST_Shop"
    assert u["owner_name"] == "TEST_Owner"
    assert "password_hash" not in u


# --------------------------------------------------------------------------
# Phone normalization sanity — same phone with/without +91 collides
# --------------------------------------------------------------------------
def test_phone_normalized_to_plus91(s):
    # Register with 10 digits, login with +91 form -- should be the same user
    phone = _fresh_phone()
    r0 = s.post(f"{API}/auth/register", json={"phone": phone, "password": PASSWORD})
    assert r0.status_code == 200

    r = s.post(f"{API}/auth/login", json={"phone": f"+91{phone}", "password": PASSWORD})
    assert r.status_code == 200, r.text
