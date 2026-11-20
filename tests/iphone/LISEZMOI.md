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
