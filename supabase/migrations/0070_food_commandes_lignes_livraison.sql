-- ═══════════════════════════════════════════════════════════
-- 0070_food_commandes_lignes_livraison.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : demande explicite de Renée-Lise sur l'écran "Commandes" de
--   Bella'Food (formulaire "+ Nouvelle commande") — jamais traitée
--   jusqu'ici : il n'existe aucun champ pour sélectionner plusieurs
--   produits (un seul champ texte libre "Produit commandé") ni pour
--   choisir un prix de livraison. Confirmé : aucune des deux
--   fonctionnalités n'existe nulle part dans le code (recherche
--   "retrait" infructueuse sur tout le module Food et BellaiaApp.tsx)
--   — ce n'est pas un bug à corriger, une vraie fonctionnalité à
--   ajouter.
--
-- Ajoute 4 colonnes nullable à food_commandes :
--   - lignes (jsonb) : liste de produits {nom, quantite, prixUnitaire}
--     — même format que food_menus.lignes/food_achats.lignes déjà
--     utilisés ailleurs dans ce module.
--   - mode_livraison (text) : 'retrait' ou 'livraison'.
--   - lieu_retrait (text) : texte libre (ex. "Saint-Laurent-du-Maroni"
--     demandé explicitement) — pas de liste fermée imposée, aucune
--     liste de lieux de retrait n'existait avant pour savoir ce qui
--     devait y figurer.
--   - frais_livraison (numeric) : un des 4 paliers demandés
--     (5€/10€/15€/20€), appliqué côté écran, pas de CHECK ici pour ne
--     pas bloquer un futur 5ᵉ palier sans nouvelle migration.
--
-- Impact : additif uniquement, aucune colonne/donnée existante
--   touchée. Le champ "produit" existant est conservé (résumé texte
--   des lignes, pour ne rien casser dans l'affichage déjà en place).
-- ═══════════════════════════════════════════════════════════

alter table public.food_commandes
  add column if not exists lignes jsonb,
  add column if not exists mode_livraison text,
  add column if not exists lieu_retrait text,
  add column if not exists frais_livraison numeric;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_commandes'
--     and column_name in ('lignes','mode_livraison','lieu_retrait','frais_livraison')
--   order by column_name;
--   → attendu : 4 lignes.
-- ═══════════════════════════════════════════════════════════
