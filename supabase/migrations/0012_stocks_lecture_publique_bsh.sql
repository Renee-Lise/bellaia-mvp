-- ═══════════════════════════════════════════════════════════
-- 0012_stocks_lecture_publique_bsh.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-10
-- Objet : `stocks` n'a jamais eu de policy de lecture publique —
--         seule policy existante : "Fondatrice gère les stocks"
--         (FOR ALL, is_fondatrice()). RLS active + aucune policy pour
--         anon/authenticated = refus total. Conséquence concrète :
--         /bsh/boutique et /bsh/coffrets (clé anonyme) n'ont jamais pu
--         afficher le moindre produit. Même trou pour une cliente
--         connectée sur /bsh/espace/panier et /bsh/espace/favoris, qui
--         lisent stocks via un embed PostgREST (panier_items(...,
--         stocks(...)) / favoris(...,stocks(...))), soumis aux mêmes
--         policies — une cliente normale n'est pas fondatrice non
--         plus. Doit être exécutée APRÈS la migration 0011 : le GRANT
--         ci-dessous porte sur des colonnes (tailles, composition,
--         usage_conseils, entretien) qui n'existaient pas avant elle.
-- Risque identifié avant d'écrire cette migration : `stocks` contient
--   aussi des colonnes internes sensibles (prix_vente, prix_achat,
--   quantite, quantite_min — ajoutées ou déjà présentes). Une simple
--   policy SELECT au niveau ligne exposerait TOUTES les colonnes des
--   lignes concernées à quiconque dispose de la clé anonyme (ex.
--   stocks?select=* en dehors de l'app) — pas seulement les champs
--   que la page affiche. Corrigé en combinant RLS (quelles LIGNES) et
--   privilèges au niveau colonne (quelles COLONNES) : prix_vente et
--   prix_achat ne sont PAS accordés à anon/authenticated, qu'importe
--   la requête envoyée — Postgres refuse toute colonne non accordée,
--   même avec select=*.
-- Impact : additive uniquement.
--   - Nouvelle policy SELECT, en plus de "Fondatrice gère les
--     stocks" (inchangée) — les policies RLS permissives se combinent
--     en OR, jamais en restriction mutuelle : l'accès fondatrice
--     actuel n'est ni réduit ni modifié.
--   - GRANT de colonnes, additif (n'enlève aucun privilège existant).
--   - Aucune donnée, table ou colonne existante modifiée ou supprimée.
-- ═══════════════════════════════════════════════════════════

grant select (id, nom, categorie, notes, tailles, composition, usage_conseils, entretien, image_url)
  on public.stocks
  to anon, authenticated;

drop policy if exists stocks_lecture_publique_bsh_actif on public.stocks;
create policy stocks_lecture_publique_bsh_actif on public.stocks
  for select
  to anon, authenticated
  using (univers = 'BSH' and statut = 'actif');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select policyname, cmd, roles, qual from pg_policies
--   where schemaname = 'public' and tablename = 'stocks';
--   → attendu : 2 lignes — "Fondatrice gère les stocks" (inchangée)
--     et "stocks_lecture_publique_bsh_actif" (SELECT, {anon,
--     authenticated}, univers = 'BSH' AND statut = 'actif').
--
--   Test décisif :
--   begin;
--   set local role anon;
--   select id, nom, univers, statut from public.stocks
--   where univers = 'BSH' and statut = 'actif';
--   rollback;
--   → attendu : au moins 1 ligne (le produit test).
--
--   Contrôle d'étanchéité (doit échouer, et c'est voulu) :
--   begin;
--   set local role anon;
--   select prix_achat from public.stocks limit 1;
--   rollback;
--   → attendu : erreur 42501 (permission denied for column
--     prix_achat) — confirme que seules les colonnes listées plus
--     haut sont exposées, pas les données internes.
--
--   Fonctionnel : /bsh/boutique et /bsh/coffrets doivent afficher le
--   produit test. /bsh/espace/panier et /bsh/espace/favoris doivent
--   afficher le nom/la catégorie du produit, avec un compte cliente
--   de test.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation,
-- et seulement après la migration 0011.
-- ═══════════════════════════════════════════════════════════
