-- ═══════════════════════════════════════════════════════════
-- 0038_bsh_boutique_import_concorde_pro_lot13.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (count=382, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 13 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 32 nouveaux articles,
--   tous de la marque Spencer-Fleetwood/Fun Novelties.
--
-- ⚠️ À noter : ce lot est différent des précédents — ce sont des
--   bonbons et gadgets à thème sexuel humoristique ("gag gifts" :
--   sous-vêtements comestibles, confiseries en forme anatomique,
--   objets anti-stress, poêle à œufs en forme de pénis...), pas des
--   produits de bien-être ou de plaisir au sens strict. Importés
--   tels quels (c'est ce qui a été capturé), rangés dans "Coffrets
--   & Expériences" faute de catégorie plus adaptée — dis-moi si tu
--   préfères les exclure du catalogue ou créer une catégorie dédiée
--   type "Gadgets & Humour".
--
-- Mêmes règles que les lots précédents pour le reste : prix_vente =
-- Prix public conseillé, prix_achat = tarif HT remisé Concorde Pro,
-- notes = traçabilité fournisseur + clé d'idempotence.
--
-- 21 articles sur 32 n'affichent aucun "Prix public conseillé" sur
--   leur capture (bouton "Ajouter au panier" juste après le prix
--   HT) : prix_vente laissé NULL pour ceux-là, à compléter.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Candy G-String — Bonbon',                 'Coffrets & Expériences', 298, null,  3.54, 'Import Concorde Pro — Réf 501002 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Candy Bra — Bonbon',                      'Coffrets & Expériences', 289, null,  3.54, 'Import Concorde Pro — Réf 501001 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Jelly Willies — Bonbons jelifiés',        'Coffrets & Expériences', 36,  null,  2.56, 'Import Concorde Pro — Réf 501005 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Candy Posing Pouch — Bonbon',             'Coffrets & Expériences', 312, null,  3.54, 'Import Concorde Pro — Réf 501003 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Candy Handcuffs — Menottes bonbons',      'Coffrets & Expériences', 49,  null,  2.46, 'Import Concorde Pro — Réf 501008 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Candy Love Ring',                         'Coffrets & Expériences', 119, null,  2.46, 'Import Concorde Pro — Réf 501007 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Willie Lollipop — Sucette x24',           'Coffrets & Expériences', 11,  67.40, 30.98, 'Import Concorde Pro — Réf 501013 — SPENCER-FLEETWOOD'),
  ('Penis Pasta — Pâtes',                     'Coffrets & Expériences', 44,  5.90,  2.77,  'Import Concorde Pro — Réf 501011 — SPENCER-FLEETWOOD'),
  ('Lovers Candy Bra',                        'Coffrets & Expériences', 189, null,  3.91, 'Import Concorde Pro — Réf 501033 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Lovers Candy G-String',                   'Coffrets & Expériences', 212, null,  3.91, 'Import Concorde Pro — Réf 501032 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Marshmallow Willies',                     'Coffrets & Expériences', 36,  null,  2.77, 'Import Concorde Pro — Réf 501036 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Lovers Candy Posing Pouch',               'Coffrets & Expériences', 134, null,  3.91, 'Import Concorde Pro — Réf 501034 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Cola Willies — Bonbon cola',              'Coffrets & Expériences', 47,  null,  2.56, 'Import Concorde Pro — Réf 501042 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Sexy Jelly Men — Bonbon fruité',          'Coffrets & Expériences', 31,  null,  2.56, 'Import Concorde Pro — Réf 501041 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Candy Nipple Tassels',                    'Coffrets & Expériences', 16,  null,  3.48, 'Import Concorde Pro — Réf 501047 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Lust Dust — Poudre pétillante fraise',    'Coffrets & Expériences', 31,  null,  2.09, 'Import Concorde Pro — Réf 501045 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Chocolat Body Pen',                       'Coffrets & Expériences', 24,  8.50,  2.84,  'Import Concorde Pro — Réf 501051 — SPENCER-FLEETWOOD'),
  ('Jelly Boobs — Bonbon',                    'Coffrets & Expériences', 30,  null,  2.56, 'Import Concorde Pro — Réf 501048 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Stress Breasts',                          'Coffrets & Expériences', 44,  null,  3.54, 'Import Concorde Pro — Réf 501061 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Stress Willie',                           'Coffrets & Expériences', 61,  null,  3.54, 'Import Concorde Pro — Réf 501060 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Gummy Kamasutra',                         'Coffrets & Expériences', 48,  null,  2.63, 'Import Concorde Pro — Réf 501065 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Gummy Condoms',                           'Coffrets & Expériences', 18,  null,  2.56, 'Import Concorde Pro — Réf 501064 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Chocolat Cum Pop',                        'Coffrets & Expériences', 7,   null,  3.98, 'Import Concorde Pro — Réf 501070 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Chocolat Edible Anus',                    'Coffrets & Expériences', 76,  null,  3.98, 'Import Concorde Pro — Réf 501067 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Jelly Super Sperms — Piña Colada',        'Coffrets & Expériences', 48,  null,  2.49, 'Import Concorde Pro — Réf 501079 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Willie Egg Fryer',                        'Coffrets & Expériences', 30,  null,  2.56, 'Import Concorde Pro — Réf 501071 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Peppermint Nipples — x12',                'Coffrets & Expériences', 6,   42.80, 17.74, 'Import Concorde Pro — Réf 501081 — SPENCER-FLEETWOOD'),
  ('Peppermint Peckers — x12',                'Coffrets & Expériences', 15,  42.80, 17.74, 'Import Concorde Pro — Réf 501080 — SPENCER-FLEETWOOD'),
  ('Blow Job Spray',                          'Coffrets & Expériences', 22,  null,  2.41, 'Import Concorde Pro — Réf 501084 — SPENCER-FLEETWOOD (prix public non visible sur la capture — à compléter)'),
  ('Blow Job Mints — x12',                    'Coffrets & Expériences', 6,   42.80, 17.74, 'Import Concorde Pro — Réf 501082 — SPENCER-FLEETWOOD'),
  ('Phony Face — Lunettes pénis fun',         'Coffrets & Expériences', 186, 2.50,  0.83,  'Import Concorde Pro — Réf 520087 — FUN NOVELTIES'),
  ('Boobie Egg Fryer',                        'Coffrets & Expériences', 6,   4.50,  2.16,  'Import Concorde Pro — Réf 501098 — SPENCER-FLEETWOOD')
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
--   → attendu : 382 (350 des lots précédents + 32 de ce lot).
-- ═══════════════════════════════════════════════════════════
