// ═══════════════════════════════════════════════════════════
// Tableau de bord — Mon espace BSH — src/app/bsh/espace/page.tsx
// (route réelle /bsh/espace)
//
// Server Component "coquille" : fournit les métadonnées (dont le
// noindex, espace privé) et délègue tout l'affichage — qui dépend du
// token localStorage, donc du navigateur — au Client Component
// EspaceDashboard.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import EspaceDashboard from "./EspaceDashboard";

export const metadata: Metadata = {
  title: "Mon espace",
  description: "Votre espace personnel Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspacePage() {
  return <EspaceDashboard />;
}
