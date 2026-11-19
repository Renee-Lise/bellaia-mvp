-- RETOUR ARRIÈRE de 0128 (à n'exécuter que sur décision de la fondatrice).
-- Les nouvelles tables sont RENOMMÉES (pas supprimées) pour conserver
-- leurs données ; les colonnes ajoutées sont conservées (sans effet).
drop trigger if exists bsh_garde_mission on public.bsh_missions;
drop trigger if exists bsh_garde_remuneration on public.bsh_remunerations;
-- Statuts de mission d'origine (échoue si des missions « acceptee »/« refusee » existent : les traiter d'abord)
alter table public.bsh_missions drop constraint if exists bsh_missions_statut_check;
alter table public.bsh_missions add constraint bsh_missions_statut_check check (statut in ('proposee', 'confirmee', 'terminee', 'annulee'));
alter table if exists public.bsh_hotes_candidatures rename to zz_0128_bsh_hotes_candidatures;
alter table if exists public.bsh_hotes_disponibilites rename to zz_0128_bsh_hotes_disponibilites;
alter table if exists public.bsh_missions_presences rename to zz_0128_bsh_missions_presences;
alter table if exists public.bsh_interventions rename to zz_0128_bsh_interventions;
alter table if exists public.bsh_hotes_documents rename to zz_0128_bsh_hotes_documents;
alter table if exists public.bsh_remunerations rename to zz_0128_bsh_remunerations;
alter table if exists public.bsh_hotes_messages rename to zz_0128_bsh_hotes_messages;
revoke execute on function public.bsh_hote_repondre(uuid, text, text), public.bsh_hote_pointer(uuid, text), public.bsh_hote_messages_lus() from authenticated;
