// ═══════════════════════════════════════════════════════════
// Boutique — src/app/bsh/boutique/page.tsx (route réelle /bsh/boutique)
//
// La boutique existait déjà dans ClientBSH, mais sous une forme très
// simplifiée (grille générique 2 colonnes, sans filtre par catégorie,
// sans les infos taille/composition/usage/entretien — ces colonnes
// n'existaient pas encore en base). Cette page reconstruit la vraie
// direction de la maquette (filtres par univers BSH, fiches produit
// complètes) en lisant les vraies données de `stocks` (Étape 2),
// enrichies par la migration 0001. Aucun prix réel, aucune remise :
// "Prix à venir" partout, comme demandé.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { getProduitsBSH } from "./getProduits";
import BoutiqueClient from "./BoutiqueClient";
import BshFooter from "../BshFooter";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutique",
  description:
    "La boutique Bella'Secret Home — lingerie & tenues, sextoys & accessoires, BDSM & contraintes, coffrets & expériences, aphrodisiaques & bien-être.",
};

export default async function BshBoutiquePage() {
  const produits = await getProduitsBSH();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        color: C.cream,
        fontFamily: BODY,
        fontWeight: 300,
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: C.plumD,
          padding: "24px 18px 20px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontSize: 8,
            letterSpacing: "0.18em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 8,
          }}
        >
          La boutique
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 18,
            fontWeight: 500,
            color: C.cream,
            margin: "0 0 8px",
            lineHeight: 1.25,
          }}
        >
          Ce que vous cherchez ne se trouve pas toujours là où on
          l&apos;attend.
        </h1>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0 }}>
          Un aperçu des univers BSH — les prix arrivent au fur et à
          mesure que la fondatrice les valide.
        </p>
      </div>

      <BoutiqueClient produits={produits} />

      <BshFooter />
    </div>
  );
}
