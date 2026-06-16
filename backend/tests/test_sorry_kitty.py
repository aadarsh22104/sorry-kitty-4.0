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
        assert isinstance(data.get("sessionToken"), str) and len(data["sessionToken"]) > 0
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
        assert isinstance(demo_login.get("sessionToken"), str)

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
        # Session should be gone
        r2 = session_client.get(f"{API}/auth/session", headers={"Authorization": f"Bearer {token}"})
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
