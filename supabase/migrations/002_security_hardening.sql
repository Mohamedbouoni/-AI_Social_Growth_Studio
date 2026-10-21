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
