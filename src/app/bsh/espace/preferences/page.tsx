// ═══════════════════════════════════════════════════════════
// Préférences — src/app/bsh/espace/preferences/page.tsx
// (route réelle /bsh/espace/preferences)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import PreferencesClient from "./PreferencesClient";

export const metadata: Metadata = {
  title: "Préférences",
  description: "Vos préférences Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspacePreferencesPage() {
  return <PreferencesClient />;
}
