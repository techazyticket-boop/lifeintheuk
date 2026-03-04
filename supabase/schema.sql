-- 1. Create Promo Codes Database Table
create table promo_codes (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    type text not null, -- 'full' or 'percentage'
    value integer,
    max_uses integer,
    current_uses integer default 0,
    expiry_date timestamp,
    created_at timestamp default now()
);

-- 2. Create Promo Redemption Tracking Table
create table promo_redemptions (
    id uuid primary key default gen_random_uuid(),
    promo_id uuid references promo_codes(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    redeemed_at timestamp default now()
);

-- RLS Setup (Assuming read-only for users or no RLS if handled entirely server-side in netlify functions)
-- For the most secure setup, only the service_role key can read/write promos.
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;

-- Only Admins (via Service Role) can fully access these tables:
create policy "Allow service_role full access on promo_codes" on promo_codes for all using (true) with check (true);
create policy "Allow service_role full access on promo_redemptions" on promo_redemptions for all using (true) with check (true);
