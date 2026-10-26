-- ═══════════════════════════════════════════════════════════
-- 0014_bsh_hotes_missions.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-26
-- Objet : crée un espace "hôtes et hôtesses" propre à Bella'Secret
--   Home — jusqu'ici, un compte hôte quelconque atterrissait sur
--   EspaceHote, le composant générique partagé par tous les univers
--   Bella'Studio (src/components/BellaiaApp.tsx) : exactement ce que
--   Renée-Lise a demandé de corriger ("le côté hôte doit être
--   uniquement pour BSH et pas Bella'Studio").
--
-- Choix de modélisation :
--   - bsh_hotes.id référence profiles(id) directement, comme
--     membership_status l'a fait pour BSH Members : un seul compte,
--     jamais un second système d'identité (règle en vigueur depuis
--     le début de ce chantier).
--   - bsh_missions est une table neuve, volontairement découplée de
--     reservations_experiences / bellaia_commandes pour l'instant :
--     la fondatrice assigne une mission à une hôtesse manuellement
--     (candidatures, profils, missions, disponibilités, affectations
--     au sens de sa consigne de refonte). Un lien plus fin avec les
--     événements réels pourra venir dans une migration ultérieure,
--     une fois ce premier étage validé en usage réel.
--   - Les documents des hôtesses (contrats, fiches) ne créent pas
--     une nouvelle table : ils passeront par bellaia_documents (GED
--     centrale déjà présente dans le code, module='BSH'), traité
--     dans la migration 0015.
--
-- Impact : entièrement additif. Aucune table existante modifiée,
--   aucune donnée touchée.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_hotes (
  id            uuid primary key references public.profiles(id) on delete cascade,
  nom           text,
  prenom        text,
  telephone     text,
  email         text,
  statut        text not null default 'candidature'
                  check (statut in ('candidature','active','inactive','refusee')),
  disponibilites text,   -- texte libre (ex: "Soirs et week-ends"), affiné plus tard si besoin
  notes_internes text,   -- visible fondatrice uniquement, jamais exposé à l'hôtesse
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.bsh_hotes is
  'Profils des hôtes/hôtesses Bella''Secret Home — distinct du modèle "talent" de Bella''Odyssée. Référence profiles(id) : pas de second système de compte.';

create table if not exists public.bsh_missions (
  id             uuid primary key default gen_random_uuid(),
  hote_id        uuid not null references public.bsh_hotes(id) on delete cascade,
  titre          text not null,
  description    text,
  date_mission   timestamptz,
  lieu           text,
  remuneration   numeric,
  statut         text not null default 'proposee'
                   check (statut in ('proposee','confirmee','terminee','annulee')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.bsh_missions is
  'Missions/affectations assignées par la fondatrice à une hôtesse BSH.';

alter table public.bsh_hotes    enable row level security;
alter table public.bsh_missions enable row level security;

-- Fondatrice : accès complet (même posture que "Fondatrice gère les stocks")
drop policy if exists bsh_hotes_fondatrice    on public.bsh_hotes;
create policy bsh_hotes_fondatrice on public.bsh_hotes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

drop policy if exists bsh_missions_fondatrice on public.bsh_missions;
create policy bsh_missions_fondatrice on public.bsh_missions
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Hôtesse : lecture de sa propre fiche et de ses propres missions uniquement
drop policy if exists bsh_hotes_propre_fiche on public.bsh_hotes;
create policy bsh_hotes_propre_fiche on public.bsh_hotes
  for select to authenticated
  using (id = auth.uid());

drop policy if exists bsh_missions_propres on public.bsh_missions;
create policy bsh_missions_propres on public.bsh_missions
  for select to authenticated
  using (hote_id = auth.uid());

-- Fonction helper, même esprit que est_staff_bellaia() — permet aux
-- futures policies (documents, etc.) de vérifier "cette personne
-- est une hôtesse BSH active" sans dupliquer la condition partout.
create or replace function public.est_hote_bsh()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.bsh_hotes
    where id = auth.uid() and statut = 'active'
  );
$$;

comment on function public.est_hote_bsh is
  'Vrai si l''utilisateur connecté est une hôtesse/hôte BSH au statut actif.';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution — à copier dans le SQL Editor
-- Supabase UNE FOIS la migration exécutée, puis à comparer au
-- résultat attendu avant de passer ce fichier à VALIDÉ :
--
--   select table_name from information_schema.tables
--   where table_schema='public' and table_name in ('bsh_hotes','bsh_missions');
--   → attendu : les deux noms de table.
--
--   select tablename, policyname, cmd, roles, permissive
--   from pg_policies
--   where tablename in ('bsh_hotes','bsh_missions')
--   order by tablename, policyname;
--   → attendu : 4 lignes (2 par table : une "fondatrice" ALL, une
--     "propre*" SELECT), toutes permissive = true.
--
--   select proname from pg_proc where proname = 'est_hote_bsh';
--   → attendu : 1 ligne.
--
-- Rien ci-dessus ne s'exécute automatiquement : à exécuter dans
-- Supabase seulement après validation, comme toutes les migrations
-- de ce dossier.
-- ═══════════════════════════════════════════════════════════
