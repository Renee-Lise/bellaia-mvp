// ═══════════════════════════════════════════════════════════
// Commandes & suivi — src/app/bsh/espace/commandes/page.tsx
// (route réelle /bsh/espace/commandes)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import CommandesClient from "./CommandesClient";

export const metadata: Metadata = {
  title: "Commandes & suivi",
  description: "Suivi de vos commandes Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspaceCommandesPage() {
  return <CommandesClient />;
}
