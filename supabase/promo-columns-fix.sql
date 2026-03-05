-- ==========================================================
-- PASSBRITA DATABASE UPGRADE: PROMOS & SUBSCRIPTIONS
-- Run this in your Supabase SQL Editor to apply the upgrades
-- ==========================================================

-- 1. Fix the subscriptions table column name error
ALTER TABLE public.subscriptions RENAME COLUMN end_date TO current_period_end;
ALTER TABLE public.subscriptions RENAME COLUMN start_date TO current_period_start;

-- Make sure stripe specific columns exist as they may not have been in the original create
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;


-- 2. Add the custom restriction features to Promo Codes
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS valid_for_plan TEXT;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS duration_in_months INTEGER;

-- (Optional) If you want, you can reset previous failed "full access" promo codes so you can test them cleanly again!
-- DELETE FROM public.promo_codes WHERE created_at > now() - interval '1 hour';
