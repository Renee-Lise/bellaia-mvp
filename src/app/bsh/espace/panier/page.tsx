// ═══════════════════════════════════════════════════════════
// Panier — src/app/bsh/espace/panier/page.tsx
// (route réelle /bsh/espace/panier)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import PanierClient from "./PanierClient";

export const metadata: Metadata = {
  title: "Panier",
  description: "Votre panier Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspacePanierPage() {
  return <PanierClient />;
}
