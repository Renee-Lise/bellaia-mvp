"use client";
// ═══════════════════════════════════════════════════════════
// Achat de billet — src/app/bsh/experiences/AchatBilletForm.tsx
//
// Phase 1 billetterie (migration 0075). N'affiche ce formulaire que
// pour un événement publié, actif, avec un tarif réel (prix > 0) et
// au moins une place : géré par le parent (page.tsx), pas ici. Le
// paiement passe uniquement par SumUp (seul prestataire déjà vérifié
// en production) via /api/bsh-experiences/billets/create-checkout,
// qui recalcule le prix et vérifie la disponibilité côté serveur —
// ce formulaire n'envoie jamais de montant, seulement une quantité.
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { BSH_PALETTE as C, BSH_FONT_BODY as BODY } from "../bshTokens";

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)",
  border: `1px solid ${C.borderM}`, borderRadius: 4, padding: "9px 11px",
  color: C.cream, fontSize: 12, fontFamily: BODY, outline: "none",
};

export default function AchatBilletForm({ evenementId, prix, placesRestantes }: { evenementId: string; prix: number; placesRestantes: number }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const maxQte = Math.max(1, Math.min(placesRestantes, 6));

  const reserver = async () => {
    setErreur(null);
    if (!nom.trim()) { setErreur("Votre nom est nécessaire pour la réservation."); return; }
    setEnvoi(true);
    try {
      const r = await fetch("/api/bsh-experiences/billets/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evenementId, quantite, acheteurNom: nom.trim(), acheteurEmail: email || undefined }),
      });
      const d = await r.json();
      if (!r.ok || !d.url) { setErreur(d.error || "Impossible de créer la réservation."); setEnvoi(false); return; }
      window.location.href = d.url;
    } catch {
      setErreur("Impossible de contacter le serveur de paiement. Réessayez.");
      setEnvoi(false);
    }
  };

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        style={{ background: C.gold, border: "none", borderRadius: 2, padding: "8px 16px", color: C.night, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", cursor: "pointer", fontFamily: BODY, marginTop: 8 }}
      >
        Réserver ma place — {prix.toFixed(2)} €
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: "12px", background: "rgba(198,161,91,0.06)", border: `1px solid ${C.borderM}`, borderRadius: 4, display: "flex", flexDirection: "column", gap: 8 }}>
      <input style={inp} placeholder="Votre nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input style={inp} placeholder="E-mail (reçu de paiement, optionnel)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 11, color: C.muted }}>Nombre de places :</label>
        <select style={{ ...inp, width: "auto" }} value={quantite} onChange={(e) => setQuantite(parseInt(e.target.value, 10))}>
          {Array.from({ length: maxQte }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.goldL }}>Total : {(prix * quantite).toFixed(2)} €</div>
      {erreur && <div style={{ fontSize: 11, color: "#f87171" }}>⚠️ {erreur}</div>}
      <button
        onClick={reserver}
        disabled={envoi}
        style={{ background: C.gold, border: "none", borderRadius: 2, padding: "10px 16px", color: C.night, fontSize: 12, fontWeight: 600, cursor: envoi ? "wait" : "pointer", fontFamily: BODY, opacity: envoi ? 0.6 : 1 }}
      >
        {envoi ? "Redirection vers le paiement…" : "Payer par carte (SumUp)"}
      </button>
      <p style={{ fontSize: 10, color: "rgba(203,185,185,0.5)", margin: 0, lineHeight: 1.6 }}>
        Paiement sécurisé par carte via SumUp. Votre place est confirmée dès le paiement validé.
      </p>
    </div>
  );
}
