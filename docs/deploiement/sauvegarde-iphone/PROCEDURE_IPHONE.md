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

## À chaque sauvegarde (≈ 10 minutes)
Actions › « Sauvegarde Bellaïa » › **Run workflow**. À la fin :
- **COMPLET** : toutes les tables restaurées et identiques à la production, fichiers du stockage et comptes conformes → la condition préalable aux migrations est remplie ;
- **ÉCARTS** : le détail s'affiche ; relancer (si la base a changé pendant l'export) ou me transmettre le résumé (sans les fichiers).
L'archive chiffrée est téléchargeable 7 jours (Artifacts) : l'enregistrer dans Fichiers › iCloud Drive ou le Drive privé.

## Ce qui est contrôlé
Empreintes des fichiers de sauvegarde ; restauration réelle structure + données dans un PostgreSQL jetable ; comparaison **production = export = restauré** pour chacune des tables ; nombre, taille et empreinte des fichiers de chacun des **8 compartiments** de stockage ; nombre de comptes.

## Limites réelles
- Offre gratuite GitHub (comptes personnels) : 2 000 minutes d'exécution par mois pour les dépôts privés (une sauvegarde ≈ 10 minutes) et 500 Mo de stockage d'artefacts (l'archive fait environ 250 Mo : conserver 7 jours au plus).
- Le contrôle des fichiers porte sur leur nombre, taille et noms ; les comptes sont contrôlés par leur nombre.
- Les journaux de la tâche ne contiennent aucune donnée (seulement des nombres et des empreintes) ; l'archive n'est jamais déposée en clair.
- Une restauration dans un vrai projet Supabase (en cas de sinistre) reste une opération à part, à préparer.
- Je n'ai pas pu exécuter cette tâche moi-même (pas de secrets dans mon environnement, et il ne doit pas y en avoir) : la chaîne est testée de bout en bout sur une imitation (5/5) ; la première exécution réelle sera chez vous.
