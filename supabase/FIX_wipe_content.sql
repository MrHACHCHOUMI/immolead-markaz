-- Vide projets, biens (lots) et charges / dépenses.
-- ATTENTION : les leads, visites, RDV et ventes liés aux projets sont aussi
-- supprimés (contrainte base de données). Les comptes équipe et les
-- paramètres agence sont conservés.
--
-- Supabase → SQL Editor → coller → Run

begin;

truncate table
  public.sales,
  public.visits,
  public.appointments,
  public.lead_calls,
  public.activities,
  public.expenses,
  public.units,
  public.leads,
  public.project_users,
  public.projects
restart identity cascade;

commit;

select
  (select count(*) from public.projects) as projets,
  (select count(*) from public.units) as biens,
  (select count(*) from public.expenses) as depenses,
  (select count(*) from public.leads) as leads,
  (select count(*) from public.sales) as ventes,
  (select count(*) from public.users) as comptes;
