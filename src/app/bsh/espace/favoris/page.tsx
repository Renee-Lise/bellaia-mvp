// ═══════════════════════════════════════════════════════════
// Favoris — src/app/bsh/espace/favoris/page.tsx
// (route réelle /bsh/espace/favoris)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import FavorisClient from "./FavorisClient";

export const metadata: Metadata = {
  title: "Favoris",
  description: "Vos favoris Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspaceFavorisPage() {
  return <FavorisClient />;
}
