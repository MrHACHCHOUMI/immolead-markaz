-- Permissions création projets + rôle Issam
-- Coller SEUL dans SQL Editor → Run

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

-- Assure le rôle super_admin
update public.users
set role = 'super_admin', active = true
where lower(email) = 'issam@digisyma.com';

-- Recrée les policies projets (au cas où)
drop policy if exists "projects_insert_admin" on public.projects;
create policy "projects_insert_admin"
  on public.projects for insert to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
  on public.projects for select to authenticated
  using (
    public.is_admin_or_above()
    or public.current_user_role() = 'crc'
    or public.user_has_project_access(id)
  );

select email, role, active from public.users where lower(email) = 'issam@digisyma.com';
