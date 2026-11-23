# Recette Bella'Food — parcours de commande premium sur iPhone réel

**À exécuter par la fondatrice**, sur la prévisualisation (base réelle), avant toute ouverture aux clientes. Le catalogue premium reste **fermé aux clientes** : la page de test est réservée à la fondatrice.

- Adresse : prévisualisation Vercel la plus récente, puis **Boutiques › Bella'Food › « Tester le parcours de commande »** (`/apercu/boutiques?u=FOOD&commande=1`).
- Appareil : iPhone réel, Safari, puis l'application ajoutée à l'écran d'accueil.
- Nommer chaque commande d'essai **« TEST — à annuler »** et les annuler à la fin.
- Noter pour chaque ligne : OK / KO, et une capture d'écran en cas de KO.

## A. Catalogue et options

| # | Action | Résultat attendu |
|---|---|---|
| A1 | Ouvrir la vitrine | Produits à tailles affichés « dès X € » ; sous-titres lisibles ; aucun produit sans allergènes validés n'est commandable |
| A2 | Ouvrir « Frites maison » | « Choisissez une taille », puis « Choisissez une base » ; le bouton n'est actif qu'avec les deux |
| A3 | Choisir une taille et une base | Le prix du bouton correspond au prix de la taille |
| A4 | Ouvrir un produit sans allergènes validés | « Indisponible pour l'instant », sans bouton d'ajout |
| A5 | Lire les allergènes d'un plat | Liste identique à la fiche validée dans la bibliothèque |

## B. Panier et quantités

| # | Action | Résultat attendu |
|---|---|---|
| B1 | Ajouter deux produits | Le total du panier est la somme exacte |
| B2 | Appuyer 25 fois sur « + » sur une ligne | Arrêt à 20 |
| B3 | Diminuer jusqu'à 0 | La ligne disparaît |
| B4 | Fermer puis rouvrir le panier | Contenu conservé |

## C. Informations et remise

| # | Action | Résultat attendu |
|---|---|---|
| C1 | Envoyer sans nom | « Indiquez votre nom » |
| C2 | Choisir une date passée | Impossible (calendrier limité à aujourd'hui) |
| C3 | Saisir un code faux | « Code non valide » |
| C4 | Saisir un code valide (créé pour l'essai) | Remise affichée et total estimé diminué |
| C5 | Indiquer une allergie dans le message | Message conservé dans la commande |

## D. Envoi, confirmation et doublons

| # | Action | Résultat attendu |
|---|---|---|
| D1 | Passer en mode Avion, puis Envoyer | Message « réseau indisponible » ; **panier conservé** |
| D2 | Réactiver le réseau, puis appuyer deux fois très vite sur « Envoyer » | **Une seule** commande créée |
| D3 | Lire la confirmation | Référence FOOD-…, lignes, remise, total confirmé |
| D4 | Ouvrir la commande côté fondatrice | Même total, mêmes lignes, base et taille indiquées, allergènes repris, client rattaché au compte |
| D5 | Comparer avec le calcul manuel | Total = Σ (prix de la taille × quantité) − remise, au centime près |

## E. Après la recette

- Annuler les commandes « TEST ».
- Désactiver le code de réduction d'essai.
- Reporter le résultat dans **Accueil › Suivi des exigences › E6.11** (champ « Testée en prévisualisation »).

Contrôles déjà automatisés sur base simulée (23/11) :
- parcours fondatrice : 19 contrôles ;
- assistante et cliente : contrôles d'accès, prix recalculés par le serveur, identité prise de la session, anti-doublon, quantités (0, 21, 1,5, « 2abc », négative, 31 lignes refusés ; 20 acceptés).
