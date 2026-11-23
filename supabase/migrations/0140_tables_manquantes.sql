-- ═══════════════════════════════════════════════════════════════════════════════
-- 0140 — Tables utilisées par l'application mais jamais créées en base (constat du 23/11/2026)
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : sauvegarde dont la restauration réelle conclut « COMPLET », puis
-- accord écrit de la fondatrice. Idempotente. Retour arrière : rollback/0140_tables_manquantes_rollback.sql
--  • notifications     : file des notifications et envois préparés par la fondatrice (centre « Notifications ») ;
--  • webhook_logs      : journal et anti-doublon des événements de paiement (SumUp) ;
--  • pre_comptabilite  : écritures automatiques de vente et d'encaissement.
-- Droits : lecture et écriture réservées à la fondatrice et aux comptes « accès complet » (est_staff_bellaia) ;
-- le serveur écrit avec sa clé de service. Aucun accès client ni anonyme.
-- Non couvertes, par choix : missions_hote, contrats, collaborations_partenaire, factures_partenaire
-- (écrans remplacés par l'espace professionnel commun ; contrats Vilo'Assistance à concevoir).
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  reference text,
  user_id uuid references auth.users(id) on delete set null,
  client_id uuid,
  client_email text check (length(client_email) <= 200),
  client_tel text check (length(client_tel) <= 30),
  pole text,
  type_notification text not null default 'autre',
  titre text not null check (length(titre) <= 200),
  message text check (length(message) <= 4000),
  canal text not null default 'interne' check (canal in ('interne','email','whatsapp','sms')),
  statut text not null default 'a_envoyer' check (statut in ('brouillon','a_envoyer','envoye','echoue','lu')),
  date_prevue timestamptz,
  date_envoi timestamptz,
  source_table text,
  source_id text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_statut_idx on public.notifications(statut, created_at desc);

create table if not exists public.webhook_logs (
  id bigint generated always as identity primary key,
  provider text not null,
  event_type text,
  event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  statut text not null default 'recu' check (statut in ('recu','traite','anomalie','erreur')),
  erreur text,
  recu_le timestamptz not null default now(),
  traite_le timestamptz
);
create index if not exists webhook_logs_event_idx on public.webhook_logs(event_id, statut);

create table if not exists public.pre_comptabilite (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  libelle text not null,
  type_operation text,
  journal text check (journal in ('ventes','banque','achats','caisse','od')),
  pole text,
  mode_paiement text,
  montant_ht numeric(12,2),
  tva numeric(12,2),
  montant_ttc numeric(12,2) not null,
  statut text not null default 'a_valider',
  facture_id uuid,
  paiement_id uuid,
  client_nom text,
  categorie_compta text,
  source text not null default 'manuel',
  cree_le timestamptz not null default now(),
  valide_le timestamptz
);
create index if not exists pre_comptabilite_date_idx on public.pre_comptabilite(date desc, journal);

alter table public.notifications enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.pre_comptabilite enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_staff') then
    create policy notifications_staff on public.notifications for all to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
  end if;
  if not exists (select 1 from pg_policies where tablename='webhook_logs' and policyname='webhook_logs_staff_lecture') then
    create policy webhook_logs_staff_lecture on public.webhook_logs for select to authenticated using (public.est_staff_bellaia());
  end if;
  if not exists (select 1 from pg_policies where tablename='pre_comptabilite' and policyname='pre_comptabilite_staff') then
    create policy pre_comptabilite_staff on public.pre_comptabilite for all to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
  end if;
end $$;
revoke all on public.notifications, public.webhook_logs, public.pre_comptabilite from anon;
