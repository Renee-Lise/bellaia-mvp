// ═══════════════════════════════════════════════════════════
// BSH Secret Salons — src/app/bsh/secret-salons/page.tsx
// (route réelle /bsh/secret-salons)
//
// Phase 5 (v1) du chantier BSH Secret Games — salons multijoueur
// en temps réel. Voir migration 0046 pour la portée exacte de
// cette v1 (pas de scores/votes, code = clé d'accès).
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { getJeuxBSH } from "../secret-games/getJeux";
import SalonsClient from "./SalonsClient";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Secret Salons",
  description: "Jouez à plusieurs, en direct — créez ou rejoignez un salon BSH Secret Games.",
};

export default async function BshSecretSalonsPage() {
  const { jeux, diagnostic } = await getJeuxBSH("communautaire");
  return (
    <>
      <SalonsClient jeux={jeux} diagnostic={diagnostic} />
      <BshFooter />
    </>
  );
}
