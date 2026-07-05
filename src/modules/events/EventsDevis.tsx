// ═══════════════════════════════════════════════════════════
// EVENTS DEVIS — Éditeur complet + Génération + PDF (window.print)
// src/modules/events/EventsDevis.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from "react";
import type {
  EventsDemande, LigneDevis, LigneDevisEditee, DevisGenere,
} from "./eventsTypes";

// ── Couleurs partagées (dupliquées ici pour autonomie du module)
const C = {
  or:     "#10b981",
  orL:    "#34d399",
  cream:  "#e8f5ee",
  creamD: "#a8d5be",
  line:   "rgba(16,185,129,0.25)",
  card:   "rgba(255,255,255,0.04)",
  danger: "#f87171",
  warn:   "#c9a96e",
  violet: "#7c3aed",
  muted:  "rgba(255,255,255,0.45)",
  mutedL: "rgba(255,255,255,0.25)",
  surface:"rgba(255,255,255,0.06)",
  night:  "#0a1410",
};
const FS = "Georgia, 'Times New Roman', serif";
const SA = "system-ui, sans-serif";

// ── Convertir LigneDevis → LigneDevisEditee ────────────────
function toLigneEditee(l: LigneDevis): LigneDevisEditee {
  return {
    id: l.id,
    libelle: l.libelle,
    categorie: l.categorie || "",
    unite: l.unite || "prestation",
    qte: l.qte || 1,
    prixUnitaire: l.prixUnitaire,
    remise: 0,
    remiseType: "€",
    supplement: 0,
    tva: 0,
    acompte: 30,
    commentaire: l.note || "",
    statut: l.statut,
    source: l.source,
  };
}

// ── Calcul total d'une ligne ───────────────────────────────
function calcTotal(l: LigneDevisEditee): number | null {
  if (!l.prixUnitaire) return null;
  const base   = l.prixUnitaire * l.qte;
  const remise = l.remiseType === "%" ? base * l.remise / 100 : l.remise;
  return Math.max(0, base - remise + l.supplement);
}

// ── Date + 30 jours ────────────────────────────────────────
function dateValidite() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// ── Formater date FR ───────────────────────────────────────
function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ══════════════════════════════════════════════════════════
// COMPOSANT : Éditeur de lignes de devis
// ══════════════════════════════════════════════════════════
interface EditorProps {
  demande: EventsDemande;
  lignesInitiales: LigneDevisEditee[];
  onValider: (lignes: LigneDevisEditee[]) => void;
  onAnnuler: () => void;
}

export function EditeurLignesDevis({ demande, lignesInitiales, onValider, onAnnuler }: EditorProps) {
  const [lignes, setLignes] = useState<LigneDevisEditee[]>(lignesInitiales);
  const [nouvLigne, setNouvLigne] = useState<Partial<LigneDevisEditee>>({
    libelle: "", categorie: "", unite: "prestation", qte: 1,
    prixUnitaire: null, remise: 0, remiseType: "€" as const,
    supplement: 0, tva: 0, acompte: 30, commentaire: "", statut: "automatique", source: "Manuel",
  });

  const totalGeneral = useMemo(() =>
    lignes.reduce((s, l) => s + (calcTotal(l) || 0), 0),
  [lignes]);

  const majLigne = useCallback((i: number, champ: keyof LigneDevisEditee, val: any) => {
    setLignes(ls => ls.map((l, idx) => idx !== i ? l : { ...l, [champ]: val }));
  }, []);

  const ajouterLigne = () => {
    if (!nouvLigne.libelle?.trim()) return;
    const id = "lg_" + Date.now().toString().slice(-6);
    setLignes(ls => [...ls, {
      id, libelle: nouvLigne.libelle!, categorie: nouvLigne.categorie || "",
      unite: nouvLigne.unite || "prestation", qte: Number(nouvLigne.qte) || 1,
      prixUnitaire: nouvLigne.prixUnitaire ? Number(nouvLigne.prixUnitaire) : null,
      remise: Number(nouvLigne.remise) || 0, remiseType: nouvLigne.remiseType || "€",
      supplement: Number(nouvLigne.supplement) || 0, tva: 0, acompte: 30,
      commentaire: nouvLigne.commentaire || "", statut: "automatique", source: "Manuel",
    }]);
    setNouvLigne({ libelle:"", categorie:"", unite:"prestation", qte:1,
      prixUnitaire:null, remise:0, remiseType:"€", supplement:0, acompte:30,
      commentaire:"", statut:"automatique", source:"Manuel" });
  };

  const supprimerLigne = (i: number) =>
    setLignes(ls => ls.filter((_, idx) => idx !== i));

  const monterLigne = (i: number) => {
    if (i === 0) return;
    setLignes(ls => { const n = [...ls]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
  };
  const descendreLigne = (i: number) => {
    setLignes(ls => { if (i >= ls.length-1) return ls; const n = [...ls]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; });
  };

  const inpStyle = {
    background: C.surface, border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 7, padding: "6px 9px", color: "#fff", fontSize: 12,
    fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Résumé demande */}
      <div style={{ background:"rgba(16,185,129,0.07)", border:`1px solid ${C.line}`,
        borderRadius:12, padding:"10px 13px", fontSize:11, color: C.creamD }}>
        <strong style={{ color:"#fff" }}>{demande.client_prenom} {demande.client_nom}</strong>
        {" · "}{demande.prestation || "Prestation"}
        {demande.date_souhaitee ? " · " + fmtDate(demande.date_souhaitee) : ""}
      </div>

      {/* Lignes */}
      <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
        {lignes.map((l, i) => {
          const tot = calcTotal(l);
          const incomplete = !l.prixUnitaire;
          return (
            <div key={l.id} style={{
              background: incomplete ? "rgba(201,168,76,0.07)" : C.card,
              border: `1px solid ${incomplete ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius:10, padding:"10px 12px",
            }}>
              {/* Ligne principale */}
              <div style={{ display:"flex", gap:6, marginBottom:6, alignItems:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <button onClick={() => monterLigne(i)}
                    style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:10, padding:0 }}>▲</button>
                  <button onClick={() => descendreLigne(i)}
                    style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:10, padding:0 }}>▼</button>
                </div>
                <input value={l.libelle}
                  onChange={e => majLigne(i, "libelle", e.target.value)}
                  style={{ ...inpStyle, flex:2 }}
                  placeholder="Libellé de la ligne" />
                <input value={l.unite}
                  onChange={e => majLigne(i, "unite", e.target.value)}
                  style={{ ...inpStyle, flex:0.8 }}
                  placeholder="Unité" />
                <button onClick={() => supprimerLigne(i)}
                  style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:6,
                    padding:"4px 8px", color:C.danger, cursor:"pointer", fontSize:13, flexShrink:0 }}>
                  ✕
                </button>
              </div>
              {/* Quantités & prix */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 1fr", gap:6 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <label style={{ fontSize:8, color:C.mutedL }}>Qté</label>
                  <input type="number" min={0} step={0.5} value={l.qte}
                    onChange={e => majLigne(i, "qte", parseFloat(e.target.value) || 1)}
                    style={inpStyle} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <label style={{ fontSize:8, color:incomplete ? C.warn : C.mutedL }}>
                    {incomplete ? "⚠ Prix à compléter" : "Prix unitaire (€)"}
                  </label>
                  <input type="number" min={0} step={0.5}
                    value={l.prixUnitaire ?? ""}
                    placeholder="À compléter"
                    onChange={e => majLigne(i, "prixUnitaire", e.target.value ? parseFloat(e.target.value) : null)}
                    style={{ ...inpStyle, borderColor: incomplete ? "rgba(201,168,76,0.4)" : undefined }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <label style={{ fontSize:8, color:C.mutedL }}>Remise</label>
                  <div style={{ display:"flex", gap:3 }}>
                    <input type="number" min={0} step={0.5} value={l.remise}
                      onChange={e => majLigne(i, "remise", parseFloat(e.target.value) || 0)}
                      style={{ ...inpStyle, flex:1 }} />
                    <select value={l.remiseType}
                      onChange={e => majLigne(i, "remiseType", e.target.value)}
                      style={{ ...inpStyle, flex:0, width:40, padding:"6px 4px" }}>
                      <option value="€">€</option>
                      <option value="%">%</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <label style={{ fontSize:8, color:C.mutedL }}>Total</label>
                  <div style={{ ...inpStyle, background:"transparent",
                    fontWeight:700, color: tot ? C.or : C.warn, display:"flex", alignItems:"center" }}>
                    {tot != null ? tot.toFixed(2) + "€" : "—"}
                  </div>
                </div>
              </div>
              {/* Commentaire */}
              <input value={l.commentaire}
                onChange={e => majLigne(i, "commentaire", e.target.value)}
                placeholder="Commentaire (optionnel)"
                style={{ ...inpStyle, marginTop:6, fontSize:11, color:C.creamD }} />
            </div>
          );
        })}
      </div>

      {/* Ajouter une ligne */}
      <div style={{ background:C.card, border:`1px dashed rgba(255,255,255,0.15)`,
        borderRadius:10, padding:"10px 12px" }}>
        <div style={{ fontSize:10, color:C.muted, marginBottom:6, fontWeight:700 }}>+ AJOUTER UNE LIGNE</div>
        <div style={{ display:"flex", gap:6, marginBottom:6 }}>
          <input value={nouvLigne.libelle || ""}
            onChange={e => setNouvLigne(f => ({ ...f, libelle: e.target.value }))}
            placeholder="Libellé *"
            style={{ ...inpStyle, flex:2 }} />
          <input value={nouvLigne.unite || "prestation"}
            onChange={e => setNouvLigne(f => ({ ...f, unite: e.target.value }))}
            placeholder="Unité"
            style={{ ...inpStyle, flex:0.8 }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", gap:6 }}>
          <input type="number" min={0} step={0.5}
            value={nouvLigne.qte || 1}
            onChange={e => setNouvLigne(f => ({ ...f, qte: parseFloat(e.target.value) || 1 }))}
            placeholder="Qté" style={inpStyle} />
          <input type="number" min={0} step={0.5}
            value={nouvLigne.prixUnitaire ?? ""}
            onChange={e => setNouvLigne(f => ({ ...f, prixUnitaire: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Prix (€)" style={inpStyle} />
          <button onClick={ajouterLigne}
            style={{ background:C.or, border:"none", borderRadius:8, padding:"6px 12px",
              color:"#062b1d", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
            Ajouter
          </button>
        </div>
      </div>

      {/* Total général */}
      <div style={{ background:"rgba(16,185,129,0.08)", border:`1px solid ${C.line}`,
        borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between",
        alignItems:"center" }}>
        <span style={{ fontSize:13, color:C.creamD }}>Total estimé</span>
        <span style={{ fontSize:20, fontWeight:700, color:C.or, fontFamily:FS }}>
          {totalGeneral.toFixed(2)}€
        </span>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onValider(lignes)}
          style={{ flex:1, background:C.or, border:"none", borderRadius:10,
            padding:"12px", color:"#062b1d", fontWeight:700, fontSize:13,
            cursor:"pointer", fontFamily:SA }}>
          ✅ Valider les lignes
        </button>
        <button onClick={onAnnuler}
          style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
            padding:"12px", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:SA }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT : Modale complète de génération du devis
// ══════════════════════════════════════════════════════════
interface ModalProps {
  demande: EventsDemande;
  onClose: () => void;
  onValide: (numDevis: string) => void;
}

export function ModalGenerationDevis({ demande, onClose, onValide }: ModalProps) {
  const [etape, setEtape] = useState<"edit"|"preview"|"envoye">("edit");
  const [lignes, setLignes] = useState<LigneDevisEditee[]>(() => {
    try {
      const raw = typeof demande.lignes_devis === "string"
        ? JSON.parse(demande.lignes_devis) : demande.lignes_devis;
      if (Array.isArray(raw) && raw.length) return raw.map((l: any) => ({
        ...l, remise:l.remise||0, remiseType:l.remiseType||"€",
        supplement:l.supplement||0, tva:0, acompte:30, commentaire:l.commentaire||"",
      }));
    } catch {}
    return [];
  });

  const [numDevis]   = useState<string>(demande.numero_devis || "DEV-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-4));
  const [acomptePct, setAcomptePct] = useState(30);
  const [conditions,  setConditions]  = useState(
    "Devis valable 30 jours. Acompte de " + acomptePct + "% à la confirmation. " +
    "Prestation garantie après réception de l'acompte. " +
    "Annulation moins de 7 jours : acompte conservé."
  );
  const [envoi, setEnvoi] = useState(false);

  const totalHT = useMemo(() =>
    lignes.reduce((s, l) => s + (calcTotal(l) || 0), 0),
  [lignes]);
  const acompte = Math.round(totalHT * acomptePct / 100 * 100) / 100;
  const solde   = Math.round((totalHT - acompte) * 100) / 100;

  const openPrint = () => {
    const html = buildDevisHTML({ demande, numDevis, lignes, totalHT, acompte, solde, acomptePct, conditions });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const envoyerWhatsApp = () => {
    const msg = [
      "Bonjour " + (demande.client_prenom || "") + ",",
      "",
      "Votre devis Bella'Events est prêt.",
      "Référence demande : " + (demande.reference || demande.id),
      "Numéro devis : " + numDevis,
      "Montant total : " + totalHT.toFixed(2) + "€",
      "Acompte (" + acomptePct + "%) : " + acompte.toFixed(2) + "€",
      "",
      "Pour consulter votre devis, saisissez votre référence sur le portail Bellaïa.",
      "",
      "Bella'Events ✨",
    ].join("\n");
    const tel = (demande.client_tel || "").replace(/\D/g, "");
    const url = "https://wa.me/" + (tel || "") + "?text=" + encodeURIComponent(msg);
    window.open(url, "_blank");
    setEtape("envoye");
  };

  const validerEtContinuer = async () => {
    setEnvoi(true);
    try {
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      // Récupérer le token stocké (avec refresh si nécessaire)
      let token = SB_KEY;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("bellaia_token");
        const expiry = localStorage.getItem("bellaia_expiry");
        const estExpire = expiry ? Date.now()/1000 > parseInt(expiry,10) : false;
        if (stored && !estExpire) token = stored;
      }

      const headers = {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      };

      const totalHT_ = lignes.reduce((s, l) => s + (calcTotal(l) || 0), 0);
      const acompteM  = Math.round(totalHT_ * acomptePct / 100 * 100) / 100;
      const soldeM    = Math.round((totalHT_ - acompteM) * 100) / 100;

      // ── Étape 1 : patch events_demandes (cache JSONB rapide) ──
      const patchPayload = {
        statut:           "devis_envoye",
        numero_devis:     numDevis,
        lignes_devis:     JSON.stringify(lignes),
        montant_estime:   totalHT_,
        montant_acompte:  acompteM,
        montant_solde:    soldeM,
        devis_genere_at:  new Date().toISOString(),
        statut_paiement:  "non_paye",
      };

      console.log("[Devis] PATCH events_demandes payload:", JSON.stringify(patchPayload, null, 2));

      const rPatch = await fetch(
        SB_URL + "/rest/v1/events_demandes?id=eq." + demande.id,
        { method:"PATCH", headers, body:JSON.stringify(patchPayload) }
      );

      let errPatch: any = null;
      try { errPatch = await rPatch.json(); } catch {}

      console.log("[Devis] PATCH status:", rPatch.status, errPatch);

      if (!rPatch.ok) {
        const sb = Array.isArray(errPatch) ? errPatch[0] : errPatch;
        const msg = [
          "Erreur HTTP " + rPatch.status,
          sb?.message ? "Message : " + sb.message : null,
          sb?.details ? "Détails : " + sb.details : null,
          sb?.hint    ? "Hint : " + sb.hint       : null,
          sb?.code    ? "Code : " + sb.code        : null,
        ].filter(Boolean).join("
");
        alert("Échec sauvegarde devis :

" + msg + "

Consultez la console pour le détail complet.");
        setEnvoi(false);
        return;
      }

      // ── Étape 2 : créer la ligne dans events_devis (optionnel si table existe) ──
      const rDevis = await fetch(SB_URL + "/rest/v1/events_devis", {
        method:"POST", headers,
        body: JSON.stringify({
          reference:        numDevis,
          demande_id:       demande.id,
          demande_reference:demande.reference,
          statut:           "valide",
          client_prenom:    demande.client_prenom,
          client_nom:       demande.client_nom,
          client_tel:       demande.client_tel,
          client_email:     demande.client_email,
          evenement:        demande.prestation || demande.type_evenement,
          date_souhaitee:   demande.date_souhaitee || null,
          nb_invites:       demande.nb_invites ? parseInt(String(demande.nb_invites)) : null,
          acompte_pct:      acomptePct,
          total_ht:         totalHT_,
          montant_acompte:  acompteM,
          montant_solde:    soldeM,
          conditions:       conditions,
        }),
      });

      if (!rDevis.ok) {
        const errDevis = await rDevis.json().catch(() => null);
        console.warn("[Devis] Table events_devis non disponible (status", rDevis.status, ") — sauvegarde JSONB seule utilisée:", errDevis);
        // Non bloquant : le JSONB suffit si events_devis n'existe pas encore
      }

      onValide(numDevis);
      setEtape("preview");
    } catch (e) {
      console.error("[Devis] Erreur réseau:", e);
      alert("Erreur réseau lors de la sauvegarde. Vérifiez votre connexion et réessayez.");
    }
    setEnvoi(false);
  };

  if (etape === "edit") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
        Modifier les lignes du devis
      </div>
      <EditeurLignesDevis
        demande={demande}
        lignesInitiales={lignes}
        onValider={ls => { setLignes(ls); setEtape("preview"); }}
        onAnnuler={onClose}
      />
    </div>
  );

  if (etape === "preview") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:16, color:C.or }}>Devis {numDevis}</div>
          <div style={{ fontSize:11, color:C.creamD }}>
            {demande.client_prenom} {demande.client_nom} · {fmtDate(new Date().toISOString())}
          </div>
        </div>
        <span style={{ fontSize:9,
          background: envoi ? "rgba(255,255,255,0.08)" : "rgba(16,185,129,0.15)",
          color: envoi ? C.muted : C.or,
          borderRadius:4, padding:"3px 10px", fontWeight:700 }}>
          {envoi ? "ENREGISTREMENT…" : "PRÊT À ENVOYER"}
        </span>
      </div>

      {/* Lignes */}
      <div style={{ background:C.card, border:`1px solid rgba(255,255,255,0.08)`,
        borderRadius:12, overflow:"hidden" }}>
        {lignes.filter(l => l.statut !== "suggestion").map((l, i) => {
          const tot = calcTotal(l);
          return (
            <div key={l.id} style={{
              display:"flex", justifyContent:"space-between", padding:"9px 13px",
              borderBottom: i < lignes.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:"#fff", fontWeight:500 }}>{l.libelle}</div>
                {l.qte > 1 && <div style={{ fontSize:10, color:C.muted }}>× {l.qte} {l.unite}</div>}
                {l.commentaire && <div style={{ fontSize:10, color:C.muted, fontStyle:"italic" }}>{l.commentaire}</div>}
              </div>
              <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color: tot ? C.or : C.warn }}>
                  {tot != null ? tot.toFixed(2) + "€" : "À compléter"}
                </div>
                {l.prixUnitaire && l.qte > 1 &&
                  <div style={{ fontSize:9, color:C.muted }}>{l.prixUnitaire}€ / {l.unite}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totaux */}
      <div style={{ background:"rgba(16,185,129,0.07)", border:`1px solid ${C.line}`,
        borderRadius:12, padding:"13px 14px" }}>
        {[
          ["Sous-total HT",       totalHT.toFixed(2) + "€",  "#fff"],
          ["Acompte (" + acomptePct + "%)", acompte.toFixed(2) + "€",  C.warn],
          ["Solde restant",        solde.toFixed(2) + "€",    C.muted],
        ].map(([l, v, col]) => (
          <div key={l as string} style={{ display:"flex", justifyContent:"space-between",
            padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:12, color:C.muted }}>{l}</span>
            <span style={{ fontSize:13, fontWeight:700, color: col as string }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.creamD }}>TOTAL</span>
          <span style={{ fontSize:18, fontWeight:700, color:C.or, fontFamily:FS }}>
            {totalHT.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <label style={{ fontSize:10, color:C.muted, display:"block", marginBottom:4 }}>
          Conditions générales
        </label>
        <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={3}
          style={{ width:"100%", background:C.surface, border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:8, padding:"8px 10px", color:C.creamD, fontSize:11,
            fontFamily:SA, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
      </div>

      {/* Date validité + acompte */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <label style={{ fontSize:10, color:C.muted, display:"block", marginBottom:4 }}>
            Validité du devis
          </label>
          <div style={{ fontSize:12, color:"#fff", padding:"9px 10px",
            background:C.surface, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)" }}>
            {fmtDate(dateValidite())}
          </div>
        </div>
        <div>
          <label style={{ fontSize:10, color:C.muted, display:"block", marginBottom:4 }}>
            Acompte %
          </label>
          <input type="number" min={0} max={100} step={5} value={acomptePct}
            onChange={e => setAcomptePct(Number(e.target.value) || 30)}
            style={{ width:"100%", background:C.surface,
              border:"1px solid rgba(255,255,255,0.12)", borderRadius:8,
              padding:"8px 10px", color:"#fff", fontSize:12,
              fontFamily:SA, outline:"none", boxSizing:"border-box" as const }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <button onClick={validerEtContinuer} disabled={envoi}
          style={{ background:C.or, border:"none", borderRadius:10, padding:"12px",
            color:"#062b1d", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
          {envoi ? "Enregistrement…" : "✅ Valider le devis"}
        </button>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={openPrint}
            style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
              borderRadius:10, padding:"10px", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:SA }}>
            🖨 Aperçu / Imprimer
          </button>
          <button onClick={() => setEtape("edit")}
            style={{ flex:1, background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:10, padding:"10px", color:C.muted, fontSize:12, cursor:"pointer", fontFamily:SA }}>
            ✏ Modifier
          </button>
        </div>
        <button onClick={envoyerWhatsApp}
          style={{ background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
            borderRadius:10, padding:"11px", color:"#25d366", fontWeight:700,
            fontSize:13, cursor:"pointer", fontFamily:SA }}>
          💬 Envoyer par WhatsApp
        </button>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px dashed rgba(255,255,255,0.12)",
          borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:C.muted }}>
            📧 Envoi e-mail — non configuré
          </div>
          <div style={{ fontSize:10, color:C.mutedL, marginTop:2 }}>
            Configurez SMTP dans les variables Vercel pour activer l'envoi automatique.
          </div>
        </div>
      </div>
    </div>
  );

  // Étape "envoye"
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center", textAlign:"center", padding:"20px 0" }}>
      <div style={{ fontSize:40 }}>✅</div>
      <div style={{ fontFamily:FS, fontSize:18, color:C.or }}>Devis envoyé !</div>
      <div style={{ fontSize:12, color:C.creamD }}>
        Le client a reçu le lien WhatsApp avec les détails du devis {numDevis}.
      </div>
      <button onClick={onClose}
        style={{ background:C.or, border:"none", borderRadius:10, padding:"12px 24px",
          color:"#062b1d", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
        Fermer
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT : Vue devis côté client (portail suivi)
// ══════════════════════════════════════════════════════════
interface DevisClientProps {
  dossier: EventsDemande;
  onAccepte: () => Promise<void>;
  onRefuse:  () => Promise<void>;
  onDemandeModif: (msg: string) => Promise<void>;
}

export function DevisClientView({ dossier, onAccepte, onRefuse, onDemandeModif }: DevisClientProps) {
  const lignes: LigneDevisEditee[] = useMemo(() => {
    try {
      const raw = typeof dossier.lignes_devis === "string"
        ? JSON.parse(dossier.lignes_devis) : dossier.lignes_devis;
      return Array.isArray(raw) ? raw.filter((l: any) => l.statut !== "suggestion") : [];
    } catch { return []; }
  }, [dossier.lignes_devis]);

  const total   = dossier.montant_estime || 0;
  const acompte = dossier.montant_acompte || Math.round(total * 0.3);
  const solde   = dossier.montant_solde || (total - acompte);

  const accepte = dossier.client_reponse === "accepte" || dossier.statut === "accepte";
  const refuse  = dossier.client_reponse === "refuse"  || dossier.statut === "refuse";

  const [etape,     setEtape]     = useState<null|"conf_acc"|"conf_ref"|"modif">(null);
  const [msgModif,  setMsgModif]  = useState("");
  const [loading,   setLoading]   = useState(false);

  const doAction = async (fn: () => Promise<void>) => {
    setLoading(true); await fn(); setLoading(false);
  };

  const openPrint = () => {
    const html = buildDevisHTML({
      demande: dossier, numDevis: dossier.numero_devis || "",
      lignes, totalHT: total, acompte, solde, acomptePct: 30,
      conditions: "Devis valable 30 jours. Acompte requis à la confirmation.",
    });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div style={{ background:"rgba(16,185,129,0.05)", border:`1px solid rgba(16,185,129,0.25)`,
      borderRadius:14, padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ fontSize:11, color:C.creamD, fontWeight:700, letterSpacing:1 }}>
          VOTRE DEVIS
        </div>
        <div style={{ fontSize:10, color:C.creamD }}>{dossier.numero_devis || ""}</div>
      </div>

      {/* Lignes */}
      {lignes.length > 0 && (
        <div style={{ marginBottom:12 }}>
          {lignes.map((l, i) => {
            const tot = calcTotal(l);
            return (
              <div key={l.id} style={{ display:"flex", justifyContent:"space-between",
                padding:"6px 0", borderBottom:"1px solid rgba(16,185,129,0.1)" }}>
                <div>
                  <div style={{ fontSize:12, color:"#fff" }}>{l.libelle}</div>
                  {l.qte > 1 && <div style={{ fontSize:10, color:C.muted }}>× {l.qte}</div>}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color: tot ? C.or : C.warn }}>
                  {tot != null ? tot.toFixed(2) + "€" : "À confirmer"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Totaux */}
      {total > 0 && (
        <div style={{ background:"rgba(16,185,129,0.08)", borderRadius:10,
          padding:"10px 12px", marginBottom:12 }}>
          {[["Total", total.toFixed(2) + "€", C.or],
            ["Acompte (30%)", acompte.toFixed(2) + "€", C.warn],
            ["Solde restant", solde.toFixed(2) + "€", C.muted],
          ].map(([l, v, col]) => (
            <div key={l as string} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:11, color:C.creamD }}>{l}</span>
              <span style={{ fontSize: l === "Total" ? 15 : 12,
                fontWeight: l === "Total" ? 700 : 600,
                color: col as string }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bouton imprimer */}
      <button onClick={openPrint}
        style={{ width:"100%", background:"rgba(255,255,255,0.05)",
          border:"1px dashed rgba(255,255,255,0.2)", borderRadius:10, padding:"9px",
          color:"rgba(255,255,255,0.5)", fontSize:12, fontFamily:SA, cursor:"pointer",
          marginBottom:8 }}>
        🖨 Télécharger / Imprimer le devis
      </button>

      {/* Réponse client */}
      {!accepte && !refuse && !etape && (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setEtape("conf_acc")}
            style={{ flex:1, background:"rgba(16,185,129,0.15)", border:"1px solid #10b981",
              borderRadius:10, padding:"10px", color:"#10b981", fontWeight:700,
              fontSize:12, cursor:"pointer", fontFamily:SA }}>
            ✅ Accepter
          </button>
          <button onClick={() => setEtape("conf_ref")}
            style={{ flex:1, background:"rgba(248,113,113,0.1)",
              border:"1px solid rgba(248,113,113,0.35)", borderRadius:10, padding:"10px",
              color:C.danger, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
            ✕ Refuser
          </button>
        </div>
      )}

      {etape === "conf_acc" && (
        <div style={{ background:"rgba(16,185,129,0.1)", border:`1px solid #10b981`,
          borderRadius:10, padding:12 }}>
          <div style={{ fontSize:12, color:"#fff", marginBottom:8 }}>
            Confirmez-vous l'acceptation de ce devis ?
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => doAction(async () => { await onAccepte(); setEtape(null); })}
              disabled={loading}
              style={{ flex:1, background:"#10b981", border:"none", borderRadius:8,
                padding:"9px", color:"#062b1d", fontWeight:700, fontSize:12,
                cursor:"pointer", fontFamily:SA }}>
              {loading ? "…" : "✅ Oui, j'accepte"}
            </button>
            <button onClick={() => setEtape(null)}
              style={{ flex:1, background:"transparent", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:8, padding:"9px", color:C.muted, fontSize:12,
                cursor:"pointer", fontFamily:SA }}>
              Retour
            </button>
          </div>
        </div>
      )}

      {etape === "conf_ref" && (
        <div style={{ background:"rgba(248,113,113,0.08)",
          border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:12 }}>
          <div style={{ fontSize:12, color:"#fff", marginBottom:8 }}>
            Souhaitez-vous plutôt demander une modification ?
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={() => setEtape("modif")}
              style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.4)",
                borderRadius:8, padding:"9px", color:"#a78bfa", fontWeight:700,
                fontSize:12, cursor:"pointer", fontFamily:SA }}>
              ✏ Demander une modification
            </button>
            <button onClick={() => doAction(async () => { await onRefuse(); setEtape(null); })}
              disabled={loading}
              style={{ background:C.danger, border:"none", borderRadius:8, padding:"9px",
                color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
              {loading ? "…" : "✕ Confirmer le refus"}
            </button>
            <button onClick={() => setEtape(null)}
              style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:8, padding:"9px", color:C.muted, fontSize:12,
                cursor:"pointer", fontFamily:SA }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {etape === "modif" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:12, color:"#fff" }}>
            Décrivez la modification souhaitée :
          </div>
          <textarea value={msgModif} onChange={e => setMsgModif(e.target.value)}
            placeholder="Ex : Changer la couleur, ajouter une option, modifier le nombre d'invités…"
            rows={3}
            style={{ background:C.surface, border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
              fontFamily:SA, outline:"none", resize:"vertical",
              width:"100%", boxSizing:"border-box" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={() => doAction(async () => { await onDemandeModif(msgModif); setEtape(null); setMsgModif(""); })}
              disabled={!msgModif.trim() || loading}
              style={{ flex:1, background:"rgba(124,58,237,0.2)", border:"none",
                borderRadius:8, padding:"9px", color:"#a78bfa", fontWeight:700,
                fontSize:12, cursor:"pointer", fontFamily:SA }}>
              {loading ? "…" : "Envoyer ma demande"}
            </button>
            <button onClick={() => setEtape(null)}
              style={{ flex:1, background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:8, padding:"9px", color:C.muted, fontSize:12,
                cursor:"pointer", fontFamily:SA }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {accepte && (
        <div style={{ textAlign:"center", padding:10, fontSize:13, color:"#10b981", fontWeight:700 }}>
          ✅ Devis accepté — merci !
        </div>
      )}
      {refuse && !etape && (
        <div style={{ textAlign:"center", padding:10, fontSize:12, color:C.danger }}>
          Devis refusé. N'hésitez pas à nous contacter pour ajuster votre projet.
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// HELPER : Génération du HTML pour window.print()
// ══════════════════════════════════════════════════════════
interface BuildDevisParams {
  demande: EventsDemande;
  numDevis: string;
  lignes: LigneDevisEditee[];
  totalHT: number;
  acompte: number;
  solde: number;
  acomptePct: number;
  conditions: string;
}

export function buildDevisHTML(p: BuildDevisParams): string {
  const { demande, numDevis, lignes, totalHT, acompte, solde, acomptePct, conditions } = p;
  const lignesHTML = lignes
    .filter(l => l.statut !== "suggestion")
    .map(l => {
      const tot = calcTotal(l);
      return [
        "<tr>",
        "<td>" + escHtml(l.libelle) + (l.commentaire ? "<br><small style='color:#666'>" + escHtml(l.commentaire) + "</small>" : "") + "</td>",
        "<td style='text-align:center'>" + l.qte + " " + escHtml(l.unite) + "</td>",
        "<td style='text-align:right'>" + (l.prixUnitaire != null ? l.prixUnitaire.toFixed(2) + "€" : "—") + "</td>",
        "<td style='text-align:right;font-weight:700'>" + (tot != null ? tot.toFixed(2) + "€" : "À compléter") + "</td>",
        "</tr>",
      ].join("");
    }).join("\n");

  const dateValid = dateValidite();

  return [
    "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>",
    "<title>Devis " + escHtml(numDevis) + "</title>",
    "<style>",
    "body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:20px;color:#1a1a1a;font-size:13px}",
    "h1{font-family:Georgia,serif;color:#065f46;font-size:22px;margin:0 0 4px}",
    ".subtitle{color:#6b7280;font-size:11px;margin-bottom:20px}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}",
    ".block{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}",
    ".block label{font-size:10px;color:#9ca3af;display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em}",
    ".block span{font-size:13px;color:#111;font-weight:500}",
    "table{width:100%;border-collapse:collapse;margin-bottom:16px}",
    "thead th{background:#065f46;color:#fff;padding:8px 10px;text-align:left;font-size:11px}",
    "tbody td{padding:7px 10px;border-bottom:1px solid #f3f4f6}",
    "tbody tr:nth-child(even){background:#f9fafb}",
    ".totals{max-width:300px;margin-left:auto}",
    ".totals table td{padding:5px 8px;font-size:12px}",
    ".total-final td{font-size:15px;font-weight:700;color:#065f46;border-top:2px solid #065f46}",
    ".conditions{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:11px;color:#6b7280;margin-top:20px}",
    ".footer{margin-top:30px;text-align:center;font-size:10px;color:#9ca3af}",
    "@media print{body{padding:0}button{display:none}}",
    "</style></head><body>",
    "<h1>✨ Bella'Events</h1>",
    "<div class='subtitle'>Sinnamary, Guyane française · bellaïa</div>",
    "<hr style='border:none;border-top:2px solid #065f46;margin-bottom:20px'>",
    "<div class='grid'>",
    "<div class='block'><label>Numéro de devis</label><span>" + escHtml(numDevis) + "</span></div>",
    "<div class='block'><label>Date</label><span>" + fmtDate(new Date().toISOString()) + "</span></div>",
    "<div class='block'><label>Validité</label><span>Jusqu'au " + fmtDate(dateValid) + "</span></div>",
    "<div class='block'><label>Réf. demande</label><span>" + escHtml(demande.reference || demande.id) + "</span></div>",
    "</div>",
    "<div class='block' style='margin-bottom:20px'>",
    "<label>Client</label>",
    "<span>" + escHtml((demande.client_prenom || "") + " " + (demande.client_nom || "")) + "</span><br>",
    (demande.client_tel ? "<span style='color:#6b7280'>" + escHtml(demande.client_tel) + "</span><br>" : ""),
    (demande.client_email ? "<span style='color:#6b7280'>" + escHtml(demande.client_email) + "</span>" : ""),
    "</div>",
    "<div class='block' style='margin-bottom:20px'>",
    "<label>Événement</label>",
    "<span>" + escHtml(demande.prestation || demande.type_evenement || "—") + "</span>",
    (demande.date_souhaitee ? " &nbsp;·&nbsp; <span style='color:#6b7280'>" + fmtDate(demande.date_souhaitee) + "</span>" : ""),
    (demande.nb_invites ? " &nbsp;·&nbsp; <span style='color:#6b7280'>" + demande.nb_invites + " invités</span>" : ""),
    "</div>",
    "<table>",
    "<thead><tr><th>Désignation</th><th style='text-align:center'>Qté</th><th style='text-align:right'>P.U.</th><th style='text-align:right'>Total</th></tr></thead>",
    "<tbody>" + lignesHTML + "</tbody>",
    "</table>",
    "<div class='totals'><table>",
    "<tr><td>Sous-total HT</td><td style='text-align:right;font-weight:600'>" + totalHT.toFixed(2) + "€</td></tr>",
    "<tr><td>Acompte (" + acomptePct + "%)</td><td style='text-align:right;color:#92400e'>" + acompte.toFixed(2) + "€</td></tr>",
    "<tr><td>Solde restant</td><td style='text-align:right;color:#6b7280'>" + solde.toFixed(2) + "€</td></tr>",
    "<tr class='total-final'><td>TOTAL</td><td style='text-align:right'>" + totalHT.toFixed(2) + "€</td></tr>",
    "</table></div>",
    "<div class='conditions'><strong>Conditions :</strong> " + escHtml(conditions) + "</div>",
    "<div style='margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:40px'>",
    "<div><p style='font-size:11px;color:#6b7280'>Signature client :</p><div style='border-top:1px solid #d1d5db;margin-top:40px'></div></div>",
    "<div><p style='font-size:11px;color:#6b7280'>Cachet Bella'Events :</p><div style='border-top:1px solid #d1d5db;margin-top:40px'></div></div>",
    "</div>",
    "<div class='footer'>Document généré par Bellaïa · Bella'Events</div>",
    "</body></html>",
  ].join("");
}

function escHtml(s: any): string {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
