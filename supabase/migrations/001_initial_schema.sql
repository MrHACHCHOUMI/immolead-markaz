-- ImmoLead × Markaz Al Aqar CRM — schéma initial
-- Exécuter dans Supabase SQL Editor (ou via migration)

create extension if not exists "pgcrypto";

-- ========== ENUMS ==========
do $$ begin
  create type public.user_role as enum ('super_admin', 'admin', 'crc', 'commercial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('actif', 'en_pause', 'termine', 'archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commission_type as enum ('percentage', 'fixed', 'custom_per_unit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum (
    'studio', 'appartement', 'duplex', 'villa', 'terrain', 'bureau', 'commerce', 'autre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_status as enum ('disponible', 'option', 'reserve', 'vendu', 'bloque');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_source as enum (
    'meta_ads', 'google_ads', 'landing_page', 'whatsapp', 'telephone',
    'organique', 'recommandation', 'salon', 'autre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_status as enum (
    'nouveau', 'a_appeler', 'pas_de_reponse', 'rappel', 'qualifie', 'non_qualifie',
    'rdv_pris', 'visite', 'non_visite', 'vente', 'perdu'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.call_result as enum (
    'reponse', 'pas_de_reponse', 'telephone_eteint', 'mauvais_numero',
    'rappeler', 'interesse', 'non_interesse', 'rdv_obtenu'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum (
    'planifie', 'confirme', 'visite', 'non_visite', 'reporte', 'annule'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interest_level as enum ('tres_chaud', 'chaud', 'moyen', 'froid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum (
    'meta_ads', 'google_ads', 'production_video', 'shooting', 'influenceur',
    'impression', 'deplacement', 'commercial', 'centre_appel', 'logiciel', 'autre'
  );
exception when duplicate_object then null; end $$;

-- ========== HELPERS (génériques) ==========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== USERS (profils liés à auth.users) ==========
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'crc',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Sync profil à la création auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'crc')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== PROJECTS ==========
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  developer_name text not null,
  city text not null,
  address text,
  description text,
  image_url text,
  commission_type public.commission_type not null,
  commission_value numeric(12, 2) not null default 0,
  status public.project_status not null default 'actif',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_commission_value_check check (commission_value >= 0)
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_users (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_users_user_id_idx on public.project_users(user_id);
create index if not exists project_users_project_id_idx on public.project_users(project_id);

-- ========== HELPERS (dépendent de users / project_users) ==========
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and active = true
      and role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and active = true and role = 'super_admin'
  );
$$;

create or replace function public.user_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_or_above()
    or exists (
      select 1 from public.project_users pu
      where pu.project_id = p_project_id and pu.user_id = auth.uid()
    );
$$;

-- ========== UNITS (LOTS) ==========
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reference text not null,
  property_type public.property_type not null default 'appartement',
  floor text,
  surface numeric(10, 2),
  bedrooms integer,
  catalog_price numeric(14, 2) not null default 0,
  sale_price numeric(14, 2),
  price_per_sqm numeric(14, 2) generated always as (
    case when surface is not null and surface > 0
      then round(catalog_price / surface, 2)
      else null
    end
  ) stored,
  commission_type public.commission_type,
  commission_value numeric(12, 2),
  status public.unit_status not null default 'disponible',
  client_lead_id uuid,
  sold_by uuid references public.users(id),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reference)
);

create trigger units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

create index if not exists units_project_id_idx on public.units(project_id);
create index if not exists units_status_idx on public.units(status);

-- ========== LEADS ==========
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  project_id uuid not null references public.projects(id),
  source public.lead_source not null default 'autre',
  status public.lead_status not null default 'nouveau',
  assigned_crc_id uuid references public.users(id),
  next_action_at timestamptz,
  last_comment text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create index if not exists leads_project_id_idx on public.leads(project_id);
create index if not exists leads_assigned_crc_id_idx on public.leads(assigned_crc_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_phone_idx on public.leads(phone);

-- FK client sur units après création leads
alter table public.units
  drop constraint if exists units_client_lead_id_fkey;
alter table public.units
  add constraint units_client_lead_id_fkey
  foreign key (client_lead_id) references public.leads(id);

-- ========== CALLS ==========
create table if not exists public.lead_calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  crc_id uuid not null references public.users(id),
  call_date timestamptz not null default now(),
  result public.call_result not null,
  comment text,
  next_action_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lead_calls_lead_id_idx on public.lead_calls(lead_id);
create index if not exists lead_calls_crc_id_idx on public.lead_calls(crc_id);

-- ========== APPOINTMENTS ==========
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  project_id uuid not null references public.projects(id),
  crc_id uuid references public.users(id),
  commercial_id uuid references public.users(id),
  appointment_date timestamptz not null,
  status public.appointment_status not null default 'planifie',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create index if not exists appointments_project_id_idx on public.appointments(project_id);
create index if not exists appointments_commercial_id_idx on public.appointments(commercial_id);
create index if not exists appointments_date_idx on public.appointments(appointment_date);

-- ========== VISITS ==========
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  lead_id uuid not null references public.leads(id),
  project_id uuid not null references public.projects(id),
  commercial_id uuid not null references public.users(id),
  status public.appointment_status not null default 'visite',
  interest_level public.interest_level,
  budget numeric(14, 2),
  property_type public.property_type,
  lot_id uuid references public.units(id),
  comment text,
  next_action_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

create index if not exists visits_project_id_idx on public.visits(project_id);
create index if not exists visits_commercial_id_idx on public.visits(commercial_id);

-- ========== SALES ==========
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  unit_id uuid not null references public.units(id),
  lead_id uuid not null references public.leads(id),
  commercial_id uuid not null references public.users(id),
  sale_price numeric(14, 2) not null,
  commission_amount numeric(14, 2) not null,
  commission_type public.commission_type not null,
  commission_value numeric(12, 2) not null,
  sale_date date not null default current_date,
  comment text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (unit_id)
);

create index if not exists sales_project_id_idx on public.sales(project_id);
create index if not exists sales_commercial_id_idx on public.sales(commercial_id);
create index if not exists sales_sale_date_idx on public.sales(sale_date);

-- ========== EXPENSES ==========
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  category public.expense_category not null default 'autre',
  description text not null,
  amount_ht numeric(14, 2) not null,
  amount_ttc numeric(14, 2),
  expense_date date not null default current_date,
  supplier text,
  document_url text,
  comment text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists expenses_project_id_idx on public.expenses(project_id);
create index if not exists expenses_date_idx on public.expenses(expense_date);

-- ========== ACTIVITIES (historique) ==========
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references public.users(id),
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_lead_id_idx on public.activities(lead_id);
create index if not exists activities_project_id_idx on public.activities(project_id);
create index if not exists activities_created_at_idx on public.activities(created_at desc);

-- ========== NOTIFICATIONS ==========
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id, read);

-- ========== COMMISSION HELPER ==========
create or replace function public.calculate_commission(
  p_sale_price numeric,
  p_commission_type public.commission_type,
  p_commission_value numeric
)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_commission_type = 'percentage' then
    return round(p_sale_price * (p_commission_value / 100.0), 2);
  elsif p_commission_type = 'fixed' then
    return round(p_commission_value, 2);
  else
    -- custom_per_unit : valeur déjà définie sur le lot
    return round(coalesce(p_commission_value, 0), 2);
  end if;
end;
$$;

-- Enregistrement vente : met à jour lot + lead + activité
create or replace function public.register_sale(
  p_project_id uuid,
  p_unit_id uuid,
  p_lead_id uuid,
  p_commercial_id uuid,
  p_sale_price numeric,
  p_sale_date date,
  p_comment text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_unit public.units%rowtype;
  v_type public.commission_type;
  v_value numeric;
  v_commission numeric;
  v_sale public.sales%rowtype;
begin
  if not (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'commercial'
      and public.user_has_project_access(p_project_id)
    )
  ) then
    raise exception 'Permission refusée pour enregistrer une vente';
  end if;

  select * into v_project from public.projects where id = p_project_id;
  if not found then raise exception 'Projet introuvable'; end if;

  select * into v_unit from public.units where id = p_unit_id for update;
  if not found then raise exception 'Lot introuvable'; end if;
  if v_unit.project_id <> p_project_id then
    raise exception 'Le lot n''appartient pas au projet';
  end if;
  if v_unit.status = 'vendu' then
    raise exception 'Ce lot est déjà vendu';
  end if;

  if v_unit.commission_type is not null then
    v_type := v_unit.commission_type;
    v_value := coalesce(v_unit.commission_value, 0);
  else
    v_type := v_project.commission_type;
    v_value := v_project.commission_value;
  end if;

  -- Pour custom_per_unit au niveau projet sans override lot : utiliser commission_value du lot
  if v_type = 'custom_per_unit' and v_unit.commission_value is not null then
    v_value := v_unit.commission_value;
  end if;

  v_commission := public.calculate_commission(p_sale_price, v_type, v_value);

  insert into public.sales (
    project_id, unit_id, lead_id, commercial_id,
    sale_price, commission_amount, commission_type, commission_value,
    sale_date, comment, created_by
  ) values (
    p_project_id, p_unit_id, p_lead_id, p_commercial_id,
    p_sale_price, v_commission, v_type, v_value,
    coalesce(p_sale_date, current_date), p_comment, auth.uid()
  )
  returning * into v_sale;

  update public.units
  set
    status = 'vendu',
    sale_price = p_sale_price,
    client_lead_id = p_lead_id,
    sold_by = p_commercial_id,
    sold_at = now()
  where id = p_unit_id;

  update public.leads
  set status = 'vente'
  where id = p_lead_id;

  insert into public.activities (lead_id, project_id, user_id, activity_type, description, metadata)
  values (
    p_lead_id,
    p_project_id,
    auth.uid(),
    'sale_created',
    'Vente enregistrée',
    jsonb_build_object(
      'sale_id', v_sale.id,
      'unit_id', p_unit_id,
      'sale_price', p_sale_price,
      'commission_amount', v_commission
    )
  );

  return v_sale;
end;
$$;

-- ========== RLS ==========
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_users enable row level security;
alter table public.units enable row level security;
alter table public.leads enable row level security;
alter table public.lead_calls enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;

-- USERS
create policy "users_select_authenticated"
  on public.users for select to authenticated
  using (active = true or id = auth.uid() or public.is_admin_or_above());

create policy "users_update_self_or_super"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

create policy "users_insert_super"
  on public.users for insert to authenticated
  with check (public.is_super_admin() or id = auth.uid());

-- PROJECTS
create policy "projects_select"
  on public.projects for select to authenticated
  using (
    public.is_admin_or_above()
    or public.current_user_role() = 'crc'
    or public.user_has_project_access(id)
  );

create policy "projects_insert_admin"
  on public.projects for insert to authenticated
  with check (public.is_admin_or_above());

create policy "projects_update_admin"
  on public.projects for update to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

create policy "projects_delete_super"
  on public.projects for delete to authenticated
  using (public.is_super_admin());

-- PROJECT_USERS
create policy "project_users_select"
  on public.project_users for select to authenticated
  using (
    public.is_admin_or_above()
    or user_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

create policy "project_users_manage_admin"
  on public.project_users for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- UNITS
create policy "units_select"
  on public.units for select to authenticated
  using (public.user_has_project_access(project_id) or public.current_user_role() = 'crc');

create policy "units_write_admin"
  on public.units for insert to authenticated
  with check (public.is_admin_or_above());

create policy "units_update_staff"
  on public.units for update to authenticated
  using (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'commercial'
      and public.user_has_project_access(project_id)
    )
  );

-- LEADS
create policy "leads_select"
  on public.leads for select to authenticated
  using (
    public.is_admin_or_above()
    or assigned_crc_id = auth.uid()
    or public.current_user_role() = 'crc'
    or public.user_has_project_access(project_id)
  );

create policy "leads_insert"
  on public.leads for insert to authenticated
  with check (
    public.is_admin_or_above()
    or public.current_user_role() = 'crc'
  );

create policy "leads_update"
  on public.leads for update to authenticated
  using (
    public.is_admin_or_above()
    or assigned_crc_id = auth.uid()
    or public.current_user_role() = 'crc'
    or public.user_has_project_access(project_id)
  );

-- LEAD_CALLS
create policy "lead_calls_select"
  on public.lead_calls for select to authenticated
  using (
    public.is_admin_or_above()
    or crc_id = auth.uid()
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.assigned_crc_id = auth.uid()
          or public.user_has_project_access(l.project_id)
        )
    )
  );

create policy "lead_calls_insert_crc"
  on public.lead_calls for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'crc'
      and crc_id = auth.uid()
    )
  );

-- APPOINTMENTS
create policy "appointments_select"
  on public.appointments for select to authenticated
  using (
    public.is_admin_or_above()
    or crc_id = auth.uid()
    or commercial_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

create policy "appointments_insert"
  on public.appointments for insert to authenticated
  with check (
    public.is_admin_or_above()
    or public.current_user_role() = 'crc'
  );

create policy "appointments_update"
  on public.appointments for update to authenticated
  using (
    public.is_admin_or_above()
    or crc_id = auth.uid()
    or commercial_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

-- VISITS
create policy "visits_select"
  on public.visits for select to authenticated
  using (
    public.is_admin_or_above()
    or commercial_id = auth.uid()
    or public.user_has_project_access(project_id)
    or public.current_user_role() = 'crc'
  );

create policy "visits_insert"
  on public.visits for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'commercial'
      and commercial_id = auth.uid()
    )
  );

create policy "visits_update"
  on public.visits for update to authenticated
  using (
    public.is_admin_or_above()
    or commercial_id = auth.uid()
  );

-- SALES (CRC lecture interdite implicitement via rôles)
create policy "sales_select"
  on public.sales for select to authenticated
  using (
    public.is_admin_or_above()
    or commercial_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

create policy "sales_insert"
  on public.sales for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'commercial'
      and commercial_id = auth.uid()
      and public.user_has_project_access(project_id)
    )
  );

-- EXPENSES (admin only)
create policy "expenses_select_admin"
  on public.expenses for select to authenticated
  using (public.is_admin_or_above());

create policy "expenses_write_admin"
  on public.expenses for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ACTIVITIES
create policy "activities_select"
  on public.activities for select to authenticated
  using (
    public.is_admin_or_above()
    or user_id = auth.uid()
    or (
      lead_id is not null and exists (
        select 1 from public.leads l
        where l.id = lead_id
          and (
            l.assigned_crc_id = auth.uid()
            or public.current_user_role() = 'crc'
            or public.user_has_project_access(l.project_id)
          )
      )
    )
  );

create policy "activities_insert"
  on public.activities for insert to authenticated
  with check (auth.uid() is not null);

-- NOTIFICATIONS
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_insert_authenticated"
  on public.notifications for insert to authenticated
  with check (public.is_admin_or_above() or user_id = auth.uid());
