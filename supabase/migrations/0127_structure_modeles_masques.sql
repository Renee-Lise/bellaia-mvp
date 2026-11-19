-- 0127 : Bella'Structure — 3 modèles publiés sans fichier masqués du catalogue
-- client (décision fondatrice du 19/11). Rien n'est supprimé.
update public.structure_modeles set visible_client = false, updated_at = now()
 where visible_client and nom in ('Flyer événementiel A4', 'Checklist anniversaire', 'Checklist baptême') and fichier_url is null;
