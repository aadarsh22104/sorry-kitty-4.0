-- ══════════════════════════════════════════════════════
-- SORRY KITTY - DATABASE SCHEMA
-- ══════════════════════════════════════════════════════
-- PostgreSQL schema for the Sorry Kitty greeting card application
-- Supports user authentication, card creation, chats, and notifications

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════
-- USERS TABLE
-- ══════════════════════════════════════════════════════
-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(50) DEFAULT '🐱',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);

-- ══════════════════════════════════════════════════════
-- USER STATS TABLE
-- ══════════════════════════════════════════════════════
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cards_created INTEGER DEFAULT 0,
    cards_sent INTEGER DEFAULT 0,
    smiles_received INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════
-- CARDS TABLE
-- Uses Nano ID (11 chars) for short public links
-- ══════════════════════════════════════════════════════
CREATE TABLE cards (
    id VARCHAR(11) PRIMARY KEY, -- Nano ID for short links
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character VARCHAR(50) DEFAULT 'cat',
    recipient VARCHAR(255) NOT NULL,
    sender VARCHAR(255),
    tagline TEXT,
    message TEXT,
    tone VARCHAR(50) DEFAULT 'sorry',
    forgive_text TEXT,
    treats TEXT[] DEFAULT ARRAY['🍫'],
    floaties TEXT[] DEFAULT ARRAY['🌸','✨','🐾','⭐','🌟'],
    confetti TEXT[] DEFAULT ARRAY['🎉','🎊','✨','🌟'],
    quotes TEXT[] DEFAULT ARRAY[]::TEXT[],
    closing TEXT,
    smile_button_text TEXT,
    after_smile_text TEXT,
    theme_bg VARCHAR(7) DEFAULT '#fdf3e7',
    theme_accent VARCHAR(7) DEFAULT '#3d1a00',
    theme_accent2 VARCHAR(7) DEFAULT '#c4822a',
    theme_text VARCHAR(7) DEFAULT '#6b3a1f',
    font VARCHAR(50) DEFAULT 'Nunito',
    opt_runaway BOOLEAN DEFAULT true,
    opt_treats BOOLEAN DEFAULT true,
    opt_mood BOOLEAN DEFAULT true,
    opt_stripe BOOLEAN DEFAULT true,
    opt_floaties BOOLEAN DEFAULT true,
    opt_stars BOOLEAN DEFAULT true,
    opt_trail BOOLEAN DEFAULT true,
    char_size INTEGER DEFAULT 170,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_cards_owner ON cards(owner_id);
CREATE INDEX idx_cards_created ON cards(created_at DESC);

-- ══════════════════════════════════════════════════════
-- CHATS TABLE
-- ══════════════════════════════════════════════════════
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id VARCHAR(11) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_from_owner BOOLEAN DEFAULT true,
    emoji_reaction VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for chat queries
CREATE INDEX idx_chats_card ON chats(card_id);
CREATE INDEX idx_chats_created ON chats(created_at DESC);

-- ══════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE
-- ══════════════════════════════════════════════════════
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    icon VARCHAR(10) DEFAULT '🔔',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification queries
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ══════════════════════════════════════════════════════
-- SESSIONS TABLE
-- ══════════════════════════════════════════════════════
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session lookups
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ══════════════════════════════════════════════════════
-- ACTIVITY LOG TABLE
-- ══════════════════════════════════════════════════════
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    icon VARCHAR(10) DEFAULT '📝',
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for activity queries
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ══════════════════════════════════════════════════════

-- Disable RLS for development (enable for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- FUNCTIONS AND TRIGGERS
-- ══════════════════════════════════════════════════════

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment user stats when card is created
CREATE OR REPLACE FUNCTION increment_card_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, cards_created)
    VALUES (NEW.owner_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        cards_created = user_stats.cards_created + 1,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for card creation stats
CREATE TRIGGER increment_card_creation_stats AFTER INSERT ON cards
    FOR EACH ROW EXECUTE FUNCTION increment_card_stats();

-- ══════════════════════════════════════════════════════
-- SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- ══════════════════════════════════════════════════════

-- Uncomment the following lines to insert sample data for testing

-- INSERT INTO users (email, name, password_hash, avatar) VALUES
-- ('demo@example.com', 'Demo User', 'cGFzc3dvcmQxMjM=', '🐱');

-- INSERT INTO user_stats (user_id) VALUES
-- ((SELECT id FROM users WHERE email = 'demo@example.com'));

-- ══════════════════════════════════════════════════════
-- VIEWS FOR COMMON QUERIES
-- ══════════════════════════════════════════════════════

-- View for cards with owner info
CREATE VIEW cards_with_owner AS
SELECT 
    c.*,
    u.name as owner_name,
    u.email as owner_email,
    u.avatar as owner_avatar
FROM cards c
JOIN users u ON c.owner_id = u.id;

-- View for user cards with stats
CREATE VIEW user_cards_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(c.id) as total_cards,
    MAX(c.created_at) as last_card_created
FROM users u
LEFT JOIN cards c ON u.id = c.owner_id
GROUP BY u.id, u.name, u.email;

-- View for unread notifications
CREATE VIEW unread_notifications AS
SELECT 
    n.*,
    u.name as user_name
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.read = false
ORDER BY n.created_at DESC;

-- ══════════════════════════════════════════════════════
-- END OF SCHEMA
-- ══════════════════════════════════════════════════════
