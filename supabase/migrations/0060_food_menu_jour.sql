-- ═══════════════════════════════════════════════════════════
-- 0060_food_menu_jour.sql
-- STATUT: VALIDÉ (exécutée et vérifiée le 30/10/2026)
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : "menu(s) du jour" + "lieu(x) de vente" visibles par les
--   clientes dès l'ouverture de leur session Bella'Food (demande de
--   Renée-Lise). Vérifié le 30/10 : aucune notion de menu du jour ni
--   de lieu de vente n'existait nulle part dans le projet — création
--   propre.
--
-- Modélisation : une ligne par jour (une par date, imposé côté
--   application par un upsert sur la date plutôt qu'en base — pas de
--   contrainte unique ajoutée pour rester permissif si elle veut un
--   jour publier deux entrées distinctes le même jour). `items`
--   (plats du jour) et `lieux` (lieux de vente) en jsonb — même choix
--   que food_menus : des tableaux de petits objets, pas de table à
--   part pour un contenu aussi simple et géré en un seul écran.
--
-- Sécurité : seule table Bella'Food de ce chantier pensée pour être
--   vue par une cliente SANS être connectée à un compte précis (un
--   menu du jour affiché publiquement) — lecture publique mais
--   restreinte aux lignes statut='publie' (jamais un brouillon),
--   écriture réservée à la fondatrice.
--
-- Impact : entièrement additif, nouvelle table.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_menu_jour (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  items       jsonb not null default '[]'::jsonb,
  lieux       jsonb not null default '[]'::jsonb,
  statut      text not null default 'brouillon' check (statut in ('brouillon','publie')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.food_menu_jour is
  'Menu(s) du jour + lieu(x) de vente Bella''Food, affichés aux clientes quand statut=publie.';
comment on column public.food_menu_jour.items is
  'jsonb : [{"nom": "...", "description": "...", "prix": 12.5}, ...]';
comment on column public.food_menu_jour.lieux is
  'jsonb : [{"nom": "...", "adresse": "...", "horaires": "..."}, ...]';

alter table public.food_menu_jour enable row level security;

drop policy if exists food_menu_jour_lecture_publique on public.food_menu_jour;
create policy food_menu_jour_lecture_publique on public.food_menu_jour
  for select to public
  using (statut = 'publie');

drop policy if exists food_menu_jour_fondatrice on public.food_menu_jour;
create policy food_menu_jour_fondatrice on public.food_menu_jour
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_menu_jour');
--   → attendu : non nul.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='food_menu_jour'
--   order by policyname;
--   → attendu : 2 lignes (food_menu_jour_fondatrice,
--     food_menu_jour_lecture_publique).
-- ═══════════════════════════════════════════════════════════
