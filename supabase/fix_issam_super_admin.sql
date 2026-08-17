-- Assure le profil CRM + rôle Super Admin pour Issam
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
  full_name = 'Issam',
  email = 'issam@digisyma.com',
  active = true;

select email, role, full_name, active
from public.users
where email = 'issam@digisyma.com';
