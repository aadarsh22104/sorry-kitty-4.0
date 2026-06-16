# Sorry Kitty — PRD

## Original Problem Statement
User uploaded `adaptable-greetings-hub-main.zip` (a Lovable.dev TanStack Start + Vite project,
codenamed "Sorry Kitty") along with Supabase project credentials
(`https://bgmdmnduhkcygnrhbvjf.supabase.co` plus anon + service-role keys). They asked:
> "now u have every single thing i have given u the project and everything,
>  now i wanted u to correct everything and connect with the backend properly"

User choices captured via `ask_human`:
- App type: **greeting / direct real-time chat website**
- Tables: **use what's already in Supabase or auto-create from schema**
- Auth: **email/password (Supabase Auth not required)**
- Backend: **FastAPI between the frontend and Supabase**
- Specific issues: review and connect everything end-to-end

## Architecture
- **Frontend** (`/app/frontend`)
  - TanStack Start + Vite dev server on port 3000.
  - React shell at `/` simply renders an iframe pointing at `/sorry-kitty.html`,
    a vanilla HTML/CSS/JS app (modular files in `public/sorry-kitty/`).
  - All DB access goes through `window.DB` (`public/sorry-kitty/js/01-db.js`),
    which talks only to `/api/*` on the same origin.
  - Vite is configured with `allowedHosts: true`, `strictPort: 3000`, host `0.0.0.0`,
    and HMR via `wss://...:443`.
- **Backend** (`/app/backend/server.py`)
  - FastAPI on port 8001, all routes prefixed `/api`.
  - Uses `httpx` to talk to Supabase PostgREST with the **service_role** key,
    bypassing RLS. Service key is server-side only.
  - Endpoints:
    - `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/logout`
    - `GET  /api/auth/session` (reads `Authorization: Bearer <sessionToken>`)
    - `GET/POST /api/cards`, `GET/PATCH/DELETE /api/cards/{id}`
    - `GET/POST /api/chats`
    - `GET/POST /api/notifications`, `PATCH /api/notifications/{id}`
- **Supabase**
  - Project: `bgmdmnduhkcygnrhbvjf`
  - Tables already provisioned: `users`, `user_stats`, `cards`, `chats`,
    `notifications`, `sessions`, `activity_log`. RLS is enabled with no policies,
    but the backend talks via service_role so writes succeed.

## User Personas
1. **Sender** — creates an account, designs an animated apology card with a chosen
   character/emoji/treat/theme, copies the share link, sends it.
2. **Recipient** — opens the public share link (no account needed) and goes through
   the animated kitty viewer ending in a smile/forgive flow.
3. **Both** — once the recipient interacts, the sender sees activity in
   notifications and can chat through the "Moment" view.

## Core Requirements (static)
- Email/password sign-up & login
- Persistent session (Supabase `sessions` table; token in `sessionStorage`)
- CRUD for greeting cards (11-char nano-style IDs for short URLs)
- Public share URL (`/sorry-kitty.html#card=<id>`) requires no auth
- Chat messages per card
- In-app notifications (welcome, card-saved, etc.)
- Frontend never receives the Supabase service key

## What's been implemented (2026-06-16)
- Replaced the existing CRA frontend in `/app/frontend` with the TanStack Start project
  and configured it to run on port 3000 via supervisor (`yarn start`).
- Installed Node.js 22 to satisfy TanStack Start's engine requirement.
- Built a complete FastAPI proxy backend (`/app/backend/server.py`) implementing
  auth, cards, chats, notifications using the Supabase service_role key.
- Rewrote `public/sorry-kitty/js/01-db.js` to call `/api/*` via `fetch` (no more
  `@supabase/supabase-js` in the browser).
- Updated `10-bootstrap.js` (no more OAuth check), `04-cards.js`
  (`confirmDeleteCard` via API), `09-kitty-game.js` (`loadFromHash` is now async
  and uses `DB.getCard`), and removed the Google login buttons from
  `body.html` (OAuth not configured per user's choice).
- Removed `SUPABASE_SERVICE_ROLE_KEY` from `frontend/.env`.
- Tightened `PATCH /api/cards/{id}` to require `user_id` and reject when absent.
- Demo account provisioned: `qa.user@example.com` / `password123`.

## QA status
- Backend pytest suite: **25/25 passing** (auth, cards CRUD with owner-check,
  chats, notifications) — see `/app/test_reports/iteration_1.json`.
- Frontend E2E: signup → dashboard, create card → cards list, public share link
  → kitty viewer all verified by the testing agent.

## Prioritized backlog
- **P1** — Real-time chat updates (currently a polled fetch). Wire up Supabase
  Realtime subscription via the backend (WebSocket bridge) or use Supabase JS
  with a dedicated anon-readable view + RLS policy.
- **P1** — Replace base64 password "hash" with bcrypt/argon2 + per-user salt.
- **P2** — Periodic cleanup of expired sessions.
- **P2** — Standardise API envelope (notifications endpoints currently return
  bare arrays while others use `{success, ...}`).
- **P2** — Rate limit `/api/auth/login`.
- **P3** — Add Supabase Google OAuth (UI was removed; reintroduce once provider
  is configured in dashboard).

## Next tasks
- Optional UX: surface the Save bar at the bottom of the Create form so users
  don't have to scroll back up.
- Optional ENHANCEMENT (engagement): when a recipient opens a shared card link,
  ping the sender via the existing `notifications` table — instant
  "Sarah just opened your card 💌" — which is a low-effort change that meaningfully
  improves the apology-card emotional loop.
