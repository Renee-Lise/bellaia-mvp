# Tests reproductibles — application réelle sur iPhone (Playwright, base simulée)

Aucune donnée réelle n'est lue ni écrite : `mockapp.js` simule l'API Supabase (rôles fondatrice, assistante, cliente ; jeux BSH ; parties multijoueurs en mémoire).

```bash
node tests/iphone/mockapp.js &                                    # base simulée, port 54337
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54337 NEXT_PUBLIC_SUPABASE_ANON_KEY=cle-anon-locale npx next dev -p 3160 &
mkdir -p /tmp/sorties
node tests/iphone/t_boutons.js fondatrice /tmp/sorties              # idem cliente, assistante — tous les boutons de l'accueil
node tests/iphone/t_sg.js /tmp/sorties                              # BSH Secret Games : 15 contrôles
node tests/iphone/t_cal.js /tmp/sorties                             # agenda jour / semaine / mois, 3 rôles
node tests/iphone/t_cat.js /tmp/sorties                             # badges « brouillon » du catalogue fondatrice
node tests/iphone/t_js.js ancien.tsx nouveau.tsx                    # vérifie qu'une correction TypeScript ne change pas le JavaScript produit
```

Résultats du 20/11 : accueil 79/79 (fondatrice), 59/59 (cliente), 40/40 (assistante) ; Secret Games 15/15 ; agenda 9 vues sans erreur ; badges catalogue conformes.
Migrations : tests SQL dans `supabase/tests/` (0129, 0132).

Notes du 24/11 :
- `t_valid.js` est **remplacé par `t_photos_plan.js`** depuis le commit 7160a7b : il attend l'ancienne source privée de Concorde Pro et télécharge des images réelles. Il est conservé pour l'historique, mais retiré de la batterie de non-régression.
- `t_photos_plan.js` demande la base simulée avec `MOCK_STOCKS_BSH=<390 produits de test>` et un serveur `next dev` lancé avec `CONCORDE_PLAN_DU_SITE_URL` / `CONCORDE_NEGOCE_URL` pointant vers un serveur local (plan du site et fichier négoce de test).
- Depuis le commit 6e2bf15, l'assistante arrive sur l'accueil commun et ouvre son espace par « Mes espaces ». `t_boutons.js` et `t_cal.js` mémorisent ce choix pour le profil assistante.

Notes du 24/11 (anomalie P0) :
- L'écran ouvert est désormais mémorisé (`localStorage['bellaia-nav']`) et restauré au rechargement. `t_boutons.js` l'efface avant chaque bouton (chaque bouton est testé depuis l'accueil).
- `t_p0_version.js` : changement de version pendant que l'application est ouverte (3 compilations : ancienne, corrigée, corrigée modifiée) — 17/17.
- `t_mediatheque_import.js` : import de la Médiathèque sur iPhone simulé et nature des liens des packs achetés.
- `t_bsh_agenda.js` : le calcul du « prochain samedi » de l'étape 17 dépendait de l'heure (vendredi après 12 h UTC) ; corrigé.
