-- Test local de 0132 (base jetable). Environnement : supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
create table public.bsh_hotes (id uuid primary key, profile_id uuid, statut text);
create table public.bsh_hotes_documents (id uuid primary key, hote_id uuid, type text, titre text, storage_path text, statut text, visible_hote boolean default true, signe_le timestamptz);
create function public.bsh_mon_hote() returns uuid language sql stable security definer set search_path = public as $$ select id from public.bsh_hotes where profile_id = auth.uid() and statut = 'active' limit 1 $$;
grant select, insert on storage.objects to authenticated;
insert into public.profiles values ('00000000-0000-0000-0000-0000000000f0', 'F', 'fondatrice', 'actif'), ('00000000-0000-0000-0000-00000000000a', 'H1', 'cliente', 'actif'), ('00000000-0000-0000-0000-00000000000b', 'H2', 'cliente', 'actif');
insert into public.bsh_hotes values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'active'), ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'active');
insert into public.bsh_hotes_documents values
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'identite', 'Pièce d''identité', null, 'a_fournir', true, null),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', 'charte', 'Charte', null, 'valide', true, null),
 ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000b', 'contrat', 'Contrat', null, 'a_signer', true, null);
