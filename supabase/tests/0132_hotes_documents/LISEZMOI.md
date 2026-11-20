# Migration 0132 — transmission sécurisée des documents des hôtes BSH

**Statut : préparée, testée en local, NON appliquée.** Accord de la fondatrice requis.

- Fichiers : `supabase/migrations/0132_hotes_documents.sql`, retour arrière `supabase/migrations/rollback/0132_hotes_documents_rollback.sql`.
- Test reproductible (base PostgreSQL 16 jetable) : appliquer dans l'ordre `../0129_secret_stories/1_environnement_supabase_minimal.sql`, `test.sql`, la migration, puis `test_scenarios.sql`.
- Résultat du 20/11 : **11/11 contrôles réussis** (`resultats_2026-11-20.txt`) ; relance sans erreur ; le retour arrière retire la règle et la fonction en conservant les documents déjà reçus.
- Côté application (branche de prévisualisation) : l'espace hôte dépose réellement le fichier si la migration est appliquée ; sinon, il affiche « transmission pas encore activée » — aucune simulation trompeuse.
- RGPD : une pièce d'identité ne doit être gardée que le temps du contrôle de majorité ; la suppression après contrôle reste une action de la fondatrice.
