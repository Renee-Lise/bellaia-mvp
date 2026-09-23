-- ═══════════════════════════════════════════════════════════
-- 0007_stocks_images.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-23
-- Objet : ajoute la possibilité d'attacher une photo à un article de
--         `stocks` — colonne + bucket Storage + policies. Constaté :
--         aucune fonctionnalité image n'existe nulle part aujourd'hui
--         (ni colonne, ni bucket, ni upload, ni affichage), demandé
--         par Renée-Lise ("les images des produits ne s'affichent
--         pas côté Bellaïa").
-- Portée : `stocks` est partagée par tous les pôles (BSH, Events,
--   Odyssée, Food...), donc cette migration profite à tous, pas
--   seulement à BSH — cohérent avec la convention déjà suivie pour
--   les colonnes de la migration 0001 (génériques, pas préfixées
--   "bsh_").
-- Impact : additive uniquement.
--   - Une colonne nullable ajoutée à `stocks` — aucune ligne
--     existante modifiée.
--   - Un nouveau bucket Storage (`stocks-images`), public en lecture
--     (ce sont des photos marketing, pas des données sensibles —
--     contrairement à `messaging-attachments`, déjà existant et
--     privé, que cette migration ne touche pas).
--   - Écriture (upload/modification/suppression) réservée à
--     fondatrice/assistante via est_staff_bellaia() (même helper que
--     profiles et bsh_members_demandes — une seule source de vérité
--     pour "l'auteur de la requête est-il staff").
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Colonne image_url sur stocks
-- ───────────────────────────────────────────────────────────
alter table public.stocks
  add column if not exists image_url text;

comment on column public.stocks.image_url is
  'URL publique de la photo produit (bucket Storage stocks-images). NULL si aucune photo — l''affichage reste inchangé dans ce cas.';

-- ───────────────────────────────────────────────────────────
-- 2. Bucket Storage — public en lecture
-- ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('stocks-images', 'stocks-images', true)
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────
-- 3. Policies sur storage.objects, scopées à ce bucket uniquement
--    (storage.objects a déjà RLS activée par défaut sur tout projet
--    Supabase — pas besoin de l'activer ici).
-- ───────────────────────────────────────────────────────────

-- Lecture publique (photos affichées aux visiteuses non connectées).
create policy "stocks_images_lecture_publique" on storage.objects
  for select
  using (bucket_id = 'stocks-images');

-- Écriture réservée au staff.
create policy "stocks_images_ajout_staff" on storage.objects
  for insert
  with check (bucket_id = 'stocks-images' and public.est_staff_bellaia());

create policy "stocks_images_modif_staff" on storage.objects
  for update
  using (bucket_id = 'stocks-images' and public.est_staff_bellaia());

create policy "stocks_images_suppression_staff" on storage.objects
  for delete
  using (bucket_id = 'stocks-images' and public.est_staff_bellaia());

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
