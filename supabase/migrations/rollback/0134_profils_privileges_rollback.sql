-- Retour arrière de 0134 : rétablit EXACTEMENT l'état relevé en production le 23/11/2026 (défauts compris).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom, telephone, role, statut, age_verifi, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'prenom', ''), COALESCE(NEW.raw_user_meta_data->>'nom', ''),
          COALESCE(NEW.raw_user_meta_data->>'telephone', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'cliente'),
          'actif', false, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
create or replace function public.profiles_verrou_champs_sensibles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_staff_bellaia() then
    new.role       := old.role;
    new.statut     := old.statut;
    new.age_verifi := old.age_verifi;
    if new.membership_status is distinct from old.membership_status then
      if coalesce(old.membership_status, 'customer') = 'customer' and new.membership_status = 'member_pending' then
        null;
      else
        new.membership_status := old.membership_status;
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists verrouiller_champs_sensibles_profiles on public.profiles;
create trigger verrouiller_champs_sensibles_profiles before update on public.profiles
  for each row execute function public.profiles_verrou_champs_sensibles();
drop policy if exists profiles_staff_lecture on public.profiles;
drop policy if exists profiles_staff_maj on public.profiles;
drop policy if exists profiles_fondatrice_tout on public.profiles;
drop policy if exists profiles_staff_all on public.profiles;
create policy profiles_staff_all on public.profiles for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
