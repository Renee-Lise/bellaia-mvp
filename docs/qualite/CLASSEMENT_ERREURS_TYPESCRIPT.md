# Classement des erreurs TypeScript — 23/11/2026

Commande de mesure : `npx tsc --noEmit -p . --pretty false` (TypeScript 5.9.3, `strict: false`).
Rappel : `next.config.js` contient `typescript.ignoreBuildErrors: true` ; ces erreurs ne bloquent donc pas la
compilation Vercel. C'est précisément pourquoi elles doivent être suivies une à une.

| Mesure | Erreurs |
|---|---|
| Avant (relevé initial) | **481** |
| Après corrections de ce lot | **408** |
| dont code actif (atteignable depuis l'application) | **6** (contre 79) |
| dont code mort (fichiers que rien n'importe) | 402 (inchangé) |

Aucune correction n'utilise `any` explicite, `@ts-ignore`, `@ts-expect-error` ni exclusion de fichiers.

## 1. Méthode de classement

Pour chaque fichier en erreur, recherche de ses importateurs (`from '…/fichier'` et `import('…/fichier')`).
Un fichier est « mort » s'il n'est importé que par d'autres fichiers morts.

- **Module `src/modules/events/`** : extraction « Phase 1 » inachevée.
  - Le point d'entrée `index.ts` n'est importé par aucun fichier.
  - `ClientEvents`, `BellaEventsF`, etc. réellement affichés sont définis **dans `BellaiaApp.tsx`** (lignes 10950 et 12702).
  - Les copies extraites n'ont jamais reçu leurs imports (`EV`, `B`, `Btn`, `useState`…), d'où 351 « Cannot find name ».
- **Module `src/modules/assistant/`** : `assistantApi.ts` n'est importé par personne ; les types qu'il attend n'existent plus dans `assistantTypes.ts`.

## 2. Classement par fichier

| Fichier | Avant | Après | Statut | Codes principaux |
|---|---|---|---|---|
| `src/modules/events/ClientEvents.tsx` | 178 | 178 | code mort (non importé) | TS2304×173, TS2339×5 |
| `src/modules/events/EventsCommandesF.tsx` | 73 | 73 | code mort | TS2304×73 |
| `src/components/BellaiaApp.tsx` | 66 | 2 | **code actif** | TS2345×31, TS2322×14, TS2339×8, TS2353×6 |
| `src/modules/events/EventsCatalogue.tsx` | 62 | 62 | code mort | TS2304×62 |
| `src/modules/events/EventsDocumentsF.tsx` | 39 | 39 | code mort | TS2304×39 |
| `src/modules/events/index.ts` | 18 | 18 | code mort | TS2459×16, TS2306×2 |
| `src/modules/assistant/assistantApi.ts` | 6 | 6 | code mort | TS2305×5, TS2724×1 |
| `src/modules/assistant/assistantUtils.ts` | 6 | 6 | code mort | TS2305×5, TS2724×1 |
| `src/modules/events/eventsTypes.ts` | 4 | 4 | code mort | TS2300×4 (champs déclarés deux fois) |
| `src/modules/events/eventsUtils.ts` | 4 | 4 | code mort | TS2459×4 |
| `src/modules/assistant/assistantRouter.ts` | 3 | 3 | code mort | TS2305×3 |
| `src/modules/events/eventsConsts.ts` | 3 | 3 | code mort | TS2304×3 |
| `src/modules/assistant/assistantPrompts.ts` | 2 | 2 | code mort | TS2305×2 |
| `src/modules/events/EventsDemandesF.tsx` | 2 | 2 | code mort | TS2459×2 |
| `src/modules/events/EventsPortail.tsx` | 2 | 2 | code mort | TS2459×2 |
| `src/app/api/food/import/traiter/route.ts` | 2 | 0 | **code actif** | TS2339×2 |
| `src/modules/food/importLib.ts` | 2 | 0 | **code actif** | TS2322×2 |
| `src/app/api/chat/route.ts` | 1 | 0 | **code actif** | TS2339 |
| `src/app/api/paiement/statut/route.ts` | 1 | 1 | **code actif** | TS2322 |
| `src/app/api/paiement/stripe-webhook/route.ts` | 1 | 1 | **code actif** | TS2322 |
| `src/app/api/paiement/stripe/route.ts` | 1 | 1 | **code actif** | TS2304 |
| `src/app/api/payments/stripe/route.ts` | 1 | 1 | **code actif** | TS2322 |
| `src/app/layout.tsx` | 1 | 0 | **code actif** | TS2322 |
| `src/modules/food/FoodCommandes.tsx` | 1 | 0 | **code actif** | TS2345 |
| `src/modules/food/FoodFournisseurs.tsx` | 1 | 0 | **code actif** | TS2345 |
| `src/modules/payments/PaymentCenter.tsx` | 1 | 0 | **code actif** | TS2551 |

## 3. Classement par origine et gravité (481 erreurs initiales)

| Origine | Nombre | Gravité | Traitement |
|---|---|---|---|
| Imports manquants dans des fichiers extraits jamais branchés (events, assistant) | 402 | Nulle en exécution (fichiers non chargés). Risque : quelqu'un les branche tels quels → écran blanc | **Décision demandée** (§5) |
| Paramètres de fonctions non typés devenus « obligatoires » (`creerNotification`, `ecrireAudit`, `gedAutoSave`, `creerEvenementPlanning`) | 35 | Typage seul | **Corrigé** : valeurs par défaut `= undefined` (comportement identique) |
| Objets de style non typés (`CSSProperties`) | 13 | Typage seul | **Corrigé** : annotation `React.CSSProperties` |
| Unions `{ok:true} | {ok:false; raison}` non affinées (effet de `strict:false`) — IA, import Food, erreurs Food | 5 | Typage seul | **Corrigé** : affinage par `"raison" in …` / `typeof … === "string"` |
| Soustraction de dates (`Date - Date`) | 4 | Typage seul | **Corrigé** : `.getTime()` |
| Clés en double dans un objet (le dernier l'emportait) | 3 | Faible : comportement trompeur à la lecture (`documents`, `vilo` déclarés deux fois dans la table des écrans, `fontSize` deux fois) | **Corrigé** : suppression des entrées déjà écrasées |
| Dépendances : types Stripe (`apiVersion "2024-06-20"` alors que le paquet installé déclare `"2023-10-16"`) | 3 | Faible tant que Stripe est désactivé | **Décision** : mise à jour du paquet `stripe` = changement de dépendance soumis à autorisation |
| Variable `stripe` jamais créée dans `/api/paiement/stripe` | 1 | **Critique latente (paiements)** : la route plante si on l'active. Elle est neutralisée (`STRIPE_ACTIF` ≠ `true` → 503) et acceptait un montant fourni par le navigateur | **Décision** : réécriture complète (montant calculé serveur) avant toute activation ; ne pas « réparer » en l'état |
| Drapeau `parentalRequis` (soins Odyssée) posé puis jamais enregistré ni vérifié | 1 | **Fonctionnelle (mineurs)** : l'exigence d'accord parental n'est pas transmise avec la demande de rendez-vous | **Décision** : règle à valider (champ obligatoire ? blocage ?) |
| `user` transmis à `creerNotification` mais ignoré (notification « Devis généré ») | 1 | Faible : notification sans auteur | À traiter avec le module Devis |
| Divers typages (`FileReader` résultat, `parseInt(number)`, état `qte`, `parService`, métadonnée Apple obsolète `apple-touch-fullscreen`, couleur `violetG` inexistante, `Uint8Array` de l'import ZIP, options du formulaire Events) | 13 | Typage seul / balise ignorée par iOS depuis la v4 | **Corrigé** |

Contrôle : 402 + 35 + 13 + 5 + 4 + 3 + 3 + 1 + 1 + 1 + 13 = 481 ; corrigées : 35 + 13 + 5 + 4 + 3 + 13 = 73.

**Données, sécurité, commandes, stocks** : aucune des 481 erreurs ne se situe dans les routes de commandes
(`/api/food/commandes`, BSH), de stocks, d'authentification ou de stockage privé.
Les seules erreurs en chemin « paiement » concernent Stripe, désactivé en production.

## 4. Preuves de non-régression

- Comparaison du JavaScript produit avant/après (transpilation TypeScript) pour les 8 fichiers modifiés. Seules différences :
  - les valeurs par défaut `= undefined`, `.getTime()`, `String(…)` et la garde `typeof result === "string"` (aucun effet sur le résultat) ;
  - la suppression des entrées qui étaient déjà écrasées par la suivante ;
  - le retrait de la balise `apple-touch-fullscreen`.
- Tests rejoués après modification (application lancée sur base simulée) :
  - Food : fondatrice 19/19, assistante 17/17, cliente 17/17 ;
  - registre : 16/16 ;
  - plan du site BSH : 9/9 ;
  - atelier GS unitaires : 34/34 ;
  - atelier complet : 47/47 sur iPhone simulé et 47/47 sur ordinateur.
- Relevés bruts conservés hors dépôt (rapports privés de la fondatrice) : `tsc_avant_481.txt`, `tsc_apres_408.txt`.

## 5. Décisions demandées

1. **Code mort events/assistant (402 erreurs)** — trois options :
   - (a) supprimer ces fichiers (l'historique Git les conserve), le compteur tombe à 6 ;
   - (b) terminer l'extraction : chantier lourd, `BellaiaApp.tsx` fait 14 800 lignes ;
   - (c) les laisser en l'état.

   Recommandation : (a), dans un commit dédié.
2. **Stripe** :
   - ne pas réactiver ;
   - réécrire `/api/paiement/stripe` (montants recalculés côté serveur) avant toute activation ;
   - mettre à jour le paquet `stripe` à ce moment-là.
3. **Accord parental Odyssée** : définir la règle (`parentalRequis`).
4. Une fois le compteur à 0 : retirer `ignoreBuildErrors` de `next.config.js` pour que toute nouvelle erreur bloque le déploiement.
