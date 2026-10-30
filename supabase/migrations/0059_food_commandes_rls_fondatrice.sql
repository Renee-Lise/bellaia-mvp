-- ═══════════════════════════════════════════════════════════
-- 0059_food_commandes_rls_fondatrice.sql
-- STATUT: VALIDÉ (exécutée et vérifiée le 30/10/2026)
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : correctif de sécurité sur food_commandes, même nature que
--   la migration 0049 sur food_recettes. Vérifié le 30/10 : la policy
--   actuelle ("food_commandes_auth", FOR ALL, roles {public}) utilise
--   auth.role()='authenticated' — n'importe quelle cliente connectée
--   peut lire ET modifier TOUTES les commandes de toutes les autres
--   clientes (noms, téléphones, prix, acomptes). food_commandes est
--   un outil de gestion interne (aucun écran côté cliente ne l'utilise
--   — les commandes clientes passent par bellaia_commandes, table
--   différente) : seule la fondatrice doit pouvoir y lire/écrire.
--
-- Impact : remplace une seule policy sur une seule table. N'affecte
--   aucune donnée, uniquement qui peut la lire/écrire.
-- ═══════════════════════════════════════════════════════════

drop policy if exists food_commandes_auth on public.food_commandes;
drop policy if exists food_commandes_fondatrice on public.food_commandes;

create policy food_commandes_fondatrice on public.food_commandes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd, roles, qual from pg_policies
--   where schemaname='public' and tablename='food_commandes';
--   → attendu : une seule ligne, policyname='food_commandes_fondatrice',
--     qual contenant "is_fondatrice()" (plus de policy
--     "food_commandes_auth").
-- ═══════════════════════════════════════════════════════════
