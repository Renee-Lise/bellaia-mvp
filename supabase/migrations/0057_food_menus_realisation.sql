-- ═══════════════════════════════════════════════════════════
-- 0057_food_menus_realisation.sql
-- STATUT: VALIDÉ (exécutée et vérifiée le 30/10/2026)
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : "déduire automatiquement le stock" (demande de Renée-Lise,
--   étape 2 de son plan). Jusqu'ici, un menu ne faisait que CALCULER
--   le manque par rapport au stock (liste de courses / achat) — rien
--   ne décomptait jamais le stock une fois les plats réellement
--   préparés.
--
-- Modélisation : deux colonnes pour marquer qu'un menu a été réalisé
--   et empêcher un double décompte si le bouton est cliqué deux fois
--   par erreur (le décompte applicatif vérifie `realise` avant
--   d'agir, ces colonnes sont la mémoire de ce contrôle).
--
-- Impact : entièrement additif sur food_menus, aucune donnée existante
--   modifiée (valeur par défaut realise=false).
-- ═══════════════════════════════════════════════════════════

alter table public.food_menus
  add column if not exists realise          boolean not null default false,
  add column if not exists date_realisation timestamptz;

comment on column public.food_menus.realise is
  'true une fois que le stock a été décompté pour ce menu (empêche un double décompte).';
comment on column public.food_menus.date_realisation is
  'Horodatage du décompte de stock. NULL si le menu n''a jamais été marqué réalisé.';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_menus'
--     and column_name in ('realise','date_realisation');
--   → attendu : 2 lignes.
-- ═══════════════════════════════════════════════════════════
