-- ═══════════════════════════════════════════════════════════
-- 0050_food_catalogue_rls_et_lien_recette.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-29
-- Objet : Zone 2 (Catalogue & Menus) — préparation du branchement
--   réel de FoodCatalogue.tsx et ClientFood sur catalogue_produits /
--   catalogue_variantes, qui existaient déjà mais n'étaient utilisées
--   par aucun écran (vérifié : aucune occurrence dans le code avant
--   ce tour).
--
-- 1. Sécurité (même alerte que food_recettes) : catalogue_produits a
--    la même policy "catalogue_auth" trop permissive (FOR ALL,
--    n'importe quelle cliente connectée). Remplacée par deux
--    policies séparées :
--      - lecture publique (anon + authenticated), restreinte aux
--        lignes business_unit='FOOD', visible_client=true,
--        disponible=true, statut='actif' — nécessaire pour que
--        ClientFood (boutique côté client) affiche les produits sans
--        que la cliente soit connectée ni fondatrice.
--      - écriture réservée à la fondatrice (is_fondatrice()), comme
--        partout ailleurs.
--    Même protection par colonnes que la migration 0012 (stocks) :
--    cout_revient, marge, taux_marge, reference, metadata ne sont
--    JAMAIS accordées à anon/authenticated, même sur une ligne
--    publique — seules les colonnes utiles à l'affichage client le
--    sont.
--
-- 2. catalogue_variantes avait RLS activé mais AUCUNE policy (ni
--    lecture, ni écriture, pas même pour la fondatrice) — plus
--    restrictif que prévu, pas une faille mais un verrou total qui
--    aurait bloqué l'usage légitime. Ajout d'une policy fondatrice et
--    d'une policy de lecture publique miroir de celle de
--    catalogue_produits (via sous-requête sur le produit parent).
--
-- 3. catalogue_produits n'a actuellement aucune colonne pour relier
--    un produit à sa recette (food_recettes) — nécessaire pour la
--    zone Production prévue plus tard (section 7 de la mission :
--    "Relier les recettes validées aux commandes confirmées"), et
--    utile dès maintenant dans le formulaire catalogue. Seule
--    vraie addition de schéma de cette migration ; nullable, fk sur
--    une table existante.
--
-- Impact : policies remplacées sur 2 tables existantes (aucune
--   donnée supprimée, les deux tables sont vides), 1 colonne nullable
--   ajoutée. Rien d'autre touché.
-- ═══════════════════════════════════════════════════════════

alter table public.catalogue_produits
  add column if not exists recette_id uuid references public.food_recettes(id) on delete set null;

-- ── catalogue_produits ──────────────────────────────────────
-- drop systématique de toutes les policies qu'on va créer, pas
-- seulement l'ancienne "catalogue_auth" : une tentative précédente a
-- laissé catalogue_produits_fondatrice déjà en place, bloquant un
-- simple "create policy" — idempotent pour de bon cette fois.
drop policy if exists catalogue_auth on public.catalogue_produits;
drop policy if exists catalogue_produits_fondatrice on public.catalogue_produits;
drop policy if exists catalogue_produits_lecture_publique on public.catalogue_produits;

create policy catalogue_produits_fondatrice on public.catalogue_produits
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create policy catalogue_produits_lecture_publique on public.catalogue_produits
  for select to anon, authenticated
  using (
    business_unit = 'FOOD'
    and visible_client = true
    and disponible = true
    and statut = 'actif'
  );

grant select (
  id, business_unit, categorie_id, categorie_slug, sous_categorie,
  nom, description_courte, description_longue, galerie_photos, videos,
  prix, prix_promotion, tva, unite, duree_min, temps_preparation,
  visible_client, disponible, statut, tags, allergenes, ordre
) on public.catalogue_produits to anon, authenticated;

-- ── catalogue_variantes ─────────────────────────────────────
drop policy if exists catalogue_variantes_fondatrice on public.catalogue_variantes;
drop policy if exists catalogue_variantes_lecture_publique on public.catalogue_variantes;

create policy catalogue_variantes_fondatrice on public.catalogue_variantes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create policy catalogue_variantes_lecture_publique on public.catalogue_variantes
  for select to anon, authenticated
  using (
    disponible = true
    and exists (
      select 1 from public.catalogue_produits p
      where p.id = catalogue_variantes.produit_id
        and p.business_unit = 'FOOD'
        and p.visible_client = true
        and p.disponible = true
        and p.statut = 'actif'
    )
  );

grant select (id, produit_id, nom, prix, attributs, disponible)
  on public.catalogue_variantes to anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname='public' and tablename in ('catalogue_produits','catalogue_variantes')
--   order by tablename, policyname;
--   → attendu : catalogue_produits a 2 lignes
--     (catalogue_produits_fondatrice, catalogue_produits_lecture_publique) ;
--     catalogue_variantes a 2 lignes
--     (catalogue_variantes_fondatrice, catalogue_variantes_lecture_publique).
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='catalogue_produits' and column_name='recette_id';
--   → attendu : 1 ligne (recette_id).
--
--   Contrôle d'étanchéité (doit échouer, et c'est voulu) :
--   begin;
--   set local role anon;
--   select cout_revient from public.catalogue_produits limit 1;
--   rollback;
--   → attendu : erreur 42501 (permission denied for column cout_revient).
-- ═══════════════════════════════════════════════════════════
