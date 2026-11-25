-- ═══════════════════════════════════════════════════════════
-- 0148 — Boutique numérique : produits téléchargeables, droits d'accès des acheteurs, journal des
-- téléchargements, facture automatique dans la numérotation EXISTANTE (compteur FAC de bellaia_compteurs).
-- PRÉPARÉE, NON APPLIQUÉE. Application après sauvegarde restaurée (« COMPLET ») et accord explicite.
-- Réutilise : catalogue_produits (catalogue), stripe_payment_intents / stripe_payment_history (suivi Stripe),
-- bellaia_factures + bellaia_compteurs (facturation, aucune seconde numérotation), bellaia_paiements.
-- Sécurité : les fichiers vendus sont dans un compartiment PRIVÉ, sans aucune règle d'accès client :
-- seul le serveur (après contrôle du droit) produit un lien temporaire. Les droits ne sont accordés que par
-- boutique_accorder_droits(), appelable uniquement par le rôle serveur, après paiement confirmé par Stripe.
-- Idempotente. Retour arrière : rollback/0148_boutique_numerique_rollback.sql
-- ═══════════════════════════════════════════════════════════

-- 1. Catalogue : champs des produits numériques (colonnes ajoutées, aucune donnée modifiée)
alter table public.catalogue_produits add column if not exists type_produit text not null default 'physique';
alter table public.catalogue_produits add column if not exists fichier_chemin text;      -- compartiment boutique-fichiers (privé)
alter table public.catalogue_produits add column if not exists apercu_chemin text;       -- compartiment boutique-apercus (public)
alter table public.catalogue_produits add column if not exists version_fichier text;
alter table public.catalogue_produits add column if not exists format_fichier text;
alter table public.catalogue_produits add column if not exists nb_pages integer;
alter table public.catalogue_produits add column if not exists licence text;
alter table public.catalogue_produits add column if not exists public_age text not null default 'tout_public';
do $$ begin
  alter table public.catalogue_produits add constraint catalogue_type_produit_valide check (type_produit in ('physique','numerique','service'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catalogue_produits add constraint catalogue_public_age_valide check (public_age in ('tout_public','jeunesse','adulte'));
exception when duplicate_object then null; end $$;

-- 2. Compartiments de fichiers
insert into storage.buckets (id, name, public) values ('boutique-fichiers', 'boutique-fichiers', false) on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public) values ('boutique-apercus', 'boutique-apercus', true) on conflict (id) do nothing;
drop policy if exists boutique_apercus_lecture on storage.objects;
create policy boutique_apercus_lecture on storage.objects for select using (bucket_id = 'boutique-apercus');
drop policy if exists boutique_fondatrice_fichiers on storage.objects;
create policy boutique_fondatrice_fichiers on storage.objects for all to authenticated
  using (bucket_id in ('boutique-fichiers','boutique-apercus') and public.is_fondatrice())
  with check (bucket_id in ('boutique-fichiers','boutique-apercus') and public.is_fondatrice());

-- 3. Droits d'accès (bibliothèque « Mes achats et documents »)
create table if not exists public.boutique_droits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  produit_id uuid not null references public.catalogue_produits(id),
  paiement_stripe_id uuid references public.stripe_payment_intents(id),
  facture_id uuid references public.bellaia_factures(id),
  prix_paye_cts integer not null check (prix_paye_cts >= 0),
  version_achetee text,
  accorde_le timestamptz not null default now(),
  revoque_le timestamptz,
  motif_revocation text
);
create unique index if not exists boutique_droits_un_actif on public.boutique_droits (user_id, produit_id) where revoque_le is null;
alter table public.boutique_droits enable row level security;
drop policy if exists boutique_droits_lecture on public.boutique_droits;
create policy boutique_droits_lecture on public.boutique_droits for select to authenticated using (user_id = auth.uid() or public.is_fondatrice());
-- Aucune règle d'écriture : seules les fonctions serveur ci-dessous écrivent.

create table if not exists public.boutique_telechargements (
  id bigint generated always as identity primary key,
  droit_id uuid not null references public.boutique_droits(id),
  user_id uuid not null,
  le timestamptz not null default now()
);
alter table public.boutique_telechargements enable row level security;
drop policy if exists boutique_telechargements_lecture on public.boutique_telechargements;
create policy boutique_telechargements_lecture on public.boutique_telechargements for select to authenticated using (user_id = auth.uid() or public.is_fondatrice());

-- 4. Un même événement Stripe n'est traité qu'une fois (webhooks reçus plusieurs fois)
do $$ begin
  if not exists (select 1 from public.stripe_payment_history where stripe_event_id is not null group by stripe_event_id having count(*) > 1) then
    create unique index if not exists stripe_history_evenement_unique on public.stripe_payment_history (stripe_event_id) where stripe_event_id is not null;
  end if;
end $$;

-- 5. Attribution des droits après paiement confirmé — SERVEUR UNIQUEMENT, idempotente
create or replace function public.boutique_accorder_droits(p_paiement uuid, p_evenement text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.stripe_payment_intents; f uuid; an int := extract(year from now())::int; n int; l jsonb;
begin
  insert into public.stripe_payment_history (payment_id, nouveau_statut, stripe_event_id, event_type)
    values (p_paiement, 'paye', p_evenement, 'checkout.session.completed')
    on conflict do nothing;
  select * into v from public.stripe_payment_intents where id = p_paiement for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  if v.module is distinct from 'boutique' then raise exception 'Paiement hors boutique'; end if;
  if v.statut = 'paye' then   -- déjà traité : on renvoie la facture existante, rien n'est créé deux fois
    return (select facture_id from public.boutique_droits where paiement_stripe_id = p_paiement limit 1);
  end if;
  insert into public.bellaia_compteurs (prefixe, annee, dernier) values ('FAC', an, 1)
    on conflict (prefixe, annee) do update set dernier = public.bellaia_compteurs.dernier + 1 returning dernier into n;
  insert into public.bellaia_factures (reference, business_unit, source_table, client_id, client_nom, client_email, lignes,
      sous_total, tva_total, total_ttc, acompte, acompte_paye, solde, statut, date_emission, notes)
    values ('FAC-' || an || '-' || lpad(n::text, 4, '0'), 'BOUTIQUE', 'stripe_payment_intents', v.client_id, v.client_nom, v.client_email, v.items_json,
      v.montant_total_cts / 100.0, 0, v.montant_total_cts / 100.0, 0, true, 0, 'payee', current_date,
      'Vente de contenu numérique — paiement Stripe ' || coalesce(v.stripe_checkout_session_id, ''))
    returning id into f;
  for l in select * from jsonb_array_elements(coalesce(v.items_json, '[]'::jsonb)) loop
    insert into public.boutique_droits (user_id, produit_id, paiement_stripe_id, facture_id, prix_paye_cts, version_achetee)
      select v.client_id, (l->>'produit_id')::uuid, p_paiement, f, (l->>'prix_cts')::int, c.version_fichier
      from public.catalogue_produits c where c.id = (l->>'produit_id')::uuid
      on conflict do nothing;
  end loop;
  insert into public.bellaia_paiements (reference, facture_id, business_unit, montant, mode, statut, date_paiement, provider, provider_reference, client_id, client_nom, client_email, module)
    values ('PAY-' || an || '-' || lpad(n::text, 4, '0'), f, 'BOUTIQUE', v.montant_total_cts / 100.0, 'carte', 'recu', now(), 'stripe', v.stripe_checkout_session_id, v.client_id, v.client_nom, v.client_email, 'boutique');
  update public.stripe_payment_intents set statut = 'paye', paye_at = now(), updated_at = now() where id = p_paiement;
  return f;
end $$;

create or replace function public.boutique_retirer_droits(p_paiement uuid, p_evenement text, p_motif text)
returns integer language plpgsql security definer set search_path = public as $$
declare k integer;
begin
  insert into public.stripe_payment_history (payment_id, nouveau_statut, stripe_event_id, event_type)
    values (p_paiement, 'rembourse', p_evenement, 'charge.refunded') on conflict do nothing;
  update public.boutique_droits set revoque_le = now(), motif_revocation = left(p_motif, 200)
    where paiement_stripe_id = p_paiement and revoque_le is null;
  get diagnostics k = row_count;
  update public.stripe_payment_intents set statut = 'rembourse', updated_at = now() where id = p_paiement;
  return k;
end $$;

-- Journal d'un téléchargement : seulement pour un droit actif de la personne connectée.
create or replace function public.boutique_noter_telechargement(p_produit uuid)
returns text language plpgsql security definer set search_path = public as $$
declare d public.boutique_droits; chemin text;
begin
  select * into d from public.boutique_droits where user_id = auth.uid() and produit_id = p_produit and revoque_le is null;
  if not found then raise exception 'Aucun droit sur ce produit'; end if;
  select fichier_chemin into chemin from public.catalogue_produits where id = p_produit;
  if chemin is null then raise exception 'Fichier indisponible'; end if;
  insert into public.boutique_telechargements (droit_id, user_id) values (d.id, auth.uid());
  return chemin;
end $$;

revoke all on function public.boutique_accorder_droits(uuid, text), public.boutique_retirer_droits(uuid, text, text) from public, anon, authenticated;
revoke all on function public.boutique_noter_telechargement(uuid) from public, anon;
grant execute on function public.boutique_noter_telechargement(uuid) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.boutique_accorder_droits(uuid, text), public.boutique_retirer_droits(uuid, text, text) to service_role;
  end if;
end $$;
