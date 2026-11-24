#!/bin/sh
# Test de 0145 sur PostgreSQL 16 jetable. Usage (utilisateur postgres) : sh executer.sh /tmp/pg145
set -e
T="$1"; D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
trap '$B/pg_ctl -D "$T/pg" stop -m fast >/dev/null 2>&1 || true' EXIT
$B/pg_ctl -D "$T/pg" -o "-p 55446 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55446 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$D/environnement.sql" >/dev/null
$P -d essai -f "$M/0145_repertoire_central.sql" >/dev/null; $P -d essai -f "$M/0145_repertoire_central.sql" >/dev/null; echo "0145 appliquée deux fois (idempotence)"
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$D/scenarios.sql"
$P -d essai -f "$M/rollback/0145_repertoire_central_rollback.sql" >/dev/null && $P -d essai -A -t -c "select 'retour arrière : ' || (to_regclass('public.bellaia_repertoire') is null and to_regclass('public.bellaia_roles_unique_fonction') is null and (select count(*) from bellaia_roles) = 4)"
$P -d essai -f "$M/0145_repertoire_central.sql" >/dev/null && echo "réapplication sans erreur"
