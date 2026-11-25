-- Retour arrière de 0141. À n'exécuter qu'après export des tables ci-dessous (preuves, ressources, créations, versions).
-- Les colonnes ajoutées aux tables existantes sont conservées (données intactes) ; seules les garde-fous et tables nouvelles sont retirés.
drop trigger if exists bsh_garde_publication on public.bsh_communications;
drop function if exists public.bsh_garde_publication();
drop function if exists public.bsh_confirmer_publication(uuid, text, text);
drop function if exists public.bsh_hote_execution(uuid, text, text);
drop policy if exists bsh_missions_remplacant on public.bsh_missions;
drop policy if exists bsh_communications_mission on public.bsh_communications;
drop policy if exists bsh_animations_mission on public.bsh_animations;
grant select on public.bsh_communications to anon;
drop table if exists public.bsh_creations_versions;
drop table if exists public.bsh_creations;
drop table if exists public.bsh_ressources;
drop table if exists public.bsh_preuves_publication;
drop function if exists public.bsh_versions_ajout_seul();
drop function if exists public.bsh_version_suivante();
drop table if exists public.bsh_assistant_contenus;
alter table public.bsh_musique_liens drop constraint if exists bsh_musique_liens_cible_type_check;
alter table public.bsh_musique_liens add constraint bsh_musique_liens_cible_type_check check (cible_type in ('campagne', 'animation', 'evenement')) not valid;
-- Contrainte revalidée comme en production si aucun lien créé depuis 0141 ne la contredit (sinon elle reste « not valid » : les lignes existantes sont conservées).
do $$ begin alter table public.bsh_musique_liens validate constraint bsh_musique_liens_cible_type_check; exception when check_violation then raise notice 'Liens postérieurs à 0141 conservés : contrainte laissée non validée'; end $$;
