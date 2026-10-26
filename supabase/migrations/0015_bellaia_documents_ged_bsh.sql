-- ═══════════════════════════════════════════════════════════
-- 0015_bellaia_documents_ged_bsh.sql
-- STATUT: ÉCHEC À L'EXÉCUTION — NE PAS REJOUER
-- Exécutée le 2026-10-26 par Renée-Lise : a échoué avec
--   ERROR 42883 "operator does not exist: uuid = text" (la vraie
--   table bellaia_documents existait déjà, avec entite_id/client_id
--   déjà en uuid — ce fichier supposait text à tort, faute de trace
--   dans les migrations versionnées). Comme le script s'exécute en
--   une seule transaction, RIEN de ce fichier n'a été appliqué — la
--   base est restée dans son état d'avant. Remplacée par 0017, qui
--   repart du vrai schéma vérifié en base. Conservé ici uniquement
--   pour l'historique du diagnostic — ne jamais ré-exécuter tel quel.
-- Auteur : Claude Code · Date de rédaction : 2026-10-26
-- Objet : la GED centrale (src/modules/docs/DocumentCenter.tsx,
--   déjà câblée côté fondatrice sous la destination "documents") et
--   la fonction gedAutoSave (src/components/BellaiaApp.tsx, utilisée
--   par ex. par HoteOdyssee pour archiver les fiches mission)
--   écrivent toutes les deux dans une table bellaia_documents, mais
--   AUCUNE trace de cette table dans les migrations versionnées.
--   Sans certitude qu'elle existe réellement en base (même constat
--   que pour stocks avant la 0011), cette migration la crée de façon
--   idempotente avec toutes les colonnes attendues par les deux
--   points d'écriture, sans jamais toucher une colonne qui existerait
--   déjà.
--
-- Pourquoi maintenant : Renée-Lise a demandé que (1) les documents
--   des hôtesses BSH et (2) les documents administratifs/comptables
--   côté fondatrice BSH soient "insérés à leur place" — cette place,
--   c'est cette GED centrale, déjà prévue pour ça (ModuleDocument
--   inclut déjà 'BSH', TypeDocument inclut déjà 'contrat' et
--   'document_admin'). Pas de nouvelle UI à inventer : il manquait
--   la table et ses policies.
--
-- Choix de modélisation :
--   - Pas de contrainte CHECK sur "statut" : DocumentCenter utilise
--     brouillon/valide/envoye/archive/supprime, gedAutoSave utilise
--     "final" — incohérence déjà présente dans le code existant,
--     non corrigée ici pour rester strictement additif ; à
--     harmoniser dans une prochaine session si besoin.
--   - entite_id en text (pas uuid) : gedAutoSave lui passe des id
--     variés selon la table d'origine, jamais vérifiés comme uuid
--     stricts — rester permissif plutôt que risquer un rejet.
--   - Accès staff : est_staff_bellaia() (fondatrice + assistante),
--     pas is_fondatrice() seul — ce registre est transverse à tous
--     les univers (FOOD, EVENTS, BSH, ODYSSEE...), pas un module
--     interne BSH comme stocks.
--
-- Impact : entièrement additif.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_documents (
  id uuid primary key default gen_random_uuid()
);

alter table public.bellaia_documents
  add column if not exists reference     text,
  add column if not exists titre         text,
  add column if not exists module        text,
  add column if not exists categorie     text,
  add column if not exists type          text,
  add column if not exists type_fichier  text,
  add column if not exists contenu_html  text,
  add column if not exists url           text,
  add column if not exists taille        integer,
  add column if not exists mime_type     text,
  add column if not exists client_id     text,
  add column if not exists client_nom    text,
  add column if not exists devis_ref     text,
  add column if not exists commande_ref  text,
  add column if not exists facture_ref   text,
  add column if not exists entite_table  text,
  add column if not exists entite_id     text,
  add column if not exists statut        text default 'brouillon',
  add column if not exists version       integer default 1,
  add column if not exists tags          text[] default '{}',
  add column if not exists notes         text,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz;

comment on table public.bellaia_documents is
  'GED centrale Bellaïa (tous univers) — module=''BSH'' pour les documents de Bella''Secret Home (contrats hôtesses, documents administratifs/comptables fondatrice, etc.).';

alter table public.bellaia_documents enable row level security;

-- Staff (fondatrice + assistante) : accès complet, tous univers.
drop policy if exists bellaia_documents_staff on public.bellaia_documents;
create policy bellaia_documents_staff on public.bellaia_documents
  for all to public
  using (public.est_staff_bellaia())
  with check (public.est_staff_bellaia());

-- Hôtesse BSH active : lecture des seuls documents liés à sa propre
-- fiche ou à ses propres missions (jamais les documents administratifs
-- ou comptables de la fondatrice, jamais ceux d'une autre hôtesse).
drop policy if exists bellaia_documents_hote_bsh on public.bellaia_documents;
create policy bellaia_documents_hote_bsh on public.bellaia_documents
  for select to authenticated
  using (
    module = 'BSH'
    and public.est_hote_bsh()
    and (
      (entite_table = 'bsh_hotes'    and entite_id = auth.uid()::text)
      or (entite_table = 'bsh_missions' and entite_id in (
            select id::text from public.bsh_missions where hote_id = auth.uid()
          ))
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bellaia_documents'
--   order by column_name;
--   → attendu : les 22 colonnes listées ci-dessus (+ id).
--
--   select tablename, policyname, cmd, roles, permissive
--   from pg_policies where tablename='bellaia_documents';
--   → attendu : 2 lignes, toutes permissive = true.
--
--   Fonctionnel : la destination "Documents" côté fondatrice doit
--   afficher "✅ Connecté" au lieu de "📦 Local" après rechargement.
-- ═══════════════════════════════════════════════════════════
