// ============================================================
// SUPABASE CLIENT — Singleton for frontend
// Uses VITE_ prefixed env vars (exposed to browser by Vite)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful fallback when env vars are not set (local dev without Supabase)
const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co';

let supabase = null;

if (!isMockMode) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    });
}

export { supabase, isMockMode };
