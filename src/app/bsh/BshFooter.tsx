// ═══════════════════════════════════════════════════════════
// Footer partagé des pages publiques BSH — src/app/bsh/BshFooter.tsx
//
// Extrait de l'accueil pour être réutilisé sur chaque nouvelle page
// /bsh/* sans le dupliquer à chaque fois. Server Component (aucune
// interactivité au-delà de la navigation).
// ═══════════════════════════════════════════════════════════
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "./bshTokens";

const FOOTER_LINKS = [
  { l: "Boutique", href: "/bsh/boutique" },
  { l: "Univers BSH", href: "/bsh/univers" },
  { l: "Cercle", href: "/bsh/cercle" },
  { l: "Lounge", href: "/bsh/lounge" },
];

const LEGAL_LINKS = [
  { l: "Confidentialité & Livraison", href: "/bsh/confidentialite" },
  { l: "Mentions légales", href: "/bsh/mentions" },
];

export default function BshFooter() {
  return (
    <div
      style={{
        background: C.night,
        padding: "20px 22px",
        textAlign: "center",
        borderTop: `1px solid ${C.borderL}`,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 14,
          color: C.gold,
          letterSpacing: 2,
          marginBottom: 4,
        }}
      >
        ✦ Bella&apos;Secret Home
      </div>
      <div style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", letterSpacing: "0.1em" }}>
        INTIMITÉ · ÉLÉGANCE · DÉSIR
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        {FOOTER_LINKS.map((l) => (
          <Link
            key={l.l}
            href={l.href}
            style={{
              color: "rgba(203,185,185,0.5)",
              fontSize: 10,
              letterSpacing: "0.04em",
              fontFamily: BODY,
              textDecoration: "none",
            }}
          >
            {l.l}
          </Link>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${C.borderL}`,
          flexWrap: "wrap",
        }}
      >
        {LEGAL_LINKS.map((l) => (
          <Link
            key={l.l}
            href={l.href}
            style={{
              color: "rgba(203,185,185,0.3)",
              fontSize: 9,
              letterSpacing: "0.03em",
              fontFamily: BODY,
              textDecoration: "none",
            }}
          >
            {l.l}
          </Link>
        ))}
      </div>
    </div>
  );
}
