-- FIX LOGIN FINAL — coller UNIQUEMENT ceci dans SQL Editor puis Run

-- 1) Helpers sans récursion RLS
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = public
set row_security = off
as $$ select role from public.users where id = auth.uid(); $$;

create or replace function public.is_admin_or_above()
returns boolean
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and active = true and role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and active = true and role = 'super_admin'
  );
$$;

-- 2) Policies users simples
drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_update_self_or_super" on public.users;
drop policy if exists "users_insert_super" on public.users;

create policy "users_select_authenticated"
  on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin_or_above());

create policy "users_update_self_or_super"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

create policy "users_insert_own"
  on public.users for insert to authenticated
  with check (id = auth.uid() or public.is_super_admin());

-- 3) Recrée le profil Issam depuis Auth (ID à jour)
delete from public.users where email = 'issam@digisyma.com';

insert into public.users (id, full_name, email, role, active)
select id, 'Issam', email, 'super_admin'::public.user_role, true
from auth.users
where lower(email) = 'issam@digisyma.com';

-- 4) Vérification
select
  a.id as auth_id,
  a.email as auth_email,
  a.email_confirmed_at,
  u.id as profile_id,
  u.role,
  u.active
from auth.users a
left join public.users u on u.id = a.id
where lower(a.email) = 'issam@digisyma.com';
