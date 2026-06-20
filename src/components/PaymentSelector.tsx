"use client";

// ══════════════════════════════════════════════════════════
// PAYMENT SELECTOR — Composant global Bellaïa
// Utilisé par tous les pôles : BSH, Events, Structure, Odyssée, Food, Vilo, MTP
// ══════════════════════════════════════════════════════════

import { useState } from "react";

export type ModePaiement =
  | "SumUp"
  | "Virement"
  | "PayPal"
  | "Revolut"
  | "Espèces"
  | "WhatsApp";

export interface PaymentSelectorProps {
  montant: number;
  description: string;
  univers?: string;
  commande_id?: string;
  client_id?: string;
  client_email?: string;
  onSuccess?: (result: { url?: string; reference: string; mode: ModePaiement }) => void;
  onError?: (err: string) => void;
  // Pour les paiements manuels (non-SumUp) — message WhatsApp à envoyer
  waMessage?: string;
  waNumber?: string;
  // Modes disponibles (défaut : tous)
  modesDisponibles?: ModePaiement[];
}

const MODES_CONFIG: { id: ModePaiement; ico: string; label: string; desc: string }[] = [
  { id: "SumUp",    ico: "💳", label: "Carte bancaire",  desc: "Paiement sécurisé en ligne" },
  { id: "Virement", ico: "🏦", label: "Virement",        desc: "RIB communiqué par WhatsApp" },
  { id: "PayPal",   ico: "🅿", label: "PayPal",          desc: "Lien envoyé par email" },
  { id: "Revolut",  ico: "🔵", label: "Revolut",         desc: "Lien envoyé manuellement" },
  { id: "Espèces",  ico: "💵", label: "Espèces",         desc: "Paiement à la remise" },
  { id: "WhatsApp", ico: "💬", label: "WhatsApp",        desc: "Confirmation via messagerie" },
];

// ── Service de paiement global
export async function createBellaiaPayment(params: {
  mode: ModePaiement;
  montant: number;
  description: string;
  univers?: string;
  commande_id?: string;
  client_id?: string;
  client_email?: string;
  waMessage?: string;
  waNumber?: string;
}): Promise<{ ok: boolean; url?: string; reference?: string; error?: string; openWA?: boolean }> {

  const { mode, montant, description, univers, commande_id, client_id, client_email, waMessage, waNumber } = params;

  // ── SumUp : jamais WhatsApp
  if (mode === "SumUp") {
    try {
      const r = await fetch("/api/payments/sumup/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant, description, univers: univers || "GENERAL", commande_id, client_id, client_email }),
      });
      const d = await r.json();
      if (d.url) {
        return { ok: true, url: d.url, reference: d.reference };
      }
      return { ok: false, error: d.error || "Erreur SumUp — veuillez réessayer." };
    } catch {
      return { ok: false, error: "Impossible de contacter SumUp. Vérifiez votre connexion." };
    }
  }

  // ── Modes manuels : optionnellement ouvrir WhatsApp
  const manuelMsg = waMessage ||
    `Bonjour, je souhaite régler ${montant}€ pour : ${description}.\nMode choisi : ${mode}.\nMerci de confirmer.`;

  if (mode === "WhatsApp" || mode === "Virement" || mode === "PayPal" || mode === "Revolut") {
    const num = waNumber || process.env.NEXT_PUBLIC_WA_NUMBER || "";
    if (num) {
      return { ok: true, reference: `MANUEL-${Date.now()}`, openWA: true, url: `https://wa.me/${num}?text=${encodeURIComponent(manuelMsg)}` };
    }
  }

  // Espèces ou fallback sans WA
  return { ok: true, reference: `ESPECES-${Date.now()}` };
}

// ── Composant React
export default function PaymentSelector({
  montant,
  description,
  univers = "GENERAL",
  commande_id,
  client_id,
  client_email,
  onSuccess,
  onError,
  waMessage,
  waNumber,
  modesDisponibles = ["SumUp", "Virement", "Espèces", "WhatsApp"],
}: PaymentSelectorProps) {
  const [mode, setMode] = useState<ModePaiement>(modesDisponibles[0]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const modes = MODES_CONFIG.filter(m => modesDisponibles.includes(m.id));

  const payer = async () => {
    if (montant <= 0) { setErreur("Montant invalide."); return; }
    setLoading(true);
    setErreur(null);

    const result = await createBellaiaPayment({
      mode, montant, description, univers,
      commande_id, client_id, client_email,
      waMessage, waNumber,
    });

    if (result.ok) {
      if (result.url && mode === "SumUp") {
        // Redirection directe SumUp — jamais WhatsApp
        window.location.href = result.url;
        return;
      }
      if (result.openWA && result.url) {
        window.open(result.url, "_blank");
      }
      onSuccess?.({ url: result.url, reference: result.reference!, mode });
    } else {
      setErreur(result.error || "Erreur paiement.");
      onError?.(result.error || "Erreur paiement.");
    }
    setLoading(false);
  };

  const modeActif = MODES_CONFIG.find(m => m.id === mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Sélection mode */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
          Mode de paiement
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setErreur(null); }}
              style={{
                padding: "7px 13px",
                borderRadius: 10,
                border: `2px solid ${mode === m.id ? "#c9a84c" : "rgba(255,255,255,0.12)"}`,
                background: mode === m.id ? "rgba(201,168,76,0.15)" : "transparent",
                color: mode === m.id ? "#c9a84c" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: mode === m.id ? 700 : 400,
                fontFamily: "Inter,system-ui,sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {m.ico} {m.label}
            </button>
          ))}
        </div>
        {modeActif && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
            {modeActif.desc}
          </div>
        )}
      </div>

      {/* Bouton paiement */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={payer}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: loading
              ? "rgba(255,255,255,0.1)"
              : mode === "SumUp"
                ? "linear-gradient(135deg,#00b4d8,#0077b6)"
                : mode === "WhatsApp"
                  ? "linear-gradient(135deg,#25d366,#128c7e)"
                  : "linear-gradient(135deg,#7c3aed,#9333ea)",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "Inter,system-ui,sans-serif",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading
            ? "⏳ Traitement…"
            : mode === "SumUp"
              ? `💳 Payer ${montant}€ par carte`
              : mode === "WhatsApp"
                ? "💬 Confirmer via WhatsApp"
                : mode === "Espèces"
                  ? "✅ Confirmer la commande"
                  : `✅ Procéder — ${mode}`}
        </button>

        {erreur && (
          <div style={{
            fontSize: 11, color: "#ef4444", textAlign: "center",
            padding: "8px 10px",
            background: "rgba(239,68,68,0.08)",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.2)",
          }}>
            {erreur}
          </div>
        )}

        {mode === "SumUp" && (
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
            🔒 Paiement sécurisé SumUp · Aucune donnée bancaire stockée par Bella'Studio
          </div>
        )}
      </div>

      {/* Montant récap */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 13px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Total à régler</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c", fontFamily: "Georgia,serif" }}>
          {montant.toFixed(2)}€
        </span>
      </div>
    </div>
  );
}
