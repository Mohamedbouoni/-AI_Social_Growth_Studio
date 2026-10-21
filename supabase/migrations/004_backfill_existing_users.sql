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
