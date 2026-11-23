import type { Metadata } from "next";
import PageLegale, { ACompleter as A, SOUS_TRAITANTS } from "@/modules/legal/PageLegale";

export const metadata: Metadata = { title: "Confidentialité — Bellaïa", robots: { index: false, follow: true } };
const td: React.CSSProperties = { borderTop: "1px solid rgba(28,34,70,0.14)", padding: "6px 6px", verticalAlign: "top", fontSize: 14.5 };

export default function Page() {
  return <PageLegale titre="Confidentialité et données personnelles" sousTitre="Ce que nous collectons, pourquoi, combien de temps, et vos droits" sections={[
    { titre: "Responsable du traitement", contenu: <><A>Dénomination</A>, <A>adresse</A>. Contact pour vos données : <A>e-mail dédié</A>.</> },
    { titre: "Données et finalités", contenu: <ul style={{ paddingLeft: 20, margin: 0 }}>
      <li><b>Compte</b> (prénom, nom, e-mail, téléphone) : gérer votre accès et vos commandes — exécution du contrat.</li>
      <li><b>Commandes, réservations, devis</b> : les préparer, les livrer, les facturer — exécution du contrat et obligations comptables.</li>
      <li><b>Date de naissance</b> : seulement lorsqu'une prestation l'exige (soins réservés aux majeurs, accord parental) — <A>à rendre facultative ailleurs</A>.</li>
      <li><b>Bella'Secret Home</b> : vos achats peuvent révéler des informations sur votre vie intime. Ils ne sont traités qu'avec votre consentement explicite, accessibles uniquement à la fondatrice et livrés sous emballage neutre.</li>
      <li><b>Candidatures</b> : examiner votre demande ; aucune donnée sensible n'est demandée ; aucune décision n'est prise automatiquement.</li>
      <li><b>Notifications</b> : seulement si vous les activez sur votre appareil.</li>
      <li><b>Messages commerciaux</b> : uniquement avec votre accord ; désinscription possible à tout moment et gratuitement.</li>
    </ul> },
    { titre: "Durées de conservation", contenu: <>Compte : tant qu'il est actif, puis <A>durée</A>. Factures : 10 ans (Code de commerce L123-22). Candidatures non retenues : 6 mois. Demandes de contact : <A>durée</A>.</> },
    { titre: "Destinataires et sous-traitants", contenu: <><p style={{ margin: "0 0 6px" }}>Vos données ne sont jamais vendues. Elles sont accessibles à la fondatrice et, pour ce qui est nécessaire à leur mission, aux membres de l'équipe autorisés. Prestataires techniques :</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr><th style={{ ...td, textAlign: "left" }}>Prestataire</th><th style={{ ...td, textAlign: "left" }}>Rôle</th><th style={{ ...td, textAlign: "left" }}>Localisation</th></tr></thead>
        <tbody>{SOUS_TRAITANTS.map(([n, r, l]) => <tr key={n}><td style={td}>{n}</td><td style={td}>{r}</td><td style={td}>{l}</td></tr>)}</tbody></table></> },
    { titre: "Cookies et stockage sur votre appareil", contenu: <>Bellaïa n'utilise <b>aucun traceur publicitaire ni de mesure d'audience</b>. L'application garde sur votre appareil uniquement ce qui est nécessaire à son fonctionnement (votre session, votre panier, vos préférences d'affichage, l'espace choisi) : ces éléments sont dispensés de consentement (loi Informatique et Libertés, art. 82). Si des statistiques étaient ajoutées un jour, votre accord serait demandé au préalable.</> },
    { titre: "Vos droits", contenu: <>Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation du traitement ou vous y opposer, et retirer votre consentement à tout moment (RGPD, art. 15 à 22). Depuis votre compte : Confidentialité et mes données, ou par e-mail à <A>adresse</A>. Réponse sous un mois. Certaines données doivent être conservées pour des obligations légales (factures). Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</> },
    { titre: "Mineurs", contenu: <>Les comptes Bellaïa sont réservés aux adultes. Les contenus Mo Ti-Péyi sont consultés par l'intermédiaire du compte d'un parent ; le prénom d'un enfant n'est pas enregistré par défaut. Bella'Secret Home est strictement réservé aux personnes majeures. Les soins Bella'Odyssée sur mineur exigent l'accord du représentant légal.</> },
    { titre: "Sécurité", contenu: <>Accès réservés selon le rôle de chacun, fichiers privés stockés dans des espaces non publics, journal des accès sensibles. En cas de violation de données, nous appliquons les obligations prévues aux articles 33 et 34 du RGPD.</> },
  ]}/>;
}
