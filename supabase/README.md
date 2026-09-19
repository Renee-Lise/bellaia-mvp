# Migrations Supabase — Bellaïa Hub

Ce dossier trace dans git tout changement de schéma appliqué à la base Supabase du projet, à partir du **19 septembre 2026**. Avant cette date, le schéma a été construit à la main dans le SQL Editor Supabase, sans versioning — cette base existante (tables `profiles`, `stocks`, `clients`, `invoices`, `bellaia_commandes`, `bellaia_paiements`, `member_benefits`, etc.) n'est **pas reconstituée ici** : elle continue de vivre uniquement dans Supabase. Ce dossier ne capture que ce qui change **à partir de maintenant**.

## Pourquoi pas la CLI officielle Supabase

Pas de `supabase/config.toml` ni de lien vers le projet distant : la CLI demanderait un accès réseau et une authentification que cet environnement n'a pas, et ajouterait une dépendance de build. À la place, une convention simple de fichiers `.sql` versionnés dans git, appliqués manuellement dans le SQL Editor Supabase — cohérent avec la façon dont le projet fonctionne déjà. Si un jour la CLI devient utile (déploiement automatisé, environnements de test), on l'ajoutera — ce choix n'est pas définitif.

## Règles non négociables

1. **Aucune migration destructive sans accord explicite.** Pas de `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `TRUNCATE`, ni de modification de données clientes existantes, sauf demande explicite et ponctuelle de Renée-Lise. Par défaut : colonnes ajoutées en `NULL`able, nouvelles tables, jamais de suppression.
2. **Chaque migration est un fichier `.sql` autonome**, numéroté et daté, qui contient tout ce qu'il faut pour être relu et exécuté une seule fois.
3. **Rien ne s'exécute contre la base sans validation.** Un fichier ajouté dans ce dossier est une **proposition** tant que son en-tête ne porte pas la mention `STATUT: VALIDÉ`. Le workflow est :
   - Le fichier est écrit et commité avec l'en-tête `STATUT: PROPOSITION — EN ATTENTE DE VALIDATION`.
   - Renée-Lise relit le contenu (dans le fichier ou dans le chat).
   - Une fois d'accord, le SQL est copié/exécuté dans le SQL Editor Supabase.
   - L'en-tête est mis à jour en `STATUT: VALIDÉ — exécuté le AAAA-MM-JJ`, et ce changement est commité.
4. **BSH Members (section 10 du cahier des charges)** suit exactement ce même circuit : migration écrite en entier, RLS documentées, montrées avant toute exécution.

## Convention de nommage

```
supabase/migrations/NNNN_description_courte.sql
```

- `NNNN` : numéro séquentiel sur 4 chiffres (`0001`, `0002`...), pas de timestamp — un seul contributeur, l'ordre suffit et reste lisible.
- `description_courte` : snake_case, en français, qui dit ce que la migration ajoute (`0001_bsh_catalogue_favoris_panier.sql`).
- Une migration ne fait qu'une chose cohérente. Si un sujet grossit, nouveau fichier plutôt que fichier fourre-tout.

## Convention de nommage des colonnes discriminantes (pôle/univers)

Les tables existantes utilisent trois conventions différentes selon leur date de création : `univers` en minuscules (`"bsh"`, `"bo"`...), `bu` en majuscules (`"ODYSSEE"`, `"FOOD"`...), `pole` en majuscules (`"EVENTS"`...). On ne renomme **rien** dans les tables existantes — ça casserait du code qui marche. Mais **toute nouvelle table à partir de maintenant** utilise :

- une colonne nommée `univers`
- valeurs en minuscules, alignées sur les identifiants déjà utilisés côté client dans `UNIVERS_CLIENT` : `bsh`, `bo`, `bev`, `bfd`, `vilo`, `bse`, `mtp` (+ `general`/`structure` pour ce qui est transverse fondatrice).

## Gabarit d'une migration

```sql
-- ═══════════════════════════════════════════════════════════
-- NNNN_description_courte.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : AAAA-MM-JJ
-- Objet : (une phrase)
-- Impact : additive uniquement / RLS ajoutées / aucune donnée existante modifiée
-- ═══════════════════════════════════════════════════════════

-- ... SQL ici ...
```
