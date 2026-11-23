# Bellaïa — tableau unique des fonctionnalités (23/11/2026)

**États :**
- **Fonctionnelle** : marche de bout en bout.
- **Défectueuse** : existe mais produit un résultat faux ou rien.
- **Incomplète** : marche en partie.
- **Bloquée** : prête, mais attend une migration, une décision ou un contenu.
- **Non développée.**

**Colonne « Où » :**
- **Prod** : état dans la version en ligne (commit `0bfd765`).
- **Branche** : état sur `claude/session-sdcuy0`, prévisualisation privée, non déployée.

Aucune fonctionnalité n'a encore été vérifiée sur un iPhone réel : tous les tests d'écran tournent sur un simulateur.

## Socle, comptes et sécurité
| Fonctionnalité | Prod | Branche | Tests (branche) |
|---|---|---|---|
| Connexion, inscription | Fonctionnelle | Fonctionnelle (mot de passe de 12 caractères au minimum) | 14/14 |
| Déconnexion | **Défectueuse** (la session n'était pas révoquée côté serveur) | Fonctionnelle | 14/14 |
| Mot de passe oublié, changement de mot de passe, sessions | Non développée | Fonctionnelle | 12/12 unitaires + 14/14 |
| Espace fondatrice réservé au rôle fondatrice | **Défectueuse** | Fonctionnelle | 17/17, 12/12 |
| Une identité, plusieurs rôles (« Mes espaces ») | Non développée | Fonctionnelle | 17/17 |
| Suspensions, révocations, désactivation de compte | Non développée | Bloquée (0136) | 65/65 (base jetable) |
| Candidatures et invitations | Non développée | Bloquée (0135, 0137 ; écrans prêts) | 16/16 + 65/65 |
| Notifications internes (nouvelles commandes, demandes, RDV) | **Défectueuse** (table absente : rien n'est enregistré ; seul le push part) | Incomplète (alertes enregistrées côté serveur, code non testé de bout en bout ; envois manuels aux clientes toujours sans table) | 5/5 (écran) |
| Messagerie interne | Fonctionnelle mais non sécurisée | Verrouillée (lot 7) ; bloquée (0133) | 5/5 |
| Accessibilité (zoom, focus clavier) | **Défectueuse** (zoom bloqué) | Fonctionnelle | 15/15 |
| En-têtes et fenêtres sur iPhone (zone de l'encoche) | **Défectueuse** (en-têtes masqués) | Fonctionnelle (simulateur, encoche imposée à 47 px) | 3/3 |
| Pages légales | Non développée (brouillon BSH seulement) | Incomplète (identité lue dans ta fiche ; mentions à valider) | 15/15 + 9/9 |
| Droits RGPD dans le compte client | Non développée | Bloquée (0139) | 8/8 |
| Compilation de production qui vérifie les types | Non (erreurs ignorées) | Fonctionnelle (0 erreur) | `next build` réussi |

## Commandes et paiements
| Fonctionnalité | Prod | Branche | Tests |
|---|---|---|---|
| Commande Bella'Food (parcours premium) | Bloquée (réservé à la fondatrice) | Bloquée | 17/17 × 3 profils |
| Allergènes (blocage des produits non validés) | Fonctionnelle (114 produits bloqués) | Fonctionnelle | 17/17 |
| Paiement SumUp | Incomplète (jamais testé avec un vrai paiement ; tables `webhook_logs` et `pre_comptabilite` absentes) | Incomplète (garde contre le double traitement ajoutée) | — |
| Stripe | Désactivé | Désactivé (route corrigée) | — |
| Devis Events (simple) | Fonctionnelle | Fonctionnelle | — |
| Éditeur de devis Events complet | Non branché | Non branché (conservé) | — |
| Rendez-vous Odyssée | Incomplète (boutons « désactivés » restés actifs ; accord parental non enregistré) | Fonctionnelle (accord parental enregistré ; soin réservé aux majeurs bloqué) | 9/9 |

## Catalogues et images
| Fonctionnalité | Prod | Branche | Tests |
|---|---|---|---|
| Catalogue BSH public | Fonctionnelle (produits à prix provisoire masqués) | Fonctionnelle | — |
| Photos des produits (Food, BSH, Odyssée) | **Défectueuse** (aucun produit n'a de photo ; aucun champ photo pour Food) | Incomplète (champ photo Food ajouté ; photos à fournir ; BSH : droits Concorde) | 8/8 |
| Médiathèque Events | Fonctionnelle (719 médias, 0 référence cassée) | Fonctionnelle | — |
| Inventaire BSH | Non développée | Fonctionnelle (lot 7) | 13/13 |
| Mo Ti-Péyi (5 articles) | — | Bloquée (brouillons sans prix) | 17/17 |

## Portails professionnels
| Fonctionnalité | Prod | Branche | Tests |
|---|---|---|---|
| Espace hôte et partenaire (missions, agenda, documents, profil) | **Défectueuse** (tables absentes, renvois vers WhatsApp) | Fonctionnelle | 18/18 |
| Espace hôte BSH, documents des hôtes | Incomplète | Bloquée (0132) | — |
| Missions : accusé de réception et avancement en % | — | Incomplète (fil de mission ; complet avec 0137) | 18/18 |
| Espace assistante | Fonctionnelle | Fonctionnelle | 17/17 |
| Vilo'Assistance : contrats | **Défectueuse** (table `contrats` absente) | Défectueuse (inchangé) | — |

## Contenus, IA et jeux
| Fonctionnalité | Prod | Branche | Tests |
|---|---|---|---|
| Bibliothèque de consignes IA (versions, droits) | Non développée | Fonctionnelle | 12/12 + 14/14 + 16/16 (base jetable) |
| Lecteur d'histoires (gestes, marque-page) | Incomplète | Fonctionnelle | 16/16 |
| Livres (P'tit Lion T1 à T4) | Bloquée (illustrations, validation) | Bloquée | — |
| Jeu de cartes Mo Ti-Péyi | Non développée | Incomplète (prototype réservé à la fondatrice) | 23/23 + 16/16 |
| Jeux BSH (Secret Games) | Fonctionnelle | Fonctionnelle | voir rapport |
| Atelier pédagogique GS | Non développée | Fonctionnelle | 47/47 |
| Studio Secret Stories | Non développée | Bloquée (0129, simulation) | — |
| Éditeur Ti-Colibri (créole, versions) | Non développée | Bloquée (0130) | — |
| Disponibilités d'agenda partagées | Non développée | Bloquée (0131 ; conservées sur l'appareil) | — |

## Tables utilisées par le code mais absentes de la base, sans aucune migration prévue
`notifications`, `webhook_logs`, `pre_comptabilite`, `missions_hote`, `contrats`, `collaborations_partenaire`, `factures_partenaire`.

Les fonctionnalités qui en dépendent n'ont jamais fonctionné en production. La migration 0140, prête et testée (11/11 sur base jetable), crée les trois premières. Elle ne sera appliquée **qu'après** une sauvegarde « COMPLET » et ton accord.
