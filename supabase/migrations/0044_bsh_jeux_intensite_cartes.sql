-- ═══════════════════════════════════════════════════════════
-- 0044_bsh_jeux_intensite_cartes.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (0 carte sans intensité, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Phase 2 du chantier BSH Secret Games — niveaux
--   d'intensité (🌹 Douceur / 🖤 Mystère / 🔥 Audace / 🌶️ Piment /
--   🎲 Surprise), sélectionnables côté client.
--
-- bsh_jeux.intensite existe déjà (migration 0041) mais n'est pour
--   l'instant qu'une étiquette jamais lue par aucune interface.
--   Cette migration ajoute la même colonne sur bsh_jeux_cartes :
--   une carte peut avoir sa propre intensité, pas forcément celle
--   de son jeu — une "édition spéciale" future pourra mélanger les
--   niveaux dans un même jeu sans tout restructurer. Les cartes
--   déjà en place héritent de l'intensité de leur jeu (backfill).
--
-- Impact : ALTER TABLE ADD COLUMN (nullable) + UPDATE de backfill,
--   additif et idempotent.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_jeux_cartes
  add column if not exists intensite text
  check (intensite in ('douceur','mystere','audace','piment','surprise'));

update public.bsh_jeux_cartes c
set intensite = j.intensite
from public.bsh_jeux j
where c.jeu_id = j.id
  and c.intensite is null;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.bsh_jeux_cartes
--   where jeu_id is not null and intensite is null;
--   → attendu : 0 (toutes les cartes rattachées à un jeu ont
--     hérité de son intensité).
-- ═══════════════════════════════════════════════════════════
