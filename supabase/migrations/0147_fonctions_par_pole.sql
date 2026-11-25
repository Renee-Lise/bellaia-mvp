-- ═══════════════════════════════════════════════════════════
-- 0147 — Fonctions rattachées à un PÔLE (et plus seulement à une organisation) ; rôle « fondatrice de pôle ».
-- PRÉPARÉE, NON APPLIQUÉE. Application après sauvegarde complète restaurée (« COMPLET ») et accord explicite.
-- Besoin (25/11) : une même personne peut être fondatrice d'un pôle (ex. Vil'Dor Pâtisse), hôte BSH,
-- assistante et collaboratrice de Bella'Food et de Bella'Events. Aujourd'hui, bellaia_roles ne connaît que
-- l'organisation (une seule en production) et n'accepte pas le rôle « fondatrice de pôle ».
-- Principes :
--  • « fondatrice_pole » est une FONCTION, distincte de la fondatrice générale (profiles.role = 'fondatrice') :
--    elle n'accorde AUCUN droit par elle-même ; les permissions (y compris financières) restent accordées
--    une à une, par pôle, dans bellaia_permissions. a_permission() et is_fondatrice() ne sont pas modifiées.
--  • pole : code de business_units (FOOD, EVENTS, BSH, VILDOR…), facultatif ; l'organisation reste possible.
--  • Unicité : une fonction n'existe qu'une fois par compte, organisation ET pôle.
-- Dépend de : bellaia_roles, business_units (production). Ordre : après 0145 (index d'unicité). Idempotente.
-- Retour arrière : rollback/0147_fonctions_par_pole_rollback.sql
-- ═══════════════════════════════════════════════════════════

alter table public.bellaia_roles add column if not exists pole text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bellaia_roles_pole_fkey') and to_regclass('public.business_units') is not null then
    alter table public.bellaia_roles add constraint bellaia_roles_pole_fkey foreign key (pole) references public.business_units(code);
  end if;
end $$;

alter table public.bellaia_roles drop constraint if exists bellaia_roles_role_check;
alter table public.bellaia_roles add constraint bellaia_roles_role_check
  check (role = any (array['assistante','prestataire','fournisseur','hote','collaborateur','qualite','autre','fondatrice_pole']));

-- Unicité (compte, fonction, organisation, pôle) : remplace les index (compte, fonction, organisation).
create unique index if not exists bellaia_roles_unique_pole
  on public.bellaia_roles (user_id, role, coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(pole, ''));
drop index if exists public.bellaia_roles_unique;
drop index if exists public.bellaia_roles_unique_fonction;

comment on column public.bellaia_roles.pole is 'Pôle (business_units.code) auquel la fonction est rattachée ; null = rattachement par organisation seulement';
