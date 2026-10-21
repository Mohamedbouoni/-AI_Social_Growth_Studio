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
