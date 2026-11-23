-- Reproduction de l'état de PRODUCTION du 23/11/2026 pour les profils (failles comprises), sans donnée réelle.
drop table if exists public.profiles cascade;
create table if not exists auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, prenom text, nom text, telephone text,
  role text check (role = any (array['fondatrice','assistante','prestataire','cliente','client','hote','partenaire'])),
  statut text, age_verifi boolean default false, created_at timestamptz default now(), updated_at timestamptz default now(),
  date_naissance date, membership_status text default 'customer' check (membership_status = any (array['customer','member_pending','member','founding_member','vip'])));
create or replace function public.is_fondatrice() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice') $$;
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and (expire_le is null or expire_le > now()))) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom, telephone, role, statut, age_verifi, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'prenom', ''), COALESCE(NEW.raw_user_meta_data->>'nom', ''),
          COALESCE(NEW.raw_user_meta_data->>'telephone', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'cliente'), 'actif', false, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.profiles_verrou_champs_sensibles() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.est_staff_bellaia() then
    new.role := old.role; new.statut := old.statut; new.age_verifi := old.age_verifi;
    if new.membership_status is distinct from old.membership_status then
      if coalesce(old.membership_status, 'customer') = 'customer' and new.membership_status = 'member_pending' then null;
      else new.membership_status := old.membership_status; end if;
    end if;
  end if;
  return new;
end; $$;
create trigger verrouiller_champs_sensibles_profiles before update on public.profiles for each row execute function public.profiles_verrou_champs_sensibles();
alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to anon, authenticated;
create policy creer_son_profil on public.profiles for insert to public with check (auth.uid() = id);
create policy lire_son_profil on public.profiles for select to public using (auth.uid() = id);
create policy modifier_son_profil on public.profiles for update to public using (auth.uid() = id);
create policy profiles_self_membership on public.profiles for update to public using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_all on public.profiles for all to public using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
