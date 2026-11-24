# BSH Private Club, BSH Secret World, nominations des hôtes — architecture et état réel (24/11/2026)

Branche `claude/session-sdcuy0`. La production reste au commit `0bfd765`. **Rien n'est déployé et la migration 0144 n'est pas appliquée.**

Ce document ne contient aucun secret ni aucun détail de vulnérabilité. Le catalogue Diamond B est confidentiel : il n'est **pas** dans le dépôt, il est conservé dans le Drive privé de la fondatrice.

## 1. Audit de l'existant, réutilisé et non recréé

| Existant | Constat (base de production, lecture seule) | Réutilisation |
|---|---|---|
| BSH Secret Games (`/bsh/secret-games`) | 8 jeux, 93 cartes, multijoueur par code (`bsh_parties*`, 0 partie), salons (`bsh_salons`, 1 salon) | Conservé tel quel. Relié par deux liens vers le club et le monde. Accessible depuis la table de cartes du Grand Hall. |
| Secret Duo (`/bsh/secret-duo`) | Mêmes tables, `mode = 'duo'` | **Relié** comme 8e univers (`lien_existant`), sans être recréé |
| Vérification d'âge (`AgeGate`) | Confirmation déclarative conservée sur l'appareil | Toujours active sur `/bsh/*`. Le **contrôle serveur** s'appuie sur `profiles.age_verifi` et `date_naissance` (0144) |
| Hôtes (`bsh_hotes`, 3 fiches) et missions (`bsh_missions`, `bellaia_missions`) | Permissions JSON par hôte, sans notion de mandat | Un seul système de nomination (`bsh_hotes_nominations`), relié à `bsh_hotes`, `bellaia_missions`, `bsh_evenements` et aux candidatures (0135) |
| Temps réel | Publication `supabase_realtime` : `bsh_salons` et `bsh_salon_participants` seulement | Présence et déplacements via des canaux **privés** autorisés par la RLS (`realtime.messages`, 0144), sans stocker les positions en base |
| Diamond B (`bsh_musique`, `bsh_musique_liens`, `bsh_playlists`) | 0 titre, 0 lien, 0 playlist | Sessions et salles référencent `bsh_musique` (ambiances autorisées). Aucune table Diamond B dupliquée |
| Mise à jour sans renvoi à l'accueil (P0) | Écran et onglet mémorisés | Le club mémorise son onglet et sa partie ; le monde mémorise la salle, la position et l'avatar |

## 2. Ce qui est livré, et à quel stade

Légende : **Maq** maquette · **Dév** développée · **Test** testée (unitaire, base jetable ou simulateur) · **Multi** multijoueur réellement fonctionnel · **Prév** prévisualisation · **Prod** production · **iPhone** validé sur iPhone réel.

| Élément | Maq | Dév | Test | Multi | Prév | Prod | iPhone |
|---|---|---|---|---|---|---|---|
| Moteur narratif (actes, choix, réponses libres, contraintes, embranchements, fins alternatives, cartes d'événement, indices, chronomètre, votes, scores, sauvegarde et reprise, import et duplication) | — | Oui | Oui (83 contrôles unitaires) | — | Non | Non | Non |
| THE RED ROOM (6 actes, 10 personnages, 6 objets, 5 répliques, 7 distinctions, programme 14 h 45 → 16 h 30) | — | Oui | Oui | **Non** (mode local, un seul appareil) | Non | Non | Non |
| Hub des 8 univers, console d'animation locale, Red Room Awards, compte rendu, annonce WhatsApp à copier | — | Oui | Oui (simulateur) | Non | Non | Non | Non |
| Atelier : import TXT, Markdown et JSON, contrôle, duplication, export | — | Oui (sur l'appareil) | Oui | — | Non | Non | Non |
| Atelier : enregistrement en base, relecture, publication avec validation humaine | — | Oui (0144) | Oui (base jetable) | — | Non | Non | Non |
| Assistant IA de scénarios | **Non développé** : aucune consommation tant que quotas et budget ne sont pas validés | | | | | | |
| Secret World, phase 1 : Grand Hall, Red Room, avatar (13 catégories), toucher, joystick, clavier, collisions, portes, carte, gestes, PNJ étiqueté | **Oui** (joueur seul) | Oui | Oui (30 contrôles unitaires et simulateur) | **Non** | Non | Non | Non |
| Base du club, du monde et des nominations (0144) : adultes, charte, sessions, votes, distinctions, avatars, masques exclusifs, salons, amitiés, blocages, invitations, messages privés, signalements, Secret Coins, inventaire, canaux temps réel | — | Oui | Oui (115 contrôles, 9 comptes distincts, base **fictive**) | Non | Non | **Non appliquée** | — |

## 3. Architecture

- **Rendu du monde** : Canvas 2D natif, isométrique, sans aucune dépendance ajoutée. Les ressources sont dessinées par le code : elles sont originales et ne posent aucune question de droits. Les salles sont décrites par des **données** (`src/modules/bshMonde/monde.ts`), donc en ajouter une ne touche pas au moteur.
  - La boucle de dessin ralentit à l'arrêt (une image toutes les 500 ms) et s'interrompt quand la page est masquée, pour la batterie.
  - La définition d'écran est limitée à ×2.
- **Moteur narratif** : fonctions pures en TypeScript (`src/modules/bshClub/moteurNarratif.ts`). Elles valident chaque action avant écriture, et le serveur refait les contrôles qui comptent : permissions, votes, adultes.
- **Données** : PostgreSQL (0144) avec RLS sur toutes les tables, fonctions `security definer` aux chemins fixés et déclencheurs de contrôle.
  - Les droits d'hôte se calculent à chaque appel avec `bsh_hote_peut(permission, salle)` : mandat accepté, en cours, non suspendu, dans la salle attribuée.
- **Temps réel (phase 2)** : Supabase Realtime en canaux **privés**.
  - `monde:<salle>` : Presence pour la liste des joueurs réellement présents, Broadcast pour les déplacements et les gestes.
  - `club:<session>` : synchronisation des actes, la session faisant foi en base.
  - L'accès aux canaux est contrôlé par les politiques sur `realtime.messages`.
  - Une déconnexion ne fait rien perdre : la position, la session et les réponses sont conservées, et la reconnexion rejoint le canal et relit l'état.
- **Comptes** : ceux de Bellaïa. Il n'y a pas de second compte.

### Alternatives étudiées

| Option | Intérêt | Inconvénients | Décision |
|---|---|---|---|
| Canvas 2D natif | 0 dépendance, léger sur iPhone, maîtrise complète | Il faut tout écrire : collisions, chemins, tri de profondeur (fait) | **Retenu pour les phases 1 à 4** |
| Phaser 3 | Scènes, sprites et caméra prêts à l'emploi | Environ 1 Mo de JavaScript en plus, dépendance à faire autoriser | À réétudier si le nombre d'animations l'exige |
| Three.js ou Babylon.js | Vraie 3D | Lourd, batterie et chaleur sur iPhone, modèles 3D à produire avec des droits vérifiés | Étude seulement en phase 5 |

## 4. Coûts prévisionnels et limites

Ces chiffres viennent de la documentation Supabase consultée le 24/11/2026 (pages « Realtime Limits » et « Realtime Pricing »). Ils restent à confirmer sur la page des tarifs avant toute décision.

- L'organisation Supabase est sur l'offre **Free**.
- Limites Realtime de l'offre Free :
  - 200 connexions simultanées ;
  - 100 messages par seconde ;
  - 20 messages de présence par seconde ;
  - 100 abonnements à des canaux par seconde ;
  - 2 millions de messages par mois inclus.
- Offre Pro :
  - 500 connexions et 5 millions de messages inclus ;
  - au-delà, 2,50 $ par million de messages et 10 $ par tranche de 1 000 connexions de pointe.
- **Conséquence pour la conception** : un message diffusé compte pour chaque destinataire. Pour rester dans l'offre Free :
  - les déplacements « marcher vers un point » envoient **la destination seulement**, une fois par toucher ;
  - le joystick envoie au plus 3 positions par seconde, et seulement pendant le mouvement ;
  - la présence n'est publiée qu'à l'entrée ou à la sortie d'une salle et lors d'un changement d'apparence.
- **Estimation (non vérifiée par un test de charge)** : une salle de 10 joueurs, dont 3 en mouvement continu, représente environ 3 × 3 × 10 = 90 messages par seconde. C'est la limite de l'offre Free. Au-delà d'environ 10 joueurs actifs par salle, il faudra soit l'offre Pro, soit réduire la fréquence.
- **Aucun abonnement ni service payant n'a été souscrit.** L'assistant IA de scénarios n'est pas activé.

## 5. Sécurité et confidentialité (contrôlées en base, testées avec plusieurs comptes)

- **Accès** :
  - réservé aux adultes vérifiés (`age_verifi`, et âge d'au moins 18 ans si la date de naissance est connue) ayant accepté la charte en vigueur ;
  - un compte mineur, un compte non vérifié ou un compte sans charte ne voit rien.
- **Nominations des hôtes** :
  - seule la fondatrice propose une nomination, et seule la personne nommée l'accepte ;
  - toute modification d'une nomination acceptée la **repasse en proposition** : aucune extension silencieuse n'est possible ;
  - la suspension et la révocation prennent effet immédiatement, et une nomination close ne peut pas être rouverte ;
  - l'expiration est automatique ;
  - les permissions interdites (nommer, lire le privé, etc.) sont refusées par une contrainte en base ;
  - tout est historisé.
- **Votes** : un seul par distinction et par votant, jamais pour soi-même, entre participants admis seulement, uniquement quand les votes sont ouverts.
  - Un vote ne peut être ni modifié ni supprimé, et chacun ne voit que le sien.
  - Le dépouillement est agrégé et réservé à l'hôte ; les votes d'un participant exclu sont retirés.
- **Conversations privées** : lisibles par leurs **seuls membres**. Ni un autre membre, ni un hôte, ni la fondatrice n'y ont accès.
  - La modération passe par un signalement, où la personne transmet elle-même un extrait.
- **Masques signature** (Black Secret, Red Mystery, Golden Secret) : réservés à la fondatrice, qu'ils soient portés ou dans une tenue enregistrée.
  - Le badge, le titre et le personnage officiel ne peuvent pas figurer dans l'apparence d'un membre, et le masque ne change aucun droit.
- **Secret Coins** :
  - sans valeur, non convertibles, sans retrait ;
  - attribués uniquement par une fonction serveur, jamais à soi-même, avec un plafond de 200 par personne et par jour pour un hôte ;
  - aucun jeu d'argent, aucune mise, loterie ni achat aléatoire.
- **Anti-harcèlement** :
  - blocage dans les deux sens ;
  - catégories d'invitations que chacun peut désactiver ;
  - au plus 3 invitations en 10 minutes vers une même personne ;
  - toute action partagée doit être acceptée.
- **Conservation** (fonction `bsh_monde_purger`, non planifiée) :
  - messages de salle : 30 jours ;
  - messages privés : 180 jours ;
  - réponses aux sessions terminées : 90 jours ;
  - invitations : 30 jours ;
  - signalements traités : 1 an.

## 6. Phases suivantes (après autorisation)

1. Sauvegarde **COMPLET** restaurée et vérifiée, puis application de 0144 avec l'accord de la fondatrice.
2. **Phase 2** :
   - présence réelle et déplacements synchronisés ;
   - conversations de salle et privées, bulles ;
   - menu contextuel des avatars ;
   - invitations, amis, blocage, signalement ;
   - à **tester avec plusieurs comptes réellement distincts**, puis sur iPhone réel.
3. **Phase 3** : salons personnels (mobilier, décoration, musique autorisée), inventaire, Secret Coins.
4. **Phase 4** :
   - jeux reliés aux objets du monde ;
   - console de la fondatrice et gestion des hôtes ;
   - lancement d'une session depuis Secret Agenda ;
   - Rewards ;
   - studio Diamond B (seulement les titres aux droits vérifiés).
5. **Phase 5** : extension du monde, graphismes, étude de la 3D, tests de charge.

## 7. Diamond B : état des 11 sources

Les 11 liens de conversations partagées sont **inaccessibles depuis l'environnement de travail**. chatgpt.com répond par une vérification anti-robot (code 503) que je n'ai pas cherché à contourner.

Aucune création n'a été récupérée, aucune n'est déclarée importée, et rien n'a été inventé. Le bilan source par source et la procédure d'export sont dans le Drive privé.
