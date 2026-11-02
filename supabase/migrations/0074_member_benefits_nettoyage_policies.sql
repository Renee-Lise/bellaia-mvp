-- ═══════════════════════════════════════════════════════════
-- 0074_member_benefits_nettoyage_policies.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-11-02
-- Objet : la migration 0073 supposait member_benefits inexistante
--   (comme bellaia_commandes/invoices l'étaient réellement cette
--   session) et a créé 2 policies par prudence. Vérification faite :
--   la table existait déjà, avec ses propres policies
--   (benefits_fondatrice, benefits_membre_select) plus précises que
--   les miennes — benefits_membre_select filtre par member_tiers
--   (niveau d'adhésion), alors que ma member_benefits_lecture_active
--   rendait tout avantage actif visible par n'importe quelle membre,
--   sans respecter ce filtre. Comme les policies RLS se combinent en
--   OR, ma policy en trop élargissait réellement l'accès au-delà de
--   ce qui est prévu — à corriger.
--
-- Impact : supprime seulement les 2 policies ajoutées par erreur en
--   0073. Les policies d'origine (benefits_fondatrice,
--   benefits_membre_select) ne sont pas touchées. Aucune donnée
--   modifiée.
-- ═══════════════════════════════════════════════════════════

drop policy if exists member_benefits_fondatrice on public.member_benefits;
drop policy if exists member_benefits_lecture_active on public.member_benefits;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='member_benefits'
--   order by policyname;
--   → attendu : exactement 2 lignes (benefits_fondatrice,
--     benefits_membre_select) — les deux ajoutées par 0073 ont
--     disparu.
-- ═══════════════════════════════════════════════════════════
