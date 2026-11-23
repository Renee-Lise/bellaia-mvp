# Bella'Food — Bar à boissons : audit, produits à créer, fournisseurs, sécurité alimentaire, plan (23/11/2026)

Statut : **à valider par la fondatrice**. Aucune fiche créée, aucun prix saisi, aucune mise en vente, aucune migration.

## 1. Audit de l'existant (base de production, lecture seule)

| Élément | Constat |
|---|---|
| Produits boissons en vente (`catalogue_produits`) | 15 « boisson » (dont 5 milkshakes : chocolat, vanille, café, caramel, fraise — 5,00 €), 6 « jus » (canne ×3, gingembre, gingembre-curcuma, groseille), 3 « thé glacé » (citronnelle 2,50 €, menthe, gingembre), 4 « cocktail » |
| Recettes (`food_recettes`, 286 au total) | Mêmes boissons + 15 recettes « Bati Vilo » non vendues (ananas, goyave, cupuaçu, corossol, maracuja, mangue, pitaya, pomme rosa, prune de cythère…) + « Smoothie tropical mangue-ananas-banane » |
| **Anomalie 1** | Les 5 milkshakes et le thé glacé citronnelle en vente n'ont **aucun allergène renseigné** (les milkshakes contiennent du lait). À corriger avant toute extension. |
| **Anomalie 2** | « Thé glacé à la citronnelle » existe **en deux recettes** (doublon à fusionner, sans suppression). |
| Statuts | Produits : uniquement « actif » utilisé ; recettes : `a_valider`, `testee`, `actif`, `archivee` → le brouillon des nouvelles boissons = recette `a_valider` + produit `visible_client = false`. |
| Catégories | `catalogue_categories` est vide : les familles sont portées par `categorie_slug` (jus, the_glace, boisson…). |

Modules Food déjà présents et réutilisables (aucune duplication) :

| Besoin | Existant réutilisé |
|---|---|
| Catalogue par famille | `FoodCatalogue.tsx`, `catalogueApi.ts` (`categorie_slug`) |
| Éditeur de recettes et variantes | `FoodRecettes.tsx`, `FoodVersions.tsx` (`food_recettes` : ingrédients, étapes, rendement, allergènes, coûts, prix conseillé, marge, statut, validation) |
| Formats, sucre, lait | `catalogue_variantes` (format/contenant, prix, coût) et `catalogue_options` (groupes « Sucre », « Lait », supplément) — sans migration |
| Ingrédients et fournisseurs | `FoodFournisseurs.tsx` (`food_fournisseurs`, vide) → **à fusionner dans le répertoire fournisseurs commun** (Administration générale) |
| Liste de courses | `FoodCourses.tsx` (aujourd'hui depuis les menus) → à étendre aux commandes |
| Stocks et péremption | `FoodStocks.tsx`, `FoodInventaire.tsx`, `FoodHACCP.tsx` (DLC/DDM) → **sur `stock_global`** (architecture achats-stocks), pas sur `food_stocks` (abandonnée) |
| Coût Guyane | `FoodCalculateur.tsx` + frais d'approche du Lot B achats (transport, octroi de mer, consommables) |
| Affiches et cartes | Atelier papeterie Events (`canvasVersPdf`) + `FoodEtiquettes.tsx` / `FoodMenus.tsx` |
| Comparaison fournisseurs et devis | **Absent** → table « devis fournisseurs » du Lot B achats (migration à autoriser) |
| Publication contrôlée | `visible_client` + règle existante « pas de vente sans allergènes validés » (migration 0126) + validation fondatrice |

## 2. Produits à créer (sans doublon) — 29 boissons demandées

| Famille | Boisson | Situation | Action |
|---|---|---|---|
| Jus | Pomme d'amour | Nouvelle — **identification à confirmer** : en Guyane, « pomme d'amour » désigne *Syzygium malaccense* (pomme malaka) ; ne pas confondre avec la « pomme rosa » (*S. jambos*, recette existante) | Recette + produit (brouillon) |
| Jus | Orange | Nouvelle | Recette + produit |
| Jus | Ananas | **Recette existante** « Boisson à l'ananas » | Produit à partir de la recette |
| Jus | Wasaï | Nouvelle — **précaution sanitaire majeure** (voir §4) | Recette + produit, validation sanitaire obligatoire |
| Jus | Goyave | **Recette existante** « Boisson à la goyave » | Produit à partir de la recette |
| Jus | Cupuaçu | **Recette existante** « Boisson au cupuaçu » | Produit à partir de la recette |
| Thé glacé | Citronnelle | **Existe déjà** (en vente) | Rien à créer ; fusion du doublon de recette ; allergènes à renseigner |
| Thé glacé | Citron-gingembre | Nouvelle (distincte du « thé glacé au gingembre » existant) | Recette + produit |
| Thé glacé | Mélisse | Nouvelle | Recette + produit |
| Thé glacé | Atoumo | Nouvelle — précautions (voir §4) | Recette + produit, validation |
| Thé glacé | Cannelle | Nouvelle — cannelle de Ceylan (voir §4) | Recette + produit |
| Milkshake | Chocolat, vanille, café, caramel, fraise | **Existent déjà** (5,00 €) | Rien à créer ; allergènes à renseigner ; ajout des options lait/sucre |
| Milkshake | Ananas, wasaï, mangue, cupuaçu, corossol, maracuja, gingembre, avocat | 8 nouvelles | Recettes + produits |
| Smoothie | Mangue, fruits rouges, ananas, avocat | 4 nouvelles | Recettes + produits |
| Smoothie | Mangue-ananas | Nouvelle (la recette existante contient aussi de la banane : produit distinct) | Recette + produit |

Bilan : **6 existent déjà** (5 milkshakes, thé citronnelle), **3 produits à créer à partir de recettes existantes**, **20 nouvelles recettes**. Total à créer : **23 produits**, tous en brouillon.

### Options communes (sans prix distinct tant que la fondatrice ne l'a pas validé)
- **Sucre** : « avec sucre ajouté » / « sans sucre ajouté » ; dosage paramétrable en g/L dans la recette (valeur par défaut à définir) ; supplément de prix = 0 tant que non validé.
- **Lait** (milkshakes, smoothies lactés) : lait de vache (allergène : lait) ; alternatives végétales avec allergène indiqué : soja (soja), amande (fruits à coque), avoine (gluten selon l'origine — avoine certifiée sans gluten à privilégier), coco (pas un allergène réglementaire UE).
- **Formats et contenants** : par exemple 33 cl / 50 cl ; gobelet, couvercle, paille (consommables comptés dans le coût de revient).

### Fiche recette (gabarit commun, champs existants de `food_recettes`)
Ingrédients et quantités · étapes · rendement (nombre de verres par lot) · allergènes (14 allergènes UE) · formats · coût matière + consommables + part des frais d'approche · prix de vente proposé · **marge calculée** · conservation · statut `a_valider` · validation (`validee_par`, `validee_le`).

## 3. Fournisseurs étudiés (sites consultés le 23/11/2026 ; robots.txt respectés ; la page « panier » n'a pas été utilisée)

| Fournisseur | Offre utile | Conditions relevées | Guyane |
|---|---|---|---|
| **Univers du Glacier** (universduglacier.com) — clients professionnels (personnes morales) | Bases Fabbri : Frappé milkshake chocolat 18,05 € HT, café 17,05 € HT, yaourt 15,10 € HT ; Mixyfruit (pêche, melon 16,15 € HT/unité, cranberry 22,95 € HT) ; Crema Fredda (café, fior di latte 19,10 € HT) ; matériel : milkshaker 290–619 € HT, blenders 1 290–2 250 € HT | Franco à partir de 550 € HT ; sinon forfait 8 à 45 € HT ; CGV visant la France métropolitaine, la Corse et la zone euro ; pas de franco à l'international | **Non précisé** → devis à demander |
| **Bubble Tea Store** (bubbleteastore.fr) | Perles de fruits (popping boba) ; prix relevés de 80,50 à 111,04 € HT selon les articles (désignations et conditionnements à vérifier fiche par fiche) | **Minimum de commande 250 € HT** ; livraison gratuite dès 490 € HT ; page livraison : « France métropolitaine et Europe » | **Non mentionnée** → devis |
| **ProduitaGlace.fr** (SYLCO, SARL) — professionnels exclusivement | Mix pour frappé café/vanille/chocolat, mix à glace, préparation citronnade, perles de tapioca, gobelets carton 50 cl, pailles, broc gradué ; prix relevés de 25,00 à 145,82 € (HT/TTC à vérifier par fiche) | Franco dès 250 € HT en métropole ; **livre les DOM-TOM, frais sur devis** (CGV du 26/08/2025) | **Oui, sur devis** |
| **Bubble Showroom** (bubbleshowroom.eu) | Ingrédients et équipement bubble tea (catalogue non détaillé sur l'accueil) | Franco 800 € HT (été) / 1 400 € HT selon la page livraison, « France (sauf Outre-Mer) » ; expéditions DHL international, frais et responsabilité à la charge du client | **Hors franco ; DHL à la charge du client** |

À obtenir pour chaque fournisseur avant tout achat (via le module de comparaison) : fiches techniques (composition, **allergènes**, conservation, DLUO), conditionnements exacts, prix HT, minimum de commande, **devis de livraison en Guyane**, transitaire, **octroi de mer** et régime fiscal applicable en Guyane (à confirmer auprès d'un transitaire ou de la douane), chaîne du froid si nécessaire → **coût final rendu en Guyane**.

Constat : les bases industrielles (Fabbri, mix pour frappé) contiennent généralement du lait et des additifs ; leurs allergènes doivent être lus sur la fiche technique, jamais supposés.

## 4. Plantes et fruits — identification et précautions (avant validation des recettes)

| Ingrédient | Identification botanique | Précautions relevées | Statut |
|---|---|---|---|
| Citronnelle | *Cymbopogon citratus* (verveine des Indes), espèce alimentaire | Ne pas utiliser *Cymbopogon nardus/winterianus* (citronnelle de Java, usage répulsif) ; achat auprès d'un fournisseur alimentaire | À vérifier sur l'étiquette fournisseur |
| Mélisse | *Melissa officinalis* | Plante alimentaire courante en infusion ; précautions usuelles (grossesse, traitements thyroïdiens) à vérifier dans une monographie officielle (EMA) — non trouvée dans la recherche du 23/11 | **À compléter** |
| Atoumo | *Alpinia zerumbet* (TRAMIL ; usage traditionnel antillais en infusion de feuilles) | Pas d'avis sanitaire officiel trouvé (ANSES, ARS) ; une source non officielle déconseille grossesse, allaitement, enfants ; études de toxicité trouvées sur une autre espèce (*Zingiber zerumbet*) | **Validation prudente** : mention « déconseillé aux femmes enceintes et aux enfants » proposée ; avis ARS/pharmacien recommandé |
| Cannelle | Préférer *Cinnamomum verum* (Ceylan) | Cannelle Cassia riche en coumarine : DJT 0,1 mg/kg/j (EFSA, repris par le BfR) ; environ 2 g/j de Cassia suffisent à l'atteindre pour un adulte de 60 kg | Ceylan imposée dans la recette |
| Gingembre | *Zingiber officinale* | Usage alimentaire courant ; prudence en cas de traitement anticoagulant (mention facultative) | OK |
| **Wasaï** | Pulpe du palmier *Euterpe oleracea* (açaí) | **Transmission orale de la maladie de Chagas** documentée en Amazonie par des jus de palmiers insuffisamment traités (dont un cas familial publié en Guyane, 2014, avec un jus de palmier *Oenocarpus bacaba*). Aucune recommandation officielle guyanaise de procédé trouvée | **Pulpe pasteurisée d'origine contrôlée uniquement** (jamais de pulpe artisanale crue) ; avis ARS/DAAF avant mise en vente |
| Corossol | *Annona muricata* | EFSA : incertitudes sur les compléments (acétogénines potentiellement neurotoxiques) ; la pulpe consommée comme fruit est d'usage courant, mais aucune dose sûre n'est établie | Pulpe de fruit uniquement (jamais feuilles/graines) ; portion raisonnable |
| Cupuaçu | *Theobroma grandiflorum* | Usage alimentaire courant (déjà vendu en dessert) | OK |
| Maracuja | *Passiflora edulis* | Usage alimentaire courant | OK |
| Pomme d'amour | *Syzygium malaccense* (Guyane) — **à confirmer par la fondatrice** | Usage alimentaire courant | Identification à confirmer |

## 5. Plan d'intégration (par lots, chacun soumis à validation)

| Lot | Contenu | Migration ? |
|---|---|---|
| **B0 — corrections** | Renseigner les allergènes des 6 boissons en vente ; fusionner le doublon de recette citronnelle | Non (données, sur accord) |
| **B1 — fiches brouillon** | 20 recettes `a_valider` + 23 produits `visible_client = false`, options Sucre/Lait/Format sans supplément ; aucun prix public | Non (données, sur accord) |
| **B2 — écrans fondatrice** | Catalogue boissons par famille ; éditeur recette + variantes (réutilise FoodRecettes) ; calcul marge ; affiches/cartes imprimables (atelier papeterie) | Non |
| **B3 — achats et stocks** | Ingrédients et contenants dans `stock_global` ; DLC/DDM ; liste de courses depuis les commandes ; fournisseurs dans le répertoire commun | **Oui** (Lot B achats-stocks) |
| **B4 — coûts Guyane et devis** | Frais d'approche (transport, octroi de mer, consommables) ; comparaison fournisseurs/devis | **Oui** |
| **B5 — publication** | Publication produit par produit après : recette testée, allergènes validés, prix validé, contrôle sanitaire (wasaï, atoumo) | Non |

Aucune étape ne crée de doublon : un seul répertoire fournisseurs, un seul stock, un seul catalogue.
