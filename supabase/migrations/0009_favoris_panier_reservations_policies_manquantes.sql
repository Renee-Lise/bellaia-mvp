-- ═══════════════════════════════════════════════════════════
-- 0009_favoris_panier_reservations_policies_manquantes.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-28 (révisée)
-- Objet : recrée entièrement favoris, panier_items,
--         reservations_experiences (tables + RLS + policies) —
--         révisé après l'échec de la première version de ce fichier :
--         `alter table public.favoris ...` a renvoyé
--         `ERROR 42P01: relation "public.favoris" does not exist`.
--         La première version supposait, à tort, que seules les
--         policies manquaient (vrai pour bsh_members_demandes/0008,
--         confirmé par un SELECT direct qui avait renvoyé "0 ligne" —
--         preuve que la table existait). Pour ces trois tables-ci,
--         l'audit précédent (`select count(*) from pg_policies...`)
--         renvoyait aussi 0, mais ce chiffre ne permet PAS de
--         distinguer "table sans policy" de "table inexistante" —
--         pg_policies ne renvoie jamais d'erreur, juste 0 ligne dans
--         les deux cas. Cette fois vérifié directement avec
--         to_regclass('public.favoris') (voir vérification en bas) :
--         la migration 0001 (VALIDÉE le 2026-09-20) n'a, semble-t-il,
--         jamais exécuté ses CREATE TABLE pour ces trois tables — pas
--         seulement leurs policies.
-- Impact : additive uniquement.
--   - `create table if not exists` : ne touche rien si la table
--     existe déjà (peu importe lequel des deux scénarios s'est
--     produit table par table, ce script fonctionne dans les deux cas
--     sans avoir à le savoir à l'avance).
--   - `alter column ... set default` et `enable row level security` :
--     sans effet si déjà en place, s'appliquent sinon.
--   - `drop policy if exists` avant chaque `create policy` : rejouable
--     sans erreur.
--   - Aucune table/colonne/ligne existante supprimée ou modifiée.
-- Durcissement (comme 0008 pour bsh_members_demandes) :
--   reservations_insert_own exige statut = 'demande_recue' en plus de
--   auth.uid() = user_id — une cliente ne peut pas forger un statut
--   avancé à la création. N'affecte pas ReservationsClient.tsx, qui
--   n'envoie jamais ce champ.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Favoris ───────────────────────────────────────────────
create table if not exists public.favoris (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id    uuid not null references public.stocks(id) on delete cascade,
  univers     text not null default 'bsh',
  created_at  timestamptz not null default now(),
  unique (user_id, stock_id)
);
alter table public.favoris alter column user_id set default auth.uid();
alter table public.favoris enable row level security;

drop policy if exists favoris_select_own on public.favoris;
create policy favoris_select_own on public.favoris
  for select using (auth.uid() = user_id);
drop policy if exists favoris_insert_own on public.favoris;
create policy favoris_insert_own on public.favoris
  for insert with check (auth.uid() = user_id);
drop policy if exists favoris_delete_own on public.favoris;
create policy favoris_delete_own on public.favoris
  for delete using (auth.uid() = user_id);

-- ── 2. Panier ────────────────────────────────────────────────
create table if not exists public.panier_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id    uuid not null references public.stocks(id) on delete cascade,
  quantite    integer not null default 1 check (quantite > 0),
  univers     text not null default 'bsh',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, stock_id)
);
alter table public.panier_items alter column user_id set default auth.uid();
alter table public.panier_items enable row level security;

drop policy if exists panier_select_own on public.panier_items;
create policy panier_select_own on public.panier_items
  for select using (auth.uid() = user_id);
drop policy if exists panier_insert_own on public.panier_items;
create policy panier_insert_own on public.panier_items
  for insert with check (auth.uid() = user_id);
drop policy if exists panier_update_own on public.panier_items;
create policy panier_update_own on public.panier_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists panier_delete_own on public.panier_items;
create policy panier_delete_own on public.panier_items
  for delete using (auth.uid() = user_id);

-- ── 3. Réservations & expériences ───────────────────────────
create table if not exists public.reservations_experiences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
alter table public.reservations_experiences alter column user_id set default auth.uid();
alter table public.reservations_experiences enable row level security;

drop policy if exists reservations_select_own on public.reservations_experiences;
create policy reservations_select_own on public.reservations_experiences
  for select using (auth.uid() = user_id);
drop policy if exists reservations_insert_own on public.reservations_experiences;
create policy reservations_insert_own on public.reservations_experiences
  for insert with check (
    auth.uid() = user_id
    and statut = 'demande_recue'
  );
drop policy if exists reservations_select_staff on public.reservations_experiences;
create policy reservations_select_staff on public.reservations_experiences
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );
drop policy if exists reservations_update_staff on public.reservations_experiences;
create policy reservations_update_staff on public.reservations_experiences
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select to_regclass('public.favoris') as favoris,
--          to_regclass('public.panier_items') as panier_items,
--          to_regclass('public.reservations_experiences') as reservations_experiences;
--   → attendu : les 3 colonnes non nulles (les tables existent).
--
--   select tablename, count(*) from pg_policies
--   where schemaname = 'public'
--     and tablename in ('favoris','panier_items','reservations_experiences')
--   group by tablename;
--   → attendu : favoris = 3, panier_items = 4,
--     reservations_experiences = 4.
--
--   select table_name, column_default from information_schema.columns
--   where table_schema='public' and column_name='user_id'
--     and table_name in ('favoris','panier_items','reservations_experiences');
--   → attendu : 'auth.uid()' sur les 3 lignes.
--
--   Test fonctionnel ensuite avec un compte test réel : ajouter un
--   favori, ajouter un article au panier, envoyer une réservation —
--   chacun doit réussir sans erreur 23502 (NOT NULL), 42501 (RLS) ni
--   42P01 (table introuvable). Voir le scénario de test détaillé
--   donné séparément.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
