// ═══════════════════════════════════════════════════════════
// FoodAchats — Module Achats Bella'Food Partie III
// Création, édition, bon de commande, PDF, WhatsApp
// src/modules/food/FoodAchats.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC, FOOD_STOCK_INIT, FOOD_FOURNISSEURS_INIT } from "./foodConsts";
import { construireLigneAchat, calculerTotauxAchat, genBonCommandeHTML, fmtPrix } from "./foodUtils";
import type { Achat, LigneAchat, StatutAchat } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const STATUT_COL: Record<StatutAchat, string> = {
  brouillon:"rgba(201,168,76,0.2)", envoye:"rgba(59,130,246,0.2)",
  confirme:"rgba(21,128,61,0.2)", recu:"rgba(80,180,120,0.2)", annule:"rgba(248,113,113,0.15)",
};
const STATUT_TXT: Record<StatutAchat, string> = {
  brouillon:"#c9a96e", envoye:"#60a5fa", confirme:"#22c55e", recu:"#34d399", annule:"#f87171",
};

const TVALIST = [0, 5.5, 10, 20];

export default function FoodAchats() {
  const [achats,  setAchats]  = useState<Achat[]>([]);
  const [modal,   setModal]   = useState<"creer"|"detail"|null>(null);
  const [detail,  setDetail]  = useState<Achat|null>(null);
  const [filtre,  setFiltre]  = useState<StatutAchat|"tous">("tous");
  const [form,    setForm]    = useState({ fournisseurNom:"", date:new Date().toISOString().split("T")[0], facture:"", categorie:"", observations:"" });
  const [lignes,  setLignes]  = useState<LigneAchat[]>([]);
  const [nouvLigne, setNouvLigne] = useState({ produit:"", stockItemId:"", quantite:1, prixUnitaire:0, tva:5.5, unite:"kg" });

  const visibles = achats.filter(a => filtre === "tous" || a.statut === filtre);
  const { totalHT, totalTTC } = useMemo(() => calculerTotauxAchat(lignes), [lignes]);

  const ajouterLigne = () => {
    if (!nouvLigne.produit.trim() || nouvLigne.prixUnitaire <= 0) return;
    setLignes(ls => [...ls, construireLigneAchat(
      nouvLigne.produit, nouvLigne.quantite, nouvLigne.prixUnitaire,
      nouvLigne.tva, nouvLigne.unite, nouvLigne.stockItemId || undefined
    )]);
    setNouvLigne({ produit:"", stockItemId:"", quantite:1, prixUnitaire:0, tva:5.5, unite:"kg" });
  };

  const creerAchat = () => {
    if (!form.fournisseurNom.trim() || lignes.length === 0) return;
    const tots = calculerTotauxAchat(lignes);
    const a: Achat = {
      id: "ach_" + Date.now().toString().slice(-5),
      reference: "ACH-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
      fournisseurNom: form.fournisseurNom,
      date: form.date,
      facture: form.facture || undefined,
      categorie: form.categorie || undefined,
      observations: form.observations || undefined,
      lignes, statut:"brouillon", ...tots,
    };
    setAchats(as => [a, ...as]);
    setModal(null); setLignes([]); setForm({ fournisseurNom:"", date:new Date().toISOString().split("T")[0], facture:"", categorie:"", observations:"" });
    setDetail(a);
  };

  const changerStatut = (id: string, statut: StatutAchat) => {
    setAchats(as => as.map(a => a.id === id ? { ...a, statut } : a));
    if (detail?.id === id) setDetail(d => d ? { ...d, statut } : null);
  };

  const dupliquer = (a: Achat) => {
    const nv: Achat = {
      ...a,
      id: "ach_" + Date.now().toString().slice(-5),
      reference: "ACH-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
      date: new Date().toISOString().split("T")[0],
      statut: "brouillon",
    };
    setAchats(as => [nv, ...as]);
  };

  const imprimer = (a: Achat) => {
    const html = genBonCommandeHTML({ reference:a.reference, fournisseurNom:a.fournisseurNom, date:a.date, notes:a.observations, lignes:a.lignes });
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  const envoyerWA = (a: Achat) => {
    const frnr = FOOD_FOURNISSEURS_INIT.find(f => f.nom === a.fournisseurNom);
    const msg = [
      `Bonjour,\nVoici notre bon de commande ${a.reference} du ${new Date(a.date).toLocaleDateString("fr-FR")} :`,
      ...a.lignes.map(l => `• ${l.produit} — ${l.quantite} ${l.unite} @ ${l.prixUnitaire}€/u`),
      `\nTotal HT : ${fmtPrix(a.totalHT)}`,
      "Cordialement — Bella'Food",
    ].join("\n");
    const tel = (frnr?.tel || "").replace(/\D/g, "");
    window.open(`https://wa.me/${tel || ""}?text=${encodeURIComponent(msg)}`, "_blank");
    changerStatut(a.id, "envoye");
  };

  if (detail && modal !== "creer") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => setDetail(null)}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Retour</button>
        <button onClick={() => dupliquer(detail)}
          style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>⎘ Dupliquer</button>
      </div>
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:FC.creamD }}>{detail.reference}</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{detail.fournisseurNom}</div>
            <div style={{ fontSize:10, color:FC.creamD }}>{new Date(detail.date).toLocaleDateString("fr-FR")}</div>
          </div>
          <span style={{ fontSize:9, background:STATUT_COL[detail.statut], color:STATUT_TXT[detail.statut],
            borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>{detail.statut}</span>
        </div>
        {detail.lignes.map(l => (
          <div key={l.id} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize:12, color:"#fff" }}>{l.produit}</div>
              <div style={{ fontSize:10, color:FC.creamD }}>{l.quantite} {l.unite} × {l.prixUnitaire}€ HT (TVA {l.tva}%)</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700, color:FC.or }}>{fmtPrix(l.totalHT)} HT</div>
              <div style={{ fontSize:10, color:FC.creamD }}>{fmtPrix(l.totalTTC)} TTC</div>
            </div>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:8, borderTop:`1px solid ${FC.line}` }}>
          <span style={{ fontSize:12, color:FC.creamD }}>Total HT / TTC</span>
          <span style={{ fontSize:15, fontWeight:700, color:FC.or }}>
            {fmtPrix(detail.totalHT)} / {fmtPrix(detail.totalTTC)}
          </span>
        </div>
        {detail.observations && <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:8, fontStyle:"italic" }}>{detail.observations}</div>}
      </div>
      {/* Statuts */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {(["brouillon","envoye","confirme","recu","annule"] as StatutAchat[]).map(s => (
          <button key={s} onClick={() => changerStatut(detail.id, s)}
            style={{ fontSize:9, padding:"3px 9px", borderRadius:99, cursor:"pointer",
              border:`1px solid ${s===detail.statut?FC.vert:"rgba(255,255,255,0.1)"}`,
              background:s===detail.statut?"rgba(21,128,61,0.15)":"transparent",
              color:s===detail.statut?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>{s}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => imprimer(detail)}
          style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:10, padding:"9px", color:"rgba(255,255,255,0.7)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
          🖨 Imprimer
        </button>
        <button onClick={() => envoyerWA(detail)}
          style={{ flex:1, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
            borderRadius:10, padding:"9px", color:"#25d366", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          💬 Envoyer WA
        </button>
      </div>
    </div>
  );

  if (modal === "creer") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={() => { setModal(null); setLignes([]); }}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Annuler</button>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouvel achat</div>
      </div>
      {/* En-tête achat */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["Fournisseur *","fournisseurNom","text"],["Date","date","date"],
            ["N° facture","facture","text"],["Catégorie","categorie","text"]].map(([l,k,t]) => (
            <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
              <input type={t} value={(form as any)[k] || ""}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={inp} />
            </div>
          ))}
        </div>
        {/* Suggestions fournisseurs */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
          {FOOD_FOURNISSEURS_INIT.filter(f => f.actif).map(f => (
            <button key={f.id} onClick={() => setForm(fr => ({ ...fr, fournisseurNom: f.nom }))}
              style={{ fontSize:9, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                background:form.fournisseurNom===f.nom?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.05)",
                border:`1px solid ${form.fournisseurNom===f.nom?FC.vert:"rgba(255,255,255,0.1)"}`,
                color:form.fournisseurNom===f.nom?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>{f.nom}</button>
          ))}
        </div>
      </div>
      {/* Lignes */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:8 }}>LIGNES D'ACHAT</div>
        {lignes.map(l => (
          <div key={l.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
            borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize:12, color:"#fff" }}>{l.produit} — {l.quantite} {l.unite}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:FC.or }}>{fmtPrix(l.totalHT)} HT</span>
              <button onClick={() => setLignes(ls => ls.filter(x => x.id !== l.id))}
                style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:12 }}>✕</button>
            </div>
          </div>
        ))}
        {/* Ajouter ligne */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 0.8fr 1.2fr 0.8fr 0.8fr auto", gap:6, marginTop:8 }}>
          <input value={nouvLigne.produit} onChange={e => setNouvLigne(f => ({ ...f, produit: e.target.value }))}
            placeholder="Produit" style={inp} />
          <input type="number" value={nouvLigne.quantite} onChange={e => setNouvLigne(f => ({ ...f, quantite: parseFloat(e.target.value)||1 }))}
            style={inp} placeholder="Qté" />
          <input type="number" value={nouvLigne.prixUnitaire || ""} onChange={e => setNouvLigne(f => ({ ...f, prixUnitaire: parseFloat(e.target.value)||0 }))}
            style={inp} placeholder="P.U. €" />
          <input value={nouvLigne.unite} onChange={e => setNouvLigne(f => ({ ...f, unite: e.target.value }))}
            style={inp} placeholder="U" />
          <select value={nouvLigne.tva} onChange={e => setNouvLigne(f => ({ ...f, tva: parseFloat(e.target.value) }))}
            style={{ ...inp, background:"#1a1a2e" }}>
            {TVALIST.map(t => <option key={t} value={t}>{t}%</option>)}
          </select>
          <button onClick={ajouterLigne}
            style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 12px",
              color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+</button>
        </div>
        {totalHT > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10,
            paddingTop:8, borderTop:`1px solid ${FC.line}` }}>
            <span style={{ fontSize:12, color:FC.creamD }}>Total HT / TTC</span>
            <span style={{ fontSize:15, fontWeight:700, color:FC.or }}>{fmtPrix(totalHT)} / {fmtPrix(totalTTC)}</span>
          </div>
        )}
      </div>
      <button onClick={creerAchat}
        style={{ background:FC.vert, border:"none", borderRadius:10, padding:"11px",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
        ✅ Créer l'achat
      </button>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{visibles.length} achat{visibles.length>1?"s":""}</div>
        <button onClick={() => setModal("creer")}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouvel achat
        </button>
      </div>
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {(["tous","brouillon","envoye","confirme","recu","annule"] as const).map(s => (
          <button key={s} onClick={() => setFiltre(s as any)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtre===s?(s==="tous"?FC.vert:STATUT_COL[s as StatutAchat]):"rgba(255,255,255,0.04)",
              color:filtre===s?(s==="tous"?"#fff":STATUT_TXT[s as StatutAchat]):"rgba(255,255,255,0.4)" }}>
            {s}
          </button>
        ))}
      </div>
      {achats.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucun achat enregistré. Créez le premier achat.
        </div>
      )}
      {visibles.map(a => (
        <div key={a.id} onClick={() => setDetail(a)}
          style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{a.fournisseurNom}</div>
              <div style={{ fontSize:10, color:FC.creamD }}>{a.reference} · {new Date(a.date).toLocaleDateString("fr-FR")}</div>
            </div>
            <span style={{ fontSize:9, background:STATUT_COL[a.statut], color:STATUT_TXT[a.statut],
              borderRadius:4, padding:"2px 7px", fontWeight:700 }}>{a.statut}</span>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:FC.or }}>{fmtPrix(a.totalHT)} HT</div>
        </div>
      ))}
    </div>
  );
}
