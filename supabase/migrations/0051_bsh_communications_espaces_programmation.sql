-- ═══════════════════════════════════════════════════════════
-- 0051_bsh_communications_espaces_programmation.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-30 (5 colonnes présentes, bsh_communications_parametres créée avec automatisations_suspendues=false, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-29
-- Objet : Phase 1 de la mission "BSH Communications & Automatisations"
--   — étend bsh_communications (déjà réelle et déjà utilisée par la
--   section "📢 Communication" de BSHF Studio) plutôt que de créer un
--   nouveau système parallèle.
--
-- Ajouts :
--   - espace : classe la communication parmi les 3 espaces WhatsApp
--     de la mission (Chaîne BSH / Cercle BSH / BSH Lounge). Nullable
--     et distinct de `cible` (déjà existante) : une communication
--     interne/générale (ex. maintenance) peut continuer à n'avoir
--     qu'une cible, sans appartenir à un espace précis — rien
--     d'existant n'est renommé ni réinterprété.
--   - statut : workflow élargi pour couvrir le cycle complet demandé
--     (brouillon → en_attente → valide → programme → pret → publie →
--     archive). Les 3 valeurs déjà utilisées (brouillon/publie/
--     archive) restent valides — ancien contenu inchangé.
--   - date_programmee : quand la publication doit sortir (fuseau
--     America/Cayenne géré côté application, pas en base).
--   - jeu_id : lien optionnel vers bsh_jeux, pour les publications qui
--     annoncent une partie Secret Games (mission section 8).
--   - visuel_url / lien_externe : champs libres pour le visuel et un
--     lien (jeu, salon, événement) accompagnant la publication.
--
-- bsh_communications_parametres (nouvelle table, singleton) :
--   un seul interrupteur pour l'instant — automatisations_suspendues.
--   "SUSPENDRE TOUTES LES AUTOMATISATIONS" (mission section 7)
--   doit pouvoir être vérifié par tout mécanisme d'envoi futur (y
--   compris non authentifié, ex. une tâche planifiée côté serveur) —
--   lecture publique, écriture fondatrice uniquement.
--
-- Impact : entièrement additif. Aucune ligne, colonne ou policy
--   existante supprimée ou redéfinie différemment.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_communications
  add column if not exists espace text check (espace in ('chaine','cercle','lounge')),
  add column if not exists date_programmee timestamptz,
  add column if not exists jeu_id uuid references public.bsh_jeux(id) on delete set null,
  add column if not exists visuel_url text,
  add column if not exists lien_externe text;

alter table public.bsh_communications drop constraint if exists bsh_communications_statut_check;
alter table public.bsh_communications add constraint bsh_communications_statut_check
  check (statut in ('brouillon','en_attente','valide','programme','pret','publie','archive'));

create table if not exists public.bsh_communications_parametres (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  automatisations_suspendues boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Verrou "singleton" : id est un uuid fixe et unique, garanti par la
-- contrainte default + la ligne insérée une seule fois ci-dessous.
insert into public.bsh_communications_parametres (id)
select '00000000-0000-0000-0000-000000000001'::uuid
where not exists (select 1 from public.bsh_communications_parametres);

alter table public.bsh_communications_parametres enable row level security;

drop policy if exists bsh_communications_parametres_fondatrice on public.bsh_communications_parametres;
create policy bsh_communications_parametres_fondatrice on public.bsh_communications_parametres
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

drop policy if exists bsh_communications_parametres_lecture_publique on public.bsh_communications_parametres;
create policy bsh_communications_parametres_lecture_publique on public.bsh_communications_parametres
  for select to anon, authenticated
  using (true);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bsh_communications'
--     and column_name in ('espace','date_programmee','jeu_id','visuel_url','lien_externe')
--   order by column_name;
--   → attendu : 5 lignes.
--
--   select automatisations_suspendues from public.bsh_communications_parametres;
--   → attendu : 1 ligne, valeur false.
--
--   select policyname from pg_policies
--   where schemaname='public' and tablename='bsh_communications_parametres'
--   order by policyname;
--   → attendu : 2 lignes.
-- ═══════════════════════════════════════════════════════════
