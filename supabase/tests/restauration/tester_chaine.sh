#!/bin/bash
# Test de bout en bout de la chaîne sauvegarde → restauration → contrôle, SANS la production :
# une « production » PostgreSQL jetable + une imitation de la CLI Supabase (pg_dump, copie de fichiers).
# Usage (utilisateur postgres) : bash tester_chaine.sh <dossier_temporaire>
set -e
T="$1"; B=/usr/lib/postgresql/16/bin; R=$(cd "$(dirname "$0")/../../.." && pwd); rm -rf "$T"; mkdir -p "$T/bin" "$T/fauxstockage"
$B/initdb -D "$T/prod" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/prod" -o "-p 55451 -k $T -c listen_addresses=''" -l "$T/prod.log" start >/dev/null
P="$B/psql -h $T -p 55451 -U postgres -X -q"
$P -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null 2>&1 || true
$P <<'SQL' >/dev/null
create schema if not exists auth; create table if not exists auth.users(id uuid primary key, email text);
insert into auth.users(id,email) select gen_random_uuid(), 'compte'||g||'@exemple.invalid' from generate_series(1,3) g;
create table public.clients(id serial primary key, prenom text, note text);
create table public.commandes(id serial primary key, client_id int references public.clients, total numeric, info jsonb);
create table public.vide(id int);
insert into public.clients(prenom, note) select 'Prénom '||g, case when g%3=0 then E'ligne\navec saut ; et « guillemets »' end from generate_series(1,40) g;
insert into public.commandes(client_id,total,info) select (g%40)+1, g*1.5, jsonb_build_object('k',g) from generate_series(1,120) g;
create schema if not exists storage; create table if not exists storage.objects(bucket_id text, name text); alter table storage.objects add column if not exists metadata jsonb;
SQL
# Fichiers du « stockage » (dont sous-dossiers et noms accentués) + leur description dans storage.objects
for b in medias images; do mkdir -p "$T/fauxstockage/$b/evt 1"; done
for i in 1 2 3 4 5; do head -c $((i*1000+7)) /dev/urandom > "$T/fauxstockage/medias/evt 1/photo_é$i.jpg"; done
head -c 5000 /dev/urandom > "$T/fauxstockage/images/a.png"; head -c 12 /dev/urandom > "$T/fauxstockage/images/evt 1/b.webp"
( cd "$T/fauxstockage" && find . -type f | while IFS= read -r f; do f=${f#./}; b=${f%%/*}; n=${f#*/}; s=$(wc -c < "$f"); echo "insert into storage.objects(bucket_id,name,metadata) values ('$b','$n','{\"size\":$s}');"; done ) | $P >/dev/null
# Imitation de la CLI Supabase
cat > "$T/bin/supabase" <<SH
#!/bin/bash
D="$B/pg_dump -h $T -p 55451 -U postgres"
case "\$1 \$2" in
  "link "*) exit 0;;
  "db dump") f=\$(echo "\$@" | sed 's/.*-f //;s/ .*//')
     if echo "\$@" | grep -q -- --role-only; then echo "-- rôles (imitation)" > "\$f"
     elif echo "\$@" | grep -q -- '--schema auth'; then \$D --data-only --column-inserts -n auth > "\$f"
     elif echo "\$@" | grep -q -- --data-only; then \$D --data-only --column-inserts -n public > "\$f"
     else \$D --schema-only -n public > "\$f"; fi;;
  "storage cp") src=\$(echo "\$4" | sed 's#ss:///##'); [ "\$src" = images ] && mkdir -p "\$5/images" && cp -r "$T/fauxstockage/images/." "\$5/images/" || { [ -d "$T/fauxstockage/\$src" ] && cp -r "$T/fauxstockage/\$src/." "\$5/"; }; exit 0;;
esac
SH
chmod +x "$T/bin/supabase"
sed 's/^COMPARTIMENTS=.*/COMPARTIMENTS="medias images absent"/' "$R/supabase/sauvegarde/sauvegarde_complete.sh" > "$T/sauvegarde.sh"; cp "$R/supabase/sauvegarde/manifeste_stockage.sh" "$T/"
PATH="$T/bin:$PATH" bash "$T/sauvegarde.sh" "$T/export" > "$T/sauvegarde.log" 2>&1
S=$(ls -d "$T"/export/bellaia_sauvegarde_*); echo "sauvegarde produite : $(ls "$S" | tr '\n' ' ')"
# Références « production » (mêmes requêtes que sur la vraie base)
{ echo "table;lignes"; for t in clients commandes vide; do echo "$t;$($P -A -t -c "select count(*) from public.$t")"; done; } > "$T/ref_tables.csv"
$P -A -t -F "$(printf '\t')" -c "select bucket_id, count(*), sum((metadata->>'size')::bigint), md5(string_agg(name||'|'||coalesce(metadata->>'size','0'), E'\n' order by name collate \"C\")) from storage.objects group by 1 order by 1" > "$T/ref_stockage.tsv"
COMPTES=$($P -A -t -c "select count(*) from auth.users")
V="$R/supabase/tests/restauration/verifier_restauration.sh"
r() { echo "── $1"; sh "$V" "$T/v" "$S" "$T/ref_tables.csv" "$T/ref_stockage.tsv" "$COMPTES" | tail -1; }
r "A. sauvegarde intacte (attendu COMPLET)"
$P -c "delete from public.commandes where id=7" >/dev/null; { echo "table;lignes"; for t in clients commandes vide; do echo "$t;$($P -A -t -c "select count(*) from public.$t")"; done; } > "$T/ref_tables.csv"
r "B. la production a changé après l'export (attendu ÉCARTS)"
$P -c "insert into public.commandes(id,client_id,total) values (7,8,10.5)" >/dev/null; { echo "table;lignes"; for t in clients commandes vide; do echo "$t;$($P -A -t -c "select count(*) from public.$t")"; done; } > "$T/ref_tables.csv"
cp -r "$S" "$T/copie"; rm "$S/stockage/medias/photo_é3.jpg" 2>/dev/null || rm "$S/stockage/medias/evt 1/photo_é3.jpg"; bash "$T/manifeste_stockage.sh" "$S/stockage" > "$S/manifeste_stockage.tsv"
r "C. un fichier du stockage manque (attendu ÉCARTS)"
rm -rf "$S"; cp -r "$T/copie" "$S"; sed -i '0,/^INSERT INTO public.clients/{/^INSERT INTO public.clients/d}' "$S/donnees.sql"
r "D. données altérées après la sauvegarde (attendu ÉCARTS)"
rm -rf "$S"; cp -r "$T/copie" "$S"
r "E. sauvegarde rétablie (attendu COMPLET)"
$B/pg_ctl -D "$T/prod" stop >/dev/null
