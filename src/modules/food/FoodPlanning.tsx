// ═══════════════════════════════════════════════════════════
// FoodPlanning — Planning de production Bella'Food Partie II
// Tâches J-3 / J-2 / J-1 / Jour J par commande
// src/modules/food/FoodPlanning.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC, FOOD_RECETTES_INIT } from "./foodConsts";
import { genererPlanningProduction, fmtDuree } from "./foodUtils";
import type { PlanningProduction, TacheProduction, JourProduction } from "./foodTypes";

const SA = "system-ui, sans-serif";

const JOURS: JourProduction[] = ["J-3", "J-2", "J-1", "JourJ"];
const JOURS_LABELS: Record<JourProduction, string> = {
  "J-3":"3 jours avant", "J-2":"2 jours avant", "J-1":"La veille", "JourJ":"Jour J",
};
const JOURS_COL: Record<JourProduction, string> = {
  "J-3":"rgba(124,58,237,0.15)", "J-2":"rgba(59,130,246,0.15)",
  "J-1":"rgba(201,168,76,0.15)", "JourJ":"rgba(21,128,61,0.2)",
};
const JOURS_TXT: Record<JourProduction, string> = {
  "J-3":"#a78bfa", "J-2":"#60a5fa", "J-1":"#c9a96e", "JourJ":"#22c55e",
};
const TYPE_ICO: Record<string, string> = {
  preparation:"🥄", repos:"⏳", cuisson:"🔥", refroidissement:"❄️",
  montage:"🏗", decoration:"🎨", conditionnement:"📦", livraison:"🚗", autre:"📝",
};

export default function FoodPlanning() {
  const [plannings,   setPlannings]   = useState<PlanningProduction[]>([]);
  const [modal,       setModal]       = useState(false);
  const [detail,      setDetail]      = useState<PlanningProduction|null>(null);
  const [jourFiltre,  setJourFiltre]  = useState<JourProduction|"tous">("tous");
  const [form, setForm] = useState({
    nomCommande:   "",
    dateLivraison: "",
    recetteIds:    [] as string[],
  });

  const creer = () => {
    if (!form.nomCommande.trim() || !form.dateLivraison) return;
    const p = genererPlanningProduction(
      "cmd_" + Date.now().toString().slice(-5),
      form.nomCommande,
      form.dateLivraison,
      form.recetteIds,
    );
    setPlannings(ps => [p, ...ps]);
    setModal(false);
    setForm({ nomCommande:"", dateLivraison:"", recetteIds:[] });
    setDetail(p);
  };

  const toggleTache = (planningId: string, tacheId: string) => {
    setPlannings(ps => ps.map(p =>
      p.id !== planningId ? p :
      { ...p, taches: p.taches.map(t => t.id===tacheId?{...t,faite:!t.faite}:t) }
    ));
    if (detail?.id === planningId) {
      setDetail(d => d ? {
        ...d, taches: d.taches.map(t => t.id===tacheId?{...t,faite:!t.faite}:t)
      } : null);
    }
  };

  const tachesFiltrees = (p: PlanningProduction) =>
    jourFiltre==="tous" ? p.taches : p.taches.filter(t=>t.jour===jourFiltre);

  const avancement = (p: PlanningProduction) => {
    if (!p.taches.length) return 0;
    return Math.round(p.taches.filter(t=>t.faite).length / p.taches.length * 100);
  };

  if (detail) {
    const av = avancement(detail);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={()=>setDetail(null)}
          style={{ alignSelf:"flex-start", background:"none", border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:8, padding:"5px 12px", color:"rgba(255,255,255,0.5)",
            cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Retour</button>

        {/* En-tête */}
        <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
          borderRadius:14, padding:"14px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>
            {detail.nomCommande}
          </div>
          <div style={{ fontSize:11, color:FC.creamD, marginBottom:10 }}>
            📅 Livraison : {detail.dateLivraison} · {detail.taches.length} tâches
          </div>
          {/* Barre d'avancement */}
          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:8, marginBottom:4 }}>
            <div style={{ height:8, borderRadius:99, background:FC.vert,
              width:`${av}%`, transition:"width 0.3s" }}/>
          </div>
          <div style={{ fontSize:10, color:FC.creamD }}>{av}% réalisé</div>
        </div>

        {/* Filtres jour */}
        <div style={{ display:"flex", gap:5 }}>
          {(["tous",...JOURS] as (JourProduction|"tous")[]).map(j => (
            <button key={j} onClick={()=>setJourFiltre(j)}
              style={{ flex:1, padding:"6px", borderRadius:8, border:"none", cursor:"pointer",
                fontSize:10, fontWeight:700, fontFamily:SA,
                background:jourFiltre===j?(j==="tous"?FC.vert:JOURS_COL[j as JourProduction]):"rgba(255,255,255,0.05)",
                color:jourFiltre===j?( j==="tous"?"#fff":JOURS_TXT[j as JourProduction]):"rgba(255,255,255,0.4)" }}>
              {j==="tous"?"Toutes":j}
            </button>
          ))}
        </div>

        {/* Tâches par jour */}
        {JOURS.filter(j => jourFiltre==="tous" || jourFiltre===j).map(jour => {
          const taches = detail.taches.filter(t=>t.jour===jour);
          if (!taches.length) return null;
          const dureeTotal = taches.reduce((s,t)=>s+t.dureeMin,0);
          return (
            <div key={jour} style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, overflow:"hidden" }}>
              <div style={{ background:JOURS_COL[jour], padding:"9px 14px",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color:JOURS_TXT[jour] }}>
                  {jour} — {JOURS_LABELS[jour]}
                </div>
                <div style={{ fontSize:10, color:JOURS_TXT[jour], opacity:0.7 }}>
                  {fmtDuree(dureeTotal)} de travail
                </div>
              </div>
              {taches.map(t => (
                <div key={t.id} onClick={()=>toggleTache(detail.id,t.id)}
                  style={{ display:"flex", gap:10, padding:"10px 14px", cursor:"pointer",
                    borderBottom:"1px solid rgba(255,255,255,0.05)",
                    background:t.faite?"rgba(21,128,61,0.05)":"transparent",
                    opacity:t.faite?0.55:1 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, marginTop:1,
                    background:t.faite?FC.vert:"rgba(255,255,255,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, color:"#fff" }}>
                    {t.faite?"✓":""}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                      <span style={{ fontSize:11 }}>{TYPE_ICO[t.type]||"📝"}</span>
                      <span style={{ fontSize:12, color:"#fff", fontWeight:t.faite?400:500,
                        textDecoration:t.faite?"line-through":"none" }}>{t.description}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, fontSize:10, color:FC.creamD }}>
                      {t.heure && <span>🕐 {t.heure}</span>}
                      <span>⏱ {fmtDuree(t.dureeMin)}</span>
                    </div>
                    {t.materiel?.length && (
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                        🧰 {t.materiel.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{plannings.length} planning{plannings.length>1?"s":""}</div>
        <button onClick={()=>setModal(true)}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Créer un planning
        </button>
      </div>

      {plannings.length===0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucun planning de production. Créez-en un à partir d'une commande.
        </div>
      )}

      {plannings.map(p => {
        const av = avancement(p);
        return (
          <div key={p.id} onClick={()=>setDetail(p)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.nomCommande}</div>
              <div style={{ fontSize:11, color:FC.creamD }}>📅 {p.dateLivraison}</div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:99, height:5, marginBottom:4 }}>
              <div style={{ height:5, borderRadius:99, background:av===100?FC.vert:FC.or, width:`${av}%` }}/>
            </div>
            <div style={{ fontSize:10, color:FC.creamD }}>{av}% · {p.taches.length} tâches</div>
          </div>
        );
      })}

      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouveau planning</div>
              <button onClick={()=>setModal(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Nom de la commande *</label>
                <input value={form.nomCommande} onChange={e=>setForm(f=>({...f,nomCommande:e.target.value}))}
                  placeholder="Gâteau anniversaire Marie..."
                  style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
                    borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
                    fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const }}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Date de livraison *</label>
                <input type="date" value={form.dateLivraison} onChange={e=>setForm(f=>({...f,dateLivraison:e.target.value}))}
                  style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
                    borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
                    fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const }}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Recettes concernées (optionnel)</label>
                <div style={{ maxHeight:140, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                  {FOOD_RECETTES_INIT.filter(r=>r.statut==="validee").map(r=>(
                    <label key={r.id} style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
                      <input type="checkbox"
                        checked={form.recetteIds.includes(r.id)}
                        onChange={e=>setForm(f=>({...f,
                          recetteIds:e.target.checked?[...f.recetteIds,r.id]:f.recetteIds.filter(x=>x!==r.id)
                        }))}
                        style={{ accentColor:FC.vert }}/>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{r.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={creer}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
                    padding:"10px", color:"#fff", fontWeight:700, fontSize:12,
                    cursor:"pointer", fontFamily:SA }}>
                  Générer le planning
                </button>
                <button onClick={()=>setModal(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.5)",
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
}
