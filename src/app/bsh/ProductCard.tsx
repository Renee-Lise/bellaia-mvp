// ═══════════════════════════════════════════════════════════
// Carte produit partagée — src/app/bsh/ProductCard.tsx
//
// Extraite de la Boutique pour être réutilisée par Coffrets &
// Expériences (même logique de fiche produit) sans la dupliquer.
// Aucune interactivité : compatible Server Component comme Client
// Component appelant.
// ═══════════════════════════════════════════════════════════
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY } from "./bshTokens";
import type { ProduitBSH } from "./boutique/getProduits";

export default function ProductCard({ p }: { p: ProduitBSH }) {
  const details: { label: string; valeur: string }[] = [];
  if (p.tailles) details.push({ label: "Tailles", valeur: p.tailles });
  if (p.composition) details.push({ label: "Composition", valeur: p.composition });
  if (p.usage_conseils) details.push({ label: "Usage", valeur: p.usage_conseils });
  if (p.entretien) details.push({ label: "Entretien", valeur: p.entretien });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(46,26,46,0.5)",
        border: `1px solid ${C.borderM}`,
        borderRadius: 4,
        padding: "12px 13px",
      }}
    >
      {p.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.image_url}
          alt={p.nom}
          style={{
            width: "calc(100% + 26px)",
            margin: "-12px -13px 10px",
            aspectRatio: "4 / 3",
            objectFit: "cover",
            borderRadius: "4px 4px 0 0",
            display: "block",
          }}
        />
      )}
      {p.categorie && (
        <span
          style={{
            fontSize: 8,
            color: "rgba(198,161,91,0.55)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 5,
          }}
        >
          {p.categorie}
        </span>
      )}
      <span
        style={{
          fontFamily: DISPLAY,
          fontSize: 13,
          fontWeight: 600,
          color: C.cream,
          lineHeight: 1.3,
          marginBottom: p.notes ? 4 : 8,
        }}
      >
        {p.nom}
      </span>
      {p.notes && (
        <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.5 }}>
          {p.notes}
        </p>
      )}

      {details.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginBottom: 10,
            paddingTop: 8,
            borderTop: `1px solid ${C.borderL}`,
          }}
        >
          {details.map((d) => (
            <div key={d.label} style={{ fontSize: 10, color: "rgba(203,185,185,0.55)", lineHeight: 1.5 }}>
              <span style={{ color: "rgba(198,161,91,0.6)", fontWeight: 600 }}>{d.label} · </span>
              {d.valeur}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "auto", fontSize: 10, color: "rgba(198,161,91,0.45)", fontStyle: "italic" }}>
        Prix à venir
      </div>
    </div>
  );
}
