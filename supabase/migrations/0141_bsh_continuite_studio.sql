-- ═══════════════════════════════════════════════════════════════════════════════
-- 0141 — BSH Secret Agenda : continuité, délégation aux hôtes, publication confirmée par preuve,
--        médiathèque éditoriale commune (Secret Agenda / Secret Games / Rewards), studio versionné.
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : sauvegarde dont la restauration réelle conclut « COMPLET », puis accord
-- écrit de la fondatrice. Idempotente. Ajouts uniquement (aucune donnée supprimée ni modifiée).
-- Retour arrière : rollback/0141_bsh_continuite_studio_rollback.sql. Dépend de 0103 et 0128 (déjà en production).
-- Règles garanties PAR LA BASE (et non par l'écran) :
--  1. « publié » exige une validation préalable ET une preuve enregistrée (table séparée, jamais publique) ;
--     programmer exige une validation. Une programmation interne n'est donc jamais une publication.
--  2. Un hôte (titulaire OU remplaçant) ne voit que ses missions, leurs publications, animations et ressources
--     autorisées ; il ne déclare que l'exécution (en cours / réalisée / non réalisée) et le compte rendu, par
--     fonction contrôlée. Report et annulation restent à la fondatrice.
--  3. Les versions du studio sont en ajout seul (ni modification ni suppression).
--  4. La lecture publique d'une publication est limitée aux colonnes destinées au public.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Publications : validation + garde du statut ─────────────────────────────
alter table public.bsh_communications add column if not exists valide_par uuid;
alter table public.bsh_communications add column if not exists valide_le timestamptz;
alter table public.bsh_communications add column if not exists historique boolean not null default false; -- programmation passée, publication non prouvée

create table if not exists public.bsh_preuves_publication (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.bsh_communications(id) on delete cascade,
  preuve text not null check (length(btrim(preuve)) between 8 and 2000),
  preuve_url text check (preuve_url is null or preuve_url ~* '^https://'),
  publie_le timestamptz not null default now(),
  confirme_par uuid not null default auth.uid(),
  source text not null default 'fondatrice' check (source in ('fondatrice', 'hote')),
  created_at timestamptz not null default now()
);
create index if not exists bsh_preuves_comm_idx on public.bsh_preuves_publication(communication_id);

create or replace function public.bsh_garde_publication() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.statut in ('programme', 'pret', 'publie') and new.valide_le is null then
    raise exception 'Publication non validée : la validation précède la programmation et la publication.';
  end if;
  if new.statut = 'publie' and (tg_op = 'INSERT' or old.statut is distinct from 'publie') then
    if not exists (select 1 from public.bsh_preuves_publication p where p.communication_id = new.id) then
      raise exception 'Publication non confirmée : une preuve de publication est obligatoire.';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'publie' and new.statut not in ('publie', 'archive') then
    raise exception 'Une publication confirmée ne peut que rester publiée ou être archivée.';
  end if;
  return new;
end $$;
drop trigger if exists bsh_garde_publication on public.bsh_communications;
create trigger bsh_garde_publication before insert or update on public.bsh_communications for each row execute function public.bsh_garde_publication();

-- Colonnes lisibles par un visiteur anonyme : uniquement celles destinées au public
revoke select on public.bsh_communications from anon;
grant select (id, titre, contenu, type, cible, statut, created_at, publiee_le, espace, date_programmee, jeu_id, visuel_url, lien_externe, thematique, date_publication_effective, campagne_id) on public.bsh_communications to anon;

-- ── 2. Missions déléguées ──────────────────────────────────────────────────────
alter table public.bsh_missions add column if not exists remplacant_id uuid references public.bsh_hotes(id);
alter table public.bsh_missions add column if not exists espace text;
alter table public.bsh_missions add column if not exists communication_id uuid references public.bsh_communications(id) on delete set null;
alter table public.bsh_missions add column if not exists animation_id uuid references public.bsh_animations(id) on delete set null;
alter table public.bsh_missions add column if not exists ressources uuid[] not null default '{}';
alter table public.bsh_missions add column if not exists statut_execution text not null default 'a_faire';
alter table public.bsh_missions add column if not exists compte_rendu text;
alter table public.bsh_missions add column if not exists compte_rendu_le timestamptz;
alter table public.bsh_missions add column if not exists execute_par uuid;
alter table public.bsh_missions add column if not exists reporte_au timestamptz;
alter table public.bsh_missions add column if not exists motif text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bsh_missions_execution_check') then
    alter table public.bsh_missions add constraint bsh_missions_execution_check check (statut_execution in ('a_faire', 'en_cours', 'realisee', 'non_realisee', 'reportee', 'annulee'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bsh_missions_remplacant_distinct') then
    alter table public.bsh_missions add constraint bsh_missions_remplacant_distinct check (remplacant_id is null or remplacant_id <> hote_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bsh_missions_espace_check') then
    alter table public.bsh_missions add constraint bsh_missions_espace_check check (espace is null or espace in ('chaine', 'cercle', 'lounge', 'evenement'));
  end if;
end $$;

-- Le remplaçant voit la mission (en lecture), comme le titulaire
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bsh_missions' and policyname = 'bsh_missions_remplacant') then
    create policy bsh_missions_remplacant on public.bsh_missions for select to authenticated using (remplacant_id is not null and remplacant_id = public.bsh_mon_hote());
  end if;
  -- Publications et animations liées à une mission dont l'hôte est titulaire ou remplaçant
  if not exists (select 1 from pg_policies where tablename = 'bsh_communications' and policyname = 'bsh_communications_mission') then
    create policy bsh_communications_mission on public.bsh_communications for select to authenticated using (exists (
      select 1 from public.bsh_missions m where m.communication_id = bsh_communications.id and m.statut <> 'annulee'
        and public.bsh_mon_hote() in (m.hote_id, m.remplacant_id)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bsh_animations' and policyname = 'bsh_animations_mission') then
    create policy bsh_animations_mission on public.bsh_animations for select to authenticated using (exists (
      select 1 from public.bsh_missions m where m.animation_id = bsh_animations.id and m.statut <> 'annulee'
        and public.bsh_mon_hote() in (m.hote_id, m.remplacant_id)));
  end if;
end $$;

-- L'hôte déclare l'exécution (jamais le report ni l'annulation)
create or replace function public.bsh_hote_execution(p_mission uuid, p_statut text, p_compte_rendu text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare moi uuid := public.bsh_mon_hote(); m public.bsh_missions;
begin
  if moi is null then raise exception 'Espace réservé aux hôtes actifs.'; end if;
  if p_statut not in ('en_cours', 'realisee', 'non_realisee') then raise exception 'Statut réservé à la fondatrice.'; end if;
  if p_statut in ('realisee', 'non_realisee') and length(btrim(coalesce(p_compte_rendu, ''))) < 10 then raise exception 'Compte rendu d''au moins 10 caractères demandé.'; end if;
  select * into m from public.bsh_missions where id = p_mission and moi in (hote_id, remplacant_id) for update;
  if m.id is null then raise exception 'Mission introuvable.'; end if;
  if m.statut in ('annulee', 'refusee') or m.statut_execution in ('annulee', 'reportee') then raise exception 'Mission annulée ou reportée : déclaration impossible.'; end if;
  update public.bsh_missions set statut_execution = p_statut, compte_rendu = coalesce(left(p_compte_rendu, 4000), compte_rendu),
    compte_rendu_le = case when p_compte_rendu is not null then now() else compte_rendu_le end, execute_par = auth.uid(), updated_at = now() where id = p_mission;
  return jsonb_build_object('ok', true, 'statut_execution', p_statut);
end $$;

-- Confirmation d'une publication, avec preuve (fondatrice, ou hôte de la mission liée)
create or replace function public.bsh_confirmer_publication(p_communication uuid, p_preuve text, p_url text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare moi uuid := public.bsh_mon_hote(); c public.bsh_communications; v_source text;
begin
  select * into c from public.bsh_communications where id = p_communication for update;
  if c.id is null then raise exception 'Publication introuvable.'; end if;
  if public.is_fondatrice() then v_source := 'fondatrice';
  elsif moi is not null and (c.hote_id = moi or exists (select 1 from public.bsh_missions m where m.communication_id = c.id and m.statut <> 'annulee' and moi in (m.hote_id, m.remplacant_id))) then v_source := 'hote';
  else raise exception 'Confirmation non autorisée.'; end if;
  if c.valide_le is null then raise exception 'Publication non validée.'; end if;
  if c.statut not in ('programme', 'pret') then raise exception 'Seule une publication programmée peut être confirmée.'; end if;
  insert into public.bsh_preuves_publication(communication_id, preuve, preuve_url, confirme_par, source) values (c.id, p_preuve, nullif(btrim(coalesce(p_url, '')), ''), auth.uid(), v_source);
  update public.bsh_communications set statut = 'publie', date_publication_effective = now(), publiee_le = now(), updated_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'source', v_source);
end $$;

-- ── 3. Mode « Continuité BSH » ─────────────────────────────────────────────────
alter table public.bsh_agenda_reglages add column if not exists continuite_active boolean not null default false;
alter table public.bsh_agenda_reglages add column if not exists continuite_principal uuid references public.bsh_hotes(id);
alter table public.bsh_agenda_reglages add column if not exists continuite_remplacant uuid references public.bsh_hotes(id);
alter table public.bsh_agenda_reglages add column if not exists continuite_horizon_jours integer not null default 21;
alter table public.bsh_agenda_reglages add column if not exists continuite_note text;

-- ── 4. Médiathèque éditoriale commune ──────────────────────────────────────────
create table if not exists public.bsh_ressources (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(titre) <= 200),
  univers text not null default 'commun' check (univers in ('secret_agenda', 'secret_games', 'rewards', 'commun')),
  type text not null default 'autre' check (type in ('affiche', 'story', 'sondage', 'carte_jeu', 'invitation', 'evenement', 'campagne', 'scenographie', 'personnage_reference', 'scenario', 'texte', 'autre')),
  campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  espace text check (espace is null or espace in ('chaine', 'cercle', 'lounge', 'evenement')),
  date_ressource date,
  url text, chemin_storage text,
  source_media_id uuid references public.events_medias(id) on delete set null, -- réutilise un média existant sans copie
  empreinte text,                                                                  -- SHA-256 du fichier : anti-doublon
  contenu_texte text check (length(contenu_texte) <= 20000),
  jeu_id uuid references public.bsh_jeux(id) on delete set null,
  rewards_id uuid references public.bsh_rewards_campagnes(id) on delete set null,
  auteur uuid default auth.uid(),
  statut_validation text not null default 'brouillon' check (statut_validation in ('brouillon', 'a_valider', 'valide', 'refuse', 'archive')),
  valide_par uuid, valide_le timestamptz,
  droits text not null default 'a_verifier' check (droits in ('a_verifier', 'proprietaire', 'licence', 'autorise_ecrit', 'interdit')),
  droits_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint bsh_ressources_validation_datee check (statut_validation <> 'valide' or valide_le is not null)
);
create unique index if not exists bsh_ressources_empreinte_unique on public.bsh_ressources(lower(empreinte)) where empreinte is not null;
create unique index if not exists bsh_ressources_media_unique on public.bsh_ressources(source_media_id) where source_media_id is not null;

-- ── 5. Studio créatif : créations, variantes, versions en ajout seul ──────────
create table if not exists public.bsh_creations (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(titre) <= 200),
  format text not null check (format in ('affiche', 'story', 'story_snapchat', 'story_tiktok', 'sondage', 'carte_jeu', 'invitation', 'evenement', 'campagne', 'scenographie')),
  ambiance text not null default 'glamour' check (ambiance in ('glamour', 'sensuelle', 'dark_romance', 'romantique', 'mysterieuse', 'festive')),
  campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  parent_id uuid references public.bsh_creations(id) on delete set null,   -- variante de
  personnage_id uuid references public.bsh_ressources(id) on delete set null,
  communication_id uuid references public.bsh_communications(id) on delete set null,
  jeu_id uuid references public.bsh_jeux(id) on delete set null,
  ressource_finale_id uuid references public.bsh_ressources(id) on delete set null,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'a_corriger', 'valide', 'archive')),
  version_courante integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bsh_creations_versions (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.bsh_creations(id) on delete cascade,
  numero integer not null,
  contenu jsonb not null default '{}'::jsonb,
  note_correction text check (length(note_correction) <= 4000),
  auteur uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (creation_id, numero)
);
create or replace function public.bsh_versions_ajout_seul() returns trigger language plpgsql as $$
begin raise exception 'Historique des versions : ajout seul (ni modification ni suppression).'; end $$;
drop trigger if exists bsh_versions_ajout_seul on public.bsh_creations_versions;
create trigger bsh_versions_ajout_seul before update or delete on public.bsh_creations_versions for each row execute function public.bsh_versions_ajout_seul();
create or replace function public.bsh_version_suivante() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(numero), 0) + 1 into new.numero from public.bsh_creations_versions where creation_id = new.creation_id;
  update public.bsh_creations set version_courante = new.numero, updated_at = now() where id = new.creation_id;
  return new;
end $$;
drop trigger if exists bsh_version_suivante on public.bsh_creations_versions;
create trigger bsh_version_suivante before insert on public.bsh_creations_versions for each row execute function public.bsh_version_suivante();

-- ── 6. Règles d'accès ──────────────────────────────────────────────────────────
alter table public.bsh_preuves_publication enable row level security;
alter table public.bsh_ressources enable row level security;
alter table public.bsh_creations enable row level security;
alter table public.bsh_creations_versions enable row level security;
revoke all on public.bsh_preuves_publication, public.bsh_ressources, public.bsh_creations, public.bsh_creations_versions from anon;
do $$ declare t text; begin
  foreach t in array array['bsh_preuves_publication', 'bsh_ressources', 'bsh_creations', 'bsh_creations_versions'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_fondatrice') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice())', t || '_fondatrice', t);
    end if;
  end loop;
  -- Hôte : preuves de ses publications (lecture) ; écriture uniquement par bsh_confirmer_publication
  if not exists (select 1 from pg_policies where tablename = 'bsh_preuves_publication' and policyname = 'bsh_preuves_hote') then
    create policy bsh_preuves_hote on public.bsh_preuves_publication for select to authenticated using (exists (
      select 1 from public.bsh_missions m where m.communication_id = bsh_preuves_publication.communication_id and public.bsh_mon_hote() in (m.hote_id, m.remplacant_id)));
  end if;
  -- Hôte : ressources validées, aux droits établis, explicitement autorisées dans une de ses missions
  if not exists (select 1 from pg_policies where tablename = 'bsh_ressources' and policyname = 'bsh_ressources_hote') then
    create policy bsh_ressources_hote on public.bsh_ressources for select to authenticated using (
      statut_validation = 'valide' and droits not in ('a_verifier', 'interdit') and exists (
        select 1 from public.bsh_missions m where bsh_ressources.id = any (m.ressources) and m.statut <> 'annulee'
          and public.bsh_mon_hote() in (m.hote_id, m.remplacant_id)));
  end if;
end $$;
revoke all on function public.bsh_hote_execution(uuid, text, text), public.bsh_confirmer_publication(uuid, text, text) from public, anon;
grant execute on function public.bsh_hote_execution(uuid, text, text), public.bsh_confirmer_publication(uuid, text, text) to authenticated;

-- ── 7. Compléments du 24/11 ────────────────────────────────────────────────────
-- Publications : nature (affiche, publication, animation…) et plateforme (adaptations Snapchat / TikTok)
alter table public.bsh_communications add column if not exists nature text;
alter table public.bsh_communications add column if not exists plateforme text not null default 'whatsapp';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bsh_communications_nature_check') then
    alter table public.bsh_communications add constraint bsh_communications_nature_check check (nature is null or nature in ('affiche', 'publication', 'animation', 'sondage', 'relance', 'annonce', 'pensee'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bsh_communications_plateforme_check') then
    alter table public.bsh_communications add constraint bsh_communications_plateforme_check check (plateforme in ('whatsapp', 'snapchat', 'tiktok'));
  end if;
end $$;
-- BSH Rewards : quatre catégories (les campagnes restent en brouillon jusqu'aux validations, contrainte existante)
alter table public.bsh_rewards_campagnes add column if not exists categorie text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bsh_rewards_categorie_check') then
    alter table public.bsh_rewards_campagnes add constraint bsh_rewards_categorie_check check (categorie is null or categorie in ('sweet_rewards', 'golden_ticket', 'secret_gift', 'members_rewards'));
  end if;
end $$;
-- Diamond B : paroles originales et auteurs ; liaison possible aux jeux Secret Games
alter table public.bsh_musique add column if not exists paroles text;
alter table public.bsh_musique add column if not exists auteurs text;
alter table public.bsh_musique_liens drop constraint if exists bsh_musique_liens_cible_type_check;
alter table public.bsh_musique_liens add constraint bsh_musique_liens_cible_type_check check (cible_type in ('campagne', 'animation', 'evenement', 'jeu'));
-- Assistant de communication (consignes Meta AI, réponses rapides, FAQ, messages de bienvenue et d'absence, modèles)
create table if not exists public.bsh_assistant_contenus (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('consigne_meta_ai', 'reponse_rapide', 'faq', 'bienvenue', 'absence', 'modele')),
  titre text not null check (length(titre) <= 200),
  raccourci text check (raccourci is null or length(raccourci) <= 25),
  contenu text not null check (length(contenu) <= 4000),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide', 'archive')),
  valide_le timestamptz, version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint bsh_assistant_validation_datee check (statut <> 'valide' or valide_le is not null)
);
alter table public.bsh_assistant_contenus enable row level security;
revoke all on public.bsh_assistant_contenus from anon;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bsh_assistant_contenus' and policyname = 'bsh_assistant_contenus_fondatrice') then
    create policy bsh_assistant_contenus_fondatrice on public.bsh_assistant_contenus for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;
