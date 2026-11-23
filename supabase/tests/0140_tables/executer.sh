#!/bin/sh
# Test de 0140 sur PostgreSQL 16 jetable. Usage (utilisateur postgres) : sh executer.sh /tmp/pg140
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55442 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55442 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$R/supabase/tests/consignes/environnement_production.sql" >/dev/null
$P -d essai -f "$M/0140_tables_manquantes.sql" >/dev/null; $P -d essai -f "$M/0140_tables_manquantes.sql" >/dev/null; echo "0140 appliquée deux fois (idempotence)"
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$(dirname "$0")/scenarios.sql"
$P -d essai -f "$M/rollback/0140_tables_manquantes_rollback.sql" >/dev/null && $P -d essai -A -t -c "select 'retour arrière : ' || (to_regclass('public.notifications') is null and to_regclass('public.webhook_logs') is null and to_regclass('public.pre_comptabilite') is null)"
$P -d essai -f "$M/0140_tables_manquantes.sql" >/dev/null && echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
