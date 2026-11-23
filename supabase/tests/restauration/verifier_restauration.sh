#!/bin/sh
# Contrôle de restauration RÉELLE d'une sauvegarde Bellaïa sur une base PostgreSQL 16 jetable (aucun effet sur la production).
# Usage (utilisateur postgres) :
#   sh verifier_restauration.sh <dossier_temporaire> <dossier_sauvegarde> <reference_tables.csv> <reference_stockage.tsv> [comptes_attendus]
#   - dossier_sauvegarde      : produit par supabase/sauvegarde/sauvegarde_complete.sh (roles.sql, structure.sql, donnees.sql,
#                               manifeste_stockage.tsv, manifeste_comptes.tsv, empreintes.sha256)
#   - reference_tables.csv    : « table;lignes » relevé en production au moment de l'export (rapport privé)
#   - reference_stockage.tsv  : « compartiment<TAB>fichiers<TAB>octets<TAB>empreinte » relevé dans storage.objects
# Trois contrôles : (1) intégrité des fichiers (SHA-256) ; (2) restauration : lignes restaurées = lignes présentes
# dans l'export, et = référence de production ; (3) stockage et comptes : manifeste = référence.
# Conclusion : COMPLET ou ÉCARTS (sauvegarde non validée).
set -e
T="$1"; S="$2"; REF="$3"; REFS="$4"; COMPTES="${5:-}"; B=/usr/lib/postgresql/16/bin; R=$(cd "$(dirname "$0")/../../.." && pwd)
ecarts=0
echo "— 1. Intégrité des fichiers de la sauvegarde"
if [ -f "$S/empreintes.sha256" ]; then
  ko=$(cd "$S" && grep -E ' \./(roles|structure|donnees)\.sql$| \./manifeste_(stockage|comptes)\.tsv$' empreintes.sha256 | sha256sum -c - 2>/dev/null | grep -vc ': OK$' || true)
  [ "$ko" -eq 0 ] && echo "empreintes conformes" || { echo "ÉCART  $ko fichier(s) modifié(s) depuis la sauvegarde"; ecarts=$((ecarts+ko)); }
else echo "ÉCART  empreintes.sha256 absent"; ecarts=$((ecarts+1)); fi

echo "— 2. Restauration dans une base jetable"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55450 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
P="$B/psql -h $T -p 55450 -U postgres -X -q"
$P -c 'create database restauration' >/dev/null
$P -d restauration -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null 2>&1 || true
$P -d restauration -c "do \$\$ begin begin create role service_role nologin; exception when others then null; end; begin create role supabase_admin nologin; exception when others then null; end; end \$\$; create schema if not exists extensions; create extension if not exists pgcrypto; create extension if not exists \"uuid-ossp\" with schema extensions;" >/dev/null 2>&1 || true
for f in roles structure donnees; do
  [ -f "$S/$f.sql" ] || { echo "ÉCART  $f.sql absent"; ecarts=$((ecarts+1)); continue; }
  $P -d restauration -f "$S/$f.sql" > "$T/$f.log" 2>&1 || true
  echo "$f : $(grep -c ERROR "$T/$f.log" || true) erreur(s) signalée(s) (détail : $T/$f.log)"
done
# Lignes présentes dans l'export (format COPY ou INSERT), par table du schéma public
awk '
  /^COPY "?public"?\."?[A-Za-z0-9_]+"? /{ t=$2; gsub(/"/,"",t); sub(/^public\./,"",t); c=1; next }
  c && /^\\\.$/ { c=0; next }
  c { n[t]++; next }
  /^INSERT INTO "?public"?\."?[A-Za-z0-9_]+"?/ { t=$3; gsub(/"/,"",t); sub(/^public\./,"",t); n[t]++ }
  END { for (k in n) print k";"n[k] }' "$S/donnees.sql" > "$T/export.csv"
total=0; ecl=0
for ligne in $(grep -v '^#' "$REF" | tail -n +2); do
  t=$(echo "$ligne" | cut -d';' -f1); attendu=$(echo "$ligne" | cut -d';' -f2); total=$((total+1))
  exporte=$(grep "^$t;" "$T/export.csv" | cut -d';' -f2); exporte=${exporte:-0}
  obtenu=$($P -d restauration -A -t -c "select count(*) from public.\"$t\"" 2>/dev/null || echo "absente")
  if [ "$obtenu" != "$exporte" ] || [ "$exporte" != "$attendu" ]; then ecl=$((ecl+1)); echo "ÉCART  $t : production $attendu, export $exporte, restauré $obtenu"; fi
done
[ "$ecl" -eq 0 ] && echo "tables : $total sur $total identiques (production = export = restauré)" || ecarts=$((ecarts+ecl))

echo "— 3. Fichiers du stockage et comptes"
grep -v '^#' "$REFS" | while IFS="$(printf '\t')" read -r b n o e; do
  m=$(grep "^$b	" "$S/manifeste_stockage.tsv" || true)
  if [ "$m" = "$(printf '%s\t%s\t%s\t%s' "$b" "$n" "$o" "$e")" ]; then echo "stockage $b : $n fichier(s), $o octets, empreinte identique"; else echo "ÉCART  stockage $b : attendu $n fichier(s) / $o octets ; sauvegarde : $(echo "$m" | cut -f2-3 | tr '\t' ' ')"; echo x >> "$T/ecarts_stockage"; fi
done
[ -f "$T/ecarts_stockage" ] && ecarts=$((ecarts+$(wc -l < "$T/ecarts_stockage"))) && rm -f "$T/ecarts_stockage"
if [ -n "$COMPTES" ]; then
  c=$(grep '^auth.users' "$S/manifeste_comptes.tsv" 2>/dev/null | cut -f2)
  [ "$c" = "$COMPTES" ] && echo "comptes : $c (identique à la production)" || { echo "ÉCART  comptes : production $COMPTES, sauvegarde ${c:-absent}"; ecarts=$((ecarts+1)); }
fi
$B/pg_ctl -D "$T/pg" stop >/dev/null
[ "$ecarts" -eq 0 ] && echo "COMPLET : sauvegarde intègre, restaurée et identique à la production" || echo "ÉCARTS : $ecarts — sauvegarde NON validée"
