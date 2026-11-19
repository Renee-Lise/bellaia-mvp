-- 0126 : durcissement après contrôles de sécurité (19/11)
revoke all on function public.food_allergenes_valides(uuid) from public, anon;
grant execute on function public.food_allergenes_valides(uuid) to authenticated, service_role;
revoke all on table public.food_allergenes_fiches from anon;
revoke all on table public.bellaia_packs_admin from anon;
alter function public.food_allergenes_cles() set search_path = public;
alter function public.food_allergene_libelle(text) set search_path = public;
