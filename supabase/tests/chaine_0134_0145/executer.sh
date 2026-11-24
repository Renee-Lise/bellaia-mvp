#!/bin/sh
# Chaîne complète des migrations en attente liées aux accès : 0134 → 0135 → 0136 → 0137 → 0145 → 0144,
# sur PostgreSQL 16 jetable (comptes fictifs), puis rejeu des scénarios 0135–0137 avec 0145 en place.
# Usage (utilisateur postgres) : sh executer.sh /tmp/pgchaine
set -e
T="$1"; D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"; E="$R/supabase/tests/0135_0137_acces"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
trap '$B/pg_ctl -D "$T/pg" stop -m fast >/dev/null 2>&1 || true' EXIT
$B/pg_ctl -D "$T/pg" -o "-p 55447 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55447 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$R/supabase/tests/0134_profils_privileges/1_etat_actuel.sql" >/dev/null
$P -d essai -f "$E/1_etat_production.sql" >/dev/null
$P -d essai -f "$D/complements.sql" >/dev/null
for m in 0134_profils_privileges 0135_candidatures 0136_acces_suspensions 0137_missions_invitations 0145_repertoire_central 0144_bsh_club_monde_nominations; do
  $P -d essai -f "$M/$m.sql" >/dev/null; $P -d essai -f "$M/$m.sql" >/dev/null; echo "$m : appliquée puis relancée sans erreur"
done
echo "— scénarios 0135–0137 rejoués avec 0145 et 0144 en place"
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$E/2_scenarios.sql" > "$T/res.txt"
echo "$(grep -c '| t$' "$T/res.txt")/$(grep -c '|' "$T/res.txt") conformes"; grep -v '| t$' "$T/res.txt" | grep '|' || true
echo "— contrôles de compatibilité"; $P -d essai -A -t -F ' | ' -f "$D/controles.sql"
