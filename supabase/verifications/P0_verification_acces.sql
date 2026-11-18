-- ═══════════════════════════════════════════════════════════
-- Vérification P0 — accès directs après fermeture (0115b + 0117)
-- LECTURE SEULE : le script se termine volontairement par un message
-- « RÉSULTAT … » affiché comme une erreur, ce qui annule tout.
-- Aucune donnée n'est créée, modifiée ni supprimée.
-- Résultat attendu :
--   anon et client : stocks=0, catalogue_produits=0, catalogue_variantes=0,
--     bsh_salons=0, bsh_salon_participants=0, payments=0, v_dashboard_*=0
--     v_catalogue_public / v_catalogue_food_public > 0 (boutiques)
--   fondatrice : mêmes chiffres qu'avant (tout visible)
-- ═══════════════════════════════════════════════════════════
do $$
declare
  res text := '';
  v bigint;
  ro text; uid uuid;
  o text;
  objets text[] := array['stocks','catalogue_produits','catalogue_variantes','bsh_salons','bsh_salon_participants',
                         'bellaia_commandes','payments','v_catalogue_public','v_catalogue_food_public','v_variantes_food_public'];
begin
  foreach ro in array array['anon','client','fondatrice'] loop
    uid := case ro
      when 'client' then (select id from public.profiles where role not in ('fondatrice','assistante') order by created_at limit 1)
      when 'fondatrice' then (select id from public.profiles where role = 'fondatrice' order by created_at limit 1)
    end;
    res := res || E'\n' || upper(ro) || ' : ';
    foreach o in array objets loop
      begin
        perform set_config('request.jwt.claims',
          case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'role', 'authenticated')::text end, true);
        if ro = 'anon' then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
        execute format('select count(*) from public.%I', o) into v;
        execute 'reset role';
        res := res || o || '=' || v || '  ';
      exception when others then
        execute 'reset role';
        res := res || o || '=REFUS  ';
      end;
    end loop;
  end loop;
  -- Colonnes sensibles absentes des vues publiques
  res := res || E'\nColonnes sensibles dans les vues publiques : ' || coalesce((
    select string_agg(table_name || '.' || column_name, ', ') from information_schema.columns
    where table_schema = 'public' and table_name in ('v_catalogue_public','v_catalogue_food_public','v_variantes_food_public')
      and column_name ~ '(achat|cout|marge|fournisseur)'), 'aucune');
  raise exception 'RÉSULTAT (rien n''a été modifié) : %', res;
end $$;
