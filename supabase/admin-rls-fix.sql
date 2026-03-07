-- ==========================================================
-- ADMIN PORTAL RLS FIX
-- Run this in your Supabase SQL Editor to allow the admin account
-- to see all users, subscriptions, and exam attempts.
-- ==========================================================

-- 1. FIX USERS ACCESSIBILITY
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (
    auth.uid() = id OR 
    (auth.jwt() ->> 'email' = 'techazyticket@gmail.com')
);

-- 2. FIX SUBSCRIPTIONS ACCESSIBILITY
DROP POLICY IF EXISTS "Users can read their subscription" ON public.subscriptions;
CREATE POLICY "Users can read their subscription" 
ON public.subscriptions 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email' = 'techazyticket@gmail.com')
);

-- 3. FIX EXAM ATTEMPTS ACCESSIBILITY
DROP POLICY IF EXISTS "Users can read their own exam attempts" ON public.exam_attempts;
CREATE POLICY "Users can read their own exam attempts" 
ON public.exam_attempts 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email' = 'techazyticket@gmail.com')
);

-- 4. FIX GUARANTEE CLAIMS ACCESSIBILITY
DROP POLICY IF EXISTS "Users can view their guarantee claims" ON public.guarantee_claims;
CREATE POLICY "Users can view their guarantee claims" 
ON public.guarantee_claims 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email' = 'techazyticket@gmail.com')
);

-- 5. FIX PROMO REDEMPTIONS ACCESSIBILITY
DROP POLICY IF EXISTS "Users view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users view own redemptions" 
ON public.promo_redemptions 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email' = 'techazyticket@gmail.com')
);
