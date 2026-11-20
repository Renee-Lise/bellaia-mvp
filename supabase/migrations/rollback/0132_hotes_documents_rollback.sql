-- Retour arrière de 0132 : retire la règle de dépôt des hôtes et la fonction.
-- Les fichiers déjà déposés et les statuts enregistrés sont conservés.
drop policy if exists hotes_documents_depot on storage.objects;
drop function if exists public.bsh_hote_document_depose(uuid, text);
