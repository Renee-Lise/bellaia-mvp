#!/bin/sh
# Bibliothèque de consignes : enregistrement réel des versions et règles d'accès, sur PostgreSQL 16 jetable,
# avec la table bellaia_documents, ses règles d'accès, son déclencheur et les fonctions de droits RELEVÉS EN
# PRODUCTION le 23/11/2026 (lecture seule). Usage (utilisateur postgres) : sh executer.sh /tmp/pgcons
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55441 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55441 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$(dirname "$0")/environnement_production.sql" >/dev/null
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$(dirname "$0")/scenarios.sql"
$B/pg_ctl -D "$T/pg" stop >/dev/null
