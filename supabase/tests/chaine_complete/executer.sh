#!/bin/sh
# Chaîne COMPLÈTE des migrations en attente du dépôt, dans l'ordre du plan consolidé, sur une seule base
# PostgreSQL 16 jetable (comptes fictifs) : environnement = réunion des états de production relevés pour chaque test.
# Chaque migration est appliquée puis relancée (idempotence) ; puis les scénarios de chaque migration sont rejoués
# sur la base finale (toutes migrations en place) ; puis tous les retours arrière en ordre inverse, et réapplication.
# 0142 (sécurité) est conservée dans le Drive privé : hors de ce test public.
# Usage (utilisateur postgres) : REPLIQUE=/chemin/replique_tables_production.sql sh executer.sh /tmp/pgcomplet
set -e
T="$1"; D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"; TS="$R/supabase/tests"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
trap '$B/pg_ctl -D "$T/pg" stop -m fast >/dev/null 2>&1 || true' EXIT
$B/pg_ctl -D "$T/pg" -o "-p 55449 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55449 -U postgres -X -q"
$P -c 'create database essai' >/dev/null
echo "— environnement (états de production relevés)"
$P -v ON_ERROR_STOP=1 -d essai -f "$TS/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
for e in 0134_profils_privileges/1_etat_actuel.sql 0135_0137_acces/1_etat_production.sql chaine_0134_0145/complements.sql \
         0133_messagerie_securite/1_tables_existantes.sql 0130_editions_pedagogiques/1_tables_existantes.sql consignes/environnement_production.sql \
         0141_bsh/environnement_production.sql 0143_offre/environnement.sql 0144_club_monde/environnement.sql 0145_repertoire/environnement.sql; do
  n=$(cd "$(dirname "$TS/$e")" && $P -d essai -f "$TS/$e" 2>&1 | grep -c 'ERROR' || true); echo "  $e : $n avertissement(s) de recouvrement"
done
# Réplique de la STRUCTURE des 203 tables de production (noms et types des colonnes, relevés le 25/11 en lecture seule),
# conservée hors du dépôt public : les tables absentes des environnements de test (ex. stripe_payment_intents) sont ainsi présentes.
if [ -n "$REPLIQUE" ] && [ -f "$REPLIQUE" ]; then n=$($P -d essai -f "$REPLIQUE" 2>&1 | grep -c ERROR || true); echo "  réplique des tables de production : $(grep -c 'create table' "$REPLIQUE") tables, $n erreur(s)";   $P -d essai -f "$(dirname "$REPLIQUE")/replique_colonnes.sql" >/dev/null 2>&1; $P -d essai -f "$(dirname "$REPLIQUE")/replique_contraintes.sql" >/dev/null 2>&1; O2="$(dirname "$REPLIQUE")/replique_objets_production.sql"; if [ -f "$O2" ]; then n=$($P -d essai -f "$O2" 2>&1 | grep -c ERROR || true); $P -d essai -f "$(dirname "$REPLIQUE")/replique_identites.sql" >/dev/null 2>&1; [ -f "$(dirname "$REPLIQUE")/replique_nettoyage.sql" ] && $P -d essai -f "$(dirname "$REPLIQUE")/replique_nettoyage.sql" >/dev/null 2>&1; echo "  réplique des fonctions, vues, politiques et déclencheurs de production : $n erreur(s) de dépendance"; fi
else echo "  (sans réplique de production : variable REPLIQUE non fournie)"; fi
ORDRE="0134_profils_privileges 0133_messagerie_securite 0138_regles_role_assistante 0140_tables_manquantes 0141_bsh_continuite_studio 0143_food_offre_du_jour 0135_candidatures 0136_acces_suspensions 0137_missions_invitations 0146_missions_par_pole 0145_repertoire_central 0147_fonctions_par_pole 0144_bsh_club_monde_nominations 0139_demandes_clients 0131_agenda_disponibilites 0130_editions_pedagogiques 0132_hotes_documents 0129_bsh_secret_stories"
DUMP="$B/pg_dump -h $T -p 55449 -U postgres -s --no-owner essai"
EMP="$P -d essai -A -t -F | -f $D/empreinte.sql"
$DUMP > "$T/schema_avant.sql"; $EMP > "$T/empreinte_avant.txt"
echo "— application dans l'ordre du plan (chacune deux fois)"
for m in $ORDRE; do
  if $P -v ON_ERROR_STOP=1 -d essai -f "$M/$m.sql" >"$T/$m.log" 2>&1 && $P -v ON_ERROR_STOP=1 -d essai -f "$M/$m.sql" >>"$T/$m.log" 2>&1; then echo "  OK  $m"; else echo "  ÉCHEC $m"; grep ERROR "$T/$m.log" | head -3; exit 1; fi
done
echo "— scénarios : pour chacun, base neuve = environnement minimal + données fictives de CE test + réplique de production + chaîne complète"
O="$TS/0133_messagerie_securite/0_outils.sql"
scenario() { nom="$1"; shift; envs="$1"; shift; db="s_$(echo $nom | tr -c 'a-z0-9\n' '_')"
  $P -c "create database $db" >/dev/null; $P -v ON_ERROR_STOP=1 -d $db -f "$TS/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
  $P -d $db -f "$D/socle_storage.sql" >/dev/null 2>&1 || true
  # ordre : structure réelle des tables de production d'abord, puis données fictives du test, puis fonctions/politiques réelles de production
  RD="$(dirname "$REPLIQUE")"
  [ -n "$REPLIQUE" ] && { $P -d $db -f "$RD/replique_auth_storage.sql" >/dev/null 2>&1 || true; $P -d $db -f "$REPLIQUE" >/dev/null 2>&1 || true; for r in colonnes contraintes identites; do $P -d $db -f "$RD/replique_$r.sql" >/dev/null 2>&1 || true; done; }
  for e in $envs; do (cd "$(dirname "$TS/$e")" && $P -d $db -f "$TS/$e" >/dev/null 2>&1) || true; done
  # les tables recréées par les données de test reçoivent toutes les colonnes réelles de production
  [ -n "$REPLIQUE" ] && { $P -d $db -f "$RD/replique_colonnes.sql" >/dev/null 2>&1 || true; $P -d $db -f "$RD/replique_contraintes.sql" >/dev/null 2>&1 || true; $P -d $db -f "$RD/replique_identites.sql" >/dev/null 2>&1 || true; }
  [ -n "$REPLIQUE" ] && { $P -d $db -f "$(dirname "$REPLIQUE")/replique_objets_production.sql" >/dev/null 2>&1 || true; $P -d $db -f "$RD/replique_identites.sql" >/dev/null 2>&1 || true; }
  for m in $ORDRE; do $P -v ON_ERROR_STOP=1 -d $db -f "$M/$m.sql" >/dev/null 2>"$T/err_$db.txt" || { echo "  $nom : ÉCHEC de la chaîne à $m"; head -2 "$T/err_$db.txt"; return; }; done
  fs=""; for f in "$@"; do fs="$fs -f $f"; done
  (cd "$(dirname "$1")" && $P -d $db -A -t -F ' | ' -f "$O" $fs > "$T/sc_$db.txt" 2>&1) || true
  ok=$(grep -c '| t$' "$T/sc_$db.txt" || true); tot=$(grep -c ' | ' "$T/sc_$db.txt" || true); err=$(grep -c ERROR "$T/sc_$db.txt" || true)
  echo "  $nom : $ok/$tot conformes, $err erreur(s)"; grep -E ' \| f$|ERROR' "$T/sc_$db.txt" | head -5 | sed 's/^/      /'; }
scenario 0134 "0134_profils_privileges/1_etat_actuel.sql" "$TS/0134_profils_privileges/2_scenarios.sql"
scenario 0135-0137 "0134_profils_privileges/1_etat_actuel.sql 0135_0137_acces/1_etat_production.sql" "$TS/0135_0137_acces/2_scenarios.sql"
scenario chaine-acces "0134_profils_privileges/1_etat_actuel.sql 0135_0137_acces/1_etat_production.sql chaine_0134_0145/complements.sql" "$TS/chaine_0134_0145/controles.sql"
scenario 0133 "0133_messagerie_securite/1_tables_existantes.sql" "$TS/0133_messagerie_securite/3_scenarios_apres.sql"
scenario 0140 "consignes/environnement_production.sql" "$TS/0140_tables/scenarios.sql"
scenario 0141 "0141_bsh/environnement_production.sql" "$TS/0141_bsh/scenarios.sql"
scenario 0143 "0143_offre/environnement.sql" "$TS/0143_offre/scenarios.sql"
scenario 0144 "0144_club_monde/environnement.sql" "$TS/0144_club_monde/outils_temps_reel.sql" "$TS/0144_club_monde/scenarios.sql"
scenario 0145 "0145_repertoire/environnement.sql" "$TS/0145_repertoire/scenarios.sql"
scenario 0147 "0145_repertoire/environnement.sql" "$TS/0147_fonctions_pole/scenarios.sql"
scenario 0139 "chaine_complete/comptes_0139.sql" "$TS/0139_demandes/scenarios.sql"
scenario 0131 "" "$TS/0131_agenda_disponibilites/test_scenarios.sql"
scenario 0130 "0130_editions_pedagogiques/1_tables_existantes.sql" "$TS/0130_editions_pedagogiques/test_scenarios.sql"
echo "— retours arrière en ordre inverse"
for m in $(echo $ORDRE | tr ' ' '\n' | tac); do
  f="$M/rollback/${m}_rollback.sql"; [ -f "$f" ] || { echo "  (pas de fichier public) $m"; continue; }
  if $P -v ON_ERROR_STOP=1 -d essai -f "$f" >"$T/rb_$m.log" 2>&1; then echo "  OK  retour $m"; else echo "  ÉCHEC retour $m"; grep ERROR "$T/rb_$m.log" | head -3; fi
done
$DUMP > "$T/schema_apres_retours.sql"; $EMP > "$T/empreinte_apres_retours.txt"
echo "— comparaison de structure : état initial / état après tous les retours arrière"
echo "  $(wc -l < "$T/empreinte_avant.txt") objets comparés (fonctions, politiques, colonnes, index, contraintes, déclencheurs, vues, RLS, droits)"
diff "$T/empreinte_avant.txt" "$T/empreinte_apres_retours.txt" > "$T/diff_retours.txt" && echo "  IDENTIQUE au contenu près (mise en forme ignorée)" || { echo "  ÉCARTS : $(grep -c '^[<>]' "$T/diff_retours.txt") ligne(s)"; grep '^[<>]' "$T/diff_retours.txt" | cut -d'|' -f1,2 | head -40 | sed 's/^/    /'; }
echo "— réapplication complète après retours arrière"
for m in $ORDRE; do $P -v ON_ERROR_STOP=1 -d essai -f "$M/$m.sql" >"$T/re_$m.log" 2>&1 && echo "  OK  $m" || { echo "  ÉCHEC $m"; grep ERROR "$T/re_$m.log" | head -3; }; done
