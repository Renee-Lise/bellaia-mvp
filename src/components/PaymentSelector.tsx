"use client";

// ═══════════════════════════════════════════════════════════
// PAYMENT SELECTOR — Bellaïa Hub
// Modes : SumUp (carte) · PayPal (en ligne) · Espèces · Lien de paiement
// Revolut : RETIRÉ (aucune API disponible)
// Secrets : jamais côté client — tout passe par les routes API
// ═══════════════════════════════════════════════════════════

import { useState } from "react";

export type ModePaiement = "SumUp" | "PayPal" | "Especes" | "Lien_paiement" | "Virement";

export interface PaymentSelectorProps {
  montant:          number;
  description:      string;
  univers?:         string;
  commande_id?:     string;
  client_id?:       string;
  client_email?:    string;
  onSuccess?:       (result: { url?: string; reference: string; mode: ModePaiement; paiement_id?: string }) => void;
  onError?:         (err: string) => void;
  modesDisponibles?: ModePaiement[];
  waNumber?:        string;
}

// ── Modes disponibles selon les variables d'environnement
const MODES_CONFIG: {
  id: ModePaiement; ico: string; label: string; desc: string; couleur: string;
}[] = [
  { id: "SumUp",         ico: "💳", label: "Carte bancaire",    desc: "Paiement sécurisé par carte — SumUp",     couleur: "#00b4d8" },
  { id: "PayPal",        ico: "🅿",  label: "PayPal",           desc: "Redirection vers PayPal sécurisé",        couleur: "#0070ba" },
  { id: "Especes",       ico: "💵", label: "Espèces",           desc: "Paiement physique — validation requise",  couleur: "#c9a84c" },
  { id: "Lien_paiement", ico: "🔗", label: "Lien de paiement", desc: "Lien envoyé au client — suivi automatique", couleur: "#7c3aed" },
  { id: "Virement",      ico: "🏦", label: "Virement",          desc: "RIB communiqué par WhatsApp/email",       couleur: "#4ade80" },
];

// ── Service de paiement — toute la logique passe par les routes API serveur
export async function createBellaiaPayment(params: {
  mode:           ModePaiement;
  montant:        number;
  description:    string;
  univers?:       string;
  commande_id?:   string;
  client_id?:     string;
  client_email?:  string;
  waNumber?:      string;
}): Promise<{ ok: boolean; url?: string; reference?: string; paiement_id?: string; error?: string; openWA?: boolean; statut?: string }> {

  const { mode, montant, description, univers, commande_id, client_id, client_email, waNumber } = params;

  // ── SumUp : route serveur existante
  if (mode === "SumUp") {
    try {
      const r = await fetch("/api/payments/sumup/create-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ montant, description, univers: univers || "GENERAL", commande_id, client_id, client_email }),
      });
      const d = await r.json();
      if (!r.ok) return { ok: false, error: d.error || `Erreur SumUp (${r.status})` };
      if (d.url) return { ok: true, url: d.url, reference: d.reference, paiement_id: d.paiement_id };
      return { ok: false, error: d.error || "SumUp n'a pas retourné d'URL." };
    } catch {
      return { ok: false, error: "Impossible de contacter SumUp. Vérifiez votre connexion." };
    }
  }

  // ── PayPal : route serveur — PAYPAL_CLIENT_SECRET jamais côté client
  if (mode === "PayPal") {
    if (process.env.NEXT_PUBLIC_PAYPAL_ENABLED !== "true") {
      return { ok: false, error: "PayPal non activé. Configurer NEXT_PUBLIC_PAYPAL_ENABLED=true dans Vercel." };
    }
    try {
      const r = await fetch("/api/payments/paypal/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ montant, description, univers: univers || "GENERAL", commande_id, client_id, client_email }),
      });
      const d = await r.json();
      if (!r.ok) return { ok: false, error: d.error || `Erreur PayPal (${r.status})` };
      if (d.url) return { ok: true, url: d.url, reference: d.reference, paiement_id: d.paiement_id };
      return { ok: false, error: d.error || "PayPal n'a pas retourné d'URL d'approbation." };
    } catch {
      return { ok: false, error: "Impossible de contacter PayPal. Vérifiez votre connexion." };
    }
  }

  // ── Espèces : retour immédiat — statut "a_verifier"
  if (mode === "Especes") {
    const ref = `ESP-${Date.now()}`;
    return { ok: true, reference: ref, statut: "a_verifier" };
  }

  // ── Lien de paiement : à implémenter selon le provider
  if (mode === "Lien_paiement") {
    const ref = `LNK-${Date.now()}`;
    return { ok: true, reference: ref, statut: "envoyé" };
  }

  // ── Virement : ouverture WhatsApp optionnelle
  if (mode === "Virement") {
    const ref = `VIR-${Date.now()}`;
    const num = waNumber || process.env.NEXT_PUBLIC_WA_NUMBER || "";
    if (num) {
      const msg = `Bonjour, je règle ${montant.toFixed(2)}€ pour : ${description}.\nMode : Virement.\nMerci de m'envoyer le RIB.`;
      return { ok: true, reference: ref, openWA: true, url: `https://wa.me/${num}?text=${encodeURIComponent(msg)}` };
    }
    return { ok: true, reference: ref };
  }

  return { ok: false, error: "Mode de paiement non reconnu." };
}

// ── Composant UI
export default function PaymentSelector({
  montant,
  description,
  univers = "GENERAL",
  commande_id,
  client_id,
  client_email,
  onSuccess,
  onError,
  modesDisponibles = ["SumUp", "PayPal", "Especes", "Virement"],
  waNumber,
}: PaymentSelectorProps) {
  const [mode, setMode]       = useState<ModePaiement>(modesDisponibles[0]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);

  const modes    = MODES_CONFIG.filter(m => modesDisponibles.includes(m.id));
  const modeActif = MODES_CONFIG.find(m => m.id === mode);

  const payer = async () => {
    if (montant <= 0) { setErreur("Montant invalide."); return; }
    setLoading(true);
    setErreur(null);

    const result = await createBellaiaPayment({ mode, montant, description, univers, commande_id, client_id, client_email, waNumber });

    if (result.ok) {
      // SumUp / PayPal → redirection directe
      if (result.url && (mode === "SumUp" || mode === "PayPal")) {
        window.location.href = result.url;
        return;
      }
      // Virement → ouvrir WhatsApp sans quitter
      if (result.openWA && result.url) {
        window.open(result.url, "_blank");
      }
      onSuccess?.({ url: result.url, reference: result.reference!, mode, paiement_id: result.paiement_id });
    } else {
      setErreur(result.error || "Erreur paiement.");
      onError?.(result.error || "Erreur paiement.");
    }
    setLoading(false);
  };

  const couleurMode = modeActif?.couleur || "#7c3aed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Sélection mode */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
          Mode de paiement
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setErreur(null); }}
              style={{ padding: "7px 13px", borderRadius: 10, border: `2px solid ${mode === m.id ? m.couleur : "rgba(255,255,255,0.12)"}`, background: mode === m.id ? `${m.couleur}18` : "transparent", color: mode === m.id ? m.couleur : "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: mode === m.id ? 700 : 400, fontFamily: "Inter,system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
              {m.ico} {m.label}
            </button>
          ))}
        </div>
        {modeActif && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{modeActif.desc}</div>}
      </div>

      {/* Info espèces */}
      {mode === "Especes" && (
        <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c9a84c", marginBottom: 2 }}>⏳ Paiement espèces</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Cette opération sera enregistrée en statut <em>à vérifier</em> et devra être validée manuellement dans la pré-comptabilité.</div>
        </div>
      )}

      {/* Info virement */}
      {mode === "Virement" && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", marginBottom: 2 }}>🏦 Virement bancaire</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Le RIB sera communiqué par WhatsApp. La commande sera validée à réception du virement.</div>
        </div>
      )}

      {/* Bouton */}
      <button onClick={payer} disabled={loading}
        style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: loading ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg,${couleurMode},${couleurMode}cc)`, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "Inter,system-ui,sans-serif", opacity: loading ? 0.6 : 1 }}>
        {loading ? "⏳ Traitement…"
         : mode === "SumUp"         ? `💳 Payer ${montant.toFixed(2)}€ par carte`
         : mode === "PayPal"        ? `🅿 Payer ${montant.toFixed(2)}€ via PayPal`
         : mode === "Especes"       ? "✅ Confirmer — paiement espèces"
         : mode === "Lien_paiement" ? "🔗 Générer le lien de paiement"
         : `✅ Procéder — ${mode}`}
      </button>

      {erreur && (
        <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center", padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
          {erreur}
        </div>
      )}

      {/* Sécurité */}
      {(mode === "SumUp" || mode === "PayPal") && (
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          🔒 Paiement sécurisé {mode} · Aucune donnée bancaire stockée par Bella'Studio
        </div>
      )}

      {/* Récap montant */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Total à régler</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c", fontFamily: "Georgia,serif" }}>{montant.toFixed(2)}€</span>
      </div>
    </div>
  );
}
