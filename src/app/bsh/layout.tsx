// ═══════════════════════════════════════════════════════════
// Layout des pages publiques Bella'Secret Home — src/app/bsh/layout.tsx
//
// Charge réellement les polices Cormorant Garamond + Jost via
// next/font/google. Le code existant (accueil, BSH Members dans
// BellaiaApp.tsx) référence déjà ces polices en fontFamily, mais
// elles n'étaient jamais chargées nulle part dans l'app : elles
// retombaient silencieusement sur Georgia/system-ui. Ici elles
// sont enfin servies (auto-hébergées par Next.js, sans appel
// réseau externe au runtime) pour que l'identité visuelle prévue
// s'affiche réellement sur les pages publiques BSH.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { BSH_PALETTE } from "./bshTokens";
import AgeGate from "./AgeGate";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-bsh-display",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-bsh-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Bella'Secret Home",
    default: "Bella'Secret Home",
  },
  description:
    "Bella'Secret Home — lingerie, jeux de couple, sensoriel et coffrets à vivre. L'intimité élevée au rang d'art.",
};

export default function BshLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} ${jost.variable}`}
      style={{ background: BSH_PALETTE.night, minHeight: "100vh" }}
    >
      {/*
        Porte d'âge posée ici (une fois pour tout /bsh/*) plutôt que
        dans chaque page : elle ne se réaffiche pas en naviguant d'une
        page BSH à une autre, seulement à la toute première visite.
      */}
      <AgeGate>{children}</AgeGate>
    </div>
  );
}
