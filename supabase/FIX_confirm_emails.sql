-- Confirme tous les comptes Auth non confirmés (CRC / commercial / admin créés depuis Équipe)
-- Supabase → SQL Editor → Run
--
-- Puis désactive la confirmation email :
-- Authentication → Providers → Email → "Confirm email" = OFF
-- sinon les prochains agents auront le même problème.

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- Vérification
select email, email_confirmed_at, created_at
from auth.users
order by created_at desc;
