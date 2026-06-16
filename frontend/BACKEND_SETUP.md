# Sorry Kitty - Backend Setup Guide

This guide will help you set up the complete backend for the Sorry Kitty greeting card application using Supabase.

## 📋 Prerequisites

- Node.js installed
- Supabase account and project created
- Supabase project URL and keys

## 🚀 Setup Steps

### 1. Apply Database Schema to Supabase

The database schema is located in `db/schema.sql`. You need to apply it to your Supabase project.

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `db/schema.sql`
4. Paste and run the SQL script

**Option B: Using Supabase CLI**
```bash
supabase login
supabase link --project-ref bgmdmnduhkcygnrhbvjf
supabase db push
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://bgmdmnduhkcygnrhbvjf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbWRtbmR1aGtjeWducmhidmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzM5NzYsImV4cCI6MjA5NzEwOTk3Nn0.6meHeBmVuXLq9tdRdy8guDaXChOc8PxTb8v_arR1g_o
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** Get your service role key from Supabase Dashboard → Project Settings → API

### 3. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install @supabase/supabase-js @supabase/ssr nanoid
```

## 📁 Backend Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server Supabase client
│   └── api/
│       ├── auth.ts          # Authentication functions
│       ├── cards.ts         # Card CRUD operations
│       ├── chat.ts          # Chat system functions
│       ├── notifications.ts # Notification functions
│       └── server-actions.ts # TanStack Start server actions
```

## 🔐 Authentication System

### Features
- User signup with email/password
- User login with session management
- Session verification
- Secure password hashing (base64 - upgrade to bcrypt in production)

### API Functions

**Signup**
```typescript
import { signupAction } from '@/lib/api/server-actions';

const result = await signupAction({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
  avatar: "🐱"
});
```

**Login**
```typescript
import { loginAction } from '@/lib/api/server-actions';

const result = await loginAction({
  email: "john@example.com",
  password: "securepassword"
});
```

**Logout**
```typescript
import { logoutAction } from '@/lib/api/server-actions';

await logoutAction({ sessionToken: "your-session-token" });
```

## 🎴 Card System

### Features
- Create cards with Nano ID (11-char short links)
- Full customization (character, theme, animations)
- CRUD operations
- Public card viewing without authentication
- Card sharing with link generation

### Nano ID Generation
Cards use 11-character Nano IDs for short, shareable links:
- Example: `aB3kR9xQmTz`
- Public URL: `/card/aB3kR9xQmTz`
- No login required to view

### API Functions

**Create Card**
```typescript
import { createCardAction } from '@/lib/api/server-actions';

const result = await createCardAction({
  owner_id: "user-uuid",
  recipient: "Jane",
  sender: "John",
  character: "cat",
  message: "I'm sorry!",
  theme_bg: "#fdf3e7",
  // ... other card options
});
```

**Get User Cards**
```typescript
import { getUserCardsAction } from '@/lib/api/server-actions';

const result = await getUserCardsAction({ userId: "user-uuid" });
```

**Update Card**
```typescript
import { updateCardAction } from '@/lib/api/server-actions';

const result = await updateCardAction({
  cardId: "aB3kR9xQmTz",
  userId: "user-uuid",
  cardData: { message: "Updated message" }
});
```

**Delete Card**
```typescript
import { deleteCardAction } from '@/lib/api/server-actions';

await deleteCardAction({
  cardId: "aB3kR9xQmTz",
  userId: "user-uuid"
});
```

## 💬 Chat System

### Features
- Real-time messaging per card
- Message history
- Emoji reactions
- Participant tracking
- Message ownership verification

### API Functions

**Send Message**
```typescript
import { sendChatMessageAction } from '@/lib/api/server-actions';

const result = await sendChatMessageAction({
  card_id: "aB3kR9xQmTz",
  participant_id: "user-uuid",
  message: "Hello!",
  is_from_owner: true,
  emoji_reaction: "❤️"
});
```

**Get Chat Messages**
```typescript
import { getChatMessagesAction } from '@/lib/api/server-actions';

const result = await getChatMessagesAction({
  cardId: "aB3kR9xQmTz",
  userId: "user-uuid"
});
```

**Get Card Chats Summary**
```typescript
import { getCardChatsSummaryAction } from '@/lib/api/server-actions';

const result = await getCardChatsSummaryAction({ userId: "user-uuid" });
```

## 🔔 Notification System

### Features
- Real-time notifications
- Read/unread status
- Notification types (card saved, shared, new message)
- Bulk mark as read
- Unread count tracking

### API Functions

**Create Notification**
```typescript
import { createNotificationAction } from '@/lib/api/server-actions';

const result = await createNotificationAction({
  user_id: "user-uuid",
  type: "card_saved",
  title: "Card saved! 🎉",
  message: "Your card is ready",
  icon: "🐱"
});
```

**Get User Notifications**
```typescript
import { getUserNotificationsAction } from '@/lib/api/server-actions';

const result = await getUserNotificationsAction({
  userId: "user-uuid",
  unreadOnly: false
});
```

**Mark as Read**
```typescript
import { markNotificationAsReadAction } from '@/lib/api/server-actions';

await markNotificationAsReadAction({
  notificationId: "notif-uuid",
  userId: "user-uuid"
});
```

**Get Unread Count**
```typescript
import { getUnreadCountAction } from '@/lib/api/server-actions';

const result = await getUnreadCountAction({ userId: "user-uuid" });
```

## 🌐 Public Card Viewing

The route `/card/[id]` allows public viewing of cards without authentication:

- **Route**: `src/routes/card.$id.tsx`
- **URL Pattern**: `/card/aB3kR9xQmTz`
- **Access**: No login required
- **Features**: Full card display with animations and styling

## 🔧 Database Schema

### Tables Created

1. **users** - User accounts and profiles
2. **user_stats** - User statistics (cards created, sent, smiles)
3. **cards** - Greeting cards with Nano ID primary keys
4. **chats** - Chat messages per card
5. **notifications** - User notifications
6. **sessions** - User session management
7. **activity_log** - Activity tracking

### Views Created

1. **cards_with_owner** - Cards with owner information
2. **user_cards_summary** - User card statistics
3. **unread_notifications** - Unread notifications with user info

### Triggers

- Auto-update `updated_at` timestamps
- Auto-increment card creation stats

## 🎨 Card Customization Options

### Characters
cat, panda, bear, penguin, fox, bunny, dog, frog, lion, koala

### Theme Options
- Background color
- Accent color
- Secondary accent color
- Text color
- Font family

### Animation Options
- runaway, treats, mood, stripe, floaties, stars, trail

### Content Options
- Treats (emoji array)
- Floaties (emoji array)
- Confetti (emoji array)
- Quotes (text array)
- Custom messages and buttons

## 🔒 Security Notes

### Current Implementation
- Password hashing: Base64 (for development)
- Session management: 30-day expiration
- Authorization checks on all mutations

### Production Recommendations
1. **Upgrade password hashing**: Use bcrypt or Argon2
2. **Add rate limiting**: Prevent abuse of API endpoints
3. **Implement CSRF protection**: For form submissions
4. **Add input validation**: Server-side validation for all inputs
5. **Enable RLS policies**: Row-level security in Supabase
6. **Use HTTPS**: Ensure all communications are encrypted
7. **Add email verification**: Confirm user email addresses
8. **Implement password reset**: Secure password recovery flow

## 📝 Usage Example

```typescript
import { signupAction, loginAction, createCardAction } from '@/lib/api/server-actions';

// Signup
const signupResult = await signupAction({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
  avatar: "🐱"
});

if (signupResult.success) {
  const { user, sessionToken } = signupResult;
  
  // Create a card
  const cardResult = await createCardAction({
    owner_id: user.id,
    recipient: "Jane",
    character: "cat",
    message: "I'm sorry for what happened!",
    theme_bg: "#fdf3e7",
    theme_accent: "#3d1a00"
  });
  
  if (cardResult.success) {
    const { card } = cardResult;
    // Share the card: /card/${card.id}
  }
}
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in `.env.local`
- Check Supabase project status
- Ensure database schema is applied

### Authentication Issues
- Check password hashing implementation
- Verify session token is being stored correctly
- Check session expiration (30 days)

### Card Creation Issues
- Ensure Nano ID generation is working
- Verify user ID is valid UUID
- Check database constraints

### Chat System Issues
- Verify card exists before sending messages
- Check participant ID validity
- Ensure proper authorization

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Start Documentation](https://tanstack.com/start/latest)
- [Nano ID Documentation](https://github.com/ai/nanoid)

## ✅ Next Steps

1. Apply database schema to Supabase
2. Configure environment variables
3. Test authentication flow
4. Create and view cards
5. Implement chat functionality
6. Add notification handling
7. Test public card sharing
8. Deploy to production

## 🎉 Backend Complete!

Your Sorry Kitty backend is now ready with:
- ✅ User authentication
- ✅ Card management with Nano ID
- ✅ Chat system
- ✅ Notifications
- ✅ Public card viewing
- ✅ Full CRUD operations
- ✅ Session management
- ✅ Activity tracking
