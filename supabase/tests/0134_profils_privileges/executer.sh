#!/bin/sh
# Test reproductible de 0134 (lot A1) sur PostgreSQL 16 jetable — aucune donnée réelle, aucun coût.
# Usage (utilisateur postgres) : sh supabase/tests/0134_profils_privileges/executer.sh /tmp/pg134
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; D="$R/supabase/tests/0134_profils_privileges"
M="$R/supabase/migrations/0134_profils_privileges.sql"; RB="$R/supabase/migrations/rollback/0134_profils_privileges_rollback.sql"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55435 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P="$B/psql -h $T -p 55435 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$D/1_etat_actuel.sql" >/dev/null
O="$R/supabase/tests/0133_messagerie_securite/0_outils.sql"
echo "— AVANT (état de production) : t = sûr, f = faille exploitable"; $P -d essai -A -t -F ' | ' -f "$O" -f "$D/2_scenarios.sql"
echo "— migration 0134"; $P -d essai -f "$M" >/dev/null && echo "appliquée"; $P -d essai -f "$M" >/dev/null && echo "relance sans erreur (idempotence)"
echo "— APRÈS"; $P -d essai -A -t -F ' | ' -f "$O" -f "$D/2_scenarios.sql"
echo "— retour arrière puis réapplication"
$P -d essai -f "$RB" >/dev/null && echo "retour arrière appliqué"
$P -d essai -A -t -c "select 'état d''origine rétabli : ' || ((select count(*) from pg_policies where tablename = 'profiles' and policyname = 'profiles_staff_all') = 1 and position('raw_user_meta_data->>''role''' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0)"
$P -d essai -f "$M" >/dev/null && echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
