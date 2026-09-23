-- ═══════════════════════════════════════════════════════════
-- 0005_profiles_staff_access_bsh_members.sql
-- STATUT: VALIDÉ — exécuté le 2026-09-23
-- Auteur : Claude Code · Date de rédaction : 2026-09-23
-- Objet : donne à fondatrice/assistante un accès complet aux profils
--         des AUTRES clientes — confirmé manquant par Renée-Lise
--         (l'écran admin BSH Members a toujours été vide, même avec
--         de vraies demandes en base). Sans cette policy,
--         BSHMembersAdmin ne peut ni lister les demandes/membres, ni
--         les faire évoluer, quelle que soit la qualité du code
--         React au-dessus.
-- Contexte : cahier des charges BSH Members, section 5 (écran admin)
--   et section 10.2 ("Toute validation, promotion, révocation ou
--   changement de statut est réservée au rôle administrateur/
--   fondatrice"). Les 4 policies existantes sur profiles
--   (creer_son_profil, lire_son_profil, modifier_son_profil,
--   profiles_self_membership) ne portent que sur la ligne du
--   propriétaire — aucune n'ouvre l'accès aux AUTRES lignes pour le
--   staff.
-- Impact : additive uniquement.
--   - Une fonction helper (est_staff_bellaia) et une policy FOR ALL
--     ajoutées. Aucune policy existante modifiée ou supprimée.
--   - La fonction verrou_champs_sensibles (trigger de la migration
--     0003/0004) est mise à jour pour réutiliser ce même helper au
--     lieu de dupliquer la vérification — comportement inchangé,
--     juste une seule source de vérité pour "est-ce que l'auteur de
--     la requête est staff".
--   - Aucune donnée existante modifiée.
-- Sécurité : la fonction est SECURITY DEFINER pour ne pas dépendre
--   d'une policy SELECT sur profiles au moment où elle s'exécute
--   (évite tout risque de dépendance circulaire si les policies de
--   lecture changent plus tard) — mais son propre contenu est fixe et
--   restreint (une seule lecture, aucune écriture, aucun paramètre
--   utilisateur), donc SECURITY DEFINER n'élargit rien.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Fonction helper partagée : l'auteur de la requête est-il
--    fondatrice/assistante ?
-- ───────────────────────────────────────────────────────────
create or replace function public.est_staff_bellaia()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('fondatrice', 'assistante')
  );
$$;

comment on function public.est_staff_bellaia is
  'Vrai si l''auteur de la requête (auth.uid()) est fondatrice ou assistante. Utilisé par la policy profiles_staff_all et par le trigger verrouiller_champs_sensibles_profiles — une seule source de vérité.';

-- ───────────────────────────────────────────────────────────
-- 2. Policy staff-wide sur profiles (lecture + écriture de
--    n'importe quelle ligne, pour fondatrice/assistante)
-- ───────────────────────────────────────────────────────────
create policy profiles_staff_all on public.profiles
  for all
  using (public.est_staff_bellaia())
  with check (public.est_staff_bellaia());

-- ───────────────────────────────────────────────────────────
-- 3. Le trigger existant réutilise le même helper (au lieu de
--    dupliquer la vérification) — comportement inchangé.
-- ───────────────────────────────────────────────────────────
create or replace function public.profiles_verrou_champs_sensibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_staff_bellaia() then
    new.role       := old.role;
    new.statut     := old.statut;
    new.age_verifi := old.age_verifi;

    if new.membership_status is distinct from old.membership_status then
      if coalesce(old.membership_status, 'customer') = 'customer'
         and new.membership_status = 'member_pending' then
        null;
      else
        new.membership_status := old.membership_status;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation,
-- et seulement après (ou en même temps que) la migration 0004.
--
-- Vérification suggérée après exécution : l'écran BSH Members Admin
-- (cockpit fondatrice) doit maintenant afficher les vraies demandes
-- en attente et les vrais membres.
-- ═══════════════════════════════════════════════════════════
