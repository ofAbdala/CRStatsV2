-- Decks lightweight migrations (idempotent).
-- This file is intentionally narrow so it can be applied safely even when the
-- full schema isn't present yet.

-- meta_decks_cache: add analytics/cache fields (safe if table already has them).
alter table if exists public.meta_decks_cache
  add column if not exists wins integer not null default 0;

alter table if exists public.meta_decks_cache
  add column if not exists losses integer not null default 0;

alter table if exists public.meta_decks_cache
  add column if not exists draws integer not null default 0;

alter table if exists public.meta_decks_cache
  add column if not exists avg_elixir real;

alter table if exists public.meta_decks_cache
  add column if not exists win_rate_estimate real;

alter table if exists public.meta_decks_cache
  add column if not exists source_region text;

alter table if exists public.meta_decks_cache
  add column if not exists source_range text;

-- deck_suggestions_usage: free daily limits for deck generation/optimization.
create table if not exists public.deck_suggestions_usage (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  suggestion_type text not null,
  created_at timestamp default now()
);

create index if not exists IDX_deck_suggestions_usage_user_type_created
  on public.deck_suggestions_usage(user_id, suggestion_type, created_at);

-- RLS + grants + policy (idempotent).
alter table public.deck_suggestions_usage enable row level security;
alter table public.deck_suggestions_usage force row level security;

grant select, insert on public.deck_suggestions_usage to authenticated;

drop policy if exists deck_suggestions_usage_user_own on public.deck_suggestions_usage;
create policy deck_suggestions_usage_user_own
on public.deck_suggestions_usage
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

