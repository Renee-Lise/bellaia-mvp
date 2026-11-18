-- ═══════════════════════════════════════════════════════════
-- 0119_p0_fermetures_complementaires.sql
-- STATUT: APPLIQUÉ le 18/11 (vérification finale P0, 5 profils)
-- Fuites découvertes lors du contrôle exhaustif (toutes tables et vues,
-- visiteur / cliente / assistante / partenaire / fondatrice) :
--  1. v_catalogue_public.notes exposait le fournisseur (« Import Concorde
--     Pro — Réf … ») et des remarques internes (« Prix d'achat non
--     connu ») sur les 355 produits BSH / Odyssée, affichées en boutique.
--     → la colonne est conservée mais vidée quand le texte est interne
--       (la table stocks n'est pas modifiée).
--  2. ia_prompts (prompt système de l'assistante, nominatif) lisible par
--     tous → réservé à l'équipe (les routes serveur utilisent la clé
--     serveur).
--  3. Listing public des fichiers des compartiments events-medias (726
--     fichiers : gabarits de papeterie, photos) et stocks-images →
--     réservé à l'équipe. Les liens publics des images restent valides
--     (compartiments publics) ; aucun écran ne liste ces dossiers.
-- ALTER POLICY / CREATE OR REPLACE VIEW uniquement. Aucune suppression.
-- ═══════════════════════════════════════════════════════════
create or replace view public.v_catalogue_public as
 SELECT id, nom, nom_produit, categorie, univers, statut, image_url, tailles, composition, usage_conseils, entretien,
    case when notes is null or notes ~* '(import|concorde|r[ée]f\.?\s*[0-9]|prix d.achat|achat|fournisseur|sumup|caisse|[àa] compl[ée]ter|[àa] valider|marge|co[uû]t|interne)' then null::text else notes end as notes,
    prix_vente, quantite, quantite_min, created_at
   FROM stocks
  WHERE (univers = ANY (ARRAY['BSH'::text, 'ODYSSEE'::text])) AND statut = 'actif'::text;

alter policy ia_prompts_select on public.ia_prompts using (public.est_staff_bellaia());

alter policy events_medias_lecture_publique on storage.objects using ((bucket_id = 'events-medias'::text) and public.est_staff_bellaia());
alter policy stocks_images_lecture_publique on storage.objects using ((bucket_id = 'stocks-images'::text) and public.est_staff_bellaia());

-- Constats sans fuite (laissés en l'état) :
--  • vues de tableau de bord : 1 ligne de zéros pour un visiteur ;
--  • events_demandes : une cliente ne voit que ses dossiers (e-mail / téléphone) ;
--  • structure_modeles / events_catalogue / jeux BSH : contenus publiés volontairement ;
--  • prochaine_reference : numéros de commande / dossier (pas de factures,
--    numérotées par bellaia_numeroter_piece, réservée à la fondatrice) ;
--  • anciennes tables conversations / messages / conversation_membres :
--    règle en récursion infinie → inaccessibles à tous, non utilisées par
--    l'application (messagerie actuelle : bellaia_messages). À corriger ou
--    archiver (ne fuit rien).
