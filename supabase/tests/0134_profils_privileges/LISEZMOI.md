# Test de la migration 0134 (lot A1 — privilèges des profils)

Exécution : `runuser -u postgres -- sh supabase/tests/0134_profils_privileges/executer.sh /tmp/pg134`

- `1_etat_actuel.sql` : reproduction de l'état de production du 23/11/2026 (inscription, profils, verrou, règles d'accès).
- `2_scenarios.sql` : 13 scénarios joués avant puis après la migration.
- Avant : 6 failles exploitables (inscription en « fondatrice », création de profil privilégié, auto-promotion et promotion d'autrui par un titulaire d'« acces_complet », suppression de profil, modification de son propre statut).
- Après : 13/13 ; idempotence ; retour arrière fidèle ; réapplication.

Limite : environnement Supabase reproduit (rôles, `auth.uid()`), pas la vraie plateforme d'authentification.
