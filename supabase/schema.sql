-- ============================================================
-- NovaNet – Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Roles ────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'story', 'reel', 'thread');
CREATE TYPE visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE relationship_type AS ENUM ('friend', 'follow', 'blocked');
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'follow', 'message', 'mention', 'group_invite');

-- ─── Profiles (extended user info) ───────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT        UNIQUE NOT NULL,
  display_name  TEXT,
  bio           TEXT        DEFAULT '',
  avatar_url    TEXT,
  cover_url     TEXT,
  website       TEXT,
  location      TEXT,
  -- Professional fields (LinkedIn-like)
  job_title     TEXT,
  company       TEXT,
  -- Role management
  role          user_role   NOT NULL DEFAULT 'user',
  -- Stats (denormalized for perf)
  followers_count  INTEGER  NOT NULL DEFAULT 0,
  following_count  INTEGER  NOT NULL DEFAULT 0,
  posts_count      INTEGER  NOT NULL DEFAULT 0,
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Settings ────────────────────────────────────────────────────────────
CREATE TABLE public.user_settings (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Privacy
  default_visibility    visibility  NOT NULL DEFAULT 'public',
  show_likes            BOOLEAN     NOT NULL DEFAULT TRUE,   -- anti social-pressure feature
  -- Well-being (anti-addiction features)
  daily_limit_minutes   INTEGER,                             -- daily screen time limit
  break_reminder_mins   INTEGER     DEFAULT 60,              -- remind break every N mins
  feed_mode             TEXT        NOT NULL DEFAULT 'chronological', -- 'chronological' | 'algorithmic'
  -- Notifications
  notif_likes           BOOLEAN     NOT NULL DEFAULT TRUE,
  notif_comments        BOOLEAN     NOT NULL DEFAULT TRUE,
  notif_follows         BOOLEAN     NOT NULL DEFAULT TRUE,
  notif_messages        BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Theme
  theme                 TEXT        NOT NULL DEFAULT 'system', -- 'light' | 'dark' | 'system'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE public.posts (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id      UUID,                                        -- FK added after groups table
  content       TEXT        NOT NULL DEFAULT '',
  media_url     TEXT[],                                      -- array of image/video URLs
  post_type     post_type   NOT NULL DEFAULT 'text',
  visibility    visibility  NOT NULL DEFAULT 'public',
  -- Story / ephemeral: auto-delete after 24h
  expires_at    TIMESTAMPTZ,
  -- Stats (denormalized)
  likes_count   INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER    NOT NULL DEFAULT 0,
  shares_count  INTEGER     NOT NULL DEFAULT 0,
  -- Content moderation
  is_flagged    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_removed    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Threading (Twitter-like)
  parent_id     UUID        REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE public.comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  likes_count INTEGER     NOT NULL DEFAULT 0,
  is_flagged  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_removed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Likes ────────────────────────────────────────────────────────────────────
CREATE TABLE public.likes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id     UUID        REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  likes_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, comment_id)
);

-- ─── Relationships ────────────────────────────────────────────────────────────
CREATE TABLE public.relationships (
  id                UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id       UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id      UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL DEFAULT 'follow',
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

-- ─── Groups ───────────────────────────────────────────────────────────────────
CREATE TABLE public.groups (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  description   TEXT        DEFAULT '',
  avatar_url    TEXT,
  cover_url     TEXT,
  visibility    visibility  NOT NULL DEFAULT 'public',
  creator_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  members_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add group FK to posts now that groups table exists
ALTER TABLE public.posts
  ADD CONSTRAINT posts_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- ─── Group Members ────────────────────────────────────────────────────────────
CREATE TABLE public.group_members (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID    NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'member', -- 'member' | 'moderator' | 'admin'
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_group      BOOLEAN     NOT NULL DEFAULT FALSE,
  name          TEXT,                                -- for group conversations
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL DEFAULT '',
  media_url       TEXT,
  -- Ephemeral messages (Snapchat-like)
  expires_at      TIMESTAMPTZ,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id       UUID              REFERENCES public.profiles(id) ON DELETE SET NULL,
  type            notification_type NOT NULL,
  post_id         UUID              REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id      UUID              REFERENCES public.comments(id) ON DELETE CASCADE,
  message         TEXT,
  is_read         BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ─── Content Reports (anti-toxicity) ─────────────────────────────────────────
CREATE TABLE public.reports (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id     UUID    REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  UUID    REFERENCES public.comments(id) ON DELETE CASCADE,
  reason      TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved' | 'dismissed'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Blocked Words (anti-toxicity) ────────────────────────────────────────────
CREATE TABLE public.blocked_words (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  word        TEXT    UNIQUE NOT NULL,
  added_by    UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Well-being Sessions (anti-addiction tracking) ────────────────────────────
CREATE TABLE public.wellbeing_sessions (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  duration_s  INTEGER                                    -- computed on close
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_group ON public.posts(group_id);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);
CREATE INDEX idx_relationships_follower ON public.relationships(follower_id);
CREATE INDEX idx_relationships_following ON public.relationships(following_id);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_sessions    ENABLE ROW LEVEL SECURITY;

-- ─── Profiles RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Posts RLS ────────────────────────────────────────────────────────────────
CREATE POLICY "Public posts are viewable" ON public.posts
  FOR SELECT USING (
    visibility = 'public' AND is_removed = FALSE
  );

CREATE POLICY "Authors can manage own posts" ON public.posts
  FOR ALL USING (auth.uid() = author_id);

-- ─── Comments RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Comments are viewable on public posts" ON public.comments
  FOR SELECT USING (is_removed = FALSE);

CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

-- ─── Likes RLS ────────────────────────────────────────────────────────────────
CREATE POLICY "Likes are public" ON public.likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can like" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Relationships RLS ────────────────────────────────────────────────────────
CREATE POLICY "Relationships are public" ON public.relationships
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow" ON public.relationships
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.relationships
  FOR DELETE USING (auth.uid() = follower_id);

-- ─── Settings RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ─── Messages RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- ─── Notifications RLS ────────────────────────────────────────────────────────
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ─── Groups RLS ───────────────────────────────────────────────────────────────
CREATE POLICY "Public groups are viewable" ON public.groups
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can manage groups" ON public.groups
  FOR UPDATE USING (auth.uid() = creator_id);

-- ─── Group Members RLS ────────────────────────────────────────────────────────
CREATE POLICY "Group members are viewable" ON public.group_members
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Reports RLS ──────────────────────────────────────────────────────────────
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ─── Well-being Sessions RLS ──────────────────────────────────────────────────
CREATE POLICY "Users manage own sessions" ON public.wellbeing_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ─── Blocked Words RLS ────────────────────────────────────────────────────────
CREATE POLICY "Blocked words are readable by all" ON public.blocked_words
  FOR SELECT USING (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  -- Create default settings
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update likes_count on posts
CREATE OR REPLACE FUNCTION public.handle_like_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  END IF;
  IF NEW.comment_id IS NOT NULL THEN
    UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_insert
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_insert();

CREATE OR REPLACE FUNCTION public.handle_like_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.post_id IS NOT NULL THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  IF OLD.comment_id IS NOT NULL THEN
    UPDATE public.comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_delete
  AFTER DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_delete();

-- Update comments_count on posts
CREATE OR REPLACE FUNCTION public.handle_comment_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_insert();

-- Update followers_count / following_count
CREATE OR REPLACE FUNCTION public.handle_relationship_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_relationship_insert
  AFTER INSERT ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_relationship_insert();

CREATE OR REPLACE FUNCTION public.handle_relationship_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_relationship_delete
  AFTER DELETE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_relationship_delete();

-- ============================================================
-- SEED: Admin account (run AFTER configuring Supabase Auth)
-- ============================================================
-- The admin user must be created via Supabase Auth first.
-- Then run this to grant admin role:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'benoitmouafo6@gmail.com');
--
-- To create the admin via service role API, use the seed script:
-- npx ts-node supabase/seed.ts
