-- ═══════════════════════════════════════════════════════════
-- 0011_stocks_lecture_publique_bsh.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-08
-- Objet : `stocks` n'a jamais eu de policy de lecture publique —
--         seule policy existante : "Fondatrice gère les stocks"
--         (FOR ALL, is_fondatrice()). RLS active + aucune policy pour
--         anon/authenticated = refus total. Conséquence concrète :
--         /bsh/boutique et /bsh/coffrets (clé anonyme) n'ont jamais pu
--         afficher le moindre produit, quelles que soient les valeurs
--         de univers/categorie/statut sur la fiche produit (vérifié
--         avec Renée-Lise : produit test correctement univers=BSH,
--         statut=actif, toujours "La boutique se prépare"). Le même
--         trou touche aussi /bsh/espace/panier et /bsh/espace/favoris
--         pour une CLIENTE connectée (pas seulement la visiteuse
--         anonyme) : ces deux pages lisent stocks via l'embed
--         PostgREST panier_items(...,stocks(...)) / favoris(...,
--         stocks(...)), qui applique les policies de `stocks` lui-même
--         — une cliente normale n'est pas non plus fondatrice, donc
--         `is_fondatrice()` est faux pour elle aussi. Pas détecté par
--         le test favoris/panier/réservations précédent parce qu'il
--         vérifiait l'écriture (RLS sur panier_items/favoris, déjà
--         réparée par la 0009), pas la lecture du produit associé.
-- Risque identifié avant d'écrire cette migration : `stocks` contient
--   des colonnes internes sensibles (prix d'achat, quantités, marges).
--   Une simple policy SELECT au niveau ligne exposerait TOUTES les
--   colonnes des lignes concernées à quiconque dispose de la clé
--   anonyme (ex. stocks?select=* en dehors de l'app) — pas seulement
--   les champs que la page affiche. Corrigé en combinant RLS (quelles
--   LIGNES) et privilèges au niveau colonne (quelles COLONNES) :
--   aucune donnée interne (prix_achat, quantite, quantite_min, marge…)
--   n'est accessible à anon/authenticated, qu'importe la requête
--   envoyée — Postgres refuse toute colonne non accordée, même avec
--   select=*.
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
--   Test décisif (reprend celui qui a servi à diagnostiquer) :
--   begin;
--   set local role anon;
--   select id, nom, univers, statut from public.stocks
--   where univers = 'BSH' and statut = 'actif';
--   rollback;
--   → attendu : au moins 1 ligne (le produit test), alors que ce même
--     bloc renvoyait 0 ligne avant cette migration.
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
--   afficher le nom/la catégorie du produit (pas une ligne vide avec
--   juste la quantité), avec un compte cliente de test.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
