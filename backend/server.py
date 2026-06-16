"""
Sorry Kitty backend - Supabase proxy using service_role key.
All DB operations are performed server-side to avoid exposing the
service key and to bypass RLS without requiring the user to manage
policies in the Supabase dashboard.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from pathlib import Path
import os
import base64
import secrets
import logging
import httpx
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_REST = f"{SUPABASE_URL}/rest/v1"

app = FastAPI()
api = APIRouter(prefix="/api")

logger = logging.getLogger("sorry-kitty")
logging.basicConfig(level=logging.INFO)

# ─────────────────────────────────────────────────────────
# Supabase REST helper
# ─────────────────────────────────────────────────────────
_headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


async def sb_request(
    method: str,
    table: str,
    *,
    params: Optional[Dict[str, str]] = None,
    json: Optional[Any] = None,
    prefer: Optional[str] = None,
) -> Any:
    url = f"{SUPABASE_REST}/{table}"
    headers = dict(_headers)
    if prefer:
        headers["Prefer"] = prefer
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(method, url, params=params, json=json, headers=headers)
    if resp.status_code >= 400:
        logger.error("Supabase error %s %s: %s", method, table, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    if not resp.content:
        return None
    try:
        return resp.json()
    except Exception:
        return resp.text


def _hash_pw(pw: str) -> str:
    # Match the existing scheme used in the frontend so credentials remain compatible.
    return base64.b64encode(pw.encode()).decode()


def _new_token() -> str:
    return secrets.token_urlsafe(24)


# ─────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────
class SignupBody(BaseModel):
    name: str
    email: str
    password: str
    avatar: Optional[str] = "🐱"


class LoginBody(BaseModel):
    email: str
    password: str


@api.get("/")
async def root():
    return {"app": "Sorry Kitty backend", "status": "ok"}


@api.post("/auth/signup")
async def signup(body: SignupBody):
    if not body.email or not body.password or not body.name:
        return {"error": "Please fill all fields"}
    if len(body.password) < 6:
        return {"error": "Password needs 6+ characters"}

    email = body.email.lower().strip()

    existing = await sb_request(
        "GET", "users", params={"email": f"eq.{email}", "select": "id"}
    )
    if existing:
        return {"error": "Email already registered"}

    user_row = await sb_request(
        "POST",
        "users",
        json={
            "email": email,
            "name": body.name,
            "password_hash": _hash_pw(body.password),
            "avatar": body.avatar or "🐱",
        },
        prefer="return=representation",
    )
    if not user_row:
        return {"error": "Failed to create account"}
    user = user_row[0]

    await sb_request(
        "POST",
        "user_stats",
        json={
            "user_id": user["id"],
            "cards_created": 0,
            "cards_sent": 0,
            "smiles_received": 0,
        },
        prefer="return=minimal",
    )

    token = _new_token()
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await sb_request(
        "POST",
        "sessions",
        json={"user_id": user["id"], "token": token, "expires_at": expires},
        prefer="return=minimal",
    )

    return {
        "success": True,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar": user["avatar"]},
        "sessionToken": token,
    }


@api.post("/auth/login")
async def login(body: LoginBody):
    if not body.email or not body.password:
        return {"error": "Please fill all fields"}
    email = body.email.lower().strip()
    rows = await sb_request("GET", "users", params={"email": f"eq.{email}", "select": "*"})
    if not rows:
        return {"error": "Invalid email or password"}
    user = rows[0]
    if user["password_hash"] != _hash_pw(body.password):
        return {"error": "Invalid email or password"}

    token = _new_token()
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await sb_request(
        "POST",
        "sessions",
        json={"user_id": user["id"], "token": token, "expires_at": expires},
        prefer="return=minimal",
    )

    return {
        "success": True,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar": user["avatar"]},
        "sessionToken": token,
    }


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    token = (authorization or "").replace("Bearer ", "").strip()
    if not token:
        return {"success": True}
    await sb_request("DELETE", "sessions", params={"token": f"eq.{token}"}, prefer="return=minimal")
    return {"success": True}


@api.get("/auth/session")
async def session(authorization: Optional[str] = Header(None)):
    token = (authorization or "").replace("Bearer ", "").strip()
    if not token:
        return None
    now = datetime.now(timezone.utc).isoformat()
    rows = await sb_request(
        "GET",
        "sessions",
        params={
            "token": f"eq.{token}",
            "expires_at": f"gt.{now}",
            "select": "*,users(id,email,name,avatar)",
        },
    )
    if not rows:
        return None
    s = rows[0]
    return {"user": s["users"], "sessionToken": s["token"]}


# ─────────────────────────────────────────────────────────
# Cards
# ─────────────────────────────────────────────────────────
def _new_card_id() -> str:
    # 11-char nano-ish id
    import string
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(11))


@api.get("/cards")
async def list_cards(owner_id: str):
    rows = await sb_request(
        "GET",
        "cards",
        params={"owner_id": f"eq.{owner_id}", "order": "created_at.desc"},
    )
    return {"success": True, "cards": rows or []}


@api.get("/cards/{card_id}")
async def get_card(card_id: str):
    rows = await sb_request("GET", "cards", params={"id": f"eq.{card_id}", "select": "*"})
    if not rows:
        return {"error": "Card not found"}
    return {"success": True, "card": rows[0]}


@api.post("/cards")
async def create_card(body: Dict[str, Any]):
    if not body.get("recipient"):
        return {"error": "Recipient is required"}
    if not body.get("owner_id"):
        return {"error": "owner_id is required"}
    body.setdefault("id", _new_card_id())
    row = await sb_request("POST", "cards", json=body, prefer="return=representation")
    if not row:
        return {"error": "Failed to create card"}
    return {"success": True, "card": row[0]}


@api.patch("/cards/{card_id}")
async def update_card(card_id: str, body: Dict[str, Any]):
    user_id = body.pop("user_id", None)
    if not user_id:
        return {"error": "Unauthorized"}
    existing = await sb_request(
        "GET", "cards", params={"id": f"eq.{card_id}", "select": "owner_id"}
    )
    if not existing or existing[0]["owner_id"] != user_id:
        return {"error": "Unauthorized"}
    row = await sb_request(
        "PATCH",
        "cards",
        params={"id": f"eq.{card_id}"},
        json=body,
        prefer="return=representation",
    )
    if not row:
        return {"error": "Failed to update card"}
    return {"success": True, "card": row[0]}


@api.delete("/cards/{card_id}")
async def delete_card(card_id: str, user_id: str):
    existing = await sb_request(
        "GET", "cards", params={"id": f"eq.{card_id}", "select": "owner_id"}
    )
    if not existing or existing[0]["owner_id"] != user_id:
        return {"error": "Unauthorized"}
    await sb_request("DELETE", "cards", params={"id": f"eq.{card_id}"}, prefer="return=minimal")
    return {"success": True}


# ─────────────────────────────────────────────────────────
# Chats
# ─────────────────────────────────────────────────────────
@api.get("/chats")
async def list_chats(card_id: str):
    rows = await sb_request(
        "GET",
        "chats",
        params={"card_id": f"eq.{card_id}", "order": "created_at.asc"},
    )
    return {"success": True, "messages": rows or []}


@api.post("/chats")
async def send_chat(body: Dict[str, Any]):
    if not body.get("card_id") or not body.get("message"):
        return {"error": "Card ID and message are required"}
    payload = {
        "card_id": body["card_id"],
        "participant_id": body.get("participant_id"),
        "message": body["message"],
        "is_from_owner": bool(body.get("is_from_owner", False)),
        "emoji_reaction": body.get("emoji_reaction"),
    }
    row = await sb_request("POST", "chats", json=payload, prefer="return=representation")
    if not row:
        return {"error": "Failed to send message"}
    return {"success": True, "message": row[0]}


# ─────────────────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────────────────
@api.get("/notifications")
async def list_notifications(user_id: str):
    rows = await sb_request(
        "GET",
        "notifications",
        params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
    )
    return rows or []


@api.post("/notifications")
async def create_notification(body: Dict[str, Any]):
    payload = {
        "user_id": body["user_id"],
        "type": body.get("type", "info"),
        "title": body.get("title", ""),
        "message": body.get("message", ""),
        "icon": body.get("icon", "🔔"),
        "read": False,
    }
    row = await sb_request(
        "POST", "notifications", json=payload, prefer="return=representation"
    )
    return row[0] if row else None


@api.patch("/notifications/{notif_id}")
async def mark_notification(notif_id: str, body: Dict[str, Any]):
    await sb_request(
        "PATCH",
        "notifications",
        params={"id": f"eq.{notif_id}"},
        json={"read": bool(body.get("read", True))},
        prefer="return=minimal",
    )
    return {"success": True}


# ─────────────────────────────────────────────────────────
# Mount
# ─────────────────────────────────────────────────────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
