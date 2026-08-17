-- Ajoute le statut hors_budget pour qualification commerciale
do $$ begin
  alter type public.lead_status add value if not exists 'hors_budget';
exception when duplicate_object then null;
end $$;
