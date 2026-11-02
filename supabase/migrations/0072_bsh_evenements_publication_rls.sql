-- ═══════════════════════════════════════════════════════════
-- 0072_bsh_evenements_publication_rls.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-02
-- Auteur : Claude Code · Date de rédaction : 2026-11-02
-- Objet : la migration 0071 a ajouté la colonne "publie" (workflow
--   brouillon/publié demandé pour BSH Experiences), mais la policy de
--   lecture publique existante sur bsh_evenements (migration 0020,
--   VALIDÉ) ne la vérifie pas — elle ne filtre que sur "statut"
--   (actif/complet). Un événement en brouillon (publie=false) mais
--   avec statut='actif' resterait donc techniquement lisible par
--   n'importe qui au niveau RLS, même si la nouvelle page publique
--   /bsh/experiences filtre elle-même sur publie=true côté requête.
--   Pour ne pas dépendre uniquement du filtre applicatif (même
--   principe que partout ailleurs cette session : la vraie barrière
--   doit être en base), la policy exige désormais les deux.
--
-- Impact : remplace une seule policy, condition plus stricte
--   (ajoute AND publie = true). Un événement déjà publié doit avoir
--   publie=true pour rester visible publiquement après cette
--   migration — à vérifier après exécution si des événements actifs
--   existants doivent être repassés en publie=true depuis l'onglet
--   Experiences.
-- ═══════════════════════════════════════════════════════════

drop policy if exists bsh_evenements_lecture_publique on public.bsh_evenements;
create policy bsh_evenements_lecture_publique on public.bsh_evenements
  for select to anon, authenticated
  using (statut in ('actif','complet') and publie = true);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd, roles, qual from pg_policies
--   where schemaname='public' and tablename='bsh_evenements'
--     and policyname='bsh_evenements_lecture_publique';
--   → attendu : qual contient "statut" ET "publie".
--
--   Contrôle (doit renvoyer 0 ligne si aucun événement n'a encore
--   été publié via l'onglet Experiences) :
--   begin;
--   set local role anon;
--   select id, nom, publie from public.bsh_evenements where statut in ('actif','complet');
--   rollback;
-- ═══════════════════════════════════════════════════════════
