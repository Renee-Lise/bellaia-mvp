// ═══════════════════════════════════════════════════════════
// Coffrets & Expériences — src/app/bsh/coffrets/page.tsx
// (route réelle /bsh/coffrets)
//
// N'existait nulle part dans ClientBSH sous cette forme (le lien
// "Coffrets & Exp." de l'accueil pointait vers la boutique, faute de
// page dédiée). Même source de données que la Boutique (`stocks`,
// univers=BSH), filtrée sur la catégorie "Coffrets & Expériences" —
// aucune nouvelle table, aucun contenu dupliqué en dur. Angle
// émotion/expérience plutôt que produit brut, comme décrit dans la
// conception §2 : présentation en un seul thème (pas de filtres),
// cartes plus aérées qu'en boutique. "Prix à venir" partout, même
// logique que la Boutique.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { getProduitsBSH } from "../boutique/getProduits";
import ProductCardActions from "../ProductCardActions";
import BshFooter from "../BshFooter";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coffrets & Expériences",
  description:
    "Coffrets & Expériences Bella'Secret Home — des moments pensés à vivre en couple ou seule, plutôt que de simples produits.",
};

const CATEGORIE = "Coffrets & Expériences";

export default async function BshCoffretsPage() {
  const produits = await getProduitsBSH(CATEGORIE);

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
      {/* ── Hero ── */}
      <div
        style={{
          background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 60%, ${C.night} 100%)`,
          padding: "36px 22px 32px",
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 14,
          }}
        >
          Coffrets & Expériences
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1.35,
            margin: "0 0 16px",
            color: C.goldL,
          }}
        >
          &quot;Un coffret pensé pour transformer une soirée ordinaire en
          autre chose.&quot;
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: C.muted, margin: 0, maxWidth: 340 }}>
          Un coffret BSH n&apos;est pas un simple assortiment de produits.
          C&apos;est un moment pensé à l&apos;avance — à vivre seule ou en
          couple, sans avoir à improviser. Ouvrez-le, et laissez le reste
          se faire.
        </p>
      </div>

      {/* ── Coffrets ── */}
      <div style={{ padding: 16, minHeight: 200 }}>
        {produits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(203,185,185,0.5)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Les premiers coffrets arrivent bientôt.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {produits.map((p) => (
              <ProductCardActions key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>

      <BshFooter />
    </div>
  );
}
