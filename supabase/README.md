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

## Journal des correctifs de sécurité

Trace, pour mémoire et pour le cahier des charges (section 10, BSH Members), les failles découvertes en cours de route sur des tables préexistantes — indépendamment de BSH, mais touchant l'ensemble de l'app.

### 2026-09-22/23 — `profiles` : auto-attribution de rôle/statut/membership_status

**Découvert en construisant** Étape 4 (Mon espace BSH) — sous-page Préférences, en vérifiant les policies RLS de `profiles` avant d'y ajouter une écriture cliente.

**Constat** : `select * from pg_policies where tablename = 'profiles'` montre deux policies `UPDATE` (`modifier_son_profil`, `profiles_self_membership`) dont la condition ne porte que sur la **ligne** (`auth.uid() = id`), jamais sur les **colonnes**. Sans `WITH CHECK` explicite, Postgres réutilise la condition `USING` — donc rien n'empêche une cliente authentifiée d'envoyer elle-même une requête `PATCH /profiles?id=eq.<son-id>` avec `{"role":"fondatrice"}` ou `{"membership_status":"founding_member"}`. Ça touche en particulier le parcours BSH Members déjà en place (`demanderAdhesion`), qui compte sur le fait que le code applicatif n'envoie que `member_pending` — rien côté base n'empêche de contourner ce code.

**Statut** : CORRIGÉ — exécuté le 2026-09-23. Correctif dans `supabase/migrations/0003_profiles_verrou_champs_sensibles.sql` (trigger `BEFORE UPDATE` qui verrouille `role`/`statut`/`membership_status`/`age_verifi` pour tout auteur de requête qui n'est pas fondatrice/assistante). Confirmé actif par Renée-Lise (`verrouiller_champs_sensibles_profiles` sur `profiles`, `BEFORE UPDATE`).

**Point ouvert séparé — RÉSOLU** : confirmé par Renée-Lise (l'écran admin BSH Members a toujours été vide, même avec de vraies demandes en base) — aucune policy staff-wide n'existait. Corrigé par la migration `0005_profiles_staff_access_bsh_members.sql` (VALIDÉE le 2026-09-23), qui ajoute `profiles_staff_all` (fondatrice/assistante lisent/modifient toutes les lignes) via un helper `est_staff_bellaia()`, réutilisé aussi par le trigger de verrouillage — une seule source de vérité pour "l'auteur de la requête est-il staff".

### 2026-09-23 — `profiles` : lien WhatsApp BSH Members exposé côté client

**Découvert en inspectant l'existant avant l'Étape 5** (BSHMembersPage) : le bouton "Accéder à la communauté BSH Members" lisait `process.env.NEXT_PUBLIC_BSH_MEMBERS_WA_LINK` — exactement la variable interdite par le cahier des charges BSH Members §10.1 (elle finit dans le bundle JS public, accessible indépendamment du statut membre).

**Statut** : CORRIGÉ. Nouvelle route serveur authentifiée `src/app/api/bsh-members/whatsapp-link/route.ts` — vérifie `membership_status` via la clé service-role avant de renvoyer le lien, jamais embarqué dans le bundle. Variable renommée `BSH_MEMBERS_WA_LINK` (sans préfixe `NEXT_PUBLIC_`), documentée dans `README.md`.
