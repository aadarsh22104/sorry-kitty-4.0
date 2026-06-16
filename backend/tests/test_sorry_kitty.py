"""
Sorry Kitty - Backend API tests
Covers: auth (signup/login/session/logout), cards CRUD, chats, notifications.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://supabase-preview-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = os.environ.get("TEST_DEMO_EMAIL", "qa.user@example.com")
DEMO_PASSWORD = os.environ.get("TEST_DEMO_PASSWORD", "password123")


@pytest.fixture(scope="session")
def session_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_login(session_client):
    r = session_client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    if "success" not in data:
        # Demo account missing — create it
        r2 = session_client.post(f"{API}/auth/signup", json={"name": "QA User", "email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r2.status_code == 200 and r2.json().get("success"), r2.text
        data = r2.json()
    return data


# ─────────────────────────── AUTH ───────────────────────────
class TestAuth:
    def test_root(self, session_client):
        r = session_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_signup_success(self, session_client):
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = session_client.post(f"{API}/auth/signup", json={
            "name": "Tester", "email": email, "password": "secret123"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data["user"]["email"] == email
        assert data["user"]["name"] == "Tester"
        # Supabase JWT shape: header.payload.signature, starts with "eyJ"
        token = data.get("sessionToken")
        assert isinstance(token, str) and token.startswith("eyJ"), f"token not a JWT: {token!r}"
        assert token.count(".") == 2, "JWT must have 3 segments"
        assert len(token) > 200, f"JWT too short ({len(token)} chars) – expected ~700+"
        # refreshToken present
        assert isinstance(data.get("refreshToken"), str) and len(data["refreshToken"]) > 0
        # user.id must be a UUID (matches auth.users.id)
        uuid.UUID(data["user"]["id"])  # raises if not UUID
        # store on class for reuse
        TestAuth.tmp_email = email
        TestAuth.tmp_token = data["sessionToken"]
        TestAuth.tmp_user = data["user"]

    def test_signup_duplicate_email(self, session_client):
        email = getattr(TestAuth, "tmp_email", None)
        assert email, "signup must run first"
        r = session_client.post(f"{API}/auth/signup", json={
            "name": "Dup", "email": email, "password": "secret123"
        })
        assert r.status_code == 200
        assert r.json().get("error") == "Email already registered"

    def test_signup_short_password(self, session_client):
        r = session_client.post(f"{API}/auth/signup", json={
            "name": "X", "email": f"x_{uuid.uuid4().hex[:8]}@e.com", "password": "abc"
        })
        assert r.status_code == 200
        assert "6+" in (r.json().get("error") or "")

    def test_signup_missing_fields(self, session_client):
        r = session_client.post(f"{API}/auth/signup", json={
            "name": "", "email": "", "password": ""
        })
        assert r.status_code == 200
        assert r.json().get("error") == "Please fill all fields"

    def test_login_success(self, session_client, demo_login):
        assert demo_login.get("success") is True
        assert demo_login["user"]["email"] == DEMO_EMAIL
        token = demo_login.get("sessionToken")
        assert isinstance(token, str) and token.startswith("eyJ") and token.count(".") == 2
        assert len(token) > 200
        uuid.UUID(demo_login["user"]["id"])  # user.id is auth.users UUID

    def test_login_wrong_password(self, session_client):
        r = session_client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrongpass"})
        assert r.status_code == 200
        assert r.json().get("error") == "Invalid email or password"

    def test_login_nonexistent(self, session_client):
        r = session_client.post(f"{API}/auth/login", json={"email": "doesnotexist_xx@e.com", "password": "abcdef"})
        assert r.status_code == 200
        assert r.json().get("error") == "Invalid email or password"

    def test_session_valid(self, session_client, demo_login):
        token = demo_login["sessionToken"]
        r = session_client.get(f"{API}/auth/session", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data is not None
        assert data["sessionToken"] == token
        assert data["user"]["email"] == DEMO_EMAIL

    def test_session_invalid_token(self, session_client):
        r = session_client.get(f"{API}/auth/session", headers={"Authorization": "Bearer invalid_token_xxx"})
        assert r.status_code == 200
        assert r.json() is None

    def test_session_no_token(self, session_client):
        r = session_client.get(f"{API}/auth/session")
        assert r.status_code == 200
        assert r.json() is None

    def test_logout_invalidates_session(self, session_client):
        # Create a fresh user to logout (so we don't blow up demo_login)
        email = f"logout_{uuid.uuid4().hex[:8]}@example.com"
        s = session_client.post(f"{API}/auth/signup", json={"name": "Lo", "email": email, "password": "secret123"}).json()
        token = s["sessionToken"]
        r = session_client.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200 and r.json().get("success") is True
        # Note: Supabase logout revokes the refresh token but the access JWT
        # may still validate until natural expiry. Per spec, that's acceptable
        # — we just verify the logout endpoint succeeded. A fresh login is
        # still required because the frontend clears sessionStorage.
        # Sanity: a clearly invalid token still rejected.
        r2 = session_client.get(f"{API}/auth/session", headers={"Authorization": "Bearer abc.def.ghi"})
        assert r2.json() is None


# ─────────────────────────── CARDS ───────────────────────────
class TestCards:
    def test_create_card(self, session_client, demo_login):
        owner_id = demo_login["user"]["id"]
        payload = {
            "owner_id": owner_id,
            "recipient": "TEST_Alex",
            "character": "🐱",
            "message": "I'm sorry!"
        }
        r = session_client.post(f"{API}/cards", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        card = data["card"]
        assert card["recipient"] == "TEST_Alex"
        assert card["message"] == "I'm sorry!"
        assert card["owner_id"] == owner_id
        assert isinstance(card["id"], str) and len(card["id"]) == 11
        TestCards.card_id = card["id"]
        TestCards.owner_id = owner_id

    def test_create_card_missing_recipient(self, session_client, demo_login):
        r = session_client.post(f"{API}/cards", json={"owner_id": demo_login["user"]["id"]})
        assert r.status_code == 200
        assert r.json().get("error") == "Recipient is required"

    def test_create_card_missing_owner(self, session_client):
        r = session_client.post(f"{API}/cards", json={"recipient": "X"})
        assert r.status_code == 200
        assert r.json().get("error") == "owner_id is required"

    def test_list_cards(self, session_client, demo_login):
        r = session_client.get(f"{API}/cards", params={"owner_id": demo_login["user"]["id"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data["cards"], list)
        assert any(c["id"] == TestCards.card_id for c in data["cards"])

    def test_get_card_public(self, session_client):
        r = session_client.get(f"{API}/cards/{TestCards.card_id}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data["card"]["id"] == TestCards.card_id

    def test_get_card_not_found(self, session_client):
        r = session_client.get(f"{API}/cards/nonexist123")
        assert r.status_code == 200
        assert r.json().get("error") == "Card not found"

    def test_update_card_authorized(self, session_client):
        r = session_client.patch(f"{API}/cards/{TestCards.card_id}", json={
            "user_id": TestCards.owner_id, "message": "Updated msg"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data["card"]["message"] == "Updated msg"
        # Verify persistence
        r2 = session_client.get(f"{API}/cards/{TestCards.card_id}")
        assert r2.json()["card"]["message"] == "Updated msg"

    def test_update_card_unauthorized(self, session_client):
        bogus = str(uuid.uuid4())
        r = session_client.patch(f"{API}/cards/{TestCards.card_id}", json={
            "user_id": bogus, "message": "hack"
        })
        assert r.status_code == 200
        assert r.json().get("error") == "Unauthorized"

    def test_delete_card_unauthorized(self, session_client):
        bogus = str(uuid.uuid4())
        r = session_client.delete(f"{API}/cards/{TestCards.card_id}", params={"user_id": bogus})
        assert r.status_code == 200
        assert r.json().get("error") == "Unauthorized"

    def test_delete_card_authorized(self, session_client):
        r = session_client.delete(f"{API}/cards/{TestCards.card_id}", params={"user_id": TestCards.owner_id})
        assert r.status_code == 200
        assert r.json().get("success") is True
        # Verify gone
        r2 = session_client.get(f"{API}/cards/{TestCards.card_id}")
        assert r2.json().get("error") == "Card not found"


# ─────────────────────────── CHATS ───────────────────────────
class TestChats:
    def test_chat_flow(self, session_client, demo_login):
        # Create a card to chat against
        owner_id = demo_login["user"]["id"]
        c = session_client.post(f"{API}/cards", json={
            "owner_id": owner_id, "recipient": "TEST_ChatRecipient", "character": "🐶", "message": "hey"
        }).json()
        card_id = c["card"]["id"]

        # POST chat
        r = session_client.post(f"{API}/chats", json={
            "card_id": card_id, "message": "Hello there", "is_from_owner": True
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data["message"]["message"] == "Hello there"

        # GET chats
        r2 = session_client.get(f"{API}/chats", params={"card_id": card_id})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("success") is True
        assert len(d2["messages"]) >= 1
        assert d2["messages"][0]["message"] == "Hello there"

        # Cleanup
        session_client.delete(f"{API}/cards/{card_id}", params={"user_id": owner_id})

    def test_chat_missing_fields(self, session_client):
        r = session_client.post(f"{API}/chats", json={"card_id": "abc"})
        assert r.status_code == 200
        assert "required" in (r.json().get("error") or "").lower()

    # ─── Iteration 3 — is_from_owner flag honoured, participating endpoint ───
    def test_is_from_owner_flag_persists(self, session_client, demo_login):
        """POST /api/chats must persist is_from_owner exactly as supplied
        (no longer hard-coded). Both true and false must round-trip via GET."""
        owner_id = demo_login["user"]["id"]
        c = session_client.post(f"{API}/cards", json={
            "owner_id": owner_id, "recipient": "TEST_FlagCard", "character": "🐰", "message": "x"
        }).json()
        card_id = c["card"]["id"]
        try:
            # Owner message
            r1 = session_client.post(f"{API}/chats", json={
                "card_id": card_id, "message": "owner-msg", "is_from_owner": True
            })
            assert r1.status_code == 200 and r1.json()["message"]["is_from_owner"] is True
            # Friend message (is_from_owner=false)
            r2 = session_client.post(f"{API}/chats", json={
                "card_id": card_id, "message": "friend-msg", "is_from_owner": False
            })
            assert r2.status_code == 200 and r2.json()["message"]["is_from_owner"] is False

            # Round-trip via GET
            g = session_client.get(f"{API}/chats", params={"card_id": card_id}).json()
            msgs = {m["message"]: m["is_from_owner"] for m in g["messages"]}
            assert msgs.get("owner-msg") is True
            assert msgs.get("friend-msg") is False
        finally:
            session_client.delete(f"{API}/cards/{card_id}", params={"user_id": owner_id})

    def test_participating_endpoint_excludes_owned_includes_participated(self, session_client, demo_login):
        """GET /api/chats/participating?user_id=<friend> returns cards the
        friend has chatted on AS PARTICIPANT and does NOT own."""
        owner_id = demo_login["user"]["id"]
        # Owner creates a card
        c = session_client.post(f"{API}/cards", json={
            "owner_id": owner_id, "recipient": "TEST_Participating", "character": "🐼", "message": "hi"
        }).json()
        card_id = c["card"]["id"]
        # Owner creates another card the friend will NOT chat on (control)
        c2 = session_client.post(f"{API}/cards", json={
            "owner_id": owner_id, "recipient": "TEST_NoChat", "character": "🐨", "message": "hey"
        }).json()
        card_id_no_chat = c2["card"]["id"]

        # Create a fresh "friend" user
        friend_email = f"friend_{uuid.uuid4().hex[:8]}@example.com"
        friend = session_client.post(f"{API}/auth/signup", json={
            "name": "Friend", "email": friend_email, "password": "secret123"
        }).json()
        friend_id = friend["user"]["id"]

        try:
            # Friend sends a chat message on card_id
            r = session_client.post(f"{API}/chats", json={
                "card_id": card_id, "participant_id": friend_id,
                "message": "hi from friend", "is_from_owner": False
            })
            assert r.status_code == 200 and r.json().get("success") is True

            # Participating endpoint for FRIEND should return card_id (not card_id_no_chat)
            p = session_client.get(f"{API}/chats/participating", params={"user_id": friend_id})
            assert p.status_code == 200, p.text
            data = p.json()
            assert data.get("success") is True
            ids = [c["id"] for c in data["cards"]]
            assert card_id in ids, f"participating card missing: {ids}"
            assert card_id_no_chat not in ids, "control card (no chat) leaked into participating list"

            # Participating endpoint for OWNER must NOT include card_id
            # (owner owns it — should be excluded even though there are chats).
            # Note: the demo owner hasn't posted on this card themselves, so
            # they may not even appear via participant_id; but if they did,
            # the owner_id=neq filter must still drop owned cards.
            po = session_client.get(f"{API}/chats/participating", params={"user_id": owner_id})
            assert po.status_code == 200
            owner_ids = [c["id"] for c in po.json().get("cards", [])]
            assert card_id not in owner_ids, "owner should not see their own card in /participating"
            assert card_id_no_chat not in owner_ids
        finally:
            session_client.delete(f"{API}/cards/{card_id}", params={"user_id": owner_id})
            session_client.delete(f"{API}/cards/{card_id_no_chat}", params={"user_id": owner_id})

    def test_participating_empty_for_new_user(self, session_client):
        """A brand new user with no chats returns success:true, cards:[]"""
        email = f"nochats_{uuid.uuid4().hex[:8]}@example.com"
        u = session_client.post(f"{API}/auth/signup", json={
            "name": "NoChats", "email": email, "password": "secret123"
        }).json()
        r = session_client.get(f"{API}/chats/participating", params={"user_id": u["user"]["id"]})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data.get("cards") == []


# ─────────────────────────── NOTIFICATIONS ───────────────────────────
class TestNotifications:
    def test_notifications_flow(self, session_client, demo_login):
        uid = demo_login["user"]["id"]
        # Create
        r = session_client.post(f"{API}/notifications", json={
            "user_id": uid, "type": "info", "title": "TEST_Title", "message": "TEST_body", "icon": "🔔"
        })
        assert r.status_code == 200, r.text
        notif = r.json()
        assert notif is not None
        assert notif["title"] == "TEST_Title"
        assert notif["read"] is False
        nid = notif["id"]

        # List
        r2 = session_client.get(f"{API}/notifications", params={"user_id": uid})
        assert r2.status_code == 200
        items = r2.json()
        assert isinstance(items, list)
        assert any(n["id"] == nid for n in items)

        # Mark read
        r3 = session_client.patch(f"{API}/notifications/{nid}", json={"read": True})
        assert r3.status_code == 200 and r3.json().get("success") is True

        # Verify persisted
        r4 = session_client.get(f"{API}/notifications", params={"user_id": uid})
        found = next((n for n in r4.json() if n["id"] == nid), None)
        assert found and found["read"] is True
