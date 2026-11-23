import type { Metadata } from "next";
import PageLegale, { ACompleter as A } from "@/modules/legal/PageLegale";
import BlocEditeur from "@/modules/legal/BlocEditeur";
import { formaterEditeur, lireEditeur } from "@/modules/legal/editeur";

export const metadata: Metadata = { title: "Mentions légales — Bellaïa", robots: { index: false, follow: true } };

export const revalidate = 600;

export default async function Page() {
  const editeur = formaterEditeur(await lireEditeur());
  return <PageLegale titre="Mentions légales" sousTitre="Application Bellaïa et univers Bella'Studio" sections={[
    { titre: "Éditeur", contenu: <><p style={{ margin: "0 0 8px" }}>Bellaïa est éditée par :</p><BlocEditeur e={editeur} /></> },
    { titre: "Directrice de la publication", contenu: <><A>Nom et prénom de la fondatrice</A>.</> },
    { titre: "Hébergement", contenu: <>Application : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Données : Supabase, centre de données de Francfort (Allemagne). <A>coordonnées exactes à confirmer d'après les contrats</A>.</> },
    { titre: "Activités et univers", contenu: <>Bella'Food (restauration), Vil'Dor Pâtisse (partenaire), Bella'Secret Home (réservé aux personnes majeures), Bella'Events, Bella'Odyssée, Mo Ti-Péyi et Bella'Studio Éditions, Vilo'Assistance. <A>préciser pour chaque activité l'entité qui vend et ses numéros d'immatriculation, notamment pour Vil'Dor Pâtisse</A>.</> },
    { titre: "Médiation de la consommation", contenu: <>En cas de litige, après une réclamation écrite restée sans réponse satisfaisante, vous pouvez recourir gratuitement au médiateur : <A>nom, site internet et adresse du médiateur auquel Bella'Studio adhère — obligatoire, C. conso L612-1 et L616-1</A>.</> },
    { titre: "Propriété intellectuelle", contenu: <>Les textes, illustrations, logos, jeux et contenus de Bellaïa sont protégés. Toute reproduction sans autorisation écrite est interdite. Les marques et visuels de tiers restent la propriété de leurs titulaires.</> },
  ]}/>;
}
