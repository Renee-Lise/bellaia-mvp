-- Lecture d'un canal temps réel sous l'identité d'un compte (le paramètre realtime.topic simule le canal demandé).
create or replace function pg_temp.canal(sub text, sujet text) returns int language plpgsql as $$
declare n int; begin
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); perform set_config('realtime.topic', sujet, true);
  execute 'set local role authenticated';
  begin insert into realtime.messages (topic, payload) values (sujet, '{"t":"position"}'); n := 1; exception when others then n := 0; end;
  execute 'reset role'; return n;
exception when others then execute 'reset role'; return -1; end $$;
