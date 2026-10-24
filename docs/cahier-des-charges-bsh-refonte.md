# Refonte et centralisation de Bellaïa — Intégration BSH

**Statut : directive reçue le 2026-10-24, à traiter une fois la mise en production de la boutique BSH (session en cours) débloquée.** Ce document est la consigne telle que donnée par Renée-Lise, conservée ici pour ne pas être perdue d'une session à l'autre. Il s'ajoute aux règles déjà en vigueur dans `supabase/README.md` et dans le cahier des charges BSH Members existant (ne pas les contredire silencieusement — en cas de conflit, le signaler plutôt que trancher seul).

**Note de prudence avant tout développement** : plusieurs éléments ci-dessous décrivent des modules qui n'existent pas encore dans le code (Secret Games, Hôtes/hôtesses BSH, module Communication) ou référencent des ressources externes non identifiées (le site GitHub Pages de "BSH Secret Games"). Avant de les construire, il faut un audit explicite de l'existant (section 1 ci-dessous) et, pour Secret Games, le dépôt/l'URL réels — ne jamais supposer leur architecture ni leur contenu.

---

Tu interviens sur l'application existante Bellaïa, qui centralise plusieurs univers professionnels sous la marque Bella'Studio.

**Objectif** : moderniser l'interface et intégrer une zone de gestion complète Bella'Secret Home (BSH), sans recréer l'application ni compromettre les fonctionnalités existantes.

## 1. Audit préalable

- Identifier le dépôt GitHub réellement utilisé en production et son architecture.
- Examiner les routes, les composants, les rôles utilisateurs et la base Supabase existante.
- Vérifier les fonctionnalités déjà opérationnelles.
- Prévoir une branche de développement et une sauvegarde avant toute modification.
- Ne supprimer aucune donnée, table ou fonctionnalité sans validation.

## 2. Espace fondatrice

Créer un tableau de bord principal regroupant tous les univers Bellaïa, avec un accès dédié à Bella'Secret Home.

Dans cet espace BSH, prévoir :

- **Boutique** : produits, catégories, prix, stocks, commandes et livraisons.
- **Secret Games** : catalogue de jeux, cartes, thèmes, participations, propositions et modération.
- **Événements** : programmation, réservations, participants et billetterie.
- **Hôtes et hôtesses** : candidatures, profils, missions, disponibilités, affectations, documents et rémunérations.
- **Membres** : adhésions, avantages, statuts et renouvellements.
- **Finance** : ventes, dépenses, paiements et statistiques.
- **Communication** : publications, annonces et notifications.

## 3. Espaces clients et hôtes

**Clients** : proposer une interface mobile claire permettant de consulter les univers autorisés, acheter, réserver, jouer et gérer son compte.

**Hôtes et hôtesses** : prévoir un tableau de bord professionnel avec les missions attribuées, le planning, les événements, les documents et les paiements correspondants.

Chaque rôle doit accéder uniquement aux données et fonctionnalités qui lui sont autorisées.

## 4. Identité visuelle

Moderniser les interfaces fondatrice, client et hôte, avec une navigation intuitive adaptée à l'iPhone.

Conserver l'identité générale Bellaïa tout en distinguant les univers.

Pour BSH, utiliser une direction artistique premium : noir velours, bleu nuit, prune, bordeaux, or et rose poudré. L'ambiance doit rester élégante, mystérieuse et suggestive, sans contenu explicite.

## 5. Architecture et sécurité

- Réutiliser la base Supabase existante lorsque cela est pertinent.
- Séparer logiquement les données de chaque univers.
- Mettre en place des autorisations robustes par rôle et par périmètre.
- Vérifier les politiques Row Level Security (RLS), notamment sur `public.ref_compteurs`.
- Ne jamais exposer de clé secrète dans le code public.
- Prévoir une authentification sécurisée pour la fondatrice et les hôtes.
- Protéger les informations personnelles des membres.
- Maintenir BSH Secret Games accessible depuis son site GitHub Pages, tout en préparant son intégration dans Bellaïa.

## 6. Méthode de réalisation

1. Produire un état des lieux technique.
2. Proposer les nouvelles maquettes des trois interfaces.
3. Valider la navigation et les droits d'accès.
4. Développer progressivement les modules.
5. Tester sur iPhone et ordinateur.
6. Déployer après validation, sans interrompre les fonctions existantes.

**Livrables attendus** : architecture cible, maquettes, plan de migration, modifications du code, tests de sécurité et instructions de déploiement.

**Ne pas confondre une maquette avec une fonctionnalité opérationnelle. Signaler clairement ce qui est déjà fonctionnel, en développement ou simplement prévu.**

---

## Points à clarifier avec Renée-Lise avant de démarrer ce chantier

- **BSH Secret Games** : quel dépôt GitHub Pages ? Aucune trace de ce projet dans `bellaia-mvp` à ce jour — à confirmer avant d'en planifier l'intégration.
- **`public.ref_compteurs`** : table non rencontrée dans les migrations versionnées (`supabase/migrations/`) — vérifier ses policies RLS actuelles directement en base avant d'agir, comme pour tout le reste de l'audit RLS mené cette session.
- **Hôtes/hôtesses spécifiques à BSH** : l'app a déjà un rôle "hôte" (univers Bella'Odyssée) — à clarifier si BSH doit réutiliser ce même rôle/modèle de données ou en créer un distinct (cohérent avec la règle "BSH Lounge/Le Cercle/BSH Members jamais fusionnés" déjà en vigueur).
