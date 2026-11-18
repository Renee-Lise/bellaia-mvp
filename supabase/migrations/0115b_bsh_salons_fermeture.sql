-- ═══════════════════════════════════════════════════════════
-- 0115b_bsh_salons_fermeture.sql
-- STATUT: PRÉPARÉ — à exécuter JUSTE APRÈS la mise en ligne du nouvel
-- écran des salons (qui passe par les fonctions de 0115).
-- Fin des accès directs aux tables des salons : plus de liste
-- publique des salons ni de leurs codes, plus de modification directe.
-- ALTER POLICY uniquement (aucune suppression).
-- ═══════════════════════════════════════════════════════════
-- Plus d'accès direct (anonyme ou connecté) : uniquement les fonctions.
alter policy bsh_salons_lecture_publique on public.bsh_salons using (false);
alter policy bsh_salons_creation_publique on public.bsh_salons with check (false);
alter policy bsh_salons_maj_publique on public.bsh_salons using (false) with check (false);
alter policy bsh_salon_participants_lecture_publique on public.bsh_salon_participants using (false);
alter policy bsh_salon_participants_creation_publique on public.bsh_salon_participants with check (false);

