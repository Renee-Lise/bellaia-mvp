// ═══════════════════════════════════════════════════════════
// BSH Secret Duo — src/app/bsh/secret-duo/page.tsx
// (route réelle /bsh/secret-duo)
//
// Phase 3 du chantier BSH Secret Games — l'univers des couples,
// distinct de /bsh/secret-games (communautaire). Réutilise les
// mêmes fonctions de lecture (getJeuxBSH/getCartesBSH), filtrées
// sur mode='duo' (migration 0045) — pas de nouvelle table, pas de
// code dupliqué pour la lecture des données.
//
// V1 volontairement simple : un seul téléphone partagé entre les
// deux partenaires, passé de main en main. Aucune réponse écrite
// n'est jamais enregistrée.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { getCartesBSH } from "../secret-games/getCartes";
import { getJeuxBSH } from "../secret-games/getJeux";
import SecretDuoClient from "./SecretDuoClient";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Secret Duo",
  description: "L'univers des couples Bella'Secret Home — un espace privé, à vivre à deux.",
};

export default async function BshSecretDuoPage() {
  const { jeux, diagnostic: diagnosticJeux } = await getJeuxBSH("duo");
  const jeuInitial = jeux[0] ?? null;
  const { cartes, diagnostic } = await getCartesBSH(jeuInitial?.id);
  return (
    <>
      <SecretDuoClient
        jeux={jeux}
        jeuInitial={jeuInitial}
        cartesInitiales={cartes}
        diagnostic={diagnostic || diagnosticJeux}
      />
      <BshFooter />
    </>
  );
}
