#!/bin/sh
# Contrôle de restauration d'une sauvegarde Bellaïa sur une base PostgreSQL jetable (aucun effet sur la production).
# Usage (utilisateur postgres) :
#   sh verifier_restauration.sh <dossier_temporaire> <structure.sql> <donnees.sql> <inventaire_reference.csv>
#   - structure.sql / donnees.sql : produits par « supabase db dump » et « supabase db dump --data-only »
#   - inventaire_reference.csv     : rapport privé « Bellaia_Inventaire_reference_tables_AAAA-MM-JJ.csv »
# Résultat : pour chaque table, lignes attendues / restaurées ; conclusion COMPLET ou ÉCARTS.
set -e
T="$1"; S="$2"; D="$3"; REF="$4"; B=/usr/lib/postgresql/16/bin; R=$(cd "$(dirname "$0")/../../.." && pwd)
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55450 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
P="$B/psql -h $T -p 55450 -U postgres -X -q"
$P -c 'create database restauration' >/dev/null
# Environnement minimal Supabase (rôles, schémas auth/storage, extensions courantes)
$P -d restauration -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null 2>&1 || true
$P -d restauration -c "do \$\$ begin begin create role service_role nologin; exception when others then null; end; begin create role supabase_admin nologin; exception when others then null; end; end \$\$; create schema if not exists extensions; create extension if not exists pgcrypto; create extension if not exists \"uuid-ossp\" with schema extensions;" >/dev/null 2>&1 || true
echo "— structure"; $P -d restauration -f "$S" > "$T/structure.log" 2>&1 || true; echo "erreurs : $(grep -c ERROR "$T/structure.log" || true) (détail : $T/structure.log)"
echo "— données";   $P -d restauration -f "$D" > "$T/donnees.log" 2>&1 || true;   echo "erreurs : $(grep -c ERROR "$T/donnees.log" || true) (détail : $T/donnees.log)"
echo "— comparaison avec l'inventaire de référence"
ecarts=0; total=0
for ligne in $(grep -v '^#' "$REF" | tail -n +2); do
  t=$(echo "$ligne" | cut -d';' -f1); attendu=$(echo "$ligne" | cut -d';' -f2); total=$((total+1))
  obtenu=$($P -d restauration -A -t -c "select count(*) from public.\"$t\"" 2>/dev/null || echo "absente")
  if [ "$obtenu" != "$attendu" ]; then ecarts=$((ecarts+1)); echo "ÉCART  $t : attendu $attendu, restauré $obtenu"; fi
done
[ "$ecarts" -eq 0 ] && echo "COMPLET : $total tables, nombres de lignes identiques" || echo "ÉCARTS : $ecarts table(s) sur $total — sauvegarde NON validée"
$B/pg_ctl -D "$T/pg" stop >/dev/null
