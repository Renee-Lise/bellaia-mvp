-- ═══════════════════════════════════════════════════════════
-- 0003_profiles_verrou_champs_sensibles.sql
-- STATUT: VALIDÉ — exécuté le 2026-09-23
-- Auteur : Claude Code · Date de rédaction : 2026-09-23
-- Objet : corrige une faille de contrôle d'accès sur `profiles` —
--         n'importe quelle cliente authentifiée peut aujourd'hui
--         s'auto-attribuer role/statut/membership_status/age_verifi
--         via une requête PATCH directe sur sa propre ligne.
-- Contexte (vérifié avec Renée-Lise le 2026-09-22/23) :
--   `select * from pg_policies where tablename = 'profiles'` montre
--   deux policies UPDATE (modifier_son_profil, profiles_self_membership)
--   dont la condition ne porte que sur la LIGNE (auth.uid() = id),
--   jamais sur les COLONNES. Quand une policy UPDATE n'a pas de
--   WITH CHECK explicite, Postgres réutilise USING — donc la seule
--   règle vérifiée est "cette ligne m'appartient avant et après",
--   ce qui n'empêche en rien de modifier role/statut/membership_status
--   sur sa propre ligne. Aucun trigger n'existait sur `profiles`
--   avant cette migration (vérifié via pg_trigger).
-- Impact : additive uniquement — aucune policy existante modifiée ou
--   supprimée, aucune colonne touchée, aucune donnée existante
--   modifiée. Ajoute une fonction + un trigger BEFORE UPDATE qui
--   verrouille silencieusement les colonnes sensibles pour tout
--   auteur de la requête qui n'est pas fondatrice/assistante — quelle
--   que soit la ligne modifiée (sa propre ligne ou, pour le staff,
--   celle d'une autre cliente).
-- Portée : corrige la faille indépendamment de la question séparée
--   (à vérifier empiriquement avec Renée-Lise) de savoir si une
--   policy donne bien à fondatrice/assistante un accès en lecture/
--   écriture aux profils des AUTRES clientes — le trigger se base sur
--   le rôle de l'auteur de la requête (auth.uid()), pas sur une
--   policy RLS, donc il fonctionne quel que soit l'état de ce point.
-- ═══════════════════════════════════════════════════════════

create or replace function public.profiles_verrou_champs_sensibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  est_staff boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('fondatrice', 'assistante')
  ) into est_staff;

  if not est_staff then
    new.role              := old.role;
    new.statut            := old.statut;
    new.membership_status := old.membership_status;
    new.age_verifi        := old.age_verifi;
  end if;

  return new;
end;
$$;

comment on function public.profiles_verrou_champs_sensibles is
  'Empêche une cliente de modifier role/statut/membership_status/age_verifi sur sa propre ligne via une requête PATCH directe — seule fondatrice/assistante peut faire évoluer ces champs, sur n''importe quelle ligne.';

drop trigger if exists verrouiller_champs_sensibles_profiles on public.profiles;

create trigger verrouiller_champs_sensibles_profiles
  before update on public.profiles
  for each row
  execute function public.profiles_verrou_champs_sensibles();

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
