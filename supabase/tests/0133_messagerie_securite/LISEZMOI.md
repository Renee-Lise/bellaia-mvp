# Test de la migration 0133 (sécurité de la messagerie)

Exécution : `runuser -u postgres -- sh supabase/tests/0133_messagerie_securite/executer.sh /tmp/pg133`

- `1_tables_existantes.sql` : reproduction de la structure et des règles d'accès **actuelles** de production (relevées le 23/11/2026), défauts compris.
- `2_attaques_avant.sql` : démontre que les failles sont exploitables aujourd'hui (5 attaques réussies).
- `3_scenarios_apres.sql` : 38 contrôles après migration (parcours légitimes, attaques Red Team, pièces jointes, départ/retrait).
- Retour arrière testé sur une base contenant des données, puis réapplication.

Résultat du 23/11/2026 : **44/44 conformes** (`resultats_2026-11-23.txt`).
Limite : environnement Supabase reproduit (rôles, `auth.uid()`, stockage minimal), pas la vraie plateforme ; Realtime non testé.
