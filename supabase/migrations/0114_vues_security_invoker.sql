-- ═══════════════════════════════════════════════════════════
-- 0114_vues_security_invoker.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18 (correctif urgent)
-- Faille : 17 vues de tableau de bord étaient « SECURITY DEFINER » et
-- contournaient la RLS : un visiteur ANONYME lisait le CA facturé, les
-- encaissements, les paiements en attente, le CRM, les clientes,
-- projets, tâches et stocks. Elles s'exécutent désormais avec les droits
-- de la personne connectée (security_invoker) : la fondatrice voit
-- exactement les mêmes chiffres (vérifié avant/après), un visiteur 0.
-- Retour arrière : NE PAS rétablir (rouvrirait la fuite).
-- v_catalogue_public reste volontairement « definer » : colonnes
-- publiques uniquement, jamais le prix d'achat.
-- ═══════════════════════════════════════════════════════════
alter view public.v_bibliotheque_dashboard set (security_invoker = true);
alter view public.v_client_dashboard set (security_invoker = true);
alter view public.v_dashboard_finances set (security_invoker = true);
alter view public.v_dashboard_crm set (security_invoker = true);
alter view public.v_calendar_upcoming set (security_invoker = true);
alter view public.v_prospects_relance set (security_invoker = true);
alter view public.v_projets_avancement set (security_invoker = true);
alter view public.v_paiements_dashboard set (security_invoker = true);
alter view public.v_mes_paiements set (security_invoker = true);
alter view public.v_erp_projets_dashboard set (security_invoker = true);
alter view public.v_erp_taches_urgentes set (security_invoker = true);
alter view public.v_stocks_critiques set (security_invoker = true);
alter view public.v_erp_dashboard set (security_invoker = true);
alter view public.v_stock_alertes set (security_invoker = true);
alter view public.v_workflow_bellaia set (security_invoker = true);
alter view public.v_historique_client set (security_invoker = true);
alter view public.v_messages_non_lus set (security_invoker = true);
