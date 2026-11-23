-- Outils de test : exécuter une requête sous l'identité d'un compte (rôle authenticated) ou d'un visiteur (anon).
create or replace function pg_temp.essai(sub text, q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
create or replace function pg_temp.compte(sub text, q text) returns int language plpgsql as $$
declare n int; begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q into n; execute 'reset role'; return n;
exception when others then execute 'reset role'; return -1; end $$;
create or replace function pg_temp.compte_anon(q text) returns int language plpgsql as $$
declare n int; begin perform set_config('request.jwt.claims', '{}', true); execute 'set local role anon'; execute q into n; execute 'reset role'; return n;
exception when others then execute 'reset role'; return -1; end $$;
