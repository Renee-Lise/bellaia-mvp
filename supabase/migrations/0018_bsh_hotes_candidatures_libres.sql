-- ═══════════════════════════════════════════════════════════
-- 0018_bsh_hotes_candidatures_libres.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-26 (id a bien
--   gen_random_uuid() comme défaut et reste NOT NULL, profile_id
--   existe et est nullable — correspondance exacte à l'attendu)
-- Auteur : Claude Code · Date de rédaction : 2026-10-26
-- Objet : la 0014 forçait bsh_hotes.id à être l'identifiant d'un
--   compte déjà créé (profiles.id) — en usage réel, Renée-Lise doit
--   pouvoir enregistrer une candidate (nom, téléphone, email) dès
--   qu'elle la rencontre, même si cette personne n'a jamais créé de
--   compte Bellaïa et n'en créera peut-être jamais. Le compte ne
--   doit rester qu'une option, pour les hôtesses qui ont réellement
--   besoin de se connecter à leur espace (missions, documents).
--
-- Choix de modélisation :
--   - bsh_hotes.id devient un identifiant propre à la fiche
--     (gen_random_uuid() par défaut), plus une référence à
--     profiles(id).
--   - Nouvelle colonne profile_id (uuid, nullable, référence
--     profiles(id)) : renseignée seulement si/quand cette hôtesse a
--     (ou obtient) un compte Bellaïa. Tant qu'elle est vide, la
--     candidate reste une simple fiche gérée par la fondatrice.
--   - Ne viole pas la règle "un seul système de compte" : profile_id
--     reste la SEULE façon de relier une hôtesse à un compte, jamais
--     un second système d'authentification — juste rendu optionnel,
--     comme une demande d'adhésion BSH Members avant conversion en
--     membre.
--   - Les policies "propre fiche" / "propres missions" / fonction
--     est_hote_bsh() sont réécrites pour comparer profile_id =
--     auth.uid() au lieu de id = auth.uid().
--
-- Impact : additif + modification de contrainte sur bsh_hotes.id
--   (retrait de la FK directe vers profiles, qui n'a jamais eu de
--   ligne réelle insérée à ce jour — la création via l'admin était
--   bloquée par ce champ obligatoire). Aucune donnée perdue.
-- ═══════════════════════════════════════════════════════════

-- Retire la contrainte de clé étrangère existante sur bsh_hotes.id
-- (nom exact non supposé — recherchée dynamiquement).
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'bsh_hotes'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'id';
  if fk_name is not null then
    execute format('alter table public.bsh_hotes drop constraint %I', fk_name);
  end if;
end $$;

alter table public.bsh_hotes alter column id set default gen_random_uuid();

alter table public.bsh_hotes
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

comment on column public.bsh_hotes.profile_id is
  'Compte Bellaïa lié à cette hôtesse, UNIQUEMENT si/quand elle en a un (connexion à son espace). Nullable : une candidate sans compte reste une fiche valide.';

-- Policies « propre accès » réécrites sur profile_id
drop policy if exists bsh_hotes_propre_fiche on public.bsh_hotes;
create policy bsh_hotes_propre_fiche on public.bsh_hotes
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists bsh_missions_propres on public.bsh_missions;
create policy bsh_missions_propres on public.bsh_missions
  for select to authenticated
  using (
    hote_id in (select id from public.bsh_hotes where profile_id = auth.uid())
  );

create or replace function public.est_hote_bsh()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.bsh_hotes
    where profile_id = auth.uid() and statut = 'active'
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name, column_default, is_nullable
--   from information_schema.columns
--   where table_schema='public' and table_name='bsh_hotes'
--   and column_name in ('id','profile_id');
--   → attendu : id a bien column_default = gen_random_uuid(),
--     profile_id existe et is_nullable = YES.
--
--   select count(*) from information_schema.table_constraints
--   where table_schema='public' and table_name='bsh_hotes'
--   and constraint_type='FOREIGN KEY';
--   → attendu : 1 seule (celle de bsh_missions n'existe pas sur
--     cette table ; celle qui reste doit être sur profile_id, pas id).
--
--   Fonctionnel : créer une fiche hôtesse depuis BSH → onglet Hôtes
--   sans renseigner d'identifiant de compte doit maintenant réussir.
-- ═══════════════════════════════════════════════════════════
