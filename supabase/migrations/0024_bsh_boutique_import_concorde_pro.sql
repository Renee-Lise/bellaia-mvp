-- ═══════════════════════════════════════════════════════════
-- 0024_bsh_boutique_import_concorde_pro.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (count=38, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : premier import de produits dans la boutique BSH
--   (`stocks`, univers='BSH'), à partir des captures d'écran
--   Concorde Pro envoyées par Renée-Lise (38 articles, lot 1/2 —
--   elle a atteint sa limite d'envoi de captures ; la suite sera
--   une migration 0025+ séparée).
--
-- Règles appliquées :
--   - prix_vente = "Prix public conseillé" Concorde Pro, comme
--     demandé explicitement ("le prix public sera le prix de
--     vente"). Jamais affiché publiquement : la boutique affiche
--     toujours "Prix à venir" tant que la règle en vigueur depuis
--     le début du chantier n'est pas levée — prix_vente/prix_achat
--     restent un usage interne fondatrice (marge, valeur de stock).
--   - prix_achat = le prix HT remisé Concorde Pro affiché en gros
--     (son vrai coût d'achat, pas le prix barré avant remise).
--   - quantite = stock Concorde Pro au moment de la capture — à
--     titre indicatif pour la fondatrice (source possible, pensé
--     pour une future intégration dropshipping) ; jamais exposé
--     publiquement (getProduitsBSH ne sélectionne pas `quantite`).
--   - categorie : réutilise la taxonomie déjà câblée côté boutique
--     (BoutiqueClient.tsx / coffrets/page.tsx), PAS une nouvelle —
--     "Sextoys & Accessoires" pour les jouets, "Coffrets &
--     Expériences" pour les calendriers/coffrets cadeaux (la page
--     dédiée /bsh/coffrets filtre déjà exactement sur ce libellé).
--     Aucun article de ce lot ne correspond à Lingerie & Tenues,
--     BDSM & Contraintes ou Aphrodisiaques & Bien-être — normal,
--     le lot envoyé ne contenait que des jouets et coffrets.
--   - notes = "Import Concorde Pro — Réf <référence> — <marque>" :
--     sert à la fois de traçabilité fournisseur et de clé
--     d'idempotence (voir WHERE NOT EXISTS ci-dessous — rejouer ce
--     script ne duplique rien).
--   - 3 articles n'affichaient pas leur "Prix public conseillé"
--     sur la capture (coupé en bas d'écran) : prix_vente laissé
--     NULL avec une note explicite — à compléter par Renée-Lise
--     plutôt que deviné.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Svakom Erica Plus — Vibromasseur va-et-vient',            'Sextoys & Accessoires',   10,  null,   82.92, 'Import Concorde Pro — Réf 517531005020 — SVAKOM (prix public non visible sur la capture — à compléter)'),
  ('Emma — Gode ceinture sans harnais',                       'Sextoys & Accessoires',   0,   18.90,  4.41,  'Import Concorde Pro — Réf 530663019420 — BAILE'),
  ('Charlotte — Strap-on rabbit double gode',                 'Sextoys & Accessoires',   0,   23.50,  5.68,  'Import Concorde Pro — Réf 530662019420 — BAILE'),
  ('Breeze — Stimulateur clitoridien sans contact',           'Sextoys & Accessoires',   0,   17.90,  2.48,  'Import Concorde Pro — Réf 530661020120 — ROMANCE'),
  ('Breeze — Stimulateur clitoridien sans contact (variante)','Sextoys & Accessoires',   0,   17.90,  2.48,  'Import Concorde Pro — Réf 530661005020 — ROMANCE'),
  ('Adora — Stimulateur clitoridien sans contact',            'Sextoys & Accessoires',   0,   24.90,  6.20,  'Import Concorde Pro — Réf 530659020120 — ROMANCE'),
  ('Inhale Bird — Stimulateur clitoridien',                   'Sextoys & Accessoires',   0,   33.90,  9.14,  'Import Concorde Pro — Réf 530658005020 — ROMANCE'),
  ('Emerald — Stimulateur clitoridien sans contact',          'Sextoys & Accessoires',   0,   35.90,  9.61,  'Import Concorde Pro — Réf 530657005020 — ROMANCE'),
  ('Satisfyer Calendrier de l''Avent Premium 2026',           'Coffrets & Expériences',  16,  199.89, 99.99, 'Import Concorde Pro — Réf 597431003020 — SATISFYER'),
  ('Satisfyer Calendrier de l''Avent Deluxe 2026',            'Coffrets & Expériences',  28,  119.90, 69.90, 'Import Concorde Pro — Réf 597430021020 — SATISFYER'),
  ('Fun Factory Steady — Cockring vibrant',                   'Sextoys & Accessoires',   2,   21.90,  7.36,  'Import Concorde Pro — Réf 514073001020 — FUN FACTORY'),
  ('Libera — Stimulateur clitoridien à air pulsé',            'Sextoys & Accessoires',   1,   37.90,  12.71, 'Import Concorde Pro — Réf 514071003020 — FUN FACTORY'),
  ('Yoba — Stimulateur clitoridien rose',                     'Sextoys & Accessoires',   559, 26.90,  7.22,  'Import Concorde Pro — Réf 531068005020 — YOBA'),
  ('My Bourgeoise — Stimulateur clitoridien',                 'Sextoys & Accessoires',   601, 14.90,  6.34,  'Import Concorde Pro — Réf 531000001020 — BLACK EMPIRE'),
  ('Satisfyer Cutie Heart — Stimulateur clitoridien',         'Sextoys & Accessoires',   0,   28.30,  9.07,  'Import Concorde Pro — Réf 597429005020 — SATISFYER'),
  ('Pearl Bunny 3 — Sextoy rabbit à perles rotatives',        'Sextoys & Accessoires',   0,   58.70,  18.82, 'Import Concorde Pro — Réf 597427005020 — SATISFYER'),
  ('Tongue Genius — Rabbit avec langue vibrante',             'Sextoys & Accessoires',   24,  75.30,  24.10, 'Import Concorde Pro — Réf 597424005020 — SATISFYER'),
  ('Tongue Lover — Stimulateur clitoridien',                  'Sextoys & Accessoires',   22,  51.90,  16.65, 'Import Concorde Pro — Réf 597421005020 — SATISFYER'),
  ('Fun Factory Vim — Vibromasseur wand',                     'Sextoys & Accessoires',   0,   66.90,  17.01, 'Import Concorde Pro — Réf 514057004020 — FUN FACTORY'),
  ('Yalanda — Vibromasseur rabbit oscillant',                 'Sextoys & Accessoires',   0,   66.90,  22.55, 'Import Concorde Pro — Réf 530640005020 — PRETTY LOVE'),
  ('Sabien — Vibromasseur rabbit à battements',                'Sextoys & Accessoires',   18,  66.90,  22.24, 'Import Concorde Pro — Réf 530639020120 — PRETTY LOVE'),
  ('Romance Undine — Œuf vibrant connecté',                   'Sextoys & Accessoires',   1,   39.90,  7.02,  'Import Concorde Pro — Réf 530638005020 — ROMANCE'),
  ('Leander — Gode vibrant réaliste',                         'Sextoys & Accessoires',   0,   20.90,  5.83,  'Import Concorde Pro — Réf 530614019020 — PRETTY LOVE'),
  ('Aethon — Stimulateur clitoridien papillon',               'Sextoys & Accessoires',   1,   30.90,  9.20,  'Import Concorde Pro — Réf 530613005020 — PRETTY LOVE'),
  ('LELO SURFER 2 — Plug anal vibrant',                       'Sextoys & Accessoires',   28,  null,   51.05, 'Import Concorde Pro — Réf 517271001020 — LELO (prix public non visible sur la capture — à compléter)'),
  ('ROMP Rose Glow — Stimulateur clitoridien',                'Sextoys & Accessoires',   97,  49.99,  20.86, 'Import Concorde Pro — Réf 551154004020 — ROMP'),
  ('Kaotik Shockwave — Masturbateur',                         'Sextoys & Accessoires',   19,  159.00, 66.49, 'Import Concorde Pro — Réf 517451001020 — KAOTIK'),
  ('Kaotik Cocoon — Masturbateur chauffant',                  'Sextoys & Accessoires',   19,  169.00, 68.31, 'Import Concorde Pro — Réf 517452001020 — KAOTIK'),
  ('Sassy — Vibromasseur rabbit va-et-vient 3-en-1',          'Sextoys & Accessoires',   283, 59.90,  19.18, 'Import Concorde Pro — Réf 531067005020 — YOBA'),
  ('Satisfyer Triple Ball-R — Gode à boules lestées',         'Sextoys & Accessoires',   43,  36.20,  11.58, 'Import Concorde Pro — Réf 597420021220 — SATISFYER'),
  ('Lelo Sona 3 — Stimulateur clitoridien',                   'Sextoys & Accessoires',   5,   149.00, 59.79, 'Import Concorde Pro — Réf 517269002220 — LELO'),
  ('Coffret cadeau torride Saint-Valentin',                   'Coffrets & Expériences',  21,  27.50,  8.90,  'Import Concorde Pro — Réf 599817 — DIVERS CONCORDE'),
  ('Satisfyer Calendrier de l''Avent Premium',                'Coffrets & Expériences',  59,  null,   79.90, 'Import Concorde Pro — Réf 597410002020 — SATISFYER (prix public non visible sur la capture — à compléter)'),
  ('Coffret plaisir intime',                                  'Coffrets & Expériences',  26,  36.90,  16.90, 'Import Concorde Pro — Réf 599051 — DIVERS CONCORDE'),
  ('Joyfully — Vibromasseur rabbit 3-en-1',                   'Sextoys & Accessoires',   243, 52.90,  11.54, 'Import Concorde Pro — Réf 531056003020 — YOBA'),
  ('Kissy — Vibromasseur rabbit 3-en-1',                      'Sextoys & Accessoires',   554, 54.90,  13.75, 'Import Concorde Pro — Réf 531055020120 — YOBA'),
  ('Kissy — Vibromasseur rabbit 3-en-1 (variante)',           'Sextoys & Accessoires',   644, 54.90,  13.75, 'Import Concorde Pro — Réf 531055003020 — YOBA'),
  ('Satisfyer Pro 2+ — Stimulateur clitoridien',              'Sextoys & Accessoires',   44,  59.90,  21.46, 'Import Concorde Pro — Réf 597140004020 — SATISFYER')
) as v(nom, categorie, quantite, prix_vente, prix_achat, notes)
where not exists (
  select 1 from public.stocks s
  where s.univers = 'BSH' and s.notes = v.notes
);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%';
--   → attendu : 38.
--
--   select nom, categorie, prix_vente, prix_achat, notes from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   order by categorie, nom;
--   → attendu : 38 lignes, toutes statut='actif', 3 avec
--     prix_vente NULL (Svakom Erica Plus, LELO SURFER 2,
--     Satisfyer Calendrier de l'Avent Premium Réf 597410002020).
-- ═══════════════════════════════════════════════════════════
