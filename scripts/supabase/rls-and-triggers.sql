-- Supabase RLS + signup triggers for CRStats.
-- Idempotent: safe to run multiple times.

create extension if not exists pgcrypto;

-- ============================================================================
-- LIGHTWEIGHT MIGRATIONS (idempotent)
-- ============================================================================

-- meta_decks_cache: add new analytics/cache fields (safe if table already has them).
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

-- ============================================================================
-- SIGNUP TRIGGER: auth.users -> public.*
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_email text;
  v_display_name text;
begin
  v_user_id := new.id::text;
  v_email := new.email;

  v_display_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    nullif(split_part(coalesce(v_email, ''), '@', 1), ''),
    'Player'
  );

  insert into public.users (id, email, created_at, updated_at)
  values (v_user_id, v_email, now(), now())
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.profiles (user_id, display_name, region, language, role, created_at, updated_at)
  values (v_user_id, v_display_name, 'BR', 'pt', 'user', now(), now())
  on conflict (user_id) do nothing;

  insert into public.user_settings (
    user_id,
    theme,
    preferred_language,
    default_landing_page,
    show_advanced_stats,
    notifications_enabled,
    notifications_training,
    notifications_billing,
    notifications_system,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    'dark',
    'pt',
    'dashboard',
    false,
    true,
    true,
    true,
    true,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.subscriptions where user_id = v_user_id) then
    insert into public.subscriptions (user_id, plan, status, cancel_at_period_end)
    values (v_user_id, 'free', 'inactive', false);
  end if;

  insert into public.notification_preferences (user_id, training, billing, system, created_at, updated_at)
  values (v_user_id, true, true, true, now(), now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================================
-- RLS ENABLEMENT
-- ============================================================================

alter table public.users enable row level security;
alter table public.users force row level security;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

alter table public.goals enable row level security;
alter table public.goals force row level security;

alter table public.favorite_players enable row level security;
alter table public.favorite_players force row level security;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

alter table public.player_sync_state enable row level security;
alter table public.player_sync_state force row level security;

alter table public.battle_history enable row level security;
alter table public.battle_history force row level security;

alter table public.coach_messages enable row level security;
alter table public.coach_messages force row level security;

alter table public.push_analyses enable row level security;
alter table public.push_analyses force row level security;

alter table public.training_plans enable row level security;
alter table public.training_plans force row level security;

alter table public.training_drills enable row level security;
alter table public.training_drills force row level security;

alter table public.meta_decks_cache enable row level security;
alter table public.meta_decks_cache force row level security;

alter table public.deck_suggestions_usage enable row level security;
alter table public.deck_suggestions_usage force row level security;

-- ============================================================================
-- GRANTS (minimum required; RLS policies are still enforced)
-- ============================================================================

grant usage on schema public to authenticated;

grant select, update on public.users to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.favorite_players to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.player_sync_state to authenticated;
grant select, insert, update, delete on public.battle_history to authenticated;
grant select, insert, update, delete on public.coach_messages to authenticated;
grant select, insert, update, delete on public.push_analyses to authenticated;
grant select, insert, update, delete on public.training_plans to authenticated;
grant select, insert, update, delete on public.training_drills to authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.meta_decks_cache to authenticated;
grant select, insert on public.deck_suggestions_usage to authenticated;

-- ============================================================================
-- POLICIES (authenticated role)
-- ============================================================================

-- users: can read/update own row.
drop policy if exists users_select_own on public.users;
create policy users_select_own
on public.users
for select
to authenticated
using (id = auth.uid()::text);

drop policy if exists users_update_own on public.users;
create policy users_update_own
on public.users
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

-- user-owned tables: user_id = auth.uid()
drop policy if exists profiles_user_own on public.profiles;
create policy profiles_user_own
on public.profiles
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists goals_user_own on public.goals;
create policy goals_user_own
on public.goals
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists favorite_players_user_own on public.favorite_players;
create policy favorite_players_user_own
on public.favorite_players
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists notifications_user_own on public.notifications;
create policy notifications_user_own
on public.notifications
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists user_settings_user_own on public.user_settings;
create policy user_settings_user_own
on public.user_settings
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists notification_preferences_user_own on public.notification_preferences;
create policy notification_preferences_user_own
on public.notification_preferences
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists player_sync_state_user_own on public.player_sync_state;
create policy player_sync_state_user_own
on public.player_sync_state
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists battle_history_user_own on public.battle_history;
create policy battle_history_user_own
on public.battle_history
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists coach_messages_user_own on public.coach_messages;
create policy coach_messages_user_own
on public.coach_messages
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists push_analyses_user_own on public.push_analyses;
create policy push_analyses_user_own
on public.push_analyses
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists training_plans_user_own on public.training_plans;
create policy training_plans_user_own
on public.training_plans
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- subscriptions: select only own row(s). No insert/update/delete for authenticated.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid()::text);

-- training_drills: allowed if parent plan belongs to the authenticated user.
drop policy if exists training_drills_user_own on public.training_drills;
create policy training_drills_user_own
on public.training_drills
for all
to authenticated
using (
  exists (
    select 1
    from public.training_plans tp
    where tp.id = training_drills.plan_id
      and tp.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.training_plans tp
    where tp.id = training_drills.plan_id
      and tp.user_id = auth.uid()::text
  )
);

-- meta_decks_cache: readable by any authenticated user.
drop policy if exists meta_decks_cache_select_authenticated on public.meta_decks_cache;
create policy meta_decks_cache_select_authenticated
on public.meta_decks_cache
for select
to authenticated
using (true);

-- deck_suggestions_usage: user-owned (for limits).
drop policy if exists deck_suggestions_usage_user_own on public.deck_suggestions_usage;
create policy deck_suggestions_usage_user_own
on public.deck_suggestions_usage
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- ============================================================================
-- AUTOMATIC updated_at TRIGGER (TD-013)
-- ============================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = NOW();
  return NEW;
end;
$$ language plpgsql;

-- Apply to all 9 tables with updated_at columns
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
before update on public.goals
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_player_sync_state_updated_at on public.player_sync_state;
create trigger trg_player_sync_state_updated_at
before update on public.player_sync_state
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_training_plans_updated_at on public.training_plans;
create trigger trg_training_plans_updated_at
before update on public.training_plans
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_training_drills_updated_at on public.training_drills;
create trigger trg_training_drills_updated_at
before update on public.training_drills
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- COMPOSITE INDEXES (TD-014)
-- ============================================================================

create index if not exists idx_coach_messages_user_role_created
  on public.coach_messages(user_id, role, created_at);

create index if not exists idx_push_analyses_user_created
  on public.push_analyses(user_id, created_at);
