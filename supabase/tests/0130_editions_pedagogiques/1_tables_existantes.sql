-- Reproduction (structure seulement, données FICTIVES) des deux tables existantes modifiées par 0130,
-- d'après la base réelle lue le 23/11/2026 (colonnes et règles d'accès).
create table public.histoires_scenes (id uuid primary key default gen_random_uuid(), tome_id uuid, identifiant text, ordre integer, titre text default '', mise_en_scene text, texte text default '', updated_at timestamptz default now(), image_chemin text, image_alt text);
create table public.editions_ressources (id uuid primary key default gen_random_uuid(), collection text, identifiant text, tome integer, scene text, type text, nom_original text, niveau text, version text, provenance text, emplacement_source text, octets bigint, sha256 text, preuve text, publication text, stockage_chemin text, validation jsonb, note text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.histoires_scenes enable row level security; alter table public.editions_ressources enable row level security;
create policy histoires_scenes_fondatrice on public.histoires_scenes for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
create policy editions_ressources_fondatrice on public.editions_ressources for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
insert into public.histoires_scenes (id, identifiant, ordre, titre, texte) values
 ('30000000-0000-0000-0000-000000000001', 'T1-P1', 1, 'Page 1', 'Texte fictif de la page un.'),
 ('30000000-0000-0000-0000-000000000002', 'T1-P2', 2, 'Page 2', 'Texte fictif de la page deux.'),
 ('30000000-0000-0000-0000-000000000003', 'T1-P3', 3, 'Page 3', '');
insert into public.editions_ressources (identifiant, version) values ('ILL-1', 'v1'), ('ILL-2', null);
insert into public.profiles(id, role) values ('00000000-0000-0000-0000-0000000000f1', 'fondatrice'), ('00000000-0000-0000-0000-0000000000a1', 'assistante');
