-- ═══════════════════════════════════════════════════════════
-- 0032_bsh_boutique_import_concorde_pro_lot7.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 7 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 32 nouveaux articles,
--   première famille "jeux de société coquins / coffrets surprise"
--   (Secret Play Games, Kheper Games, Fun Novelties, Drunky Crush).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie (taxonomie déjà câblée, voir 0024) :
--   - "Coffrets & Expériences" : l'essentiel du lot — jeux de
--     société/cartes/dés pour couples, boîtes surprises (Oh Yes,
--     Kamasutra Erotic Game, Kheper Games...) : des moments à vivre
--     à deux, exactement l'angle déjà choisi pour /bsh/coffrets.
--   - "Aphrodisiaques & Bien-être" : les 3 articles comestibles
--     (chocolat, bonbons façon jockstrap/lingerie) de la marque
--     Spencer-Fleetwood.
--   - "BDSM & Contraintes" : le sac surprise "Take Control"
--     (contenu réel : menottes, fouet, bandeau, vibrateur).
--
-- 3 articles sans "Prix public conseillé" lisible sur la capture
--   (bouton "Ajouter au panier" juste après le prix) : prix_vente
--   laissé NULL, à compléter par Renée-Lise.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Civilisexations — Jeu de cartes érotique',               'Coffrets & Expériences',     79,   9.95,  3.54,  'Import Concorde Pro — Réf 596138 — SECRET PLAY GAMES'),
  ('Sexxxzzle — Jeu de couple puzzle + défis',               'Coffrets & Expériences',     35,   24.95, 9.43,  'Import Concorde Pro — Réf 596137 — SECRET PLAY GAMES'),
  ('Mission 69 — Jeu de société coquin',                     'Coffrets & Expériences',     37,   19.95, 7.27,  'Import Concorde Pro — Réf 596136 — SECRET PLAY GAMES'),
  ('Massage Time — Jeu coquin pour les couples',              'Coffrets & Expériences',     34,   20.95, 7.68,  'Import Concorde Pro — Réf 596135 — SECRET PLAY GAMES'),
  ('Boîte de chocolat After Dinner',                         'Aphrodisiaques & Bien-être', 2,    7.50,  3.48,  'Import Concorde Pro — Réf 501019 — SPENCER-FLEETWOOD'),
  ('Jockstrap en bonbons',                                   'Aphrodisiaques & Bien-être', 65,   7.10,  3.32,  'Import Concorde Pro — Réf 500099 — SPENCER-FLEETWOOD'),
  ('Jeu pour adultes Action ou Vérité',                      'Coffrets & Expériences',     35,   24.90, 8.00,  'Import Concorde Pro — Réf 596131 — SECRET PLAY GAMES'),
  ('Jeu de Domino coquin',                                   'Coffrets & Expériences',     55,   15.90, 6.67,  'Import Concorde Pro — Réf 596130 — SECRET PLAY GAMES'),
  ('Jeu coquin Play4Sex spécial Kamasutra',                  'Coffrets & Expériences',     30,   23.90, 10.12, 'Import Concorde Pro — Réf 596129 — SECRET PLAY GAMES'),
  ('Jeu coquin Tower of Sex',                                'Coffrets & Expériences',     47,   23.90, 10.12, 'Import Concorde Pro — Réf 596128 — SECRET PLAY GAMES'),
  ('Jeu de cartes érotique Pull & Play',                     'Coffrets & Expériences',     25,   17.95, 6.67,  'Import Concorde Pro — Réf 596126 — SECRET PLAY GAMES'),
  ('Jeu de dés coquins Dice, Play et Sex',                   'Coffrets & Expériences',     25,   null,  4.60,  'Import Concorde Pro — Réf 596125 — SECRET PLAY GAMES (prix public non visible sur la capture — à compléter)'),
  ('Ensemble soutien-gorge et string en bonbons',            'Aphrodisiaques & Bien-être', 146,  16.40, 7.09,  'Import Concorde Pro — Réf 501073 — SPENCER-FLEETWOOD'),
  ('Jeu de cartes pour couple Drunky Crush',                 'Coffrets & Expériences',     263,  19.90, 7.20,  'Import Concorde Pro — Réf 596001 — DRUNKY CRUSH'),
  ('Zizi Sauteur',                                           'Coffrets & Expériences',     1678, 4.90,  0.96,  'Import Concorde Pro — Réf 599477 — FUN NOVELTIES'),
  ('Oh Yes — Pochette surprise sexy pour elle',              'Coffrets & Expériences',     22,   19.90, 5.15,  'Import Concorde Pro — Réf 597199 — FUN NOVELTIES'),
  ('Oh Yes — Pochette surprise sexy pour lui',               'Coffrets & Expériences',     14,   19.90, 5.15,  'Import Concorde Pro — Réf 597198 — FUN NOVELTIES'),
  ('Take Control — Sac surprise domination adulte',          'BDSM & Contraintes',         28,   26.90, 9.69,  'Import Concorde Pro — Réf 597192 — OZZE'),
  ('Kamasutra Erotic Game',                                  'Coffrets & Expériences',     84,   29.80, 13.04, 'Import Concorde Pro — Réf 597047 — SINNERZ GAME'),
  ('Coffret Jeux Amoureux de Clara Morgane',                 'Coffrets & Expériences',     9,    14.95, 8.42,  'Import Concorde Pro — Réf 597040 — EDITIONS BLANCHE'),
  ('Jeu SexFriends',                                         'Coffrets & Expériences',     315,  39.90, 10.61, 'Import Concorde Pro — Réf 597009 — FUN NOVELTIES'),
  ('Jeu Hot Party',                                          'Coffrets & Expériences',     385,  null,  9.43,  'Import Concorde Pro — Réf 597008 — FUN NOVELTIES (prix public non visible sur la capture — à compléter)'),
  ('Jeu Hasard & Plaisir',                                   'Coffrets & Expériences',     1149, 19.90, 6.52,  'Import Concorde Pro — Réf 597007 — FUN NOVELTIES'),
  ('Jeu Kiss — Cartes à gratter',                            'Coffrets & Expériences',     812,  4.00,  0.82,  'Import Concorde Pro — Réf 597004 — FUN NOVELTIES'),
  ('Tantric Sex Cards',                                      'Coffrets & Expériences',     0,    8.90,  3.75,  'Import Concorde Pro — Réf 596028 — KHEPER GAMES'),
  ('Glow in the Dark Sex',                                   'Coffrets & Expériences',     0,    18.90, 7.07,  'Import Concorde Pro — Réf 596024 — KHEPER GAMES'),
  ('Mini Sex Around The World Game',                         'Coffrets & Expériences',     9,    12.90, 4.96,  'Import Concorde Pro — Réf 596023 — KHEPER GAMES'),
  ('Let''s Fuck Card Game',                                  'Coffrets & Expériences',     0,    8.90,  4.37,  'Import Concorde Pro — Réf 596022 — KHEPER GAMES'),
  ('Sex Fortunes',                                           'Coffrets & Expériences',     0,    11.90, 4.96,  'Import Concorde Pro — Réf 596021 — KHEPER GAMES'),
  ('Let''s Fuck Game',                                       'Coffrets & Expériences',     0,    16.50, 7.04,  'Import Concorde Pro — Réf 596013 — KHEPER GAMES'),
  ('Sexy Rendez-Vous Game',                                  'Coffrets & Expériences',     0,    12.90, 4.96,  'Import Concorde Pro — Réf 596010 — KHEPER GAMES'),
  ('International Sex Coupons',                              'Coffrets & Expériences',     12,   null,  3.63,  'Import Concorde Pro — Réf 596009 — KHEPER GAMES (prix public non visible sur la capture — à compléter)')
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
--   → attendu : 194 (162 des lots précédents + 32 de ce lot).
--
--   select categorie, count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   group by categorie order by categorie;
--   → attendu : 5 lignes au total, dont "Coffrets & Expériences"
--     nettement renforcée par ce lot (+28).
-- ═══════════════════════════════════════════════════════════
