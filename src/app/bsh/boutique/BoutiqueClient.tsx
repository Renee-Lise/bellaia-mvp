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
import { BSH_PALETTE as C, BSH_FONT_BODY as BODY } from "../bshTokens";
import type { ProduitBSH } from "./getProduits";
import ProductCard from "../ProductCard";

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
