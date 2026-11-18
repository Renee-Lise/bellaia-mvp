# Bellaïa — Checklist générale (mise à jour du 18/11/2026)

Statuts : ✅ **Opérationnel** (en production) · 🟦 **Développé, non déployé** (prévisualisation) · 🟨 **Préparé, non exécuté** · 🔄 **En cours** · ⏳ **En attente de validation / de données** · ⬜ **À faire**

Note : la base Supabase est commune à la production et à la prévisualisation. Une modification de base marquée ✅ est donc active pour tous ; le code marqué 🟦 ne l'est qu'en prévisualisation.

## 1. Infrastructure et administration
- ✅ Adresse officielle : bellaia-11-azure.vercel.app
- ✅ Profil juridique et émetteurs (logos, en-têtes) — mentions fiscales ⏳ régime à confirmer
- ✅ Configuration Supabase / Vercel
- ⏳ Sauvegarde Supabase à vérifier (Actions requises)
- ⬜ Consolidation de l'ancien projet bellaia-mvp (redirection)
- ⏳ Régime fiscal à confirmer

## 2. Sécurité — P0
- ✅ Factures, devis, dossiers, paiements réservés à l'équipe ; portails clients via fonctions serveur
- ✅ Migration 0112 : permissions, journal, fin des droits automatiques de l'assistante, protection contre l'élévation de privilèges
- ✅ Commandes clientes en brouillon au total « à vérifier »
- ✅ 17 vues financières / CRM corrigées (fuite anonyme fermée)
- ✅ Vue catalogue publique sans prix d'achat (créée)
- 🟦 SumUp : montant calculé par le serveur, contrôle du montant payé (14 tests simulés)
- 🟦 Stripe désactivé, plus proposé par défaut
- 🟦 Salons BSH : nouvel écran sécurisé · 🟨 migration 0115 (test en base non réalisé : confirmation sans réponse)
- 🟨 Fermeture des prix d'achat BSH / Odyssée et des coûts / marges Food (0117)
- ⏳ Protection contre les mots de passe compromis (réglage Supabase — Actions requises)
- ⏳ Mise en production corrective P0 (« GO P0 » + sauvegarde)
- ⬜ Test réel d'un paiement SumUp

## 3. Organisation et équipe — P1
- ✅ Base : comptes multirôles, organisations, missions, fil, stockage privé
- 🟦 Écrans : Accès & permissions, espace équipe, missions, livrables, commentaires / corrections, planning
- 🟨 Pôles de mission évolutifs (0116) — ⏳ « GO P1 »
- ⏳ Compte réel de l'assistante / partenaire (e-mail)
- ⬜ Tests avec de vrais comptes

## 4. Vil'Dor Pâtisse — P2
- ✅ Organisation partenaire, statut « en création », profil d'agente publique, 3 autorisations indépendantes, blocage ventes / versements (en base)
- 🟦 Espace partenaire (mode préparation, documents, tarifs, commandes reçues) — confidentialité des marges testée
- 🔄 Atelier : recettes, préparations, ingrédients, courses, stocks, rentabilité, planning (prochain lot)
- ⏳ Autorisation du rectorat · immatriculation · régularisation sanitaire · contrat de fourniture

## 5. Bella'Food et collection saisonnière
- ✅ 8 tarifs pâtissiers enregistrés (non publiés)
- ✅ 14 références saisonnières, tarifs fournisseur, prix de revente proposés, en brouillon (base)
- 🟦 Collection saisonnière : calculs côté serveur, simulations, récapitulatif fournisseur
- 🟦 **Réductions** : codes promo (%, €, période, minimum, utilisations, une par cliente), réduction manuelle sur une commande — base ✅, écrans 🟦
- 🟦 **Allergènes automatiques** sur les commandes (site et sur-mesure), affichés avant l'achat ; « à vérifier » si inconnus
- 🟦 Correctif de l'import de recette par photo
- ⏳ Validation des 14 prix de revente · parfums · fiches allergènes · recettes incomplètes · barquette · coûts réels
- ⬜ Publication du catalogue validé

## 6. Hygiène et traçabilité — P3
- ✅ Documents partenaires privés (empreinte, doublons, expiration)
- ✅ Référentiel des 14 allergènes (collection) et blocage des publications non conformes
- ⬜ Plan de maîtrise sanitaire, HACCP, lots, températures, nettoyage, incidents, retrait / rappel, dossier de contrôle PDF / ZIP

## 7. Bella'Secret Home — P4
- ✅ Audit des salons
- 🟦 Interface sécurisée (jetons, pseudonymes, modération, signalement)
- 🟨 Activation en base (0115) et tests de sécurité
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
- 🟦 Corrections : 2 plantages paiement, import recette, appel IA, argument superflu
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
