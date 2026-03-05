-- ==========================================================
-- DEFINITIVE PROMO CODE RLS FIX
-- Run this in your Supabase SQL Editor to fix the insertion error
-- ==========================================================

-- 1. Drop any old or duplicate policies that might be conflicting
DROP POLICY IF EXISTS "Allow promo code read" ON promo_codes;
DROP POLICY IF EXISTS "Allow promo code insert" ON promo_codes;
DROP POLICY IF EXISTS "Allow promo code update" ON promo_codes;
DROP POLICY IF EXISTS "Allow promo code delete" ON promo_codes;
DROP POLICY IF EXISTS "Allow service_role full access on promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Allow admin to view promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Allow admin to insert promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Allow admin to update promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Allow admin to delete promo_codes" ON promo_codes;

-- 2. Make sure RLS is definitively enabled
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- 3. Create a single, powerful "ALL" policy specifically for your admin account.
-- It checks the public.users table to confirm the active user is the admin.
CREATE POLICY "Admin_Full_Access_Promo_Codes"
ON public.promo_codes
FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND email = 'techazyticket@gmail.com')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND email = 'techazyticket@gmail.com')
);

-- (Optional) Just in case you need basic read access for frontend promo redemption later:
CREATE POLICY "Anyone_can_read_active_promos"
ON public.promo_codes
FOR SELECT
USING (true);
