# Messagerie interne Bellaïa — cahier des charges fonctionnel et technique (v1, 23/11/2026)

Statut : **conception**. Aucune migration, aucun service externe. L'audit détaillé (sécurité comprise) est conservé dans les rapports privés de la fondatrice.

## 1. Principes
- Interface **originale**, aux couleurs Bellaïa (aucun logo, marque ou écran repris de WhatsApp, Signal, Telegram ou WeChat) ; on s'inspire des usages, pas des visuels.
- Mobile d'abord (iPhone), utilisable au lecteur d'écran VoiceOver, sans animation obligatoire, sur connexion lente.
- Réutiliser l'existant : session Bellaïa, `profiles`, stockage privé Supabase, notifications push Bellaïa, Supabase Realtime.
- Un seul modèle de données (le modèle `bellaia_*` existant, corrigé) ; le doublon est retiré après vérification.

## 2. Fonctions par lots

| Lot | Contenu | Dépendances / coût |
|---|---|---|
| **M0 — sécurisation** | Correction des règles d'accès (ajout de membres, modification des messages, création de conversations), compartiment privé des pièces jointes, publication temps réel, limites de débit. | Migration à autoriser ; aucun coût externe. |
| **M1 — essentiel** | Conversations individuelles et de groupe ; espaces par univers/pôle ; historique paginé ; réponse à un message ; réactions ; modification (auteur, 15 min, historique conservé) ; suppression « pour tous » (trace conservée pour la fondatrice) ; épingles ; archivage ; sourdine ; accusés de lecture et indicateur de saisie **désactivables** ; recherche (participant, date, texte). | Supabase (inclus) ; recherche plein texte Postgres. |
| **M2 — partage** | Photos (compression iPhone), vidéos (taille max.), PDF et bureautique, messages vocaux (enregistrement navigateur, `audio/mp4` sur iPhone), aperçu des pièces jointes, liens avec aperçu **généré côté serveur** (pas de requête depuis le téléphone vers des sites inconnus), partage de documents internes selon les droits. | Stockage Supabase (volume à surveiller). |
| **M3 — organisation** | Canaux d'annonces (lecture seule pour les membres), mentions `@`, notifications push, signalement, blocage, modération (file fondatrice), journal d'audit. | Push existant. |
| **M4 — avancé (étude préalable)** | Messages programmés, messages temporaires, traduction, transcription des vocaux, assistant IA dans les conversations autorisées, appels audio/vidéo, messagerie clients, WhatsApp Business. | **Chaque élément : faisabilité, coût, sécurité, accord préalable** (services payants : traduction/transcription/IA, WebRTC/TURN pour les appels, API WhatsApp Business de Meta). |

## 3. Rôles et droits

| Rôle | Peut créer | Voit | Particularités |
|---|---|---|---|
| Fondatrice | tout | ses conversations + file de modération + journal | Seule à créer des canaux de direction ; n'accède pas d'office aux conversations privées des autres (accès exceptionnel journalisé, à décider). |
| Assistantes / collaborateurs | conversations directes, groupes de leur pôle | leurs conversations | Pas d'accès aux canaux direction/finances sauf ajout explicite. |
| Responsables d'univers | groupes et annonces de leur univers | idem | Modération de leur univers. |
| Partenaires, hôtes autorisés | réponse dans les conversations où ils sont ajoutés | uniquement celles-ci | Pas d'annuaire de l'équipe. |
| Clients / familles (si ouvert) | conversation avec la structure uniquement | la leur | Aucune conversation client ↔ client ; **mineurs : jamais de conversation privée enfant ↔ adulte** ; messages des familles modérés ; pièces jointes limitées. |

Règles techniques : chaque lecture de message ou de pièce jointe vérifie l'appartenance à la conversation **dans la base** (RLS) ; pièces jointes en compartiment privé, liens signés de courte durée ; un membre retiré perd l'accès immédiatement ; données sensibles (direction, finances, santé, mineurs) dans des conversations marquées « confidentiel » (pas d'aperçu dans les notifications).

## 4. Sécurité et confidentialité
- Chiffrement en transit (TLS) et au repos (hébergeur). Pas de chiffrement de bout en bout en v1 (voir audit privé) — **ne pas annoncer un niveau « Signal »**.
- Sessions : liste des appareils connectés, déconnexion à distance, expiration.
- Abus : limites de débit (messages/minute, fichiers/jour), taille et types de fichiers contrôlés côté serveur, signalement.
- RGPD : durées de conservation, export et effacement sur demande, mention dans la politique de confidentialité, registre des traitements.

## 5. Interface iPhone (maquettes : `docs/messagerie/maquettes_iphone.html`)
Liste des conversations (filtres : Tout, Non lus, Équipe, Univers, Annonces, Archivés) ; conversation (bulles, réponse citée, réactions, pièce jointe, vocal, barre de saisie fixe au-dessus du clavier, zone de sécurité iPhone) ; fiche de conversation (membres, droits, sourdine, épingles, médias, signalement). Thèmes clair et sombre ; cibles tactiles ≥ 44 px ; textes dynamiques.

## 6. Critères d'acceptation (tests à écrire avant ouverture)
- Un compte non membre ne lit ni messages ni pièces jointes, même en appelant directement l'API.
- Un membre ne peut ni s'ajouter seul, ni modifier le message d'un autre.
- Un membre retiré perd l'accès instantanément ; le lien signé d'une pièce jointe expire.
- Compte Famille : aucune conversation hors structure ; mineur : aucune conversation privée avec un adulte.
- Parcours complet sur iPhone simulé et ordinateur, puis sur iPhone réel par la fondatrice.
