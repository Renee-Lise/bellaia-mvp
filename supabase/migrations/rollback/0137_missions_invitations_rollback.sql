-- Retour arrière de 0137 (les invitations créées depuis sont supprimées ; les rôles déjà accordés restent).
drop function if exists public.accepter_invitation(text, text);
drop function if exists public.creer_invitation(uuid, text[], text[], text);
drop table if exists public.bellaia_invitations;
drop function if exists public.mission_transferer(uuid, uuid, text);
drop function if exists public.mission_avancer(uuid, integer, text);
drop function if exists public.mission_accuser_reception(uuid);
drop policy if exists missions_assignee_lecture on public.bellaia_missions;
create policy missions_assignee_lecture on public.bellaia_missions for select using (assigne_a = auth.uid());
alter table public.bellaia_missions drop constraint if exists bellaia_missions_progression_check, drop constraint if exists bellaia_missions_nature_check;
alter table public.bellaia_missions drop column if exists transmis_par, drop column if exists progression, drop column if exists accuse_reception_le, drop column if exists nature;
