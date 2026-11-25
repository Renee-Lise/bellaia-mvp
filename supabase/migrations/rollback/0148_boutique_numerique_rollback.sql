-- Retour arrière de 0148. Les droits, téléchargements, factures et paiements déjà créés sont CONSERVÉS
-- (pièces comptables) ; seules les fonctions, règles et index sont retirés. Les colonnes du catalogue restent.
drop function if exists public.boutique_accorder_droits(uuid, text);
drop function if exists public.boutique_retirer_droits(uuid, text, text);
drop function if exists public.boutique_noter_telechargement(uuid);
drop function if exists public.boutique_obtenir_gratuit(uuid);
drop policy if exists boutique_apercus_lecture on storage.objects;
drop policy if exists boutique_fondatrice_fichiers on storage.objects;
drop index if exists public.stripe_history_evenement_unique;
alter table public.catalogue_produits drop constraint if exists catalogue_type_produit_valide;
alter table public.catalogue_produits drop constraint if exists catalogue_public_age_valide;
-- Tables boutique_droits / boutique_telechargements conservées (verrouillées : RLS active, lecture par l'acheteur seulement).
