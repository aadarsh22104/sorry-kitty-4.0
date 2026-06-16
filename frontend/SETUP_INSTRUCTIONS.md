# Setup Instructions for Sorry Kitty with Supabase

## ✅ What's Been Done

The backend and frontend have been configured to use Supabase instead of localStorage.

### Backend (Complete)
- ✅ Database schema defined in `db/schema.sql`
- ✅ Supabase client configuration in `src/lib/supabase/client.ts` and `server.ts`
- ✅ API functions for auth, cards, chat, notifications in `src/lib/api/`
- ✅ Server actions in `src/lib/api/server-actions.ts`

### Frontend (Updated)
- ✅ Removed localStorage usage from `public/sorry-kitty/js/01-db.js`
- ✅ Session management now uses Supabase sessions table
- ✅ Notifications now use Supabase notifications table
- ✅ Updated all async function calls to handle Supabase operations
- ✅ Supabase credentials already configured in `public/sorry-kitty.html`

## 🚀 Manual Setup Steps

### Step 1: Apply Database Schema to Supabase

⚠️ **IMPORTANT: This step is required before the app will work**

You need to apply the database schema to your Supabase project manually:

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Select your project: `bgmdmnduhkcygnrhbvjf`
3. Navigate to SQL Editor in the left sidebar
4. Copy the entire contents of `db/schema.sql` (239 lines)
5. Paste it into the SQL Editor
6. Click "Run" to execute the schema

This will create all necessary tables:
- users
- user_stats
- cards
- chats
- notifications
- sessions
- activity_log

Plus views, triggers, and functions.

**Option B: Using Supabase CLI**
```bash
supabase login
supabase link --project-ref bgmdmnduhkcygnrhbvjf
supabase db push
```

### Step 1.5: Configure Google OAuth (for Google Login)

To enable Google login:

**In Google Cloud Console:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add these Authorized redirect URIs:
   - `https://bgmdmnduhkcygnrhbvjf.supabase.co/auth/v1/callback`
   - `http://localhost:8080` (for local development)
4. Save and copy the Client ID and Secret

**In Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project: `bgmdmnduhkcygnrhbvjf`
3. Navigate to **Authentication** → **Providers**
4. Enable **Google** provider
5. Add the Google OAuth credentials (Client ID and Secret from above)
6. Navigate to **Authentication** → **URL Configuration**
7. Add these Site URLs:
   - `http://localhost:8080` (for local development)
   - Your production URL when deployed
8. Save the configuration

### Step 2: Configure Environment Variables

The `.env.local` file is gitignored, so you need to create it manually:

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. The `.env.example` already has all your credentials configured:
```env
VITE_SUPABASE_URL=https://bgmdmnduhkcygnrhbvjf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbWRtbmR1aGtjeWducmhidmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzM5NzYsImV4cCI6MjA5NzEwOTk3Nn0.6meHeBmVuXLq9tdRdy8guDaXChOc8PxTb8v_arR1g_o
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbWRtbmR1aGtjeWducmhidmpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUzMzk3NiwiZXhwIjoyMDk3MTA5OTc2fQ.T5QMYZjIl9V62BKaq940gc6moUIHnXx1x-Ys7U1EfxI
```

✅ Environment variables are now configured!

### Step 3: Install Dependencies (if needed)

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

## 🔍 Verification

To verify everything is working:

1. Open http://localhost:5173
2. Try signing up for a new account
3. Create a card
4. Check that notifications work
5. Verify that session persists across page refreshes (using Supabase, not localStorage)

## 📝 Changes Made

### Files Modified:
- `public/sorry-kitty/js/01-db.js` - Replaced localStorage with Supabase for sessions and notifications
- `public/sorry-kitty/js/02-panels-auth.js` - Updated auth functions to be async
- `public/sorry-kitty/js/03-app-init.js` - Updated app initialization to handle async operations
- `public/sorry-kitty/js/05-notifications.js` - Updated notification functions to use Supabase
- `public/sorry-kitty/js/10-bootstrap.js` - Updated bootstrap to use async session loading

### Key Changes:
- Session management: localStorage → Supabase sessions table + sessionStorage for token
- Notifications: localStorage → Supabase notifications table
- All DB methods are now async where needed
- Session verification happens on app load via Supabase

## 🎯 Next Steps

After completing the manual setup:
1. Test the authentication flow (signup/login/logout)
2. Test card creation and viewing
3. Test notifications
4. Test chat functionality
5. Verify public card sharing works

## 🔒 Security Notes

- Password hashing uses base64 (for development) - upgrade to bcrypt for production
- Session tokens are stored in sessionStorage (cleared on browser close)
- All session verification happens server-side via Supabase
- No sensitive data is stored in localStorage anymore
