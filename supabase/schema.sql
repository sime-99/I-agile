-- I-AGILE: stato personale dell'app, isolato per utente autenticato.
-- Eseguire una volta nel SQL Editor di Supabase.

create table if not exists public.app_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stories jsonb not null default '[]'::jsonb,
  capacity_plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

revoke all on table public.app_states from anon, authenticated;
grant select, insert, update, delete on table public.app_states to authenticated;

drop policy if exists "Users can select their own I-AGILE state" on public.app_states;
create policy "Users can select their own I-AGILE state"
on public.app_states for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own I-AGILE state" on public.app_states;
create policy "Users can insert their own I-AGILE state"
on public.app_states for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own I-AGILE state" on public.app_states;
create policy "Users can update their own I-AGILE state"
on public.app_states for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own I-AGILE state" on public.app_states;
create policy "Users can delete their own I-AGILE state"
on public.app_states for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_states_set_updated_at on public.app_states;
create trigger app_states_set_updated_at
before update on public.app_states
for each row execute function public.set_updated_at();
