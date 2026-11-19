# Tests de la migration 0129 (BSH Secret Stories)

Tests exécutés sur une base **PostgreSQL 16 locale et jetable**, jamais sur Supabase.
Le fichier 1 reproduit le minimum de Supabase (rôles `anon` / `authenticated`, `auth.uid()`,
`storage.objects` avec RLS, `profiles`, `bellaia_permissions`, `is_fondatrice()`, `a_permission()`
avec leurs définitions de production). Le jeu d'essai (2) est entièrement fictif.

Ordre : 1 → `0129_bsh_secret_stories.sql` → 2 → `python3 3_tests_profils.py`.
Résultat du 19/11/2026 : **94/94 conformes** (voir `resultats_2026-11-19.txt`). Migration rejouable
sans perte, retour arrière vérifié (aucune table ni fonction `ss_*` restante, profils intacts).
