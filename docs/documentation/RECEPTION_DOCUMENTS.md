# Réception des documents manquants — procédure (19/11/2026)

**Principe :** un document reçu **complète, corrige ou enrichit** l'existant. Il ne remplace jamais automatiquement un élément validé.
- Toute contradiction (tarif, recette, prestation, condition) est présentée dans **Actions requises** avec les deux versions, leurs sources et la modification proposée, puis appliquée seulement après validation.
- Rien n'est inventé : un champ absent reste « à compléter ».

## Documents attendus

| Document | Destination | Règles particulières |
|---|---|---|
| **Logo noir et doré Bella'Odyssée** | Bibliothèque graphique, `LOGOS_VARIANTES.ODYSSEE` (emplacement prêt, statut « attendu ») | **Variante uniquement** : le logo actif de Bella'Odyssée et tous les autres logos restent inchangés. |
| **Fichier éditorial** | Documentation éditoriale privée (fondatrice) | Analyse, détection des doublons, rattachement module par module. |
| **Les Enfants d'Hélios** — manuscrit intégral | Documentation éditoriale privée, dossier « Hélios / manuscrit intégral » | Classé **séparément de Secret Stories** jusqu'à décision définitive. Jamais publié. |
| **Les Enfants d'Hélios** — version condensée ElevenLabs | Même dossier, sous-dossier « version condensée audio » | Document **distinct** du manuscrit, jamais considéré comme définitif. Aucune génération audio sans validation. |
| **Derniers documents Bella'Food** | Bibliothèque Bella'Food (fiches) puis atelier d'import | Un document identique (même empreinte SHA-256) n'entraîne aucune modification. Un document modifié produit une nouvelle version : l'original est conservé avec son historique. |

## Procédure à réception

1. **Dépôt.** Envoi dans la conversation ou dans le Drive. Le dépôt GitHub étant public, les originaux sont conservés hors dépôt, en stockage privé.
2. **Empreinte et doublons.** Calcul de l'empreinte SHA-256, puis comparaison avec les fichiers déjà connus (bibliothèque Bella'Food, Drive).
3. **Analyse sans IA payante** : lecture gratuite des PDF, extraction structurée.
4. **Rattachement** de chaque information à son module (Food, Vil'Dor Pâtisse, Éditorial, Secret Stories, Odyssée…).
   - Vil'Dor Pâtisse reste une structure indépendante.
   - Les contenus adultes ne sont jamais rattachés aux univers jeunesse ou famille.
5. **Contrôle des contradictions** : prix, allergènes, quantités, conditions.
   - Chaque écart va dans Actions requises, avec la version actuelle, la nouvelle version, les sources et la proposition.
   - Aucune modification avant validation.
6. **Compte rendu** : documents reçus, doublons, informations rattachées, contradictions, éléments manquants.

## État au 19/11/2026
Recherche dans le Drive partagé : aucun de ces documents trouvé. Seuls figurent les PDF Molitor et Massena, déjà répertoriés en `bibliotheque_fiches` (en attente), sans doublon créé.
