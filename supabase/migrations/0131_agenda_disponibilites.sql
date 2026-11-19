-- ═══════════════════════════════════════════════════════════
-- 0131_agenda_disponibilites.sql
-- STATUT: PRÉPARÉE — NON APPLIQUÉE (accord de la fondatrice requis)
-- Objet : disponibilités hebdomadaires et indisponibilités du calendrier
--   permanent (aujourd'hui enregistrées sur l'appareil, en simulation).
--   Chaque personne gère les siennes ; la fondatrice voit tout.
--   Aucune réservation n'est créée par cette migration ; additive.
-- Retour arrière : rollback/0131_agenda_disponibilites_rollback.sql
-- ═══════════════════════════════════════════════════════════
create table if not exists public.agenda_disponibilites (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null default auth.uid(),
  univers text,                                            -- null = tous les univers
  jour int not null check (jour between 1 and 7),          -- 1 = lundi
  debut time not null, fin time not null check (fin > debut),
  duree_creneau_min int not null default 60 check (duree_creneau_min between 5 and 480),
  created_at timestamptz not null default now()
);
create table if not exists public.agenda_indisponibilites (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null default auth.uid(),
  jour date not null, debut time, fin time,                -- sans heures = journée entière
  motif text,                                              -- privé : jamais montré aux clientes
  created_at timestamptz not null default now(),
  check (fin is null or debut is null or fin > debut)
);
alter table public.agenda_disponibilites enable row level security;
alter table public.agenda_indisponibilites enable row level security;
do $$ declare t text; begin
  foreach t in array array['agenda_disponibilites', 'agenda_indisponibilites'] loop
    execute format('drop policy if exists %I on public.%I', t || '_moi', t);
    execute format('create policy %I on public.%I for all to authenticated using (proprietaire = auth.uid() or public.is_fondatrice()) with check (proprietaire = auth.uid() or public.is_fondatrice())', t || '_moi', t);
  end loop;
end $$;
revoke all on public.agenda_disponibilites, public.agenda_indisponibilites from anon;
