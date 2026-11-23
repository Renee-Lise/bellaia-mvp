#!/bin/sh
# Test reproductible de 0131 sur une base PostgreSQL 16 jetable (aucune donnée réelle).
# Usage : sh supabase/tests/0131_agenda_disponibilites/executer.sh <dossier_temporaire>
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55433 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
P="$B/psql -h $T -p 55433 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
echo "— application"; $P -d essai -f "$R/supabase/migrations/0131_agenda_disponibilites.sql" >/dev/null && echo "migration appliquée"
echo "— relance (idempotence)"; $P -d essai -f "$R/supabase/migrations/0131_agenda_disponibilites.sql" >/dev/null && echo "relance sans erreur"
echo "— scénarios"; $P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0131_agenda_disponibilites/test_scenarios.sql"
echo "— retour arrière"; $P -d essai -f "$R/supabase/migrations/rollback/0131_agenda_disponibilites_rollback.sql" >/dev/null
$P -d essai -A -t -c "select 'tables retirées : ' || (to_regclass('public.agenda_disponibilites') is null and to_regclass('public.agenda_indisponibilites') is null)"
echo "— réapplication après retour arrière"; $P -d essai -f "$R/supabase/migrations/0131_agenda_disponibilites.sql" >/dev/null && echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
