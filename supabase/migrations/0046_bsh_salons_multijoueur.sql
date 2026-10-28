-- ═══════════════════════════════════════════════════════════
-- 0046_bsh_salons_multijoueur.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (tables créées, 7 policies [4+3, pas 8 — erreur de calcul initiale], 2 tables en publication realtime, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Phase 5 (v1) — salons multijoueur en temps réel pour BSH
--   Secret Games. La brique la plus lourde du chantier : livrée
--   volontairement en version minimale et honnête plutôt qu'en
--   simulant des fonctions non testées.
--
-- Portée de cette v1 (ce qui N'Y EST PAS encore, assumé) :
--   - Pas de scores/votes/classement — juste un tirage synchronisé
--     et le nombre de participants en direct. Les scores/votes/
--     classements viendront dans un second temps si le besoin se
--     confirme à l'usage.
--   - Pas de compte "hôte de salon" avec droits exclusifs : comme
--     le reste de BSH Secret Games (jouable sans compte), n'importe
--     qui connaissant le code du salon peut tirer la carte suivante
--     — c'est le code lui-même qui fait office de clé d'accès,
--     pas une autorisation par personne. Simplification assumée
--     pour une v1 entre personnes qui se font confiance dans un
--     même salon ; à durcir (ex. jeton hôte) si un abus est
--     constaté à l'usage.
--   - Aucune réponse écrite n'est stockée, même logique que le
--     reste de BSH Secret Games.
--
-- Mécanique :
--   - bsh_salons : un salon = un code court partageable + le jeu
--     choisi + la carte actuellement affichée (carte_actuelle_id).
--   - bsh_salon_participants : qui a rejoint (pseudo, compte
--     optionnel). Permet d'afficher "X participants" en direct.
--   - Les deux tables sont ajoutées à la publication
--     supabase_realtime : le client peut s'abonner aux
--     changements (postgres_changes) pour une synchronisation
--     immédiate entre tous les téléphones du salon.
--
-- Impact : entièrement additif (2 nouvelles tables + publication
--   realtime). Aucune table existante modifiée.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_salons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  jeu_id            uuid not null references public.bsh_jeux(id) on delete cascade,
  pseudo_hote       text,
  cree_par          uuid references public.profiles(id) on delete set null,
  statut            text not null default 'ouvert' check (statut in ('ouvert','ferme')),
  carte_actuelle_id uuid references public.bsh_jeux_cartes(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.bsh_salons is
  'Salon multijoueur BSH Secret Games — v1 : tirage synchronisé via le code, sans scores/votes (à venir si besoin confirmé).';

create table if not exists public.bsh_salon_participants (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.bsh_salons(id) on delete cascade,
  pseudo      text not null,
  client_id   uuid references public.profiles(id) on delete set null,
  rejoint_le  timestamptz not null default now()
);

alter table public.bsh_salons enable row level security;
alter table public.bsh_salon_participants enable row level security;

-- Lecture publique : pas de donnée sensible dans un salon (un code,
-- un pseudo, l'id d'une carte déjà publique) — nécessaire pour que
-- quiconque avec le code puisse rejoindre sans compte.
drop policy if exists bsh_salons_lecture_publique on public.bsh_salons;
create policy bsh_salons_lecture_publique on public.bsh_salons
  for select to anon, authenticated
  using (true);

drop policy if exists bsh_salons_creation_publique on public.bsh_salons;
create policy bsh_salons_creation_publique on public.bsh_salons
  for insert to anon, authenticated
  with check (true);

-- Modification (tirer la carte suivante, fermer le salon) : ouverte
-- à quiconque connaît déjà l'id du salon — simplification de v1
-- documentée plus haut.
drop policy if exists bsh_salons_maj_publique on public.bsh_salons;
create policy bsh_salons_maj_publique on public.bsh_salons
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists bsh_salons_fondatrice on public.bsh_salons;
create policy bsh_salons_fondatrice on public.bsh_salons
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

drop policy if exists bsh_salon_participants_lecture_publique on public.bsh_salon_participants;
create policy bsh_salon_participants_lecture_publique on public.bsh_salon_participants
  for select to anon, authenticated
  using (true);

drop policy if exists bsh_salon_participants_creation_publique on public.bsh_salon_participants;
create policy bsh_salon_participants_creation_publique on public.bsh_salon_participants
  for insert to anon, authenticated
  with check (true);

drop policy if exists bsh_salon_participants_fondatrice on public.bsh_salon_participants;
create policy bsh_salon_participants_fondatrice on public.bsh_salon_participants
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Publication Realtime — nécessaire pour que le client s'abonne aux
-- changements (postgres_changes) et voie le tirage/les arrivées en
-- direct, sans recharger la page. Idempotent (ne ré-ajoute pas une
-- table déjà présente dans la publication).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bsh_salons'
  ) then
    alter publication supabase_realtime add table public.bsh_salons;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bsh_salon_participants'
  ) then
    alter publication supabase_realtime add table public.bsh_salon_participants;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from pg_policies
--   where schemaname='public' and tablename in ('bsh_salons','bsh_salon_participants');
--   → attendu : 7 (4 sur bsh_salons, 3 sur bsh_salon_participants —
--     cette dernière n'a pas de policy UPDATE, rien à y modifier).
--
--   select tablename from pg_publication_tables
--   where pubname='supabase_realtime' and tablename in ('bsh_salons','bsh_salon_participants')
--   order by tablename;
--   → attendu : 2 lignes (les deux tables).
-- ═══════════════════════════════════════════════════════════
