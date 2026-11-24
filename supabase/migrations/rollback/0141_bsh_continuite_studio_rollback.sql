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
