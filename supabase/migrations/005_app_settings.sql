-- Paramètres agence (une seule ligne)
-- Exécuter dans Supabase → SQL Editor → Run

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  agency_name text not null default 'ImmoLead × Markaz',
  tagline text not null default 'CRM Commercial',
  city text,
  phone text,
  email text,
  tva_rate numeric(5, 2) not null default 20,
  default_commission numeric(8, 2) not null default 5,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "settings_select" on public.app_settings;
create policy "settings_select"
  on public.app_settings for select to authenticated
  using (true);

drop policy if exists "settings_update_admin" on public.app_settings;
create policy "settings_update_admin"
  on public.app_settings for update to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "settings_insert_admin" on public.app_settings;
create policy "settings_insert_admin"
  on public.app_settings for insert to authenticated
  with check (public.is_admin_or_above());
