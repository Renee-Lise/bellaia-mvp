-- ═══════════════════════════════════════════════════════════════════════════════
-- 0139 — Demandes des clientes : aide et contact, droits RGPD (accès, rectification, effacement,
--        portabilité, opposition), avec suivi et réponse dans l'application.
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : sauvegarde vérifiée.
-- • Une personne connectée dépose et lit SES demandes ; elle ne modifie ni le statut ni la réponse.
-- • La fondatrice (ou « acces_complet ») lit, répond, change le statut ; chaque dépôt la notifie.
-- • Délai légal de réponse aux demandes RGPD : 1 mois (échéance calculée et affichée).
-- • Une demande d'effacement n'efface rien automatiquement : la fondatrice vérifie l'identité et
--   les obligations de conservation (factures, comptabilité) avant d'agir.
-- Idempotente. Retour arrière : rollback/0139_demandes_clients_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.bellaia_demandes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('aide','contact','rgpd_acces','rgpd_rectification','rgpd_effacement','rgpd_portabilite','rgpd_opposition')),
  objet text not null check (length(btrim(objet)) between 3 and 150),
  message text not null check (length(btrim(message)) between 3 and 3000),
  statut text not null default 'recue' check (statut in ('recue','en_cours','repondue','close')),
  reponse text check (length(reponse) <= 5000),
  repondu_le timestamptz,
  repondu_par uuid,
  echeance date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists demandes_user_idx on public.bellaia_demandes(user_id, created_at desc);

create or replace function public.demande_controle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.est_staff_bellaia() then
      new.user_id := auth.uid(); new.statut := 'recue'; new.reponse := null; new.repondu_le := null; new.repondu_par := null;
    end if;
    new.echeance := case when new.type like 'rgpd_%' then (now() + interval '1 month')::date end;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  -- Mise à jour : réservée à l'équipe (règle d'accès) ; champs d'origine figés
  new.id := old.id; new.user_id := old.user_id; new.type := old.type; new.objet := old.objet; new.message := old.message;
  new.created_at := old.created_at; new.echeance := old.echeance; new.updated_at := now();
  if new.reponse is distinct from old.reponse then new.repondu_le := now(); new.repondu_par := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists trg_demande_controle on public.bellaia_demandes;
create trigger trg_demande_controle before insert or update on public.bellaia_demandes for each row execute function public.demande_controle();

-- Notification à la fondatrice (titre générique : le contenu reste dans la demande)
create or replace function public.demande_notifier() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_notifications(user_id, type, titre, contenu, lu)
  select p.id, 'demande_client', case when new.type like 'rgpd_%' then 'Nouvelle demande RGPD (délai : 1 mois)' else 'Nouvelle demande d''aide' end,
         'À traiter dans Administration générale', false
  from public.profiles p where p.role = 'fondatrice';
  -- Accusé de réception pour la personne
  insert into public.bellaia_notifications(user_id, type, titre, contenu, lu)
  values (new.user_id, 'demande_client', 'Votre demande a bien été reçue', new.objet, false);
  return new;
end $$;
drop trigger if exists trg_demande_notifier on public.bellaia_demandes;
create trigger trg_demande_notifier after insert on public.bellaia_demandes for each row execute function public.demande_notifier();

alter table public.bellaia_demandes enable row level security;
drop policy if exists demandes_depot on public.bellaia_demandes;
create policy demandes_depot on public.bellaia_demandes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists demandes_lecture on public.bellaia_demandes;
create policy demandes_lecture on public.bellaia_demandes for select to authenticated using (user_id = auth.uid() or public.est_staff_bellaia());
drop policy if exists demandes_equipe on public.bellaia_demandes;
create policy demandes_equipe on public.bellaia_demandes for update to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
revoke all on public.bellaia_demandes from anon;
grant select, insert, update on public.bellaia_demandes to authenticated;
