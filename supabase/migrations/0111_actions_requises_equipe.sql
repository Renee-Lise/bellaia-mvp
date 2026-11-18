-- ═══════════════════════════════════════════════════════════
-- 0111_actions_requises_equipe.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Objet :
--  • bellaia_actions : espace fondatrice « Actions requises » — chaque
--    décision qui attend la fondatrice (univers, décision, données
--    manquantes, priorité, fonctionnalités bloquées, conséquences).
--    Fondatrice uniquement.
--  • bellaia_missions : missions de l'équipe (assistante Food/Events,
--    hôtesse BSH) — pâtisserie, créations Canva, accueil BSH.
--    Équipe (fondatrice + assistante) ; un·e hôte BSH voit ses missions.
-- Non destructif : création de tables uniquement.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_actions (
  id uuid primary key default gen_random_uuid(),
  univers text not null,
  titre text not null,
  decision text not null,
  donnees_manquantes text,
  priorite smallint not null default 2 check (priorite between 1 and 4),
  bloque text,
  consequences text,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','fait','reporte')),
  reponse text,
  cle text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolu_le timestamptz
);
alter table public.bellaia_actions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_actions' and policyname='actions_fondatrice') then
    create policy actions_fondatrice on public.bellaia_actions for all to authenticated
      using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

create table if not exists public.bellaia_missions (
  id uuid primary key default gen_random_uuid(),
  pole text not null default 'FOOD' check (pole in ('FOOD','EVENTS','BSH','STUDIO')),
  type text not null default 'patisserie' check (type in ('patisserie','creation','hotesse','autre')),
  titre text not null,
  details text,
  date_prevue date,
  heure text,
  quantite numeric,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','a_valider','fait','annule')),
  lien_canva text,
  fichier_url text,
  commentaire_equipe text,
  commentaire_fondatrice text,
  assigne_a uuid references auth.users(id) on delete set null,
  cree_par uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bellaia_missions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='bellaia_missions' and policyname='missions_equipe') then
    create policy missions_equipe on public.bellaia_missions for all to authenticated
      using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
  end if;
  if not exists (select 1 from pg_policies where tablename='bellaia_missions' and policyname='missions_assignee_lecture') then
    create policy missions_assignee_lecture on public.bellaia_missions for select to authenticated
      using (assigne_a = auth.uid());
  end if;
end $$;

-- Un·e hôte BSH (non membre de l'équipe) peut faire avancer SA mission
-- (statut + commentaire), sans pouvoir la réattribuer.
create or replace function public.mission_maj_assignee(p_id uuid, p_statut text, p_commentaire text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_statut not in ('a_faire','en_cours','a_valider','fait') then raise exception 'Statut invalide'; end if;
  update public.bellaia_missions set statut = p_statut, commentaire_equipe = left(coalesce(p_commentaire, commentaire_equipe), 2000), updated_at = now()
  where id = p_id and assigne_a = auth.uid();
  if not found then raise exception 'Mission introuvable'; end if;
end $$;
revoke all on function public.mission_maj_assignee(uuid, text, text) from public;
grant execute on function public.mission_maj_assignee(uuid, text, text) to authenticated;
