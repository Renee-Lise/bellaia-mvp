-- ═══════════════════════════════════════════════════════════
-- 0004_profiles_verrou_autorise_demande_adhesion.sql
-- STATUT: ABSORBÉE PAR LA 0005 — jamais exécutée séparément
-- La migration 0005 (validée le 2026-09-23) remplace cette même
-- fonction par une version équivalente qui appelle est_staff_bellaia()
-- au lieu de dupliquer le contrôle de rôle inline — la logique
-- corrigée ci-dessous (transition customer→member_pending autorisée)
-- est donc déjà en place via la 0005. Fichier conservé pour la trace
-- du diagnostic, ne pas exécuter séparément.
-- Auteur : Claude Code · Date de rédaction : 2026-09-23
-- Objet : corrige une régression introduite par la migration 0003 —
--         le trigger verrouiller_champs_sensibles_profiles bloquait
--         par erreur la demande d'adhésion BSH Members existante
--         (BSHMembersPage.demanderAdhesion), qui a besoin de pouvoir
--         faire passer sa propre ligne de 'customer' à
--         'member_pending'.
-- Contexte : cahier des charges BSH Members, section 10.2 —
--   "Un utilisateur ne peut jamais s'attribuer lui-même member,
--   founding_member ou vip. Il peut seulement déclencher la demande
--   d'adhésion prévue (passage à member_pending)."
--   Le trigger 0003 verrouillait TOUT changement non-staff de
--   membership_status, sans exception pour cette transition pourtant
--   explicitement autorisée par le cahier. Cette migration ajoute
--   l'exception, sans rien retirer de la protection existante :
--   member/founding_member/vip restent impossibles à s'auto-attribuer,
--   et toute autre transition (ex. reculer depuis member_pending)
--   reste bloquée pour un acteur non-staff.
-- Impact : additive/corrective uniquement. CREATE OR REPLACE de la
--   même fonction (le trigger existant la référence déjà par son nom,
--   aucun DROP/CREATE TRIGGER nécessaire). Aucune donnée existante
--   modifiée, aucune policy touchée.
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
    new.role       := old.role;
    new.statut     := old.statut;
    new.age_verifi := old.age_verifi;

    if new.membership_status is distinct from old.membership_status then
      if coalesce(old.membership_status, 'customer') = 'customer'
         and new.membership_status = 'member_pending' then
        -- seule transition autorisée pour une cliente elle-même :
        -- déclencher sa demande d'adhésion (cahier §10.2)
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
  'Empêche une cliente de modifier role/statut/age_verifi sur sa propre ligne, et limite membership_status à la seule transition customer→member_pending (demande d''adhésion). Toute autre valeur (member, founding_member, vip) ou tout autre acteur que fondatrice/assistante est bloqué. Voir cahier des charges BSH Members §10.2.';

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
--
-- Vérifications suggérées après exécution (avec un compte cliente
-- de test, pas un compte réel) :
--   1. PATCH profiles set membership_status='member_pending' sur sa
--      propre ligne, en partant de 'customer' → doit réussir
--      (le parcours d'adhésion redevient fonctionnel).
--   2. PATCH profiles set membership_status='member' (ou
--      'founding_member', 'vip') sur sa propre ligne → doit être
--      silencieusement ignoré (la valeur ne change pas).
--   3. PATCH profiles set role='fondatrice' sur sa propre ligne →
--      toujours silencieusement ignoré (inchangé depuis la 0003).
-- ═══════════════════════════════════════════════════════════
