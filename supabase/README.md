# Migrations Supabase — Bellaïa Hub

Ce dossier trace dans git tout changement de schéma appliqué à la base Supabase du projet, à partir du **19 septembre 2026**. Avant cette date, le schéma a été construit à la main dans le SQL Editor Supabase, sans versioning — cette base existante (tables `profiles`, `stocks`, `clients`, `invoices`, `bellaia_commandes`, `bellaia_paiements`, `member_benefits`, etc.) n'est **pas reconstituée ici** : elle continue de vivre uniquement dans Supabase. Ce dossier ne capture que ce qui change **à partir de maintenant**.

## Pourquoi pas la CLI officielle Supabase

Pas de `supabase/config.toml` ni de lien vers le projet distant : la CLI demanderait un accès réseau et une authentification que cet environnement n'a pas, et ajouterait une dépendance de build. À la place, une convention simple de fichiers `.sql` versionnés dans git, appliqués manuellement dans le SQL Editor Supabase — cohérent avec la façon dont le projet fonctionne déjà. Si un jour la CLI devient utile (déploiement automatisé, environnements de test), on l'ajoutera — ce choix n'est pas définitif.

## Règles non négociables

1. **Aucune migration destructive sans accord explicite.** Pas de `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `TRUNCATE`, ni de modification de données clientes existantes, sauf demande explicite et ponctuelle de Renée-Lise. Par défaut : colonnes ajoutées en `NULL`able, nouvelles tables, jamais de suppression.
2. **Chaque migration est un fichier `.sql` autonome**, numéroté et daté, qui contient tout ce qu'il faut pour être relu et exécuté une seule fois.
3. **Rien ne s'exécute contre la base sans validation, et un "Success" à l'écran ne suffit pas à valider.** Un fichier ajouté dans ce dossier est une **proposition** tant que son en-tête ne porte pas la mention `STATUT: VALIDÉ`. Le workflow est :
   - Le fichier est écrit et commité avec l'en-tête `STATUT: PROPOSITION — EN ATTENTE DE VALIDATION`, et porte obligatoirement une section **Vérification après exécution** (requête SQL + résultat attendu — voir gabarit).
   - Renée-Lise relit le contenu (dans le fichier ou dans le chat).
   - Une fois d'accord, le SQL est copié/exécuté dans le SQL Editor Supabase.
   - **La requête de vérification est lancée et son résultat comparé à l'attendu.** Un message "Success" de l'éditeur SQL porte seulement sur ce qui a été effectivement soumis — il ne prouve pas que la totalité du script a tourné (voir l'incident du 2026-09-28 dans le journal ci-dessous : deux migrations marquées VALIDÉ n'avaient en réalité créé aucune de leurs policies RLS, "Success" ou pas).
   - L'en-tête n'est mis à jour en `STATUT: VALIDÉ — exécuté et vérifié le AAAA-MM-JJ` **qu'après que cette vérification a réussi** — jamais sur la seule base de l'exécution. Si la vérification échoue, le fichier reste en `PROPOSITION` (ou passe à un statut correctif dédié) jusqu'à ce qu'une nouvelle migration corrige l'écart.
   - Ce changement de statut est commité.
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

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   <requête SQL à lancer>
--   → attendu : <résultat exact>
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
```

Cette section **Vérification après exécution** est obligatoire, pas optionnelle : une migration sans elle ne peut pas passer à `VALIDÉ` (règle 3 ci-dessus). Elle décrit précisément ce qu'il faut lire en base pour confirmer que le script a *entièrement* tourné — pas seulement qu'il n'a affiché aucune erreur.

**Pour une migration qui crée une table** : vérifier l'existence de la table elle-même (`select to_regclass('public.ma_table')` → non nul) **avant ou en plus** de compter ses policies. Un `count(*) from pg_policies where tablename = 'ma_table'` à 0 ne dit pas si la table existe sans policy, ou si elle n'existe pas du tout — `pg_policies` ne renvoie jamais d'erreur dans les deux cas (vécu le 2026-09-28 avec `favoris`, voir le journal ci-dessous).

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

### 2026-09-28 — RLS actif sans aucune policy sur 4 tables, malgré des migrations marquées VALIDÉ

**Découvert** en diagnostiquant pourquoi l'admin BSH Members ne pouvait tracer aucune demande d'adhésion (0 ligne dans `bsh_members_demandes`, pour deux comptes pourtant passés à `member_pending`). `select count(*) from pg_policies where tablename = 'bsh_members_demandes'` a renvoyé **0**, alors que `select relrowsecurity from pg_class where relname = 'bsh_members_demandes'` renvoyait `true` : RLS actif, aucune policy — refus total de toute requête non service-role, y compris les propres lectures/écritures des clientes.

**Cause** : les migrations 0001 et 0006, toutes deux marquées `VALIDÉ` avec un "Success" affiché à l'époque, n'ont en réalité pas tourné en entier. Le SQL des deux fichiers est correct (relu et diffé avec git, inchangé depuis leur rédaction) : ce n'est pas un bug de script, mais une exécution partielle jamais détectée, parce que la validation reposait sur le seul message de l'éditeur SQL, jamais sur une vérification en base après coup. Deux cas différents, distingués seulement après coup :
- `bsh_members_demandes` (0006) : la table existe bel et bien (confirmé par un `select` direct qui a renvoyé "0 ligne", pas une erreur) — seules ses 3 `CREATE POLICY` n'avaient jamais été exécutées.
- `favoris`/`panier_items`/`reservations_experiences` (0001) : `favoris` n'existait **pas du tout** (`ERROR 42P01: relation "public.favoris" does not exist`), révélé seulement en essayant d'y appliquer un `ALTER TABLE`. Un premier correctif (0009, version initiale) supposait à tort que seules les policies manquaient, sur la seule foi d'un `count(*) from pg_policies` à 0 — ce chiffre ne distingue pas "table sans policy" de "table inexistante", puisque `pg_policies` ne renvoie jamais d'erreur, juste 0 ligne dans les deux cas. Corrigé dans la version finale de 0009, qui vérifie l'existence des tables via `to_regclass` et les recrée si besoin (`create table if not exists`, sans danger si elles existent déjà).

**Leçon retenue** : un audit RLS basé uniquement sur `pg_policies` peut masquer une table totalement absente. Toute vérification de policies doit être précédée (ou accompagnée) d'une vérification d'existence de table (`to_regclass` ou `information_schema.tables`) — ajouté au gabarit et à la règle 3 ci-dessus.

**Étendue** : un audit complet (requête unique comparant policies attendues/réelles pour toutes les tables/fonctions/triggers créés par 0001 à 0009, plus le bucket `stocks-images`) a confirmé que `stripe_payment_intents` (0002), les triggers/fonctions `profiles` (0003/0005) et le bucket `stocks-images` (0007) sont bien passés en entier — seuls 0001 et 0006 avaient un trou.

**Deuxième trou trouvé en corrigeant le premier** : même en restaurant les policies de `favoris`/`panier_items`/`reservations_experiences`, leurs inserts auraient continué à échouer — aucun des trois composants clients (`FavoriToggle.tsx`, `PanierButton.tsx`, `ReservationsClient.tsx`) n'envoie `user_id`, comptant sur un défaut auto-rempli (`default auth.uid()`) qui n'avait jamais été créé.

**Statut** : CORRIGÉ.
- `bsh_members_demandes` : migration `0008` (VALIDÉE le 2026-09-28) — policies recréées, `demandes_insert_own` durcie (`decision='en_attente'` et `decide_par is null` obligatoires, une cliente ne peut plus forger une auto-décision).
- `favoris`/`panier_items`/`reservations_experiences` : migration `0009` — policies recréées à l'identique de 0001, `default auth.uid()` ajouté sur `user_id`, `reservations_insert_own` durcie (`statut='demande_recue'` obligatoire à la création).
- **Changement de process (règle 3 ci-dessus)** : chaque migration porte désormais une section *Vérification après exécution* obligatoire, et le statut ne passe à `VALIDÉ` qu'après que cette vérification a réussi — plus jamais sur la seule foi d'un "Success" affiché. Les migrations 0001 à 0007 ont été complétées rétroactivement avec cette section.
