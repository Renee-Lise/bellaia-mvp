// ═══════════════════════════════════════════════════════════
// Navigation persistante des pages publiques BSH — src/app/bsh/BshNav.tsx
//
// Avant cette barre, les destinations (Boutique, Cercle, Lounge...)
// n'étaient accessibles que via BshFooter, tout en bas de chaque
// page — invisible sans faire défiler toute la page. Cette barre
// reste collée en haut de l'écran (position sticky) sur toutes les
// pages /bsh/*, avec des libellés et icônes plus grands que ceux du
// footer. Le footer reste en place (utile en fin de page), cette
// barre est le complément visible immédiatement.
// ═══════════════════════════════════════════════════════════
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_BODY as BODY } from "./bshTokens";

const NAV_LINKS = [
  { ico: "🏠", l: "Accueil", href: "/bsh" },
  { ico: "🛍", l: "Boutique", href: "/bsh/boutique" },
  { ico: "🎁", l: "Coffrets", href: "/bsh/coffrets" },
  { ico: "🎴", l: "Secret Games", href: "/bsh/secret-games" },
  { ico: "💞", l: "Secret Duo", href: "/bsh/secret-duo" },
  { ico: "🔒", l: "Le Cercle", href: "/bsh/cercle" },
  { ico: "🥂", l: "BSH Lounge", href: "/bsh/lounge" },
];

export default function BshNav() {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(10,6,14,0.92)",
        backdropFilter: "blur(6px)",
        borderBottom: `1px solid ${C.border}`,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 14px",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        {NAV_LINKS.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              background: "rgba(198,161,91,0.08)",
              border: `1px solid ${C.borderM}`,
              borderRadius: 20,
              padding: "8px 14px",
              color: C.cream,
              fontSize: 13,
              fontFamily: BODY,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 15 }}>{n.ico}</span>
            <span>{n.l}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
