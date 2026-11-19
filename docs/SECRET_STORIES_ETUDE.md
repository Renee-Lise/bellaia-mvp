# BSH Secret Stories — étude préalable (19/11/2026)

Document de décision pour la fondatrice. Rien n'est activé : aucune migration appliquée, aucun paiement, aucun abonnement, aucune dépense IA ou voix.

## 1. Ce qui existe maintenant (prévisualisation)

| Élément | État | Où |
|---|---|---|
| Migration 0129 (18 tables `ss_*`, contrôles serveur, bucket privé) + retour arrière | 🟨 préparée, **non appliquée** | `supabase/migrations/0129_bsh_secret_stories.sql` |
| Tests des profils (base PostgreSQL locale jetable, jeu d'essai fictif) | ✅ 94/94 conformes | `supabase/tests/0129_secret_stories/` |
| Studio éditorial fondatrice | 🟦 aperçu (simulation tant que 0129 n'est pas appliquée) | Fondatrice › Bella'Secret Home › « Secret Stories (aperçu) », `/apercu/secret-stories` |
| Bibliothèque cliente, lecteur, lecteur audio | 🟦 aperçu | `/apercu/secret-stories-bibliotheque` |

### Profils testés (base locale, migration 0129)

| Profil | Catalogue | Chapitre intégral | Fichier livre numérique | Fichier audio | Extrait audio | Manuscrit privé |
|---|---|---|---|---|---|---|
| Visiteur (non connecté) | refusé | refusé | refusé | refusé | refusé | refusé |
| Cliente adulte vérifiée sans achat | ✅ | — | — | — | ✅ | — |
| Acheteuse du livre numérique | ✅ | ✅ | ✅ | — | ✅ | — |
| Acheteuse du livre audio | ✅ | — | — | ✅ | ✅ | — |
| Abonnée active | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Abonnée expirée | ✅ | — | — | — | ✅ | — |
| Fondatrice | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mineure / âge non vérifié | rien | rien | rien | rien | rien | rien |

Autres vérifications réussies :
- Après résiliation de l'abonnement, l'ouvrage **acheté** reste lisible ; l'audio, qui venait de l'abonnement, est retiré.
- Une cliente ne peut ni se confirmer un achat, ni s'ajouter un format, ni s'activer un abonnement : sa demande reste « en attente ».
- Achat au nom d'une autre personne, offre en brouillon ou demande d'une mineure : refusé.
- Renouvellement automatique non validé pour la formule : refusé.
- Habitudes de lecture (progression, notes, surlignages) : invisibles de la fondatrice comme des autres clientes.
- Collaboratrice autorisée : elle accède aux manuscrits. Elle ne peut ni publier, ni voir les achats, ni supprimer de fichiers.
- Assistante disposant d'une autre permission : aucun manuscrit visible.
- Génération payante sans coût estimé, sans quota mensuel, ou approuvée par une autre personne que la fondatrice : refusé.
- Clonage d'une voix réelle sans autorisation écrite enregistrée : refusé.
- Téléversement de fichier par une cliente : refusé.
- Chaque réécriture de chapitre archive l'ancienne version.
- Un extrait audio est forcément un fichier distinct de l'œuvre (dossier `extraits/`).

## 2. Paiements — conditions vérifiées le 19/11/2026 (sources officielles)

> Ne rien présumer : chaque prestataire décide à l'examen du compte. La nature de l'activité (BSH, boutique adulte, romances sensuelles non graphiques, abonnement) doit être déclarée telle quelle.

| Prestataire | Position publiée | Frais publiés (France) | Abonnements récurrents |
|---|---|---|---|
| **Stripe** | Contenus et services adultes **interdits** (y compris la littérature « conçue pour la gratification sexuelle »). Le sort de romances sensuelles **non graphiques** n'est pas précisé : Stripe tranche à l'examen. Les sex toys ne sont pas interdits au niveau mondial, mais le sont dans certains pays. | 1,4 % à 1,5 % + 0,25 € (cartes EEE standard ; les pages diffèrent) · 2,8 % + 0,25 € (cartes premium) | Stripe Billing : + 0,7 % du volume facturé |
| **PayPal** | « Contenu pour public adulte » diffusé numériquement : **activité soumise à approbation préalable** selon la politique d'utilisation. Une page d'aide plus ancienne l'interdit purement et simplement. | Paiements PayPal, liens et paiement sans compte : 2,9 % + 0,35 € | Possibles après approbation (conditions de renouvellement à faire préciser par PayPal) |
| **SumUp** | Contenus et divertissement pour adultes classés **incompatibles**. Certaines activités sont limitées au paiement en personne. | 2,5 % par paiement en ligne ou par lien | Non adapté au cas présent |

**Recommandation :**
1. Demander par écrit à Stripe et à PayPal si « romances numériques sensuelles, non explicites, réservées aux adultes vérifiés » sont acceptées. Joindre un descriptif honnête de BSH, catalogue de produits adultes compris.
2. Ne rien activer avant une réponse écrite.
3. Si les deux refusent, il faudra un prestataire spécialisé « contenus matures » : frais plus élevés, à étudier séparément.
4. Tant que rien n'est confirmé, la bibliothèque enregistre des **demandes** d'achat, que la fondatrice confirme manuellement.

Sources :
- Stripe : [liste des activités interdites](https://stripe.com/legal/restricted-businesses), [FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs), [tarifs](https://stripe.com/fr/pricing), [Billing](https://stripe.com/billing/pricing)
- PayPal : [politique d'utilisation](https://www.paypal.com/us/legalhub/paypal/acceptableuse-full), [aide sur les biens à caractère sexuel](https://www.paypal.com/us/cshelp/article/what-is-paypal%E2%80%99s-policy-on-transactions-that-involve-sexually-oriented-goods-and-services-help384), [frais en France](https://www.paypal.com/fr/business/paypal-business-fees)
- SumUp : [activités incompatibles](https://help.sumup.com/en-IE/articles/3G8ZHjdgFZjmKWOmDWS52m-restricted-businesses), [paiements en ligne](https://www.sumup.com/fr-fr/paiements-en-ligne/)

## 3. IA et voix — conditions des fournisseurs

- **Anthropic (Claude)** : la politique d'utilisation interdit la génération de contenu sexuellement explicite. La ligne éditoriale « sensuelle, glamour, **non graphique** », avec des scènes intimes suggérées, est donc la seule compatible. Elle est rappelée dans l'atelier. [Politique d'utilisation 2026](https://www-cdn.anthropic.com/files/4zrzovbb/website/6ae2f5bb8675bcd9fac006125817ba1393b396e4.pdf)
- **ElevenLabs** : la politique interdit certains contenus sexuels ou graphiques ainsi que tout contenu sexualisant une personne mineure. Le clonage de voix exige d'avoir les droits sur la voix. Les commandes de production peuvent être annulées si le contenu est jugé explicite. Les règles propres à la diffusion d'audiolivres (ElevenReader) restent **à vérifier** avant toute publication. [Politique d'utilisation](https://elevenlabs.io/use-policy), [conditions ElevenReader Publishing](https://help.elevenlabs.io/hc/en-us/articles/32443815893905-What-type-of-content-can-I-distribute-with-ElevenReader-Publishing)
- **Synthèse vocale existante dans Bellaïa** : l'application n'intègre aucune synthèse vocale. ElevenLabs n'est disponible que comme connecteur de cette session de travail, et non dans l'application. Pour réutiliser l'existant, il faudra donc une intégration serveur dédiée, avec une clé API stockée côté serveur et l'approbation de la fondatrice à chaque génération.

## 4. Coûts estimés (tarifs publics relevés le 19/11/2026, à revérifier avant engagement)

Hypothèses :
- Français : environ 1,35 jeton par mot.
- Un chapitre : environ 3 500 mots, soit environ 21 000 caractères.
- Contexte envoyé à chaque demande : environ 6 000 mots (mémoire de l'ouvrage et chapitres voisins).
- Conversion : 1 $ = 0,92 €.

| Poste | Hypothèse | Coût estimé |
|---|---|---|
| Écriture ou réécriture d'un chapitre — Claude Sonnet 5.5 (2 $ / 10 $ par million de jetons) | 9 500 mots lus, 3 500 écrits | ≈ 0,07 € |
| Idem — Claude Opus 5.5 (4 $ / 20 $) | idem | ≈ 0,13 € |
| Roman de 20 chapitres, 3 passes (écriture, réécriture, correction) | Sonnet / Opus | ≈ 4 € / ≈ 8 € |
| Narration d'un chapitre — ElevenLabs multilingue (0,08 $ / 1 000 car.) | 21 000 caractères | ≈ 1,55 € |
| Idem en Flash (0,04 $ / 1 000 car.) | idem | ≈ 0,77 € |
| Livre audio de 70 000 mots (≈ 420 000 car.), une seule prise | multilingue / Flash | ≈ 31 € / ≈ 15 € |
| Prévoir des reprises (préécoute, corrections) | + 30 à 50 % | ≈ 40 à 46 € (multilingue) |
| Stockage Supabase | inclus dans l'offre actuelle jusqu'à son quota | 0 € supplémentaire à ce stade |

Garde-fous en base :
- Quota mensuel à 0 par défaut : aucune dépense possible tant que la fondatrice n'a pas fixé de plafond.
- Coût estimé obligatoire avant toute génération payante.
- Approbation de la fondatrice obligatoire.
- La file de génération est persistante : tentatives comptées, dernière erreur et point de reprise enregistrés.

## 5. Les Enfants d'Hélios

Aucun fichier trouvé dans le Drive partagé à cette date.

À réception :
- Le manuscrit intégral et la version condensée destinée à ElevenLabs seront enregistrés comme **deux documents distincts**.
- La version condensée ne sera jamais traitée comme le manuscrit définitif.
- Aucun classement dans Secret Stories sans votre validation, notée dans Actions requises.

## 6. Prochaines décisions (fondatrice)

1. Appliquer ou non la migration 0129. Le fichier SQL et son retour arrière sont prêts. La procédure est la même que pour 0128 : coller **uniquement** le fichier de migration dans Supabase.
2. Faire valider la ligne éditoriale « non graphique » et la liste des avertissements de contenu.
3. Décider des demandes écrites à Stripe et à PayPal.
4. Fixer un quota IA et voix mensuel, ou le laisser à 0.
5. Valider les tarifs, qui restent en brouillon, et les formules d'abonnement.
