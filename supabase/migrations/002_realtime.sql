-- Active Supabase Realtime (WebSocket) sur les tables CRM
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.visits;
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.units;
alter publication supabase_realtime add table public.lead_calls;
