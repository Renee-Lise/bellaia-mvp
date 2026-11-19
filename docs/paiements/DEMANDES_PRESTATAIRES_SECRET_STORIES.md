# Demandes de confirmation écrite — Stripe et PayPal (projets, NON ENVOYÉS)

Préparé le 19/11/2026. **Rien n'est envoyé ni activé.**
- La fondatrice relit, complète les champs `[à compléter]` (aucune donnée inventée) et décide de l'envoi.
- Les courriers décrivent l'activité telle qu'elle est, sans en masquer la nature.

## 1. Ce qu'il faut savoir avant d'envoyer

- **Stripe dans Bellaïa** : l'application contient une intégration Stripe (boutique Bella'Secret Home), **désactivée depuis le 18/11** (variable `STRIPE_ACTIF`) ; aucun paiement Stripe n'est possible aujourd'hui.
  - Reste à savoir si un compte Stripe a déjà été ouvert : `[à compléter par la fondatrice]`.
  - Si oui, la demande doit le mentionner, car Stripe peut réexaminer le compte existant.
  - La boutique de biens physiques est à présenter aussi, car elle relèvera du même compte.
- **Guyane**
  - **Stripe** prend en charge les entreprises établies en Guyane, avec un compte ouvert en sélectionnant la France. [Disponibilité outre-mer](https://support.stripe.com/questions/stripe-availability-for-outlying-territories-of-supported-countries?locale=fr-FR)
  - **PayPal** : la Guyane (code GF) figure parmi les pays éligibles à PayPal Checkout pour les vendeurs professionnels. Reste à faire préciser si le compte est guyanais ou rattaché à la France. [Tableau PayPal](https://developer.paypal.com/platforms/seller-onboarding)
- **TVA** (à valider par l'expert-comptable)
  - La TVA n'est « provisoirement pas applicable » en Guyane (article 294-1 du CGI), et le département est considéré comme territoire d'exportation. [BOFiP](https://bofip.impots.gouv.fr/bofip/341-PGP.html/identifiant%3DBOI-TVA-GEO-20-20130621)
  - Le traitement des **ventes numériques** (livres numériques, livres audio, abonnements) à des clientes de l'Hexagone ou de l'UE n'est pas tranché par ces sources : lieu de taxation, guichet unique OSS.
  - **Question à poser à l'expert-comptable avant toute vente.**
- **Ne pas contourner** : pas de description vague (« produits numériques divers »), pas de second compte, pas de prestataire intermédiaire pour masquer la catégorie.

## 2. Catégories à distinguer (identiques dans les deux courriers)

| N° | Activité | Nature | Public | Mode de vente |
|---|---|---|---|---|
| A | Bella'Secret Home — boutique | Lingerie, cosmétiques, accessoires intimes (dont jouets pour adultes) — biens physiques | Adultes | Achat ponctuel, livraison ou retrait |
| B | BSH Secret Stories | Romances originales, sensuelles et **non explicites** (pas de scènes sexuelles décrites, pas d'images), en livre numérique et livre audio | Adultes dont l'âge est vérifié | Achat à l'unité |
| C | Abonnement Secret Stories / BSH Members | Accès à un catalogue de B + avantages membres | Adultes vérifiés | Mensuel ou annuel, **sans renouvellement automatique** tant que non validé |
| D | Autres univers Bellaïa | Traiteur (Bella'Food), événementiel (Bella'Even's), beauté (Bella'Odyssée), papeterie (Bella'Studio), éditions jeunesse (Mo Ti-Péyi) | Tout public | Achat ponctuel, acomptes, devis |

Garanties techniques à mentionner :
- Les contenus B et C ne sont jamais accessibles aux mineures. La vérification d'âge est contrôlée par le serveur, ainsi que les achats et les abonnements.
- Les catalogues adultes sont strictement séparés des univers jeunesse.
- Les fichiers sont privés et servis par des liens temporaires.

## 3. Courrier à Stripe (support : formulaire « Contacter l'assistance » du tableau de bord Stripe)

> **Objet : Confirmation préalable — vente de romances numériques non explicites réservées aux adultes et abonnement associé**
>
> Bonjour,
>
> Notre entreprise [raison sociale à compléter], établie en Guyane française (SIRET [à compléter]), [dispose d'un compte Stripe (identifiant à compléter) / souhaite ouvrir un compte Stripe — à choisir]. Nous exploitons la boutique en ligne Bella'Secret Home : lingerie, cosmétiques et accessoires intimes pour adultes (biens physiques).
>
> Avant toute mise en vente, nous souhaitons votre confirmation écrite sur cette boutique et sur deux nouvelles activités :
>
> 1. **Vente à l'unité de livres numériques et de livres audio de romance** : œuvres originales, sensuelles mais non explicites, sans description d'actes sexuels ni image. Elles sont réservées aux adultes dont l'âge a été vérifié.
> 2. **Abonnement mensuel ou annuel** donnant accès à ce catalogue. Aucun renouvellement automatique sans accord explicite de la cliente ; résiliation possible à tout moment.
>
> Ces contenus sont strictement séparés de nos autres activités, qui sont tout public : traiteur, événementiel, beauté, papeterie, livres jeunesse.
>
> Nos questions :
> - Ces deux activités sont-elles acceptées au regard de votre liste d'activités interdites, en particulier de la catégorie « contenus pour adultes » ?
> - La boutique de biens physiques (lingerie, accessoires intimes) est-elle acceptée ?
> - Si les contenus numériques ne le sont pas, cela a-t-il une incidence sur le compte utilisé pour la boutique ?
> - Quelles conditions s'appliqueraient : frais, réserve, Stripe Billing pour l'abonnement ?
> - Faut-il un compte distinct pour ces activités ?
>
> Nous ne lancerons rien avant votre réponse écrite.
>
> Cordialement,
> [Prénom Nom, fonction — à compléter]

## 4. Courrier à PayPal (Service clients professionnels — demande d'approbation « Mature Audience Content »)

> **Objet : Demande d'approbation préalable — contenus numériques pour public adulte (romance non explicite)**
>
> Bonjour,
>
> Notre entreprise [raison sociale à compléter], établie en Guyane française (SIRET [à compléter]), souhaite savoir si les activités suivantes peuvent être acceptées par PayPal. Votre politique d'utilisation soumet les contenus pour public adulte diffusés numériquement à une approbation préalable.
>
> 1. **Vente à l'unité de livres numériques et de livres audio de romance** : œuvres originales, sensuelles mais non explicites, sans image. Elles sont réservées aux adultes dont l'âge a été vérifié.
> 2. **Abonnement mensuel ou annuel** à ce catalogue, sans renouvellement automatique sans accord explicite.
> 3. Pour information : nous exploitons aussi une boutique de lingerie et d'accessoires intimes pour adultes (biens physiques), ainsi que des activités tout public (traiteur, événementiel, beauté, papeterie, livres jeunesse), strictement séparées des contenus adultes.
>
> Nos questions :
> - Ces activités sont-elles éligibles ? Quelle procédure d'approbation suivre ?
> - Un compte professionnel peut-il être ouvert depuis la Guyane, ou est-il rattaché à la France ?
> - Quels frais et quelles conditions s'appliquent, y compris pour les paiements récurrents ?
>
> Nous n'accepterons aucun paiement avant votre réponse écrite.
>
> Cordialement,
> [Prénom Nom, fonction — à compléter]

## 5. SumUp

Non sollicité : les contenus et le divertissement pour adultes y sont classés incompatibles. [Activités incompatibles](https://help.sumup.com/en-IE/articles/3G8ZHjdgFZjmKWOmDWS52m-restricted-businesses)

## 6. Après les réponses

- Les réponses écrites sont à archiver dans Administratif. Ensuite, comparaison des solutions autorisées (frais, réserve, renouvellement) et décision de la fondatrice.
- En cas de double refus : étude séparée d'un prestataire spécialisé, avec ses frais et contraintes. Aucune activation sans validation.
