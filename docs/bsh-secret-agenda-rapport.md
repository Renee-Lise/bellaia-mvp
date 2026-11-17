# BSH Secret Agenda & Rewards — rapport de livraison (17/11/2026)

Branche : `claude/session-sdcuy0` — **non publié en production** (en attente de validation de la fondatrice).

## 1. Audit de l'existant (avant modification)

| Besoin | Existant réutilisé | Ajouté |
|---|---|---|
| Publications | `bsh_communications` (onglet 📢 Communication) | thématique, fuseau, hôte, notes internes, date effective, créneau, campagne, série/récurrence, rappel ; statuts « reporté » et « annulé » |
| Jeux | `bsh_jeux` (Secret Games, **lisible publiquement**) | `bsh_animations` (privée : règles, questions/réponses, points), reliée à `bsh_jeux` |
| Hôtes | `bsh_hotes`, `bsh_missions`, `bsh_checklist_items` | planning individuel, checklists, attribution par menu déroulant |
| Boudoir Sessions | `bsh_evenements` (catégorie `boudoir_session`) + module 💎 Experiences | vue agenda + musique associée |
| Musique | `bsh_playlists` (par événement) | `bsh_musique` + `bsh_musique_liens` (Diamond B, droits de diffusion) |
| Agenda, sondages, Rewards, statistiques | absents | `bsh_agenda_reglages`, `bsh_programmation_jours`, `bsh_campagnes`, `bsh_sondages`, `bsh_sondages_votes`, `bsh_rewards_campagnes`, `bsh_rewards_participants` |

## 2. Fichiers et tables modifiés

- Migration `supabase/migrations/0103_bsh_secret_agenda_rewards.sql` (exécutée et vérifiée).
- Nouveau module `src/modules/bshAgenda/` (hub, calendrier, publications, sondages, jeux & Diamond B, Rewards, hôtes, statistiques).
- `src/components/BellaiaApp.tsx` : onglet « 🗓 Secret Agenda » dans Fondatrice > BSH (aucun onglet existant retiré).
- `src/modules/bshExperiences/BshExperiencesF.tsx` : l'identifiant d'événement à coller est remplacé par un menu déroulant.
- `src/modules/events/eventsAtelierLib.ts` : upload vers un bucket au choix + appel RPC.
- Bucket de stockage `bsh-visuels` (public, écriture fondatrice).

## 3. Tests réalisés

**Navigateur (Chromium, données simulées)** — ordinateur 1440 px, tablette (iPad Mini), téléphone (iPhone 13) :
toutes les rubriques s'affichent, 0 erreur JavaScript, aucun défilement horizontal sur téléphone ;
« Préparer la semaine » crée les brouillons attendus (créneaux déjà occupés ou passés ignorés).

**Base de données (rôles simulés, transaction annulée — aucune donnée conservée)** :

| Test | Résultat |
|---|---|
| Ouvrir une campagne Rewards sans les 3 validations | refusé par la base ✅ |
| Hôte : voit uniquement sa publication et son animation attribuées | ✅ (1/1) |
| Hôte : ne voit ni Rewards ni participants, ne peut rien modifier | ✅ |
| Membre : ne voit ni publications internes ni animations (réponses) | ✅ |
| Membre : voit seulement le sondage natif actif, vote une fois | ✅ ; 2e vote refusé ✅ ; vote au nom d'un autre refusé ✅ |
| Membre : résultats agrégés sans savoir qui a voté quoi | ✅ |
| Visiteur anonyme : aucun accès aux nouvelles tables | ✅ |

## 4. Anomalies et points restants

1. **Comptes hôtes non reliés** : les 2 fiches `bsh_hotes` actives n'ont pas de `profile_id`, donc aucune hôte ne peut encore se connecter et voir son planning. À relier depuis l'onglet 👤 Hôtes.
2. **Vue côté hôte et vote des membres** : les droits sont en place en base, mais les écrans « Mon planning » (espace hôte) et « Voter » (espace membre) restent à construire.
3. **Test réel connecté** : à faire par la fondatrice sur son compte (les tests navigateur utilisaient des données simulées).
4. **Anniversaire de BSH** : date à confirmer (campagne créée sans date).
5. Hors périmètre, noté pour l'administratif : champ « Facture liée (ID) » à saisir à la main dans la comptabilité.
