#!/bin/sh
# Test reproductible de 0130 sur une base PostgreSQL 16 jetable (données fictives). Usage : sh executer.sh <dossier_temporaire>
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; D="$R/supabase/tests/0130_editions_pedagogiques"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55434 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
P="$B/psql -h $T -p 55434 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$D/1_tables_existantes.sql" >/dev/null
echo "— application"; $P -d essai -f "$R/supabase/migrations/0130_editions_pedagogiques.sql" >/dev/null 2>&1 && echo "migration appliquée"
echo "— scénarios"; $P -d essai -A -t -F ' | ' -f "$D/test_scenarios.sql"
echo "— relance (idempotence)"; $P -d essai -f "$R/supabase/migrations/0130_editions_pedagogiques.sql" >/dev/null 2>&1 && echo "relance sans erreur"
$P -d essai -A -t -c "select 'après relance : statuts et versions conservés : ' || ((select statut from public.histoires_scenes where identifiant='T1-P1') = 'brouillon' and (select version from public.histoires_scenes where identifiant='T1-P1') = 3 and (select count(*) from pg_trigger where tgname='histoires_versionner_scene') = 1)"
echo "— retour arrière"; $P -d essai -f "$R/supabase/migrations/rollback/0130_editions_pedagogiques_rollback.sql" >/dev/null 2>&1
$P -d essai -A -t -c "select 'tables et colonnes retirées, textes français intacts : ' || (to_regclass('public.histoires_scenes_versions') is null and to_regclass('public.editions_fiches_pedagogiques') is null and not exists (select 1 from information_schema.columns where table_name='histoires_scenes' and column_name in ('statut','version','texte_creole')) and (select count(*) from public.histoires_scenes where texte <> '') = 2)"
echo "— réapplication après retour arrière"; $P -d essai -f "$R/supabase/migrations/0130_editions_pedagogiques.sql" >/dev/null 2>&1 && echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
