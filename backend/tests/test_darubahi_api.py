"""DaruBahi backend API tests - end-to-end coverage of auth, products, sales, stock, dashboard, reports."""
import os
import random
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://login-signup-mobile.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_PHONE = "9999999999"
TEST_OTP = "123456"


# ---- session / auth ----
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def auth(s):
    # send otp
    r = s.post(f"{API}/auth/send-otp", json={"phone": TEST_PHONE}, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sent"] is True
    assert body["dev_otp"] == TEST_OTP
    # verify otp
    r = s.post(f"{API}/auth/verify-otp", json={"phone": TEST_PHONE, "code": TEST_OTP}, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "token" in j
    token = j["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure shop is set up (idempotent)
    r = s.post(
        f"{API}/auth/setup-shop",
        json={
            "shop_name": "TEST_QA_Shop",
            "owner_name": "TEST_QA_Owner",
            "shop_type": "Composite (FL+BB)",
            "address": "Test Address",
            "license_number": "TEST-LIC-1",
        },
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["shop_name"] == "TEST_QA_Shop"
    return {"headers": headers, "user": user}


# ---- root/health ----
def test_root(s):
    r = s.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "DaruBahi" in r.json().get("message", "")


# ---- auth ----
def test_send_otp_dev_bypass(s):
    r = s.post(f"{API}/auth/send-otp", json={"phone": TEST_PHONE})
    assert r.status_code == 200
    j = r.json()
    assert j.get("dev_mode") is True and j.get("dev_otp") == TEST_OTP


def test_verify_bad_otp(s):
    s.post(f"{API}/auth/send-otp", json={"phone": TEST_PHONE})
    r = s.post(f"{API}/auth/verify-otp", json={"phone": TEST_PHONE, "code": "000000"})
    assert r.status_code == 400


def test_me_unauth(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_ok(s, auth):
    r = s.get(f"{API}/auth/me", headers=auth["headers"])
    assert r.status_code == 200
    assert r.json()["phone"] == "+919999999999"


def test_products_unauth(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 401


# ---- categories ----
def test_categories_presets(s, auth):
    r = s.get(f"{API}/categories", headers=auth["headers"])
    assert r.status_code == 200
    body = r.json()
    for c in ["Whisky", "Rum", "Beer", "Wine"]:
        assert c in body["categories"]


def test_categories_add_custom(s, auth):
    custom = f"TEST_CAT_{random.randint(1000,9999)}"
    r = s.post(f"{API}/categories", json={"name": custom}, headers=auth["headers"])
    assert r.status_code == 200
    r2 = s.get(f"{API}/categories", headers=auth["headers"])
    assert custom in r2.json()["categories"]


# ---- products ----
@pytest.fixture(scope="module")
def product(s, auth):
    payload = {
        "category": "Whisky",
        "brand_name": f"TEST_Brand_{random.randint(1000,9999)}",
        "size": "750ml",
        "cost_price": 500.0,
        "selling_price": 800.0,
        "current_stock": 10,
        "min_stock": 2,
    }
    r = s.post(f"{API}/products", json=payload, headers=auth["headers"])
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["brand_name"] == payload["brand_name"]
    assert p["current_stock"] == 10
    yield p
    s.delete(f"{API}/products/{p['id']}", headers=auth["headers"])


def test_product_list_and_filter(s, auth, product):
    r = s.get(f"{API}/products", headers=auth["headers"])
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert product["id"] in ids

    r2 = s.get(f"{API}/products?category=Whisky", headers=auth["headers"])
    assert product["id"] in [p["id"] for p in r2.json()]


def test_product_update(s, auth, product):
    payload = {
        "category": "Whisky",
        "brand_name": product["brand_name"],
        "size": "750ml",
        "cost_price": 500.0,
        "selling_price": 850.0,
        "current_stock": 10,
        "min_stock": 2,
    }
    r = s.put(f"{API}/products/{product['id']}", json=payload, headers=auth["headers"])
    assert r.status_code == 200
    assert r.json()["selling_price"] == 850.0


# ---- sales ----
def test_sale_success_decrements_stock_and_profit(s, auth, product):
    before = s.get(f"{API}/products", headers=auth["headers"]).json()
    p_before = next(p for p in before if p["id"] == product["id"])
    stock_before = p_before["current_stock"]

    r = s.post(f"{API}/sales", json={"product_id": product["id"], "quantity": 2}, headers=auth["headers"])
    assert r.status_code == 200, r.text
    sale = r.json()
    assert sale["quantity"] == 2
    # profit = 2 * (selling - cost) = 2 * (850 - 500) = 700
    assert sale["profit"] == pytest.approx(2 * (p_before["selling_price"] - p_before["cost_price"]))
    assert sale["total_revenue"] == pytest.approx(2 * p_before["selling_price"])

    after = s.get(f"{API}/products", headers=auth["headers"]).json()
    p_after = next(p for p in after if p["id"] == product["id"])
    assert p_after["current_stock"] == stock_before - 2


def test_sale_rejects_over_stock(s, auth, product):
    r = s.post(
        f"{API}/sales",
        json={"product_id": product["id"], "quantity": 99999},
        headers=auth["headers"],
    )
    assert r.status_code == 400


# ---- stock entries ----
def test_stock_entry_computes_closing(s, auth, product):
    before = s.get(f"{API}/products", headers=auth["headers"]).json()
    p_before = next(p for p in before if p["id"] == product["id"])
    opening = p_before["current_stock"]

    r = s.post(
        f"{API}/stock-entries",
        json={"product_id": product["id"], "stock_added": 5, "sold_quantity": 1, "damaged_quantity": 0},
        headers=auth["headers"],
    )
    assert r.status_code == 200, r.text
    entry = r.json()
    assert entry["opening_stock"] == opening
    assert entry["closing_stock"] == opening + 5 - 1

    after = s.get(f"{API}/products", headers=auth["headers"]).json()
    p_after = next(p for p in after if p["id"] == product["id"])
    assert p_after["current_stock"] == opening + 5 - 1


def test_stock_entry_rejects_negative_closing(s, auth, product):
    r = s.post(
        f"{API}/stock-entries",
        json={"product_id": product["id"], "stock_added": 0, "sold_quantity": 999, "damaged_quantity": 0},
        headers=auth["headers"],
    )
    assert r.status_code == 400


# ---- dashboard + reports ----
def test_dashboard(s, auth):
    r = s.get(f"{API}/dashboard", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    for k in [
        "shop_name", "today_revenue", "today_profit", "month_revenue",
        "month_profit", "product_count", "top_sellers", "recent_sales", "low_stock",
    ]:
        assert k in d
    assert isinstance(d["top_sellers"], list)


def test_daily_report(s, auth):
    r = s.get(f"{API}/reports/daily", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    for k in ["date", "total_revenue", "total_profit", "total_bottles", "brands"]:
        assert k in d


def test_monthly_report(s, auth):
    r = s.get(f"{API}/reports/monthly", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    for k in ["month", "total_revenue", "total_profit", "top_brands", "categories",
              "remaining_stock_units", "remaining_stock_value"]:
        assert k in d
    assert len(d["top_brands"]) <= 5


# ---- delete + verify ----
def test_product_soft_delete(s, auth):
    # create a fresh product
    payload = {
        "category": "Beer",
        "brand_name": f"TEST_Del_{random.randint(1000,9999)}",
        "size": "650ml",
        "cost_price": 100.0,
        "selling_price": 150.0,
        "current_stock": 3,
        "min_stock": 1,
    }
    r = s.post(f"{API}/products", json=payload, headers=auth["headers"])
    assert r.status_code == 200
    pid = r.json()["id"]

    r = s.delete(f"{API}/products/{pid}", headers=auth["headers"])
    assert r.status_code == 200 and r.json().get("deleted") is True

    listing = s.get(f"{API}/products", headers=auth["headers"]).json()
    assert pid not in [p["id"] for p in listing]
