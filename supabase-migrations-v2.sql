-- Migration v2: add year + level columns to vocab table
-- Run this ONCE in Supabase SQL Editor

alter table vocab add column if not exists year int;
alter table vocab add column if not exists level int default 1;

-- Backfill year to 2025 for existing rows (safe default)
update vocab set year = 2025 where year is null;

-- Index for filtering by year/week/status
create index if not exists idx_vocab_year_week on vocab(year, week);
create index if not exists idx_vocab_status on vocab(status);
create index if not exists idx_vocab_used on vocab(used);
