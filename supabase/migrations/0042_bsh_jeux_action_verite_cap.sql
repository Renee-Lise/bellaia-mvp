-- ═══════════════════════════════════════════════════════════
-- 0042_bsh_jeux_action_verite_cap.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (16 cartes Action ou Vérité, 10 cartes Cap ou pas cap, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Phase suivante du chantier BSH Secret Games (demande de
--   Renée-Lise) — deux nouveaux jeux, construits sur la fondation
--   posée par la migration 0041 (table bsh_jeux).
--
--   1. "Action ou Vérité" — 8 cartes Vérité + 8 cartes Action,
--      ton BSH (élégant, suggestif, jamais explicite). Intensité
--      "audace".
--   2. "Cap ou pas cap" — 10 cartes défi uniquement (pas de
--      vérité), un ton plus joueur/piment. Intensité "piment".
--
--   Les deux sont créés en statut 'brouillon' — PAS publiés
--   automatiquement : Renée-Lise les relit depuis le Studio
--   (espace fondatrice → 🎲 Jeux), ajuste le contenu si besoin,
--   puis passe elle-même le statut à 'publie' pour les rendre
--   visibles côté client. Cohérent avec la règle du Studio ("rien
--   n'est publié automatiquement").
--
-- Impact : entièrement additif (2 jeux + 18 cartes), idempotent
--   (vérifie l'existence par nom avant de recréer).
-- ═══════════════════════════════════════════════════════════

with jeu_av as (
  insert into public.bsh_jeux (nom, description, icone, type_jeu, intensite, statut, ordre)
  select 'Action ou Vérité', 'Le grand classique, version BSH — un tirage, un choix, une question ou un défi.', '🎭', 'cartes_defis', 'audace', 'brouillon', 2
  where not exists (select 1 from public.bsh_jeux where nom = 'Action ou Vérité')
  returning id
)
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre, statut, jeu_id)
select v.emoji, v.nom, v.question, v.ordre, 'active', jeu_av.id
from jeu_av, (values
  ('💬','Vérité','Quel est le compliment qui vous touche le plus venant de votre partenaire ?',1),
  ('💬','Vérité','Racontez votre tout premier frisson amoureux.',2),
  ('💬','Vérité','Quelle tenue vous donne le plus confiance en vous ?',3),
  ('💬','Vérité','Quel est le geste le plus romantique qu''on vous ait offert ?',4),
  ('💬','Vérité','Un fantasme que vous n''avez jamais osé avouer ?',5),
  ('💬','Vérité','Quelle musique vous met immédiatement dans l''ambiance ?',6),
  ('💬','Vérité','Le compliment que vous aimeriez recevoir plus souvent ?',7),
  ('💬','Vérité','Votre souvenir de soirée préféré avec votre partenaire ?',8),
  ('🔥','Action','Chuchotez à l''oreille de votre partenaire ce que vous aimez chez lui/elle.',9),
  ('🔥','Action','Offrez un massage des mains de deux minutes.',10),
  ('🔥','Action','Dansez un slow improvisé, même sans musique.',11),
  ('🔥','Action','Écrivez un mot doux et glissez-le discrètement quelque part.',12),
  ('🔥','Action','Fixez-vous dans les yeux sans parler pendant trente secondes.',13),
  ('🔥','Action','Complimentez votre partenaire sur trois choses, à voix haute.',14),
  ('🔥','Action','Proposez un toast romantique à votre façon.',15),
  ('🔥','Action','Recréez votre premier rendez-vous en quelques mots.',16)
) as v(emoji, nom, question, ordre)
where exists (select 1 from jeu_av);

with jeu_cap as (
  insert into public.bsh_jeux (nom, description, icone, type_jeu, intensite, statut, ordre)
  select 'Cap ou pas cap', 'Que des défis, rien que des défis — pour celles qui n''ont peur de rien.', '😏', 'cartes_defis', 'piment', 'brouillon', 3
  where not exists (select 1 from public.bsh_jeux where nom = 'Cap ou pas cap')
  returning id
)
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre, statut, jeu_id)
select v.emoji, v.nom, v.question, v.ordre, 'active', jeu_cap.id
from jeu_cap, (values
  ('😏','Cap ou pas cap','Décrivez en une phrase ce qui vous séduit le plus chez votre partenaire, les yeux fermés.',1),
  ('😏','Cap ou pas cap','Improvisez un surnom coquin pour la soirée.',2),
  ('😏','Cap ou pas cap','Proposez un défi que votre partenaire devra relever avant la fin de la soirée.',3),
  ('😏','Cap ou pas cap','Échangez un vêtement ou un accessoire avec votre partenaire, le temps du jeu.',4),
  ('😏','Cap ou pas cap','Quittez la pièce quelques instants... et revenez avec une surprise.',5),
  ('😏','Cap ou pas cap','Proposez une règle secrète pour le reste de la soirée, que vous seuls connaîtrez.',6),
  ('😏','Cap ou pas cap','Imitez votre première rencontre, de façon exagérée.',7),
  ('😏','Cap ou pas cap','Racontez le rêve le plus osé dont vous vous souvenez, sans trop de détails.',8),
  ('😏','Cap ou pas cap','Proposez un gage à votre partenaire s''il perd la prochaine manche.',9),
  ('😏','Cap ou pas cap','Fredonnez la chanson qui vous fait penser à votre partenaire.',10)
) as v(emoji, nom, question, ordre)
where exists (select 1 from jeu_cap);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select j.nom, j.statut, count(c.id) as nb_cartes
--   from public.bsh_jeux j
--   left join public.bsh_jeux_cartes c on c.jeu_id = j.id
--   where j.nom in ('Action ou Vérité','Cap ou pas cap')
--   group by j.nom, j.statut
--   order by j.nom;
--   → attendu : "Action ou Vérité" / brouillon / 16 cartes,
--     "Cap ou pas cap" / brouillon / 10 cartes.
-- ═══════════════════════════════════════════════════════════
