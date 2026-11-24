#!/bin/sh
# Test de 0144 sur PostgreSQL 16 jetable, comptes distincts. Usage (utilisateur postgres) : sh executer.sh /tmp/pg144
set -e
T="$1"; D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
trap '$B/pg_ctl -D "$T/pg" stop -m fast >/dev/null 2>&1 || true' EXIT
$B/pg_ctl -D "$T/pg" -o "-p 55445 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55445 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$D/environnement.sql" >/dev/null
$P -d essai -f "$M/0144_bsh_club_monde_nominations.sql" >/dev/null; $P -d essai -f "$M/0144_bsh_club_monde_nominations.sql" >/dev/null; echo "0144 appliquée deux fois (idempotence)"
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$D/outils_temps_reel.sql" -f "$D/scenarios.sql"
$P -d essai -f "$M/rollback/0144_bsh_club_monde_nominations_rollback.sql" >/dev/null && $P -d essai -A -t -c "select 'retour arrière : ' || (to_regclass('public.bsh_club_votes') is null and to_regprocedure('public.bsh_hote_peut(text,text)') is null and to_regclass('public.bsh_musique') is not null)"
$P -d essai -f "$M/0144_bsh_club_monde_nominations.sql" >/dev/null && echo "réapplication sans erreur"
