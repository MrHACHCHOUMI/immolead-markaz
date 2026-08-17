-- Fix récursion RLS sur public.users (cause : login infini / loader bloqué)

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
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
set row_security = off
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
set row_security = off
as $$
  select
    public.is_admin_or_above()
    or exists (
      select 1 from public.project_users pu
      where pu.project_id = p_project_id and pu.user_id = auth.uid()
    );
$$;

-- Policy users plus simple (évite d’appeler is_admin_or_above dans tous les cas)
drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
  on public.users for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin_or_above()
  );

-- Garantit le profil Super Admin Issam
insert into public.users (id, full_name, email, role, active)
values (
  '4d376402-63d1-45b9-a567-cc387adc1fa3',
  'Issam',
  'issam@digisyma.com',
  'super_admin',
  true
)
on conflict (id) do update
set
  role = 'super_admin',
  full_name = excluded.full_name,
  email = excluded.email,
  active = true;
