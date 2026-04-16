-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Core vocab table
create table vocab (
  id serial primary key,
  week int,
  en text not null,
  vn text not null,
  source text,
  note text,
  status text default 'NO',
  used int default 0,
  audio_url text,
  created_at timestamptz default now()
);

-- Playlists
create table playlists (
  id serial primary key,
  name text not null,
  audio_url text,
  cue_points jsonb,
  created_at timestamptz default now()
);

-- Playlist items (junction)
create table playlist_items (
  id serial primary key,
  playlist_id int references playlists(id) on delete cascade,
  vocab_id int references vocab(id) on delete cascade,
  position int
);

-- Enable Row Level Security
alter table vocab enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;

-- Public read/write policies (for simplicity - this is a personal app)
create policy "Allow all on vocab" on vocab for all using (true) with check (true);
create policy "Allow all on playlists" on playlists for all using (true) with check (true);
create policy "Allow all on playlist_items" on playlist_items for all using (true) with check (true);

-- Create a storage bucket for audio files
insert into storage.buckets (id, name, public) values ('audio', 'audio', true);

-- Allow public access to audio bucket
create policy "Public access to audio" on storage.objects for all using (bucket_id = 'audio') with check (bucket_id = 'audio');
