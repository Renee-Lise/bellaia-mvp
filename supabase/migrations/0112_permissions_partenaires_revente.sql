-- ═══════════════════════════════════════════════════════════
-- 0112_permissions_partenaires_revente.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Objet (demande fondatrice du 18/11, phase « sécurisation, équipe ») :
--  A. Permissions réelles : rôles multiples par compte (bellaia_roles),
--     permissions accordées / retirées par la fondatrice
--     (bellaia_permissions), journal des accès sensibles (bellaia_journal).
--     → est_staff_bellaia() et is_assistante() ne donnent PLUS à une
--       assistante les droits de la fondatrice : seulement à la fondatrice
--       ou à qui elle accorde explicitement « acces_complet ».
--  B. Commandes : une commande créée par une cliente reste un BROUILLON
--     non payé, au total « à vérifier » (le prix ne fait pas foi).
--  C. Partenaires : organisations indépendantes (Vil'Dor Pâtisse),
--     statut administratif, autorisations par fonction, documents
--     privés ; ventes et versements DÉSACTIVÉS tant que non validé.
--  D. Collection « Bûches de Noël & Galettes des Rois » (revente) :
--     produits en brouillon, conditions fournisseur CONFIDENTIELLES
--     (table séparée, fondatrice uniquement), le partenaire ne voit que
--     son tarif et sa part, calculs en centimes côté serveur.
--  E. Actions requises : date limite, pièces jointes, historique,
--     dépendances.
-- Non destructif : aucune donnée supprimée. Aucun compte créé.
-- ═══════════════════════════════════════════════════════════

-- ── A. Rôles multiples, permissions, journal ────────────────
create table if not exists public.bellaia_organisations (
  id uuid primary key default gen_random_uuid(),
  nom_commercial text not null,
  type text not null default 'partenaire' check (type in ('interne','partenaire')),
  statut_admin text not null default 'en_creation' check (statut_admin in
    ('en_creation','immatriculation_en_cours','immatriculee','documents_a_verifier','partenaire_valide','suspendu')),
  forme_juridique text, siret text, activites text[] not null default '{}',
  adresse text, telephone text, email_pro text, domaine_souhaite text,
  ventes_actives boolean not null default false,
  versements_actifs boolean not null default false,
  checklist jsonb not null default '{}'::jsonb,
  notes_partenaire text, notes_fondatrice text,
  -- Situation professionnelle de la dirigeante (ex. agente publique) et
  -- dispositif juridique envisagé : informations déclarées, à vérifier.
  situation_dirigeante jsonb not null default '{}'::jsonb,
  dispositif_envisage text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.bellaia_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('assistante','prestataire','fournisseur','hote','collaborateur','qualite','autre')),
  organisation_id uuid references public.bellaia_organisations(id) on delete cascade,
  statut text not null default 'actif' check (statut in ('invite','actif','suspendu','revoque')),
  libelle text,
  accorde_par uuid default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists bellaia_roles_unique on public.bellaia_roles (user_id, role, coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.bellaia_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null,
  univers text not null default '*',
  accorde_par uuid default auth.uid(),
  expire_le timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, permission, univers)
);

create table if not exists public.bellaia_journal (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid(),
  action text not null, cible text, details jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.a_permission(p text, u text default '*') returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions bp
               where bp.user_id = auth.uid() and bp.permission in (p, 'acces_complet')
                 and (bp.univers = '*' or bp.univers = u) and (bp.expire_le is null or bp.expire_le > now()))
  );
$$;

create or replace function public.a_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bellaia_roles where user_id = auth.uid() and role = r and statut = 'actif');
$$;

create or replace function public.membre_organisation(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bellaia_roles where user_id = auth.uid() and organisation_id = org and statut = 'actif');
$$;

create or replace function public.membre_organisation_txt(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when t ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.membre_organisation(t::uuid) else false end;
$$;

-- Équipe = fondatrice, ou personne à qui elle a accordé « acces_complet ».
create or replace function public.est_staff_bellaia() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and (expire_le is null or expire_le > now())));
$$;
create or replace function public.is_assistante() returns boolean
language sql stable security definer set search_path = public as $$ select public.est_staff_bellaia(); $$;

alter table public.bellaia_organisations enable row level security;
alter table public.bellaia_roles enable row level security;
alter table public.bellaia_permissions enable row level security;
alter table public.bellaia_journal enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_organisations' and policyname='org_fondatrice') then
    create policy org_fondatrice on public.bellaia_organisations for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
    create policy org_membre_lecture on public.bellaia_organisations for select to authenticated using (public.membre_organisation(id));
  end if;
  if not exists (select 1 from pg_policies where tablename='bellaia_roles' and policyname='roles_fondatrice') then
    create policy roles_fondatrice on public.bellaia_roles for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
    create policy roles_moi on public.bellaia_roles for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='bellaia_permissions' and policyname='perms_fondatrice') then
    create policy perms_fondatrice on public.bellaia_permissions for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
    create policy perms_moi on public.bellaia_permissions for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='bellaia_journal' and policyname='journal_fondatrice') then
    create policy journal_fondatrice on public.bellaia_journal for select to authenticated using (public.is_fondatrice());
  end if;
end $$;

-- Journal automatique des changements de droits (non modifiable).
create or replace function public.journaliser_droits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_journal (action, cible, details)
  values (tg_table_name || '.' || lower(tg_op), coalesce(new.user_id, old.user_id)::text,
          jsonb_build_object('avant', to_jsonb(old), 'apres', to_jsonb(new)));
  return coalesce(new, old);
end $$;
drop trigger if exists trg_journal_roles on public.bellaia_roles;
create trigger trg_journal_roles after insert or update or delete on public.bellaia_roles for each row execute function public.journaliser_droits();
drop trigger if exists trg_journal_perms on public.bellaia_permissions;
create trigger trg_journal_perms after insert or update or delete on public.bellaia_permissions for each row execute function public.journaliser_droits();

-- La fondatrice relie un compte EXISTANT (par e-mail) à des rôles.
create or replace function public.fondatrice_lier_compte(p_email text, p_roles text[], p_organisation uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid; r text;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'Aucun compte avec cet e-mail : la personne doit d''abord créer son compte Bellaïa.'; end if;
  foreach r in array p_roles loop
    insert into public.bellaia_roles (user_id, role, organisation_id) values (uid, r, p_organisation)
    on conflict do nothing;
  end loop;
  update public.profiles set role = case when role in ('cliente','client') then 'partenaire' else role end where id = uid;
  return uid;
end $$;
revoke all on function public.fondatrice_lier_compte(text, text[], uuid) from public;
grant execute on function public.fondatrice_lier_compte(text, text[], uuid) to authenticated;

-- Annuaire équipe pour l'écran des permissions (fondatrice uniquement).
create or replace function public.fondatrice_equipe() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_fondatrice() then '[]'::jsonb else coalesce(jsonb_agg(x order by x->>'nom'), '[]'::jsonb) end from (
    select jsonb_build_object('id', p.id, 'nom', trim(coalesce(p.prenom,'') || ' ' || coalesce(p.nom,'')), 'email', u.email, 'role_profil', p.role,
      'roles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'role', r.role, 'statut', r.statut, 'organisation_id', r.organisation_id)) from public.bellaia_roles r where r.user_id = p.id), '[]'::jsonb),
      'permissions', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'permission', b.permission, 'univers', b.univers, 'expire_le', b.expire_le)) from public.bellaia_permissions b where b.user_id = p.id), '[]'::jsonb)) x
    from public.profiles p join auth.users u on u.id = p.id
    where p.role not in ('fondatrice','cliente','client') or exists (select 1 from public.bellaia_roles r where r.user_id = p.id)
  ) t;
$$;
revoke all on function public.fondatrice_equipe() from public;
grant execute on function public.fondatrice_equipe() to authenticated;

-- Mes rôles et permissions (pour afficher les bons espaces ; la sécurité
-- reste appliquée en base).
create or replace function public.mes_acces() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'fondatrice', public.is_fondatrice(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'organisation_id', r.organisation_id, 'organisation', o.nom_commercial, 'statut_organisation', o.statut_admin))
                       from public.bellaia_roles r left join public.bellaia_organisations o on o.id = r.organisation_id
                       where r.user_id = auth.uid() and r.statut = 'actif'), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(permission || ':' || univers) from public.bellaia_permissions where user_id = auth.uid() and (expire_le is null or expire_le > now())), '[]'::jsonb),
    'hote_bsh', public.est_hote_bsh());
$$;
grant execute on function public.mes_acces() to authenticated;

-- ── Missions : droits par rôle et par mission ───────────────
alter table public.bellaia_missions drop constraint if exists bellaia_missions_pole_check;
alter table public.bellaia_missions add constraint bellaia_missions_pole_check check (pole in ('GENERAL','FOOD','EVENTS','BSH','STUDIO','ODYSSEE','EDITIONS','MOTIPY','VILO','STRUCTURE','VILDOR'));
alter table public.bellaia_missions add column if not exists priorite smallint not null default 2;
alter table public.bellaia_missions add column if not exists echeance date;
alter table public.bellaia_missions add column if not exists commande_ref text;
alter table public.bellaia_missions add column if not exists organisation_id uuid references public.bellaia_organisations(id) on delete set null;
alter table public.bellaia_missions add column if not exists pieces_jointes jsonb not null default '[]'::jsonb;
alter table public.bellaia_missions add column if not exists livrables jsonb not null default '[]'::jsonb;
alter table public.bellaia_missions add column if not exists temps_passe_min integer;
alter table public.bellaia_missions add column if not exists simulation boolean not null default false;

alter policy missions_equipe on public.bellaia_missions using (public.a_permission('missions.gerer')) with check (public.a_permission('missions.gerer'));

create table if not exists public.bellaia_missions_fil (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.bellaia_missions(id) on delete cascade,
  auteur uuid default auth.uid(),
  type text not null default 'commentaire' check (type in ('commentaire','correction','validation','statut','fichier')),
  texte text, fichier_chemin text,
  created_at timestamptz not null default now()
);
alter table public.bellaia_missions_fil enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_missions_fil' and policyname='fil_lecture') then
    create policy fil_lecture on public.bellaia_missions_fil for select to authenticated using (
      public.a_permission('missions.gerer') or exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()));
    create policy fil_ecriture on public.bellaia_missions_fil for insert to authenticated with check (
      auteur = auth.uid() and (public.a_permission('missions.gerer')
        or (type in ('commentaire','fichier','statut') and exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()))));
  end if;
end $$;

-- La personne assignée fait avancer SA mission (jamais « fait » : la
-- validation appartient à la fondatrice) et dépose ses livrables.
create or replace function public.mission_maj_assignee(p_id uuid, p_statut text, p_commentaire text)
returns void language plpgsql security definer set search_path = public as $$
declare ancien text;
begin
  if p_statut not in ('a_faire','en_cours','a_valider') then raise exception 'Statut non autorisé : seule la fondatrice valide une mission.'; end if;
  select statut into ancien from public.bellaia_missions where id = p_id and assigne_a = auth.uid();
  if not found then raise exception 'Mission introuvable'; end if;
  if ancien in ('fait','annule') then raise exception 'Mission close'; end if;
  update public.bellaia_missions set statut = p_statut, commentaire_equipe = left(coalesce(p_commentaire, commentaire_equipe), 2000), updated_at = now() where id = p_id;
  if ancien is distinct from p_statut then
    insert into public.bellaia_missions_fil (mission_id, type, texte) values (p_id, 'statut', ancien || ' → ' || p_statut);
  end if;
end $$;

create or replace function public.mission_ajouter_livrable(p_id uuid, p_chemin text, p_nom text, p_lien_canva text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bellaia_missions where id = p_id and (assigne_a = auth.uid() or public.a_permission('missions.gerer'))) then raise exception 'Mission introuvable'; end if;
  if p_chemin is not null and p_chemin !~ ('^missions/' || p_id::text || '/') then raise exception 'Chemin de fichier invalide'; end if;
  update public.bellaia_missions set
    livrables = livrables || jsonb_build_array(jsonb_build_object('chemin', p_chemin, 'nom', left(p_nom, 200), 'le', now(), 'par', auth.uid())),
    lien_canva = coalesce(nullif(p_lien_canva, ''), lien_canva),
    statut = case when statut in ('a_faire','en_cours') then 'a_valider' else statut end, updated_at = now()
  where id = p_id;
  insert into public.bellaia_missions_fil (mission_id, type, texte, fichier_chemin) values (p_id, 'fichier', left(p_nom, 200), p_chemin);
end $$;
revoke all on function public.mission_ajouter_livrable(uuid, text, text, text) from public;
grant execute on function public.mission_ajouter_livrable(uuid, text, text, text) to authenticated;

-- Commandes nécessaires à MES missions : uniquement ce qu'il faut pour
-- produire (référence, date, articles, quantités) — ni prix ni contact.
create or replace function public.mes_commandes_missions() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('reference', c.reference, 'date_livraison', c.date_livraison, 'statut', c.statut, 'mission', m.titre,
    'articles', (select coalesce(jsonb_agg(jsonb_build_object('libelle', l->>'libelle', 'qte', l->'qte')), '[]'::jsonb)
                 from jsonb_array_elements(case when jsonb_typeof(c.lignes) = 'array' then c.lignes when jsonb_typeof(c.lignes) = 'string' then (c.lignes #>> '{}')::jsonb else '[]'::jsonb end) l))), '[]'::jsonb)
  from public.bellaia_missions m join public.bellaia_commandes c on c.reference = m.commande_ref
  where m.assigne_a = auth.uid() and m.statut not in ('fait','annule');
$$;
grant execute on function public.mes_commandes_missions() to authenticated;

-- Stockage privé des missions et des documents partenaires.
insert into storage.buckets (id, name, public) values ('equipe-prive', 'equipe-prive', false) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='equipe_prive_lecture') then
    create policy equipe_prive_lecture on storage.objects for select to authenticated using (bucket_id = 'equipe-prive' and (
      public.is_fondatrice()
      or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(name))[2] and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer'))))
      or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))));
    create policy equipe_prive_depot on storage.objects for insert to authenticated with check (bucket_id = 'equipe-prive' and (
      public.is_fondatrice()
      or ((storage.foldername(name))[1] = 'missions' and exists (select 1 from public.bellaia_missions m where m.id::text = (storage.foldername(name))[2] and (m.assigne_a = auth.uid() or public.a_permission('missions.gerer'))))
      or ((storage.foldername(name))[1] = 'organisations' and public.membre_organisation_txt((storage.foldername(name))[2]))));
  end if;
end $$;

-- ── B. Commandes créées par une cliente ─────────────────────
alter table public.bellaia_commandes add column if not exists total_verifie boolean not null default true;
alter table public.bellaia_commandes alter column created_by set default auth.uid();
create or replace function public.commande_client_controle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.est_staff_bellaia() or auth.uid() is null then return new; end if; -- service serveur ou équipe
  if tg_op = 'INSERT' then
    new.statut := 'BROUILLON'; new.acompte := 0; new.acompte_paye := false;
    new.solde := new.total; new.total_verifie := false; new.created_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists trg_commande_client_controle on public.bellaia_commandes;
create trigger trg_commande_client_controle before insert on public.bellaia_commandes for each row execute function public.commande_client_controle();
alter policy bellaia_commandes_creer on public.bellaia_commandes with check (public.est_staff_bellaia() or (statut = 'BROUILLON' and coalesce(acompte_paye, false) = false and created_by = auth.uid()));

-- ── C. Partenaires : autorisations et documents ─────────────
create table if not exists public.bellaia_autorisations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.bellaia_organisations(id) on delete cascade,
  fonction text not null check (fonction in ('patisserie','assistante_cuisine','hotesse')),
  statut text not null default 'a_demander' check (statut in ('a_demander','demandee','accordee','refusee','expiree','non_requise')),
  type_autorisation text, organisme text, date_demande date, date_delivrance date, date_fin date,
  activites_autorisees text, restrictions text, document_id uuid,
  validee_par_fondatrice boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organisation_id, fonction)
);
create table if not exists public.bellaia_documents_partenaire (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.bellaia_organisations(id) on delete cascade,
  categorie text not null default 'autre',
  titre text not null, chemin text not null, sha256 text, taille integer, type_mime text,
  statut text not null default 'a_verifier' check (statut in ('a_verifier','valide','refuse','expire')),
  expire_le date, version integer not null default 1, remplace_id uuid,
  depose_par uuid default auth.uid(), verifie_par uuid, verifie_le timestamptz, commentaire text,
  created_at timestamptz not null default now()
);
create unique index if not exists docs_partenaire_doublon on public.bellaia_documents_partenaire (organisation_id, sha256) where sha256 is not null;
alter table public.bellaia_autorisations enable row level security;
alter table public.bellaia_documents_partenaire enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_autorisations' and policyname='autor_fondatrice') then
    create policy autor_fondatrice on public.bellaia_autorisations for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
    create policy autor_membre_lecture on public.bellaia_autorisations for select to authenticated using (public.membre_organisation(organisation_id));
    create policy autor_membre_saisie on public.bellaia_autorisations for insert to authenticated with check (public.membre_organisation(organisation_id) and validee_par_fondatrice = false);
    create policy autor_membre_maj on public.bellaia_autorisations for update to authenticated using (public.membre_organisation(organisation_id) and validee_par_fondatrice = false) with check (public.membre_organisation(organisation_id) and validee_par_fondatrice = false);
  end if;
  if not exists (select 1 from pg_policies where tablename='bellaia_documents_partenaire' and policyname='docp_fondatrice') then
    create policy docp_fondatrice on public.bellaia_documents_partenaire for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
    create policy docp_membre_lecture on public.bellaia_documents_partenaire for select to authenticated using (public.membre_organisation(organisation_id));
    create policy docp_membre_depot on public.bellaia_documents_partenaire for insert to authenticated with check (public.membre_organisation(organisation_id) and statut = 'a_verifier' and chemin like ('organisations/' || organisation_id::text || '/%'));
  end if;
end $$;

-- Le partenaire met à jour SON profil (jamais statut, ventes, versements).
create or replace function public.partenaire_maj_profil(p_org uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.membre_organisation(p_org) then raise exception 'Accès refusé'; end if;
  update public.bellaia_organisations set
    forme_juridique = coalesce(p->>'forme_juridique', forme_juridique),
    siret = case when p ? 'siret' then nullif(regexp_replace(p->>'siret', '\s', '', 'g'), '') else siret end,
    adresse = coalesce(p->>'adresse', adresse), telephone = coalesce(p->>'telephone', telephone),
    email_pro = coalesce(p->>'email_pro', email_pro), domaine_souhaite = case when p ? 'domaine_souhaite' then nullif(p->>'domaine_souhaite', '') else domaine_souhaite end,
    notes_partenaire = coalesce(p->>'notes_partenaire', notes_partenaire),
    checklist = case when p ? 'checklist' then p->'checklist' else checklist end,
    updated_at = now()
  where id = p_org;
end $$;
grant execute on function public.partenaire_maj_profil(uuid, jsonb) to authenticated;

-- Garde-fous : SIRET plausible (14 chiffres, clé de Luhn) ; ventes et
-- versements impossibles sans « partenaire validé » + SIRET.
create or replace function public.organisation_controle() returns trigger
language plpgsql set search_path = public as $$
declare s int := 0; d int; i int;
begin
  if new.siret is not null then
    if new.siret !~ '^\d{14}$' then raise exception 'SIRET invalide : 14 chiffres attendus'; end if;
    for i in 1..14 loop
      d := substr(new.siret, 15 - i, 1)::int;
      if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
      s := s + d;
    end loop;
    if s % 10 <> 0 and new.siret !~ '^356000000' then raise exception 'SIRET invalide (clé de contrôle)'; end if;
  end if;
  if (new.ventes_actives or new.versements_actifs) and (new.statut_admin <> 'partenaire_valide' or new.siret is null) then
    raise exception 'Ventes et versements réservés à un partenaire validé avec un SIRET vérifié';
  end if;
  if new.statut_admin = 'suspendu' then new.ventes_actives := false; new.versements_actifs := false; end if;
  return new;
end $$;
drop trigger if exists trg_organisation_controle on public.bellaia_organisations;
create trigger trg_organisation_controle before insert or update on public.bellaia_organisations for each row execute function public.organisation_controle();

-- Une mission confiée à une PARTENAIRE reste en simulation tant que
-- l'autorisation de la fonction concernée n'est pas accordée ET validée
-- par la fondatrice. Une fonction validée n'active jamais les autres.
create or replace function public.mission_controle_autorisation() returns trigger
language plpgsql security definer set search_path = public as $$
declare f text; org uuid;
begin
  if new.assigne_a is null then new.simulation := false; return new; end if;
  select r.organisation_id into org from public.bellaia_roles r join public.bellaia_organisations o on o.id = r.organisation_id
   where r.user_id = new.assigne_a and r.statut = 'actif' and o.type = 'partenaire' limit 1;
  if org is null then new.simulation := false; return new; end if;
  f := case new.type when 'patisserie' then 'patisserie' when 'hotesse' then 'hotesse' else 'assistante_cuisine' end;
  new.organisation_id := coalesce(new.organisation_id, org);
  new.simulation := not exists (select 1 from public.bellaia_autorisations a where a.organisation_id = org and a.fonction = f and a.statut in ('accordee','non_requise') and a.validee_par_fondatrice);
  return new;
end $$;
drop trigger if exists trg_mission_autorisation on public.bellaia_missions;
create trigger trg_mission_autorisation before insert or update of assigne_a, type on public.bellaia_missions for each row execute function public.mission_controle_autorisation();

-- ── D. Collection de revente ────────────────────────────────
create table if not exists public.food_revente_produits (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  famille text not null,
  nom text not null,
  nb_parts integer,
  organisation_id uuid references public.bellaia_organisations(id),
  prix_revente_centimes integer,
  prix_revente_confirme boolean not null default false,
  parfums text[] not null default '{}',
  allergenes jsonb not null default '{}'::jsonb,
  allergenes_source text, allergenes_verifies_le date, allergenes_valides_par uuid,
  conservation text,
  date_limite_precommande date, date_retrait date,
  photo_chemin text,
  statut text not null default 'brouillon' check (statut in ('brouillon','pret','publie','archive')),
  ordre integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (collection, nom)
);
-- CONFIDENTIEL : tarif fournisseur, frais, cotisations (fondatrice
-- et personnes expressément autorisées uniquement).
create table if not exists public.food_revente_conditions (
  produit_id uuid primary key references public.food_revente_produits(id) on delete cascade,
  prix_fournisseur_centimes integer not null check (prix_fournisseur_centimes >= 0),
  frais_centimes integer not null default 0,
  cotisations_pct numeric(5,2),
  historique jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
-- Propositions de tarif du partenaire (validées avant application ;
-- les commandes passées gardent leurs conditions).
create table if not exists public.food_revente_propositions (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.food_revente_produits(id) on delete cascade,
  prix_fournisseur_centimes integer not null check (prix_fournisseur_centimes >= 0),
  commentaire text, statut text not null default 'proposee' check (statut in ('proposee','acceptee','refusee')),
  propose_par uuid default auth.uid(), decide_le timestamptz,
  created_at timestamptz not null default now()
);
-- Commandes transmises au prestataire (récapitulatif). La part
-- fournisseur est figée à la création, calculée par le serveur.
create table if not exists public.food_revente_commandes_fournisseur (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  organisation_id uuid references public.bellaia_organisations(id),
  collection text not null,
  lignes jsonb not null default '[]'::jsonb,
  part_fournisseur_centimes integer not null default 0,
  statut text not null default 'brouillon' check (statut in ('brouillon','envoyee','confirmee','refusee','livree','annulee')),
  date_retrait date, notes text, reponse_partenaire text,
  simulation boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.food_revente_produits enable row level security;
alter table public.food_revente_conditions enable row level security;
alter table public.food_revente_propositions enable row level security;
alter table public.food_revente_commandes_fournisseur enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='food_revente_produits' and policyname='revente_gestion') then
    create policy revente_gestion on public.food_revente_produits for all to authenticated using (public.a_permission('food.revente.gerer','FOOD')) with check (public.a_permission('food.revente.gerer','FOOD'));
    create policy revente_public on public.food_revente_produits for select to anon, authenticated using (statut = 'publie');
    create policy revente_cond on public.food_revente_conditions for all to authenticated using (public.a_permission('food.revente.marges','FOOD')) with check (public.a_permission('food.revente.marges','FOOD'));
    create policy revente_prop_gestion on public.food_revente_propositions for all to authenticated using (public.a_permission('food.revente.marges','FOOD')) with check (public.a_permission('food.revente.marges','FOOD'));
    create policy revente_cmd_gestion on public.food_revente_commandes_fournisseur for all to authenticated using (public.a_permission('food.revente.gerer','FOOD')) with check (public.a_permission('food.revente.gerer','FOOD'));
  end if;
end $$;

create or replace function public.revente_historiser_conditions() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (old.prix_fournisseur_centimes, old.frais_centimes, old.cotisations_pct) is distinct from (new.prix_fournisseur_centimes, new.frais_centimes, new.cotisations_pct) then
    new.historique := old.historique || jsonb_build_array(jsonb_build_object('le', now(), 'par', auth.uid(), 'prix_fournisseur_centimes', old.prix_fournisseur_centimes, 'frais_centimes', old.frais_centimes, 'cotisations_pct', old.cotisations_pct));
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_revente_hist on public.food_revente_conditions;
create trigger trg_revente_hist before update on public.food_revente_conditions for each row execute function public.revente_historiser_conditions();

-- Publication bloquée tant que tout n'est pas réuni (jamais automatique).
create or replace function public.revente_controle_publication() returns trigger
language plpgsql security definer set search_path = public as $$
declare inconnus int; o record;
begin
  if new.statut = 'publie' and (tg_op = 'INSERT' or old.statut is distinct from 'publie') then
    if not new.prix_revente_confirme or new.prix_revente_centimes is null then raise exception 'Prix de revente à confirmer par la fondatrice'; end if;
    select count(*) into inconnus from jsonb_each(new.allergenes) e where coalesce(e.value->>'statut', 'inconnu') = 'inconnu';
    if inconnus > 0 or (select count(*) from jsonb_object_keys(new.allergenes)) < 14 then raise exception 'Allergènes incomplets : les 14 catégories doivent être renseignées et vérifiées'; end if;
    if new.allergenes_verifies_le is null then raise exception 'Fiche allergènes non validée'; end if;
    if coalesce(array_length(new.parfums, 1), 0) = 0 then raise exception 'Parfums non renseignés'; end if;
    if new.organisation_id is not null then
      select * into o from public.bellaia_organisations where id = new.organisation_id;
      if not coalesce(o.ventes_actives, false) then raise exception 'Ventes désactivées pour ce fournisseur tant qu''il n''est pas validé'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_revente_publication on public.food_revente_produits;
create trigger trg_revente_publication before insert or update on public.food_revente_produits for each row execute function public.revente_controle_publication();

-- Calculs en centimes, côté serveur (fondatrice / autorisés).
create or replace function public.revente_calcul(p_produit uuid, p_quantite integer default 1, p_prix_revente_centimes integer default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; c record; pv bigint; ca bigint; achat bigint; frais bigint; cotis bigint; marge bigint;
begin
  if not public.a_permission('food.revente.marges','FOOD') then raise exception 'Accès refusé'; end if;
  if p_quantite is null or p_quantite < 1 or p_quantite > 1000 then raise exception 'Quantité invalide'; end if;
  select * into p from public.food_revente_produits where id = p_produit;
  select * into c from public.food_revente_conditions where produit_id = p_produit;
  if p.id is null or c.produit_id is null then raise exception 'Produit ou conditions introuvables'; end if;
  pv := coalesce(p_prix_revente_centimes, p.prix_revente_centimes);
  if pv is null or pv < 0 then raise exception 'Prix de revente manquant'; end if;
  ca := pv * p_quantite; achat := c.prix_fournisseur_centimes::bigint * p_quantite;
  frais := c.frais_centimes::bigint * p_quantite;
  cotis := case when c.cotisations_pct is null then null else round(ca * c.cotisations_pct / 100) end;
  marge := ca - achat;
  return jsonb_build_object(
    'quantite', p_quantite, 'prix_revente_unitaire_centimes', pv, 'total_client_centimes', ca,
    'part_fournisseur_centimes', achat, 'marge_brute_centimes', marge,
    'taux_marge_pct', case when achat > 0 then round(marge * 100.0 / achat, 1) end,
    'taux_marque_pct', case when ca > 0 then round(marge * 100.0 / ca, 1) end,
    'frais_centimes', frais, 'cotisations_centimes', cotis, 'cotisations_pct', c.cotisations_pct,
    'gain_estime_centimes', marge - frais - coalesce(cotis, 0),
    'cotisations_a_renseigner', c.cotisations_pct is null);
end $$;
grant execute on function public.revente_calcul(uuid, integer, integer) to authenticated;

-- Prix de revente conseillé : prix pour atteindre un taux de marque
-- visé, arrondi au 0,50 € supérieur (proposition, jamais appliquée seule).
create or replace function public.revente_prix_conseille(p_produit uuid, p_taux_marque numeric) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c record; brut numeric;
begin
  if not public.a_permission('food.revente.marges','FOOD') then raise exception 'Accès refusé'; end if;
  if p_taux_marque is null or p_taux_marque <= 0 or p_taux_marque >= 90 then raise exception 'Taux de marque entre 1 et 89 %%'; end if;
  select * into c from public.food_revente_conditions where produit_id = p_produit;
  brut := (c.prix_fournisseur_centimes + c.frais_centimes) / (1 - p_taux_marque / 100.0);
  return (ceil(brut / 50.0) * 50)::int;
end $$;
grant execute on function public.revente_prix_conseille(uuid, numeric) to authenticated;

-- Récapitulatif fournisseur : part figée par le serveur depuis les
-- conditions enregistrées (jamais un montant du navigateur).
create or replace function public.revente_preparer_commande_fournisseur(p_collection text, p_lignes jsonb, p_date_retrait date default null, p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare l jsonb; total bigint := 0; propre jsonb := '[]'::jsonb; c record; p record; q int; org uuid; nid uuid; ref text;
begin
  if not public.a_permission('food.revente.gerer','FOOD') then raise exception 'Accès refusé'; end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    q := (l->>'quantite')::int;
    if q is null or q < 1 or q > 500 then raise exception 'Quantité invalide'; end if;
    select * into p from public.food_revente_produits where id = (l->>'produit_id')::uuid and collection = p_collection;
    select * into c from public.food_revente_conditions where produit_id = p.id;
    if p.id is null or c.produit_id is null then raise exception 'Produit inconnu dans cette collection'; end if;
    org := coalesce(org, p.organisation_id);
    total := total + c.prix_fournisseur_centimes::bigint * q;
    propre := propre || jsonb_build_array(jsonb_build_object('produit_id', p.id, 'nom', p.nom, 'nb_parts', p.nb_parts, 'parfum', nullif(l->>'parfum', ''), 'quantite', q, 'prix_fournisseur_centimes', c.prix_fournisseur_centimes));
  end loop;
  ref := 'VDP-' || to_char(now() at time zone 'America/Cayenne', 'YYMMDD-HH24MISS');
  insert into public.food_revente_commandes_fournisseur (reference, organisation_id, collection, lignes, part_fournisseur_centimes, date_retrait, notes, simulation)
  values (ref, org, p_collection, propre, total, p_date_retrait, p_notes,
          not coalesce((select ventes_actives from public.bellaia_organisations where id = org), false))
  returning id into nid;
  return nid;
end $$;
grant execute on function public.revente_preparer_commande_fournisseur(text, jsonb, date, text) to authenticated;

-- Vue PARTENAIRE : uniquement son tarif, ses commandes, sa part.
-- Jamais le prix de revente, la marge ou le chiffre d'affaires.
create or replace function public.partenaire_mes_produits() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'collection', p.collection, 'famille', p.famille, 'nom', p.nom, 'nb_parts', p.nb_parts,
    'parfums', p.parfums, 'allergenes', p.allergenes, 'conservation', p.conservation, 'date_limite_precommande', p.date_limite_precommande, 'date_retrait', p.date_retrait,
    'prix_fournisseur_centimes', c.prix_fournisseur_centimes,
    'proposition_en_cours', (select pr.prix_fournisseur_centimes from public.food_revente_propositions pr where pr.produit_id = p.id and pr.statut = 'proposee' order by pr.created_at desc limit 1)
  ) order by p.ordre), '[]'::jsonb)
  from public.food_revente_produits p left join public.food_revente_conditions c on c.produit_id = p.id
  where p.organisation_id is not null and public.membre_organisation(p.organisation_id) and p.statut <> 'archive';
$$;
grant execute on function public.partenaire_mes_produits() to authenticated;

create or replace function public.partenaire_mes_commandes() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'reference', f.reference, 'collection', f.collection, 'statut', f.statut, 'simulation', f.simulation,
    'date_retrait', f.date_retrait, 'notes', f.notes, 'reponse_partenaire', f.reponse_partenaire, 'part_fournisseur_centimes', f.part_fournisseur_centimes,
    'lignes', (select jsonb_agg(jsonb_build_object('nom', x->>'nom', 'nb_parts', x->'nb_parts', 'parfum', x->>'parfum', 'quantite', x->'quantite', 'prix_fournisseur_centimes', x->'prix_fournisseur_centimes')) from jsonb_array_elements(f.lignes) x),
    'created_at', f.created_at) order by f.created_at desc), '[]'::jsonb)
  from public.food_revente_commandes_fournisseur f
  where f.organisation_id is not null and public.membre_organisation(f.organisation_id) and f.statut <> 'brouillon';
$$;
grant execute on function public.partenaire_mes_commandes() to authenticated;

create or replace function public.partenaire_repondre_commande(p_id uuid, p_decision text, p_message text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_decision not in ('confirmee','refusee') then raise exception 'Décision invalide'; end if;
  update public.food_revente_commandes_fournisseur set statut = p_decision, reponse_partenaire = left(p_message, 1000), updated_at = now()
  where id = p_id and statut = 'envoyee' and public.membre_organisation(organisation_id);
  if not found then raise exception 'Commande introuvable ou déjà traitée'; end if;
end $$;
grant execute on function public.partenaire_repondre_commande(uuid, text, text) to authenticated;

create or replace function public.partenaire_proposer_tarif(p_produit uuid, p_prix_centimes integer, p_commentaire text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_prix_centimes is null or p_prix_centimes < 0 or p_prix_centimes > 100000 then raise exception 'Prix invalide'; end if;
  if not exists (select 1 from public.food_revente_produits where id = p_produit and organisation_id is not null and public.membre_organisation(organisation_id)) then raise exception 'Produit introuvable'; end if;
  insert into public.food_revente_propositions (produit_id, prix_fournisseur_centimes, commentaire) values (p_produit, p_prix_centimes, left(p_commentaire, 1000));
end $$;
grant execute on function public.partenaire_proposer_tarif(uuid, integer, text) to authenticated;

create or replace function public.fondatrice_decider_tarif(p_id uuid, p_accepter boolean) returns void
language plpgsql security definer set search_path = public as $$
declare pr record;
begin
  if not public.a_permission('food.revente.marges','FOOD') then raise exception 'Accès refusé'; end if;
  select * into pr from public.food_revente_propositions where id = p_id and statut = 'proposee' for update;
  if pr.id is null then raise exception 'Proposition introuvable'; end if;
  update public.food_revente_propositions set statut = case when p_accepter then 'acceptee' else 'refusee' end, decide_le = now() where id = p_id;
  if p_accepter then update public.food_revente_conditions set prix_fournisseur_centimes = pr.prix_fournisseur_centimes where produit_id = pr.produit_id; end if;
end $$;
grant execute on function public.fondatrice_decider_tarif(uuid, boolean) to authenticated;

-- ── E. Actions requises ─────────────────────────────────────
alter table public.bellaia_actions add column if not exists date_limite date;
alter table public.bellaia_actions add column if not exists pieces_jointes jsonb not null default '[]'::jsonb;
alter table public.bellaia_actions add column if not exists historique jsonb not null default '[]'::jsonb;
alter table public.bellaia_actions add column if not exists depend_de text[] not null default '{}';
create or replace function public.actions_historiser() returns trigger
language plpgsql set search_path = public as $$
begin
  if (old.statut, coalesce(old.reponse,'')) is distinct from (new.statut, coalesce(new.reponse,'')) then
    new.historique := old.historique || jsonb_build_array(jsonb_build_object('le', now(), 'statut', old.statut, 'reponse', old.reponse));
  end if;
  return new;
end $$;
drop trigger if exists trg_actions_hist on public.bellaia_actions;
create trigger trg_actions_hist before update on public.bellaia_actions for each row execute function public.actions_historiser();

-- ── Vue catalogue public (sans prix d'achat) ────────────────
create or replace view public.v_catalogue_public as
  select id, nom, nom_produit, categorie, univers, statut, image_url, tailles, composition, usage_conseils, entretien, notes, prix_vente, quantite, quantite_min, created_at
  from public.stocks where univers in ('BSH','ODYSSEE') and statut = 'actif';
grant select on public.v_catalogue_public to anon, authenticated;
