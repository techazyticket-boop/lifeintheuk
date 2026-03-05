-- ============================================================
-- PassBrita — Anti-Cheat & Guarantee Setup Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add tracking columns to exam_attempts
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS is_valid_for_guarantee BOOLEAN DEFAULT true;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS invalid_reason TEXT;

-- 2. Create guarantee_claims table
CREATE TABLE IF NOT EXISTS public.guarantee_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    exam_date DATE,
    avg_last_five INTEGER,
    total_mocks_completed INTEGER,
    claim_status TEXT DEFAULT 'pending',
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for guarantee_claims
ALTER TABLE public.guarantee_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own claims" ON public.guarantee_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on guarantee_claims" ON public.guarantee_claims FOR ALL USING (true) WITH CHECK (true);
