-- ============================================================
-- DISC GOLF CLUB - Complete Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Member Profiles ──────────────────────────────────────────
-- Extends Supabase auth.users
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  division TEXT DEFAULT 'Mixed' CHECK (division IN ('Mixed', 'Female', 'Junior', 'Senior')),
  bag_tag INTEGER,
  pdga_number TEXT,
  emergency_contact TEXT,
  membership_status TEXT DEFAULT 'Active' CHECK (membership_status IN ('Active', 'Inactive', 'Pending')),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  club_name TEXT DEFAULT 'Disc Golf Club',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Bag Tag System ────────────────────────────────────────────
CREATE TABLE players (
  player_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  bag_tag INTEGER,
  player_status TEXT NOT NULL DEFAULT 'Active' CHECK (player_status IN ('Active', 'Inactive')),
  player_division TEXT NOT NULL CHECK (player_division IN ('Junior', 'Senior', 'Female', 'Mixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players DISABLE ROW LEVEL SECURITY;

-- Partial unique index allows temp tags 999000+
CREATE UNIQUE INDEX players_bag_tag_unique ON players (bag_tag) WHERE bag_tag < 999000;

CREATE TABLE challenges (
  challenge_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('Direct', 'Group')),
  challenge_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  division TEXT NOT NULL DEFAULT 'Mixed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(challenge_id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  bag_tag_before INTEGER,
  bag_tag_after INTEGER,
  finish_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bag_tag_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(challenge_id),
  old_tag INTEGER,
  new_tag INTEGER,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-log tag changes
CREATE OR REPLACE FUNCTION log_bag_tag_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.bag_tag IS DISTINCT FROM NEW.bag_tag AND NEW.bag_tag < 999000 THEN
    INSERT INTO bag_tag_history (player_id, old_tag, new_tag)
    VALUES (NEW.player_id, OLD.bag_tag, NEW.bag_tag);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_bag_tag_history
  AFTER UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION log_bag_tag_change();

-- ── News ──────────────────────────────────────────────────────
CREATE TABLE news_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  category TEXT DEFAULT 'General',
  published BOOLEAN DEFAULT TRUE,
  author_id UUID REFERENCES member_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Events ───────────────────────────────────────────────────
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  event_type TEXT DEFAULT 'Social Round',
  max_registrations INTEGER,
  created_by UUID REFERENCES member_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ── Scores ───────────────────────────────────────────────────
CREATE TABLE match_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_name TEXT NOT NULL,
  round_date DATE NOT NULL,
  holes INTEGER DEFAULT 18,
  notes TEXT,
  created_by UUID REFERENCES member_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES match_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  total_score INTEGER,
  total_par INTEGER,
  hole_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS Policies ─────────────────────────────────────────────
-- Disable RLS for simplicity (enable and add policies when ready for production)
ALTER TABLE member_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE bag_tag_history DISABLE ROW LEVEL SECURITY;

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_news_published ON news_posts(published, created_at DESC);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_event_regs_member ON event_registrations(member_id);
CREATE INDEX idx_match_scores_round ON match_scores(round_id);
CREATE INDEX idx_match_scores_player ON match_scores(player_id);

-- ── Storage Bucket ────────────────────────────────────────────
-- Run this separately in Supabase Storage settings, or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true);

-- ── Supabase Auth Settings ────────────────────────────────────
-- In Supabase Dashboard → Authentication → Email Templates:
-- Make sure "Enable email confirmations" is OFF (magic links handle this)
-- In Authentication → URL Configuration:
-- Set Site URL to your Vercel domain e.g. https://your-app.vercel.app

-- ── Make yourself admin ───────────────────────────────────────
-- After signing in for the first time, run this with your email:
-- UPDATE member_profiles SET role = 'admin', full_name = 'Your Name' WHERE email = 'your@email.com';
