-- ═══════════════════════════════════════════════════════════
-- 0049_food_recettes_rls_fondatrice.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-29 (une seule policy food_recettes_fondatrice basée sur is_fondatrice(), exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-29
-- Objet : correctif de sécurité confirmé par Renée-Lise — la policy
--   actuelle sur food_recettes ("food_recettes_auth", FOR ALL,
--   using auth.role()='authenticated') autorise N'IMPORTE QUELLE
--   cliente connectée (pas seulement la fondatrice) à créer, modifier
--   ou supprimer des recettes. food_recettes est un outil de gestion
--   interne (catalogue/production), jamais une table consultée
--   publiquement — seule la fondatrice doit pouvoir y écrire ou lire.
--
-- Portée volontairement limitée à food_recettes pour ce tour : les 3
-- autres tables signalées (food_commandes, food_stocks,
-- catalogue_produits) et ref_compteurs (RLS désactivé) restent en
-- l'état. Les corriger à l'aveugle risquerait de casser un flux
-- client déjà en place que je n'ai pas encore audité (ex. prise de
-- commande côté ClientFood) — remise à plat prévue avec la zone
-- Catalogue/Commandes, pas glissée dans ce pilote Recettes.
--
-- Impact : remplace une seule policy sur une seule table existante.
--   Aucune donnée touchée (table vide à ce stade). is_fondatrice()
--   est déjà utilisée par toutes les policies "fondatrice" de BSH
--   (ex. bsh_hotes, bsh_jeux) — même fonction réutilisée ici.
-- ═══════════════════════════════════════════════════════════

drop policy if exists food_recettes_auth on public.food_recettes;
drop policy if exists food_recettes_fondatrice on public.food_recettes;

create policy food_recettes_fondatrice on public.food_recettes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname='public' and tablename='food_recettes';
--   → attendu : une seule ligne, policyname='food_recettes_fondatrice',
--     qual contenant "is_fondatrice()" (plus de policy
--     "food_recettes_auth").
-- ═══════════════════════════════════════════════════════════
