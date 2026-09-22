"use client";
// ═══════════════════════════════════════════════════════════
// Bouton panier — ajoute/ajuste la quantité d'un produit dans le
// panier — src/app/bsh/PanierButton.tsx
//
// Même rôle que FavoriToggle côté panier : sans lui, /bsh/espace/panier
// resterait vide pour toujours. Écrit dans panier_items (migration
// 0001) via useBshEspace/espaceFetch, même session que le reste de
// Mon espace BSH.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { BSH_PALETTE as C } from "./bshTokens";
import { useBshEspace, espaceFetch } from "./espace/useBshEspace";
import QuantityStepper from "./QuantityStepper";

interface PanierItem {
  id: string;
  quantite: number;
}

export default function PanierButton({ stockId }: { stockId: string }) {
  const etat = useBshEspace();
  const [item, setItem] = useState<PanierItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const res = await espaceFetch(token, `panier_items?stock_id=eq.${stockId}&select=id,quantite`);
      if (!actif || !res.ok) return;
      const rows = await res.json();
      setItem(rows[0] || null);
    })();

    return () => {
      actif = false;
    };
  }, [etat, stockId]);

  const boutonStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${C.borderM}`,
    borderRadius: 2,
    background: "transparent",
    color: C.goldL,
    fontSize: 10,
    letterSpacing: "0.04em",
    padding: "7px 10px",
    textAlign: "center",
    textDecoration: "none",
    display: "block",
  };

  if (etat.statut !== "connectee") {
    return (
      <a href="/" title="Connectez-vous pour ajouter au panier" style={boutonStyle}>
        + Ajouter au panier
      </a>
    );
  }

  const ajouter = async () => {
    if (busy) return;
    setBusy(true);
    const res = await espaceFetch(etat.token, "panier_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ stock_id: stockId, univers: "bsh", quantite: 1 }),
    });
    if (res.ok) {
      const rows = await res.json();
      setItem(rows[0] || null);
    }
    setBusy(false);
  };

  const changerQuantite = async (delta: number) => {
    if (busy || !item) return;
    setBusy(true);
    const nouvelle = item.quantite + delta;
    if (nouvelle <= 0) {
      const res = await espaceFetch(etat.token, `panier_items?id=eq.${item.id}`, { method: "DELETE" });
      if (res.ok) setItem(null);
    } else {
      const res = await espaceFetch(etat.token, `panier_items?id=eq.${item.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ quantite: nouvelle, updated_at: new Date().toISOString() }),
      });
      if (res.ok) {
        const rows = await res.json();
        setItem(rows[0] || item);
      }
    }
    setBusy(false);
  };

  if (!item) {
    return (
      <button onClick={ajouter} disabled={busy} style={{ ...boutonStyle, cursor: busy ? "default" : "pointer" }}>
        + Ajouter au panier
      </button>
    );
  }

  return (
    <QuantityStepper
      quantite={item.quantite}
      busy={busy}
      onDecrement={() => changerQuantite(-1)}
      onIncrement={() => changerQuantite(1)}
    />
  );
}
