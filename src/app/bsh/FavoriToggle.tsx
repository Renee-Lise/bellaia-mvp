"use client";
// ═══════════════════════════════════════════════════════════
// Bouton cœur — ajoute/retire un produit des favoris — src/app/bsh/FavoriToggle.tsx
//
// Utilisé sur les fiches produit de la Boutique et des Coffrets pour
// que "favoris" (Étape 4) soit réellement alimentable — sans lui, la
// page /bsh/espace/favoris resterait vide pour toujours faute de
// pouvoir y ajouter quoi que ce soit. Réutilise useBshEspace/espaceFetch
// (même session que le reste de Mon espace BSH) plutôt que de refaire
// sa propre gestion de token.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { BSH_PALETTE as C } from "./bshTokens";
import { useBshEspace, espaceFetch } from "./espace/useBshEspace";

export default function FavoriToggle({ stockId }: { stockId: string }) {
  const etat = useBshEspace();
  const [favId, setFavId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const res = await espaceFetch(token, `favoris?stock_id=eq.${stockId}&select=id`);
      if (!actif || !res.ok) return;
      const rows = await res.json();
      setFavId(rows[0]?.id || null);
    })();

    return () => {
      actif = false;
    };
  }, [etat, stockId]);

  const boutonStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: `1px solid ${C.borderM}`,
    background: "rgba(11,7,9,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    lineHeight: 1,
  };

  if (etat.statut !== "connectee") {
    return (
      <a
        href="/"
        title="Connectez-vous pour ajouter aux favoris"
        style={{ ...boutonStyle, color: "rgba(203,185,185,0.5)", textDecoration: "none" }}
      >
        ♡
      </a>
    );
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (favId) {
      const res = await espaceFetch(etat.token, `favoris?id=eq.${favId}`, { method: "DELETE" });
      if (res.ok) setFavId(null);
    } else {
      const res = await espaceFetch(etat.token, "favoris", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ stock_id: stockId, univers: "bsh" }),
      });
      if (res.ok) {
        const rows = await res.json();
        setFavId(rows[0]?.id || null);
      }
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={favId ? "Retirer des favoris" : "Ajouter aux favoris"}
      style={{
        ...boutonStyle,
        color: favId ? C.goldL : "rgba(203,185,185,0.5)",
        cursor: busy ? "default" : "pointer",
      }}
    >
      {favId ? "♥" : "♡"}
    </button>
  );
}
