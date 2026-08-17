-- Nettoie l'ancien profil email puis recrée depuis Auth
delete from public.users
where email = 'issam@digisyma.com';

insert into public.users (id, full_name, email, role, active)
select
  id,
  'Issam',
  email,
  'super_admin'::public.user_role,
  true
from auth.users
where email = 'issam@digisyma.com';

select id, email, role, full_name, active
from public.users
where email = 'issam@digisyma.com';
