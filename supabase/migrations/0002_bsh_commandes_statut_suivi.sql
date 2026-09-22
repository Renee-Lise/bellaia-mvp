-- ═══════════════════════════════════════════════════════════
-- 0002_bsh_commandes_statut_suivi.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-22
-- Objet : suivi de préparation/expédition des commandes BSH (au-delà
--         du seul statut de paiement Stripe), pour alimenter la frise
--         de statut de "Commandes & suivi" côté cliente et reconnecter
--         l'onglet Commandes du panneau admin BSH à Supabase.
-- Impact :
--   - Colonne : additive uniquement. Une seule colonne ajoutée à
--     `stripe_payment_intents`, avec une valeur par défaut — aucune
--     ligne existante affectée autrement que par ce remplissage.
--   - Policy : `stripe_fondatrice` (droit ALL, donc y compris UPDATE)
--     est recréée à l'identique sauf l'ajout du rôle 'assistante' —
--     confirmé par Renée-Lise (compte humain qu'elle emploie, distinct
--     de l'IA Bellaïa qui n'a pas de session/rôle Supabase). Même
--     principe que reservations_experiences (migration 0001), qui
--     autorise déjà fondatrice + assistante. Aucune donnée touchée,
--     seul le droit d'écriture est élargi.
-- ───────────────────────────────────────────────────────────
-- Vocabulaire : repris tel quel de STATUTS_CMD, déjà utilisé dans
-- l'onglet Commandes du panneau admin BSH (src/components/BellaiaApp.tsx)
-- — mêmes chaînes françaises exactes, pour ne pas avoir à traduire entre
-- l'admin et la base de données.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Colonne de suivi
-- ───────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────
-- 2. Policy stripe_fondatrice — ajout du rôle 'assistante'
--    (recréée à l'identique, seule la condition de rôle change)
-- ───────────────────────────────────────────────────────────
drop policy if exists stripe_fondatrice on public.stripe_payment_intents;

create policy stripe_fondatrice on public.stripe_payment_intents
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
