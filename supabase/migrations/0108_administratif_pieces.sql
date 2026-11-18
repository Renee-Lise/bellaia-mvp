-- ═══════════════════════════════════════════════════════════
-- 0108_administratif_pieces.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : module « Administratif » demandé par la fondatrice :
--   générer, modifier, copier, dupliquer, convertir, télécharger,
--   imprimer et partager : devis, factures, factures d'acompte, avoirs,
--   bons de commande, bons d'achat, bons de livraison, bons de
--   transport, bons d'envoi, bordereaux d'envoi et d'expédition, reçus,
--   courriers.
--
--   • bellaia_pieces : une ligne par document (lignes en JSON).
--   • bellaia_emetteurs : identité légale par pôle (SIRET, adresse,
--     mention TVA, IBAN, conditions) — à compléter par la fondatrice.
--   • bellaia_compteurs + bellaia_numeroter_piece() : numérotation
--     chronologique SANS TROU par type et par année (DEV-2026-0001…).
--     Factures, acomptes et avoirs ne sont numérotés qu'à la validation.
--   • Facture / acompte / avoir validés : contenu verrouillé et
--     suppression interdite (correction = avoir), conformément aux règles
--     de facturation. À la validation, la facture est aussi inscrite dans
--     bellaia_factures pour le suivi des paiements existant (idempotent).
-- Sécurité : fondatrice uniquement (is_fondatrice()).
-- Non destructif : création uniquement.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_emetteurs (
  bu text primary key,
  raison_sociale text, nom_commercial text, forme_juridique text, siret text, rcs_rm text,
  adresse text, code_postal text, ville text, pays text default 'Guyane française',
  telephone text, email text, site text, iban text, bic text,
  mention_tva text, tva_defaut numeric not null default 0,
  conditions_paiement text, penalites text, logo_url text, couleur text,
  updated_at timestamptz not null default now()
);

create table if not exists public.bellaia_pieces (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('devis','facture','facture_acompte','avoir','bon_commande','bon_achat','bon_livraison','bon_transport','bon_envoi','bordereau_envoi','bordereau_expedition','recu','courrier')),
  numero text unique,
  bu text not null default 'GENERAL',
  statut text not null default 'brouillon' check (statut in ('brouillon','valide','envoye','accepte','refuse','paye','annule')),
  objet text,
  date_document date not null default current_date,
  date_echeance date,
  emetteur jsonb not null default '{}'::jsonb,
  destinataire jsonb not null default '{}'::jsonb,
  lignes jsonb not null default '[]'::jsonb,
  remise_pct numeric not null default 0,
  acompte numeric not null default 0,
  total_ht numeric not null default 0,
  total_tva numeric not null default 0,
  total_ttc numeric not null default 0,
  champs jsonb not null default '{}'::jsonb,
  conditions text, notes text, mentions text,
  parent_id uuid references public.bellaia_pieces(id) on delete set null,
  source_table text, source_id text,
  historique jsonb not null default '[]'::jsonb,
  valide_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bellaia_pieces_type_date_idx on public.bellaia_pieces(type, date_document desc);
create index if not exists bellaia_pieces_parent_idx on public.bellaia_pieces(parent_id);
create index if not exists bellaia_pieces_source_idx on public.bellaia_pieces(source_table, source_id);

create table if not exists public.bellaia_compteurs (
  prefixe text not null, annee int not null, dernier int not null default 0,
  primary key (prefixe, annee)
);

-- Verrou des factures validées + horodatage
create or replace function public.bellaia_pieces_controle() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.type in ('facture','facture_acompte','avoir') and old.numero is not null then
      raise exception 'Document comptable numéroté (%) : suppression interdite. Annule-le par un avoir.', old.numero;
    end if;
    return old;
  end if;
  if old.type in ('facture','facture_acompte','avoir') and old.numero is not null and (
       new.lignes is distinct from old.lignes or new.total_ttc is distinct from old.total_ttc or new.total_ht is distinct from old.total_ht
    or new.destinataire is distinct from old.destinataire or new.emetteur is distinct from old.emetteur or new.date_document is distinct from old.date_document
    or new.numero is distinct from old.numero or new.type is distinct from old.type or new.remise_pct is distinct from old.remise_pct) then
    raise exception 'Facture validée (%) : contenu verrouillé. Pour corriger, crée un avoir.', old.numero;
  end if;
  new.updated_at := now();
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'bellaia_pieces_controle_upd') then
    create trigger bellaia_pieces_controle_upd before update on public.bellaia_pieces for each row execute function public.bellaia_pieces_controle();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bellaia_pieces_controle_del') then
    create trigger bellaia_pieces_controle_del before delete on public.bellaia_pieces for each row execute function public.bellaia_pieces_controle();
  end if;
end $$;

-- Numérotation sans trou (une seule fois par document)
create or replace function public.bellaia_numeroter_piece(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare p public.bellaia_pieces; pre text; an int; n int; num text;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  select * into p from public.bellaia_pieces where id = p_id for update;
  if not found then raise exception 'Document introuvable'; end if;
  if p.numero is not null then return p.numero; end if;
  pre := case p.type when 'devis' then 'DEV' when 'facture' then 'FAC' when 'facture_acompte' then 'FAA' when 'avoir' then 'AV'
    when 'bon_commande' then 'BC' when 'bon_achat' then 'BA' when 'bon_livraison' then 'BL' when 'bon_transport' then 'BT'
    when 'bon_envoi' then 'BE' when 'bordereau_envoi' then 'BDE' when 'bordereau_expedition' then 'BEX' when 'recu' then 'REC' else 'CR' end;
  an := extract(year from p.date_document)::int;
  insert into public.bellaia_compteurs (prefixe, annee, dernier) values (pre, an, 1)
    on conflict (prefixe, annee) do update set dernier = public.bellaia_compteurs.dernier + 1
    returning dernier into n;
  num := pre || '-' || an || '-' || lpad(n::text, 4, '0');
  update public.bellaia_pieces set numero = num,
    statut = case when p.type in ('facture','facture_acompte','avoir') then 'valide' else statut end,
    valide_le = case when p.type in ('facture','facture_acompte','avoir') then now() else valide_le end
  where id = p_id;
  -- Suivi des paiements existant (écran Factures / Compta)
  if p.type in ('facture','facture_acompte') then
    insert into public.bellaia_factures (reference, business_unit, source_table, client_nom, client_tel, client_email, lignes, sous_total, tva_total, total_ttc, acompte, acompte_paye, solde, statut, date_emission, date_echeance, notes)
    values (num, p.bu, 'bellaia_pieces', coalesce(p.destinataire->>'nom', ''), p.destinataire->>'telephone', p.destinataire->>'email', p.lignes,
            p.total_ht, p.total_tva, p.total_ttc, p.acompte, false, p.total_ttc - p.acompte, 'emise', p.date_document, p.date_echeance, 'Document ' || p.id::text)
    on conflict (reference) do nothing;
  end if;
  return num;
end $$;
revoke all on function public.bellaia_numeroter_piece(uuid) from public;
grant execute on function public.bellaia_numeroter_piece(uuid) to authenticated;

alter table public.bellaia_pieces enable row level security;
alter table public.bellaia_emetteurs enable row level security;
alter table public.bellaia_compteurs enable row level security; -- aucune policy : accès par la fonction uniquement
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bellaia_pieces' and policyname = 'bellaia_pieces_fondatrice') then
    create policy bellaia_pieces_fondatrice on public.bellaia_pieces for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bellaia_emetteurs' and policyname = 'bellaia_emetteurs_fondatrice') then
    create policy bellaia_emetteurs_fondatrice on public.bellaia_emetteurs for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- Pôles pré-créés (identité légale à compléter)
insert into public.bellaia_emetteurs (bu, nom_commercial, couleur)
select code, nom, couleur from public.business_units
on conflict (bu) do nothing;
