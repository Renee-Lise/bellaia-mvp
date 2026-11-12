-- ═══════════════════════════════════════════════════════════
-- 0090_stocks_lecture_publique_odyssee.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : nouvel espace vente dans Bella'Odyssée (onglet "Boutique"
--   côté client) — lit `stocks` (univers='ODYSSEE'), même table que
--   la boutique BSH. La policy de lecture publique de la migration
--   0012 ne couvre que univers='BSH' : sans cette migration, la
--   boutique Odyssée resterait vide pour anon/authenticated (RLS
--   actif, aucune policy ne matche → 0 ligne), même avec des
--   produits en statut 'actif'.
-- prix_vente : réaffirme le GRANT SELECT sur cette colonne pour
--   anon/authenticated. Les migrations 0011/0012 l'avaient
--   volontairement exclu ("jamais affiché publiquement" — c'était
--   la règle BSH en vigueur à l'époque), mais le code actuel de
--   /bsh/boutique (BoutiqueClient.tsx) affiche déjà ce prix réel
--   quand il est renseigné : la règle a donc déjà été levée en
--   pratique côté BSH. Ce GRANT est un simple ré-octroi global sur
--   la colonne (pas de portée par univers) ; la décision explicite
--   de Renée-Lise pour Bella'Odyssée ("les prix que tu peux")
--   confirme qu'afficher prix_vente publiquement est désormais la
--   règle voulue, pas une exception.
-- Impact : additif uniquement (GRANT + nouvelle policy OR, aucune
--   policy existante modifiée ou supprimée).
-- ═══════════════════════════════════════════════════════════

grant select (prix_vente)
  on public.stocks
  to anon, authenticated;

drop policy if exists stocks_lecture_publique_odyssee_actif on public.stocks;
create policy stocks_lecture_publique_odyssee_actif on public.stocks
  for select
  to anon, authenticated
  using (univers = 'ODYSSEE' and statut = 'actif');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select policyname, cmd, roles, qual from pg_policies
--   where schemaname = 'public' and tablename = 'stocks';
--   → attendu : au moins 3 lignes, dont "stocks_lecture_publique_odyssee_actif".
--
--   Test décisif :
--   begin;
--   set local role anon;
--   select id, nom, prix_vente from public.stocks
--   where univers = 'ODYSSEE' and statut = 'actif';
--   rollback;
--   → attendu : 0 ligne tant que Yara rose / Yara rose poudré restent
--     en statut 'brouillon' (migration 0089) — repasse-les en 'actif'
--     depuis l'admin Stocks pour qu'ils apparaissent dans l'onglet
--     "Boutique" de Bella'Odyssée, puis relance ce test (doit alors
--     renvoyer 2 lignes avec leur prix).
-- ═══════════════════════════════════════════════════════════
