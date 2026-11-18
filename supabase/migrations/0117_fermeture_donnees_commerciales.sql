-- ═══════════════════════════════════════════════════════════
-- 0117_fermeture_donnees_commerciales.sql
-- STATUT: PRÉPARÉ — à exécuter JUSTE APRÈS le déploiement du code
-- (le nouveau code lit v_catalogue_public et des colonnes explicites).
-- Objet (lot P0) :
--  1. stocks : plus aucune lecture publique de la table (prix d'achat
--     BSH / Odyssée) ; les boutiques lisent v_catalogue_public.
--  2. catalogue_produits / catalogue_variantes (Bella'Food) : coût de
--     revient, marge et taux de marge retirés aux visiteurs ; la
--     lecture publique est réservée au rôle anonyme (la boutique publique
--     l'utilise), la fondatrice garde sa propre règle.
--  3. Commandes existantes créées par une cliente : total marqué « à
--     vérifier » (aucun paiement en ligne possible avant confirmation).
-- Non destructif : ALTER POLICY, retrait de droits de lecture sur des
-- colonnes, mise à jour d'un indicateur. Aucune donnée supprimée.
-- Retour arrière : NE PAS rouvrir ces lectures ; en cas de problème,
-- suspendre la boutique concernée plutôt que d'exposer les prix.
-- ═══════════════════════════════════════════════════════════
alter policy stocks_lecture_publique_bsh_actif on public.stocks using (false);
alter policy stocks_lecture_publique_odyssee_actif on public.stocks using (false);

alter policy catalogue_produits_lecture_publique on public.catalogue_produits to anon;
alter policy catalogue_variantes_lecture_publique on public.catalogue_variantes to anon;
-- Un retrait par colonne est sans effet si la table entière est
-- accordée : on retire la lecture de la table, puis on accorde
-- toutes les colonnes SAUF les colonnes confidentielles.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema = 'public' and table_name = 'catalogue_produits' and column_name not in ('cout_revient', 'marge', 'taux_marge');
  execute 'revoke select on public.catalogue_produits from anon';
  execute format('grant select (%s) on public.catalogue_produits to anon', cols);
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema = 'public' and table_name = 'catalogue_variantes' and column_name not in ('cout');
  execute 'revoke select on public.catalogue_variantes from anon';
  execute format('grant select (%s) on public.catalogue_variantes to anon', cols);
end $$;

update public.bellaia_commandes c set total_verifie = false
where c.total_verifie and (c.created_by is null or not exists (select 1 from public.profiles p where p.id = c.created_by and p.role = 'fondatrice'));
