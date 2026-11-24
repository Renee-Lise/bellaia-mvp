-- ═══════════════════════════════════════════════════════════
-- 0143_food_offre_du_jour.sql — STATUT : PRÉPARÉE, NON APPLIQUÉE (24/11/2026)
-- Objet : lot 5 « catalogue client dynamique ». Côté base, un produit Bella'Food qui n'est pas coché
--   dans l'offre PUBLIÉE du jour (food_menu_jour, heure de Guyane) n'est plus lisible par les vues
--   publiques. La fondatrice garde la vue complète. Les tables restent fermées au public (règle false).
-- Dépend de : 0060 (food_menu_jour), vues v_catalogue_food_public / v_variantes_food_public existantes,
--   is_fondatrice(), food_produit_commandable().
-- Impact : aucune donnée modifiée ; deux vues redéfinies (mêmes colonnes) ; une fonction ajoutée.
-- Effet immédiat : TANT QU'AUCUNE OFFRE N'EST PUBLIÉE, LE CATALOGUE CLIENT EST VIDE (voulu).
--   La route de commande applique déjà la même règle côté serveur (code de l'application).
-- Retour arrière : supabase/migrations/rollback/0143_food_offre_du_jour_rollback.sql
-- ═══════════════════════════════════════════════════════════
create or replace function public.food_offre_produits_du_jour()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct (e->>'produit_id')::uuid
  from public.food_menu_jour m,
       jsonb_array_elements(case when jsonb_typeof(m.items) = 'array' then m.items else '[]'::jsonb end) e
  where m.statut = 'publie'
    and m.date = (now() at time zone 'America/Cayenne')::date
    and e->>'type' = 'plat'
    and (e->>'produit_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;
revoke all on function public.food_offre_produits_du_jour() from public;
grant execute on function public.food_offre_produits_du_jour() to anon, authenticated;

create or replace view public.v_catalogue_food_public as
 SELECT id, nom, categorie_slug, sous_categorie, description_courte, prix, prix_promotion, tags, galerie_photos, allergenes, ordre, business_unit,
    food_produit_commandable(id, allergenes, recette_id) AS commandable,
    CASE WHEN food_produit_commandable(id, allergenes, recette_id) THEN NULL::text ELSE 'Fiche produit en cours de finalisation'::text END AS mention
   FROM catalogue_produits p
  WHERE business_unit = 'FOOD'::text AND visible_client AND disponible AND statut = 'actif'::text
    AND (public.is_fondatrice() OR p.id IN (SELECT public.food_offre_produits_du_jour()));

create or replace view public.v_variantes_food_public as
 SELECT v.id, v.produit_id, v.nom, v.prix, v.disponible
   FROM catalogue_variantes v JOIN catalogue_produits p ON p.id = v.produit_id
  WHERE v.disponible AND p.business_unit = 'FOOD'::text AND p.visible_client AND p.disponible AND p.statut = 'actif'::text
    AND (public.is_fondatrice() OR p.id IN (SELECT public.food_offre_produits_du_jour()));

grant select on public.v_catalogue_food_public, public.v_variantes_food_public to anon, authenticated;
-- Vérification : select count(*) from v_catalogue_food_public; (anonyme : uniquement les produits de l'offre publiée du jour)
