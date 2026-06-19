"""
Sorry Kitty backend.

- Auth is delegated to Supabase Auth (auth.users), so accounts appear in
  Supabase Dashboard → Authentication → Users.
- DB tables (cards, chats, notifications, user_stats, profile rows in
  public.users) are still accessed via PostgREST with the service_role key.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, Dict
from pathlib import Path
import os
import secrets
import logging
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

SUPABASE_REST = f"{SUPABASE_URL}/rest/v1"
SUPABASE_AUTH = f"{SUPABASE_URL}/auth/v1"

app = FastAPI()
api = APIRouter(prefix="/api")

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Backend is running securely!"}

logger = logging.getLogger("sorry-kitty")
logging.basicConfig(level=logging.INFO)


# ─────────────────────────────────────────────────────────
# Supabase HTTP helpers
# ─────────────────────────────────────────────────────────
_rest_headers = {
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
    headers = dict(_rest_headers)
    if prefer:
        headers["Prefer"] = prefer
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(method, url, params=params, json=json, headers=headers)
    if resp.status_code >= 400:
        logger.error("Supabase REST error %s %s: %s", method, table, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    if not resp.content:
        return None
    try:
        return resp.json()
    except Exception:
        return resp.text


async def auth_request(method: str, path: str, *, json: Any = None, anon: bool = False) -> httpx.Response:
    """Hit /auth/v1/* with the right key. anon=True uses the public anon key
    (required for /token + /signup), otherwise the service_role key (required
    for /admin/*)."""
    key = SUPABASE_ANON_KEY if anon else SUPABASE_SERVICE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        return await client.request(method, f"{SUPABASE_AUTH}{path}", json=json, headers=headers)


# ─────────────────────────────────────────────────────────
# Profile helpers (public.users mirrors auth.users by id)
# ─────────────────────────────────────────────────────────
async def upsert_profile(user_id: str, email: str, name: str, avatar: str) -> Dict[str, Any]:
    """Create or update the public.users row that mirrors an auth.users row."""
    existing = await sb_request("GET", "users", params={"id": f"eq.{user_id}", "select": "id"})
    if existing:
        await sb_request(
            "PATCH",
            "users",
            params={"id": f"eq.{user_id}"},
            json={"email": email, "name": name, "avatar": avatar},
            prefer="return=minimal",
        )
    else:
        await sb_request(
            "POST",
            "users",
            json={
                "id": user_id,
                "email": email,
                "name": name,
                "avatar": avatar,
                # NOT NULL column — Supabase Auth manages the real password.
                "password_hash": "managed_by_supabase_auth",
            },
            prefer="return=minimal",
        )
        await sb_request(
            "POST",
            "user_stats",
            json={"user_id": user_id, "cards_created": 0, "cards_sent": 0, "smiles_received": 0},
            prefer="return=minimal",
        )
    return {"id": user_id, "email": email, "name": name, "avatar": avatar}


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
    name = body.name.strip()
    avatar = body.avatar or "🐱"

    # 1. Create the user in auth.users via the admin API (auto-confirmed
    #    so the user can log in immediately without email verification).
    admin_resp = await auth_request(
        "POST",
        "/admin/users",
        json={
            "email": email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"name": name, "avatar": avatar},
        },
    )
    if admin_resp.status_code >= 400:
        err = admin_resp.json() if admin_resp.content else {}
        msg = err.get("msg") or err.get("message") or ""
        if "already" in msg.lower() or admin_resp.status_code == 422:
            return {"error": "Email already registered"}
        logger.error("auth admin create failed %s: %s", admin_resp.status_code, admin_resp.text)
        return {"error": "Failed to create account"}

    auth_user = admin_resp.json()
    user_id = auth_user["id"]

    # 2. Mirror to public.users for FK-referenced data (cards, chats, etc).
    await upsert_profile(user_id, email, name, avatar)

    # 3. Log them in to get an access token.
    token_resp = await auth_request(
        "POST",
        "/token?grant_type=password",
        json={"email": email, "password": body.password},
        anon=True,
    )
    if token_resp.status_code >= 400:
        logger.error("auth token after signup failed: %s", token_resp.text)
        return {"error": "Signed up, please log in"}

    tokens = token_resp.json()
    return {
        "success": True,
        "user": {"id": user_id, "email": email, "name": name, "avatar": avatar},
        "sessionToken": tokens["access_token"],
        "refreshToken": tokens.get("refresh_token"),
    }


@api.post("/auth/login")
async def login(body: LoginBody):
    if not body.email or not body.password:
        return {"error": "Please fill all fields"}
    email = body.email.lower().strip()

    token_resp = await auth_request(
        "POST",
        "/token?grant_type=password",
        json={"email": email, "password": body.password},
        anon=True,
    )
    if token_resp.status_code >= 400:
        return {"error": "Invalid email or password"}

    tokens = token_resp.json()
    auth_user = tokens.get("user", {})
    user_id = auth_user.get("id")
    if not user_id:
        return {"error": "Invalid email or password"}

    meta = auth_user.get("user_metadata") or {}
    name = meta.get("name") or auth_user.get("email", "").split("@")[0]
    avatar = meta.get("avatar") or "🐱"

    # Ensure the public.users row exists (covers users that were created
    # directly in the Supabase Auth dashboard).
    profile = await upsert_profile(user_id, auth_user.get("email", email), name, avatar)

    return {
        "success": True,
        "user": profile,
        "sessionToken": tokens["access_token"],
        "refreshToken": tokens.get("refresh_token"),
    }


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    token = (authorization or "").replace("Bearer ", "").strip()
    if not token:
        return {"success": True}
    # Best-effort revoke; ignore failures (token may already be expired).
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(
            f"{SUPABASE_AUTH}/logout",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
    return {"success": True}


@api.get("/auth/session")
async def session(authorization: Optional[str] = Header(None)):
    token = (authorization or "").replace("Bearer ", "").strip()
    if not token:
        return None
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{SUPABASE_AUTH}/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
            },
        )
    if resp.status_code >= 400:
        return None
    auth_user = resp.json()
    user_id = auth_user.get("id")
    if not user_id:
        return None
    meta = auth_user.get("user_metadata") or {}
    name = meta.get("name") or auth_user.get("email", "").split("@")[0]
    avatar = meta.get("avatar") or "🐱"
    profile = await upsert_profile(user_id, auth_user.get("email", ""), name, avatar)
    return {"user": profile, "sessionToken": token}


# ─────────────────────────────────────────────────────────
# Cards
# ─────────────────────────────────────────────────────────
def _new_card_id() -> str:
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


@api.get("/chats/participating")
async def list_participating_cards(user_id: str):
    """Cards the user has chatted on as a participant (i.e. shared cards they
    interacted with but don't own). Used to populate the friend's Chat tab."""
    chats = await sb_request(
        "GET",
        "chats",
        params={"participant_id": f"eq.{user_id}", "select": "card_id"},
    )
    ids = sorted({c["card_id"] for c in (chats or []) if c.get("card_id")})
    if not ids:
        return {"success": True, "cards": []}
    cards = await sb_request(
        "GET",
        "cards",
        params={
            "id": f"in.({','.join(ids)})",
            "owner_id": f"neq.{user_id}",  # exclude cards the user owns
            "order": "created_at.desc",
        },
    )
    return {"success": True, "cards": cards or []}


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
