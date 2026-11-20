-- ═══════════════════════════════════════════════════════════
-- 0132_hotes_documents.sql
-- STATUT : PRÉPARÉE — NON APPLIQUÉE (accord de la fondatrice requis)
-- Objet : transmission sécurisée des documents des hôtes BSH
--   (pièce d'identité, statut, contrat signé…).
--   • Un hôte actif peut DÉPOSER un fichier, uniquement dans son dossier
--     privé et uniquement pour un document qui lui est demandé
--     (statut « à fournir » ou « à signer ») ;
--   • il ne peut ni relire, ni remplacer, ni supprimer un fichier
--     (minimisation : seule la fondatrice consulte, via lien temporaire) ;
--   • la fonction bsh_hote_document_depose enregistre le chemin et passe
--     le document en « reçu » ; la validation reste à la fondatrice.
-- Additive : une règle de stockage + une fonction. Aucune donnée modifiée.
-- Retour arrière : rollback/0132_hotes_documents_rollback.sql
-- Rappel RGPD : une pièce d'identité ne doit être conservée que le temps
--   du contrôle de majorité (voir docs/rgpd) ; la suppression après
--   contrôle reste une action manuelle de la fondatrice.
-- ═══════════════════════════════════════════════════════════

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'hotes_documents_depot') then
    create policy hotes_documents_depot on storage.objects for insert to authenticated
      with check (
        bucket_id = 'equipe-prive'
        and (storage.foldername(name))[1] = 'hotes'
        and public.bsh_mon_hote() is not null
        and (storage.foldername(name))[2] = public.bsh_mon_hote()::text
        and exists (
          select 1 from public.bsh_hotes_documents d
          where d.id::text = (storage.foldername(name))[3]
            and d.hote_id = public.bsh_mon_hote()
            and d.visible_hote
            and d.statut in ('a_fournir', 'a_signer')
        )
      );
  end if;
end $$;

create or replace function public.bsh_hote_document_depose(p_doc uuid, p_chemin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hote uuid := public.bsh_mon_hote(); v_doc record;
begin
  if v_hote is null then raise exception 'Réservé aux hôtes actifs.'; end if;
  select * into v_doc from public.bsh_hotes_documents where id = p_doc;
  if v_doc is null or v_doc.hote_id <> v_hote or not v_doc.visible_hote then raise exception 'Document introuvable.'; end if;
  if v_doc.statut not in ('a_fournir', 'a_signer') then raise exception 'Ce document n''est plus attendu.'; end if;
  if p_chemin is null or p_chemin not like ('hotes/' || v_hote::text || '/' || p_doc::text || '/%') or p_chemin like '%..%' then
    raise exception 'Chemin de dépôt invalide.';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'equipe-prive' and o.name = p_chemin) then
    raise exception 'Fichier non reçu.';
  end if;
  update public.bsh_hotes_documents set storage_path = p_chemin, statut = 'recu' where id = p_doc;
  return jsonb_build_object('ok', true, 'statut', 'recu');
end $$;

revoke all on function public.bsh_hote_document_depose(uuid, text) from public, anon;
grant execute on function public.bsh_hote_document_depose(uuid, text) to authenticated;
