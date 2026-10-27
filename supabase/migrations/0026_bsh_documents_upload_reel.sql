-- ═══════════════════════════════════════════════════════════
-- 0026_bsh_documents_upload_reel.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : connecte enfin l'upload de fichier du Centre Documents
--   (DocumentCenter.tsx) à un vrai stockage. Jusqu'ici le bouton
--   "Choisir un fichier" lisait le fichier en mémoire (FileReader)
--   mais ne l'envoyait jamais nulle part — la note de code le
--   disait explicitement ("pas encore disponible"). La colonne
--   `storage_path` existe déjà sur bellaia_documents (vérifiée en
--   base, migration 0017) mais n'était utilisée par aucun code.
--
-- Choix : bucket PRIVÉ (pas public comme stocks-images), parce que
--   bellaia_documents contient des documents fondatrice sensibles
--   (factures, CGV internes...) à côté de ressources hôtesses — même
--   logique de prudence que la restriction docs_auth déjà faite sur
--   bellaia_documents (migration 0017, à la demande explicite de
--   Renée-Lise : "Resserrer à fondatrice/assistante uniquement").
--   Rendre le bucket public aurait permis à quiconque connaissant
--   une URL de fichier de la lire sans passer par la RLS de la
--   table — on ne refait pas cette erreur ici. Précédent déjà dans
--   le projet : le bucket `messaging-attachments` est lui aussi
--   privé (contrairement à stocks-images, volontairement public
--   car ce sont des photos produit marketing).
--
-- Accès en lecture scindé par dossier (convention appliquée côté
--   code, DocumentCenter.tsx::uploaderFichier) :
--   - "fondatrice/..." : staff uniquement.
--   - "hotesses/..."   : staff + hôtesses BSH actives (répond à la
--     demande "pour les 4 documents dans la session hôtes, ils
--     doivent pouvoir les ouvrir sans avoir à les demander à la
--     fondatrice").
--   Le code demande une URL signée à la volée (5 min) au moment du
--   téléchargement plutôt que de stocker une URL permanente —
--   cohérent avec un bucket privé.
--
-- Impact : entièrement additif (nouveau bucket + 5 policies sur
--   storage.objects, scopées à ce bucket). Aucune colonne, aucune
--   ligne existante touchée.
-- ═══════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('bsh-documents', 'bsh-documents', false)
on conflict (id) do nothing;

-- Staff : accès complet (lecture + écriture), même garde que la
-- table bellaia_documents elle-même (bellaia_documents_staff, 0017).
create policy "bsh_documents_staff_lecture" on storage.objects
  for select
  using (bucket_id = 'bsh-documents' and public.est_staff_bellaia());

create policy "bsh_documents_staff_ajout" on storage.objects
  for insert
  with check (bucket_id = 'bsh-documents' and public.est_staff_bellaia());

create policy "bsh_documents_staff_modif" on storage.objects
  for update
  using (bucket_id = 'bsh-documents' and public.est_staff_bellaia());

create policy "bsh_documents_staff_suppression" on storage.objects
  for delete
  using (bucket_id = 'bsh-documents' and public.est_staff_bellaia());

-- Hôtesses BSH actives : lecture seule, uniquement sous le dossier
-- "hotesses/" (convention appliquée côté code à l'upload).
create policy "bsh_documents_hotesses_lecture" on storage.objects
  for select
  using (
    bucket_id = 'bsh-documents'
    and (storage.foldername(name))[1] = 'hotesses'
    and public.est_hote_bsh()
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from pg_policies
--   where schemaname='storage' and tablename='objects'
--     and policyname like 'bsh_documents_%';
--   → attendu : 5.
--
--   select public from storage.buckets where id='bsh-documents';
--   → attendu : false.
-- ═══════════════════════════════════════════════════════════
