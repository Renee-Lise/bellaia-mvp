-- ═══════════════════════════════════════════════════════════
-- 0145 — Répertoire central Bellaïa, unicité des fonctions, auteur des changements de droits.
-- PRÉPARÉE, NON APPLIQUÉE. Application seulement après sauvegarde complète restaurée avec
-- succès (« COMPLET ») et autorisation explicite de la fondatrice.
-- Indépendante de 0144 (aucun objet commun) ; dépend seulement d'objets présents en production :
-- profiles, auth.users, bellaia_roles, bellaia_permissions, bellaia_organisations, bellaia_journal,
-- is_fondatrice(), journaliser_droits(). Idempotente. Retour arrière : rollback/0145_repertoire_central_rollback.sql.
--
-- Ce que corrige ou ajoute 0145 :
--  1. bellaia_roles n'avait AUCUNE contrainte d'unicité : le « on conflict do nothing » de
--     fondatrice_lier_compte ne protégeait de rien (une même fonction pouvait être créée deux fois).
--     → index unique (compte, fonction, organisation). Vérifié avant préparation : 0 doublon en production.
--  2. Le journal des droits n'enregistrait pas l'AUTEUR du changement → user_id = auth.uid().
--  3. Répertoire central unique (comptes Bellaïa + contacts externes sans compte), catégories
--     modifiables, recherche serveur avec e-mails réservée à la fondatrice.
--  Aucun compte n'est créé pour un contact externe. Aucune donnée existante n'est modifiée.
-- ═══════════════════════════════════════════════════════════

-- 1. Une fonction n'existe qu'une fois par compte et par organisation
create unique index if not exists bellaia_roles_unique_fonction
  on public.bellaia_roles (user_id, role, coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 2. Auteur des changements de rôles et de permissions (colonne déjà présente en production ; ajoutée si absente)
alter table public.bellaia_journal add column if not exists user_id uuid;
create or replace function public.journaliser_droits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_journal (user_id, action, cible, details)
  values (auth.uid(), tg_table_name || '.' || lower(tg_op), coalesce(new.user_id, old.user_id)::text,
          jsonb_build_object('avant', to_jsonb(old), 'apres', to_jsonb(new)));
  return coalesce(new, old);
end $$;

-- 3. Catégories du répertoire (renommables, extensibles par la fondatrice)
create table if not exists public.bellaia_repertoire_categories (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  libelle text not null check (char_length(libelle) between 1 and 60),
  ordre int not null default 100,
  systeme boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.bellaia_repertoire_categories (id, libelle, ordre, systeme) values
  ('clients','Clients',1,true), ('prospects','Prospects',2,true), ('assistants','Assistants et assistantes',3,true),
  ('hotes','Hôtes et hôtesses',4,true), ('collaborateurs','Collaborateurs',5,true), ('prestataires','Prestataires',6,true),
  ('fournisseurs','Fournisseurs',7,true), ('partenaires','Partenaires',8,true), ('responsables_poles','Responsables de pôles',9,true),
  ('candidats','Candidats',10,true), ('membres_bsh','Membres BSH',11,true), ('moderateurs','Modérateurs',12,true),
  ('contacts_pro','Contacts professionnels',13,true), ('archives','Contacts archivés',14,true)
on conflict (id) do nothing;

-- 4. Fiches du répertoire : contact externe (user_id vide) ou complément d'un compte (user_id renseigné)
create table if not exists public.bellaia_repertoire (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  prenom text, nom text, pseudo text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone text, whatsapp text, entreprise text, fonction text,
  categories text[] not null default '{}',
  poles text[] not null default '{}',
  notes_internes text,
  archive boolean not null default false,
  cree_par uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bellaia_repertoire_identite check (coalesce(nullif(trim(prenom),''), nullif(trim(nom),''), nullif(trim(email),''), nullif(trim(entreprise),'')) is not null)
);
create index if not exists bellaia_repertoire_email on public.bellaia_repertoire (lower(email));
create index if not exists bellaia_repertoire_noms on public.bellaia_repertoire (lower(nom), lower(prenom));

alter table public.bellaia_repertoire enable row level security;
alter table public.bellaia_repertoire_categories enable row level security;
drop policy if exists repertoire_fondatrice on public.bellaia_repertoire;
create policy repertoire_fondatrice on public.bellaia_repertoire for all using (public.is_fondatrice()) with check (public.is_fondatrice());
drop policy if exists repertoire_categories_lire on public.bellaia_repertoire_categories;
create policy repertoire_categories_lire on public.bellaia_repertoire_categories for select using (public.is_fondatrice());
drop policy if exists repertoire_categories_gerer on public.bellaia_repertoire_categories;
create policy repertoire_categories_gerer on public.bellaia_repertoire_categories for all using (public.is_fondatrice()) with check (public.is_fondatrice());
revoke all on public.bellaia_repertoire, public.bellaia_repertoire_categories from anon;

create or replace function public.bellaia_repertoire_controle() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.cree_par := coalesce(new.cree_par, auth.uid()); end if;
  if new.categories is distinct from coalesce(old.categories, '{}'::text[])
     and exists (select 1 from unnest(new.categories) c where not exists (select 1 from public.bellaia_repertoire_categories k where k.id = c)) then
    raise exception 'Catégorie inconnue : créez-la d''abord dans le répertoire.';
  end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bellaia_repertoire_controle on public.bellaia_repertoire;
create trigger bellaia_repertoire_controle before insert or update on public.bellaia_repertoire for each row execute function public.bellaia_repertoire_controle();

create or replace function public.bellaia_repertoire_journal() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_journal (user_id, action, cible, details)
  values (auth.uid(), 'bellaia_repertoire.' || lower(tg_op), coalesce(new.id, old.id)::text,
          jsonb_build_object('avant', to_jsonb(old) - 'notes_internes', 'apres', to_jsonb(new) - 'notes_internes'));
  return coalesce(new, old);
end $$;
drop trigger if exists bellaia_repertoire_journal on public.bellaia_repertoire;
create trigger bellaia_repertoire_journal after insert or update or delete on public.bellaia_repertoire for each row execute function public.bellaia_repertoire_journal();

-- 5. Recherche serveur : comptes Bellaïa (e-mail de connexion compris) + contacts externes.
--    Réservée à la fondatrice (les autres reçoivent une liste vide : jamais le répertoire complet).
create or replace function public.repertoire_contacts() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_fondatrice() then '[]'::jsonb else coalesce(jsonb_agg(x order by x->>'nom', x->>'prenom'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'id', p.id, 'compte', true, 'prenom', coalesce(f.prenom, p.prenom), 'nom', coalesce(f.nom, p.nom), 'pseudo', f.pseudo,
      'email', u.email, 'telephone', coalesce(f.telephone, p.telephone), 'entreprise', f.entreprise,
      'statut', coalesce(p.statut, 'actif'), 'role_profil', p.role, 'inscrit_le', u.created_at,
      'categories', to_jsonb(array(select distinct c from unnest(
          coalesce(f.categories, '{}'::text[])
          || case when p.role in ('client','cliente') then array['clients'] else '{}'::text[] end
          || case when p.role = 'partenaire' then array['partenaires'] else '{}'::text[] end
          || array(select case r.role when 'assistante' then 'assistants' when 'hote' then 'hotes' when 'collaborateur' then 'collaborateurs'
                     when 'prestataire' then 'prestataires' when 'fournisseur' then 'fournisseurs' when 'qualite' then 'collaborateurs' else 'contacts_pro' end
                   from public.bellaia_roles r where r.user_id = p.id and r.statut <> 'revoque')
          || case when p.membership_status in ('member','member_active','membre') then array['membres_bsh'] else '{}'::text[] end) c)),
      'poles', to_jsonb(array(select distinct x from unnest(
          coalesce(f.poles, '{}'::text[])
          || array(select case when o.nom_commercial ~* 'vil.?dor' then 'VILDOR' else 'PARTENAIRE' end
                   from public.bellaia_roles r join public.bellaia_organisations o on o.id = r.organisation_id where r.user_id = p.id and r.statut <> 'revoque')
          || array(select distinct b.univers from public.bellaia_permissions b where b.user_id = p.id and b.univers <> '*')) x))
    ) x
    from public.profiles p join auth.users u on u.id = p.id left join public.bellaia_repertoire f on f.user_id = p.id
    where p.role <> 'fondatrice'
    union all
    select jsonb_build_object('id', f.id, 'compte', false, 'prenom', f.prenom, 'nom', f.nom, 'pseudo', f.pseudo, 'email', f.email,
      'telephone', f.telephone, 'entreprise', f.entreprise, 'statut', case when f.archive then 'archivé' else 'externe' end,
      'categories', to_jsonb(f.categories || case when f.archive then array['archives'] else '{}'::text[] end), 'poles', to_jsonb(f.poles))
    from public.bellaia_repertoire f where f.user_id is null
  ) t;
$$;
revoke all on function public.repertoire_contacts() from public, anon;
grant execute on function public.repertoire_contacts() to authenticated;
