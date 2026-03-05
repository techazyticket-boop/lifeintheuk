-- ====================================================
-- THE MASTER PASSBRITA SUPABASE CONFIGURATION SCRIPT
-- SAFE RUN VERSION (Drops existing policies first)
-- ====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 2. TABLE CREATIONS

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    is_premium BOOLEAN DEFAULT false,
    premium_start TIMESTAMP,
    premium_end TIMESTAMP,
    guarantee_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- EXAM ATTEMPTS TABLE (WITH ANTI-CHEAT)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    exam_id TEXT,
    score INTEGER,
    passed BOOLEAN,
    topic_breakdown JSONB,
    duration_seconds INTEGER DEFAULT 0,
    is_valid_for_guarantee BOOLEAN DEFAULT true,
    confidence_breakdown JSONB,
    invalid_reason TEXT,
    completed_at TIMESTAMP DEFAULT now()
);

-- GUARANTEE CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.guarantee_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    exam_date DATE,
    avg_last_five INTEGER,
    total_mocks_completed INTEGER,
    claim_status TEXT DEFAULT 'pending',
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMP DEFAULT now()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan TEXT,
    status TEXT,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- PROMO CODES TABLE
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT,
    value INTEGER,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expiry_date TIMESTAMP,
    valid_for_plan TEXT,
    duration_in_months INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

-- PROMO REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promo_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP DEFAULT now()
);


-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarantee_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;


-- 4. POLICIES (DROP EXISTING ONES FIRST TO PREVENT ERRORS)

-- Drop existing Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Drop existing Exam Attempts policies
DROP POLICY IF EXISTS "Users can read their own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert their own exam attempts" ON public.exam_attempts;

-- Drop existing Subscriptions policies
DROP POLICY IF EXISTS "Users can read their subscription" ON public.subscriptions;

-- Drop existing Guarantee Claim policies
DROP POLICY IF EXISTS "Users can view their guarantee claims" ON public.guarantee_claims;
DROP POLICY IF EXISTS "Users can submit guarantee claim" ON public.guarantee_claims;
DROP POLICY IF EXISTS "Service role full access on guarantee_claims" ON public.guarantee_claims;

-- Drop existing Promo Redemption policies
DROP POLICY IF EXISTS "Users redeem promo" ON public.promo_redemptions;
DROP POLICY IF EXISTS "Users view own redemptions" ON public.promo_redemptions;

-- Drop existing Promo Code policies
DROP POLICY IF EXISTS "Anyone_can_read_active_promos" ON public.promo_codes;
DROP POLICY IF EXISTS "Admin_Full_Access_Promo_Codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow promo code read" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow promo code insert" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow promo code update" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow promo code delete" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow service_role full access on promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow admin to view promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow admin to insert promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow admin to update promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow admin to delete promo_codes" ON public.promo_codes;


-- NOW CREATE THE POLICIES

-- USERS POLICIES
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- EXAM ATTEMPTS POLICIES
CREATE POLICY "Users can read their own exam attempts" ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exam attempts" ON public.exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can read their subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- GUARANTEE CLAIM POLICIES
CREATE POLICY "Users can view their guarantee claims" ON public.guarantee_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit guarantee claim" ON public.guarantee_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on guarantee_claims" ON public.guarantee_claims FOR ALL USING (true) WITH CHECK (true);

-- PROMO REDEMPTION POLICIES
CREATE POLICY "Users redeem promo" ON public.promo_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own redemptions" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);

-- PROMO CODE POLICIES (Strict Admin Access + Read Access for everyone to redeem)
CREATE POLICY "Anyone_can_read_active_promos" ON public.promo_codes FOR SELECT USING (true);

CREATE POLICY "Admin_Full_Access_Promo_Codes" 
ON public.promo_codes 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND email = 'techazyticket@gmail.com')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND email = 'techazyticket@gmail.com')
);


-- 5. AUTO CREATE USER PROFILE ON SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 6. GRANT ADMIN ACCOUNT PREMIUM FOREVER
UPDATE public.users
SET is_premium = true,
    premium_start = now(),
    premium_end = now() + interval '100 years'
WHERE email = 'techazyticket@gmail.com';
