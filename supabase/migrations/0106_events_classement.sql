-- ═══════════════════════════════════════════════════════════
-- 0106_events_classement.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : classement hiérarchique demandé le 18/11 : « séparés par
--   support (popcorn, chips, Capri-Sun…), puis par thème (sirène,
--   licorne, dinosaures…), ainsi que par couleur ».
--   events_medias : type_support (niveau 1), theme (existant, niveau 2),
--   couleurs (niveau 3, couleurs nommées : rose, doré, bleu_ciel…),
--   nature (fond / gabarit / illustration…).
--   events_papeterie : couleurs (theme et type_support existaient).
--   Les listes de supports, thèmes et couleurs sont dans
--   src/modules/events/classement.ts (extensibles sans migration).
-- Non destructif : ajout de colonnes et d'index uniquement.
-- ═══════════════════════════════════════════════════════════
alter table public.events_medias add column if not exists type_support text, add column if not exists couleurs text[] not null default '{}', add column if not exists nature text;
alter table public.events_papeterie add column if not exists couleurs text[] not null default '{}';
create index if not exists events_medias_support_theme_idx on public.events_medias(type_support, theme);
create index if not exists events_papeterie_theme_idx on public.events_papeterie(theme);
