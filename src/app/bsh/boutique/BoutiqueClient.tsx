"use client";
// ═══════════════════════════════════════════════════════════
// Grille filtrable de la boutique — src/app/bsh/boutique/BoutiqueClient.tsx
//
// Reçoit les produits déjà chargés côté serveur (présents dans le
// HTML initial pour le référencement) et gère uniquement le filtre
// par catégorie côté client. Aucun prix réel, aucune remise : tout
// affiche "Prix à venir" tant que Renée-Lise n'a pas dit le
// contraire. Les 4 champs de fiche produit (tailles, composition,
// usage, entretien) ne s'affichent que s'ils sont renseignés — pas
// de ligne vide sur les produits qui n'en ont pas encore.
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import type { ProduitBSH } from "./getProduits";

const CATEGORIES = [
  "Tout",
  "Lingerie & Tenues",
  "Sextoys & Accessoires",
  "BDSM & Contraintes",
  "Coffrets & Expériences",
  "Aphrodisiaques & Bien-être",
];

export default function BoutiqueClient({ produits }: { produits: ProduitBSH[] }) {
  const [filtre, setFiltre] = useState<string>("Tout");

  const produitsFiltres =
    filtre === "Tout" ? produits : produits.filter((p) => p.categorie === filtre);

  return (
    <>
      {/* ── Filtres ── */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 6,
          padding: "10px 16px",
          borderBottom: `1px solid ${C.borderL}`,
          background: C.plumD,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltre(cat)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: `1px solid ${filtre === cat ? "rgba(198,161,91,0.6)" : "rgba(255,255,255,0.1)"}`,
              background: filtre === cat ? "rgba(198,161,91,0.12)" : "transparent",
              color: filtre === cat ? C.gold : "rgba(203,185,185,0.5)",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: BODY,
              letterSpacing: "0.02em",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Grille produits ── */}
      <div style={{ padding: "16px", minHeight: 200 }}>
        {produits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(203,185,185,0.5)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              La boutique se prépare — les premiers articles arrivent
              bientôt.
            </p>
          </div>
        ) : produitsFiltres.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(203,185,185,0.5)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Aucun article dans cette catégorie pour l&apos;instant.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {produitsFiltres.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProductCard({ p }: { p: ProduitBSH }) {
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
