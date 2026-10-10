-- ═══════════════════════════════════════════════════════════
-- 0011_stocks_colonnes_fiche_produit_prix.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-10
-- Auteur : Claude Code · Date de rédaction : 2026-10-10
-- Objet : ajoute à `stocks` les 6 colonnes que la migration 0001
--         était censée créer (tailles, composition, usage_conseils,
--         entretien — section "1." de 0001, jamais exécutée, même
--         trou que favoris/panier_items/reservations_experiences) et
--         2 colonnes que l'admin Stocks (StocksF, formulaire "Fiche
--         produit BSH" + champs "Prix vente €"/"Prix achat €") exige
--         depuis toujours sans qu'elles aient jamais existé
--         (prix_vente, prix_achat).
-- Contexte : en tentant d'autoriser la lecture publique de `stocks`
--   pour /bsh/boutique (migration 0011 précédente, jamais exécutée
--   avec succès), le GRANT a échoué sur `tailles` — colonne absente.
--   Vérifié avec Renée-Lise (information_schema.columns) : aucune des
--   6 colonnes ci-dessus n'existe réellement. Conséquence beaucoup
--   plus large que la boutique : StocksF.sauvegarder() envoie
--   systématiquement ces 6 champs dans le corps de CHAQUE création ou
--   modification de produit — PostgREST rejette la requête entière
--   (colonne inconnue dans le schema cache) dès qu'un seul champ ne
--   correspond à aucune colonne. Autrement dit : aucun enregistrement
--   depuis l'admin Stocks n'a pu fonctionner tant que ces colonnes
--   n'existent pas, quel que soit le produit. Le code ne vérifiant
--   jamais si la requête a réussi (voir le correctif de code séparé),
--   l'admin pouvait laisser croire qu'un enregistrement avait marché
--   alors qu'il échouait intégralement.
-- Portée des prix : "Prix vente €"/"Prix achat €" restent des champs
--   internes à l'admin (fondatrice uniquement, via la policy
--   existante "Fondatrice gère les stocks") — cette migration
--   n'accorde aucune lecture publique sur ces 2 colonnes. Elles ne
--   sont volontairement PAS incluses dans le GRANT de lecture
--   publique de la migration 0012 (prix_vente/prix_achat jamais
--   exposés à anon/authenticated) — cohérent avec "Prix à venir
--   partout" côté boutique, cette règle porte sur l'affichage public,
--   pas sur le suivi interne de la fondatrice.
-- Impact : additive uniquement. 6 colonnes nullables ajoutées,
--   aucune valeur par défaut imposée sur des lignes existantes
--   au-delà de NULL, aucune colonne/table/ligne existante modifiée ou
--   supprimée.
-- ═══════════════════════════════════════════════════════════

alter table public.stocks
  add column if not exists tailles         text,
  add column if not exists composition     text,
  add column if not exists usage_conseils  text,
  add column if not exists entretien       text,
  add column if not exists prix_vente      numeric,
  add column if not exists prix_achat      numeric;

comment on column public.stocks.tailles is 'Tailles disponibles, texte libre (ex. "XS–6XL+")';
comment on column public.stocks.composition is 'Composition matière, texte libre';
comment on column public.stocks.usage_conseils is 'Conseils d''usage affichés en fiche produit';
comment on column public.stocks.entretien is 'Instructions d''entretien affichées en fiche produit';
comment on column public.stocks.prix_vente is 'Prix de vente interne — jamais affiché publiquement ("Prix à venir" partout côté boutique), usage fondatrice uniquement (valeur de stock, marge).';
comment on column public.stocks.prix_achat is 'Prix d''achat interne — jamais affiché publiquement, usage fondatrice uniquement (marge).';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='stocks'
--     and column_name in ('tailles','composition','usage_conseils','entretien','prix_vente','prix_achat');
--   → attendu : les 6 lignes.
--   CONFIRMÉ le 2026-10-10 : résultat exécuté par Renée-Lise conforme
--   (les 6 colonnes présentes) — statut passé à VALIDÉ sur cette base.
--
--   Fonctionnel : dans l'admin Stocks, modifier le produit test
--   (n'importe quel champ) puis "Enregistrer" → doit réussir
--   (actuellement, échoue silencieusement). Recharger la page pour
--   confirmer que le changement a bien persisté en base, pas
--   seulement à l'écran.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation,
-- et avant la migration 0012 (qui accorde un GRANT sur certaines de
-- ces colonnes — elles doivent exister au moment du GRANT).
-- ═══════════════════════════════════════════════════════════
