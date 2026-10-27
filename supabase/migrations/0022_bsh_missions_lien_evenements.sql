-- ═══════════════════════════════════════════════════════════
-- 0022_bsh_missions_lien_evenements.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : la migration 0014 avait volontairement laissé bsh_missions
--   découplée des événements réels ("un lien plus fin pourra venir
--   dans une migration ultérieure, une fois ce premier étage validé
--   en usage réel") — c'était un point ouvert de la punch-list.
--   Maintenant que bsh_evenements existe réellement (migration
--   0020), une mission peut être rattachée à un événement précis :
--   la fondatrice assigne une hôtesse à un événement donné d'un seul
--   geste, au lieu de ressaisir lieu/date à la main pour chaque
--   mission.
--
-- Choix de modélisation : colonne nullable — une mission reste
--   valide sans événement lié (ex. une mission ponctuelle hors
--   calendrier d'événements), le lien est une facilité, pas une
--   obligation.
--
-- Impact : entièrement additif.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_missions
  add column if not exists evenement_id uuid references public.bsh_evenements(id) on delete set null;

comment on column public.bsh_missions.evenement_id is
  'Événement BSH lié à cette mission, si applicable (nullable — une mission peut exister sans événement précis).';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='bsh_missions'
--   and column_name='evenement_id';
--   → attendu : 1 ligne, data_type = uuid.
-- ═══════════════════════════════════════════════════════════
