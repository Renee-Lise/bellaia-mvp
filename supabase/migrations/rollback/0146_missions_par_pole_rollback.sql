-- Retour arrière de 0146 : rétablit le contrôle « missions.gerer » de portée globale (état relevé en production le 24/11).
alter policy missions_equipe on public.bellaia_missions using (public.a_permission('missions.gerer')) with check (public.a_permission('missions.gerer'));
drop policy if exists fil_lecture on public.bellaia_missions_fil;
create policy fil_lecture on public.bellaia_missions_fil for select to authenticated using (public.a_permission('missions.gerer') or exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()));
drop policy if exists fil_ecriture on public.bellaia_missions_fil;
create policy fil_ecriture on public.bellaia_missions_fil for insert to authenticated with check (auteur = auth.uid() and (public.a_permission('missions.gerer') or (type = any (array['commentaire','fichier','statut']) and exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()))));
create or replace function public.mission_ajouter_livrable(p_id uuid, p_chemin text, p_nom text, p_lien_canva text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bellaia_missions where id = p_id and (assigne_a = auth.uid() or public.a_permission('missions.gerer'))) then raise exception 'Mission introuvable'; end if;
  if p_chemin is not null and p_chemin !~ ('^missions/' || p_id::text || '/') then raise exception 'Chemin de fichier invalide'; end if;
  update public.bellaia_missions set livrables = livrables || jsonb_build_array(jsonb_build_object('chemin', p_chemin, 'nom', left(p_nom, 200), 'le', now(), 'par', auth.uid())),
    lien_canva = coalesce(nullif(p_lien_canva, ''), lien_canva), statut = case when statut in ('a_faire','en_cours') then 'a_valider' else statut end, updated_at = now() where id = p_id;
  insert into public.bellaia_missions_fil (mission_id, type, texte, fichier_chemin) values (p_id, 'fichier', left(p_nom, 200), p_chemin);
end $$;
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'equipe_prive_lecture') then
    execute $p$alter policy equipe_prive_lecture on storage.objects using ((bucket_id = 'equipe-prive') and (public.is_fondatrice() or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(objects.name))[2] and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer')))) or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))))$p$;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'equipe_prive_depot') then
    execute $p$alter policy equipe_prive_depot on storage.objects with check ((bucket_id = 'equipe-prive') and (public.is_fondatrice() or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(objects.name))[2] and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer')))) or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))))$p$;
  end if;
end $$;
drop function if exists public.peut_gerer_mission(uuid);
