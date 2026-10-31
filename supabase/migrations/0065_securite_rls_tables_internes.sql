-- ═══════════════════════════════════════════════════════════
-- 0065_securite_rls_tables_internes.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-31
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : corrige une faille de sécurité trouvée via l'audit RLS
--   demandé par Renée-Lise (requête consolidée sur pg_policies). De
--   nombreuses tables avaient une policy du type
--   "auth.role() = 'authenticated'" — n'importe quelle cliente
--   connectée (pas seulement fondatrice/assistante) pouvait lire ET
--   modifier toutes les lignes.
--
-- Portée de CETTE migration : seulement les tables vérifiées (en
--   lisant le code source réel, pas en supposant) comme n'étant
--   utilisées QUE par des écrans internes fondatrice/assistante, ou
--   n'étant utilisées par AUCUN écran actuellement (code mort) :
--     - audit_log (WorkflowEngine, journal d'audit interne)
--     - bellaia_adresses, bellaia_contacts, bellaia_client_historique,
--       bellaia_clients (ClientCenter — CRM interne fondatrice)
--     - bellaia_fournisseurs, bellaia_livraisons (gestion interne)
--     - bellaia_document_versions, bellaia_documents_clients (aucune
--       référence dans le code — jamais utilisées par un écran)
--     - catalogue_categories, catalogue_options (aucune référence —
--       jamais utilisées par un écran)
--     - dossiers_evenements, events_devis_lignes,
--       events_location_vaisselle (aucune référence)
--     - planning_events, planning_horaires (PlanningCentralF /
--       PlanningHorairesF — écrans fondatrice), planning_jours_fermes
--       (aucune référence), planning_config_marges (config marges,
--       sensible)
--     - stock_global, stock_mouvements, stock_reservations
--       (BellaiaStocks — écran fondatrice)
--     - food_consommables, food_materiel, food_stocks (gestion
--       interne Food, même famille que les autres tables food_*
--       déjà sécurisées en is_fondatrice() cette session)
--     - ref_compteurs (RLS totalement désactivé — aucune policy du
--       tout ; compteurs de référencement internes, aucune lecture
--       cliente nécessaire)
--
-- Volontairement PAS touché ici (nécessite une policy scopée au
--   propriétaire de la ligne, pas un simple verrou staff, sous peine
--   de casser un vrai usage client existant — traité séparément) :
--     - bellaia_conversations, bellaia_messages (une cliente doit
--       lire/écrire SES messages — suite logique de la migration
--       0064, via la fonction est_membre_conversation())
--     - bellaia_factures, bellaia_paiements (EventsPortail.tsx —
--       PortailSuiviClient — crée des factures et liste des
--       paiements côté client)
--     - events_demandes (ClientEvents.tsx + EventsPortail.tsx — une
--       cliente crée et consulte sa propre demande)
--     - bsh_salons (SalonsClient.tsx — écran client)
--   Ces 4 points sont expliqués séparément à Renée-Lise — ne pas les
--   fermer en staff-only casserait des parcours clientes réels.
--
-- Méthode : on ne connaît pas le nom exact de chaque policy existante
--   sur ces tables (pas de migration suivie à l'origine), donc plutôt
--   que de deviner un nom à "drop policy if exists", un bloc DO
--   supprime dynamiquement TOUTES les policies actuellement posées sur
--   chacune de ces tables avant de poser la nouvelle — sûr quel que
--   soit leur nom.
--
-- Impact : policies remplacées sur 23 tables (RLS activé en plus sur
--   ref_compteurs). Aucune donnée supprimée.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Nettoyage dynamique des anciennes policies ──────────
do $$
declare
  cible text;
  pol record;
  tables_a_nettoyer text[] := array[
    'bellaia_adresses','bellaia_client_historique','bellaia_clients','bellaia_contacts',
    'bellaia_fournisseurs','bellaia_livraisons','bellaia_document_versions','bellaia_documents_clients',
    'catalogue_categories','catalogue_options','dossiers_evenements','events_devis_lignes',
    'events_location_vaisselle','planning_events','planning_horaires','planning_jours_fermes',
    'stock_global','stock_mouvements','stock_reservations',
    'audit_log','food_consommables','food_materiel','food_stocks','planning_config_marges'
  ];
begin
  foreach cible in array tables_a_nettoyer loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=cible loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, cible);
    end loop;
  end loop;
end $$;

-- ── 2. Tables fondatrice SEULE (données les plus sensibles : audit,
--    gestion interne Food, marges, compteurs) ──────────────
create policy fondatrice_seule on public.audit_log
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

create policy fondatrice_seule on public.food_consommables
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

create policy fondatrice_seule on public.food_materiel
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

create policy fondatrice_seule on public.food_stocks
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

create policy fondatrice_seule on public.planning_config_marges
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

alter table public.ref_compteurs enable row level security;
create policy fondatrice_seule on public.ref_compteurs
  for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());

-- ── 3. Tables staff (fondatrice + assistante) — CRM interne,
--    planning, stock, catalogue admin, tables inutilisées ──
create policy staff_seul on public.bellaia_adresses
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_client_historique
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_clients
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_contacts
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_fournisseurs
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_livraisons
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_document_versions
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.bellaia_documents_clients
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.catalogue_categories
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.catalogue_options
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.dossiers_evenements
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.events_devis_lignes
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.events_location_vaisselle
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.planning_events
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.planning_horaires
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.planning_jours_fermes
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.stock_global
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.stock_mouvements
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

create policy staff_seul on public.stock_reservations
  for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select tablename, policyname, cmd, qual
--   from pg_policies
--   where schemaname='public'
--     and tablename in (
--       'bellaia_adresses','bellaia_client_historique','bellaia_clients','bellaia_contacts',
--       'bellaia_fournisseurs','bellaia_livraisons','bellaia_document_versions','bellaia_documents_clients',
--       'catalogue_categories','catalogue_options','dossiers_evenements','events_devis_lignes',
--       'events_location_vaisselle','planning_events','planning_horaires','planning_jours_fermes',
--       'stock_global','stock_mouvements','stock_reservations',
--       'audit_log','food_consommables','food_materiel','food_stocks','planning_config_marges',
--       'ref_compteurs'
--     )
--   order by tablename;
--   → attendu : 24 tables, UNE seule policy chacune (fondatrice_seule
--     ou staff_seul), qual contenant 'is_fondatrice' ou
--     'est_staff_bellaia' — plus aucune ligne avec "authenticated".
--
--   select relrowsecurity from pg_class where relname='ref_compteurs';
--   → attendu : true (RLS maintenant activé).
--
--   Contrôle d'étanchéité (doit échouer, et c'est voulu) — avec un
--   compte cliente de test (pas fondatrice/assistante) :
--   begin;
--   set local role authenticated;
--   select * from public.bellaia_clients limit 1;
--   rollback;
--   → attendu : 0 ligne retournée (pas une erreur, juste aucune
--     ligne — RLS filtre silencieusement).
-- ═══════════════════════════════════════════════════════════
