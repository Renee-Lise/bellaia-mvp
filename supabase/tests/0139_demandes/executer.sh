#!/bin/sh
# Test de 0139 sur PostgreSQL 16 jetable. Usage (utilisateur postgres) : sh executer.sh /tmp/pg139
set -e
T="$1"; R=$(cd "$(dirname "$0")/../../.." && pwd); B=/usr/lib/postgresql/16/bin; M="$R/supabase/migrations"
rm -rf "$T/pg"; mkdir -p "$T"; $B/initdb -D "$T/pg" -U postgres -A trust >/dev/null
$B/pg_ctl -D "$T/pg" -o "-p 55439 -k $T -c listen_addresses=''" -l "$T/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"; P="$B/psql -h $T -p 55439 -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c 'create database essai' >/dev/null
$P -d essai -f "$R/supabase/tests/0129_secret_stories/1_environnement_supabase_minimal.sql" >/dev/null
$P -d essai >/dev/null <<'SQL'
create table if not exists auth.users (id uuid primary key);
insert into auth.users values ('00000000-0000-0000-0000-0000000000f1'),('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000e9');
insert into public.profiles(id, role) values ('00000000-0000-0000-0000-0000000000f1','fondatrice'),('00000000-0000-0000-0000-0000000000c1','cliente'),('00000000-0000-0000-0000-0000000000e9','cliente');
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice') $$;
create table public.bellaia_notifications (id uuid primary key default gen_random_uuid(), user_id uuid, type text, titre text, contenu text, lien text, lu boolean default false, created_at timestamptz default now(), meta jsonb);
SQL
$P -d essai -f "$M/0139_demandes_clients.sql" >/dev/null; $P -d essai -f "$M/0139_demandes_clients.sql" >/dev/null; echo "0139 appliquée deux fois (idempotence)"
$P -d essai -A -t -F ' | ' -f "$R/supabase/tests/0133_messagerie_securite/0_outils.sql" -f "$(dirname "$0")/scenarios.sql"
$P -d essai -f "$M/rollback/0139_demandes_clients_rollback.sql" >/dev/null && $P -d essai -A -t -c "select 'retour arrière : ' || (to_regclass('public.bellaia_demandes') is null)"
$P -d essai -f "$M/0139_demandes_clients.sql" >/dev/null && echo "réapplication sans erreur"
$B/pg_ctl -D "$T/pg" stop >/dev/null
