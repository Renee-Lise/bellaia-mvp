# Concorde Pro — diagnostic des images produits BSH

Date : 19/11/2026. Rédigé par Claude Code. **Aucun jeton, aucune adresse privée d'export n'apparaît dans ce document** (le dépôt est public).

## 1. Sources examinées

| Source | Où | Résultat |
|---|---|---|
| `article_negoce.csv` (3 versions transmises) | fichiers déposés par la fondatrice | 2 709 lignes, 9 colonnes : Référence, Famille, Désignation, Code Barre, Suivi Stock, Tarif Base HT, Stock/Jour, Marque. **Aucune colonne image.** |
| Export Store Commander (« cron_init.php », format Shopify) | adresse privée transmise dans la conversation, **jeton masqué** | Colonnes : Handle, Title, Body (HTML), Vendor, Collection, Variant SKU, Variant Inventory Qty, Variant Price, Variant Barcode, **Image Src**, Visibilité, Status, Published. |
| Base Bellaïa, table `stocks` (univers BSH) | Supabase | 390 produits importés depuis Concorde, **0 avec `image_url`**. Les prix de vente sont renseignés. |

## 2. Ce que contient l'export Store Commander (extrait collé par la fondatrice)

Mesures faites sur les lignes collées, **pas sur le flux en direct** (voir § 4) :

- **1 668 références distinctes (Variant SKU)** avec au moins une image ;
- **Images principale + secondaires** : la colonne `Image Src` liste les adresses séparées par des virgules, la première étant l'image principale ; 1 489 produits ont au moins une image secondaire ; de 1 à 17 images par produit (moyenne 3,9) ;
- images hébergées sur `www.concordepro.com/img/p/…/NNNN.jpg` (adresses publiques, sans jeton) ;
- **Stock** (`Variant Inventory Qty`) : présent ; 1 487 produits en stock > 0 ;
- **Prix** (`Variant Price`) : présent pour 1 668 produits — **à confirmer : prix public TTC ou prix revendeur ?** ;
- **Code-barres** (`Variant Barcode`, EAN) : 1 592 produits ;
- `Status` = active pour toutes les lignes collées.

## 3. Correspondance avec les 390 produits BSH de Bellaïa

Rapprochement par **référence exacte** (Référence Bellaïa = Variant SKU) :

| Résultat | Produits |
|---|---|
| Référence trouvée dans l'export, avec images | **279** |
| Référence absente de l'extrait collé | **111** |
| Rapprochement ambigu | 0 |

### Les 111 produits non rapprochés — causes

| Cause | Produits |
|---|---|
| Référence courte à 6 chiffres (ancien format) absente de l'extrait (204 autres références à 6 chiffres, elles, sont rapprochées) | 69 |
| Référence à 12 chiffres absente de l'extrait (produit retiré du catalogue ou extrait incomplet) | 41 |
| Format atypique (10 caractères) | 1 |
| Rapprochables par code-barres (EAN) | 0 |

75 de ces 111 produits ont aussi un prix public « à compléter ». Il faut le flux complet (voir § 4) pour trancher entre « retiré » et « extrait incomplet ».

## 4. Accès réel aux images (test du 20/11)

Test effectué depuis l'environnement de travail après ouverture ponctuelle de `www.concordepro.com` (requêtes d'en-têtes uniquement, **aucune image téléchargée ni enregistrée**) :

- **1 035 images testées** (principales + secondaires des 279 produits rapprochés) : **1 035 répondent HTTP 200** (image/jpeg) ;
- **279 / 279 produits ont une image principale accessible** ; 233 ont au moins une image secondaire accessible ;
- taille de l'image principale : de 55 Ko à 1,1 Mo (médiane 244 Ko) — une version allégée sera préférable pour l'affichage sur iPhone ;
- avec un en-tête « Referer » Bellaïa : 10/10 images servies → **pas de blocage du hotlinking constaté**.

**Non vérifié** : le flux en direct (adresse avec jeton). Sa récupération depuis l'environnement de travail a été refusée par le garde-fou de sécurité (jeton tiré de l'historique de conversation), et elle n'a pas été contournée. La route serveur `/api/bsh/concorde/diagnostic` (réservée à la fondatrice, lecture seule) fera ce contrôle en production avec la variable `CONCORDE_PRO_CATALOG_URL`, **déjà enregistrée sur Vercel en production** (type « Sensitive ») : elle n'est lue que côté serveur et n'est jamais renvoyée.

**Rien n'est affiché dans la boutique** : une correspondance dans le CSV n'est pas une image en ligne. Aujourd'hui, 0 produit BSH a une image en base, et aucun n'est visible côté client.

### Fiches BSH potentiellement commercialisables (après accord)

- 273 produits : rapprochés + image accessible + prix renseigné + pas de mention « à compléter » ;
- 6 produits rapprochés mais prix public « à compléter » ;
- restent à vérifier pour chacun : description, droits d'usage des photos et descriptions, contrôle visuel.

## 5. Demande technique à adresser à Céline BENITEZ (brouillon, non envoyé)

> Bonjour Céline,
>
> Merci pour l'export Store Commander. Nous avons bien retrouvé la colonne « Image Src » avec les photos principales et secondaires. Afin de les intégrer proprement dans notre boutique, pourriez-vous nous confirmer :
>
> 1. **Droits d'utilisation** : sommes-nous autorisés à reproduire ces photos (et les descriptions « Body HTML ») sur notre boutique en ligne et nos supports, et sous quelles conditions (mention, durée, retrait si un produit est déréférencé) ?
> 2. **Hébergement** : pouvons-nous afficher les images directement depuis vos adresses `concordepro.com/img/p/…`, ou devons-nous les copier sur notre propre hébergement ? Y a-t-il une limite de requêtes ou un blocage depuis d'autres domaines ?
> 3. **Format** : existe-t-il une version haute définition (taille recommandée, fond blanc) ?
> 4. **Prix** : la colonne « Variant Price » correspond-elle au prix public conseillé TTC ou à notre prix d'achat ?
> 5. **Stock** : à quelle fréquence l'export est-il mis à jour ?
> 6. **Références** : une centaine de nos références (par exemple au format à 10 chiffres) n'apparaissent pas dans l'export. Pouvez-vous nous indiquer si ces produits sont retirés ou si le fichier est filtré ?
> 7. **Jeton d'accès** : pouvez-vous nous indiquer la procédure pour le renouveler en cas de besoin, et nous prévenir avant toute expiration ?
>
> Bien cordialement,
> Renée-Lise — Bellaïa / BSH

## 6. Procédure sécurisée pour le jeton d'export

1. **Jamais dans le code, les commits, les journaux ni les captures.** Le jeton ne doit pas être collé dans un fichier du dépôt (public).
2. **Stockage** : variable d'environnement côté serveur uniquement, déjà fait : `CONCORDE_PRO_CATALOG_URL` sur Vercel (environnements Preview et Production, type « Sensitive »), ou secret Supabase si l'import passe par une fonction Edge. **Jamais** de préfixe `NEXT_PUBLIC_` (qui l'exposerait au navigateur).
3. **Utilisation** : seule une route serveur réservée à la fondatrice (ou une tâche planifiée) lit la variable ; les erreurs journalisées masquent la partie après `token=`.
4. **Renouvellement** : demander un nouveau jeton à Concorde Pro → remplacer la valeur de la variable sur Vercel → redéployer → vérifier un import à blanc → demander à Concorde de révoquer l'ancien jeton.
5. **En cas de fuite** (jeton visible dans une capture, un message ou un commit) : demander immédiatement la révocation à Concorde Pro, puis appliquer l'étape 4.
6. L'adresse actuelle a été transmise dans la conversation Claude : par précaution, **un renouvellement est recommandé** une fois l'intégration terminée.

## 7. Import des images — plan préparé, NON exécuté

Conditions préalables : réponse de Céline sur les droits (§ 5.1–5.2) **et** accord de la fondatrice.

1. Lancer le diagnostic serveur (bouton fondatrice, route `/api/bsh/concorde/diagnostic`) pour confirmer le flux complet, sans afficher l'adresse.
   Script de rattachement **préparé et non exécuté** (279 produits, image principale seulement, uniquement si `image_url` est vide) : conservé hors du dépôt public, à exécuter seulement sur votre accord.
2. Pour chaque produit BSH : rapprochement par référence exacte, puis par code-barres (EAN) ; les cas ambigus vont dans une liste « à vérifier », jamais rapprochés automatiquement.
3. Écrire seulement `stocks.image_url` (image principale) et conserver les images secondaires dans un champ dédié (à prévoir par migration si la fondatrice le souhaite) ; ne modifier ni le nom, ni le prix, ni le stock.
4. Contrôle visuel des 279 produits rapprochés avant toute mise en vente ; produits sans image ou sans prix public validé : restent en brouillon.
5. Aucune publication automatique.

## 8. Classement produit par produit (20/11)

Comparaison, pour chacun des 390 produits BSH, de la fiche Bellaïa (référence, prix de vente, statut, mentions « à compléter ») avec l'export Concorde Pro (titre, description, marque, stock fournisseur, prix, code-barres, images vérifiées). **Aucune donnée n'a été modifiée.** Le détail par produit (avec prix) est remis à la fondatrice hors du dépôt public.

| Classe | Produits | Signification |
|---|---|---|
| Prêts techniquement | **170** | référence trouvée, image principale accessible, prix de vente renseigné et non provisoire, description fournisseur disponible, en stock chez le fournisseur, fiche active, aucun point réglementaire signalé |
| Incomplets | **38** | 30 en rupture chez le fournisseur, 6 prix « à compléter », 6 prix provisoires (achat + 5 €), 2 sans description (un produit peut cumuler) |
| En attente de validation | **71** | 56 cosmétiques ou produits de contact (composition et mentions à vérifier), 12 produits ingérés ou compléments (allégations et étiquetage), 15 fiches inactives, 6 prix Bellaïa différents du prix de l'export (un produit peut cumuler) |
| Introuvables dans le catalogue fournisseur | **111** | aucun rapprochement fiable trouvé : 0 par code-barres, 0 par nom identique ; **aucune association approximative n'a été faite** |

Même « prêts techniquement », ces produits ne seront publiés qu'après : (1) la confirmation écrite des droits d'utilisation des photos et descriptions par Concorde Pro, (2) votre validation.

**Aperçu illustré** : la vitrine BSH premium a été rendue sur iPhone avec les 170 produits prêts et leurs vraies photos (aperçu local, données simulées, rien n'a été écrit ni publié ; les images ont été chargées dans un cache temporaire supprimé ensuite).

**Remarque importante** : pour 6 produits rapprochés (et d'autres parmi les 111), le prix de vente actuel est exactement le prix d'achat + 5 € — un prix provisoire saisi à l'import, à ne pas publier tel quel.
