import type { Metadata } from "next";
import PageLegale, { ACompleter as A } from "@/modules/legal/PageLegale";

export const metadata: Metadata = { title: "Mentions légales — Bellaïa", robots: { index: false, follow: true } };

export default function Page() {
  return <PageLegale titre="Mentions légales" sousTitre="Application Bellaïa et univers Bella'Studio" sections={[
    { titre: "Éditeur", contenu: <>Bellaïa est éditée par <A>dénomination ou nom de l'entrepreneur individuel</A>, <A>forme juridique</A>, SIRET <A>numéro</A>, <A>RCS ou RNE</A>, dont l'adresse est <A>adresse complète</A>, Guyane. Téléphone : <A>numéro</A>. E-mail : <A>adresse de contact</A>. TVA : <A>numéro de TVA ou « TVA non applicable, art. 293 B du CGI » selon le régime</A>.</> },
    { titre: "Directrice de la publication", contenu: <><A>Nom et prénom de la fondatrice</A>.</> },
    { titre: "Hébergement", contenu: <>Application : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Données : Supabase, centre de données de Francfort (Allemagne). <A>coordonnées exactes à confirmer d'après les contrats</A>.</> },
    { titre: "Activités et univers", contenu: <>Bella'Food (restauration), Vil'Dor Pâtisse (partenaire), Bella'Secret Home (réservé aux personnes majeures), Bella'Events, Bella'Odyssée, Mo Ti-Péyi et Bella'Studio Éditions, Vilo'Assistance. <A>préciser pour chaque activité l'entité qui vend et ses numéros d'immatriculation, notamment pour Vil'Dor Pâtisse</A>.</> },
    { titre: "Médiation de la consommation", contenu: <>En cas de litige, après une réclamation écrite restée sans réponse satisfaisante, vous pouvez recourir gratuitement au médiateur : <A>nom, site internet et adresse du médiateur auquel Bella'Studio adhère — obligatoire, C. conso L612-1 et L616-1</A>.</> },
    { titre: "Propriété intellectuelle", contenu: <>Les textes, illustrations, logos, jeux et contenus de Bellaïa sont protégés. Toute reproduction sans autorisation écrite est interdite. Les marques et visuels de tiers restent la propriété de leurs titulaires.</> },
  ]}/>;
}
