-- 0125_assistant_allergenes.sql
-- Assistant de régularisation des allergènes (Bella'Food).
-- • Une fiche par produit : état de CHACUN des 14 allergènes réglementaires
--   (present | traces | absent | inconnu), sources consultées, commentaire.
-- • Validation réservée à la fondatrice (RPC) : impossible tant qu'un des
--   14 allergènes reste « inconnu » ou qu'aucune source n'est indiquée.
--   Une absence n'est JAMAIS déduite : chaque « absent » est un choix explicite.
-- • Toute modification d'une fiche validée la repasse en brouillon
--   (le produit redevient non commandable jusqu'à nouvelle validation).
-- • Blocage des commandes : un produit est commandable si sa fiche est
--   validée, OU (règle existante inchangée) si ses allergènes renseignés
--   sont non vides et sans mention ambiguë.
-- Aucune donnée existante n'est modifiée ni supprimée.

create table if not exists public.food_allergenes_fiches (
  produit_id uuid primary key references public.catalogue_produits(id) on delete cascade,
  etats jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  commentaire text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide')),
  valide_par uuid,
  valide_le timestamptz,
  historique jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.food_allergenes_fiches enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'food_allergenes_fiches' and policyname = 'allergenes_fiches_lecture') then
    create policy allergenes_fiches_lecture on public.food_allergenes_fiches for select to authenticated
      using (public.is_fondatrice() or public.a_permission('bibliotheque.gerer', 'FOOD'));
  end if;
end $$;
-- Aucune écriture directe : uniquement par la fonction ci-dessous.

create or replace function public.food_allergenes_cles() returns text[] language sql immutable as $$
  select array['gluten','crustaces','oeufs','poissons','arachides','soja','lait','fruits_a_coque','celeri','moutarde','sesame','sulfites','lupin','mollusques']::text[];
$$;

create or replace function public.food_allergenes_enregistrer(p_produit uuid, p_etats jsonb, p_sources jsonb, p_commentaire text, p_valider boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; v text; manquants text[] := '{}'; ancien public.food_allergenes_fiches; etats jsonb := '{}'::jsonb;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  if not exists (select 1 from public.catalogue_produits where id = p_produit and business_unit = 'FOOD') then raise exception 'Produit Bella''Food introuvable'; end if;
  foreach k in array public.food_allergenes_cles() loop
    v := coalesce(p_etats->>k, 'inconnu');
    if v not in ('present', 'traces', 'absent', 'inconnu') then raise exception 'État invalide pour %', k; end if;
    etats := etats || jsonb_build_object(k, v);
    if v = 'inconnu' then manquants := manquants || k; end if;
  end loop;
  if p_valider then
    if array_length(manquants, 1) > 0 then
      return jsonb_build_object('ok', false, 'message', 'Validation impossible : information inconnue pour ' || array_to_string(manquants, ', '));
    end if;
    if jsonb_typeof(coalesce(p_sources, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_sources, '[]'::jsonb)) = 0 then
      return jsonb_build_object('ok', false, 'message', 'Validation impossible : indiquez au moins une source consultée');
    end if;
  end if;
  select * into ancien from public.food_allergenes_fiches where produit_id = p_produit for update;
  insert into public.food_allergenes_fiches as f (produit_id, etats, sources, commentaire, statut, valide_par, valide_le, historique, updated_at)
  values (p_produit, etats, coalesce(p_sources, '[]'::jsonb), p_commentaire,
          case when p_valider then 'valide' else 'brouillon' end,
          case when p_valider then auth.uid() end, case when p_valider then now() end,
          jsonb_build_array(jsonb_build_object('le', now(), 'par', auth.uid(), 'action', case when p_valider then 'validation' else 'brouillon' end)), now())
  on conflict (produit_id) do update set
    etats = excluded.etats, sources = excluded.sources, commentaire = excluded.commentaire,
    statut = excluded.statut, valide_par = excluded.valide_par, valide_le = excluded.valide_le, updated_at = now(),
    historique = (f.historique || jsonb_build_array(jsonb_build_object('le', now(), 'par', auth.uid(),
      'action', case when p_valider then 'validation' when f.statut = 'valide' then 'retour_brouillon' else 'brouillon' end,
      'avant', jsonb_build_object('etats', f.etats, 'statut', f.statut))));
  return jsonb_build_object('ok', true, 'statut', case when p_valider then 'valide' else 'brouillon' end, 'inconnus', to_jsonb(manquants));
end $$;
revoke all on function public.food_allergenes_enregistrer(uuid, jsonb, jsonb, text, boolean) from public, anon;
grant execute on function public.food_allergenes_enregistrer(uuid, jsonb, jsonb, text, boolean) to authenticated;

-- Libellés réglementaires (affichage client et commandes).
create or replace function public.food_allergene_libelle(k text) returns text language sql immutable as $$
  select case k when 'gluten' then 'Céréales contenant du gluten' when 'crustaces' then 'Crustacés' when 'oeufs' then 'Œufs'
    when 'poissons' then 'Poissons' when 'arachides' then 'Arachides' when 'soja' then 'Soja' when 'lait' then 'Lait'
    when 'fruits_a_coque' then 'Fruits à coque' when 'celeri' then 'Céleri' when 'moutarde' then 'Moutarde'
    when 'sesame' then 'Graines de sésame' when 'sulfites' then 'Anhydride sulfureux et sulfites' when 'lupin' then 'Lupin'
    when 'mollusques' then 'Mollusques' else k end;
$$;

-- Allergènes VALIDÉS d'un produit (null si aucune fiche validée).
create or replace function public.food_allergenes_valides(p_produit uuid) returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select array_agg(case when e.value #>> '{}' = 'traces' then 'Traces possibles : ' || public.food_allergene_libelle(e.key) else public.food_allergene_libelle(e.key) end order by e.key)
                   from jsonb_each(f.etats) e where e.value #>> '{}' in ('present', 'traces')), '{}'::text[])
  from public.food_allergenes_fiches f where f.produit_id = p_produit and f.statut = 'valide';
$$;

create or replace function public.food_produit_commandable(p_produit uuid, p_allergenes text[], p_recette uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.food_allergenes_fiches where produit_id = p_produit and statut = 'valide')
      or public.food_allergenes_renseignes(p_allergenes, p_recette);
$$;
grant execute on function public.food_produit_commandable(uuid, text[], uuid) to anon, authenticated;

create or replace view public.v_catalogue_food_public as
 select id, nom, categorie_slug, sous_categorie, description_courte, prix, prix_promotion, tags, galerie_photos, allergenes, ordre, business_unit,
    public.food_produit_commandable(id, allergenes, recette_id) as commandable,
    case when public.food_produit_commandable(id, allergenes, recette_id) then null::text else 'Fiche produit en cours de finalisation'::text end as mention
   from public.catalogue_produits p
  where business_unit = 'FOOD' and visible_client and disponible and statut = 'actif';

-- Allergènes affichés avant l'achat : la fiche validée fait foi.
create or replace function public.food_allergenes_produits(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(p.id, to_jsonb(coalesce(public.food_allergenes_valides(p.id), (
    select array_agg(distinct trim(a)) from unnest(coalesce(p.allergenes, '{}') || coalesce(r.allergenes, '{}')) a where coalesce(trim(a), '') <> ''), '{}'::text[]))), '{}'::jsonb)
  from public.catalogue_produits p left join public.food_recettes r on r.id = p.recette_id
  where p.id = any(p_ids[1:200]) and p.business_unit = 'FOOD' and p.statut = 'actif' and p.visible_client;
$$;
grant execute on function public.food_allergenes_produits(uuid[]) to anon, authenticated;
