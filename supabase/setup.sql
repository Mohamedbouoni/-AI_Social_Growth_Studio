-- =============================================================================
-- AI Social Growth Studio — one-time database setup
-- =============================================================================
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> New query,
-- then click Run. Run it ONCE on an empty project. It is the files in
-- supabase/migrations/ (001-005) combined in order; if you use the
-- Supabase CLI, run `supabase db push` instead of this file.
-- Generated from the migrations — edit those, not this file.
-- =============================================================================


-- >>>>>>>>>> 001_initial_schema.sql

-- =============================================================================
-- AI Social Growth Studio — Initial Database Schema
-- =============================================================================
-- Migration: 001_initial_schema
-- This creates all tables needed for the MVP: profiles, workspaces,
-- content projects, AI generation tracking, social connections, analytics,
-- and billing.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. Profiles — One per authenticated user
-- =============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 2. Workspaces — Personal workspace per user; supports teams later
-- =============================================================================
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Workspace',
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'growth')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own workspaces"
    ON workspaces FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update own workspaces"
    ON workspaces FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- =============================================================================
-- 3. Workspace Members — For future team collaboration
-- =============================================================================
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their memberships"
    ON workspace_members FOR SELECT
    USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Social Connections — Connected YouTube, TikTok, Instagram accounts
-- =============================================================================
CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT,
    platform_display_name TEXT,
    platform_avatar_url TEXT,
    encrypted_access_token BYTEA,
    encrypted_refresh_token BYTEA,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, platform, platform_user_id)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections in owned workspaces"
    ON social_connections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = social_connections.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage connections in owned workspaces"
    ON social_connections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = social_connections.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 5. Content Projects — The original content idea and metadata
-- =============================================================================
CREATE TABLE content_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    niche TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    source_idea TEXT NOT NULL DEFAULT '',
    tone TEXT NOT NULL DEFAULT 'professional',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'published', 'archived')),
    planned_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_projects_workspace ON content_projects(workspace_id);
CREATE INDEX idx_content_projects_status ON content_projects(workspace_id, status);
CREATE INDEX idx_content_projects_planned ON content_projects(workspace_id, planned_date) WHERE planned_date IS NOT NULL;

ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in owned workspaces"
    ON content_projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = content_projects.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage projects in owned workspaces"
    ON content_projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = content_projects.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 6. Content Variants — Platform-specific generated versions
-- =============================================================================
CREATE TABLE content_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'short', 'reel', 'carousel', 'post', 'story')),
    output_json JSONB NOT NULL DEFAULT '{}',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_variants_project ON content_variants(project_id);

ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants via project ownership"
    ON content_variants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM content_projects
            JOIN workspaces ON workspaces.id = content_projects.workspace_id
            WHERE content_projects.id = content_variants.project_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage variants via project ownership"
    ON content_variants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM content_projects
            JOIN workspaces ON workspaces.id = content_projects.workspace_id
            WHERE content_projects.id = content_variants.project_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 7. Analytics Snapshots — Stored metrics from connected accounts
-- =============================================================================
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
    platform_content_id TEXT NOT NULL,
    metrics_json JSONB NOT NULL DEFAULT '{}',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_connection ON analytics_snapshots(connection_id, captured_at DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics via connection ownership"
    ON analytics_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM social_connections
            JOIN workspaces ON workspaces.id = social_connections.workspace_id
            WHERE social_connections.id = analytics_snapshots.connection_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 8. Generation Usage — Tracks AI generation for quotas and cost
-- =============================================================================
CREATE TABLE generation_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT '',
    tokens_in INT NOT NULL DEFAULT 0,
    tokens_out INT NOT NULL DEFAULT 0,
    credits_used INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, request_id)
);

CREATE INDEX idx_usage_workspace_period ON generation_usage(workspace_id, created_at DESC);

ALTER TABLE generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage in owned workspaces"
    ON generation_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = generation_usage.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 9. Subscriptions — Current entitlement state from billing provider
-- =============================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'paused', 'trialing')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'growth')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions in owned workspaces"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = subscriptions.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- 10. Billing Events — Deduplicates webhook delivery
-- =============================================================================
CREATE TABLE billing_events (
    provider_event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — only server-side access via service role

-- =============================================================================
-- Auto-create profile and workspace on user signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create profile
    INSERT INTO profiles (id, display_name, language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Creator'),
        'en'
    );

    -- Create default workspace
    INSERT INTO workspaces (owner_id, name, plan)
    VALUES (NEW.id, 'My Workspace', 'free')
    RETURNING id INTO new_workspace_id;

    -- Add owner as workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- Updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON content_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>>>>>>>>> 002_security_hardening.sql

-- =============================================================================
-- 002 — Security hardening
-- =============================================================================

-- =============================================================================
-- 1. Billing Events — lock down
-- =============================================================================
-- Tables in the public schema are reachable through PostgREST with the anon
-- key unless RLS is enabled. With RLS on and no policies, only the service
-- role (which bypasses RLS) can read or write webhook payloads.

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE billing_events FROM anon, authenticated;

-- =============================================================================
-- 2. Atomic generation credit reservation
-- =============================================================================
-- Checks the monthly quota and records the usage row in a single transaction,
-- serialized per workspace, so concurrent requests cannot overshoot the limit.
-- Returns one of:
--   {"status": "reserved",      "used": <count incl. this one>}
--   {"status": "duplicate",     "used": <count>}  -- request_id already used
--   {"status": "limit_reached", "used": <count>}

CREATE OR REPLACE FUNCTION reserve_generation_credit(
    p_workspace_id UUID,
    p_request_id TEXT,
    p_limit INT,
    p_model TEXT,
    p_platform TEXT,
    p_content_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_used INT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('generation_usage:' || p_workspace_id::text));

    SELECT count(*) INTO v_used
    FROM generation_usage
    WHERE workspace_id = p_workspace_id
      AND created_at >= date_trunc('month', now());

    IF EXISTS (
        SELECT 1 FROM generation_usage
        WHERE workspace_id = p_workspace_id
          AND request_id = p_request_id
    ) THEN
        RETURN jsonb_build_object('status', 'duplicate', 'used', v_used);
    END IF;

    IF v_used >= p_limit THEN
        RETURN jsonb_build_object('status', 'limit_reached', 'used', v_used);
    END IF;

    INSERT INTO generation_usage (workspace_id, request_id, model, platform, content_type, credits_used)
    VALUES (p_workspace_id, p_request_id, p_model, p_platform, p_content_type, 1);

    RETURN jsonb_build_object('status', 'reserved', 'used', v_used + 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION reserve_generation_credit(UUID, TEXT, INT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_generation_credit(UUID, TEXT, INT, TEXT, TEXT, TEXT)
    TO service_role;

-- >>>>>>>>>> 003_credits_and_billing.sql

-- =============================================================================
-- 003 — Credits ledger, Konnect payments and prepaid plan passes
-- =============================================================================
-- Konnect has no recurring billing, so paid plans are prepaid 30-day passes.
-- Credits are consumed per billing cycle: the calendar month on the free
-- plan, 30-day cycles from the pass start on paid plans (computed in the app
-- and passed in as p_cycle_start).
-- =============================================================================

-- =============================================================================
-- 1. Usage kinds — one ledger for generations, repurposing and coach chats
-- =============================================================================
ALTER TABLE generation_usage
    ADD COLUMN kind TEXT NOT NULL DEFAULT 'generation'
    CHECK (kind IN ('generation', 'repurpose', 'assistant'));

-- =============================================================================
-- 2. Payments — one row per Konnect checkout attempt
-- =============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('creator', 'growth')),
    amount_millimes INT NOT NULL CHECK (amount_millimes > 0),
    provider TEXT NOT NULL DEFAULT 'konnect',
    provider_payment_ref TEXT UNIQUE,
    pay_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_workspace ON payments(workspace_id, created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in owned workspaces"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = payments.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- One entitlement row per workspace
ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_workspace_unique UNIQUE (workspace_id);

-- =============================================================================
-- 3. Atomic credit reservation (replaces reserve_generation_credit from 002)
-- =============================================================================
-- Returns one of:
--   {"status": "reserved",      "used": <credits used incl. this request>}
--   {"status": "duplicate",     "used": <credits used>}
--   {"status": "limit_reached", "used": <credits used>}

DROP FUNCTION IF EXISTS reserve_generation_credit(UUID, TEXT, INT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION reserve_credits(
    p_workspace_id UUID,
    p_request_id TEXT,
    p_limit INT,
    p_credits INT,
    p_cycle_start TIMESTAMPTZ,
    p_kind TEXT,
    p_model TEXT,
    p_platform TEXT,
    p_content_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_used INT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('generation_usage:' || p_workspace_id::text));

    SELECT COALESCE(SUM(credits_used), 0) INTO v_used
    FROM generation_usage
    WHERE workspace_id = p_workspace_id
      AND created_at >= p_cycle_start;

    IF EXISTS (
        SELECT 1 FROM generation_usage
        WHERE workspace_id = p_workspace_id
          AND request_id = p_request_id
    ) THEN
        RETURN jsonb_build_object('status', 'duplicate', 'used', v_used);
    END IF;

    IF v_used + p_credits > p_limit THEN
        RETURN jsonb_build_object('status', 'limit_reached', 'used', v_used);
    END IF;

    INSERT INTO generation_usage
        (workspace_id, request_id, kind, model, platform, content_type, credits_used)
    VALUES
        (p_workspace_id, p_request_id, p_kind, p_model, p_platform, p_content_type, p_credits);

    RETURN jsonb_build_object('status', 'reserved', 'used', v_used + p_credits);
END;
$$;

REVOKE EXECUTE ON FUNCTION reserve_credits(UUID, TEXT, INT, INT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_credits(UUID, TEXT, INT, INT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT)
    TO service_role;

-- =============================================================================
-- 4. Activate a verified payment — idempotent and atomic
-- =============================================================================
-- Same plan still running  -> extend its end date by p_days (renewal)
-- Otherwise (new, expired, or switching plan) -> fresh pass starting now
-- Returns {"status": "activated" | "already_completed", "plan", "period_end"}

CREATE OR REPLACE FUNCTION activate_plan_payment(p_payment_id UUID, p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_payment payments%ROWTYPE;
    v_sub subscriptions%ROWTYPE;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment % not found', p_payment_id;
    END IF;

    IF v_payment.status = 'completed' THEN
        SELECT * INTO v_sub FROM subscriptions WHERE workspace_id = v_payment.workspace_id;
        RETURN jsonb_build_object(
            'status', 'already_completed',
            'plan', v_payment.plan,
            'period_end', v_sub.current_period_end
        );
    END IF;

    SELECT * INTO v_sub FROM subscriptions
    WHERE workspace_id = v_payment.workspace_id
    FOR UPDATE;

    IF FOUND
       AND v_sub.status = 'active'
       AND v_sub.plan = v_payment.plan
       AND v_sub.current_period_end > now() THEN
        v_start := v_sub.current_period_start;
        v_end := v_sub.current_period_end + make_interval(days => p_days);
    ELSE
        v_start := now();
        v_end := now() + make_interval(days => p_days);
    END IF;

    INSERT INTO subscriptions
        (workspace_id, provider_customer_id, provider_subscription_id, status, plan,
         current_period_start, current_period_end)
    VALUES
        (v_payment.workspace_id, NULL, v_payment.provider_payment_ref, 'active', v_payment.plan,
         v_start, v_end)
    ON CONFLICT (workspace_id) DO UPDATE SET
        provider_subscription_id = EXCLUDED.provider_subscription_id,
        status = 'active',
        plan = EXCLUDED.plan,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end;

    UPDATE payments
    SET status = 'completed', completed_at = now()
    WHERE id = p_payment_id;

    UPDATE workspaces SET plan = v_payment.plan WHERE id = v_payment.workspace_id;

    RETURN jsonb_build_object('status', 'activated', 'plan', v_payment.plan, 'period_end', v_end);
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_plan_payment(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_plan_payment(UUID, INT) TO service_role;

-- >>>>>>>>>> 004_backfill_existing_users.sql

-- =============================================================================
-- 004 — Backfill profiles and workspaces for users created before setup
-- =============================================================================
-- handle_new_user() only runs on new sign-ups. Accounts created before the
-- schema existed have no profile or workspace, which makes every API call
-- fail with "No active workspace found". Safe to run more than once.
-- =============================================================================

INSERT INTO profiles (id, display_name, language)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', 'Creator'),
    'en'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

WITH created AS (
    INSERT INTO workspaces (owner_id, name, plan)
    SELECT p.id, 'My Workspace', 'free'
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.owner_id = p.id)
    RETURNING id, owner_id
)
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner' FROM created;

-- Make the Supabase API (PostgREST) see the new tables immediately
NOTIFY pgrst, 'reload schema';

-- >>>>>>>>>> 005_video_analysis.sql

-- =============================================================================
-- 005 — Video Studio: video analyses in the credit ledger and the library
-- =============================================================================

-- Allow the 'video' usage kind (5 credits per analyzed video)
ALTER TABLE generation_usage DROP CONSTRAINT IF EXISTS generation_usage_kind_check;
ALTER TABLE generation_usage
    ADD CONSTRAINT generation_usage_kind_check
    CHECK (kind IN ('generation', 'repurpose', 'assistant', 'video'));

-- Library items can come from a typed idea or an uploaded video
ALTER TABLE content_projects
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'idea'
    CHECK (source IN ('idea', 'video'));
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Detected language may be any ISO code for videos, not only en/ar
ALTER TABLE content_projects DROP CONSTRAINT IF EXISTS content_projects_language_check;
ALTER TABLE content_projects
    ADD CONSTRAINT content_projects_language_check
    CHECK (char_length(language) BETWEEN 2 AND 12);

-- The full omnichannel package is stored as one 'package' variant
ALTER TABLE content_variants DROP CONSTRAINT IF EXISTS content_variants_content_type_check;
ALTER TABLE content_variants
    ADD CONSTRAINT content_variants_content_type_check
    CHECK (content_type IN ('video', 'short', 'reel', 'carousel', 'post', 'story', 'package'));

NOTIFY pgrst, 'reload schema';
