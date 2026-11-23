-- ═══════════════════════════════════════════════════════════════════════════════
-- 0138 — Harmonisation des droits : paiements Stripe et réservations BSH accordés par permission
--        explicite (a_permission), comme le reste de l'application.
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : 0134, sauvegarde vérifiée.
-- Dossier de test et retour arrière : conservés dans le dossier privé (non publiés).
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists stripe_fondatrice on public.stripe_payment_intents;
create policy stripe_fondatrice on public.stripe_payment_intents for all
  using (public.is_fondatrice() or public.a_permission('paiements.gerer'))
  with check (public.is_fondatrice() or public.a_permission('paiements.gerer'));
drop policy if exists reservations_select_staff on public.reservations_experiences;
create policy reservations_select_staff on public.reservations_experiences for select
  using (public.a_permission('bsh.reservations', 'BSH'));
drop policy if exists reservations_update_staff on public.reservations_experiences;
create policy reservations_update_staff on public.reservations_experiences for update
  using (public.a_permission('bsh.reservations', 'BSH'));
