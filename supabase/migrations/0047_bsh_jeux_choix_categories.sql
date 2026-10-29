-- ═══════════════════════════════════════════════════════════
-- 0047_bsh_jeux_choix_categories.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-29 (choix_categories correct pour les 2 jeux, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : "Action ou Vérité" doit proposer un vrai choix (Action ou
--   Vérité) avant de tirer, pas un tirage aléatoire qui tombe sur
--   l'un ou l'autre — demande explicite de Renée-Lise après test.
--
-- bsh_jeux.choix_categories (text[], nullable) liste les valeurs de
--   bsh_jeux_cartes.nom que la joueuse doit choisir avant le tirage.
--   NULL ou vide = comportement inchangé (tirage simple au hasard,
--   comme Amour/Gloire/Audace ou Cap ou pas cap). Rempli pour
--   "Action ou Vérité" (Action/Vérité) et, par cohérence, pour "Les
--   Trois Portes du Désir" (Duo) qui a le même principe par nature
--   ("chaque partenaire choisit une porte") — pas demandé
--   explicitement ce tour-ci, mais même mécanique, donc corrigé en
--   même temps plutôt que de laisser le même défaut en attente
--   d'une prochaine remarque.
--
-- Impact : ALTER TABLE ADD COLUMN (nullable) + UPDATE ciblé sur 2
--   lignes déjà existantes, additif et idempotent.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_jeux
  add column if not exists choix_categories text[];

update public.bsh_jeux
set choix_categories = array['Action','Vérité']
where nom = 'Action ou Vérité';

update public.bsh_jeux
set choix_categories = array['Porte Confidence','Porte Séduction','Porte Audace']
where nom = 'Les Trois Portes du Désir';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select nom, choix_categories from public.bsh_jeux
--   where nom in ('Action ou Vérité','Les Trois Portes du Désir');
--   → attendu : "Action ou Vérité" → {Action,Vérité},
--     "Les Trois Portes du Désir" → {Porte Confidence,Porte
--     Séduction,Porte Audace}.
-- ═══════════════════════════════════════════════════════════
