"use client";
// ═══════════════════════════════════════════════════════════
// Vérification d'âge 18+ — src/app/bsh/AgeGate.tsx
//
// Reprend le texte et le style exacts de l'écran d'âge déjà en
// place dans ClientBSH (src/components/BellaiaApp.tsx). Différence :
// ici la page publique est réellement rendue côté serveur pour le
// référencement — cette porte est un overlay client qui masque le
// contenu à l'écran tant que l'âge n'est pas confirmé, avec un
// souvenir en localStorage pour ne pas la réafficher à chaque visite.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { BSH_PALETTE, BSH_FONT_DISPLAY, BSH_FONT_BODY } from "./bshTokens";

const STORAGE_KEY = "bsh_age_verified";

export default function AgeGate({ children }: { children: React.ReactNode }) {
  // Par défaut on suppose "non vérifié" — c'est l'état le plus sûr
  // à la fois côté serveur et au premier rendu client (pas de
  // décalage d'hydratation), l'effet ci-dessous lève la porte pour
  // les visiteuses déjà confirmées.
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setVerified(true);
    } catch {}
  }, []);

  const confirmer = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVerified(true);
  };

  const refuser = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <>
      {children}
      {!verified && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: `radial-gradient(ellipse at 20% 0%, ${BSH_PALETTE.plum}, ${BSH_PALETTE.night})`,
            fontFamily: BSH_FONT_BODY,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 320, width: "100%" }}>
            <div
              style={{
                fontFamily: BSH_FONT_DISPLAY,
                fontSize: 26,
                color: BSH_PALETTE.gold,
                letterSpacing: 3,
                marginBottom: 4,
              }}
            >
              ✦ Bella&apos;Secret Home
            </div>
            <div
              style={{
                fontSize: 9,
                color: BSH_PALETTE.muted,
                letterSpacing: 4,
                marginBottom: 32,
              }}
            >
              L&apos;INTIMITÉ ÉLEVÉE AU RANG D&apos;ART
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${BSH_PALETTE.border}`,
                borderRadius: 18,
                padding: "28px 22px",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔞</div>
              <div
                style={{
                  fontFamily: BSH_FONT_DISPLAY,
                  fontSize: 16,
                  color: BSH_PALETTE.cream,
                  marginBottom: 8,
                }}
              >
                Accès réservé aux adultes
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: BSH_PALETTE.muted,
                  marginBottom: 24,
                  lineHeight: 1.7,
                }}
              >
                Ce site contient du contenu réservé aux personnes majeures. En
                entrant, vous certifiez avoir 18 ans ou plus.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={confirmer}
                  style={{
                    background: BSH_PALETTE.gold,
                    border: "none",
                    borderRadius: 2,
                    padding: "12px 20px",
                    color: BSH_PALETTE.night,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    fontFamily: BSH_FONT_BODY,
                  }}
                >
                  ✓ J&apos;ai 18 ans ou plus — Entrer
                </button>
                <button
                  onClick={refuser}
                  style={{
                    background: "transparent",
                    border: `1px solid ${BSH_PALETTE.border}`,
                    borderRadius: 2,
                    padding: "10px 20px",
                    color: BSH_PALETTE.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: BSH_FONT_BODY,
                  }}
                >
                  ✕ Je n&apos;ai pas 18 ans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
