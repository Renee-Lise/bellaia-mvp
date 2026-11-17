-- ═══════════════════════════════════════════════════════════
-- 0102_events_preparation_mediatheque_papeterie.sql
-- Auteur : Claude Code · Date de rédaction : 2026-11-17
-- Objet : Bella'Event "de A à Z" (demande de Renée-Lise du 17/11) :
--   1. events_budget_lignes — liste de courses + dépenses / gains
--      rattachés à un programme (events_programmes), pour calculer
--      le coût réel et la marge d'un événement.
--   2. events_medias + bucket public "events-medias" — médiathèque
--      d'inspiration (déco, papeterie, cliparts) alimentée par import
--      de dossiers entiers (~900 fichiers). Unicité (dossier, nom,
--      taille) pour qu'un import interrompu puisse reprendre sans
--      doublon.
--   3. events_papeterie — atelier papeterie type Canva : chaque
--      création est un document en calques (millimètres). Les lignes
--      est_modele = true sont les patrons d'origine ; on les duplique
--      au nom du client, l'original reste intact (règle du Guide
--      Patrons BELLA_EVENS). Seed : les 20 patrons du Pack
--      Anniversaire, aux formats exacts du guide.
--   Audité avant écriture : aucune de ces 3 tables ni ce bucket
--   n'existait (seules events_catalogue, _commandes, _demandes,
--   _devis, _devis_lignes, _location_vaisselle, _programmes,
--   _visuels_decoration existent).
-- Sécurité : RLS is_fondatrice() en ALL, comme les autres tables
--   events_* ; storage : lecture publique, écriture fondatrice.
-- Idempotent et sans aucune instruction destructive : create if not
--   exists, policies créées seulement si absentes (bloc DO), seed
--   protégé par "where not exists" sur le nom du patron.
-- ═══════════════════════════════════════════════════════════

-- 1. Budget / courses ────────────────────────────────────────
create table if not exists public.events_budget_lignes (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.events_programmes(id) on delete cascade,
  type text not null default 'depense' check (type in ('depense','recette')),
  categorie text,
  libelle text not null,
  quantite numeric default 1,
  unite text,
  prix_unitaire numeric default 0,
  montant_reel numeric,
  dans_courses boolean not null default true,
  achete boolean not null default false,
  fournisseur text,
  notes text,
  ordre int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_budget_lignes_programme_idx on public.events_budget_lignes(programme_id);
alter table public.events_budget_lignes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events_budget_lignes' and policyname = 'events_budget_lignes_fondatrice') then
    create policy events_budget_lignes_fondatrice on public.events_budget_lignes
  for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- 2. Médiathèque ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('events-medias', 'events-medias', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'events_medias_lecture_publique') then
    create policy events_medias_lecture_publique on storage.objects
  for select to anon, authenticated using (bucket_id = 'events-medias');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'events_medias_fondatrice_insert') then
    create policy events_medias_fondatrice_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'events-medias' and public.is_fondatrice());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'events_medias_fondatrice_update') then
    create policy events_medias_fondatrice_update on storage.objects
  for update to authenticated
  using (bucket_id = 'events-medias' and public.is_fondatrice())
  with check (bucket_id = 'events-medias' and public.is_fondatrice());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'events_medias_fondatrice_delete') then
    create policy events_medias_fondatrice_delete on storage.objects
  for delete to authenticated using (bucket_id = 'events-medias' and public.is_fondatrice());
  end if;
end $$;

create table if not exists public.events_medias (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  chemin_storage text not null,
  nom_fichier text not null,
  dossier text not null default '',
  type_mime text,
  taille_octets bigint,          -- taille du fichier d'origine (clé de reprise)
  taille_stockee bigint,         -- taille après compression
  largeur int,
  hauteur int,
  tags text[] not null default '{}',
  occasion text,
  theme text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (dossier, nom_fichier, taille_octets)
);
create index if not exists events_medias_dossier_idx on public.events_medias(dossier);
alter table public.events_medias enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events_medias' and policyname = 'events_medias_fondatrice') then
    create policy events_medias_fondatrice on public.events_medias
  for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- 3. Atelier papeterie ───────────────────────────────────────
create table if not exists public.events_papeterie (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type_support text,
  largeur_mm numeric not null,
  hauteur_mm numeric not null,
  contenu jsonb not null default '{"fond":"#ffffff","calques":[],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb,
  est_modele boolean not null default false,
  modele_source_id uuid references public.events_papeterie(id) on delete set null,
  programme_id uuid references public.events_programmes(id) on delete set null,
  collection text,
  occasion text,
  theme text,
  client_nom text,
  miniature_url text,
  statut text not null default 'brouillon' check (statut in ('brouillon','pret','imprime','archive')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_papeterie_modele_idx on public.events_papeterie(est_modele);
create index if not exists events_papeterie_programme_idx on public.events_papeterie(programme_id);
alter table public.events_papeterie enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events_papeterie' and policyname = 'events_papeterie_fondatrice') then
    create policy events_papeterie_fondatrice on public.events_papeterie
  for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- Seed : 20 patrons BELLA_EVENS Pack Anniversaire (formats du Guide Patrons, en mm)
insert into public.events_papeterie (nom, type_support, largeur_mm, hauteur_mm, contenu, est_modele, collection, occasion, statut)
select v.nom, v.type_support, v.l, v.h, v.contenu, true, 'BELLA_EVENS Pack Anniversaire', 'anniversaire', 'pret'
from (values
  ('BELLA_EVENS 01 — Étiquette bouteille d''eau', 'etiquette_bouteille', 200, 50, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":194,"h":44,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":7,"y":7,"w":36,"h":36,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":47,"y":7,"w":146,"h":10.2,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":6.3,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":47,"y":17.2,"w":146,"h":14.8,"rotation":0,"texte":{"contenu":"Prénom","taille":9.2,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":47,"y":31.9,"w":146,"h":11.1,"rotation":0,"texte":{"contenu":"X ans","taille":6.9,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 02 — Chips wrapper', 'chips_wrapper', 190, 140, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":184,"h":134,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":33.4,"y":7,"w":123.2,"h":47.9,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":57.9,"w":176,"h":21.2,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":13.1,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":79.1,"w":176,"h":30.8,"rotation":0,"texte":{"contenu":"Prénom","taille":19.1,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":109.9,"w":176,"h":23.1,"rotation":0,"texte":{"contenu":"X ans","taille":14.3,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 03 — Étiquette Capri Sun', 'capri_sun', 140, 90, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":134,"h":84,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":25.9,"y":7,"w":88.2,"h":28.9,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":38.9,"w":126,"h":12.4,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":7.7,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":51.3,"w":126,"h":18.1,"rotation":0,"texte":{"contenu":"Prénom","taille":11.2,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":69.4,"w":126,"h":13.6,"rotation":0,"texte":{"contenu":"X ans","taille":8.4,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 04 — Étiquette compote', 'compote', 100, 80, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":94,"h":74,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":19.9,"y":7,"w":60.2,"h":25.1,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":35.1,"w":86,"h":21.7,"rotation":0,"texte":{"contenu":"Prénom","taille":13.4,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":56.7,"w":86,"h":16.3,"rotation":0,"texte":{"contenu":"X ans","taille":10.1,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 05 — Boîte / sachet popcorn', 'popcorn', 120, 180, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":114,"h":174,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":22.9,"y":7,"w":74.2,"h":63.1,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":73.1,"w":106,"h":28.2,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":10.1,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":101.3,"w":106,"h":41,"rotation":0,"texte":{"contenu":"Prénom","taille":25.4,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":142.3,"w":106,"h":30.7,"rotation":0,"texte":{"contenu":"X ans","taille":19.1,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 06 — Mini bonbons', 'mini_bonbons', 80, 50, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":74,"h":44,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":7,"w":66,"h":20.6,"rotation":0,"texte":{"contenu":"Prénom","taille":12.8,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":27.6,"w":66,"h":15.4,"rotation":0,"texte":{"contenu":"X ans","taille":9.6,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 07 — Tube bulles + sticker', 'tube_bulles', 120, 80, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":114,"h":74,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":7,"w":106,"h":24,"rotation":0,"texte":{"contenu":"Prénom","taille":14.9,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":31,"w":106,"h":18,"rotation":0,"texte":{"contenu":"X ans","taille":11.2,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"badge_rond","type":"forme","zone":null,"x":48,"y":49,"w":24,"h":24,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#b5838d","contour":"","epaisseur":0,"rayon":0}},{"id":"badge","type":"texte","zone":"BADGE","x":7,"y":49,"w":106,"h":24,"rotation":0,"texte":{"contenu":"5","taille":14.9,"couleur":"#ffffff","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 08 — Assiette ronde', 'assiette', 90, 90, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":84,"h":84,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":18.4,"y":7,"w":53.2,"h":28.9,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":38.9,"w":76,"h":25.2,"rotation":0,"texte":{"contenu":"Prénom","taille":15.6,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":64.1,"w":76,"h":18.9,"rotation":0,"texte":{"contenu":"X ans","taille":11.7,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 09 — Timbale / gobelet', 'timbale', 230, 80, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":224,"h":74,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":7,"y":7,"w":66,"h":66,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":77,"y":7,"w":146,"h":18.6,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":11.5,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":77,"y":25.6,"w":146,"h":27.1,"rotation":0,"texte":{"contenu":"Prénom","taille":16.8,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":77,"y":52.7,"w":146,"h":20.3,"rotation":0,"texte":{"contenu":"X ans","taille":12.6,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 10 — Invitation digitale (story)', 'invitation_digitale', 108, 192, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":102,"h":186,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":21.1,"y":7,"w":65.8,"h":67.6,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":77.6,"w":94,"h":21.1,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":9,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":98.7,"w":94,"h":30.7,"rotation":0,"texte":{"contenu":"Prénom","taille":19,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":129.4,"w":94,"h":23,"rotation":0,"texte":{"contenu":"X ans","taille":14.3,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"date","type":"texte","zone":"DATE","x":7,"y":152.4,"w":94,"h":11.5,"rotation":0,"texte":{"contenu":"Samedi 00/00 · 14h","taille":7.1,"couleur":"#2d2424","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"lieu","type":"texte","zone":"LIEU","x":7,"y":163.9,"w":94,"h":11.5,"rotation":0,"texte":{"contenu":"Lieu de la fête","taille":7.1,"couleur":"#2d2424","police":"Inter","gras":false,"italique":false,"align":"center"}},{"id":"rsvp","type":"texte","zone":"RSVP","x":7,"y":175.4,"w":94,"h":9.6,"rotation":0,"texte":{"contenu":"RSVP : 0694 00 00 00","taille":5.9,"couleur":"#6d6875","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 11 — Invitation recto verso', 'invitation', 210, 150, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":204,"h":144,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":36.4,"y":7,"w":137.2,"h":51.7,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":61.7,"w":196,"h":16,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":9.9,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":77.7,"w":196,"h":23.2,"rotation":0,"texte":{"contenu":"Prénom","taille":14.4,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":100.9,"w":196,"h":17.4,"rotation":0,"texte":{"contenu":"X ans","taille":10.8,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"date","type":"texte","zone":"DATE","x":7,"y":118.3,"w":196,"h":8.7,"rotation":0,"texte":{"contenu":"Samedi 00/00 · 14h","taille":5.4,"couleur":"#2d2424","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"lieu","type":"texte","zone":"LIEU","x":7,"y":127,"w":196,"h":8.7,"rotation":0,"texte":{"contenu":"Lieu de la fête","taille":5.4,"couleur":"#2d2424","police":"Inter","gras":false,"italique":false,"align":"center"}},{"id":"rsvp","type":"texte","zone":"RSVP","x":7,"y":135.7,"w":196,"h":7.3,"rotation":0,"texte":{"contenu":"RSVP : 0694 00 00 00","taille":4.5,"couleur":"#6d6875","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 12 — Carte de remerciement', 'thank_you', 100, 150, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":94,"h":144,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":7,"w":86,"h":42.7,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":8.2,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":49.7,"w":86,"h":62.2,"rotation":0,"texte":{"contenu":"Prénom","taille":26.1,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"message","type":"texte","zone":"MESSAGE","x":7,"y":111.9,"w":86,"h":31.1,"rotation":0,"texte":{"contenu":"Merci d''être venu·e !","taille":7.4,"couleur":"#2d2424","police":"Inter","gras":false,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 13 — Topper sachet cadeau', 'topper_sachet', 150, 80, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":144,"h":74,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":7,"w":136,"h":29.3,"rotation":0,"texte":{"contenu":"Prénom","taille":18.2,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":36.3,"w":136,"h":22,"rotation":0,"texte":{"contenu":"X ans","taille":13.6,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"message","type":"texte","zone":"MESSAGE","x":7,"y":58.3,"w":136,"h":14.7,"rotation":0,"texte":{"contenu":"Merci d''être venu·e !","taille":9.1,"couleur":"#2d2424","police":"Inter","gras":false,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[{"orientation":"h","position_mm":40}]}}'::jsonb),
  ('BELLA_EVENS 14 — Favor box', 'favor_box', 300, 400, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":294,"h":394,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":49.9,"y":7,"w":200.2,"h":146.7,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":156.7,"w":286,"h":135,"rotation":0,"texte":{"contenu":"Prénom","taille":83.7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":291.7,"w":286,"h":101.3,"rotation":0,"texte":{"contenu":"X ans","taille":62.8,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 15 — Cupcake topper double face', 'cupcake_topper', 120, 70, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":114,"h":64,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":7,"w":106,"h":32,"rotation":0,"texte":{"contenu":"Prénom","taille":19.8,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":39,"w":106,"h":24,"rotation":0,"texte":{"contenu":"X ans","taille":14.9,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[{"orientation":"v","position_mm":60}]}}'::jsonb),
  ('BELLA_EVENS 16 — Cake topper', 'cake_topper', 180, 150, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":174,"h":144,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":7,"w":166,"h":77.7,"rotation":0,"texte":{"contenu":"Prénom","taille":48.2,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":84.7,"w":166,"h":58.3,"rotation":0,"texte":{"contenu":"X ans","taille":36.1,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 17 — Banderole triangle', 'banderole', 150, 200, '{"fond":"#ffffff","calques":[{"id":"fanion","type":"forme","zone":null,"x":3,"y":3,"w":144,"h":194,"rotation":0,"forme":{"forme":"triangle_bas","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.6,"rayon":0}},{"id":"badge","type":"texte","zone":"BADGE","x":30,"y":40,"w":90,"h":60,"rotation":0,"texte":{"contenu":"A","taille":52.5,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 18 — Panneau welcome A4', 'panneau_welcome', 210, 297, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":204,"h":291,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"image","type":"image","zone":"IMAGE","x":36.4,"y":7,"w":137.2,"h":107.5,"rotation":0,"image":{"url":"","ajustement":"cover"}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":117.5,"w":196,"h":42.2,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":18.8,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"prenom","type":"texte","zone":"PRENOM","x":7,"y":159.7,"w":196,"h":61.3,"rotation":0,"texte":{"contenu":"Prénom","taille":38,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"age","type":"texte","zone":"AGE","x":7,"y":221,"w":196,"h":46,"rotation":0,"texte":{"contenu":"X ans","taille":28.5,"couleur":"#c9a84c","police":"Inter","gras":true,"italique":false,"align":"center"}},{"id":"date","type":"texte","zone":"DATE","x":7,"y":267,"w":196,"h":23,"rotation":0,"texte":{"contenu":"Samedi 00/00 · 14h","taille":14.3,"couleur":"#2d2424","police":"Inter","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb),
  ('BELLA_EVENS 19 — Food tent (chevalet)', 'food_tent', 100, 70, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":94,"h":64,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"titre","type":"texte","zone":"TITRE","x":7,"y":7,"w":86,"h":32.4,"rotation":0,"texte":{"contenu":"Joyeux anniversaire","taille":8.2,"couleur":"#b5838d","police":"Georgia","gras":true,"italique":true,"align":"center"}},{"id":"message","type":"texte","zone":"MESSAGE","x":7,"y":39.4,"w":86,"h":23.6,"rotation":0,"texte":{"contenu":"Merci d''être venu·e !","taille":7.4,"couleur":"#2d2424","police":"Inter","gras":false,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[{"orientation":"h","position_mm":35}]}}'::jsonb),
  ('BELLA_EVENS 20 — Planche stickers ronds', 'stickers_ronds', 210, 297, '{"fond":"#ffffff","calques":[{"id":"fond_cadre","type":"forme","zone":null,"x":3,"y":3,"w":204,"h":291,"rotation":0,"forme":{"forme":"rect","remplissage":"#fdf6f0","contour":"#e5c1c8","epaisseur":0.6,"rayon":3}},{"id":"sticker_1","type":"forme","zone":null,"x":12,"y":15,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_1","type":"texte","zone":"PRENOM","x":12,"y":36.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_2","type":"forme","zone":null,"x":77,"y":15,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_2","type":"texte","zone":"PRENOM","x":77,"y":36.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_3","type":"forme","zone":null,"x":142,"y":15,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_3","type":"texte","zone":"PRENOM","x":142,"y":36.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_4","type":"forme","zone":null,"x":12,"y":83,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_4","type":"texte","zone":"PRENOM","x":12,"y":104.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_5","type":"forme","zone":null,"x":77,"y":83,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_5","type":"texte","zone":"PRENOM","x":77,"y":104.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_6","type":"forme","zone":null,"x":142,"y":83,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_6","type":"texte","zone":"PRENOM","x":142,"y":104.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_7","type":"forme","zone":null,"x":12,"y":151,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_7","type":"texte","zone":"PRENOM","x":12,"y":172.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_8","type":"forme","zone":null,"x":77,"y":151,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_8","type":"texte","zone":"PRENOM","x":77,"y":172.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_9","type":"forme","zone":null,"x":142,"y":151,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_9","type":"texte","zone":"PRENOM","x":142,"y":172.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_10","type":"forme","zone":null,"x":12,"y":219,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_10","type":"texte","zone":"PRENOM","x":12,"y":240.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_11","type":"forme","zone":null,"x":77,"y":219,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_11","type":"texte","zone":"PRENOM","x":77,"y":240.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}},{"id":"sticker_12","type":"forme","zone":null,"x":142,"y":219,"w":55,"h":55,"rotation":0,"forme":{"forme":"ellipse","remplissage":"#f5d6dc","contour":"#b5838d","epaisseur":0.5,"rayon":0}},{"id":"sticker_txt_12","type":"texte","zone":"PRENOM","x":142,"y":240.5,"w":55,"h":12,"rotation":0,"texte":{"contenu":"Prénom","taille":7,"couleur":"#2d2424","police":"Georgia","gras":true,"italique":false,"align":"center"}}],"reperes":{"zone_sure_mm":3,"pliage":[]}}'::jsonb)
) as v(nom, type_support, l, h, contenu)
where not exists (select 1 from public.events_papeterie p where p.nom = v.nom and p.est_modele);
