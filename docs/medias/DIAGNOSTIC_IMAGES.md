# Diagnostic transversal des images — 23/11/2026

**Méthode :** lecture seule de la base de production (références d'images par table, objets présents dans chaque espace de stockage, règles d'accès), journaux du service de stockage, lecture du code d'affichage.

## 1. Cause principale
**Les images ne manquent pas à cause d'un défaut d'affichage : elles n'ont jamais été associées aux produits.**
- Aucun produit ni aucune fiche ne référence d'image : catalogue Food, stocks BSH et Odyssée, Mo Ti-Péyi.
- 6 des 8 espaces de stockage sont **vides**.
- Les références existantes (Events, logos) sont **toutes valides**.

## 2. Espaces de stockage
| Espace | Accès | Fichiers | Constat |
|---|---|---|---|
| events-medias | public | 726 (225 Mo) | 719 référencés par la médiathèque Events, 0 référence cassée ; 7 fichiers non référencés (6 imports + logo « Général », utilisé par la fiche Émetteur) |
| stocks-images | public | 7 | dossier `decoration/` : 7 visuels de décoration Events, tous référencés |
| food-recettes-media | public | **0** | prévu pour les photos de recettes et de produits Food |
| bsh-visuels | public | **0** | prévu pour les visuels BSH |
| bellaia-branding | public | **0** | les logos sont livrés dans le dépôt (`public/branding`, 23 fichiers) : rien de cassé |
| histoires-medias | privé | **0** | couvertures et illustrations des livres non produites |
| bsh-documents, equipe-prive | privé | 0 | documents : aucun dépôt à ce jour |

## 3. Par univers
| Univers | Fiches | Avec image | Manquantes | Cause | Correction |
|---|---|---|---|---|---|
| Bella'Food — catalogue | 148 (125 actifs, 23 brouillons) | 0 | 148 | **Aucun champ photo dans le formulaire produit** (défaut corrigé le 23/11) ; aucune photo fournie | Champ photo ajouté (Food › Catalogue › Modifier), envoi vers `food-recettes-media` ; photos à fournir |
| Bella'Food — recettes | 306 | 0 | 306 | Bouton d'envoi existant, jamais utilisé | Photos à fournir |
| Bella'Food — revente | 14 | 0 | 14 | Photos des produits Vil'Dor non fournies | Photos et accord du partenaire |
| Bella'Secret Home — stocks | 390 (264 actifs) | 0 | 390 | Photos Concorde Pro non rattachées : droits d'usage demandés, non obtenus ; l'écran de validation des photos existe | Accord écrit de Concorde, puis rattachement depuis l'écran de validation |
| BSH — campagnes | 5 | 0 | 5 | Visuels non créés | À créer |
| Bella'Odyssée — prestations | 4 | 0 | 4 | Non fournies | Photos de réalisations, avec l'accord des personnes photographiées |
| Bella'Events — médiathèque | 719 | 719 | 0 | — | Fonctionnel |
| Bella'Events — papeterie | 87 modèles | 0 miniature | 87 | Miniatures jamais générées | Génération à l'enregistrement d'un modèle (à faire) |
| Bella'Events — décoration | 7 | 7 | 0 | — | Fonctionnel |
| Mo Ti-Péyi — catalogue | 5 | 0 | 5 | Visuels non produits | Visuels des cartes et du poster |
| Livres (histoires) | 35 tomes, 46 scènes | 0 | 35 couvertures, 46 illustrations | Illustrations non commandées | Voir le dossier « Livres, éléments manquants » (Drive privé) |
| Logos des activités | 8 | 8 | 0 | — | Fonctionnel (`public/branding` et `events-medias/logos`) |

## 4. Autorisations et affichage
- **Lecture :** les espaces publics sont lisibles par tous, comme prévu pour les vitrines. Les espaces privés ne sont accessibles que par liens temporaires.
- **Envoi Food :** réservé à la fondatrice (règles `food_recettes_media_*`).
- **Adresses avec double barre oblique** (`supabase.co//storage/...`) : présentes dans les 719 références Events. Les journaux montrent qu'elles sont bien servies (code 304). Ce n'est pas bloquant ; à normaliser lors d'une prochaine intervention sur la médiathèque.
- **Composants d'affichage :** les vitrines lisent `galerie_photos` (Food) et `image_url` (BSH et Odyssée) ; sans image, elles affichent un visuel de remplacement. Aucun défaut de lecture trouvé.

## 5. Ce qui ne relève pas du code
Photos de produits, visuels BSH (droits Concorde), illustrations des livres, photos de réalisations Odyssée : **contenus à fournir**. Aucune image n'a été créée ni téléchargée sans droits.
