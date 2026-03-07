-- ====================================================
-- PASSBRITA PRODUCTION SECURITY & ANTI-CHEAT UPGRADE
-- Exam Integrity, Atomic Transactions, Role Management
-- ====================================================

-- 1. EXAM SESSIONS TABLE
-- Eliminates client-side exam extraction by keeping truth on server
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    question_ids JSONB NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '60 minutes')
);

-- 2. ALTER EXAM ATTEMPTS
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS fraud_score FLOAT DEFAULT 0.0;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS suspicious_flags JSONB;

-- 3. ALTER USERS TABLE (Roles)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
UPDATE public.users SET role = 'admin' WHERE email = 'techazyticket@gmail.com';

-- 4. ATOMIC PROMO REDEMPTION RPC FUNCTION
-- Prevents race conditions and multiple redemptions
CREATE OR REPLACE FUNCTION redeem_promo_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promo record;
    v_redeemed_count int;
BEGIN
    -- Lock row to prevent race conditions
    SELECT * INTO v_promo FROM public.promo_codes WHERE code = p_code FOR UPDATE;

    IF v_promo IS NULL THEN RETURN '{"error": "Invalid promo code"}'::jsonb; END IF;
    IF v_promo.expiry_date < now() THEN RETURN '{"error": "Promo code has expired"}'::jsonb; END IF;
    IF v_promo.current_uses >= v_promo.max_uses THEN RETURN '{"error": "Usage limit reached"}'::jsonb; END IF;

    -- Check if user already redeemed
    SELECT count(*) INTO v_redeemed_count FROM public.promo_redemptions WHERE promo_id = v_promo.id AND user_id = p_user_id;
    IF v_redeemed_count > 0 THEN RETURN '{"error": "You have already redeemed this code"}'::jsonb; END IF;

    -- Increment usage
    UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

    -- Insert redemption
    INSERT INTO public.promo_redemptions (promo_id, user_id) VALUES (v_promo.id, p_user_id);

    RETURN jsonb_build_object(
        'success', true, 
        'duration_months', v_promo.duration_in_months,
        'type', v_promo.type,
        'value', v_promo.value
     );
END;
$$;


-- 5. PERFORMANCE AND INTEGRITY INDEXES
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON public.promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_session_id ON public.exam_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON public.exam_sessions(user_id);


-- 6. EXAM SESSION POLICIES
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own sessions" ON public.exam_sessions;
CREATE POLICY "Users can read their own sessions" ON public.exam_sessions FOR SELECT USING (auth.uid() = user_id);

-- Also give service role full access
DROP POLICY IF EXISTS "Service role sessions" ON public.exam_sessions;
CREATE POLICY "Service role sessions" ON public.exam_sessions FOR ALL USING (true) WITH CHECK (true);

-- 7. ADMIN RLS POLICIES
-- Grans techazyticket@gmail.com full access to all data
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "Admin full access exam_attempts" ON public.exam_attempts FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "Admin full access subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "Admin full access promo_redemptions" ON public.promo_redemptions FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
