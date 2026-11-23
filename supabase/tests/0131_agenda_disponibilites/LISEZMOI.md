# Migration 0131 — disponibilités et indisponibilités de l'agenda

**Statut : préparée, testée en local le 23/11/2026, NON appliquée.** Accord de la fondatrice requis.

- Test reproductible sur une base PostgreSQL 16 jetable, données fictives :
  `runuser -u postgres -- sh supabase/tests/0131_agenda_disponibilites/executer.sh /tmp/essai0131`
- Résultat : **17/17 scénarios**. Chacun ne voit et ne modifie que ses disponibilités, la fondatrice voit tout, le motif d'indisponibilité reste privé, les visiteurs non connectés sont refusés, les valeurs incohérentes sont refusées. Relance sans erreur, retour arrière effectif, réapplication sans erreur.
- ⚠️ Le retour arrière supprime les disponibilités enregistrées : faire un export avant.
