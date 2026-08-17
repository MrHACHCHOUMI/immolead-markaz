-- FIX MOT DE PASSE (à coller SEUL dans SQL Editor → Run)
-- Mot de passe après exécution : Issam2026!

create extension if not exists pgcrypto;

-- Confirme l'email + définit le mot de passe
update auth.users
set
  encrypted_password = crypt('Issam2026!', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change = '',
  email_change_token_new = '',
  updated_at = now()
where lower(email) = 'issam@digisyma.com';

-- Recrée / aligne le profil CRM
delete from public.users where lower(email) = 'issam@digisyma.com';

insert into public.users (id, full_name, email, role, active)
select id, 'Issam', email, 'super_admin'::public.user_role, true
from auth.users
where lower(email) = 'issam@digisyma.com';

-- Vérification
select
  u.email,
  u.email_confirmed_at is not null as confirme,
  p.role,
  p.active
from auth.users u
left join public.users p on p.id = u.id
where lower(u.email) = 'issam@digisyma.com';
