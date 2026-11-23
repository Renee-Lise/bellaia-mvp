# Achats et stocks — audit des modules existants et architecture commune (23/11/2026)

Statut : **proposition**. Aucune migration créée ni appliquée.

## 1. Audit : ce qui existe (base de production, comptage exact du 23/11)

| Table | Lignes | Utilisée par | Constat |
|---|---|---|---|
| `stocks` | 394 (BSH 390, Odyssée 4) | boutique BSH, Odyssée, recherche, validation photos | **Seule source réelle de vente.** Pas de colonne référence fournisseur, EAN, fournisseur, disponibilité ni délai : la référence est écrite dans `notes` (« Import Concorde Pro — Réf … »). `quantite` non contrôlée à la commande. |
| `stock_global` | 0 | `core/BellaiaStocks`, `food/FoodStocks`, `coreApi` | Modèle multi-univers déjà bien pensé (business_unit, référence, fournisseur, prix d'achat, prix moyen, stock actuel / réservé / minimum / critique, emplacement, DLC/DDM, `stock_disponible`) mais **vide**. |
| `stock_mouvements` | 0 | `coreApi` | Journal entrées/sorties prévu, jamais alimenté. |
| `stock_reservations` | 0 | `coreApi` | Réservations liées aux commandes, jamais alimentées. |
| `bellaia_fournisseurs` | 0 | aucun écran | Registre commun prévu (univers, délai moyen, minimum de commande, note) — vide. |
| `food_fournisseurs` | 0 | Food | Doublon de `bellaia_fournisseurs` propre à Food. |
| `food_achats` | 0 | Food (`achatsApi`) | Achats avec lignes en JSON, facture, totaux HT/TTC — vide. |
| `food_stocks` | 0 | aucun | Abandonnée. |
| `catalogue_produits` / `catalogue_variantes` | 125 / 21 | Food (vente, allergènes) | Catalogue Food, sans lien avec un article de stock. |
| `food_revente_produits` / `…_commandes_fournisseur` | 14 / 0 | revente partenaires | Spécifique. |
| `events_catalogue` | 68 | Events, vitrines | Prestations (pas de stock physique, sauf location de vaisselle). |
| `bellaia_factures` | 0 | Compta | Factures de vente ; aucune facture d'achat. |

Autres univers (Vil'Dor, Odyssée, papeterie, Éditions, Mo Ti-Péyi) : pas de stock physique géré dans Bellaïa aujourd'hui.

### Risques relevés (Red Team)
1. **Ventes sans contrôle de disponibilité** (BSH) : 50 fiches visibles à quantité 0, dont 30 également en rupture fournisseur.
2. **Prix d'achat non justifiés** : `stocks.prix_achat` vient d'un calcul (≈ 0,70 × tarif de base), pas d'une facture. Aucun coût d'approche (transport vers la Guyane, octroi de mer, douane, frais bancaires).
3. **Trois modèles parallèles** (`stocks`, `stock_global`, `food_*`) : risque d'écarts et de double saisie.
4. **Aucun historique** : impossible de reconstituer une quantité ou un prix à une date donnée.
5. Référence fournisseur dans un champ texte libre : correspondances fragiles (cf. 805085 / 805087 corrigés le 23/11).

## 2. Architecture commune proposée

Principe : **réutiliser `stock_global` / `stock_mouvements` / `stock_reservations` / `bellaia_fournisseurs`** (déjà présents, vides) plutôt que créer un nouveau modèle, et relier chaque fiche de vente à un article de stock.

```
bellaia_fournisseurs ──< fournisseur_articles (réf., EAN, désignation, tarif, conditionnement, stock fournisseur, relevé le)
        │                         │
        └──< achats ──< achats_lignes >── stock_global (article, par univers)
                 │                          │   ├─< stock_mouvements (entrée achat, sortie vente, ajustement inventaire, casse)
           factures d'achat (pièce          │   └─< stock_reservations (panier validé / commande)
           privée, montant réel)            │
                                            └──< liens_vente (stocks BSH | catalogue_produits Food | events_catalogue) 
```

### Champs ajoutés (une seule migration, additive, réversible)
- `stock_global` : `disponibilite` (`en_stock` | `sur_commande` | `indisponible`), `delai_reappro_jours` (renseigné **uniquement** sur confirmation écrite du fournisseur), `delai_source`, `delai_confirme_le`, `ean`, `cout_revient_unitaire` (calculé).
- `fournisseur_articles` (nouvelle) : catalogue fournisseur importé (CSV), une ligne par référence et par relevé → historique de disponibilité et de tarif.
- `achats` / `achats_lignes` (généralisation de `food_achats`) : fournisseur, univers, date, facture (fichier privé), lignes, **frais d'approche répartis** (transport, octroi de mer, douane, frais bancaires), statut (brouillon → commandé → reçu → contrôlé).
- `stocks` (BSH) : `stock_item_id` → `stock_global` ; le statut public est déduit de la disponibilité.

### Règles
- **Coût de revient** = prix facturé + quote-part des frais d'approche (au prorata de la valeur ou du poids), **jamais une remise supposée**.
- **Prix de vente** : proposés par la grille, appliqués uniquement après validation de la fondatrice (journalisés).
- **Rupture** : stock Bellaïa = 0 et fournisseur = 0 → `indisponible` (visible mais non commandable, ou masqué selon le choix de la fondatrice) ; `sur_commande` seulement avec délai confirmé.
- **Réapprovisionnement** : vue `v_reappro` = articles sous le seuil + stock fournisseur + délai + quantité suggérée ; aucune commande fournisseur automatique.
- **Droits** : fondatrice (tout) ; assistante achats (saisie, sans validation des prix) ; responsables d'univers (lecture de leur univers) ; public : uniquement `v_catalogue_public` (jamais prix d'achat ni coûts).

## 3. Plan par lots (chaque migration soumise à accord)
1. **Lot A — sans migration** : import en lecture du fichier fournisseur, rapport de disponibilité (fait le 23/11), corrections de noms confirmées.
2. **Lot B — migration 1 (additive)** : colonnes de disponibilité/délai, `fournisseur_articles`, `achats` / `achats_lignes`, lien `stocks.stock_item_id`. Testée sur base isolée (même branche Supabase que la recette Food et le test de restauration).
3. **Lot C — reprise des données** : création des 390 articles BSH dans `stock_global` depuis `stocks` + fichier fournisseur (script idempotent, vérifié par comptages), rapprochement des factures réelles.
4. **Lot D — écrans** : fournisseurs, achats (saisie de facture), inventaire, ruptures, réapprovisionnement ; boutique : badge « Sur commande — X jours » ou « Temporairement indisponible ».
5. **Lot E** : Food et Events branchés sur le même modèle ; retrait des tables Food doublons après vérification.

## 4. Avancement du Lot A (sans migration) — 23/11/2026
- **Règle de disponibilité commune** : `src/lib/disponibilite.ts` (testée : `tests/unit/t_disponibilite.js`, 15/15). Elle distingue stock physique, réservé, disponible à la vente, stock fournisseur, **sur commande** (uniquement avec délai confirmé par écrit), **rupture**, **retiré du catalogue fournisseur** et **fin de série** (absent chez le fournisseur mais stock restant, vendable jusqu'à épuisement). Dans le doute, un produit n'est **pas** commandable ; `quantiteAcceptable()` empêche de commander plus que le disponible.
- **Application en lecture seule au catalogue BSH en vente (264 fiches, 23/11)** : 238 avec stock en base, 6 fins de série, **20 à stock 0 sans délai confirmé** (encore commandables aujourd'hui — décision de la fondatrice attendue).
- **Point d'attention** : les quantités « en base » ne sont pas des comptages physiques vérifiés (certaines dépassent 1 000 unités) ; un inventaire complet est nécessaire avant de s'y fier pour bloquer les commandes.
- **Inventaire physique** : écran fondatrice (fiche imprimable, saisie, correction tracée, annulation) — `src/modules/concorde/InventaireBSH.tsx`.
- Prochaine étape (Lot B, migration à autoriser) : colonnes `disponibilite`, `delai_reappro_jours`, `stock_reserve`, journal `stock_mouvements` alimenté, puis branchement de la règle sur la boutique et sur la création de commande côté serveur.
