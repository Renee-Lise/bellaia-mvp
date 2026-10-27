-- ═══════════════════════════════════════════════════════════
-- 0028_bsh_hotesses_routage_reel.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : corrige le vrai bug derrière "les documents côté hôtes
--   sont toujours pareils" — ce n'est pas un problème de documents,
--   c'est un problème de routage à la connexion.
--
-- Diagnostic : le routage réel (pas le Mode aperçu fondatrice) qui
--   décide d'afficher HoteBSH (le vrai espace BSH, connecté à la
--   base) ou EspaceHote (l'espace générique Bella'Studio, qui
--   affiche une liste de 4 documents figée EN DUR dans le code,
--   jamais lue en base) se fait sur profiles.pole / profiles.univers
--   (src/components/BellaiaApp.tsx, ~ligne 12621). Or rien dans le
--   code ne posait jamais ces colonnes sur le profil d'une hôtesse
--   liée via "Lier à un compte Bellaïa existant" (migration 0018) —
--   seul le Mode aperçu de la fondatrice (univers="bsh" codé en dur
--   pour elle-même) montrait le bon espace. Toute vraie hôtesse BSH
--   connectée avec son propre compte retombait donc sur l'espace
--   générique, quoi que la base contienne réellement.
--
-- Corrigé pour l'avenir côté code (sauvegarderHote, même commit) :
--   lier un compte pose désormais role='hote', pole='BSH',
--   univers='bsh' sur ce profil. Cette migration-ci corrige le
--   passé : toute fiche bsh_hotes déjà liée à un profil (comme
--   celle créée cette session) reçoit la même correction, pour ne
--   pas dépendre d'une nouvelle action de la fondatrice sur une
--   fiche qui existe déjà.
--
-- Impact : UPDATE ciblé, uniquement sur les profils déjà liés à une
--   fiche bsh_hotes (profile_id non nul) — aucune autre ligne de
--   `profiles` touchée. Idempotent (even rejouée, même résultat).
-- ═══════════════════════════════════════════════════════════

update public.profiles p
set role    = 'hote',
    pole    = 'BSH',
    univers = 'bsh'
from public.bsh_hotes h
where h.profile_id = p.id;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select p.id, p.prenom, p.nom, p.role, p.pole, p.univers
--   from public.profiles p
--   join public.bsh_hotes h on h.profile_id = p.id;
--   → attendu : une ligne par hôtesse déjà liée à un compte, toutes
--     avec role='hote', pole='BSH', univers='bsh'.
-- ═══════════════════════════════════════════════════════════
