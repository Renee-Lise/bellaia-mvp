# Atelier papeterie — audit des patrons et de l'import (24/11/2026)

Ce document ne reproduit pas les liens d'achat : ils restent dans la base, dans la table `events_packs_registre`.

## 1. Patrons Canva, vérifiés un par un
Méthode : lecture seule, avec le connecteur Canva de la fondatrice (métadonnées de chaque design). Rien n'a été copié, modifié ni exporté.

| Pack | Élément | Titre côté Canva | Pages | Nature réelle | Propriétaire | Modifiable depuis Bellaïa ? |
|---|---|---|---|---|---|---|
| Golden Graduation | Chip bag & canette | Graduation Party Favor Template Bundle | 2 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Sac cadeau | Graduation Gift Bag (28 × 18) | 1 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Étiquette | Graduation label Templates | 5 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Gable box | Graduation Gable Box 8x5x5.6 | 4 | document A4 imprimable (1123 × 1588 px) | vendeur A | Non : consultation seule |
| Golden Graduation | Étiquette cadeau | Graduation Gift tag | 1 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Étiquette tube chips + couvercle | Graduation Chipcan label and lid label template | 2 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Boîte cadeau | Graduation Gift Box 8 x 8 | 2 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | T-shirt | Graduation T-shirt Template | 1 | document imprimable statique | vendeur A | Non : consultation seule |
| Golden Graduation | Banderole | Graduation Banner | 1 | document imprimable statique | vendeur A | Non : consultation seule |
| Pack +150 (Yumade) | Pack n°1 | 60 templates_vierges | 73 | document imprimable de 73 pages | vendeur B | Non : consultation seule |
| Pack +150 (Yumade) | Pack n°2 | lien court → lien « modèle » (`mode=preview`) | — | lien de modèle Canva | vendeur B | Seulement après « Utiliser le modèle » dans Canva, qui crée une copie dans le compte de la fondatrice |

**Aucun patron n'est une vidéo.** Les liens `…/view` sont des liens de **consultation**. Sur iPhone, Canva les ouvre dans sa visionneuse plein écran, qui fait défiler les pages comme un diaporama : c'est ce qui donne l'impression d'un lecteur vidéo.

**Exporter un patron est refusé** au compte de la fondatrice (« Not allowed to access design ») tant qu'aucune copie n'existe dans son propre compte. Bellaïa ne peut donc ni modifier ni exporter ces designs directement.

**Pour obtenir un fichier modifiable ou imprimable**, la fondatrice doit agir dans Canva, depuis son compte :
1. ouvrir le lien, puis « Utiliser le modèle » (ou « Modifier une copie ») ;
2. télécharger la copie en PDF ou PNG ;
3. importer le fichier dans la Médiathèque.

Je ne fais pas ces copies à sa place sans son accord.

## 2. Contenus « Drive » du Pack +150
- 1 guide (fichier PDF) et 1 dossier de codes-barres : ce sont des fichiers statiques.
- 9 dossiers « Logos » (Haribo, Smarties, M&m's, Kinder, Lay's, Fruit Shoot, Nutella, Pom'Potes, Pringles) : ce sont des **marques déposées de tiers**. Les utiliser sur des articles vendus (étiquettes de friandises, tubes de chips…) expose à un risque de contrefaçon de marque. À **ne pas utiliser** pour des ventes sans autorisation des titulaires. À trancher par la fondatrice.

## 3. Bouton d'import de la Médiathèque (iPhone)
Causes probables, relevées dans le code (ni reproduites ni confirmées sur iPhone réel) :
- les boutons déclenchaient par programme un champ de fichier invisible (`display:none`), ce que Safari sur iOS peut ignorer selon le contexte ;
- le bouton « Choisir un dossier » repose sur `webkitdirectory`, que Safari sur iOS ne prend pas en charge ;
- après la sélection, les fichiers étaient seulement **mis en file** : il fallait encore appuyer sur « Lancer l'envoi », sans indication immédiate qu'une sélection avait été reçue.

Les corrections et les tests sont décrits dans le compte rendu de livraison.
