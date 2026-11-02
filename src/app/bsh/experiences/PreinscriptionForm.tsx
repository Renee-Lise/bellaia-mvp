"use client";
// ═══════════════════════════════════════════════════════════
// Formulaire public de préinscription BSH Experiences
// src/app/bsh/experiences/PreinscriptionForm.tsx
//
// Gratuit, sans engagement, distinct d'une réservation confirmée —
// écrit directement dans bsh_preinscriptions (migration 0071) avec
// la clé anonyme ; la policy RLS exige majorite_declaree=true pour
// toute insertion (refusée côté base sinon, pas seulement côté UI).
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)",
  border: `1px solid ${C.borderM}`, borderRadius: 4, padding: "10px 12px",
  color: C.cream, fontSize: 13, fontFamily: BODY, outline: "none",
};
const label: React.CSSProperties = { fontSize: 11, color: C.muted, marginBottom: 5, display: "block" };

export default function PreinscriptionForm({ evenements }: { evenements: { id: string; nom: string }[] }) {
  const [form, setForm] = useState({
    pseudonyme: "", contact: "", majoriteDeclaree: false, villePreferee: "",
    typeEvenementSouhaite: "", disponibilites: "", consentementCommunications: false, evenementId: "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = async () => {
    setErreur(null);
    if (!form.pseudonyme.trim()) { setErreur("Un pseudonyme ou nom est nécessaire."); return; }
    if (!form.majoriteDeclaree) { setErreur("Vous devez déclarer être majeure(e) pour vous préinscrire."); return; }
    setEnvoi(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setErreur("Configuration manquante — réessayez plus tard."); setEnvoi(false); return; }
    try {
      const res = await fetch(`${url}/rest/v1/bsh_preinscriptions`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          pseudonyme: form.pseudonyme, contact: form.contact || null,
          majorite_declaree: form.majoriteDeclaree, ville_preferee: form.villePreferee || null,
          type_evenement_souhaite: form.typeEvenementSouhaite || null, disponibilites: form.disponibilites || null,
          consentement_communications: form.consentementCommunications, evenement_id: form.evenementId || null,
        }),
      });
      if (!res.ok) {
        const corps = await res.text().catch(() => "");
        setErreur("La préinscription n'a pas pu être enregistrée. " + (corps.slice(0, 150) || "Réessayez."));
        setEnvoi(false);
        return;
      }
      // Succès affiché uniquement après confirmation réelle de l'enregistrement.
      setSucces(true);
    } catch (e: any) {
      setErreur("La préinscription n'a pas pu être enregistrée. " + (e?.message || "Réessayez."));
    }
    setEnvoi(false);
  };

  if (succes) {
    return (
      <div style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
        <p style={{ fontFamily: DISPLAY, fontSize: 16, color: C.goldL, margin: "0 0 10px" }}>
          Votre demande de préinscription a été enregistrée.
        </p>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
          C&apos;est gratuit et sans engagement — ce n&apos;est pas encore une réservation confirmée. Nous revenons vers vous dès que la ville et la date sont fixées.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={label}>Pseudonyme ou nom *</label>
        <input style={inp} value={form.pseudonyme} onChange={(e) => setForm((f) => ({ ...f, pseudonyme: e.target.value }))} placeholder="Comme vous souhaitez être appelée" />
      </div>
      <div>
        <label style={label}>Coordonnée de contact (WhatsApp, e-mail…)</label>
        <input style={inp} value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
      </div>
      <div>
        <label style={label}>Ville préférée</label>
        <select style={{ ...inp, background: C.plumD }} value={form.villePreferee} onChange={(e) => setForm((f) => ({ ...f, villePreferee: e.target.value }))}>
          <option value="">— Choisir —</option>
          <option value="Saint-Laurent-du-Maroni">Saint-Laurent-du-Maroni</option>
          <option value="Kourou">Kourou</option>
          <option value="Cayenne">Cayenne</option>
        </select>
      </div>
      {evenements.length > 0 && (
        <div>
          <label style={label}>Événement souhaité (optionnel)</label>
          <select style={{ ...inp, background: C.plumD }} value={form.evenementId} onChange={(e) => setForm((f) => ({ ...f, evenementId: e.target.value }))}>
            <option value="">— Pas d&apos;événement précis —</option>
            {evenements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
      )}
      <div>
        <label style={label}>Type d&apos;expérience qui vous intéresse</label>
        <select style={{ ...inp, background: C.plumD }} value={form.typeEvenementSouhaite} onChange={(e) => setForm((f) => ({ ...f, typeEvenementSouhaite: e.target.value }))}>
          <option value="">— Choisir —</option>
          <option value="boudoir_session">BSH Boudoir Session</option>
          <option value="wolf_night">Wolf Night — Diamond B</option>
          <option value="secret_wolf_ball">The Secret Wolf Ball</option>
          <option value="private_experience">BSH Private Experience</option>
        </select>
      </div>
      <div>
        <label style={label}>Vos disponibilités</label>
        <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.disponibilites} onChange={(e) => setForm((f) => ({ ...f, disponibilites: e.target.value }))} placeholder="Soirs, week-ends, période précise…" />
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: C.cream, cursor: "pointer" }}>
        <input type="checkbox" checked={form.majoriteDeclaree} onChange={(e) => setForm((f) => ({ ...f, majoriteDeclaree: e.target.checked }))} style={{ marginTop: 2 }} />
        Je déclare être majeure(e).
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: C.muted, cursor: "pointer" }}>
        <input type="checkbox" checked={form.consentementCommunications} onChange={(e) => setForm((f) => ({ ...f, consentementCommunications: e.target.checked }))} style={{ marginTop: 2 }} />
        J&apos;accepte de recevoir des communications sur les prochaines expériences BSH (facultatif).
      </label>

      {erreur && <div style={{ fontSize: 12, color: "#f87171" }}>⚠️ {erreur}</div>}

      <button
        onClick={envoyer}
        disabled={envoi}
        style={{
          background: C.gold, border: "none", borderRadius: 2, padding: "12px 24px",
          color: C.night, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
          cursor: envoi ? "wait" : "pointer", fontFamily: BODY, opacity: envoi ? 0.6 : 1,
        }}
      >
        {envoi ? "Envoi…" : "Me préinscrire"}
      </button>
      <p style={{ fontSize: 10, color: "rgba(203,185,185,0.5)", margin: 0, lineHeight: 1.6 }}>
        Préinscription gratuite et sans engagement — ne vaut pas réservation confirmée.
      </p>
    </div>
  );
}
