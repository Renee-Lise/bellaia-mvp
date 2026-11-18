-- ═══════════════════════════════════════════════════════════
-- 0104_events_packs_registre.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18 (22 éléments : 9 Canva Golden
--   Graduation, 2 packs Canva + 1 guide + 10 dossiers Drive Yumade ; RLS actif)
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : registre des packs de modèles achetés (consigne Atelier
--   papeterie §19 « registre par pack et par page »). Source : les 2 PDF
--   d'accès envoyés par Renée-Lise le 18/11 :
--   • « Golden Graduation Party Favor Canva Bundle » (1 page, 9 modèles
--     Canva ; chaque lien associé à son libellé par sa position dans le PDF)
--   • « ACCES_PACK_150_TEMPLATES_ETSY » (Yumade) : 2 liens de packs Canva,
--     10 dossiers Google Drive (logos et codes-barres), 1 guide de montage.
--   Ces PDF ne contiennent que des LIENS : les modèles eux-mêmes sont dans
--   Canva / Google Drive et doivent être ouverts avec le compte de la
--   fondatrice, exportés (PDF/PNG) puis importés dans la médiathèque.
--   Les liens publicitaires (formation, boutique) ne sont pas repris.
-- Sécurité : RLS is_fondatrice() (liens d'achat personnels).
-- Idempotent : create if not exists, policy si absente, seed protégé.
-- ═══════════════════════════════════════════════════════════
create table if not exists public.events_packs_registre (
  id uuid primary key default gen_random_uuid(),
  pack text not null,
  element text not null,
  type_support text,
  source text not null check (source in ('canva','drive','autre')),
  lien text not null,
  licence text,
  etat text not null default 'a_ouvrir' check (etat in ('a_ouvrir','copie_canva','exporte','importe','inaccessible')),
  degre_edition text,
  notes text,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack, lien)
);
alter table public.events_packs_registre enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events_packs_registre' and policyname='events_packs_registre_fondatrice') then
    create policy events_packs_registre_fondatrice on public.events_packs_registre for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

insert into public.events_packs_registre (pack, element, type_support, source, lien, licence, ordre)
select v.pack, v.element, v.type_support, v.source, v.lien, v.licence, v.ordre from (values
  ('Golden Graduation Party Favor (Canva)', 'Chip bag & canette (soda can)', 'chips_wrapper', 'canva', 'https://www.canva.com/design/DAHDQSEx8Ys/3A-tsswvunO0wK4J_QIy2A/view', 'Non précisée dans le PDF', 1),
  ('Golden Graduation Party Favor (Canva)', 'Sac cadeau (gift bag)', 'sac_cadeau', 'canva', 'https://www.canva.com/design/DAHDQcej79E/-KxTEQcXh-pDaTuFh4nPgg/view', 'Non précisée dans le PDF', 2),
  ('Golden Graduation Party Favor (Canva)', 'Étiquette (label)', 'etiquette', 'canva', 'https://www.canva.com/design/DAHDQdvEU-M/ru10MjkEzeE_G_I0Od_0ig/view', 'Non précisée dans le PDF', 3),
  ('Golden Graduation Party Favor (Canva)', 'Gable box', 'gable_box', 'canva', 'https://www.canva.com/design/DAHDQeac7os/ZW4ZoZDPpaF5kcsOn97g1A/view', 'Non précisée dans le PDF', 4),
  ('Golden Graduation Party Favor (Canva)', 'Étiquette cadeau (gift tag)', 'etiquette_cadeau', 'canva', 'https://www.canva.com/design/DAHDQbmloWg/MMk0-iUFuQSCA1BBe9IL2A/view', 'Non précisée dans le PDF', 5),
  ('Golden Graduation Party Favor (Canva)', 'Étiquette tube chips + couvercle', 'chips_tube', 'canva', 'https://www.canva.com/design/DAHDQVMlBpY/_W7R_gXdbigiNe4NRIQmRg/view', 'Non précisée dans le PDF', 6),
  ('Golden Graduation Party Favor (Canva)', 'Boîte cadeau (gift box)', 'boite_cadeau', 'canva', 'https://www.canva.com/design/DAHDQdj4e4s/OqfNiIY5ZuDwS28kzZu0YA/view', 'Non précisée dans le PDF', 7),
  ('Golden Graduation Party Favor (Canva)', 'T-shirt', 'textile', 'canva', 'https://www.canva.com/design/DAHDQcF4KaA/ObbUQppgFpgQgVmn4sqlMg/view', 'Non précisée dans le PDF', 8),
  ('Golden Graduation Party Favor (Canva)', 'Banderole (banner)', 'banderole', 'canva', 'https://www.canva.com/design/DAHDQevYkQs/ArMDcKRSXTi4yl0fMSIz_g/view', 'Non précisée dans le PDF', 9),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Pack n°1 (templates Canva)', 'pack', 'canva', 'https://www.canva.com/design/DAHA6jWaXw4/ZUPxZERQ-LULYDFKVuPXSw/view', 'Usage personnel ou professionnel ; revente et redistribution interdites', 1),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Pack n°2 (templates Canva)', 'pack', 'canva', 'https://canva.link/op1k33w92i5lr59', 'Usage personnel ou professionnel ; revente et redistribution interdites', 2),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Guide de bienvenue (méthode & montage)', 'guide', 'drive', 'https://drive.google.com/file/d/1nMV-5jhff8F1AGIG8Gi4AHUCD6TeBmMU/view', 'Usage personnel ou professionnel ; revente et redistribution interdites', 3),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Haribo', 'logos', 'drive', 'https://drive.google.com/drive/folders/1gw7_UMKyqP4eAnxXtSNy4UInlINit3tT', 'Fournis avec le pack ; marques déposées de tiers', 10),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Smarties', 'logos', 'drive', 'https://drive.google.com/drive/folders/1KRt5n7TkoLdwCIx76qVpBoghWmL-6ION', 'Fournis avec le pack ; marques déposées de tiers', 11),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — M&m''s', 'logos', 'drive', 'https://drive.google.com/drive/folders/1fQyb-giQn3-XaMkbfrvycQNJofJdbCeF', 'Fournis avec le pack ; marques déposées de tiers', 12),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Kinder', 'logos', 'drive', 'https://drive.google.com/drive/folders/1181hIvAOO2YFlUnZwqNAVstwWabe5re4', 'Fournis avec le pack ; marques déposées de tiers', 13),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Lay''s', 'logos', 'drive', 'https://drive.google.com/drive/folders/1POWDrUfrJQrAsm48JAYvJfm7GkaZP-Gn', 'Fournis avec le pack ; marques déposées de tiers', 14),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Fruit Shoot', 'logos', 'drive', 'https://drive.google.com/drive/folders/12qMZ93Pba2XClFwER7HwEATQF4vvzYJb', 'Fournis avec le pack ; marques déposées de tiers', 15),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Nutella', 'logos', 'drive', 'https://drive.google.com/drive/folders/1JeDVhedce8ydXgUu9h-5eedIqp3guDQ_', 'Fournis avec le pack ; marques déposées de tiers', 16),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Pom''Potes', 'logos', 'drive', 'https://drive.google.com/drive/folders/1_SxGiFa68hTvSoPNwUmrD0S1xb4ApQDC', 'Fournis avec le pack ; marques déposées de tiers', 17),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Logos — Pringles', 'logos', 'drive', 'https://drive.google.com/drive/folders/1gq6qPPnIlfZBbB3pmA6cDS-a-HqTCqnX', 'Fournis avec le pack ; marques déposées de tiers', 18),
  ('Pack +150 templates Canva (Yumade / Etsy)', 'Codes-barres', 'logos', 'drive', 'https://drive.google.com/drive/folders/1tHMwvHx4pBkoNkbX2PDLcXVN2QgG9INg', 'Fournis avec le pack', 19)
) as v(pack, element, type_support, source, lien, licence, ordre)
where not exists (select 1 from public.events_packs_registre r where r.pack = v.pack and r.lien = v.lien);
