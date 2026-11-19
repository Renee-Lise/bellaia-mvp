-- ═══════════════════════════════════════════════════════════
-- 0124_packs_administratifs.sql — STATUT: APPLIQUÉ le 19/11
-- Studio de papeterie administrative : personnalisation par univers
-- (thème : couleurs, police des titres, ornement, slogan), statut
-- « brouillon » jusqu'à validation graphique de la fondatrice, historique
-- des versions (restauration). Réservé à la fondatrice.
-- Les pièces émises ne sont JAMAIS modifiées rétroactivement : le thème
-- n'agit que sur la mise en page à la génération.
-- ═══════════════════════════════════════════════════════════
create table if not exists public.bellaia_packs_admin (
  univers text primary key, theme jsonb not null default '{}',
  statut text not null default 'brouillon' check (statut in ('brouillon','valide')),
  versions jsonb not null default '[]', valide_le timestamptz, updated_at timestamptz not null default now());
alter table public.bellaia_packs_admin enable row level security;
-- politique packs_admin_fondatrice : is_fondatrice() en lecture et écriture
