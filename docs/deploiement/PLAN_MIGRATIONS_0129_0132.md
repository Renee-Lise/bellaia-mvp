# Plan d'application sécurisé — migrations 0129, 0130, 0131, 0132

**Statut : aucune de ces migrations n'est appliquée.** Rien ne sera exécuté sans votre GO explicite, migration par migration (« GO 0131 », etc.). 0128 n'est pas concernée.

## Prérequis vérifiés sur la base réelle (lecture seule, 20/11) — 14/14

| Contrôle | Résultat |
|---|---|
| 0129 : fonctions `is_fondatrice` / `a_permission` présentes | OK |
| 0129 : aucune table `ss_*`, aucun espace de stockage `secret-stories-prive` | OK |
| 0130 : tables `histoires_scenes` et `editions_ressources` présentes, colonne `updated_at` présente | OK |
| 0130 : aucune colonne `texte_creole`, aucune table de versions ou de fiches, aucun déclencheur existant | OK |
| 0131 : tables d'agenda absentes | OK |
| 0132 : `bsh_mon_hote()` et `bsh_hotes_documents` (issus de 0128) présents | OK |
| 0132 : espace privé `equipe-prive` présent et non public ; `storage.foldername` disponible ; règle `hotes_documents_depot` absente | OK |
| `gen_random_uuid()` disponible | OK |

## Ordre conseillé

Du moins risqué au plus structurant. Chaque migration est indépendante des autres : vous pouvez en valider une seule.

| Ordre | Migration | Contenu | Données existantes modifiées | Risque |
|---|---|---|---|---|
| 1 | **0131** agenda | 2 nouvelles tables (disponibilités, indisponibilités), règles d'accès (propriétaire ou fondatrice) | aucune | **Faible** — purement additive |
| 2 | **0132** documents des hôtes | 1 règle de dépôt sur l'espace privé + 1 fonction d'enregistrement | aucune | **Faible** — touche la sécurité du stockage ; testée 11/11 (dépôt hors dossier, autre hôte, document validé, non-hôte, `../` : tous refusés) |
| 3 | **0130** éditeur Ti-Colibri | 6 colonnes sur les pages, 2 colonnes sur la médiathèque, 2 tables, 1 déclencheur de versions | **4 pages** passent de « à écrire » à « brouillon » (celles qui ont déjà un texte retrouvé) ; aucun texte modifié | **Moyen** — un déclencheur s'exécutera à chaque modification de page (il archive l'ancienne version) |
| 4 | **0129** Secret Stories | 20 tables `ss_*`, un espace de stockage privé, règles d'accès | aucune | **Moyen** — volume important ; dossier complet, 100 tests de profils |

## Pour chaque migration

### Avant (toutes)
1. **Sauvegarde** : Supabase › projet « bellaia » › Database › Backups. Vérifier qu'une sauvegarde de moins de 24 h existe (ou en lancer une si votre offre le permet). Noter la date.
2. Exécuter les contrôles « avant » (ci-dessous) : tout doit être « OK ».
3. Coller **uniquement** la migration dans un nouvel onglet SQL. Ne jamais coller le retour arrière en même temps.
4. Si Supabase demande une confirmation : lire le message ; confirmer seulement s'il concerne les `drop … if exists` du fichier ; sinon arrêter et me transmettre le message.

### 0131 — agenda
- Avant : `select to_regclass('public.agenda_disponibilites') is null and to_regclass('public.agenda_indisponibilites') is null;` → `true`.
- Après : les deux tables existent ; la RLS est active (`select relrowsecurity from pg_class where relname in ('agenda_disponibilites','agenda_indisponibilites');` → `true`, `true`) ; dans l'application, « Disponibilités » enregistre en base au lieu de la simulation locale.
- Tests après : création d'une règle par la fondatrice, refus pour une cliente, affichage des créneaux (script `tests/iphone/t_cal.js`).
- Retour arrière : `supabase/migrations/rollback/0131_agenda_disponibilites_rollback.sql` (supprime les disponibilités saisies entre-temps : à exporter avant).

### 0132 — documents des hôtes
- Avant : `select count(*) from pg_policies where policyname = 'hotes_documents_depot';` → `0`.
- Après : → `1` ; la fonction `bsh_hote_document_depose` existe ; aucun document existant n'a changé (`select statut, count(*) from bsh_hotes_documents group by 1;` identique à avant).
- Tests après : avec un compte hôte de test, déposer un fichier sur un document « à fournir » (accepté), tenter un autre dossier (refusé) ; scénarios SQL `supabase/tests/0132_hotes_documents/`.
- Retour arrière : `rollback/0132_hotes_documents_rollback.sql` (retire la règle et la fonction ; les fichiers déjà reçus restent).

### 0130 — éditeur Ti-Colibri
- Avant : noter `select count(*), count(*) filter (where length(trim(coalesce(texte,''))) > 0) from histoires_scenes;` (aujourd'hui : 31 pages, 4 avec texte).
- Après : mêmes nombres ; les 4 pages avec texte sont en « brouillon », les autres en « à écrire » ; `histoires_scenes_versions` est vide ; modifier une page de test crée une version archivée (puis la restaurer).
- Tests après : éditeur Ti-Colibri (onglet Éditions pédagogiques) : enregistrement, historique, restauration ; le texte attesté reste intact.
- Retour arrière : `rollback/0130_editions_pedagogiques_rollback.sql` — ⚠️ supprime l'historique des versions, les fiches pédagogiques et les champs créole / traductions / légende : **exporter avant**. Les textes français ne sont jamais touchés.

### 0129 — Secret Stories
- Procédure complète : `supabase/dossiers/0129_bsh_secret_stories/0_LISEZMOI.md` (contrôles avant 10/10, après 11/11, rapport de 100 tests).
- Retour arrière : `2_retour_arriere_0129.sql` du même dossier.

## Après chaque application
- Je refais les tests correspondants sur la base réelle (comptes de test temporaires, supprimés ensuite, aucune donnée réelle touchée) et je mets à jour « Actions requises ».
- Une fonctionnalité ne passe au statut « opérationnel » qu'après ces tests.
