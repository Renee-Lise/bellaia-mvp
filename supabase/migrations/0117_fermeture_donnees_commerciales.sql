-- ═══════════════════════════════════════════════════════════
-- 0117_fermeture_donnees_commerciales.sql
-- STATUT: PRÉPARÉ — à exécuter JUSTE APRÈS le déploiement du code
-- (le nouveau code lit v_catalogue_public et des colonnes explicites).
-- Objet (lot P0) :
--  1. stocks : plus aucune lecture publique de la table (prix d'achat
--     BSH / Odyssée) ; les boutiques lisent v_catalogue_public.
--  2. catalogue_produits / catalogue_variantes (Bella'Food) : la boutique
--     lit des vues publiques sans coût de revient ni marge ; la lecture
--     publique directe des tables est fermée (la fondatrice garde sa règle).
--  3. Commandes existantes créées par une cliente : total marqué « à
--     vérifier » (aucun paiement en ligne possible avant confirmation).
-- Non destructif : vues ajoutées, ALTER POLICY, mise à jour d'un
-- indicateur (avec condition). Aucune donnée supprimée.
-- Retour arrière : NE PAS rouvrir ces lectures ; en cas de problème,
-- suspendre la boutique concernée plutôt que d'exposer les prix.
-- ═══════════════════════════════════════════════════════════
alter policy stocks_lecture_publique_bsh_actif on public.stocks using (false);
alter policy stocks_lecture_publique_odyssee_actif on public.stocks using (false);

-- Vues publiques Bella'Food (champs autorisés uniquement : jamais
-- coût de revient, marge ni taux de marge), puis fin de la lecture
-- publique directe des tables. Même méthode que v_catalogue_public.
-- Conditions de visibilité recopiées des règles publiques existantes.
alter policy catalogue_produits_lecture_publique on public.catalogue_produits using (false);
alter policy catalogue_variantes_lecture_publique on public.catalogue_variantes using (false);

update public.bellaia_commandes c set total_verifie = false
where c.total_verifie and (c.created_by is null or not exists (select 1 from public.profiles p where p.id = c.created_by and p.role = 'fondatrice'));
