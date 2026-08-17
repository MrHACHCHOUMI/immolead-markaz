-- Accès équipe : CRC / commercial limités à leur projet
-- Exécuter dans Supabase → SQL Editor → Run

drop policy if exists "users_update_self_or_super" on public.users;
create policy "users_update_self_or_admin"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin_or_above())
  with check (id = auth.uid() or public.is_admin_or_above());

drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
  on public.projects for select to authenticated
  using (
    public.is_admin_or_above()
    or public.user_has_project_access(id)
  );

drop policy if exists "units_select" on public.units;
create policy "units_select"
  on public.units for select to authenticated
  using (
    public.is_admin_or_above()
    or public.user_has_project_access(project_id)
  );

drop policy if exists "leads_select" on public.leads;
create policy "leads_select"
  on public.leads for select to authenticated
  using (
    public.is_admin_or_above()
    or assigned_crc_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert"
  on public.leads for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() in ('crc', 'commercial')
      and public.user_has_project_access(project_id)
    )
  );

drop policy if exists "leads_update" on public.leads;
create policy "leads_update"
  on public.leads for update to authenticated
  using (
    public.is_admin_or_above()
    or assigned_crc_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

drop policy if exists "visits_select" on public.visits;
create policy "visits_select"
  on public.visits for select to authenticated
  using (
    public.is_admin_or_above()
    or commercial_id = auth.uid()
    or public.user_has_project_access(project_id)
  );

drop policy if exists "visits_insert" on public.visits;
create policy "visits_insert"
  on public.visits for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() in ('crc', 'commercial')
      and public.user_has_project_access(project_id)
    )
  );

drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert"
  on public.appointments for insert to authenticated
  with check (
    public.is_admin_or_above()
    or (
      public.current_user_role() = 'crc'
      and public.user_has_project_access(project_id)
    )
  );
