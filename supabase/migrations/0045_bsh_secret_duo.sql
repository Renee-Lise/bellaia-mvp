-- ═══════════════════════════════════════════════════════════
-- 0045_bsh_secret_duo.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Phase 3 du chantier BSH Secret Games — "BSH Secret Duo",
--   l'univers des couples, distinct des jeux communautaires.
--
-- Choix de modélisation :
--   - bsh_jeux.mode ('communautaire' par défaut, ou 'duo') sépare
--     les deux univers sans dupliquer le modèle de données — un
--     jeu Duo reste un bsh_jeux + ses bsh_jeux_cartes, simplement
--     filtré différemment côté client (route /bsh/secret-duo,
--     jamais mélangé au sélecteur communautaire de
--     /bsh/secret-games).
--   - Version 1 volontairement simple : un seul téléphone partagé
--     entre les deux partenaires (pas de synchronisation deux
--     téléphones pour l'instant — ce serait une vraie brique temps
--     réel, à construire séparément si le besoin se confirme).
--   - Aucune réponse écrite n'est jamais enregistrée (le jeu reste
--     oral, comme les jeux communautaires) : rien à garder privé
--     côté serveur au-delà de ce qui existe déjà (bsh_jeux_tirages
--     note juste quelle carte a été tirée, pas la réponse donnée).
--
--   Deux jeux créés, en statut 'brouillon' comme toujours — à
--   relire et publier depuis le Studio avant d'être visibles :
--   1. "Duo Confessions" — 8 cartes, questions personnelles entre
--      partenaires.
--   2. "Les Trois Portes du Désir" — 9 cartes réparties sur 3
--      portes (Confidence/Séduction/Audace), tirées au hasard dans
--      un même paquet.
--
-- Impact : ALTER TABLE ADD COLUMN (nullable→défaut, non
--   destructif) + 2 nouveaux jeux et leurs cartes, idempotent.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_jeux
  add column if not exists mode text not null default 'communautaire'
  check (mode in ('communautaire','duo'));

with jeu_confessions as (
  insert into public.bsh_jeux (nom, description, icone, type_jeu, intensite, statut, mode, ordre)
  select 'Duo Confessions', 'Des questions personnelles, juste pour vous deux — sur un seul téléphone, à tour de rôle.', '💞', 'cartes_defis', 'mystere', 'brouillon', 'duo', 1
  where not exists (select 1 from public.bsh_jeux where nom = 'Duo Confessions')
  returning id
)
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre, statut, jeu_id, intensite)
select v.emoji, v.nom, v.question, v.ordre, 'active', jeu_confessions.id, 'mystere'
from jeu_confessions, (values
  ('💞','Confession','Quel souvenir avec moi vous fait sourire à chaque fois ?',1),
  ('💞','Confession','Qu''est-ce que vous n''osez pas me dire au quotidien, mais que vous pensez souvent ?',2),
  ('💞','Confession','Quel est le moment où vous vous êtes senti(e) le plus proche de moi ?',3),
  ('💞','Confession','Si vous deviez décrire notre histoire en trois mots, lesquels choisiriez-vous ?',4),
  ('💞','Confession','Quelle habitude chez moi vous attendrit le plus ?',5),
  ('💞','Confession','Qu''aimeriez-vous qu''on essaie ensemble, qu''on n''a jamais fait ?',6),
  ('💞','Confession','Quel est votre souvenir le plus romantique de nous deux ?',7),
  ('💞','Confession','Qu''est-ce qui vous rassure le plus dans notre relation ?',8)
) as v(emoji, nom, question, ordre)
where exists (select 1 from jeu_confessions);

with jeu_portes as (
  insert into public.bsh_jeux (nom, description, icone, type_jeu, intensite, statut, mode, ordre)
  select 'Les Trois Portes du Désir', 'Confidence, Séduction ou Audace — chaque tirage ouvre une porte différente.', '🚪', 'cartes_defis', 'audace', 'brouillon', 'duo', 2
  where not exists (select 1 from public.bsh_jeux where nom = 'Les Trois Portes du Désir')
  returning id
)
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre, statut, jeu_id, intensite)
select v.emoji, v.nom, v.question, v.ordre, 'active', jeu_portes.id, v.intensite
from jeu_portes, (values
  ('💭','Porte Confidence','Partagez un secret que vous n''avez jamais confié à personne d''autre.',1,'mystere'),
  ('💭','Porte Confidence','Quelle est la qualité de votre partenaire que vous admirez le plus en silence ?',2,'mystere'),
  ('💭','Porte Confidence','Racontez le moment où vous avez su que c''était du sérieux.',3,'mystere'),
  ('💋','Porte Séduction','Décrivez ce qui vous a séduit chez votre partenaire la première fois.',4,'audace'),
  ('💋','Porte Séduction','Chuchotez un compliment à l''oreille de votre partenaire.',5,'audace'),
  ('💋','Porte Séduction','Offrez un regard de trois secondes, sans rien dire.',6,'audace'),
  ('🔥','Porte Audace','Proposez un défi romantique pour la fin de la soirée.',7,'piment'),
  ('🔥','Porte Audace','Racontez un fantasme léger que vous aimeriez partager.',8,'piment'),
  ('🔥','Porte Audace','Inventez une scène improvisée avec votre partenaire, le temps d''une minute.',9,'piment')
) as v(emoji, nom, question, ordre, intensite)
where exists (select 1 from jeu_portes);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select j.nom, j.statut, j.mode, count(c.id) as nb_cartes
--   from public.bsh_jeux j
--   left join public.bsh_jeux_cartes c on c.jeu_id = j.id
--   where j.mode = 'duo'
--   group by j.nom, j.statut, j.mode
--   order by j.nom;
--   → attendu : "Duo Confessions" / brouillon / duo / 8 cartes,
--     "Les Trois Portes du Désir" / brouillon / duo / 9 cartes.
-- ═══════════════════════════════════════════════════════════
