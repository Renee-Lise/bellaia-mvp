-- ═══════════════════════════════════════════════════════════
-- 0017_bellaia_documents_rls_reelle.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-26
-- Objet : corrige la 0015, qui a échoué intégralement (une seule
--   transaction annulée par une erreur de cast) parce qu'elle
--   supposait un schéma inventé pour bellaia_documents au lieu du
--   vrai schéma déjà en place. Vérifié empiriquement par Renée-Lise
--   (information_schema.columns + pg_policies) :
--
--   - entite_id et client_id sont déjà en uuid (pas text) : la 0015
--     comparait entite_id = auth.uid()::text → uuid = text → erreur
--     42883, qui a annulé toute la migration.
--   - La table a déjà une colonne hote_id (uuid) : plus simple et
--     plus juste à utiliser que l'indirection entite_table/entite_id
--     que j'avais inventée pour les documents d'hôtesses.
--   - Deux policies existaient déjà et restent documentées ici pour
--     mémoire (elles ne sont pas touchées par ce fichier, sauf
--     "docs_auth" ci-dessous) :
--       docs_auth      : ALL, qual = auth.role() = 'authenticated'
--                        → n'importe quel compte connecté avait accès
--                        à TOUS les documents, y compris les
--                        documents administratifs/comptables.
--       ged_client_own : SELECT, qual = client_id = auth.uid()
--                        → correcte telle quelle, non touchée.
--
--   Décision validée par Renée-Lise : resserrer docs_auth à
--   fondatrice/assistante uniquement (est_staff_bellaia()), au lieu
--   de "n'importe qui connecté".
--
-- Impact : remplace une seule policy existante (docs_auth) par une
--   version plus stricte, ajoute une policy supplémentaire pour les
--   hôtesses BSH. Aucune colonne, aucune donnée touchée.
-- ═══════════════════════════════════════════════════════════

-- Resserre l'accès large existant à fondatrice + assistante uniquement.
drop policy if exists docs_auth on public.bellaia_documents;
create policy bellaia_documents_staff on public.bellaia_documents
  for all to public
  using (public.est_staff_bellaia())
  with check (public.est_staff_bellaia());

-- ged_client_own (client_id = auth.uid()) reste en place telle quelle.

-- Hôtesse BSH active : lecture des seuls documents qui lui sont liés
-- directement (colonne hote_id déjà présente dans la vraie table),
-- et seulement pour le module BSH — jamais les documents
-- administratifs/comptables de la fondatrice, jamais ceux d'une
-- autre hôtesse, jamais ceux d'un autre univers.
drop policy if exists bellaia_documents_hote_bsh on public.bellaia_documents;
create policy bellaia_documents_hote_bsh on public.bellaia_documents
  for select to authenticated
  using (
    module = 'BSH'
    and public.est_hote_bsh()
    and hote_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd, roles, qual
--   from pg_policies where tablename='bellaia_documents'
--   order by policyname;
--   → attendu : 3 lignes — bellaia_documents_hote_bsh (SELECT),
--     bellaia_documents_staff (ALL), ged_client_own (SELECT).
--     docs_auth ne doit plus apparaître.
--
--   Contrôle fonctionnel : une cliente simple connectée (pas
--   fondatrice/assistante) ne doit plus pouvoir lire les documents
--   qui ne sont ni les siens (client_id) ni liés à elle comme
--   hôtesse (hote_id) :
--   begin;
--   set local role authenticated;
--   select count(*) from public.bellaia_documents;
--   rollback;
--   → doit renvoyer uniquement ses propres lignes, pas tout.
--   (Ce test précis demande d'être exécuté avec le jeton d'une
--   cliente réelle depuis l'app plutôt que depuis le SQL Editor en
--   "authenticated" générique, qui n'a pas d'auth.uid() — à défaut,
--   vérifier simplement que docs_auth a bien disparu de la liste
--   des policies ci-dessus suffit pour valider ce fichier.)
-- ═══════════════════════════════════════════════════════════
