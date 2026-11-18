-- ═══════════════════════════════════════════════════════════
-- 0118_reductions_allergenes_commandes.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Demande fondatrice : « possibilité de faire des réductions » et
-- « allergènes automatiquement insérés sur les commandes ».
--  • bellaia_reductions : codes promo / réductions (pourcentage ou
--    montant), par univers, période, minimum, nombre d'utilisations,
--    une par cliente ; gérées par la fondatrice uniquement.
--  • Application CÔTÉ SERVEUR uniquement (fonction réservée au serveur
--    et à la fondatrice) ; la cliente ne peut que prévisualiser un code.
--  • Réduction manuelle de la fondatrice sur une commande (colonnes).
--  • Commandes : allergènes repris des fiches produits / recettes,
--    tels qu'écrits ; « à vérifier » quand l'information manque
--    (jamais d'absence déduite).
-- Ajouts uniquement : aucune donnée modifiée ni supprimée.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_reductions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  libelle text not null,
  type text not null check (type in ('pourcentage','montant')),
  valeur numeric(10,2) not null check (valeur > 0),
  univers text not null default '*',
  date_debut date, date_fin date,
  minimum_commande numeric(10,2),
  utilisations_max integer, utilisations integer not null default 0,
  une_par_cliente boolean not null default false,
  actif boolean not null default true,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (type <> 'pourcentage' or valeur <= 100),
  check (code is null or code = upper(code))
);
create table if not exists public.bellaia_reductions_usages (
  id uuid primary key default gen_random_uuid(),
  reduction_id uuid not null references public.bellaia_reductions(id),
  commande_ref text, client_id uuid, remise_centimes integer not null,
  created_at timestamptz not null default now()
);
alter table public.bellaia_reductions enable row level security;
alter table public.bellaia_reductions_usages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_reductions' and policyname='reductions_fondatrice') then
    create policy reductions_fondatrice on public.bellaia_reductions for all to authenticated using (public.a_permission('reductions.gerer')) with check (public.a_permission('reductions.gerer'));
    create policy reductions_usages_fondatrice on public.bellaia_reductions_usages for select to authenticated using (public.a_permission('reductions.gerer'));
  end if;
end $$;

alter table public.bellaia_commandes add column if not exists total_avant_remise numeric(10,2);
alter table public.bellaia_commandes add column if not exists remise_montant numeric(10,2) not null default 0;
alter table public.bellaia_commandes add column if not exists remise_libelle text;
alter table public.bellaia_commandes add column if not exists reduction_code text;
alter table public.bellaia_commandes add column if not exists allergenes text[] not null default '{}';
alter table public.bellaia_commandes add column if not exists allergenes_a_verifier boolean not null default false;

-- Calcul (sans effet) : validité + remise en centimes.
create or replace function public.reduction_evaluer(p_code text, p_univers text, p_montant_centimes integer, p_client uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.bellaia_reductions; remise bigint; deja int;
begin
  if coalesce(trim(p_code), '') = '' then return jsonb_build_object('valide', false, 'message', 'Code manquant'); end if;
  select * into r from public.bellaia_reductions where code = upper(trim(p_code));
  if r.id is null or not r.actif then return jsonb_build_object('valide', false, 'message', 'Code inconnu ou inactif'); end if;
  if r.univers <> '*' and r.univers <> upper(coalesce(p_univers, '')) then return jsonb_build_object('valide', false, 'message', 'Code non valable pour cette boutique'); end if;
  if r.date_debut is not null and current_date < r.date_debut then return jsonb_build_object('valide', false, 'message', 'Code pas encore actif'); end if;
  if r.date_fin is not null and current_date > r.date_fin then return jsonb_build_object('valide', false, 'message', 'Code expiré'); end if;
  if r.utilisations_max is not null and r.utilisations >= r.utilisations_max then return jsonb_build_object('valide', false, 'message', 'Code épuisé'); end if;
  if r.minimum_commande is not null and p_montant_centimes < round(r.minimum_commande * 100) then
    return jsonb_build_object('valide', false, 'message', 'Minimum de commande : ' || replace(to_char(r.minimum_commande, 'FM999990.00'), '.', ',') || ' €');
  end if;
  if r.une_par_cliente then
    if p_client is null then return jsonb_build_object('valide', false, 'message', 'Connectez-vous pour utiliser ce code'); end if;
    select count(*) into deja from public.bellaia_reductions_usages where reduction_id = r.id and client_id = p_client;
    if deja > 0 then return jsonb_build_object('valide', false, 'message', 'Code déjà utilisé'); end if;
  end if;
  remise := case when r.type = 'pourcentage' then round(p_montant_centimes * r.valeur / 100) else round(r.valeur * 100) end;
  remise := least(remise, p_montant_centimes);
  return jsonb_build_object('valide', true, 'reduction_id', r.id, 'code', r.code, 'libelle', r.libelle, 'remise_centimes', remise);
end $$;

-- Aperçu côté cliente (aucune liste des codes, aucun effet).
create or replace function public.reduction_apercu(p_code text, p_univers text, p_montant_centimes integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select (public.reduction_evaluer(p_code, p_univers, greatest(coalesce(p_montant_centimes, 0), 0), auth.uid())) - 'reduction_id';
$$;
grant execute on function public.reduction_apercu(text, text, integer) to anon, authenticated;

-- Consommation : réservée au serveur (service) et à la fondatrice.
create or replace function public.reduction_consommer(p_code text, p_univers text, p_montant_centimes integer, p_client uuid, p_commande_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.a_permission('reductions.gerer') then raise exception 'Réservé au serveur'; end if;
  perform 1 from public.bellaia_reductions where code = upper(trim(p_code)) for update;
  e := public.reduction_evaluer(p_code, p_univers, p_montant_centimes, p_client);
  if not (e->>'valide')::boolean then return e; end if;
  update public.bellaia_reductions set utilisations = utilisations + 1, updated_at = now() where id = (e->>'reduction_id')::uuid;
  insert into public.bellaia_reductions_usages (reduction_id, commande_ref, client_id, remise_centimes) values ((e->>'reduction_id')::uuid, p_commande_ref, p_client, (e->>'remise_centimes')::int);
  return e;
end $$;

-- Allergènes affichés AVANT l'achat (fiche produit + recette liée),
-- lecture seule, produits publiés uniquement ; aucune autre donnée.
create or replace function public.food_allergenes_produits(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(p.id, to_jsonb(coalesce((
    select array_agg(distinct trim(a)) from unnest(coalesce(p.allergenes, '{}') || coalesce(r.allergenes, '{}')) a where coalesce(trim(a), '') <> ''), '{}'::text[]))), '{}'::jsonb)
  from public.catalogue_produits p left join public.food_recettes r on r.id = p.recette_id
  where p.id = any(p_ids[1:200]) and p.business_unit = 'FOOD' and p.statut = 'actif' and p.visible_client;
$$;
grant execute on function public.food_allergenes_produits(uuid[]) to anon, authenticated;
