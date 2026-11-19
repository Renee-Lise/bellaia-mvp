-- Jeu d'essai (base locale jetable uniquement).
create function public.t_erreur(q text) returns text language plpgsql as $$ begin execute q; return 'ACCEPTÉ'; exception when others then return 'REFUSÉ: ' || left(sqlerrm, 70); end $$;
create function public.t_nb(q text) returns int language plpgsql as $$ declare n int; begin execute 'select count(*) from (' || q || ') x' into n; return n; exception when others then return -1; end $$;
grant execute on function public.t_erreur(text), public.t_nb(text) to anon, authenticated;
insert into profiles (id, role, age_verifi, date_naissance) values
 ('00000000-0000-0000-0000-0000000000f0', 'fondatrice', true, '1985-01-01'),
 ('00000000-0000-0000-0000-0000000000c0', 'collaborateur', true, '1990-01-01'),
 ('00000000-0000-0000-0000-0000000000e0', 'assistante', true, '1990-01-01'),
 ('00000000-0000-0000-0000-0000000000a0', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000a1', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000a2', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000a3', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000a4', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000a5', 'cliente', true, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000b1', 'cliente', false, '1991-01-01'),
 ('00000000-0000-0000-0000-0000000000b2', 'cliente', true, '2011-05-01');
insert into bellaia_permissions (user_id, permission, univers) values ('00000000-0000-0000-0000-0000000000c0', 'secret_stories.studio', 'BSH'),
 ('00000000-0000-0000-0000-0000000000e0', 'food.consulter', 'FOOD');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f0"}', false);
insert into ss_oeuvres (id, titre, statut, synopsis, couverture_chemin, couverture_validee) values
 ('10000000-0000-0000-0000-000000000001', 'Œuvre publiée', 'publie', 'Synopsis public', 'oeuvres/o1/couverture.jpg', true),
 ('10000000-0000-0000-0000-000000000002', 'Manuscrit privé', 'ecriture', 'Secret', null, false);
insert into ss_chapitres (oeuvre_id, ordre, titre, texte, statut) values
 ('10000000-0000-0000-0000-000000000001', 1, 'Un', 'Texte intégral du chapitre un', 'valide'),
 ('10000000-0000-0000-0000-000000000001', 2, 'Deux', 'Texte intégral du chapitre deux', 'valide'),
 ('10000000-0000-0000-0000-000000000002', 1, 'Privé', 'Texte du manuscrit privé', 'brouillon');
insert into ss_extraits (oeuvre_id, type, mode, texte, statut) values ('10000000-0000-0000-0000-000000000001', 'texte', 'pages', 'Premières lignes seulement', 'publie');
insert into ss_extraits (oeuvre_id, type, mode, audio_chemin, statut) values ('10000000-0000-0000-0000-000000000001', 'audio', 'duree_audio', 'extraits/o1-3min.mp3', 'publie');
insert into ss_fichiers (oeuvre_id, format, type_fichier, chemin, statut) values
 ('10000000-0000-0000-0000-000000000001', 'ebook', 'epub', 'oeuvres/o1/livre.epub', 'valide'),
 ('10000000-0000-0000-0000-000000000001', 'audio', 'audio_complet', 'oeuvres/o1/livre.mp3', 'valide'),
 ('10000000-0000-0000-0000-000000000002', 'ebook', 'epub', 'oeuvres/o2/livre.epub', 'brouillon');
insert into storage.objects (bucket_id, name) select 'secret-stories-prive', x from unnest(array['oeuvres/o1/couverture.jpg', 'extraits/o1-3min.mp3', 'oeuvres/o1/livre.epub', 'oeuvres/o1/livre.mp3', 'oeuvres/o2/livre.epub']) x;
insert into ss_offres (id, type, oeuvre_id, formats, prix_centimes, statut) values
 ('20000000-0000-0000-0000-000000000001', 'ebook', '10000000-0000-0000-0000-000000000001', array['ebook'], 690, 'publie'),
 ('20000000-0000-0000-0000-000000000002', 'audio', '10000000-0000-0000-0000-000000000001', array['audio'], 1290, 'publie'),
 ('20000000-0000-0000-0000-000000000003', 'pack', '10000000-0000-0000-0000-000000000001', array['ebook','audio'], 1590, 'brouillon');
insert into ss_formules (id, libelle, periodicite, prix_centimes, statut) values ('30000000-0000-0000-0000-000000000001', 'Secret Stories mensuel', 'mensuel', 990, 'publie');
insert into ss_formules_contenus (formule_id, oeuvre_id) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
