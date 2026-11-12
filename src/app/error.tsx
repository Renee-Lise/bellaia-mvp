"use client";

// ═══════════════════════════════════════════════════════════
// error.tsx — remplace l'écran générique "Application error: a
// client-side exception has occurred" (inutilisable pour diagnostiquer
// à distance) par le vrai message d'erreur, visible directement sur
// l'écran de la personne qui le rencontre, pour qu'elle puisse en
// faire une capture d'écran exploitable.
// ═══════════════════════════════════════════════════════════

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0d0b12",
        color: "#f4f0e8",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#c9a84c", marginBottom: 10 }}>
        Une erreur est survenue
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,240,232,0.7)",
          maxWidth: 420,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 20,
          wordBreak: "break-word",
          textAlign: "left",
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <strong>Message :</strong> {error?.message || "(aucun message)"}
        </div>
        {error?.digest && (
          <div>
            <strong>Référence :</strong> {error.digest}
          </div>
        )}
      </div>
      <button
        onClick={() => reset()}
        style={{
          background: "rgba(201,168,76,0.15)",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 10,
          padding: "10px 20px",
          color: "#c9a84c",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
