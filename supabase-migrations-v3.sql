-- Google Sheet is now the source-of-truth for vocab.
-- Drop vocab-centric tables; keep only playlists (for audio caching) and settings.
drop table if exists playlist_items cascade;
drop table if exists vocab cascade;

-- Store the picked words inline on the playlist row (no more FK to vocab).
alter table playlists add column if not exists items jsonb default '[]'::jsonb;

-- Columns we don't use in the simplified flow.
alter table playlists drop column if exists created_by;
