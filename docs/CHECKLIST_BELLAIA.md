# Bellaïa — Checklist générale (mise à jour du 19/11/2026 — production 563fbab ; branche de prévisualisation en avance)

Statuts : ✅ **Opérationnel** (développé, testé, appliqué en base et déployé ; « validé » = validé par la fondatrice) · 🟦 **Développé, non déployé** (prévisualisation) · 🟨 **Préparé, non exécuté** · 🔄 **En cours** · ⏳ **En attente de validation / de données** · ⬜ **À faire**

Note : la base Supabase est commune à la production et à la prévisualisation. Une modification de base marquée ✅ est donc active pour tous ; le code marqué 🟦 ne l'est qu'en prévisualisation.

## 1. Infrastructure et administration
- ✅ Administration → Outils & déclarations déployé (GO 19/11) : modèle de facture et livre des recettes / achats / marge (copies modifiables dans votre Drive), 2 guides
- ⬜ Livre des recettes alimenté par les données Bellaïa (export compatible Google Sheets) · contrôle de conformité du modèle de facture
- ✅ Adresse officielle : bellaia-11-azure.vercel.app
- ✅ Profil juridique et émetteurs (logos, en-têtes) — mentions fiscales ⏳ régime à confirmer
- ✅ Configuration Supabase / Vercel
- ✅ Sauvegarde Supabase vérifiée par la fondatrice (18/11)
- ⬜ Consolidation de l'ancien projet bellaia-mvp (redirection)
- ⏳ Régime fiscal à confirmer

## 2. Sécurité — P0
- ✅ Factures, devis, dossiers, paiements réservés à l'équipe ; portails clients via fonctions serveur
- ✅ Migration 0112 : permissions, journal, fin des droits automatiques de l'assistante, protection contre l'élévation de privilèges
- ✅ Commandes clientes en brouillon au total « à vérifier »
- ✅ 17 vues financières / CRM corrigées (fuite anonyme fermée)
- ✅ Vue catalogue publique sans prix d'achat (créée)
- ✅ SumUp : montant calculé par le serveur, contrôle du montant payé (14 tests simulés ; en production)
- ✅ Stripe désactivé, plus proposé par défaut (en production)
- ✅ Salons BSH : écran sécurisé en production · fonctions 0115 (17 tests en base) · accès directs fermés (0115b, appliquée)
- ✅ Fermeture des prix d'achat BSH / Odyssée et des coûts / marges Food (0117 appliquée ; boutique BSH vérifiée en ligne : prix de vente seuls) · 4 anciennes commandes clientes marquées « à vérifier »
- ✅ Contrôle exhaustif des accès (toutes tables et vues, 5 profils : visiteur, cliente, assistante, partenaire, fondatrice) — 18/11
- ✅ 0119 appliquée : notes fournisseur masquées dans le catalogue public (355 produits), prompt IA réservé à l'équipe, listing des fichiers publics réservé à l'équipe
- ✅ API : `/api/chat` réservé à l'équipe (clé IA), alertes push anti-spam, références de paiement non devinables, session jointe aux appels internes — 12 tests passés, en production (3aef807)
- ✅ **P0 terminé** (19/11)
- ⬜ Anciennes tables de messagerie (règle en boucle, inaccessibles, non utilisées) : corriger ou archiver
- ⏳ Protection contre les mots de passe compromis (réglage Supabase — Actions requises)
- ✅ Mise en production corrective P0 (déploiement 6945bb8 « Ready », aucune erreur serveur)
- ⬜ Test réel d'un paiement SumUp

## 3. Organisation et équipe — P1
- ✅ Déployé — assistante → Bella'Food selon permissions (aucune accordée automatiquement) (découvrir sans coûts, prendre une commande, proposer une fiche « proposée ») — testé en base : sans permission refus, 0 champ financier, fiche jamais active, aucune lecture directe des tables
- ✅ Déployé — aperçus : bouton de retour accessible sur iPhone (zone sûre + bouton flottant en bas), bandeau sur tous les aperçus clients
- ✅ Aperçus des profils déployés (GO 19/11) : cliente, assistante, hôte / hôtesse, prestataire, partenaire Vil'Dor — lecture seule, aucune action au nom d'une autre personne
- ✅ Base : comptes multirôles, organisations, missions, fil, stockage privé
- ✅ Écrans : Accès & permissions, espace équipe, missions, livrables, commentaires / corrections, planning (en production)
- ✅ Univers de mission évolutifs (0116 appliquée et testée : 15 univers, « pole » conservé en compatibilité, aucun droit créé automatiquement)
- 🔄 Vérification des statistiques, filtres et notifications par univers
- ⏳ Compte réel de l'assistante / partenaire (e-mail)
- ⬜ Tests avec de vrais comptes

## 4. Vil'Dor Pâtisse — P2
- ✅ Organisation partenaire, statut « en création », profil d'agente publique, 3 autorisations indépendantes, blocage ventes / versements (en base)
- ✅ Espace partenaire (mode préparation, documents, tarifs, commandes reçues) — confidentialité des marges testée (en production, ventes et versements bloqués)
- 🔄 Atelier : recettes, préparations, ingrédients, courses, stocks, rentabilité, planning (prochain lot)
- ⏳ Autorisation du rectorat · immatriculation · régularisation sanitaire · contrat de fourniture

## 5. Bella'Food et collection saisonnière
- ✅ 8 tarifs pâtissiers enregistrés (non publiés)
- ✅ 14 références saisonnières, tarifs fournisseur, prix de revente proposés, en brouillon (base)
- ✅ Collection saisonnière : calculs côté serveur, simulations, récapitulatif fournisseur (écran fondatrice ; produits toujours en brouillon)
- ✅ **Réductions** : codes promo (%, €, période, minimum, utilisations, une par cliente), réduction manuelle sur une commande (en production ; aucun code actif)
- ⬜ Moteur de promotions étendu : promotions automatiques, lots, coffrets, anniversaire, parrainage, fidélité, livraison offerte, règles de cumul, simulateur de rentabilité
- ✅ **Allergènes automatiques** sur les commandes (site et sur-mesure), affichés avant l'achat ; « à vérifier » si inconnus (en production)
- ✅ **Assistant de régularisation des allergènes** (déployé 563fbab ; accès durcis, 7 tests de sécurité) (Allergènes → 🧭 Assistant) : indices par source (fiche produit, recette, sous-recettes, ingrédients, documents de la bibliothèque), inconnus, contradictions, 14 allergènes à choisir explicitement, sources consultées, validation individuelle par la fondatrice — fiches `food_allergenes_fiches` + règle de blocage appliquées en base (✅, 8 tests), serveur de commande mis à jour (🟦)
- ✅ **Blocage des commandes** sans allergènes obligatoires (appliqué en base + boutique + serveur, testé : 3 cas) — 3 produits commandables / 116, 113 « Fiche produit en cours de finalisation » · compteurs recalculés à chaque ouverture (nouvelles recettes incluses)
- ⬜ Assistant de régularisation recette par recette (scan des emballages, soumission, validation, réactivation)
- ✅ Blocage vérifié sur tous les chemins : route serveur (testée), panier non conservé, message WhatsApp envoyé seulement après acceptation serveur, commande insérée directement = « à vérifier » non payable
- ✅ Correctif de l'import de recette par photo
- ⏳ Validation des 14 prix de revente · parfums · fiches allergènes · recettes incomplètes · barquette · coûts réels
- ⬜ Publication du catalogue validé

## 5 bis. Bibliothèque professionnelle (fiches techniques)
- ✅ Base : sources et droits (Massena Formations : utilisation interne + adaptation, confirmation du 19/11), inventaire, espaces Bella'Food / Vil'Dor / partagé séparés, variantes de recette, validation humaine
- ✅ Inventaire : 119 documents Google Drive distincts (160 liens, 41 doublons)
- 🔄 Extraction en recettes : 8 / 119 — lot 1 (« à valider », rien d'inventé, allergènes non indiqués = inconnus) · contradictions avec extraits originaux (Madeleine, Spritz, Financier, Cigarette russe, Cookies) · doublon Cookies signalé · plus de création de doublon (appliqué en base)
- ✅ Écran Bibliothèque déployé (GO 19/11) : recherche, reclassement, validation, contradictions avec extraits, comparaison des doublons, import multiple et de dossiers, stockage privé, justificatif des droits — confidentialité testée (visiteur / cliente / assistante / partenaire : 0)
- ⬜ Extraction automatique des fichiers importés depuis l'iPhone · calculs (portions, coûts Bella'Food, courses, production, étiquettes, PDF) branchés sur les recettes validées · bibliothèque Vil'Dor dans son espace

## 5 ter. Atelier d'import intelligent Bella'Food / Vil'Dor (moteur unique) — 19/11
- ✅ Base : file d'attente persistante (reçu, en attente, analyse en cours, extraction terminée, doublon potentiel, à classer, à compléter, à valider, validé, erreur), historique des lots, limites IA configurables (200 analyses/jour, 20 €/mois, alerte 80 %), journal des coûts — 0121 appliquée (111 fiches Drive en attente, 8 à valider)
- ✅ Déployé (GO 19/11, 7579b94 + 2978fd8) — écran unique (remplace l'ancien « Import recette », qui n'enregistrait rien) : fichiers multiples, photos multiples, scan, dossier, ZIP (protégé : 300 fichiers, 300 Mo, chemins suspects refusés), Word .docx, PDF, texte, dictée, liens · estimation du coût avant analyse · pause / reprise · reclassement · historique — captures iPhone ✅
- ✅ Déployé — analyse serveur : recette structurée des sites lue SANS IA ; IA pour PDF, images, texte ; rien d'inventé ; doublon → pas de création ; recette « à valider » ; association d'image proposée — testé : droits (401/403), séparation Vil'Dor, SSRF (adresses internes refusées) · ⬜ test réel avec la clé IA en production
- ✅ Déployé — Vil'Dor : onglet « Atelier » dans son espace, stockage et lignes de SON organisation, jamais dans les recettes Bella'Food
- ⏳ Réseaux sociaux (Pinterest, Instagram, TikTok, YouTube) : lecture si la page publique le permet, sinon alternatives proposées (capture, description, transcription) — aucune API contournée
- ⬜ Transcription audio / vidéo (aucun service de transcription branché : dictée iPhone ou transcription collée en attendant) · .doc ancien (conservé, à convertir) · import direct par lien Google Drive (via l'app Fichiers en attendant)
- ✅ Fiches Drive partagées par lien : téléchargées par le serveur (original conservé en privé), traitées par la file — sans session Claude · 🔄 111 en attente : premier lot à lancer (plafond de test 2 €)
- ✅ Budget IA : réservation atomique côté serveur (analyses simultanées, testé 6 cas) · écran Coûts IA (consommation jour / mois, coût moyen, restant, alertes, par univers et fonctionnalité, limites modifiables, suspension) — plafond de test Bella'Food 2 € / 30 analyses par jour
- ⏳ Test réel en production à faire par la fondatrice (Actions requises) avant de déclarer chaque source opérationnelle

- 🟦 « Analyser toutes les fiches en attente » : traitement de toute la file en une action, mode « Sans IA (0 €) » ou « Sans IA puis IA si besoin », arrêt au plafond IA (inchangé), reprise automatique, suivi par document (coût, statut, erreur, recette liée) — testé sur données d'essai ; ⏳ GO de mise en ligne
- 🟦 Lecture SANS IA des PDF (texte intégré) et des fiches techniques structurées (Massena : matériel, ingrédients, durées, progression, astuces, contradictions de temps) — testée sur PDF générés ; ⏳ premier essai réel sur les 111 fiches à faire (mode sans IA, 0 €)
- ⏳ 111 fiches Massena en file d'attente (objectif 119/119, sans doublon, sans publication)
## 6. Hygiène et traçabilité — P3
- ✅ Documents partenaires privés (empreinte, doublons, expiration)
- ✅ Référentiel des 14 allergènes (collection) et blocage des publications non conformes
- ⬜ Plan de maîtrise sanitaire, HACCP, lots, températures, nettoyage, incidents, retrait / rappel, dossier de contrôle PDF / ZIP

## 7. Bella'Secret Home — P4
- ⏳ Espace hôte / hôtesse validé (tableau de bord, planning, disponibilités, missions acceptées / refusées, consignes, invitations, billets et QR codes, présences, jeux, modération, messagerie, documents, rémunérations, historique) + gestion côté fondatrice — à développer (lot suivant)
- ✅ Audit des salons
- ✅ Interface sécurisée (jetons, pseudonymes, modération, signalement) — en production
- ✅ Activation en base (0115 + 0115b) et tests de sécurité (17 tests)
- ⬜ Planning des hôtes · événements · visuels Concorde Pro · test billetterie

## 8. Refonte commerciale — P5
- ✅ Cahier des charges et inspirations
- ⬜ Accueil client, boutiques par univers, recherche, panier multi-univers, fidélité

## 9. Studio de merchandising — P6
- ✅ Cahier des charges
- ⬜ Éditeur de bannières, collections, promotions, calendrier, aperçu, lien atelier

## 10. Qualité technique — P7
- 🟦 Inventaire TypeScript reproductible (`node scripts/ts-inventaire.mjs`)
- ✅ Analyse des fichiers non chargés (`docs/qualite/FICHIERS_NON_CHARGES.md`) — rien supprimé
- ✅ Corrections : 2 plantages paiement, import recette, appel IA, argument superflu
- 🟦 Build réussi · 1 411 erreurs (3 critiques en code chargé, routes Stripe désactivées)
- ⏳ Archivage des doublons Events (accord) · recâblage du moteur de l'assistant
- ⬜ Contrôle TypeScript obligatoire avant mise en production

## 11. Paiements partenaires — P8
- ✅ Principe de répartition et confidentialité des rémunérations (testés en base)
- ⏳ Validation juridique et comptable · choix du prestataire
- ⬜ Versements, rapprochement, remboursements, paiements réels

## 12. Actions requises et validation finale
- ✅ Écran (priorités, échéances, historique, dépendances, pièces jointes) — 39 actions dont 38 ouvertes
- ✅ Tests simulés des permissions · 🟦 tests des écrans au format iPhone
- ⬜ Tests sur le vrai iPhone · notifications push · validation générale de la production

## 13. Administration — Studio de papeterie et packs administratifs multi-univers (demandé le 19/11)
- 🔄 Analyse des références (modèle de facture et livre des recettes / achats / marge Massena, 3 visuels d'exemple) : champs, tableaux et mentions repris dans le moteur ; formules du livre de marge à intégrer
- ✅ Moteur de packs par univers — déployé 563fbab, packs en BROUILLON jusqu'à validation graphique, logo officiel Vil'Dor intégré (7 thèmes : Studio, BSH, Food, Even's, Odyssée, Vilo'Assistance, Vil'Dor en simulation + thème généré pour tout autre univers) : logo officiel en haut à droite, palette, typographie, ornement, bandeau, pied de page légal, filigrane SIMULATION — table `bellaia_packs_admin` appliquée en base (✅)
- 🟦 5 premiers documents par univers : devis, facture, bon de commande, fiche de vente (« ne vaut pas facture »), bon de livraison — 35 PDF générés depuis les catalogues réels, contrôlés avec un lecteur PDF indépendant, envoyés à la fondatrice avec aperçus iPhone
- ✅ Onglet Administration → 🎨 Packs administratifs (déployé) : choix univers / document / données (catalogue réel ou pièce existante), aperçu, PDF / partage, personnalisation en brouillon, historique et retour à la version précédente, validation graphique (testé : brouillon + validation)
- ✅ Bella'Structure : 3 modèles sans fichier masqués du catalogue client (rien supprimé) · ⬜ vrais modèles modifiables
- ⏳ Validation graphique des 7 packs par la fondatrice → puis activation pour les NOUVELLES pièces uniquement (pièces émises inchangées)
- ⬜ Autres documents (acompte, avoir, reçu, bons d'achat / transport, bordereaux, courriers, documents spécifiques par univers), exports PNG / Word / Sheets / ZIP, import de modèles
