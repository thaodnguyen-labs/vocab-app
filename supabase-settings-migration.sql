-- Add settings table for storing app configuration (like Google Sheets sync URL)
-- Run this ONCE in Supabase SQL Editor

create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table settings enable row level security;
-- No policies = only service_role can access (secure)
