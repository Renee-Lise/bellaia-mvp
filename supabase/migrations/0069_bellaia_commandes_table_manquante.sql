-- ═══════════════════════════════════════════════════════════
-- 0069_bellaia_commandes_table_manquante.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : bellaia_commandes est utilisée par le code depuis le début
--   du suivi des migrations (documentée dans supabase/README.md comme
--   table "préexistante") — Vilo'Assistance, Mo Ti-Péyi, Bella'Odyssée,
--   Bella'Food (catalogue public) et le WorkflowEngine (conversion
--   devis Events) y lisent/écrivent tous. Diagnostic confirmé par
--   Renée-Lise : `select to_regclass('public.bellaia_commandes')`
--   renvoie NULL — la table n'existe PAS réellement en base. C'est la
--   cause exacte de l'erreur "Could not find the table
--   'public.bellaia_commandes' in the schema cache" qui empêchait de
--   passer commande depuis le catalogue Bella'Food.
--
-- Schéma reconstitué en lisant (pas en devinant) chaque appel
--   sbPost/sbPatch/sbGet réel sur cette table dans le code :
--   src/components/BellaiaApp.tsx (FOOD, VILO, ODYSSEE, EVENTS,
--   EDITIONS), src/modules/vilo/ViloF.tsx, src/modules/motipy/
--   MoTiPeyiF.tsx, src/modules/odyssee/OdysseeF.tsx,
--   src/modules/core/WorkflowEngine.ts. Colonnes : bu, reference,
--   source_table/source_id (lien optionnel vers le dossier d'origine,
--   ex. events_demandes), client_nom, client_tel, statut (vocabulaire
--   observé à l'identique dans tous ces fichiers : BROUILLON,
--   COMMANDE, PRODUCTION, LIVRE, CLOTURE, FACTURE, ANNULE — laissé en
--   texte libre, sans CHECK, par prudence : cette table est partagée
--   par 5 univers différents, une contrainte trop stricte reconstruite
--   à partir d'un échantillon de code risquerait de bloquer un cas non
--   vu ici), total, acompte, acompte_paye, solde, devis_ref,
--   date_commande, date_livraison, lignes (jsonb), notes.
--
-- Sécurité : aucun de ces écrans n'envoie de user_id/client_id à la
--   création (vérifié) — sans ça, impossible de restreindre
--   correctement la lecture à "mes propres commandes" (le filtrage
--   actuel par client_nom ilike, côté client React, n'est pas une
--   vraie protection RLS). Plutôt que de recréer ici le même trou que
--   celui corrigé sur tant d'autres tables cette session
--   (auth.role()='authenticated' = accès à toutes les commandes de
--   toutes les clientes), la colonne created_by se remplit TOUTE
--   SEULE avec l'identité de l'auteure de la requête (default
--   auth.uid()) sans qu'aucun code existant n'ait besoin d'être
--   modifié pour l'envoyer — et sert de base à la policy de lecture
--   scopée à la cliente elle-même.
--
-- Impact : création d'une table qui n'existait pas. Aucune donnée
--   existante supprimée ou modifiée (il n'y en avait pas).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_commandes (
  id uuid primary key default gen_random_uuid(),
  bu text not null,
  reference text,
  source_table text,
  source_id uuid,
  client_nom text,
  client_tel text,
  statut text not null default 'BROUILLON',
  total numeric not null default 0,
  acompte numeric,
  acompte_paye boolean default false,
  solde numeric,
  devis_ref text,
  date_commande date,
  date_livraison date,
  lignes jsonb,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bellaia_commandes_bu_idx on public.bellaia_commandes (bu);
create index if not exists bellaia_commandes_created_by_idx on public.bellaia_commandes (created_by);
create index if not exists bellaia_commandes_source_idx on public.bellaia_commandes (source_table, source_id);

alter table public.bellaia_commandes enable row level security;

drop policy if exists bellaia_commandes_fondatrice on public.bellaia_commandes;
create policy bellaia_commandes_fondatrice on public.bellaia_commandes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Une cliente connectée peut créer sa propre commande...
drop policy if exists bellaia_commandes_creer on public.bellaia_commandes;
create policy bellaia_commandes_creer on public.bellaia_commandes
  for insert to authenticated
  with check (true);

-- ...et ne lire QUE les siennes (created_by rempli automatiquement
-- par le default ci-dessus, aucune modification de code nécessaire).
drop policy if exists bellaia_commandes_lire_les_siennes on public.bellaia_commandes;
create policy bellaia_commandes_lire_les_siennes on public.bellaia_commandes
  for select to authenticated
  using (created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.bellaia_commandes');
--   → attendu : une valeur non nulle (plus NULL).
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bellaia_commandes'
--   order by ordinal_position;
--   → attendu : les colonnes listées ci-dessus, dont created_by.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='bellaia_commandes'
--   order by policyname;
--   → attendu : 3 lignes (bellaia_commandes_fondatrice,
--     bellaia_commandes_creer, bellaia_commandes_lire_les_siennes).
--
--   Fonctionnel : repasser une commande depuis le catalogue client
--   Bella'Food → doit réussir cette fois (plus d'erreur PGRST205),
--   et apparaître dans l'onglet "Commandes site" de Bella'Food.
-- ═══════════════════════════════════════════════════════════
