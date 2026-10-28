-- ═══════════════════════════════════════════════════════════
-- 0043_bsh_jeux_publication_av_cap.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Renée-Lise a validé le contenu d'"Action ou Vérité" et de
--   "Cap ou pas cap" (migration 0042) — passage au statut 'publie',
--   ce qui les rend visibles côté client sur /bsh/secret-games
--   (sélecteur de jeu, aux côtés d'"Amour, Gloire ou Audace").
--
-- Impact : UPDATE ciblé sur 2 lignes de bsh_jeux, idempotent.
-- ═══════════════════════════════════════════════════════════

update public.bsh_jeux
set statut = 'publie', updated_at = now()
where nom in ('Action ou Vérité', 'Cap ou pas cap')
  and statut = 'brouillon';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select nom, statut from public.bsh_jeux
--   where nom in ('Action ou Vérité','Cap ou pas cap');
--   → attendu : les deux lignes avec statut='publie'.
-- ═══════════════════════════════════════════════════════════
