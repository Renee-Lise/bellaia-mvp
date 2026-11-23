#!/bin/sh
# Test reproductible de 0133 sur une base PostgreSQL 16 jetable (aucune donnée réelle, aucun coût).
# Usage (en tant qu'utilisateur postgres) : sh supabase/tests/0133_messagerie_securite/executer.sh <dossier_temporaire>
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; D="$R/supabase/tests/0133_messagerie_securite"
M="$R/supabase/migrations/0133_messagerie_securite.sql"; RB="$R/supabase/migrations/rollback/0133_messagerie_securite_rollback.sql"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55434 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
P="$B/psql -h $T -p 55434 -U postgres -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=terse --set=client_min_messages=warning"
export PGOPTIONS="-c client_min_messages=warning"
base() { $P -c "drop database if exists $1" >/dev/null; $P -c "create database $1" >/dev/null
  $P -d $1 -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
  $P -d $1 -f "$D/1_tables_existantes.sql" >/dev/null; }
echo "— A. état actuel de production : les failles sont-elles exploitables ?"
base avant; $P -d avant -A -t -F ' | ' -f "$D/0_outils.sql" -f "$D/2_attaques_avant.sql"
echo "— B. migration 0133"
base apres; $P -d apres -f "$M" >/dev/null && echo "migration appliquée"
$P -d apres -f "$M" >/dev/null && echo "relance sans erreur (idempotence)"
$P -d apres -A -t -F ' | ' -f "$D/0_outils.sql" -f "$D/3_scenarios_apres.sql"
echo "— C. retour arrière sur la base attaquée de l'étape A, puis réapplication"
$P -d avant -f "$M" >/dev/null && echo "migration appliquée sur une base contenant déjà des données"
$P -d avant -A -t -c "select 'données conservées après migration : ' || ((select count(*) from public.bellaia_messages) = 1 and (select count(*) from public.bellaia_conv_membres) = 3)"
$P -d avant -f "$RB" >/dev/null && echo "retour arrière appliqué"
$P -d avant -A -t -c "select 'règles d''origine rétablies : ' || ((select count(*) from pg_policies where tablename like 'bellaia_%') = 13 and (select with_check from pg_policies where policyname = 'bconv_insert') = 'true')"
$P -d avant -f "$M" >/dev/null && echo "réapplication après retour arrière sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
