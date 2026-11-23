# Migration 0130 — éditeur Ti-Colibri (versions de pages, fiches pédagogiques)

**Statut : préparée, testée en local le 23/11/2026, NON appliquée.** Accord de la fondatrice requis.

- Test reproductible sur une base PostgreSQL 16 jetable, données fictives. La structure des deux tables existantes a été relevée sur la base réelle (lecture seule) :
  `runuser -u postgres -- sh supabase/tests/0130_editions_pedagogiques/executer.sh /tmp/essai0130`
- Résultat : **20/20 scénarios**. Relance sans erreur, sans doubler le déclencheur ni modifier les statuts ou les versions. Le retour arrière retire tables et colonnes en gardant les textes français intacts. La réapplication passe sans erreur.
- Effet sur la base réelle : 19 pages contenant du texte passeront au statut « brouillon ». Aucun texte n'est modifié.
- ⚠️ Le retour arrière supprime l'historique des versions et les fiches pédagogiques : faire un export avant.
