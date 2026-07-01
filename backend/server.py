from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
import jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("darubahi")


class InMemoryCollection:
    def __init__(self):
        self._items = []

    async def find_one(self, query=None, projection=None):
        query = query or {}
        for item in self._items:
            if all(item.get(key) == value for key, value in query.items()):
                return self._project(item, projection)
        return None

    async def update_one(self, query=None, update=None, upsert=False):
        query = query or {}
        update = update or {}
        for item in self._items:
            if all(item.get(key) == value for key, value in query.items()):
                if "$set" in update:
                    for key, value in update["$set"].items():
                        item[key] = value
                return {"matched_count": 1, "modified_count": 1}

        if upsert:
            new_doc = {}
            if "$set" in update:
                new_doc.update(update["$set"])
            self._items.append(new_doc)
            return {"matched_count": 0, "modified_count": 1, "upserted_id": id(new_doc)}

        return {"matched_count": 0, "modified_count": 0}

    async def insert_one(self, doc):
        self._items.append(dict(doc))
        return {"inserted_id": id(doc)}

    async def delete_one(self, query=None):
        query = query or {}
        for idx, item in enumerate(self._items):
            if all(item.get(key) == value for key, value in query.items()):
                self._items.pop(idx)
                return {"deleted_count": 1}
        return {"deleted_count": 0}

    def find(self, query=None, projection=None):
        return InMemoryQuery(self, query or {}, projection or {})

    def _project(self, doc, projection):
        if not projection:
            return dict(doc)
        if projection.get("_id") == 0:
            return {k: v for k, v in doc.items() if k != "_id"}
        return {k: v for k, v in doc.items() if k in projection}


class InMemoryQuery:
    def __init__(self, collection, query, projection):
        self.collection = collection
        self.query = query
        self.projection = projection
        self.sort_field = None
        self.sort_direction = 1

    def sort(self, field, direction=-1):
        self.sort_field = field
        self.sort_direction = direction
        return self

    async def to_list(self, limit=1000):
        filtered = []
        for item in self.collection._items:
            if all(item.get(key) == value for key, value in self.query.items()):
                filtered.append(self.collection._project(item, self.projection))

        if self.sort_field is not None:
            filtered.sort(key=lambda item: item.get(self.sort_field) or "", reverse=self.sort_direction < 0)

        return filtered[:limit]


class InMemoryDatabase:
    def __init__(self):
        self.users = InMemoryCollection()
        self.otp_codes = InMemoryCollection()
        self.categories = InMemoryCollection()
        self.products = InMemoryCollection()
        self.sales = InMemoryCollection()
        self.stock_entries = InMemoryCollection()


# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017/darubahi")
db_name = os.getenv("DB_NAME", "darubahi")
use_memory_db = os.getenv("USE_MEMORY_DB", "1").lower() in {"1", "true", "yes", "on"}

try:
    if use_memory_db:
        raise RuntimeError("Using in-memory fallback")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=1000, connect=False)
    db = client[db_name]
except Exception as exc:
    logger.warning("MongoDB unavailable; using in-memory fallback: %s", exc)
    client = None
    db = InMemoryDatabase()

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = 'HS256'

TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
TWILIO_ENABLED = all([TWILIO_SID, TWILIO_TOKEN, TWILIO_VERIFY_SID])

twilio_client = None
if TWILIO_ENABLED:
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
    except Exception as e:  # pragma: no cover
        logging.warning(f"Twilio init failed: {e}")
        twilio_client = None

PRESET_CATEGORIES = ["Whisky", "Rum", "Beer", "Wine", "Desi", "Vodka", "Gin", "Brandy"]

# Reserved QA number: always uses the dev OTP path (never hits Twilio) so
# automated tests / demos can log in without a real SIM.
TEST_PHONE = "+919999999999"
TEST_OTP = "123456"

app = FastAPI(title="DaruBahi API")
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def normalize_phone(phone: str) -> str:
    phone = (phone or "").strip().replace(" ", "").replace("-", "")
    if not phone:
        return phone
    if phone.startswith("+"):
        return phone
    # default to India country code for 10-digit numbers
    digits = phone.lstrip("0")
    if len(digits) == 10:
        return "+91" + digits
    return "+" + digits


def make_token(phone: str) -> str:
    payload = {
        "sub": phone,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=60),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_phone_from_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Require a fully set-up shop owner."""
    phone = await get_phone_from_token(authorization)
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Shop profile not set up")
    return user


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SendOtpReq(BaseModel):
    phone: str


class VerifyOtpReq(BaseModel):
    phone: str
    code: str


class SetupShopReq(BaseModel):
    shop_name: str
    owner_name: str
    shop_type: str  # Composite (FL+BB) | Desi | Desi + Beer
    address: Optional[str] = ""
    license_number: Optional[str] = ""


class CategoryReq(BaseModel):
    name: str


class ProductReq(BaseModel):
    category: str
    brand_name: str
    size: str
    cost_price: float
    selling_price: float
    current_stock: int = 0
    min_stock: int = 5


class SaleReq(BaseModel):
    product_id: str
    quantity: int


class StockEntryReq(BaseModel):
    product_id: str
    stock_added: int = 0
    sold_quantity: int = 0
    damaged_quantity: int = 0


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "DaruBahi API running", "twilio": TWILIO_ENABLED}


@api_router.post("/auth/send-otp")
async def send_otp(req: SendOtpReq):
    phone = normalize_phone(req.phone)
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid mobile number")

    if phone == TEST_PHONE:
        await db.otp_codes.update_one(
            {"phone": phone},
            {"$set": {"phone": phone, "code": TEST_OTP, "created_at": now_iso()}},
            upsert=True,
        )
        return {"sent": True, "dev_mode": True, "dev_otp": TEST_OTP, "phone": phone}

    if twilio_client:
        try:
            await run_in_threadpool(
                lambda: twilio_client.verify.v2.services(TWILIO_VERIFY_SID)
                .verifications.create(to=phone, channel="sms")
            )
            return {"sent": True, "dev_mode": False, "phone": phone}
        except Exception as e:
            logger.warning(f"Twilio send failed, using dev fallback: {e}")

    # Dev fallback: generate + store a code, return it so the app can proceed
    code = f"{random.randint(0, 9999):04d}"
    await db.otp_codes.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "code": code, "created_at": now_iso()}},
        upsert=True,
    )
    return {"sent": True, "dev_mode": True, "dev_otp": code, "phone": phone}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: VerifyOtpReq):
    phone = normalize_phone(req.phone)
    approved = False

    if twilio_client and phone != TEST_PHONE:
        try:
            check = await run_in_threadpool(
                lambda: twilio_client.verify.v2.services(TWILIO_VERIFY_SID)
                .verification_checks.create(to=phone, code=req.code)
            )
            approved = check.status == "approved"
        except Exception as e:
            logger.warning(f"Twilio verify failed, trying dev fallback: {e}")

    if not approved:
        record = await db.otp_codes.find_one({"phone": phone})
        if record and record.get("code") == req.code:
            approved = True

    if not approved:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    await db.otp_codes.delete_one({"phone": phone})
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    token = make_token(phone)
    return {"token": token, "is_new_user": user is None, "user": user}


@api_router.post("/auth/setup-shop")
async def setup_shop(req: SetupShopReq, authorization: Optional[str] = Header(None)):
    phone = await get_phone_from_token(authorization)
    existing = await db.users.find_one({"phone": phone}, {"_id": 0})
    doc = {
        "id": existing["id"] if existing else new_id(),
        "phone": phone,
        "shop_name": req.shop_name.strip(),
        "owner_name": req.owner_name.strip(),
        "shop_type": req.shop_type,
        "address": req.address or "",
        "license_number": req.license_number or "",
        "created_at": existing["created_at"] if existing else now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.update_one({"phone": phone}, {"$set": doc}, upsert=True)
    return doc


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(current_user)):
    return user


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
@api_router.get("/categories")
async def list_categories(user: dict = Depends(current_user)):
    customs = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    custom_names = [c["name"] for c in customs]
    names = PRESET_CATEGORIES + [n for n in custom_names if n not in PRESET_CATEGORIES]
    return {"categories": names, "presets": PRESET_CATEGORIES}


@api_router.post("/categories")
async def add_category(req: CategoryReq, user: dict = Depends(current_user)):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name required")
    if name in PRESET_CATEGORIES:
        return {"name": name}
    exists = await db.categories.find_one({"user_id": user["id"], "name": name})
    if not exists:
        await db.categories.insert_one({"id": new_id(), "user_id": user["id"], "name": name})
    return {"name": name}


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
@api_router.get("/products")
async def list_products(category: Optional[str] = None, user: dict = Depends(current_user)):
    query = {"user_id": user["id"], "is_active": True}
    if category and category != "All":
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return products


@api_router.post("/products")
async def create_product(req: ProductReq, user: dict = Depends(current_user)):
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "category": req.category,
        "brand_name": req.brand_name.strip(),
        "size": req.size.strip(),
        "cost_price": float(req.cost_price),
        "selling_price": float(req.selling_price),
        "current_stock": int(req.current_stock),
        "min_stock": int(req.min_stock),
        "is_active": True,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.products.insert_one(doc)
    return clean(doc)


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, req: ProductReq, user: dict = Depends(current_user)):
    prod = await db.products.find_one({"id": product_id, "user_id": user["id"]})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    updates = {
        "category": req.category,
        "brand_name": req.brand_name.strip(),
        "size": req.size.strip(),
        "cost_price": float(req.cost_price),
        "selling_price": float(req.selling_price),
        "current_stock": int(req.current_stock),
        "min_stock": int(req.min_stock),
        "updated_at": now_iso(),
    }
    await db.products.update_one({"id": product_id}, {"$set": updates})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(current_user)):
    res = await db.products.update_one(
        {"id": product_id, "user_id": user["id"]}, {"$set": {"is_active": False, "updated_at": now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------
async def _record_sale(user_id: str, prod: dict, qty: int, source: str):
    total_revenue = qty * prod["selling_price"]
    total_cost = qty * prod["cost_price"]
    profit = total_revenue - total_cost
    sale = {
        "id": new_id(),
        "user_id": user_id,
        "product_id": prod["id"],
        "brand_name": prod["brand_name"],
        "category": prod["category"],
        "size": prod["size"],
        "quantity": qty,
        "cost_price": prod["cost_price"],
        "selling_price": prod["selling_price"],
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "profit": profit,
        "source": source,
        "sale_date": now_iso(),
        "created_at": now_iso(),
    }
    await db.sales.insert_one(sale)
    return clean(sale)


@api_router.post("/sales")
async def create_sale(req: SaleReq, user: dict = Depends(current_user)):
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    prod = await db.products.find_one({"id": req.product_id, "user_id": user["id"], "is_active": True}, {"_id": 0})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if req.quantity > prod["current_stock"]:
        raise HTTPException(status_code=400, detail=f"Only {prod['current_stock']} in stock")
    sale = await _record_sale(user["id"], prod, req.quantity, "Sale")
    await db.products.update_one(
        {"id": prod["id"]}, {"$set": {"current_stock": prod["current_stock"] - req.quantity, "updated_at": now_iso()}}
    )
    return sale


@api_router.get("/sales")
async def list_sales(limit: int = 100, user: dict = Depends(current_user)):
    sales = await db.sales.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return sales


# ---------------------------------------------------------------------------
# Daily stock entry
# ---------------------------------------------------------------------------
@api_router.post("/stock-entries")
async def create_stock_entry(req: StockEntryReq, user: dict = Depends(current_user)):
    prod = await db.products.find_one({"id": req.product_id, "user_id": user["id"], "is_active": True}, {"_id": 0})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    opening = prod["current_stock"]
    closing = opening + req.stock_added - req.sold_quantity - req.damaged_quantity
    if closing < 0:
        raise HTTPException(status_code=400, detail="Closing stock cannot be negative")
    entry = {
        "id": new_id(),
        "user_id": user["id"],
        "product_id": prod["id"],
        "brand_name": prod["brand_name"],
        "category": prod["category"],
        "size": prod["size"],
        "opening_stock": opening,
        "stock_added": req.stock_added,
        "sold_quantity": req.sold_quantity,
        "damaged_quantity": req.damaged_quantity,
        "closing_stock": closing,
        "entry_date": now_iso(),
        "created_at": now_iso(),
    }
    await db.stock_entries.insert_one(entry)
    if req.sold_quantity > 0:
        await _record_sale(user["id"], prod, req.sold_quantity, "Daily Entry")
    await db.products.update_one({"id": prod["id"]}, {"$set": {"current_stock": closing, "updated_at": now_iso()}})
    return clean(entry)


@api_router.get("/stock-entries")
async def list_stock_entries(limit: int = 100, user: dict = Depends(current_user)):
    entries = await db.stock_entries.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return entries


# ---------------------------------------------------------------------------
# Dashboard + Reports
# ---------------------------------------------------------------------------
def _date_key(iso: str) -> str:
    return iso[:10]


def _month_key(iso: str) -> str:
    return iso[:7]


@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(current_user)):
    sales = await db.sales.find({"user_id": user["id"]}, {"_id": 0}).to_list(100000)
    products = await db.products.find({"user_id": user["id"], "is_active": True}, {"_id": 0}).to_list(10000)

    today = now_iso()[:10]
    month = now_iso()[:7]

    today_sales = [s for s in sales if _date_key(s["sale_date"]) == today]
    month_sales = [s for s in sales if _month_key(s["sale_date"]) == month]

    today_revenue = sum(s["total_revenue"] for s in today_sales)
    today_profit = sum(s["profit"] for s in today_sales)
    bottles_today = sum(s["quantity"] for s in today_sales)
    month_revenue = sum(s["total_revenue"] for s in month_sales)
    month_profit = sum(s["profit"] for s in month_sales)

    low_stock = [p for p in products if p["current_stock"] <= p["min_stock"]]

    # top sellers overall
    agg = {}
    for s in sales:
        k = s["brand_name"] + " " + s["size"]
        cur = agg.get(k, {"name": s["brand_name"], "size": s["size"], "qty": 0, "revenue": 0})
        cur["qty"] += s["quantity"]
        cur["revenue"] += s["total_revenue"]
        agg[k] = cur
    top_sellers = sorted(agg.values(), key=lambda x: x["qty"], reverse=True)[:5]

    recent = sorted(sales, key=lambda x: x["created_at"], reverse=True)[:8]

    return {
        "shop_name": user["shop_name"],
        "owner_name": user["owner_name"],
        "shop_type": user["shop_type"],
        "today_revenue": today_revenue,
        "today_profit": today_profit,
        "bottles_today": bottles_today,
        "month_revenue": month_revenue,
        "month_profit": month_profit,
        "product_count": len(products),
        "low_stock_count": len(low_stock),
        "low_stock": low_stock[:5],
        "top_sellers": top_sellers,
        "recent_sales": recent,
    }


@api_router.get("/reports/daily")
async def daily_report(date: Optional[str] = None, user: dict = Depends(current_user)):
    day = date or now_iso()[:10]
    sales = await db.sales.find({"user_id": user["id"]}, {"_id": 0}).to_list(100000)
    day_sales = [s for s in sales if _date_key(s["sale_date"]) == day]

    total_revenue = sum(s["total_revenue"] for s in day_sales)
    total_profit = sum(s["profit"] for s in day_sales)
    total_bottles = sum(s["quantity"] for s in day_sales)

    agg = {}
    for s in day_sales:
        k = s["brand_name"] + " " + s["size"]
        cur = agg.get(k, {"name": s["brand_name"], "size": s["size"], "category": s["category"],
                          "qty": 0, "revenue": 0, "profit": 0})
        cur["qty"] += s["quantity"]
        cur["revenue"] += s["total_revenue"]
        cur["profit"] += s["profit"]
        agg[k] = cur
    brands = sorted(agg.values(), key=lambda x: x["revenue"], reverse=True)

    return {
        "date": day,
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "total_bottles": total_bottles,
        "brands": brands,
    }


@api_router.get("/reports/monthly")
async def monthly_report(month: Optional[str] = None, user: dict = Depends(current_user)):
    mon = month or now_iso()[:7]
    sales = await db.sales.find({"user_id": user["id"]}, {"_id": 0}).to_list(100000)
    products = await db.products.find({"user_id": user["id"], "is_active": True}, {"_id": 0}).to_list(10000)
    mon_sales = [s for s in sales if _month_key(s["sale_date"]) == mon]

    total_revenue = sum(s["total_revenue"] for s in mon_sales)
    total_profit = sum(s["profit"] for s in mon_sales)
    total_bottles = sum(s["quantity"] for s in mon_sales)

    agg = {}
    for s in mon_sales:
        k = s["brand_name"] + " " + s["size"]
        cur = agg.get(k, {"name": s["brand_name"], "size": s["size"], "category": s["category"],
                          "qty": 0, "revenue": 0, "profit": 0})
        cur["qty"] += s["quantity"]
        cur["revenue"] += s["total_revenue"]
        cur["profit"] += s["profit"]
        agg[k] = cur
    brands = sorted(agg.values(), key=lambda x: x["revenue"], reverse=True)
    top5 = brands[:5]

    remaining_stock_units = sum(p["current_stock"] for p in products)
    remaining_stock_value = sum(p["current_stock"] * p["cost_price"] for p in products)

    # category-wise profit
    cat_agg = {}
    for s in mon_sales:
        cur = cat_agg.get(s["category"], {"category": s["category"], "revenue": 0, "profit": 0})
        cur["revenue"] += s["total_revenue"]
        cur["profit"] += s["profit"]
        cat_agg[s["category"]] = cur
    categories = sorted(cat_agg.values(), key=lambda x: x["revenue"], reverse=True)

    return {
        "month": mon,
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "total_bottles": total_bottles,
        "top_brands": top5,
        "brands": brands,
        "categories": categories,
        "remaining_stock_units": remaining_stock_units,
        "remaining_stock_value": remaining_stock_value,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
