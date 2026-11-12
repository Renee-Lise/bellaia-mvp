'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const BellaiaApp = dynamic(
  () => import("./BellaiaApp"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0d0b12",
        color: "#c9a84c",
        fontFamily: "Georgia, serif",
        fontSize: 28,
      }}>
        ◎
      </div>
    ),
  }
);

// ═══════════════════════════════════════════════════════════
// Capture directe des erreurs non catchées (event handler, promesse
// non gérée) — error.tsx/global-error.tsx ne couvrent que les erreurs
// de rendu React ; l'écran générique "Application error: a
// client-side exception has occurred" que Next.js affiche à la place
// vient justement d'une erreur de CE type (sinon error.tsx l'aurait
// affichée). Ce composant écoute les mêmes évènements navigateur que
// Next.js, mais affiche le message réel au lieu de le masquer.
// ═══════════════════════════════════════════════════════════
export default function ClientWrapper() {
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const surErreur = (e: ErrorEvent) => {
      setErreur(
        (e.error?.stack || e.message || "Erreur inconnue") +
        "\n\n(fichier: " + (e.filename || "?") + ":" + (e.lineno || "?") + ")"
      );
    };
    const surRejet = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      setErreur(
        "Promesse rejetée : " + (r?.stack || r?.message || String(r))
      );
    };
    window.addEventListener("error", surErreur);
    window.addEventListener("unhandledrejection", surRejet);
    return () => {
      window.removeEventListener("error", surErreur);
      window.removeEventListener("unhandledrejection", surRejet);
    };
  }, []);

  if (erreur) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 24,
        background: "#0d0b12", color: "#f4f0e8",
        fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#c9a84c", marginBottom: 10 }}>
          Erreur capturée
        </div>
        <pre style={{
          fontSize: 11, color: "rgba(244,240,232,0.8)", maxWidth: 480,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 20,
          whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left", lineHeight: 1.6,
        }}>{erreur}</pre>
        <button onClick={() => { setErreur(null); window.location.reload(); }} style={{
          background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 10, padding: "10px 20px", color: "#c9a84c", fontWeight: 700,
          cursor: "pointer", fontSize: 13,
        }}>Recharger</button>
      </div>
    );
  }

  return <BellaiaApp />;
}
