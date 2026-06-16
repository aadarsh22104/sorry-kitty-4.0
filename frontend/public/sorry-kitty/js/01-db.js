// ══════════════════════════════════════════════════════
// DB ENGINE — talks to our FastAPI backend (/api/*).
// The backend uses the Supabase service_role key server-side
// so the frontend never needs to deal with RLS or Supabase keys.
// ══════════════════════════════════════════════════════

const API_BASE = (function () {
  // The iframe lives on the same origin as the React shell, which
  // proxies /api/* to the FastAPI backend. window.parent has the
  // same URL so window.location.origin is the right base.
  return window.location.origin + '/api';
})();

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = sessionStorage.getItem('sk_session');
  if (token && !headers.Authorization) headers.Authorization = 'Bearer ' + token;
  try {
    const resp = await fetch(API_BASE + path, { ...opts, headers });
    const text = await resp.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!resp.ok) {
      console.error('API error', resp.status, path, body);
      return { error: (body && body.detail) || 'Request failed' };
    }
    return body;
  } catch (e) {
    console.error('Network error', e);
    return { error: 'Network error' };
  }
}

const DB = {
  // ── Session management ────────────────────────────────
  async getSession() {
    const token = sessionStorage.getItem('sk_session');
    if (!token) return null;
    const data = await apiFetch('/auth/session', { method: 'GET' });
    if (!data || data.error) {
      sessionStorage.removeItem('sk_session');
      return null;
    }
    return data;
  },
  async setSession(token) {
    sessionStorage.setItem('sk_session', token);
  },
  async clearSession() {
    const token = sessionStorage.getItem('sk_session');
    if (token) {
      await apiFetch('/auth/logout', { method: 'POST' });
    }
    sessionStorage.removeItem('sk_session');
  },

  // ── Nano ID generation for cards ──────────────────────
  mkId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // ── Auth ──────────────────────────────────────────────
  async signup(data) {
    return apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        avatar: data.avatar || '🐱',
      }),
    });
  },

  async login(data) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
  },

  async loginWithGoogle() {
    // Google OAuth requires extra configuration in the Supabase
    // dashboard (provider + redirect URIs). Surface a clear message
    // rather than failing silently.
    return { error: 'Google login is not configured. Use email/password.' };
  },

  // ── Cards ─────────────────────────────────────────────
  async getCards(userId) {
    if (!userId) return { success: true, cards: [] };
    return apiFetch('/cards?owner_id=' + encodeURIComponent(userId));
  },

  async createCard(data) {
    return apiFetch('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCard(cardId) {
    return apiFetch('/cards/' + encodeURIComponent(cardId));
  },

  async updateCard(cardId, data) {
    return apiFetch('/cards/' + encodeURIComponent(cardId), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCard(cardId, userId) {
    return apiFetch(
      '/cards/' + encodeURIComponent(cardId) + '?user_id=' + encodeURIComponent(userId),
      { method: 'DELETE' }
    );
  },

  // ── Chat ──────────────────────────────────────────────
  async getChatMessages(cardId) {
    return apiFetch('/chats?card_id=' + encodeURIComponent(cardId));
  },

  async sendChatMessage(data) {
    return apiFetch('/chats', { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Notifications ─────────────────────────────────────
  async getNotifs(userId) {
    if (!userId) return [];
    const data = await apiFetch('/notifications?user_id=' + encodeURIComponent(userId));
    if (!data || data.error) return [];
    return Array.isArray(data) ? data : [];
  },

  async saveNotifs(notificationData) {
    return apiFetch('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  },

  async markNotifAsRead(notificationId, _userId) {
    const r = await apiFetch('/notifications/' + encodeURIComponent(notificationId), {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    });
    return r && !r.error;
  },
};

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
let CU = null; // current user
let editCardId = null;
let selChar = 'cat';
let selTreats = ['🍫','🥐','🍪','🎂'];
let selTheme = { bg: '#fdf3e7', ac: '#3d1a00', a2: '#c4822a', tx: '#6b3a1f' };
let selFont = 'Nunito';
let cardOpts = { runaway: true, treats: true, mood: true, stripe: true, floaties: true, stars: true, trail: true };
let curChatId = null;
let viewCardData = null;
// Kitty viewer state
let kpC=[0,0,0,0,0,0], kfed=0, krunN=0, krunning=false, kmoodV=20, ktrailOn=false, kqGoing=false, kqTimer, kq5Timer;
