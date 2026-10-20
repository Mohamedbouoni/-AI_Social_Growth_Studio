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
