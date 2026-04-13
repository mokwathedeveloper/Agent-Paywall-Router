-- ─── Agent Paywall Router: Initial Schema ───

-- 1. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    spending_limit NUMERIC NOT NULL DEFAULT 5.00,
    used_amount NUMERIC NOT NULL DEFAULT 0.00,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Services Table (Marketplace)
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_usd NUMERIC NOT NULL,
    protocol TEXT NOT NULL CHECK (protocol IN ('x402', 'mpp')),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    input_param TEXT NOT NULL DEFAULT 'text',
    stellar_network TEXT NOT NULL DEFAULT 'stellar:testnet',
    spending_policy_contract TEXT DEFAULT 'none',
    is_external BOOLEAN DEFAULT true,
    rating NUMERIC NOT NULL DEFAULT 0.0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    provider_split_percentage NUMERIC NOT NULL DEFAULT 0.7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    endpoint TEXT,
    amount NUMERIC NOT NULL,
    provider_share NUMERIC DEFAULT 0.0,
    agent_share NUMERIC DEFAULT 0.0,
    tx_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    request_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Row Level Security (RLS) Policies
-- RLS is enabled, but the app should use a *service role key* for any writes.
-- Public anon keys should only be able to read (or nothing at all).

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous selects
DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON public.sessions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON public.services FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON public.transactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOTE:
-- No INSERT/UPDATE policies are defined intentionally.
-- Service role keys bypass RLS, so the backend can still perform writes safely.

-- Add missing columns if not present (for migrations on top of existing DBs)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS request_payload JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider_share NUMERIC DEFAULT 0.0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS agent_share NUMERIC DEFAULT 0.0;

-- ─── Atomic spending consumption RPC ───────────────────────────────────────
-- Atomically increments used_amount only if the session has not expired and
-- the increment would not exceed spending_limit.
CREATE OR REPLACE FUNCTION public.increment_spend(session_id TEXT, spend_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  new_used NUMERIC;
BEGIN
  UPDATE public.sessions
  SET used_amount = used_amount + spend_amount
  WHERE id = session_id
    AND expires_at > NOW()
    AND used_amount + spend_amount <= spending_limit
  RETURNING used_amount INTO new_used;

  IF new_used IS NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
