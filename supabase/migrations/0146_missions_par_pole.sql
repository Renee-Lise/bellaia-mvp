-- ═══════════════════════════════════════════════════════════
-- 0146 — Gestion des missions cloisonnée par pôle.
-- PRÉPARÉE, NON APPLIQUÉE. Application après sauvegarde complète restaurée (« COMPLET ») et accord explicite.
--
-- Avant : « missions.gerer » n'était vérifiée qu'avec la portée « * » (a_permission('missions.gerer')) :
-- la permission valait pour TOUTES les missions de Bellaïa, quel que soit le pôle.
-- Après : la permission est vérifiée pour le pôle de la mission (colonne `univers`, codes de business_units :
-- FOOD, VILDOR, BSH, EVENTS…). Une permission accordée avec la portée « * » continue de valoir pour tout
-- Bellaïa (a_permission accepte « * ») ; une permission accordée pour VILDOR ne vaut que pour les missions VILDOR.
-- La fondatrice garde tous les droits (a_permission). Aucune donnée n'est modifiée.
-- Les 5 contrôles concernés en production (relevés le 24/11) : politiques missions_equipe, fil_lecture,
-- fil_ecriture, Storage equipe_prive_lecture / equipe_prive_depot, fonction mission_ajouter_livrable.
-- 0137 (non appliquée) utilise déjà le pôle de la mission dans mission_transferer (corrigé le 24/11 pour
-- utiliser `univers`). Ordre : après 0137. Idempotente. Retour arrière : rollback/0146_missions_par_pole_rollback.sql.
-- ═══════════════════════════════════════════════════════════

/** La personne connectée peut-elle gérer cette mission ? (fondatrice, ou missions.gerer pour le pôle de la mission) */
create or replace function public.peut_gerer_mission(p_mission uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bellaia_missions m where m.id = p_mission
    and public.a_permission('missions.gerer', coalesce(m.univers, m.pole, 'GENERAL')))
$$;
revoke all on function public.peut_gerer_mission(uuid) from public, anon;
grant execute on function public.peut_gerer_mission(uuid) to authenticated;

alter policy missions_equipe on public.bellaia_missions
  using (public.a_permission('missions.gerer', coalesce(univers, pole, 'GENERAL')))
  with check (public.a_permission('missions.gerer', coalesce(univers, pole, 'GENERAL')));

drop policy if exists fil_lecture on public.bellaia_missions_fil;
create policy fil_lecture on public.bellaia_missions_fil for select to authenticated using (
  public.peut_gerer_mission(mission_id)
  or exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()));
drop policy if exists fil_ecriture on public.bellaia_missions_fil;
create policy fil_ecriture on public.bellaia_missions_fil for insert to authenticated with check (
  auteur = auth.uid() and (public.peut_gerer_mission(mission_id)
    or (type = any (array['commentaire','fichier','statut']) and exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()))));

create or replace function public.mission_ajouter_livrable(p_id uuid, p_chemin text, p_nom text, p_lien_canva text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bellaia_missions where id = p_id and (assigne_a = auth.uid() or public.peut_gerer_mission(p_id))) then raise exception 'Mission introuvable'; end if;
  if p_chemin is not null and p_chemin !~ ('^missions/' || p_id::text || '/') then raise exception 'Chemin de fichier invalide'; end if;
  update public.bellaia_missions set
    livrables = livrables || jsonb_build_array(jsonb_build_object('chemin', p_chemin, 'nom', left(p_nom, 200), 'le', now(), 'par', auth.uid())),
    lien_canva = coalesce(nullif(p_lien_canva, ''), lien_canva),
    statut = case when statut in ('a_faire','en_cours') then 'a_valider' else statut end, updated_at = now()
  where id = p_id;
  insert into public.bellaia_missions_fil (mission_id, type, texte, fichier_chemin) values (p_id, 'fichier', left(p_nom, 200), p_chemin);
end $$;

-- Fichiers privés des missions (bucket equipe-prive) : même cloisonnement.
do $$
begin
  if to_regclass('storage.objects') is not null and exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'equipe_prive_lecture') then
    execute $p$alter policy equipe_prive_lecture on storage.objects using ((bucket_id = 'equipe-prive') and (public.is_fondatrice()
      or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(objects.name))[2]
          and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer', coalesce(m.univers, m.pole, 'GENERAL')))))
      or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))))$p$;
  end if;
  if to_regclass('storage.objects') is not null and exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'equipe_prive_depot') then
    execute $p$alter policy equipe_prive_depot on storage.objects with check ((bucket_id = 'equipe-prive') and (public.is_fondatrice()
      or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(objects.name))[2]
          and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer', coalesce(m.univers, m.pole, 'GENERAL')))))
      or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))))$p$;
  end if;
end $$;
