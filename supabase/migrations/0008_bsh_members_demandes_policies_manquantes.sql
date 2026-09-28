-- ═══════════════════════════════════════════════════════════
-- 0008_bsh_members_demandes_policies_manquantes.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-09-28
-- Auteur : Claude Code · Date de rédaction : 2026-09-28
-- Objet : recrée les 3 policies RLS de bsh_members_demandes, absentes
--         en base malgré la migration 0006 marquée VALIDÉE.
-- Contexte : audit demandé après que l'admin BSH Members se soit
--   révélé incapable de tracer aucune demande (0 ligne dans
--   bsh_members_demandes pour 2 comptes pourtant passés à
--   member_pending). Vérification en base :
--     select relrowsecurity from pg_class where relname = 'bsh_members_demandes';  -- true
--     select count(*) from pg_policies where tablename = 'bsh_members_demandes';   -- 0
--   La table existe, RLS est active, mais AUCUNE policy n'a jamais
--   été créée : RLS actif + 0 policy = refus total de toute requête
--   qui n'est pas superuser/service-role, y compris les propres
--   lectures/écritures des clientes. Le texte SQL de 0006 est
--   pourtant correct (relu intégralement, identique entre la version
--   "PROPOSITION" et "VALIDÉ" — voir git log) : les 3 `create policy`
--   sont syntaxiquement valides et n'ont entre elles aucune
--   dépendance qui expliquerait un échec partiel cohérent avec ce qui
--   est observé (RLS actif — donc le ALTER TABLE a bien tourné — mais
--   ZÉRO des 3 policies, y compris les deux qui ne dépendent que de
--   auth.uid(), sans aucune dépendance externe). L'explication la
--   plus probable est que seule la partie CREATE TABLE + ENABLE ROW
--   LEVEL SECURITY du fichier a été effectivement collée/exécutée
--   dans le SQL Editor à l'époque — pas un bug du SQL lui-même.
--   Point de vigilance distinct, sans lien avec cet incident précis :
--   demandes_staff_all dépend de public.est_staff_bellaia(), définie
--   par la migration 0005 — sur un projet rejoué de zéro, 0005 doit
--   être exécutée avant 0006/0008, jamais après.
-- Durcissement ajouté par rapport à 0006 : demandes_insert_own exige
--   maintenant decision = 'en_attente' ET decide_par is null en plus
--   de auth.uid() = user_id — une cliente ne peut plus, en forgeant
--   le corps de sa requête, s'auto-accepter/refuser ou renseigner un
--   decide_par (ces deux champs restent réservés au staff, cahier
--   §10.2/§10.6). N'affecte pas les écritures actuelles de l'app
--   (demanderAdhesion / envoyerDemande n'envoient jamais decision ni
--   decide_par — ces colonnes gardent leurs défauts).
-- Impact : additive uniquement. Aucune table/colonne créée ou
--   modifiée, uniquement des policies RLS sur une table déjà
--   existante. `drop policy if exists` avant chaque `create policy`
--   pour rendre ce script rejouable sans erreur si une policy existe
--   déjà partiellement (idempotent).
-- ═══════════════════════════════════════════════════════════

drop policy if exists demandes_select_own on public.bsh_members_demandes;
create policy demandes_select_own on public.bsh_members_demandes
  for select using (auth.uid() = user_id);

drop policy if exists demandes_insert_own on public.bsh_members_demandes;
create policy demandes_insert_own on public.bsh_members_demandes
  for insert
  with check (
    auth.uid() = user_id
    and decision = 'en_attente'
    and decide_par is null
  );

drop policy if exists demandes_staff_all on public.bsh_members_demandes;
create policy demandes_staff_all on public.bsh_members_demandes
  for all
  using (public.est_staff_bellaia())
  with check (public.est_staff_bellaia());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename = 'bsh_members_demandes';
--   → attendu : les 3 lignes ci-dessus (demandes_select_own,
--     demandes_insert_own, demandes_staff_all).
--   CONFIRMÉ le 2026-09-28 : résultat exécuté par Renée-Lise conforme
--   exactement à cet attendu (3 lignes, with_check de
--   demandes_insert_own incluant bien decision='en_attente' et
--   decide_par is null) — statut passé à VALIDÉ sur cette base, pas
--   sur le seul "Success" de l'éditeur SQL.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
