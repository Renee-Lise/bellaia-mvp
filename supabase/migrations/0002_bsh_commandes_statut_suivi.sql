-- ═══════════════════════════════════════════════════════════
-- 0002_bsh_commandes_statut_suivi.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-22
-- Objet : suivi de préparation/expédition des commandes BSH (au-delà
--         du seul statut de paiement Stripe), pour alimenter la frise
--         de statut de "Commandes & suivi" côté cliente et reconnecter
--         l'onglet Commandes du panneau admin BSH à Supabase.
-- Impact : additive uniquement.
--   - Une seule colonne ajoutée à `stripe_payment_intents`, nullable,
--     avec une valeur par défaut — aucune ligne existante affectée
--     autrement que par le remplissage de cette valeur par défaut.
--   - Aucune policy RLS modifiée : les policies existantes sur
--     `stripe_payment_intents` (stripe_client_select, stripe_fondatrice)
--     s'appliquent déjà par ligne, donc couvrent automatiquement cette
--     nouvelle colonne sans changement.
-- ───────────────────────────────────────────────────────────
-- Vocabulaire : repris tel quel de STATUTS_CMD, déjà utilisé dans
-- l'onglet Commandes du panneau admin BSH (src/components/BellaiaApp.tsx)
-- — mêmes chaînes françaises exactes, pour ne pas avoir à traduire entre
-- l'admin et la base de données.
-- ═══════════════════════════════════════════════════════════

alter table public.stripe_payment_intents
  add column if not exists statut_suivi text
    not null default 'Demande reçue'
    check (statut_suivi in (
      'Demande reçue',
      'Validation fondatrice',
      'Paiement en attente',
      'Acompte reçu',
      'Paiement complet reçu',
      'Confirmée',
      'Préparation',
      'Expédiée',
      'Terminée',
      'Annulée'
    ));

comment on column public.stripe_payment_intents.statut_suivi is
  'Suivi de préparation/expédition de la commande BSH — distinct du statut de paiement Stripe (colonne statut). Modifié par la fondatrice/assistante, lu par la cliente dans "Commandes & suivi".';

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
