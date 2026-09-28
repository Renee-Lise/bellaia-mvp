-- ═══════════════════════════════════════════════════════════
-- 0009_favoris_panier_reservations_policies_manquantes.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-28
-- Objet : même trou que bsh_members_demandes (migration 0008),
--         trouvé par l'audit demandé — RLS actif mais AUCUNE policy
--         sur favoris, panier_items, reservations_experiences,
--         alors que la migration 0001 (VALIDÉE le 2026-09-20) est
--         censée les avoir créées. Concrètement : ces trois tables
--         refusaient TOUTE requête, y compris les propres
--         lectures/écritures des clientes, depuis leur création —
--         "Mon espace BSH" (favoris, panier, réservations) n'a
--         jamais pu fonctionner contre la vraie base. Cohérent avec
--         "ces pages n'ont été testées qu'en local sans vraie base."
-- Cause probable : identique à 0006/0008 — seule la partie CREATE
--   TABLE + ENABLE ROW LEVEL SECURITY du fichier 0001 a été
--   effectivement exécutée à l'époque, pas les CREATE POLICY.
-- Deuxième trou trouvé en vérifiant pourquoi la restauration des
--   policies suffirait à rendre ces pages fonctionnelles : AUCUN des
--   trois inserts client (FavoriToggle.tsx, PanierButton.tsx,
--   ReservationsClient.tsx) n'envoie user_id dans le corps de la
--   requête — ils comptent sur un défaut auto-rempli qui n'a jamais
--   été créé. Sans lui, même une fois les policies restaurées,
--   chaque insertion échouerait avec une violation NOT NULL sur
--   user_id (aucune ligne n'existe dans ces 3 tables à ce jour, donc
--   aucune donnée existante n'est concernée par ce constat). Ajouté
--   ici : `default auth.uid()` sur user_id des 3 tables — le
--   standard Supabase pour ce cas, pas de changement côté app requis.
-- Durcissement (comme 0008 pour bsh_members_demandes) :
--   reservations_insert_own exige maintenant en plus
--   statut = 'demande_recue' — une cliente ne peut pas forger un
--   statut avancé (validee/confirmee/realisee...) à la création,
--   seule la fondatrice/assistante (reservations_update_staff) fait
--   avancer le statut. N'affecte pas ReservationsClient.tsx, qui
--   n'envoie jamais `statut` (repose déjà sur le défaut
--   'demande_recue'). Pas de champ équivalent sensible sur
--   favoris/panier_items (quantite est normalement modifiable par la
--   cliente) — rien d'ajouté là.
-- Impact : additive uniquement.
--   - `alter column ... set default` ne touche aucune ligne
--     existante et n'en crée aucune (ces tables sont vides — 0 ligne
--     à ce jour, confirmé par l'audit RLS qui a motivé cette
--     migration).
--   - `drop policy if exists` avant chaque `create policy`, script
--     rejouable sans erreur si une policy existe déjà partiellement.
--   - Aucune table/colonne supprimée, aucun type modifié.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Défaut auto-rempli sur user_id — sans lui, les inserts
--       actuels du client (qui n'envoient jamais user_id) échouent
--       en NOT NULL même une fois les policies restaurées.
alter table public.favoris                 alter column user_id set default auth.uid();
alter table public.panier_items            alter column user_id set default auth.uid();
alter table public.reservations_experiences alter column user_id set default auth.uid();

-- ── 2. Favoris ───────────────────────────────────────────────
drop policy if exists favoris_select_own on public.favoris;
create policy favoris_select_own on public.favoris
  for select using (auth.uid() = user_id);
drop policy if exists favoris_insert_own on public.favoris;
create policy favoris_insert_own on public.favoris
  for insert with check (auth.uid() = user_id);
drop policy if exists favoris_delete_own on public.favoris;
create policy favoris_delete_own on public.favoris
  for delete using (auth.uid() = user_id);

-- ── 3. Panier ────────────────────────────────────────────────
drop policy if exists panier_select_own on public.panier_items;
create policy panier_select_own on public.panier_items
  for select using (auth.uid() = user_id);
drop policy if exists panier_insert_own on public.panier_items;
create policy panier_insert_own on public.panier_items
  for insert with check (auth.uid() = user_id);
drop policy if exists panier_update_own on public.panier_items;
create policy panier_update_own on public.panier_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists panier_delete_own on public.panier_items;
create policy panier_delete_own on public.panier_items
  for delete using (auth.uid() = user_id);

-- ── 4. Réservations & expériences ───────────────────────────
drop policy if exists reservations_select_own on public.reservations_experiences;
create policy reservations_select_own on public.reservations_experiences
  for select using (auth.uid() = user_id);
drop policy if exists reservations_insert_own on public.reservations_experiences;
create policy reservations_insert_own on public.reservations_experiences
  for insert with check (
    auth.uid() = user_id
    and statut = 'demande_recue'
  );
drop policy if exists reservations_select_staff on public.reservations_experiences;
create policy reservations_select_staff on public.reservations_experiences
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );
drop policy if exists reservations_update_staff on public.reservations_experiences;
create policy reservations_update_staff on public.reservations_experiences
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('fondatrice', 'assistante')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification suggérée après exécution — réutiliser la requête
-- d'audit déjà donnée : favoris (3), panier_items (4),
-- reservations_experiences (4) doivent tous passer à ✅ OK.
-- Test fonctionnel ensuite avec un compte test réel : ajouter un
-- favori, ajouter un article au panier, envoyer une réservation —
-- chacun doit réussir sans erreur 23502 (NOT NULL) ni 42501 (RLS).
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
