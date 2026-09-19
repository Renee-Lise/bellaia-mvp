-- ═══════════════════════════════════════════════════════════
-- 0001_bsh_catalogue_favoris_panier.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION DE RENÉE-LISE
-- Auteur : Claude Code · Date de rédaction : 2026-09-19
-- Objet : fiches produit BSH complètes (taille/composition/usage/entretien)
--         + persistance des favoris, du panier et des réservations
--         d'expériences pour "Mon espace BSH".
-- Impact : additive uniquement.
--   - Aucune colonne existante modifiée ou supprimée.
--   - Aucune ligne existante de `stocks` touchée (nouvelles colonnes
--     nullables, donc NULL sur tout ce qui existe déjà).
--   - 3 nouvelles tables, RLS activée dès la création, aucun accès
--     par défaut hors des policies définies ci-dessous.
-- Portée : les 4 colonnes ajoutées à `stocks` sont génériques (pas
--   préfixées "bsh_") pour rester réutilisables par d'autres pôles
--   si besoin plus tard (ex. Bella'Odyssée, Bella'Food).
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Fiches produit — champs manquants pour l'affichage boutique
--    (taille, composition, usage, entretien — cf. conception BSH §2)
-- ───────────────────────────────────────────────────────────
alter table public.stocks
  add column if not exists tailles         text,   -- ex. "XS–6XL+", "Taille unique"
  add column if not exists composition     text,   -- ex. "95% polyamide, 5% élasthanne"
  add column if not exists usage_conseils  text,   -- ex. "Lavage main recommandé avant premier usage"
  add column if not exists entretien       text;   -- ex. "Lavage à la main, 30°C, ne pas essorer"

comment on column public.stocks.tailles is 'Tailles disponibles, texte libre (ex. "XS–6XL+")';
comment on column public.stocks.composition is 'Composition matière, texte libre';
comment on column public.stocks.usage_conseils is 'Conseils d''usage affichés en fiche produit';
comment on column public.stocks.entretien is 'Instructions d''entretien affichées en fiche produit';

-- ───────────────────────────────────────────────────────────
-- 2. Favoris — un cœur cliqué = une ligne, par cliente et par article
-- ───────────────────────────────────────────────────────────
create table if not exists public.favoris (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stock_id    uuid not null references public.stocks(id) on delete cascade,
  univers     text not null default 'bsh',
  created_at  timestamptz not null default now(),
  unique (user_id, stock_id)
);

alter table public.favoris enable row level security;

-- Chaque cliente ne voit et ne gère que ses propres favoris.
create policy favoris_select_own on public.favoris
  for select using (auth.uid() = user_id);
create policy favoris_insert_own on public.favoris
  for insert with check (auth.uid() = user_id);
create policy favoris_delete_own on public.favoris
  for delete using (auth.uid() = user_id);
-- Pas de policy update : un favori se retire et se remet, il ne se modifie pas.

-- ───────────────────────────────────────────────────────────
-- 3. Panier — une ligne par article, quantité modifiable
-- ───────────────────────────────────────────────────────────
create table if not exists public.panier_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stock_id    uuid not null references public.stocks(id) on delete cascade,
  quantite    integer not null default 1 check (quantite > 0),
  univers     text not null default 'bsh',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, stock_id)
);

alter table public.panier_items enable row level security;

create policy panier_select_own on public.panier_items
  for select using (auth.uid() = user_id);
create policy panier_insert_own on public.panier_items
  for insert with check (auth.uid() = user_id);
create policy panier_update_own on public.panier_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy panier_delete_own on public.panier_items
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 4. Réservations & expériences BSH (coffrets à vivre, ateliers...)
--    Contrairement au panier/favoris, la fondatrice doit pouvoir
--    voir et faire avancer TOUTES les réservations pour les honorer.
-- ───────────────────────────────────────────────────────────
create table if not exists public.reservations_experiences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  stock_id        uuid references public.stocks(id) on delete set null,
  titre           text not null,
  date_souhaitee  date,
  statut          text not null default 'demande_recue'
                    check (statut in (
                      'demande_recue', 'validee', 'acompte_recu',
                      'confirmee', 'realisee', 'annulee'
                    )),
  univers         text not null default 'bsh',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.reservations_experiences enable row level security;

-- La cliente voit et crée ses propres réservations.
create policy reservations_select_own on public.reservations_experiences
  for select using (auth.uid() = user_id);
create policy reservations_insert_own on public.reservations_experiences
  for insert with check (auth.uid() = user_id);

-- La fondatrice et l'assistante voient et gèrent toutes les réservations
-- (nécessaire pour les honorer), en s'appuyant sur profiles.role — jamais
-- sur une donnée fournie par le client.
create policy reservations_select_staff on public.reservations_experiences
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );
create policy reservations_update_staff on public.reservations_experiences
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
