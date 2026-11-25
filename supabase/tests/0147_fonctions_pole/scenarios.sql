-- 0147 : fonctions par pôle (personnes fictives). Chaque ligne doit afficher « t ».
\set F '00000000-0000-0000-0000-0000000000f1'
\set L '00000000-0000-0000-0000-00000000a001'
\set O '00000000-0000-0000-0000-0000000000c1'
insert into public.business_units (code) values ('VILDOR'), ('FOOD'), ('EVENTS'), ('BSH') on conflict do nothing;
select '01 fondatrice : fondatrice du pôle Vil''Dor (organisation + pôle)', pg_temp.essai(:'F', format($q$insert into bellaia_roles(user_id, role, organisation_id, pole) values (%L,'fondatrice_pole',%L,'VILDOR')$q$, :'L', :'O')) = 'accepté'
union all select '02 hôte BSH, assistante et collaboratrice FOOD et EVENTS (6 fonctions au total)', pg_temp.essai(:'F', format($q$insert into bellaia_roles(user_id, role, pole) values (%1$L,'hote','BSH'),(%1$L,'assistante','FOOD'),(%1$L,'collaborateur','FOOD'),(%1$L,'assistante','EVENTS'),(%1$L,'collaborateur','EVENTS')$q$, :'L')) = 'accepté';
select '03 même fonction dans deux pôles : acceptée (assistante FOOD et EVENTS)', (select count(*) from bellaia_roles where user_id = :'L' and role = 'assistante' and pole in ('FOOD','EVENTS')) = 2
union all select '04 doublon exact (assistante FOOD) refusé', pg_temp.essai(:'F', format($q$insert into bellaia_roles(user_id, role, pole) values (%L,'assistante','FOOD')$q$, :'L')) = 'refusé'
union all select '05 pôle inconnu refusé', pg_temp.essai(:'F', format($q$insert into bellaia_roles(user_id, role, pole) values (%L,'assistante','INCONNU')$q$, :'L')) = 'refusé'
union all select '06 la personne ne peut pas s''attribuer une fonction elle-même', pg_temp.essai(:'L', format($q$insert into bellaia_roles(user_id, role, pole) values (%L,'fondatrice_pole','FOOD')$q$, :'L')) <> 'accepté'
union all select '07 « fondatrice du pôle » n''accorde aucun droit par elle-même (missions Vil''Dor)', not exists (select 1 from bellaia_permissions where user_id = :'L' and permission = 'missions.gerer') and pg_temp.compte(:'L', $q$select count(*) from bellaia_roles where false$q$) = 0
union all select '08 elle n''est pas fondatrice générale', (select role from profiles where id = :'L') <> 'fondatrice'
union all select '09 elle lit toutes ses fonctions et seulement les siennes', pg_temp.compte(:'L', 'select count(*) from bellaia_roles') = (select count(*) from bellaia_roles where user_id = :'L')
union all select '10 rôle inconnu toujours refusé', pg_temp.essai(:'F', format($q$insert into bellaia_roles(user_id, role, pole) values (%L,'fondatrice','FOOD')$q$, :'L')) = 'refusé';
