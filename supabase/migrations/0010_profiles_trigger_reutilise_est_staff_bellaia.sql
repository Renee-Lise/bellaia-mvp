-- ═══════════════════════════════════════════════════════════
-- 0010_profiles_trigger_reutilise_est_staff_bellaia.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-09-28
-- Auteur : Claude Code · Date de rédaction : 2026-09-28
-- Objet : même famille de trou que 0001/0006 — la partie "3." de la
--         migration 0005 (VALIDÉE le 2026-09-23), qui remplace la
--         fonction profiles_verrou_champs_sensibles() pour qu'elle
--         appelle est_staff_bellaia() au lieu de dupliquer la
--         vérification de rôle inline, n'a jamais été exécutée.
-- Constat (audit étendu demandé par Renée-Lise, 2026-09-28) :
--   select pg_get_functiondef(oid) from pg_proc
--   where proname = 'profiles_verrou_champs_sensibles'
--   ne contient PAS 'est_staff_bellaia' → la fonction en base est
--   toujours l'ancienne version (0003/0004, vérification de rôle
--   dupliquée inline). Pas une faille de sécurité en soi — la
--   vérification inline fait le même contrôle (role in ('fondatrice',
--   'assistante')) et continue de protéger les colonnes sensibles —
--   mais ça viole l'intention de la 0005 ("une seule source de
--   vérité"), et confirme que 0005 a, elle aussi, tourné partiellement
--   (son "1." et son "2." ont bien pris : est_staff_bellaia() et
--   profiles_staff_all existent, confirmés par le même audit).
-- Impact : additive/corrective uniquement. `create or replace` de la
--   même fonction, déjà référencée par le trigger existant (aucun
--   DROP/CREATE TRIGGER nécessaire). Comportement inchangé pour toute
--   requête actuelle : les deux versions bloquent exactement les
--   mêmes colonnes pour les mêmes auteurs de requête.
-- ═══════════════════════════════════════════════════════════

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

comment on function public.profiles_verrou_champs_sensibles is
  'Empêche une cliente de modifier role/statut/membership_status/age_verifi sur sa propre ligne, et limite membership_status à la seule transition customer→member_pending (demande d''adhésion). Utilise est_staff_bellaia() — une seule source de vérité, partagée avec profiles_staff_all. Voir cahier des charges BSH Members §10.2.';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select pg_get_functiondef(oid) ilike '%est_staff_bellaia%' as ok
--   from pg_proc where proname = 'profiles_verrou_champs_sensibles' limit 1;
--   → attendu : ok = true.
--   CONFIRMÉ le 2026-09-28 : résultat exécuté par Renée-Lise conforme
--   (ok = true) — statut passé à VALIDÉ sur cette base.
--
--   Test fonctionnel (compte cliente de test, pas un compte réel) :
--   1. PATCH profiles set membership_status='member_pending' sur sa
--      propre ligne, en partant de 'customer' → doit toujours réussir.
--   2. PATCH profiles set role='fondatrice' sur sa propre ligne →
--      toujours silencieusement ignoré.
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
