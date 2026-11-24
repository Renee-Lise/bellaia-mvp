# Anomalie P0 — BSH Secret Agenda inaccessible (24/11/2026)

Registre central : **E12.01**, priorité **P0**, statut **à valider**. L'anomalie sera clôturée seulement quand la fondatrice aura confirmé le bon fonctionnement sur son iPhone réel.

## Symptôme signalé
Sur l'iPhone réel de la fondatrice, l'appui sur « Secret Agenda » (Bella'Secret Home › onglets du back-office) ramenait à la page d'accueil.

## Diagnostic : cause établie avec preuves

| Point vérifié | Constat |
|---|---|
| Appareil | iOS 18.7, Safari 26.5 (journaux Supabase). Ce n'est pas un iOS trop ancien. |
| Version utilisée | Prévisualisation de la branche. La page avait été chargée vers 11 h 14 UTC (version **db3cd04**) puis était restée ouverte. |
| Mise en ligne intermédiaire | À 11 h 29 UTC, **fa41c5d** a pris la place de db3cd04 à la même adresse de prévisualisation. |
| Destination du bouton | Correcte : l'onglet `agenda` du back-office BSH charge le module Secret Agenda à la demande (fichier JavaScript séparé). |
| Fichier demandé | L'ancienne page réclamait `2132.7b2417ec211baef5.js` (module Secret Agenda de db3cd04). Ce fichier répond **404** à l'adresse de prévisualisation et **200** sur l'adresse figée de l'ancien déploiement (vérifié sur Vercel). |
| Comportement de l'ancien code | Une erreur « Loading chunk … failed » déclenchait un **rechargement silencieux**, qui ramenait à l'accueil. |
| Journaux Supabase (12 h 17–12 h 19 UTC) | À 12 h 17 min 51 s, toutes les lectures émises au démarrage de l'application repartent, et l'interrogation des notifications (toutes les 60 s) redémarre : **c'est un rechargement complet**. Le fichier principal de la nouvelle version a été servi pour la première fois à 12 h 17 min 49 s. Le module Secret Agenda n'a émis **aucune** requête. Ensuite, les onglets Centre hôtes, Secret Stories et Documents (nouvelle version) ont fonctionné. |
| Session et permissions | Session valide (jeton rafraîchi à 12 h 17 min 29 s) ; droits de fondatrice confirmés. Aucun refus d'accès. |
| Migrations 0141 et 0142 | Non en cause : l'écran s'ouvre sans elles, et indique de façon explicite les fonctions qui en dépendent. |
| Ancienne et nouvelle navigation | Non en cause : une seule destination, et le retour par l'historique ne se déclenche pas sur un appui. |

**Reproduction** (simulateur Chromium iPhone 13, **pas un iPhone réel**) avec le code fa41c5d : après une mise en ligne, l'appui sur Secret Agenda recharge la page et ramène au Centre de direction.

**Portée** : le même défaut pouvait toucher n'importe quel module chargé à la demande, dans n'importe quel univers et en production, dès qu'une mise en ligne avait lieu pendant que l'application était ouverte.

## Correction (code de la branche, non déployée)
- **Plus aucun rechargement silencieux.** Quand un module ne se charge pas, l'écran reste ouvert et affiche : « BSH Secret Agenda n'a pas pu s'ouvrir », la cause, puis les boutons « Mettre à jour et rouvrir Secret Agenda » et « Réessayer ».
- **Les autres modules** affichent une alerte globale « Cet écran n'a pas pu s'ouvrir », avec les boutons « Mettre à jour et rouvrir cet écran » et « Plus tard ».
- **Écran mémorisé en continu**, par rôle : la rubrique, plus l'onglet BSH ; la rubrique de Secret Agenda l'était déjà. Il est restauré après une mise à jour, une actualisation, ou une fermeture suivie d'une réouverture dans les 12 heures. Une assistante ne peut jamais rouvrir une page de la fondatrice : seules les pages de sa propre navigation sont acceptées.
- **Nouvelle version détectée** au retour dans l'application (`/api/version`) : la mise à jour est proposée avant qu'un écran ne puisse échouer.
- **Version affichée** en bas de chaque écran, avec un lien « Diagnostic » : version, appareil résumé, derniers incidents, bouton « Copier le diagnostic ».
- **Garde-fou d'erreur** autour de Secret Agenda : une erreur d'affichage montre un message et le bouton « Réessayer », jamais un retour à l'accueil.
- **Journal de diagnostic sans donnée personnelle**. Il est conservé sur l'appareil et transmis à `/api/diagnostic`, qui n'accepte qu'une liste fermée de champs (type, module, versions, écran, appareil résumé), masque les courriels et les jetons, et n'enregistre rien en base.

## Tests
- `tests/iphone/t_p0_version.js` : **17/17** sur simulateur (voir `P0_resultats_simulateur_2026-11-24.txt`). Ce n'est pas un essai sur iPhone réel.
- TypeScript : 0 erreur.

## Étapes restantes (ne pas clôturer avant)
1. Essai par la fondatrice sur son **iPhone réel**, sur la prévisualisation de la branche. Avant l'essai, fermer complètement l'application (balayer vers le haut) puis la rouvrir, afin de charger la nouvelle version.
2. Confirmation de la fondatrice.
3. Déploiement en production, uniquement avec son accord.
