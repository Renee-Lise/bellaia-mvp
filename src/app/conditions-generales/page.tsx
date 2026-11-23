import type { Metadata } from "next";
import PageLegale, { ACompleter as A, RETRACTATION } from "@/modules/legal/PageLegale";

export const metadata: Metadata = { title: "Conditions générales — Bellaïa", robots: { index: false, follow: true } };
const td: React.CSSProperties = { borderTop: "1px solid rgba(28,34,70,0.14)", padding: "6px 6px", verticalAlign: "top", fontSize: 14.5 };

export default function Page() {
  return <PageLegale titre="Conditions générales de vente et d'utilisation" sousTitre="Valables pour les commandes passées dans Bellaïa" sections={[
    { titre: "Objet et acceptation", contenu: <>Elles s'appliquent aux ventes et prestations des univers Bella'Studio. Elles sont présentées avant toute commande ; la commande vaut acceptation. Conditions particulières par activité : ci-dessous.</> },
    { titre: "Prix", contenu: <>Prix en euros, <A>« TTC » ou « TVA non applicable, art. 293 B du CGI » selon le régime</A>. Les frais de livraison ou de déplacement sont indiqués avant la validation de la commande. Les prix affichés « en cours de validation » ne sont pas commandables.</> },
    { titre: "Commande et paiement", contenu: <>Récapitulatif complet avant paiement, bouton « Commander avec obligation de paiement ». Moyens de paiement : <A>à confirmer selon les moyens activés</A>. Confirmation envoyée après le paiement.</> },
    { titre: "Allergènes et denrées", contenu: <>La liste des 14 allergènes réglementaires est affichée sur chaque produit avant l'achat ; un produit dont les allergènes ne sont pas vérifiés n'est pas commandable. Conditions de conservation et date limite : indiquées sur le produit et l'étiquette.</> },
    { titre: "Livraison et retrait", contenu: <>Zones, délais et frais : <A>à préciser par activité</A>. Bella'Secret Home : emballage neutre, sans mention du contenu.</> },
    { titre: "Droit de rétractation et annulation", contenu: <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{RETRACTATION.map(([u, t]) => <tr key={u}><td style={{ ...td, fontWeight: 600, width: "34%" }}>{u}</td><td style={td}>{t}</td></tr>)}</tbody></table> },
    { titre: "Garanties légales", contenu: <>Garantie légale de conformité (C. conso L217-3 s.) et garantie des vices cachés (Code civil 1641 s.), lorsqu'elles s'appliquent.</> },
    { titre: "Réclamations et médiation", contenu: <>Réclamation : <A>e-mail</A>. Médiateur de la consommation : <A>coordonnées — obligatoire</A>. Droit applicable : droit français.</> },
    { titre: "Utilisation de l'application", contenu: <>Un seul compte par personne ; les rôles professionnels sont attribués par la fondatrice, jamais automatiquement. Interdiction de contourner les accès, de copier les contenus ou de publier des contenus illicites dans les espaces d'échange. Comptes suspendus en cas d'abus.</> },
  ]}/>;
}
