-- ═══════════════════════════════════════════════════════════
-- 0055_food_achats.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : table réelle pour les achats Bella'Food. Vérifié le 30/10 :
--   le module Achats (FoodAchats.tsx) n'était jusqu'ici qu'un mock en
--   mémoire (aucune table associée) — contrairement aux Stocks et aux
--   Recettes, rien n'était jamais sauvegardé. Création propre, rien
--   à réconcilier.
--
-- Modélisation : même choix que food_menus — `lignes` est un jsonb
--   (tableau de LigneAchat : produit, stock_item_id optionnel,
--   quantité, unité, prix, tva, totaux). Permet de relier une ligne
--   d'achat à une fiche de stock réelle (stock_global) quand elle
--   existe, sans l'imposer.
--
-- Sécurité : outil de gestion interne, jamais consulté par une
--   cliente — fondatrice uniquement (is_fondatrice()), même modèle
--   que food_recettes et food_menus.
--
-- Impact : entièrement additif, nouvelle table.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_achats (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null,
  fournisseur_id   uuid,
  fournisseur_nom  text not null default '',
  date             date not null default current_date,
  date_reception   date,
  facture          text,
  categorie        text,
  lignes           jsonb not null default '[]'::jsonb,
  total_ht         numeric not null default 0,
  total_ttc        numeric not null default 0,
  statut           text not null default 'brouillon'
                     check (statut in ('brouillon','envoye','confirme','recu','annule')),
  observations     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.food_achats is
  'Achats fournisseurs Bella''Food — lignes jsonb, liées optionnellement à stock_global via stock_item_id.';

alter table public.food_achats enable row level security;

drop policy if exists food_achats_fondatrice on public.food_achats;
create policy food_achats_fondatrice on public.food_achats
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_achats');
--   → attendu : non nul.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='food_achats';
--   → attendu : 1 ligne, food_achats_fondatrice.
-- ═══════════════════════════════════════════════════════════
