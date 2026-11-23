-- ═══════════════════════════════════════════════════════════════════════════
-- 0134 — Profils : élévation de privilèges impossible (PRÉPARÉE, NON APPLIQUÉE — lot A1)
-- À appliquer uniquement après accord écrit de la fondatrice, sauvegarde vérifiée et tests.
--
-- Failles corrigées (relevées en production le 23/11/2026, non exploitées à cette date) :
--  F1 CRITIQUE : à l'inscription, handle_new_user() reprenait le rôle fourni par la personne qui
--     s'inscrit (raw_user_meta_data->>'role') → n'importe qui pouvait créer un compte « fondatrice ».
--  F2 : la règle creer_son_profil permettait d'insérer son propre profil avec n'importe quel rôle
--     (le verrou ne portait que sur les mises à jour).
--  F3 : un titulaire de la permission « acces_complet » pouvait modifier le rôle de n'importe qui,
--     y compris le sien (jusqu'à « fondatrice »), et supprimer des profils.
-- Principe : seule la fondatrice attribue ou retire un rôle ; personne ne modifie ses propres
-- privilèges ; le rôle « fondatrice » ne s'attribue que par l'administration de la base (hors application).
-- Idempotente. Retour arrière : rollback/0134_profils_privileges_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- F1 — l'inscription crée toujours un profil « cliente » (le rôle demandé n'est jamais repris)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, prenom, nom, telephone, role, statut, age_verifi, created_at, updated_at)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'prenom', ''),
          coalesce(new.raw_user_meta_data->>'nom', ''),
          coalesce(new.raw_user_meta_data->>'telephone', ''),
          'cliente', 'actif', false, now(), now())
  on conflict (id) do nothing;
  return new;
end $$;

-- F2 + F3 — verrou des champs sensibles à l'insertion ET à la mise à jour
create or replace function public.profiles_verrou_champs_sensibles() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  admin_base boolean := auth.uid() is null;          -- administration directe de la base (hors API)
  fondatrice boolean := public.is_fondatrice();
begin
  if admin_base then return new; end if;
  if tg_op = 'INSERT' then
    if not fondatrice then
      new.role := 'cliente'; new.statut := 'actif'; new.age_verifi := false;
      if coalesce(new.membership_status, 'customer') not in ('customer', 'member_pending') then new.membership_status := 'customer'; end if;
    elsif new.role = 'fondatrice' then
      raise exception 'Le rôle « fondatrice » ne peut pas être attribué depuis l''application.';
    end if;
    return new;
  end if;
  -- UPDATE
  if new.id is distinct from old.id then raise exception 'Identifiant de profil non modifiable.'; end if;
  if not fondatrice then
    if not public.est_staff_bellaia() or new.id = auth.uid() then
      -- personne ne modifie ses propres privilèges ; les non-staff ne touchent à aucun champ sensible
      new.role := old.role; new.statut := old.statut; new.age_verifi := old.age_verifi;
      if new.membership_status is distinct from old.membership_status
         and not (coalesce(old.membership_status, 'customer') = 'customer' and new.membership_status = 'member_pending') then
        new.membership_status := old.membership_status;
      end if;
    elsif new.role is distinct from old.role then
      raise exception 'Seule la fondatrice peut attribuer ou retirer un rôle.';
    end if;
  end if;
  if new.role = 'fondatrice' and old.role is distinct from 'fondatrice' then
    raise exception 'Le rôle « fondatrice » ne peut pas être attribué depuis l''application.';
  end if;
  return new;
end $$;
drop trigger if exists verrouiller_champs_sensibles_profiles on public.profiles;
create trigger verrouiller_champs_sensibles_profiles before insert or update on public.profiles
  for each row execute function public.profiles_verrou_champs_sensibles();

-- Règles d'accès : le personnel habilité lit et met à jour (sous le verrou ci-dessus) ; seule la fondatrice
-- crée pour autrui ou supprime ; chacun crée uniquement son propre profil (forcé « cliente »).
drop policy if exists profiles_staff_all on public.profiles;
drop policy if exists profiles_staff_lecture on public.profiles;
drop policy if exists profiles_staff_maj on public.profiles;
drop policy if exists profiles_fondatrice_tout on public.profiles;
create policy profiles_staff_lecture on public.profiles for select to authenticated using (public.est_staff_bellaia());
create policy profiles_staff_maj on public.profiles for update to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
create policy profiles_fondatrice_tout on public.profiles for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
