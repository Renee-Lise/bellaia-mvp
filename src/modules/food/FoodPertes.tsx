// ═══════════════════════════════════════════════════════════
// FoodPertes — Module Pertes Bella'Food Partie IV
// Enregistrement, coûts, taux de perte, impact marge
// src/modules/food/FoodPertes.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_RECETTES_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import type { Perte, TypePerte } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const CAUSES: { id: TypePerte; nom: string; ico: string }[] = [
  {id:"casse",             nom:"Casse",                ico:"💔"},
  {id:"erreur_production", nom:"Erreur de production", ico:"⚙"},
  {id:"produit_jete",      nom:"Produit jeté",         ico:"🗑"},
  {id:"dlc_depassee",      nom:"DLC dépassée",         ico:"⏰"},
  {id:"ddm_depassee",      nom:"DDM dépassée",         ico:"📅"},
  {id:"perte_cuisson",     nom:"Perte cuisson",        ico:"🔥"},
  {id:"perte_decoration",  nom:"Perte décoration",     ico:"🎨"},
  {id:"erreur_commande",   nom:"Erreur commande",      ico:"📋"},
  {id:"retour_client",     nom:"Retour client",        ico:"↩️"},
  {id:"non_conformite",    nom:"Non-conformité",       ico:"🚫"},
];

const STATUT_COL = {
  ouverte:"rgba(248,113,113,0.15)", traitee:"rgba(21,128,61,0.15)", archivee:"rgba(255,255,255,0.05)",
};
const STATUT_TXT = { ouverte:"#f87171", traitee:"#22c55e", archivee:"rgba(255,255,255,0.3)" };

export default function FoodPertes() {
  const [pertes, setPertes] = useState<Perte[]>([]);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState<Partial<Perte>>({
    date:new Date().toISOString().split("T")[0], cause:"casse", statut:"ouverte",
  });

  const stats = useMemo(() => {
    const coutTotal  = pertes.reduce((s,p) => s + p.coutEstime, 0);
    const parCause: Record<string, number> = {};
    for (const p of pertes) {
      parCause[p.cause] = (parCause[p.cause] || 0) + p.coutEstime;
    }
    const parRecette: Record<string, number> = {};
    for (const p of pertes) {
      if (p.recetteId) parRecette[p.recetteId] = (parRecette[p.recetteId] || 0) + p.coutEstime;
    }
    const moisActuel = new Date().toISOString().slice(0,7);
    const coutMois   = pertes
      .filter(p => p.date.startsWith(moisActuel))
      .reduce((s,p) => s + p.coutEstime, 0);
    return { coutTotal, coutMois, parCause, parRecette, nb:pertes.length };
  }, [pertes]);

  const enregistrer = () => {
    if (!form.produit?.trim() || !form.cause) return;
    const recette = FOOD_RECETTES_INIT.find(r => r.id === form.recetteId);
    setPertes(ps => [{
      ...form as Perte,
      id:         "pert_" + Date.now().toString().slice(-5),
      produit:    form.produit!,
      quantite:   form.quantite || 1,
      unite:      form.unite || "pièce",
      coutEstime: form.coutEstime || 0,
      cause:      form.cause!,
      statut:     "ouverte",
      date:       form.date || new Date().toISOString().split("T")[0],
    } as Perte, ...ps]);
    setModal(false);
    setForm({ date:new Date().toISOString().split("T")[0], cause:"casse", statut:"ouverte" });
  };

  const changerStatut = (id: string, statut: Perte["statut"]) =>
    setPertes(ps => ps.map(p => p.id === id ? { ...p, statut } : p));

  const Field = ({ label, k, type="text", ph="" }: { label:string; k:keyof Perte; type?:string; ph?:string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form[k] as any) ?? ""}
        onChange={e => setForm(f => ({
          ...f, [k]: type==="number" ? parseFloat(e.target.value)||0 : e.target.value
        }))}
        style={inp}/>
    </div>
  );

  const causeTop = Object.entries(stats.parCause)
    .sort((a,b) => b[1]-a[1]).slice(0,3);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          {l:"Coût total pertes",  v:fmtPrix(stats.coutTotal), col:"#f87171"},
          {l:"Ce mois-ci",         v:fmtPrix(stats.coutMois),  col:"#fb923c"},
          {l:"Nb de pertes",       v:String(stats.nb),         col:FC.creamD},
        ].map(s => (
          <div key={s.l} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:700, color:s.col }}>{s.v}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Top causes */}
      {causeTop.length > 0 && (
        <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:13 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f87171", marginBottom:8 }}>TOP CAUSES DE PERTE</div>
          {causeTop.map(([cause, cout]) => {
            const cfg = CAUSES.find(c => c.id === cause);
            const pct = stats.coutTotal > 0 ? Math.round(cout/stats.coutTotal*100) : 0;
            return (
              <div key={cause} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:FC.creamD }}>{cfg?.ico} {cfg?.nom || cause}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#f87171" }}>{fmtPrix(cout)} ({pct}%)</span>
                </div>
                <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:99, height:4 }}>
                  <div style={{ height:4, borderRadius:99, background:"#f87171", width:`${pct}%` }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{pertes.length} perte{pertes.length>1?"s":""}</div>
        <button onClick={() => setModal(true)}
          style={{ background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)",
            borderRadius:8, padding:"7px 14px", color:"#f87171", fontWeight:700,
            fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Enregistrer une perte
        </button>
      </div>

      {/* Liste */}
      {pertes.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucune perte enregistrée.
        </div>
      )}
      {pertes.map(p => {
        const cfg = CAUSES.find(c => c.id === p.cause);
        return (
          <div key={p.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                  {cfg?.ico} {p.produit}
                </div>
                <div style={{ fontSize:10, color:FC.creamD }}>
                  {new Date(p.date).toLocaleDateString("fr-FR")}
                  {" · "}{p.quantite} {p.unite}
                  {p.responsable ? ` · ${p.responsable}` : ""}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f87171" }}>{fmtPrix(p.coutEstime)}</div>
                <span style={{ fontSize:9, background:STATUT_COL[p.statut], color:STATUT_TXT[p.statut],
                  borderRadius:4, padding:"1px 6px", fontWeight:700 }}>{p.statut}</span>
              </div>
            </div>
            {p.cause && <div style={{ fontSize:10, color:FC.creamD }}>Cause : {cfg?.nom || p.cause}</div>}
            {p.actionCorrective && (
              <div style={{ fontSize:10, color:"#22c55e", marginTop:4 }}>→ {p.actionCorrective}</div>
            )}
            <div style={{ display:"flex", gap:5, marginTop:8 }}>
              {(["ouverte","traitee","archivee"] as const).map(s => (
                <button key={s} onClick={() => changerStatut(p.id, s)}
                  style={{ fontSize:8, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                    border:`1px solid ${s===p.statut?"#f87171":"rgba(255,255,255,0.1)"}`,
                    background:s===p.statut?"rgba(248,113,113,0.12)":"transparent",
                    color:s===p.statut?"#f87171":"rgba(255,255,255,0.35)", fontFamily:SA }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Enregistrer une perte</div>
              <button onClick={() => setModal(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <Field label="Produit *"           k="produit"     ph="Nom du produit perdu"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Field label="Date"              k="date"        type="date"/>
                <Field label="Quantité"          k="quantite"    type="number" ph="1"/>
                <Field label="Unité"             k="unite"       ph="pièce, kg..."/>
                <Field label="Coût estimé (€)"   k="coutEstime"  type="number"/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Cause</label>
                <select value={form.cause || "casse"} onChange={e => setForm(f => ({ ...f, cause:e.target.value as TypePerte }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {CAUSES.map(c => <option key={c.id} value={c.id}>{c.ico} {c.nom}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Recette liée (optionnel)</label>
                <select value={form.recetteId || ""} onChange={e => setForm(f => ({ ...f, recetteId:e.target.value || undefined }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  <option value="">—</option>
                  {FOOD_RECETTES_INIT.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <Field label="Action corrective"    k="actionCorrective" ph="Mesure prise..."/>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={enregistrer}
                  style={{ flex:1, background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)",
                    borderRadius:10, padding:"10px", color:"#f87171", fontWeight:700,
                    fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Enregistrer
                </button>
                <button onClick={() => setModal(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
