// ═══════════════════════════════════════════════════════════
// BellaWorkflowF — Workflow commercial unifié LOT VI
// Factures FAC- / Paiements PAY- / Livraisons LIV-
// Tous modules : Food, Events, BSH, Odyssée…
// src/modules/core/BellaWorkflowF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";
import { BELLAÏA_COLORS as FC, SA, FS } from "./coreDesign";
import { getFactures, enregistrerPaiement } from "./coreApi";
import type { Facture, StatutFacture, BusinessUnit, ModePaiement } from "./coreTypes";

const BU_LIST: (BusinessUnit | "tous")[] = ["tous","FOOD","EVENTS","BSH","ODYSSEE","GENERAL"];

const STATUT_COL: Record<StatutFacture, string> = {
  brouillon:            "rgba(255,255,255,0.08)",
  emise:                "rgba(201,168,76,0.18)",
  envoyee:              "rgba(59,130,246,0.18)",
  partiellement_payee:  "rgba(251,146,60,0.18)",
  payee:                "rgba(21,128,61,0.2)",
  annulee:              "rgba(248,113,113,0.15)",
};
const STATUT_TXT: Record<StatutFacture, string> = {
  brouillon:"rgba(255,255,255,0.4)", emise:"#c9a96e", envoyee:"#60a5fa",
  partiellement_payee:"#fb923c", payee:"#22c55e", annulee:"#f87171",
};

const MODES_PAY: { id: ModePaiement; label: string }[] = [
  {id:"especes",  label:"Espèces"},
  {id:"virement", label:"Virement"},
  {id:"sumup",    label:"SumUp"},
  {id:"paypal",   label:"PayPal"},
  {id:"cheque",   label:"Chèque"},
];

const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

export default function BellaWorkflowF({ user }: { user?: any }) {
  const [factures,   setFactures]   = useState<Facture[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filtreBU,   setFiltreBU]   = useState<BusinessUnit|"tous">("tous");
  const [filtreStatut, setFiltreStatut] = useState<StatutFacture|"tous">("tous");
  const [detail,     setDetail]     = useState<Facture|null>(null);
  const [modalPay,   setModalPay]   = useState(false);
  const [formPay,    setFormPay]    = useState<{ montant:number; mode:ModePaiement; notes:string }>({
    montant:0, mode:"especes", notes:"",
  });
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getFactures(filtreBU === "tous" ? undefined : filtreBU)
      .then(rows => { setFactures(rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filtreBU]);

  const visibles = useMemo(() =>
    factures.filter(f => filtreStatut === "tous" || f.statut === filtreStatut),
  [factures, filtreStatut]);

  const totalCA   = visibles.filter(f => f.statut === "payee").reduce((s,f) => s + f.totalTTC, 0);
  const totalEnAttente = visibles.filter(f => ["emise","envoyee","partiellement_payee"].includes(f.statut))
    .reduce((s,f) => s + f.solde, 0);

  const enregistrerPay = async () => {
    if (!detail || formPay.montant <= 0) return;
    setPayLoading(true);
    try {
      await enregistrerPaiement({
        factureId:  detail.id,
        bu:         detail.businessUnit,
        montant:    formPay.montant,
        mode:       formPay.mode,
        notes:      formPay.notes || undefined,
      });
      // Mettre à jour localement
      setFactures(fs => fs.map(f => f.id !== detail.id ? f : {
        ...f,
        acomptePaye: true,
        statut: formPay.montant >= f.totalTTC ? "payee" : "partiellement_payee",
      }));
      setDetail(d => d ? { ...d, acomptePaye:true,
        statut: formPay.montant >= d.totalTTC ? "payee" : "partiellement_payee" } : null);
      setModalPay(false);
      setFormPay({ montant:0, mode:"especes", notes:"" });
    } finally { setPayLoading(false); }
  };

  const imprimerFacture = (f: Facture) => {
    const lignesHtml = (f.lignes || []).map(l =>
      `<tr><td>${l.libelle}</td><td style='text-align:center'>${l.qte}</td>` +
      `<td style='text-align:right'>${l.prixUnitaire.toFixed(2)}€</td>` +
      `<td style='text-align:right;font-weight:700'>${l.total.toFixed(2)}€</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Facture ${f.reference}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;font-size:13px}
h1{color:#15803d;font-family:Georgia,serif;border-bottom:2px solid #15803d;padding-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
.block{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px}
.block label{font-size:9px;color:#6b7280;display:block;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin:12px 0}
thead th{background:#15803d;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
tbody td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
.total{text-align:right;font-weight:700;font-size:16px;color:#15803d;margin-top:8px}
.statut{display:inline-block;padding:3px 10px;border-radius:4px;font-weight:700;font-size:11px;
  background:${f.statut==="payee"?"#dcfce7":"#fef9c3"};color:${f.statut==="payee"?"#166534":"#854d0e"}}
@media print{body{padding:0}}</style></head><body>
<h1>🍃 Facture Bellaïa</h1>
<div class='grid'>
  <div class='block'><label>Référence</label><strong>${f.reference}</strong></div>
  <div class='block'><label>Date</label>${new Date(f.dateEmission).toLocaleDateString("fr-FR")}</div>
  <div class='block'><label>Module</label>${f.businessUnit}</div>
  <div class='block'><label>Statut</label><span class='statut'>${f.statut.replace("_"," ")}</span></div>
</div>
<div class='block' style='margin-bottom:12px'>
  <label>Client</label><strong>${f.clientNom}</strong><br>
  ${f.clientTel ? "Tél : "+f.clientTel+"<br>" : ""}${f.clientEmail || ""}
</div>
<table><thead><tr><th>Désignation</th><th style='text-align:center'>Qté</th>
  <th style='text-align:right'>P.U.</th><th style='text-align:right'>Total</th></tr></thead>
<tbody>${lignesHtml}</tbody></table>
<div class='total'>Total TTC : ${f.totalTTC.toFixed(2)}€</div>
${f.acompte > 0 ? `<p style='font-size:12px;color:#6b7280'>Acompte (${Math.round(f.acompte/f.totalTTC*100)}%) : ${f.acompte.toFixed(2)}€ — Solde : ${f.solde.toFixed(2)}€</p>` : ""}
${f.notes ? `<p style='font-size:11px;color:#6b7280;margin-top:10px'>Notes : ${f.notes}</p>` : ""}
<div style='margin-top:24px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px'>
Document généré par Bellaïa — Sinnamary, Guyane</div>
</body></html>`;
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Vue détail facture ─────────────────────────────────
  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => setDetail(null)}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.muted, cursor:"pointer", fontSize:11, fontFamily:SA }}>
          ‹ Retour
        </button>
        <button onClick={() => imprimerFacture(detail)}
          style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${FC.line}`,
            borderRadius:8, padding:"4px 12px", color:FC.muted, cursor:"pointer", fontSize:11, fontFamily:SA }}>
          🖨 Imprimer
        </button>
      </div>

      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:FC.muted, fontFamily:SA }}>Référence</div>
            <div style={{ fontFamily:FS, fontSize:16, color:FC.or }}>{detail.reference}</div>
            <div style={{ fontSize:12, color:FC.creamD }}>{detail.clientNom}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <span style={{ fontSize:9, background:STATUT_COL[detail.statut],
              color:STATUT_TXT[detail.statut], borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
              {detail.statut.replace("_"," ")}
            </span>
            <div style={{ fontSize:11, color:FC.muted, marginTop:4 }}>{detail.businessUnit}</div>
          </div>
        </div>

        {(detail.lignes||[]).map((l,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between",
            padding:"6px 0", borderBottom:`1px solid ${FC.line}` }}>
            <div>
              <div style={{ fontSize:12, color:"#fff" }}>{l.libelle}</div>
              <div style={{ fontSize:10, color:FC.muted }}>{l.qte} × {l.prixUnitaire.toFixed(2)}€</div>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:FC.or }}>{l.total.toFixed(2)}€</span>
          </div>
        ))}

        <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${FC.line}` }}>
          {[
            ["Total TTC",   detail.totalTTC.toFixed(2)+"€",  FC.or,   true],
            ["Acompte ("+Math.round(detail.acompte/Math.max(detail.totalTTC,1)*100)+"%)",
              detail.acompte.toFixed(2)+"€", "#c9a96e", false],
            ["Solde restant", detail.solde.toFixed(2)+"€",   FC.muted, false],
          ].map(([l,v,col,big]) => (
            <div key={l as string} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:11, color:FC.muted }}>{l}</span>
              <span style={{ fontSize:(big as boolean)?16:12, fontWeight:(big as boolean)?700:500,
                color:col as string }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton paiement */}
      {detail.statut !== "payee" && detail.statut !== "annulee" && (
        <button onClick={() => { setFormPay({ montant:detail.solde, mode:"especes", notes:"" }); setModalPay(true); }}
          style={{ width:"100%", background:"rgba(21,128,61,0.2)", border:`1px solid ${FC.vert}`,
            borderRadius:10, padding:"11px", color:FC.vertL, fontWeight:700,
            fontSize:13, cursor:"pointer", fontFamily:SA }}>
          💳 Enregistrer un paiement
        </button>
      )}

      {detail.statut === "payee" && (
        <div style={{ background:"rgba(21,128,61,0.12)", border:`1px solid ${FC.vert}`,
          borderRadius:10, padding:"10px 14px", fontSize:12, color:FC.vertL, textAlign:"center" }}>
          ✅ Facture entièrement réglée
        </div>
      )}

      {/* Modal paiement */}
      {modalPay && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:380, width:"100%" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>
              Enregistrer un paiement
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.muted }}>Montant (€) *</label>
                <input type="number" min={0} step={0.01} value={formPay.montant}
                  onChange={e => setFormPay(f => ({ ...f, montant:parseFloat(e.target.value)||0 }))}
                  style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.muted }}>Mode de paiement</label>
                <select value={formPay.mode}
                  onChange={e => setFormPay(f => ({ ...f, mode:e.target.value as ModePaiement }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {MODES_PAY.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.muted }}>Notes (optionnel)</label>
                <input value={formPay.notes}
                  onChange={e => setFormPay(f => ({ ...f, notes:e.target.value }))}
                  placeholder="Référence virement, reçu..." style={inp}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={enregistrerPay} disabled={payLoading}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA,
                    opacity:payLoading?0.6:1 }}>
                  {payLoading ? "…" : "✅ Valider"}
                </button>
                <button onClick={() => setModalPay(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:FC.muted,
                    fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Vue liste ──────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ background:"rgba(21,128,61,0.1)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"12px", textAlign:"center" }}>
          <div style={{ fontFamily:FS, fontSize:18, fontWeight:700, color:FC.or }}>
            {totalCA.toFixed(2)}€
          </div>
          <div style={{ fontSize:9, color:FC.muted, marginTop:2 }}>CA encaissé</div>
        </div>
        <div style={{ background:"rgba(251,146,60,0.1)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"12px", textAlign:"center" }}>
          <div style={{ fontFamily:FS, fontSize:18, fontWeight:700, color:"#fb923c" }}>
            {totalEnAttente.toFixed(2)}€
          </div>
          <div style={{ fontSize:9, color:FC.muted, marginTop:2 }}>En attente</div>
        </div>
      </div>

      {/* Filtres BU */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {BU_LIST.map(bu => (
          <button key={bu} onClick={() => setFiltreBU(bu as any)}
            style={{ padding:"4px 9px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtreBU===bu ? FC.vert : "rgba(255,255,255,0.06)",
              color:filtreBU===bu ? "#fff" : FC.muted }}>
            {bu}
          </button>
        ))}
      </div>

      {/* Filtres statut */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {(["tous","emise","partiellement_payee","payee","annulee"] as const).map(s => (
          <button key={s} onClick={() => setFiltreStatut(s as any)}
            style={{ padding:"3px 8px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:filtreStatut===s
                ? (s==="tous" ? FC.vert : STATUT_COL[s as StatutFacture])
                : "rgba(255,255,255,0.04)",
              color:filtreStatut===s
                ? (s==="tous" ? "#fff" : STATUT_TXT[s as StatutFacture])
                : FC.muted }}>
            {s.replace(/_/g," ")}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.muted, fontSize:12 }}>
          Chargement des factures…
        </div>
      )}

      {!loading && factures.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.muted,
          fontSize:12, fontStyle:"italic", lineHeight:1.6 }}>
          Aucune facture dans la base.{"\n"}
          Les factures sont créées automatiquement lors de la conversion d'un devis en commande.
        </div>
      )}

      {!loading && visibles.map(f => (
        <div key={f.id} onClick={() => setDetail(f)}
          style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:9, color:FC.muted, marginBottom:1 }}>{f.reference}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{f.clientNom}</div>
              <div style={{ fontSize:10, color:FC.muted }}>
                {f.businessUnit} · {new Date(f.dateEmission).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:700, color:FC.or }}>{f.totalTTC.toFixed(2)}€</div>
              <span style={{ fontSize:9, background:STATUT_COL[f.statut], color:STATUT_TXT[f.statut],
                borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                {f.statut.replace(/_/g," ")}
              </span>
            </div>
          </div>
          {f.statut !== "payee" && f.solde > 0 && (
            <div style={{ fontSize:10, color:"#fb923c" }}>Solde restant : {f.solde.toFixed(2)}€</div>
          )}
        </div>
      ))}
    </div>
  );
}
