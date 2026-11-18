-- ═══════════════════════════════════════════════════════════
-- 0115_bsh_salons_securises.sql
-- STATUT: PRÉPARÉ — à exécuter AVEC le déploiement du nouveau code
-- (l'ancien écran des salons écrit directement dans les tables : il
-- cessera de fonctionner dès cette migration).
-- Objet : salons BSH Secret Games sécurisés, jeu sous pseudonyme SANS
-- compte permanent, par participation temporaire :
--  • chaque participant reçoit un JETON secret (seule son empreinte
--    SHA-256 est stockée) ; le créateur est « hôte » ;
--  • plus aucune lecture, création ni modification directe des tables
--    (fini la liste publique des salons et de leurs codes) : tout passe
--    par des fonctions qui vérifient le jeton ;
--  • hôte : expulser, fermer ; fondatrice : tout (modération) ;
--  • signalement, journal des actions sensibles (non modifiable),
--    fermeture automatique après 12 h d'inactivité, 20 participants max,
--    anti-rafale sur les tirages ;
--  • la carte tirée doit appartenir au jeu du salon et être active.
-- Non destructif : colonnes et tables ajoutées ; politiques resserrées
-- par ALTER POLICY ; aucune donnée supprimée.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_salons add column if not exists jeton_hote_empreinte text;
alter table public.bsh_salons add column if not exists max_participants integer not null default 20;
alter table public.bsh_salons add column if not exists derniere_activite timestamptz not null default now();
alter table public.bsh_salons add column if not exists ferme_le timestamptz;
alter table public.bsh_salon_participants add column if not exists jeton_empreinte text;
alter table public.bsh_salon_participants add column if not exists role text not null default 'participant';
alter table public.bsh_salon_participants add column if not exists expulse boolean not null default false;
alter table public.bsh_salon_participants add column if not exists derniere_activite timestamptz not null default now();

create table if not exists public.bsh_salon_journal (
  id bigint generated always as identity primary key,
  salon_id uuid references public.bsh_salons(id) on delete cascade,
  participant_id uuid, action text not null, details jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_salon_signalements (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.bsh_salons(id) on delete cascade,
  signale_par uuid, participant_vise uuid, motif text not null,
  statut text not null default 'a_traiter' check (statut in ('a_traiter','traite','rejete')),
  created_at timestamptz not null default now()
);
alter table public.bsh_salon_journal enable row level security;
alter table public.bsh_salon_signalements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bsh_salon_journal' and policyname='salon_journal_fondatrice') then
    create policy salon_journal_fondatrice on public.bsh_salon_journal for select to authenticated using (public.is_fondatrice());
    create policy salon_signal_fondatrice on public.bsh_salon_signalements for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- Plus d'accès direct (anonyme ou connecté) : uniquement les fonctions.
alter policy bsh_salons_lecture_publique on public.bsh_salons using (false);
alter policy bsh_salons_creation_publique on public.bsh_salons with check (false);
alter policy bsh_salons_maj_publique on public.bsh_salons using (false) with check (false);
alter policy bsh_salon_participants_lecture_publique on public.bsh_salon_participants using (false);
alter policy bsh_salon_participants_creation_publique on public.bsh_salon_participants with check (false);

create or replace function public.salon_empreinte(j text) returns text
language sql immutable set search_path = public, extensions as $$ select encode(extensions.digest(coalesce(j, ''), 'sha256'), 'hex') $$;

-- Participant valide (jeton, non expulsé, salon ouvert et actif).
create or replace function public.salon_participant(p_salon uuid, p_jeton text) returns public.bsh_salon_participants
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants; s public.bsh_salons;
begin
  select * into s from public.bsh_salons where id = p_salon;
  if s.id is null then raise exception 'Salon introuvable'; end if;
  if s.statut = 'ouvert' and s.derniere_activite < now() - interval '12 hours' then
    update public.bsh_salons set statut = 'ferme', ferme_le = now() where id = s.id;
    insert into public.bsh_salon_journal (salon_id, action) values (s.id, 'fermeture_automatique');
    s.statut := 'ferme';
  end if;
  if s.statut <> 'ouvert' then raise exception 'Salon fermé'; end if;
  select * into p from public.bsh_salon_participants where salon_id = p_salon and jeton_empreinte = public.salon_empreinte(p_jeton) and not expulse;
  if p.id is null then raise exception 'Accès refusé'; end if;
  update public.bsh_salon_participants set derniere_activite = now() where id = p.id;
  return p;
end $$;

create or replace function public.salon_pseudo_propre(p text) returns text
language sql immutable as $$ select left(nullif(regexp_replace(trim(coalesce(p, '')), '[<>{}\[\]\\]', '', 'g'), ''), 24) $$;

create or replace function public.salon_creer(p_jeu uuid, p_pseudo text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare j text := encode(extensions.gen_random_bytes(24), 'hex'); c text; sid uuid; pid uuid; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; essais int := 0;
begin
  if not exists (select 1 from public.bsh_jeux where id = p_jeu) then raise exception 'Jeu inconnu'; end if;
  loop
    c := ''; for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.bsh_salons where code = c);
    essais := essais + 1; if essais > 20 then raise exception 'Réessayez'; end if;
  end loop;
  insert into public.bsh_salons (code, jeu_id, pseudo_hote, cree_par, statut, jeton_hote_empreinte)
  values (c, p_jeu, coalesce(public.salon_pseudo_propre(p_pseudo), 'Hôte'), auth.uid(), 'ouvert', public.salon_empreinte(j)) returning id into sid;
  insert into public.bsh_salon_participants (salon_id, pseudo, client_id, jeton_empreinte, role)
  values (sid, coalesce(public.salon_pseudo_propre(p_pseudo), 'Hôte'), auth.uid(), public.salon_empreinte(j), 'hote') returning id into pid;
  insert into public.bsh_salon_journal (salon_id, participant_id, action) values (sid, pid, 'creation');
  return jsonb_build_object('salon_id', sid, 'code', c, 'jeton', j, 'participant_id', pid, 'role', 'hote');
end $$;

create or replace function public.salon_rejoindre(p_code text, p_pseudo text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.bsh_salons; j text := encode(extensions.gen_random_bytes(24), 'hex'); pid uuid; n int;
begin
  select * into s from public.bsh_salons where code = upper(trim(p_code));
  if s.id is null or s.statut <> 'ouvert' or s.derniere_activite < now() - interval '12 hours' then raise exception 'Aucun salon ouvert avec ce code'; end if;
  select count(*) into n from public.bsh_salon_participants where salon_id = s.id and not expulse;
  if n >= s.max_participants then raise exception 'Salon complet'; end if;
  insert into public.bsh_salon_participants (salon_id, pseudo, client_id, jeton_empreinte, role)
  values (s.id, coalesce(public.salon_pseudo_propre(p_pseudo), 'Invité·e'), auth.uid(), public.salon_empreinte(j), 'participant') returning id into pid;
  update public.bsh_salons set derniere_activite = now() where id = s.id;
  insert into public.bsh_salon_journal (salon_id, participant_id, action) values (s.id, pid, 'arrivee');
  return jsonb_build_object('salon_id', s.id, 'code', s.code, 'jeton', j, 'participant_id', pid, 'role', 'participant');
end $$;

-- État du salon, visible uniquement par ses participants.
create or replace function public.salon_etat(p_salon uuid, p_jeton text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants; s public.bsh_salons;
begin
  p := public.salon_participant(p_salon, p_jeton);
  select * into s from public.bsh_salons where id = p_salon;
  return jsonb_build_object('id', s.id, 'code', s.code, 'jeu_id', s.jeu_id, 'statut', s.statut, 'carte_actuelle_id', s.carte_actuelle_id,
    'pseudo_hote', s.pseudo_hote, 'moi', jsonb_build_object('id', p.id, 'role', p.role, 'pseudo', p.pseudo),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'pseudo', x.pseudo, 'role', x.role) order by x.rejoint_le), '[]'::jsonb)
                     from public.bsh_salon_participants x where x.salon_id = p_salon and not x.expulse));
end $$;

create or replace function public.salon_tirer(p_salon uuid, p_jeton text, p_carte uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants; s public.bsh_salons;
begin
  p := public.salon_participant(p_salon, p_jeton);
  select * into s from public.bsh_salons where id = p_salon for update;
  if not exists (select 1 from public.bsh_jeux_cartes where id = p_carte and jeu_id = s.jeu_id and statut = 'active') then raise exception 'Carte invalide pour ce jeu'; end if;
  if s.updated_at > now() - interval '1 second' then raise exception 'Un instant…'; end if;
  update public.bsh_salons set carte_actuelle_id = p_carte, updated_at = now(), derniere_activite = now() where id = p_salon;
end $$;

create or replace function public.salon_expulser(p_salon uuid, p_jeton text, p_participant uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants;
begin
  p := public.salon_participant(p_salon, p_jeton);
  if p.role <> 'hote' then raise exception 'Réservé à l''hôte du salon'; end if;
  if p_participant = p.id then raise exception 'Impossible de vous expulser vous-même'; end if;
  update public.bsh_salon_participants set expulse = true where id = p_participant and salon_id = p_salon;
  if not found then raise exception 'Participant introuvable'; end if;
  insert into public.bsh_salon_journal (salon_id, participant_id, action, details) values (p_salon, p.id, 'expulsion', jsonb_build_object('vise', p_participant));
end $$;

create or replace function public.salon_fermer(p_salon uuid, p_jeton text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants;
begin
  if public.is_fondatrice() then
    update public.bsh_salons set statut = 'ferme', ferme_le = now() where id = p_salon;
    insert into public.bsh_salon_journal (salon_id, action) values (p_salon, 'fermeture_fondatrice');
    return;
  end if;
  p := public.salon_participant(p_salon, p_jeton);
  if p.role <> 'hote' then raise exception 'Réservé à l''hôte du salon'; end if;
  update public.bsh_salons set statut = 'ferme', ferme_le = now() where id = p_salon;
  insert into public.bsh_salon_journal (salon_id, participant_id, action) values (p_salon, p.id, 'fermeture');
end $$;

create or replace function public.salon_quitter(p_salon uuid, p_jeton text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants;
begin
  p := public.salon_participant(p_salon, p_jeton);
  update public.bsh_salon_participants set expulse = true, jeton_empreinte = null where id = p.id;
  insert into public.bsh_salon_journal (salon_id, participant_id, action) values (p_salon, p.id, 'depart');
end $$;

create or replace function public.salon_signaler(p_salon uuid, p_jeton text, p_vise uuid, p_motif text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p public.bsh_salon_participants;
begin
  p := public.salon_participant(p_salon, p_jeton);
  if coalesce(trim(p_motif), '') = '' then raise exception 'Motif requis'; end if;
  insert into public.bsh_salon_signalements (salon_id, signale_par, participant_vise, motif) values (p_salon, p.id, p_vise, left(p_motif, 1000));
  insert into public.bsh_salon_journal (salon_id, participant_id, action, details) values (p_salon, p.id, 'signalement', jsonb_build_object('vise', p_vise));
end $$;

grant execute on function public.salon_creer(uuid, text), public.salon_rejoindre(text, text), public.salon_etat(uuid, text),
  public.salon_tirer(uuid, text, uuid), public.salon_expulser(uuid, text, uuid), public.salon_fermer(uuid, text),
  public.salon_quitter(uuid, text), public.salon_signaler(uuid, text, uuid, text) to anon, authenticated;
