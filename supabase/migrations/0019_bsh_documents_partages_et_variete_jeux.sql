-- ═══════════════════════════════════════════════════════════
-- 0019_bsh_documents_partages_et_variete_jeux.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (9 cartes
--   actives confirmées : AMOUR 3, AUDACE 3, GLOIRE 3 — correspondance
--   exacte à l'attendu)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : deux demandes de Renée-Lise.
--
--   1. "Les documents de base côté hôte (manuel, charte éthique,
--      guide tenues, politique de confidentialité) doivent être
--      remplis ou pré-remplis." Ces 4 titres venaient d'un espace
--      générique (EspaceHote) qui n'a jamais été relié à de vraies
--      données — ils étaient de purs boutons "Demander" sans
--      contenu. Maintenant que l'aperçu hôte route correctement vers
--      HoteBSH (corrigé côté code dans ce même lot), ces documents
--      doivent exister réellement dans bellaia_documents pour être
--      visibles. Ce sont des BROUILLONS rédigés par Claude Code, à
--      relire et valider — pas une politique déjà approuvée.
--
--      Pour que des documents "partagés" (valables pour toutes les
--      hôtesses, pas liés à une seule) soient visibles, la policy de
--      lecture hôtesse de la 0017 est élargie : hote_id = auth.uid()
--      OU hote_id IS NULL (document général du module BSH).
--
--   2. "Pour les cartes à retourner de BSH Game, plusieurs options
--      doivent être proposées même si c'est sur le même thème."
--      Ajoute 2 cartes supplémentaires pour chacun des 3 thèmes déjà
--      en place (AMOUR/GLOIRE/AUDACE), pour plus de variété au
--      tirage sans changer la direction artistique déjà validée.
--
-- Impact : entièrement additif, sauf l'élargissement d'une condition
--   de policy (lecture seule, toujours restreinte à module='BSH' et
--   à une hôtesse active).
-- ═══════════════════════════════════════════════════════════

-- 1. Élargit la lecture des hôtesses aux documents partagés (sans hote_id)
drop policy if exists bellaia_documents_hote_bsh on public.bellaia_documents;
create policy bellaia_documents_hote_bsh on public.bellaia_documents
  for select to authenticated
  using (
    module = 'BSH'
    and public.est_hote_bsh()
    and (hote_id = auth.uid() or hote_id is null)
  );

-- Documents de base, visibles par toutes les hôtesses BSH actives
-- (hote_id laissé vide = partagé). Statut "brouillon" — à faire
-- passer à "valide" par la fondatrice une fois relus.
insert into public.bellaia_documents
  (reference, titre, module, categorie, type_fichier, contenu_html, statut, version)
values
(
  'DOC-2026-BSH001',
  'Manuel Hôtesse BSH',
  'BSH', 'ressource_hotesse', 'texte',
  '<h1>Manuel Hôtesse — Bella''Secret Home</h1>
   <p><em>Brouillon — à relire et valider par la fondatrice.</em></p>
   <h2>Votre rôle</h2>
   <p>En tant qu''hôtesse BSH, vous accueillez, accompagnez et mettez à l''aise les personnes présentes lors des événements et expériences Bella''Secret Home. Votre présence incarne l''élégance, la discrétion et la bienveillance qui définissent la marque.</p>
   <h2>Avant un événement</h2>
   <p>Confirmez votre présence dès réception d''une mission, arrivez à l''heure convenue, et prenez connaissance du déroulé transmis par la fondatrice.</p>
   <h2>Pendant un événement</h2>
   <p>Restez attentive, souriante et professionnelle en toutes circonstances. Aucune attitude jugeante envers les invité·es, quelles que soient leurs questions ou leurs choix. En cas de situation inconfortable ou inappropriée, prévenez immédiatement la fondatrice.</p>
   <h2>Communication</h2>
   <p>Les échanges avec les clientes et clients restent toujours respectueux et professionnels. Aucune coordonnée personnelle n''est partagée sans l''accord explicite de la fondatrice.</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH002',
  'Charte Éthique',
  'BSH', 'ressource_hotesse', 'texte',
  '<h1>Charte Éthique — Bella''Secret Home</h1>
   <p><em>Brouillon — à relire et valider par la fondatrice.</em></p>
   <h2>Respect et non-jugement</h2>
   <p>BSH s''adresse à toutes les personnes avec bienveillance, sans jugement sur leurs choix, leur orientation ou leurs pratiques. Cette valeur s''applique à chaque membre de l''équipe, en toutes circonstances.</p>
   <h2>Consentement</h2>
   <p>Rien n''est jamais imposé. Chaque interaction, chaque animation, chaque moment proposé reste à la libre appréciation des personnes présentes.</p>
   <h2>Confidentialité</h2>
   <p>Ce qui se vit lors d''un événement BSH reste confidentiel. Aucune identité, aucun visage, aucun propos tenu pendant un événement n''est partagé à l''extérieur, sur les réseaux sociaux ou ailleurs.</p>
   <h2>Professionnalisme</h2>
   <p>L''élégance et la sobriété priment toujours sur la vulgarité. BSH ne cultive pas les codes génériques du sex-shop : l''image reste premium, féminine et raffinée.</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH003',
  'Guide Tenues & Style',
  'BSH', 'ressource_hotesse', 'texte',
  '<h1>Guide Tenues &amp; Style — Bella''Secret Home</h1>
   <p><em>Brouillon — à relire et valider par la fondatrice.</em></p>
   <h2>Direction artistique</h2>
   <p>La tenue d''une hôtesse BSH reflète l''identité de la marque : noir velours, bleu nuit, prune, bordeaux, or et rose poudré. Une allure élégante et mystérieuse, jamais vulgaire ni explicite.</p>
   <h2>Recommandations</h2>
   <ul>
     <li>Tenue sombre et soignée, dans la palette de couleurs ci-dessus.</li>
     <li>Accessoires discrets plutôt que voyants.</li>
     <li>Chaussures confortables — les événements impliquent souvent de rester debout.</li>
   </ul>
   <h2>À éviter</h2>
   <p>Tenues explicites, logos visibles d''autres marques, ou tout élément qui détonnerait avec l''ambiance premium et feutrée recherchée.</p>
   <p>En cas de doute avant un événement précis, demandez confirmation à la fondatrice.</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH004',
  'Politique de Confidentialité (interne hôtesses)',
  'BSH', 'ressource_hotesse', 'texte',
  '<h1>Politique de Confidentialité — Hôtesses BSH</h1>
   <p><em>Brouillon — à relire et valider par la fondatrice.</em></p>
   <h2>Ce que vous voyez reste ici</h2>
   <p>Les identités, visages, propos et toute information personnelle concernant les client·es, les membres du Cercle BSH ou de la Lounge BSH ne sortent jamais d''un événement — ni par la parole, ni par écrit, ni sur les réseaux sociaux.</p>
   <h2>Photos et vidéos</h2>
   <p>Aucune photo ou vidéo n''est prise pendant un événement sans l''accord explicite et préalable de la fondatrice, et jamais sans le consentement des personnes présentes.</p>
   <h2>Données internes</h2>
   <p>Les plannings, listes de participant·es et documents internes transmis par la fondatrice restent strictement confidentiels et ne sont partagés avec personne en dehors de l''équipe BSH.</p>
   <h2>En cas de doute</h2>
   <p>Toute question sur ce qui peut ou non être partagé se pose directement à la fondatrice, avant d''agir.</p>',
  'brouillon', 1
)
on conflict do nothing;

-- 2. Variété du tirage Secret Games — 2 cartes de plus par thème existant
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre)
values
  ('❤️', 'AMOUR',  'Quel souvenir à deux vous fait sourire rien que d''y repenser ?', 4),
  ('❤️', 'AMOUR',  'Qu''est-ce qui vous donne le plus envie de vous rapprocher de l''autre, ce soir ?', 5),
  ('👑', 'GLOIRE', 'Quel compliment aimeriez-vous recevoir plus souvent ?', 6),
  ('👑', 'GLOIRE', 'Quelle qualité chez vous mérite d''être plus remarquée ?', 7),
  ('🔥', 'AUDACE', 'Quelle petite audace n''avez-vous encore jamais osée ?', 8),
  ('🔥', 'AUDACE', 'Quel geste surprise aimeriez-vous recevoir ce soir ?', 9)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select reference, titre, statut from public.bellaia_documents
--   where module='BSH' and categorie='ressource_hotesse'
--   order by reference;
--   → attendu : les 4 documents DOC-2026-BSH001 à BSH004, statut
--     'brouillon'.
--
--   select policyname, qual from pg_policies
--   where tablename='bellaia_documents' and policyname='bellaia_documents_hote_bsh';
--   → attendu : qual contient "hote_id IS NULL" en plus de
--     "hote_id = auth.uid()".
--
--   select nom, count(*) from public.bsh_jeux_cartes
--   where statut='active' group by nom order by nom;
--   → attendu : AMOUR 3, AUDACE 3, GLOIRE 3 (9 cartes actives au total).
--
--   Fonctionnel : BSH → aperçu "Hôte / Hôtesse BSH" → onglet Documents
--   doit maintenant afficher les 4 documents, même sans fiche
--   bsh_hotes existante pour le compte en aperçu.
-- ═══════════════════════════════════════════════════════════
