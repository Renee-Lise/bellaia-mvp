-- Scénarios de la migration 0131 (exécutés après la migration). Chaque ligne affiche t (vrai) ou f (faux).
create or replace function pg_temp.essai(sub text, q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
create or replace function pg_temp.compte(sub text, q text) returns int language plpgsql as $$
declare n int; begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q into n; execute 'reset role'; return n;
exception when others then execute 'reset role'; return -1; end $$;
create or replace function pg_temp.anon(q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', '{}', true); execute 'set local role anon'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
\set A '00000000-0000-0000-0000-0000000000a1'
\set B '00000000-0000-0000-0000-0000000000b1'
\set F '00000000-0000-0000-0000-0000000000f1'
insert into public.profiles(id, role) values (:'A', 'assistante'), (:'B', 'assistante'), (:'F', 'fondatrice');
select '1 une personne enregistre sa disponibilité' t, pg_temp.essai(:'A', $q$insert into public.agenda_disponibilites(univers, jour, debut, fin) values ('FOOD', 1, '09:00', '12:00')$q$) = 'accepté' ok;
select '1b propriétaire = elle-même par défaut' t, (select count(*) = 1 and bool_and(proprietaire = :'A') from public.agenda_disponibilites) ok
union all select '2 enregistrer pour une autre personne refusé', pg_temp.essai(:'A', format($q$insert into public.agenda_disponibilites(proprietaire, jour, debut, fin) values (%L, 2, '09:00', '10:00')$q$, :'B')) = 'refusé'
union all select '3 B enregistre la sienne', pg_temp.essai(:'B', $q$insert into public.agenda_disponibilites(jour, debut, fin) values (3, '14:00', '18:00')$q$) = 'accepté'
union all select '4 A ne voit que ses disponibilités', pg_temp.compte(:'A', 'select count(*) from public.agenda_disponibilites') = 1
union all select '5 A ne peut pas modifier celle de B (0 ligne touchée)', pg_temp.compte(:'A', 'with m as (update public.agenda_disponibilites set fin = ''23:00'' where proprietaire <> auth.uid() returning 1) select count(*) from m') = 0
union all select '6 A ne peut pas supprimer celle de B (0 ligne)', pg_temp.compte(:'A', 'with m as (delete from public.agenda_disponibilites where proprietaire <> auth.uid() returning 1) select count(*) from m') = 0
union all select '7 la fondatrice voit tout', pg_temp.compte(:'F', 'select count(*) from public.agenda_disponibilites') = 2
union all select '8 la fondatrice peut corriger pour une autre personne', pg_temp.essai(:'F', format($q$insert into public.agenda_disponibilites(proprietaire, jour, debut, fin) values (%L, 5, '08:00', '09:00')$q$, :'B')) = 'accepté'
union all select '9 jour 8 refusé', pg_temp.essai(:'A', $q$insert into public.agenda_disponibilites(jour, debut, fin) values (8, '09:00', '10:00')$q$) = 'refusé'
union all select '10 fin avant début refusée', pg_temp.essai(:'A', $q$insert into public.agenda_disponibilites(jour, debut, fin) values (2, '12:00', '09:00')$q$) = 'refusé'
union all select '11 créneau de 2 minutes refusé', pg_temp.essai(:'A', $q$insert into public.agenda_disponibilites(jour, debut, fin, duree_creneau_min) values (2, '09:00', '10:00', 2)$q$) = 'refusé'
union all select '12 indisponibilité sur journée entière acceptée', pg_temp.essai(:'A', $q$insert into public.agenda_indisponibilites(jour, motif) values ('2026-12-25', 'privé')$q$) = 'accepté'
union all select '13 indisponibilité fin avant début refusée', pg_temp.essai(:'A', $q$insert into public.agenda_indisponibilites(jour, debut, fin) values ('2026-12-26', '15:00', '14:00')$q$) = 'refusé'
union all select '14 le motif privé de A est invisible pour B', pg_temp.compte(:'B', 'select count(*) from public.agenda_indisponibilites') = 0
union all select '15 visiteur non connecté : lecture refusée', pg_temp.anon('select * from public.agenda_disponibilites') = 'refusé'
union all select '16 visiteur non connecté : écriture refusée', pg_temp.anon($q$insert into public.agenda_disponibilites(proprietaire, jour, debut, fin) values ('00000000-0000-0000-0000-0000000000a1', 1, '09:00', '10:00')$q$) = 'refusé';
