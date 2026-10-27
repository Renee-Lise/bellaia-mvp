-- ═══════════════════════════════════════════════════════════
-- 0025_bsh_boutique_import_concorde_pro_lot2.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (count=50, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : suite de 0024 — lot 2 de captures d'écran Concorde Pro
--   envoyées par Renée-Lise. 12 nouveaux articles (les autres
--   captures de ce lot étaient des doublons d'articles déjà
--   importés par 0024 — ignorés ici, aucune ligne dupliquée).
--
-- Mêmes règles que 0024 : prix_vente = Prix public conseillé,
-- prix_achat = tarif HT remisé Concorde Pro, categorie réutilise
-- la taxonomie déjà câblée côté boutique ("Sextoys & Accessoires"
-- pour tous les articles de ce lot), notes = traçabilité
-- fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Bonus : une des captures de ce lot montrait enfin le "Prix
-- public conseillé" du Satisfyer Calendrier de l'Avent Premium
-- (Réf 597410002020), laissé à NULL dans 0024 faute de visibilité
-- sur la capture d'origine (189,00€) — complété ici par un UPDATE
-- ciblé sur cette seule ligne, idempotent lui aussi.
--
-- Impact : entièrement additif (INSERT + UPDATE ciblé, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Satisfyer — Stimulateur clitoridien Cotton Candy',          'Sextoys & Accessoires', 62,  42.90, 15.12, 'Import Concorde Pro — Réf 597357005000 — SATISFYER'),
  ('Satisfyer Cutie — Stimulateur clitoridien (2)',             'Sextoys & Accessoires', 2,   49.90, 18.35, 'Import Concorde Pro — Réf 597355005000 — SATISFYER'),
  ('Qiot by Virgite — Clit Stimulator',                         'Sextoys & Accessoires', 30,  44.90, 19.35, 'Import Concorde Pro — Réf 501188001020 — QIOT BY VIRGITE'),
  ('Ultra — Double gode ceinture avec harnais',                 'Sextoys & Accessoires', 0,   40.90, 7.17,  'Import Concorde Pro — Réf 530475019400 — BAILE'),
  ('Mina — Stimulateur clitoridien avec langue',                'Sextoys & Accessoires', 0,   26.90, 7.24,  'Import Concorde Pro — Réf 530536003020 — PRETTY LOVE'),
  ('Lexie — Vibromasseur point G à tapotements',                'Sextoys & Accessoires', 118, 51.90, 12.25, 'Import Concorde Pro — Réf 530535005020 — BAILE'),
  ('Klay — Œuf vibrant va-et-vient connecté',                   'Sextoys & Accessoires', 0,   51.90, 15.48, 'Import Concorde Pro — Réf 530561020120 — PRETTY LOVE'),
  ('Stefan — Mini vibromasseur',                                'Sextoys & Accessoires', 0,   15.90, 4.34,  'Import Concorde Pro — Réf 530560021020 — PRETTY LOVE'),
  ('Qiot by Virgite — Clit & Bullet, stimulateur clitoridien',  'Sextoys & Accessoires', 22,  69.90, 29.73, 'Import Concorde Pro — Réf 501186001020 — QIOT BY VIRGITE'),
  ('Qiot by Virgite — Rabbit Vibe, vibromasseur point G',       'Sextoys & Accessoires', 3,   69.90, 25.49, 'Import Concorde Pro — Réf 501187001020 — QIOT BY VIRGITE'),
  ('Fun Factory Ryde — Dildo double',                           'Sextoys & Accessoires', 11,  40.90, 11.83, 'Import Concorde Pro — Réf 514062003020 — FUN FACTORY'),
  ('Fun Factory Patchy Paul — Vibromasseur flexible',           'Sextoys & Accessoires', 3,   41.90, 15.44, 'Import Concorde Pro — Réf 514085020120 — FUN FACTORY')
) as v(nom, categorie, quantite, prix_vente, prix_achat, notes)
where not exists (
  select 1 from public.stocks s
  where s.univers = 'BSH' and s.notes = v.notes
);

-- Complète le prix public du Satisfyer Calendrier de l'Avent Premium
-- (Réf 597410002020), invisible sur la capture d'origine (0024) mais
-- lisible sur celle de ce lot (189,00€). Ciblé sur la ligne exacte
-- importée par 0024 via sa note de traçabilité, sans toucher à rien
-- d'autre.
update public.stocks
set prix_vente = 189.00,
    notes = 'Import Concorde Pro — Réf 597410002020 — SATISFYER'
where univers = 'BSH'
  and notes = 'Import Concorde Pro — Réf 597410002020 — SATISFYER (prix public non visible sur la capture — à compléter)';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%';
--   → attendu : 50 (38 de 0024 + 12 de 0025).
--
--   select prix_vente from public.stocks
--   where univers='BSH' and notes like '%597410002020%';
--   → attendu : 189.00 (plus NULL).
--
--   select count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%' and prix_vente is null;
--   → attendu : 2 (Svakom Erica Plus, LELO SURFER 2 — toujours
--     en attente de leur prix public).
-- ═══════════════════════════════════════════════════════════
