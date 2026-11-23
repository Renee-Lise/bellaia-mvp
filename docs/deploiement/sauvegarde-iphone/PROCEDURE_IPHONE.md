# Sauvegarde complète et restauration vérifiée — depuis l'iPhone, sans ordinateur (gratuit)

## Principe
Un dépôt GitHub **privé** (gratuit) exécute, à la demande, la sauvegarde complète puis le contrôle de restauration dans une base jetable. Vous déclenchez et lisez le résultat depuis l'application GitHub ou Safari. Les secrets sont saisis **uniquement** dans les réglages du dépôt privé : jamais dans un fichier, jamais dans le dépôt public, jamais transmis à Claude.

## Mise en place (une fois, ≈ 15 minutes, sur iPhone)
1. **Dépôt privé** : github.com › New repository › nom « bellaia-sauvegardes » › **Private** › Create.
2. **Fichier de la tâche** : dans ce dépôt, Add file › Create new file › nom `.github/workflows/sauvegarde.yml` › coller le contenu de `docs/deploiement/sauvegarde-iphone/sauvegarde.yml` › Commit.
3. **Secrets** (Settings › Secrets and variables › Actions › New repository secret) :
   - `SUPABASE_ACCESS_TOKEN` : supabase.com › Account › Access Tokens › Generate.
   - `SUPABASE_DB_PASSWORD` : mot de passe de la base (Project Settings › Database ; le réinitialiser si inconnu).
   - `SUPABASE_DB_URL` : bouton **Connect** du projet › « Session pooler » › copier la chaîne et y mettre le mot de passe.
   - `BACKUP_PASSPHRASE` : une longue phrase choisie par vous, **notée hors ligne** (sans elle, l'archive est illisible).

## Réglages de confidentialité à vérifier (une fois)
- Le dépôt affiche **Private** (Settings › General › Danger Zone : « Change visibility » doit proposer « Make public », preuve qu'il est privé).
- Settings › Collaborators : **personne** d'autre que vous.
- Settings › Actions › General : « Allow … actions and reusable workflows » limité à **GitHub** et aux actions de **Supabase** (`actions/*`, `supabase/setup-cli`) ; « Workflow permissions » : **Read repository contents** ; décocher « Allow GitHub Actions to create and approve pull requests ».
- Compte GitHub protégé par la **double authentification**.
- Les secrets ne sont jamais affichés en clair dans les journaux (GitHub les masque) ; ils ne sont lisibles par personne, pas même par vous après saisie (on ne peut que les remplacer).
- La tâche utilise une version **figée** des scripts publics (identifiant de version dans le fichier) : relue, elle ne change pas tant que vous ne modifiez pas le fichier.

## Première sauvegarde — instructions exactes
1. Ouvrir l'application **GitHub** (ou github.com dans Safari) › dépôt « bellaia-sauvegardes » › onglet **Actions**.
2. Toucher **Sauvegarde Bellaïa** › **Run workflow** › **Run workflow** (branche main).
3. Attendre la coche verte (≈ 10 minutes ; la page peut être fermée).
4. Ouvrir l'exécution : le **résumé** affiche le résultat. Il doit se terminer par **« COMPLET »**.
5. En bas de page, **Artifacts › bellaia-sauvegarde-chiffree** : télécharger et enregistrer dans Fichiers › iCloud Drive (dossier « Sauvegardes Bellaïa »).
6. M'indiquer « COMPLET » (ou me copier le résumé en cas d'« ÉCARTS ») : c'est la condition préalable aux migrations.

## À chaque sauvegarde (≈ 10 minutes)
Actions › « Sauvegarde Bellaïa » › **Run workflow**. À la fin :
- **COMPLET** : toutes les tables restaurées et identiques à la production, fichiers du stockage et comptes conformes → la condition préalable aux migrations est remplie ;
- **ÉCARTS** : le détail s'affiche ; relancer (si la base a changé pendant l'export) ou me transmettre le résumé (sans les fichiers).
L'archive chiffrée est téléchargeable 7 jours (Artifacts) : l'enregistrer dans Fichiers › iCloud Drive ou le Drive privé.

## Restauration en cas de sinistre
- Chaque exécution **restaure réellement** la sauvegarde dans une base jetable et la compare à la production : c'est la preuve qu'elle est restaurable.
- Pour remettre en service : déchiffrer l'archive sur un ordinateur ou un service de confiance (`openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in bellaia_sauvegarde.tar.gz.enc -out sauvegarde.tar.gz`, avec votre phrase), puis, dans un **nouveau** projet Supabase : rôles, structure, données (`psql -f`), comptes (`auth_donnees.sql`), puis renvoyer les fichiers du dossier `stockage/` dans les compartiments. Cette opération se fait avec moi, pas à pas, et ne touche jamais l'ancien projet.

## Ce qui est contrôlé
Empreintes des fichiers de sauvegarde ; restauration réelle structure + données dans un PostgreSQL jetable ; comparaison **production = export = restauré** pour chacune des tables ; nombre, taille et empreinte des fichiers de chacun des **8 compartiments** de stockage ; nombre de comptes.

## Limites réelles
- Offre gratuite GitHub (comptes personnels) : 2 000 minutes d'exécution par mois pour les dépôts privés (une sauvegarde ≈ 10 minutes) et 500 Mo de stockage d'artefacts (l'archive fait environ 250 Mo : conserver 7 jours au plus).
- Le contrôle des fichiers porte sur leur nombre, taille et noms ; les comptes sont contrôlés par leur nombre.
- Les journaux de la tâche ne contiennent aucune donnée (seulement des nombres et des empreintes) ; l'archive n'est jamais déposée en clair.
- Une restauration dans un vrai projet Supabase (en cas de sinistre) reste une opération à part, à préparer.
- Je n'ai pas pu exécuter cette tâche moi-même (pas de secrets dans mon environnement, et il ne doit pas y en avoir) : la chaîne est testée de bout en bout sur une imitation (5/5) ; la première exécution réelle sera chez vous.
