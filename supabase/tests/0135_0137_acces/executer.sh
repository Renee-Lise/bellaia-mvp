#!/bin/sh
# Test reproductible de 0135–0137 sur PostgreSQL 16 jetable — comptes fictifs, aucune donnée réelle, aucun coût.
# Usage (utilisateur postgres) : sh supabase/tests/0135_0137_acces/executer.sh /tmp/pg137
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; D="$R/supabase/tests/0135_0137_acces"; M="$R/supabase/migrations"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55437 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P="$B/psql -h $T -p 55437 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai -f "$R/supabase/tests/0134_profils_privileges/1_etat_actuel.sql" >/dev/null
$P -d essai -f "$M/0134_profils_privileges.sql" >/dev/null
$P -d essai -f "$D/1_etat_production.sql" >/dev/null
echo "— migrations 0135, 0136, 0137"
for m in 0135_candidatures 0136_acces_suspensions 0137_missions_invitations; do $P -d essai -f "$M/$m.sql" >/dev/null; $P -d essai -f "$M/$m.sql" >/dev/null; echo "$m : appliquée et relancée sans erreur (idempotence)"; done
O="$R/supabase/tests/0133_messagerie_securite/0_outils.sql"
echo "— scénarios"; $P -d essai -A -t -F ' | ' -f "$O" -f "$D/2_scenarios.sql" > "$T/resultats.txt"; cat "$T/resultats.txt"
echo "$(grep -c '| t$' "$T/resultats.txt")/$(grep -c '|' "$T/resultats.txt") conformes"
echo "— retour arrière (0137, 0136, 0135) puis réapplication"
for m in 0137_missions_invitations 0136_acces_suspensions 0135_candidatures; do $P -d essai -f "$M/rollback/${m}_rollback.sql" >/dev/null; done
$P -d essai -A -t -c "select 'état d''origine rétabli : ' || (to_regclass('public.bellaia_candidatures') is null and to_regclass('public.bellaia_suspensions') is null and to_regclass('public.bellaia_invitations') is null
  and position('statut' in pg_get_functiondef('public.a_permission(text,text)'::regprocedure)) = 0
  and (select count(*) from pg_constraint where conrelid = 'public.bellaia_permissions'::regclass and contype = 'u') = 1
  and not exists (select 1 from information_schema.columns where table_name = 'bellaia_missions' and column_name = 'progression'))"
for m in 0135_candidatures 0136_acces_suspensions 0137_missions_invitations; do $P -d essai -f "$M/$m.sql" >/dev/null; done; echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
