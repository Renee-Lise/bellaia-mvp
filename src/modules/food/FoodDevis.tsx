// ═══════════════════════════════════════════════════════════
// FoodDevis — Module Devis Bella'Food Partie II
// Lignes structurées, PDF HTML, statuts, conversion commande
// src/modules/food/FoodDevis.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_CATALOGUE, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix, calculerTotauxDevis } from "./foodUtils";
import type { DevisFood, LigneDevisFood, StatutDevisFood } from "./foodTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";

const STATUT_COL: Record<StatutDevisFood, string> = {
  brouillon:"rgba(201,168,76,0.15)", envoye:"rgba(59,130,246,0.15)",
  accepte:"rgba(21,128,61,0.2)", refuse:"rgba(248,113,113,0.12)",
  expire:"rgba(255,255,255,0.06)", commande:"rgba(124,58,237,0.15)",
};
const STATUT_TXT: Record<StatutDevisFood, string> = {
  brouillon:"#c9a96e", envoye:"#60a5fa", accepte:"#22c55e",
  refuse:"#f87171", expire:"rgba(255,255,255,0.3)", commande:"#a78bfa",
};

const inpStyle: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 9px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

function genDevisHTML(devis: DevisFood): string {
  const { sousTotal, acompte, solde } = calculerTotauxDevis(devis.lignes);
  const lignesHtml = devis.lignes.map(l =>
    `<tr><td>${l.libelle}${l.note?`<br><small style='color:#6b7280'>${l.note}</small>`:""}</td>
    <td style='text-align:center'>${l.qte} ${l.unite}</td>
    <td style='text-align:right'>${l.prixUnitaire!=null?fmtPrix(l.prixUnitaire):"—"}</td>
    <td style='text-align:right;font-weight:bold'>${l.total!=null?fmtPrix(l.total):"À compléter"}</td></tr>`
  ).join("");
  const validite = new Date(devis.dateCreation);
  validite.setDate(validite.getDate()+30);
  return `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Devis ${devis.reference}</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:24px;font-size:13px;color:#1a1a1a;max-width:800px;margin:0 auto}
h1{color:#15803d;font-family:Georgia,serif;font-size:20px;border-bottom:3px solid #15803d;padding-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
.block{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px}
.block label{font-size:9px;color:#6b7280;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin:12px 0}
thead th{background:#15803d;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
tbody td{padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}
.totals{max-width:280px;margin-left:auto}
.totals table td{padding:5px 8px;font-size:12px}
.total-final td{font-size:15px;font-weight:700;color:#15803d;border-top:2px solid #15803d}
.cond{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-size:10px;color:#6b7280;margin-top:16px}
.footer{text-align:center;font-size:9px;color:#9ca3af;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:10px}
@media print{body{padding:0}}
</style></head><body>
<h1>🍃 Bella'Food — Devis</h1>
<div class='grid'>
  <div class='block'><label>Référence</label>${devis.reference}</div>
  <div class='block'><label>Date</label>${new Date(devis.dateCreation).toLocaleDateString("fr-FR")}</div>
  <div class='block'><label>Validité</label>${validite.toLocaleDateString("fr-FR")}</div>
  <div class='block'><label>Statut</label>${devis.statut}</div>
</div>
<div class='block' style='margin-bottom:12px'>
  <label>Client</label><strong>${devis.client}</strong><br>
  ${devis.tel?`Tél : ${devis.tel}<br>`:""}${devis.email?`Email : ${devis.email}`:""}
</div>
<table>
  <thead><tr><th>Désignation</th><th style='text-align:center'>Qté</th><th style='text-align:right'>P.U.</th><th style='text-align:right'>Total</th></tr></thead>
  <tbody>${lignesHtml}</tbody>
</table>
<div class='totals'><table>
  <tr><td>Sous-total</td><td style='text-align:right;font-weight:600'>${fmtPrix(sousTotal)}</td></tr>
  <tr><td>Acompte (${devis.acomptePct}%)</td><td style='text-align:right;color:#92400e'>${fmtPrix(acompte)}</td></tr>
  <tr><td>Solde</td><td style='text-align:right;color:#6b7280'>${fmtPrix(solde)}</td></tr>
  <tr class='total-final'><td>TOTAL</td><td style='text-align:right'>${fmtPrix(sousTotal)}</td></tr>
</table></div>
<div class='cond'><strong>Conditions :</strong> ${devis.conditions||"Devis valable 30 jours. Acompte requis à la confirmation."}</div>
${devis.notes?`<p style='font-size:11px;color:#6b7280;margin-top:8px'>Notes : ${devis.notes}</p>`:""}
<div class='footer'>Document généré par Bella'Food — Bellaïa</div>
</body></html>`;
}

export default function FoodDevis() {
  const [devis,  setDevis]  = useState<DevisFood[]>([]);
  const [modal,  setModal]  = useState<"creer"|"detail"|null>(null);
  const [detail, setDetail] = useState<DevisFood|null>(null);
  const [filtre, setFiltre] = useState<StatutDevisFood|"tous">("tous");

  const FORM_INIT = {
    client:"", tel:"", email:"", acomptePct:30, conditions:"", notes:"",
  };
  const [form,   setForm]   = useState(FORM_INIT);
  const [lignes, setLignes] = useState<LigneDevisFood[]>([]);
  const [nouvLigne, setNouvLigne] = useState<Partial<LigneDevisFood>>({
    libelle:"", type:"produit" as const, qte:1, unite:"prestation", prixUnitaire:null, note:"",
  });

  const visibles = devis.filter(d => filtre==="tous" || d.statut===filtre);

  const { sousTotal, acompte, solde } = useMemo(() => calculerTotauxDevis(lignes), [lignes]);

  const ajouterLigne = () => {
    if (!nouvLigne.libelle?.trim()) return;
    const pu  = nouvLigne.prixUnitaire ?? null;
    const qte = Number(nouvLigne.qte)||1;
    setLignes(ls => [...ls, {
      id:"lg_"+Date.now().toString().slice(-5),
      libelle:    nouvLigne.libelle!,
      type:       nouvLigne.type||"produit",
      qte, unite: nouvLigne.unite||"prestation",
      prixUnitaire: pu,
      total:      pu ? Math.round(pu*qte*100)/100 : null,
      note:       nouvLigne.note||"",
      source:"Manuel",
    }]);
    setNouvLigne({libelle:"",type:"produit",qte:1,unite:"prestation",prixUnitaire:null,note:""});
  };

  const ajouterDepuisCatalogue = (id: string) => {
    const p = FOOD_CATALOGUE.find(x=>x.id===id);
    if (!p) return;
    setLignes(ls => [...ls, {
      id:"lg_"+Date.now().toString().slice(-5),
      libelle:p.nom, type:"produit", qte:1, unite:p.unite||"prestation",
      prixUnitaire:p.prix, total:p.prix, source:p.id,
    }]);
  };

  const suppLigne = (id:string) => setLignes(ls=>ls.filter(l=>l.id!==id));

  const creerDevis = () => {
    if (!form.client.trim() || !form.tel.trim()) { alert("Client et téléphone requis."); return; }
    const d: DevisFood = {
      id:"devf_"+Date.now().toString().slice(-5),
      reference:"DEVF-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-4),
      client:form.client, tel:form.tel, email:form.email||undefined,
      lignes, conditions:form.conditions, notes:form.notes||undefined,
      dateCreation:new Date().toISOString().split("T")[0],
      dateValidite:(() => {
        const v=new Date(); v.setDate(v.getDate()+30);
        return v.toISOString().split("T")[0];
      })(),
      acomptePct:form.acomptePct, statut:"brouillon",
    };
    setDevis(ds=>[d,...ds]);
    setModal(null); setForm(FORM_INIT); setLignes([]);
    setDetail(d);
  };

  const changerStatut = (id:string, statut:StatutDevisFood) => {
    setDevis(ds=>ds.map(d=>d.id===id?{...d,statut}:d));
    if (detail?.id===id) setDetail(d=>d?{...d,statut}:null);
  };

  const imprimer = (d:DevisFood) => {
    const win=window.open("","_blank");
    if (!win) return;
    win.document.write(genDevisHTML(d));
    win.document.close(); win.focus();
    setTimeout(()=>win.print(),400);
  };

  const envoyerWA = (d:DevisFood) => {
    const tots=calculerTotauxDevis(d.lignes);
    const msg=[
      `Bonjour ${d.client} 👋`,
      "",
      `Votre devis Bella'Food est prêt !`,
      `Référence : ${d.reference}`,
      `Total : ${fmtPrix(tots.sousTotal)}`,
      `Acompte (${d.acomptePct}%) : ${fmtPrix(tots.acompte)}`,
      `Validité : ${d.dateValidite}`,
      "",
      "Cordialement — Bella'Food ✨",
    ].join("\n");
    const tel=(d.tel||"").replace(/\D/g,"");
    window.open(`https://wa.me/${tel||""}?text=${encodeURIComponent(msg)}`,"_blank");
    changerStatut(d.id,"envoye");
  };

  if (detail && modal!=="creer") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={()=>setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:8, padding:"5px 12px", color:"rgba(255,255,255,0.5)",
          cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Retour</button>

      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:FS, fontSize:15, color:FC.or }}>{detail.reference}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{detail.client}</div>
            <div style={{ fontSize:10, color:FC.creamD }}>{detail.tel}</div>
          </div>
          <span style={{ fontSize:9, background:STATUT_COL[detail.statut],
            color:STATUT_TXT[detail.statut], borderRadius:4, padding:"2px 8px",
            fontWeight:700, alignSelf:"flex-start" }}>{detail.statut}</span>
        </div>

        {detail.lignes.map(l=>{
          const tot=calculerTotauxDevis([l]).sousTotal;
          return (
            <div key={l.id} style={{ display:"flex", justifyContent:"space-between",
              padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize:12, color:"#fff" }}>{l.libelle}</div>
                {l.note&&<div style={{ fontSize:10, color:FC.creamD,fontStyle:"italic" }}>{l.note}</div>}
                <div style={{ fontSize:10, color:FC.creamD }}>{l.qte} {l.unite}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:l.total!=null?FC.or:FC.creamD }}>
                  {l.total!=null?fmtPrix(l.total):"À compléter"}
                </div>
              </div>
            </div>
          );
        })}

        {/* Totaux */}
        {calculerTotauxDevis(detail.lignes).sousTotal > 0 && (
          <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${FC.line}` }}>
            {[
              ["Total", fmtPrix(calculerTotauxDevis(detail.lignes).sousTotal), FC.or, true],
              ["Acompte ("+detail.acomptePct+"%)", fmtPrix(calculerTotauxDevis(detail.lignes).acompte), "#c9a96e", false],
              ["Solde", fmtPrix(calculerTotauxDevis(detail.lignes).solde), FC.creamD, false],
            ].map(([l,v,col,big])=>(
              <div key={l as string} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, color:FC.creamD }}>{l}</span>
                <span style={{ fontSize:big?16:12, fontWeight:big?700:600, color:col as string }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions statut */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {(["brouillon","envoye","accepte","refuse","expire","commande"] as StatutDevisFood[]).map(s=>(
          <button key={s} onClick={()=>changerStatut(detail.id,s)}
            style={{ fontSize:8, padding:"3px 8px", borderRadius:99, cursor:"pointer",
              border:`1px solid ${s===detail.statut?FC.vert:"rgba(255,255,255,0.1)"}`,
              background:s===detail.statut?"rgba(21,128,61,0.15)":"transparent",
              color:s===detail.statut?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>
            {s}
          </button>
        ))}
      </div>

      {/* Boutons action */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>imprimer(detail)}
          style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:10, padding:"9px", color:"rgba(255,255,255,0.7)",
            fontSize:12, cursor:"pointer", fontFamily:SA }}>
          🖨 Aperçu / Imprimer
        </button>
        <button onClick={()=>envoyerWA(detail)}
          style={{ flex:1, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
            borderRadius:10, padding:"9px", color:"#25d366",
            fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          💬 Envoyer WhatsApp
        </button>
      </div>
      <div style={{ background:"rgba(255,255,255,0.04)", border:"1px dashed rgba(255,255,255,0.12)",
        borderRadius:10, padding:"9px 12px", fontSize:10, color:"rgba(255,255,255,0.35)" }}>
        📧 E-mail automatique — SMTP non configuré
      </div>
    </div>
  );

  if (modal==="creer") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={()=>{setModal(null);setLignes([]);setForm(FORM_INIT);}}
          style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:8, padding:"4px 10px", color:"rgba(255,255,255,0.5)",
            cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Annuler</button>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouveau devis Food</div>
      </div>

      {/* Client */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, letterSpacing:1 }}>CLIENT</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Nom *</label>
            <input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))}
              placeholder="Nom du client" style={inpStyle}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Tél *</label>
            <input value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))}
              placeholder="+594..." style={inpStyle}/>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Email</label>
          <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
            placeholder="email@..." style={inpStyle}/>
        </div>
      </div>

      {/* Ajouter depuis catalogue */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, letterSpacing:1, marginBottom:8 }}>PRODUITS DU CATALOGUE</div>
        <select onChange={e=>{ if(e.target.value){ajouterDepuisCatalogue(e.target.value);e.target.value="";} }}
          style={{ ...inpStyle, background:"#1a1a2e" }}>
          <option value="">+ Ajouter depuis le catalogue…</option>
          {FOOD_CATALOGUE.filter(p=>p.disponible).map(p=>(
            <option key={p.id} value={p.id}>{p.nom} {p.prix!=null?"("+p.prix+"€/"+( p.unite||"u")+")":"(Sur devis)"}</option>
          ))}
        </select>
      </div>

      {/* Lignes */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, letterSpacing:1, marginBottom:8 }}>LIGNES DU DEVIS</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
          {lignes.map(l=>(
            <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"7px 10px" }}>
              <div>
                <div style={{ fontSize:12, color:"#fff" }}>{l.libelle}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>{l.qte} {l.unite}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, fontWeight:700, color:l.total!=null?FC.or:FC.creamD }}>
                  {l.total!=null?fmtPrix(l.total):"À compléter"}
                </span>
                <button onClick={()=>suppLigne(l.id)}
                  style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:14 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {/* Ajouter ligne manuelle */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr auto", gap:6, marginBottom:6 }}>
          <input value={nouvLigne.libelle||""} onChange={e=>setNouvLigne(f=>({...f,libelle:e.target.value}))}
            placeholder="Libellé" style={inpStyle}/>
          <input type="number" value={nouvLigne.qte||1} onChange={e=>setNouvLigne(f=>({...f,qte:parseFloat(e.target.value)||1}))}
            style={inpStyle} placeholder="Qté"/>
          <input type="number" value={nouvLigne.prixUnitaire??""} onChange={e=>setNouvLigne(f=>({...f,prixUnitaire:e.target.value?parseFloat(e.target.value):null}))}
            placeholder="Prix €" style={inpStyle}/>
          <button onClick={ajouterLigne}
            style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 12px",
              color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+</button>
        </div>
        {sousTotal > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8,
            borderTop:`1px solid ${FC.line}` }}>
            <span style={{ fontSize:12, color:FC.creamD }}>Total</span>
            <span style={{ fontSize:16, fontWeight:700, color:FC.or }}>{fmtPrix(sousTotal)}</span>
          </div>
        )}
      </div>

      {/* Paramètres */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Acompte (%)</label>
          <input type="number" value={form.acomptePct} min={0} max={100}
            onChange={e=>setForm(f=>({...f,acomptePct:parseInt(e.target.value)||30}))}
            style={inpStyle}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Notes</label>
          <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Remarques..." style={inpStyle}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={creerDevis}
          style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
            padding:"11px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
          ✅ Créer le devis
        </button>
        <button onClick={()=>{setModal(null);setLignes([]);setForm(FORM_INIT);}}
          style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
            padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontFamily:SA }}>
          Annuler
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{visibles.length} devis</div>
        <button onClick={()=>setModal("creer")}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Créer un devis
        </button>
      </div>

      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {(["tous","brouillon","envoye","accepte","refuse"] as const).map(s=>(
          <button key={s} onClick={()=>setFiltre(s as any)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtre===s?(s==="tous"?FC.vert:STATUT_COL[s as StatutDevisFood]):"rgba(255,255,255,0.04)",
              color:filtre===s?(s==="tous"?"#fff":STATUT_TXT[s as StatutDevisFood]):"rgba(255,255,255,0.4)" }}>
            {s==="tous"?"Tous":s}
          </button>
        ))}
      </div>

      {devis.length===0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucun devis. Créez votre premier devis Food.
        </div>
      )}

      {visibles.map(d=>{
        const tots=calculerTotauxDevis(d.lignes);
        return (
          <div key={d.id} onClick={()=>setDetail(d)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{d.client}</div>
              <span style={{ fontSize:9, background:STATUT_COL[d.statut],
                color:STATUT_TXT[d.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                {d.statut}
              </span>
            </div>
            <div style={{ fontSize:10, color:FC.creamD }}>
              {d.reference} · {d.lignes.length} ligne{d.lignes.length>1?"s":""}
            </div>
            {tots.sousTotal>0&&<div style={{ fontSize:13, fontWeight:700, color:FC.or, marginTop:4 }}>{fmtPrix(tots.sousTotal)}</div>}
          </div>
        );
      })}
    </div>
  );
}
