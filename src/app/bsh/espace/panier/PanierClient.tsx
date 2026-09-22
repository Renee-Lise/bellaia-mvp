"use client";
// ═══════════════════════════════════════════════════════════
// Panier — src/app/bsh/espace/panier/PanierClient.tsx
//
// Lit panier_items (migration 0001) avec le produit embarqué via
// l'embed PostgREST sur stock_id → stocks. Aucun prix réel affiché
// ("Prix à venir" — cf. ProductCard) et aucun total chiffré tant que
// rien n'est activé commercialement : seul le nombre d'articles est
// montré. Réutilise QuantityStepper (même stepper que PanierButton
// sur la Boutique/Coffrets) pour ajuster ou retirer une ligne.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";
import QuantityStepper from "../../QuantityStepper";
import type { ProduitBSH } from "../../boutique/getProduits";

interface LignePanier {
  id: string;
  quantite: number;
  stocks: ProduitBSH | null;
}

export default function PanierClient() {
  const etat = useBshEspace();
  const [lignes, setLignes] = useState<LignePanier[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  async function charger() {
    if (etat.statut !== "connectee") return;
    const res = await espaceFetch(
      etat.token,
      "panier_items?select=id,quantite,stocks(id,nom,categorie,notes,tailles,composition,usage_conseils,entretien)&order=created_at.desc&limit=200"
    );
    if (res.ok) setLignes(await res.json());
  }

  const changerQuantite = async (ligne: LignePanier, delta: number) => {
    if (etat.statut !== "connectee" || busyId) return;
    setBusyId(ligne.id);
    const nouvelle = ligne.quantite + delta;
    if (nouvelle <= 0) {
      const res = await espaceFetch(etat.token, `panier_items?id=eq.${ligne.id}`, { method: "DELETE" });
      if (res.ok) setLignes((p) => (p ? p.filter((l) => l.id !== ligne.id) : p));
    } else {
      const res = await espaceFetch(etat.token, `panier_items?id=eq.${ligne.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ quantite: nouvelle, updated_at: new Date().toISOString() }),
      });
      if (res.ok) {
        setLignes((p) => (p ? p.map((l) => (l.id === ligne.id ? { ...l, quantite: nouvelle } : l)) : p));
      }
    }
    setBusyId(null);
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de votre panier…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour voir votre panier BSH.
        </p>
        <Link
          href="/"
          style={{
            background: C.gold,
            borderRadius: 2,
            padding: "11px 24px",
            color: C.night,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (etat.statut === "erreur") {
    return <EtatVide message={`Un problème est survenu : ${etat.message}`} />;
  }

  const lignesValides = (lignes || []).filter((l) => l.stocks);
  const totalArticles = lignesValides.reduce((s, l) => s + l.quantite, 0);

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
      <div
        style={{
          background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 60%, ${C.night} 100%)`,
          padding: "32px 22px 26px",
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 10,
          }}
        >
          Mon espace BSH
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, margin: 0, color: C.cream }}>
          Panier
        </h1>
        {totalArticles > 0 && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            {totalArticles} article{totalArticles > 1 ? "s" : ""} — Prix à venir
          </div>
        )}
      </div>

      <div style={{ padding: "18px 22px 32px" }}>
        {lignes === null ? (
          <EtatVide message="Chargement de votre panier…" />
        ) : lignesValides.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>
              Votre panier est vide. Ajoutez des articles depuis la boutique.
            </p>
            <Link
              href="/bsh/boutique"
              style={{
                background: C.gold,
                borderRadius: 2,
                padding: "10px 20px",
                color: C.night,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lignesValides.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  background: "rgba(46,26,46,0.5)",
                  border: `1px solid ${C.borderM}`,
                  borderRadius: 4,
                  padding: "12px 13px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {l.stocks?.categorie && (
                    <div
                      style={{
                        fontSize: 8,
                        color: "rgba(198,161,91,0.55)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {l.stocks.categorie}
                    </div>
                  )}
                  <div style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: C.cream }}>
                    {l.stocks?.nom}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(198,161,91,0.45)", fontStyle: "italic", marginTop: 3 }}>
                    Prix à venir
                  </div>
                </div>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <QuantityStepper
                    quantite={l.quantite}
                    busy={busyId === l.id}
                    onDecrement={() => changerQuantite(l, -1)}
                    onIncrement={() => changerQuantite(l, 1)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EtatVide({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 22px", textAlign: "center", color: C.muted, fontFamily: BODY, fontSize: 13 }}>
      {message}
    </div>
  );
}
