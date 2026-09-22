"use client";
// ═══════════════════════════════════════════════════════════
// Favoris — src/app/bsh/espace/favoris/FavorisClient.tsx
//
// Lit la table favoris (migration 0001) avec le produit embarqué via
// l'embed PostgREST sur la clé étrangère stock_id → stocks. Réutilise
// ProductCard (même fiche produit que Boutique/Coffrets) pour ne pas
// dupliquer l'affichage — seul ajout : un bouton retirer, puisque
// favoris n'a pas de policy UPDATE (un favori se retire et se remet,
// il ne se modifie pas — cf. migration 0001).
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";
import ProductCard from "../../ProductCard";
import type { ProduitBSH } from "../../boutique/getProduits";

interface FavoriRow {
  id: string;
  stocks: ProduitBSH | null;
}

export default function FavorisClient() {
  const etat = useBshEspace();
  const [favoris, setFavoris] = useState<FavoriRow[] | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState<string | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const res = await espaceFetch(
        token,
        "favoris?select=id,stocks(id,nom,categorie,notes,tailles,composition,usage_conseils,entretien)&order=created_at.desc&limit=200"
      );
      if (!actif) return;
      if (res.ok) setFavoris(await res.json());
    })();

    return () => {
      actif = false;
    };
  }, [etat]);

  const retirer = async (favId: string) => {
    if (etat.statut !== "connectee") return;
    setRetraitEnCours(favId);
    const res = await espaceFetch(etat.token, `favoris?id=eq.${favId}`, { method: "DELETE" });
    if (res.ok) {
      setFavoris((p) => (p ? p.filter((f) => f.id !== favId) : p));
    }
    setRetraitEnCours(null);
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de vos favoris…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour voir vos favoris BSH.
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

  const favorisValides = (favoris || []).filter((f) => f.stocks);

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
          Favoris
        </h1>
      </div>

      <div style={{ padding: "18px 22px 32px" }}>
        {favoris === null ? (
          <EtatVide message="Chargement de vos favoris…" />
        ) : favorisValides.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>
              Vous n&apos;avez pas encore de favoris. Le cœur sur une fiche produit
              de la boutique l&apos;ajoute ici.
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {favorisValides.map((f) => (
              <div key={f.id} style={{ position: "relative" }}>
                <ProductCard p={f.stocks as ProduitBSH} />
                <button
                  onClick={() => retirer(f.id)}
                  disabled={retraitEnCours === f.id}
                  aria-label="Retirer des favoris"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `1px solid ${C.borderM}`,
                    background: "rgba(11,7,9,0.7)",
                    color: retraitEnCours === f.id ? "rgba(203,185,185,0.3)" : C.goldL,
                    fontSize: 11,
                    lineHeight: 1,
                    cursor: retraitEnCours === f.id ? "default" : "pointer",
                  }}
                >
                  ✕
                </button>
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
