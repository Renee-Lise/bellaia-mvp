# Environnement de recette isolé et sauvegardes — constat et options (23/11/2026)

Aucune dépense engagée, aucun service souscrit, aucun projet créé.

## Constat
1. **Organisation Supabase au forfait gratuit** (`plan: free`) avec **2 projets actifs** (« bellaia » et « Ti-Panier ») : le quota gratuit de 2 projets actifs est atteint. Une base de recette gratuite chez Supabase n'est pas possible sans mettre Ti-Panier en pause (non fait).
2. **Sauvegardes** : selon la documentation Supabase, seules les organisations Pro, Team et Enterprise ont des sauvegardes quotidiennes restaurables. Pour le forfait gratuit, Supabase recommande d'exporter soi-même avec `supabase db dump`. **La production Bellaïa n'a donc aujourd'hui aucune sauvegarde automatique restaurable** (risque critique avant toute migration et avant le 8 décembre).
3. **Les migrations du dépôt ne reconstruisent pas la production** : rejouées sur un PostgreSQL vide, 56 sur 141 passent ; les tables de base (`stocks`, `food_recettes`, `catalogue_produits`, `bellaia_conversations`, `business_units`…) ont été créées hors migrations.
4. Les prévisualisations Vercel utilisent la base de production.

## Options sans coût (disponibles)
| Option | Couvre | Limites |
|---|---|---|
| **A. Base simulée** (`tests/iphone/mockapp.js`) + application locale | Parcours écran iPhone/ordinateur (Food, atelier, registre, inventaire, messagerie) | N'est pas la vraie base |
| **B. PostgreSQL 16 local jetable** (`supabase/tests/*/executer.sh`) | Migrations, règles d'accès, attaques (0130, 0131, 0133 testées) | Reproduit seulement les tables concernées |
| **C. Réplique locale complète** à partir d'un **export de structure** (sans données) fait par la fondatrice | Toutes les migrations et règles sur la structure réelle | Nécessite l'export ci-dessous ; pas d'iPhone réel (base locale) |

### Export gratuit à faire par la fondatrice (sauvegarde + réplique)
Sur un ordinateur avec Supabase CLI (le mot de passe de la base n'est jamais transmis à Claude) :
```
supabase login
supabase link --project-ref juewoennvtumkgbrbhme
supabase db dump -f bellaia_structure_AAAA-MM-JJ.sql              # structure seule → réplique de recette
supabase db dump --data-only -f bellaia_donnees_AAAA-MM-JJ.sql     # données → SAUVEGARDE (fichier sensible)
```
- Le fichier de **structure** peut être déposé dans le Drive privé : il permet de bâtir la réplique locale (option C).
- Le fichier de **données** contient des données personnelles : à conserver chiffré, hors dépôt, sur le Drive privé ou un disque chiffré. Sa restauration se teste sur la réplique locale, jamais sur la production.

## Options payantes (à autoriser — prix publics Supabase relevés le 23/11/2026, à confirmer sur supabase.com/pricing)
| Option | Coût indicatif | Apporte |
|---|---|---|
| Passage de l'organisation au forfait **Pro** | 25 $/mois, dont 10 $ de crédit de calcul (couvre un projet « Micro ») ; le **second projet (Ti-Panier) serait facturé** (~10 $/mois en Micro) sauf s'il est déplacé dans une autre organisation gratuite | Sauvegardes quotidiennes restaurables (7 jours), plafond de dépenses, branches de recette |
| **Branche de recette** (Pro requis) | ~0,01344 $/heure en Micro (≈ 0,32 $/jour ; ≈ 10 $/mois si laissée active en permanence) + stockage/egress éventuels ; non couverte par le plafond de dépenses ni par les crédits | Copie isolée avec Auth/Storage, branchable sur une prévisualisation Vercel → **recette sur iPhone réel sans toucher la production** |
| Restauration à la seconde (PITR) | ~100 $/mois (7 jours) | Non nécessaire à ce stade |

## Recommandation
1. **Immédiatement, gratuit** : export structure + données par la fondatrice (sauvegarde hors ligne) ; réplique locale (option C) pour tester 0129–0133.
2. **Avant le 8 décembre** : décider du forfait Pro (sauvegardes restaurables + recette sur iPhone réel via une branche supprimée après usage).

## Mise à jour du 23/11/2026 (après-midi) — sauvegarde complète, restaurable et vérifiée

**Volume réel** : 203 tables, 2 655 lignes (mesure exacte) → une sauvegarde logique complète tient en quelques mégaoctets.
**Inventaire de référence** enregistré dans les rapports privés (« Bellaia_Inventaire_reference_tables_2026-11-23.csv » : lignes par table + empreinte).

| Solution | Coût | Couvre | Limites réelles |
|---|---|---|---|
| **1. Export CLI par la fondatrice** (`supabase db dump` structure + `--data-only` données) puis **contrôle de restauration** (`supabase/tests/restauration/verifier_restauration.sh`) | 0 € | Toutes les tables `public` (structure + données) ; restauration testée en base jetable et comparée table par table | Manuel (à refaire avant chaque migration) ; ne contient pas les **fichiers du stockage** (photos, documents) ni les comptes `auth` (sauf export dédié) ; nécessite un ordinateur avec Supabase CLI et le mot de passe de la base (qui ne doit jamais être transmis) |
| 2. Export des fichiers du stockage (tableau de bord Supabase ou script S3) | 0 € | Photos, documents privés | Manuel ; volumes à vérifier |
| 3. Forfait **Pro** | 25 $/mois (+ ~10 $/mois pour Ti-Panier s'il reste dans l'organisation) | Sauvegardes quotidiennes automatiques, 7 jours, restaurables depuis le tableau de bord | Restauration = remplacement complet du projet (interruption) ; pas les fichiers du stockage ; ne remplace pas un export hors Supabase |
| 4. Pro + PITR | ~100 $/mois de plus | Restauration à la seconde | Sur-dimensionné aujourd'hui |

**Procédure proposée avant toute migration (0133, 0134…)** :
1. Export structure + données (solution 1) + export des fichiers ;
2. Contrôle de restauration : le script doit conclure « COMPLET » ;
3. Application de la migration (sur accord) ;
4. Contrôles après application ; retour arrière prêt.
