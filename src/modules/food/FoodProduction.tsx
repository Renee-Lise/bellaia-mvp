// ═══════════════════════════════════════════════════════════
// FoodProduction — Module Production Bella'Food Partie III
// Statuts, fiches labo/cuisson/conditionnement, lots
// src/modules/food/FoodProduction.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_RECETTES_INIT, FOOD_MATERIEL_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { genererFicheHTML, fmtDuree } from "./foodUtils";
import type { Production, StatutProduction } from "./foodTypes";

const SA = "system-ui, sans-serif";

const STATUT_COL: Record<StatutProduction, string> = {
  prevue:"rgba(201,168,76,0.2)", en_preparation:"rgba(124,58,237,0.2)",
  cuisson:"rgba(239,68,68,0.2)", decoration:"rgba(16,185,129,0.2)",
  terminee:"rgba(80,180,120,0.2)", livree:"rgba(255,255,255,0.08)",
};
const STATUT_TXT: Record<StatutProduction, string> = {
  prevue:"#c9a96e", en_preparation:"#a78bfa", cuisson:"#f87171",
  decoration:"#22c55e", terminee:"#34d399", livree:"rgba(255,255,255,0.4)",
};
const STATUTS_PROD: StatutProduction[] = ["prevue","en_preparation","cuisson","decoration","terminee","livree"];

const TYPE_FICHE = [
  {id:"cuisine",     nom:"Fiche cuisine",     ico:"🍳"},
  {id:"laboratoire", nom:"Fiche labo",        ico:"🔬"},
  {id:"haccp",       nom:"Fiche HACCP",       ico:"✅"},
  {id:"impression",  nom:"Impression",        ico:"🖨"},
] as const;

export default function FoodProduction() {
  const [productions,setProductions]=useState<Production[]>([]);
  const [modal,      setModal]      =useState<"creer"|null>(null);
  const [detail,     setDetail]     =useState<Production|null>(null);
  const [form,       setForm]       =useState({
    recetteId:"", recetteNom:"", date:new Date().toISOString().split("T")[0],
    operateur:"", quantite:1, commandeId:"", observations:"",
  });

  const creer = () => {
    if (!form.recetteNom.trim()) return;
    const recette = FOOD_RECETTES_INIT.find(r => r.id === form.recetteId);
    const prod: Production = {
      id:         "prod_" + Date.now().toString().slice(-5),
      numero:     "PROD-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
      recetteId:  form.recetteId || undefined,
      recetteNom: form.recetteNom,
      date:       form.date,
      operateur:  form.operateur || undefined,
      quantite:   form.quantite,
      dureeMin:   recette ? (recette.tempsPrepa + recette.tempsCuisson + (recette.tempsRepos||0)) : undefined,
      materiel:   FOOD_MATERIEL_INIT.filter(m => m.qteDispo > 0).slice(0,4).map(m => m.nom),
      ingredients: recette ? recette.ingredients.map(i => ({
        ingredientId:i.id, nom:i.nom,
        quantite:Math.round(i.quantite * form.quantite / recette.nbParts * 100)/100,
        unite:i.unite,
      })) : [],
      statut: "prevue",
      observations: form.observations || undefined,
      commandeId: form.commandeId || undefined,
    };
    setProductions(ps => [prod, ...ps]);
    setModal(null);
    setForm({ recetteId:"", recetteNom:"", date:new Date().toISOString().split("T")[0], operateur:"", quantite:1, commandeId:"", observations:"" });
    setDetail(prod);
  };

  const changerStatut = (id: string, statut: StatutProduction) => {
    setProductions(ps => ps.map(p => p.id === id ? { ...p, statut } : p));
    if (detail?.id === id) setDetail(d => d ? { ...d, statut } : null);
  };

  const ouvrirFiche = (p: Production, type: "cuisine"|"laboratoire"|"haccp"|"impression") => {
    const recette = FOOD_RECETTES_INIT.find(r => r.id === p.recetteId) || {
      nom:p.recetteNom, nbParts:p.quantite, tempsPrepa:0, tempsCuisson:0,
      difficulte:3 as const, ingredients:p.ingredients.map(i=>({...i,id:i.ingredientId})),
      etapes:[], statut:"validee" as const, categorie:"patisserie" as const,
    };
    const html = genererFicheHTML(recette, type);
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  const inp: React.CSSProperties = {
    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
    fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
  };

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={() => setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:`1px solid ${FC.line}`,
          borderRadius:8, padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>
        ‹ Retour
      </button>
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div>
            <div style={{ fontSize:11, color:FC.creamD }}>{detail.numero}</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{detail.recetteNom}</div>
            <div style={{ fontSize:11, color:FC.creamD }}>
              📅 {new Date(detail.date).toLocaleDateString("fr-FR")}
              {detail.operateur ? ` · 👤 ${detail.operateur}` : ""}
              {" · "}{detail.quantite} pièce{detail.quantite>1?"s":""}
            </div>
          </div>
          <span style={{ fontSize:9, background:STATUT_COL[detail.statut], color:STATUT_TXT[detail.statut],
            borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>
            {detail.statut.replace("_"," ")}
          </span>
        </div>
        {detail.dureeMin && (
          <div style={{ fontSize:11, color:FC.creamD, marginBottom:8 }}>
            ⏱ Durée estimée : {fmtDuree(detail.dureeMin)}
          </div>
        )}
        {detail.ingredients.length > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:FC.creamD, marginBottom:5 }}>INGRÉDIENTS</div>
            {detail.ingredients.slice(0,6).map(i => (
              <div key={i.ingredientId} style={{ display:"flex", justifyContent:"space-between",
                padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>{i.nom}</span>
                <span style={{ fontSize:11, color:FC.or }}>{i.quantite} {i.unite}</span>
              </div>
            ))}
          </div>
        )}
        {detail.observations && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>{detail.observations}</div>
        )}
      </div>
      {/* Statuts */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {STATUTS_PROD.map(s => (
          <button key={s} onClick={() => changerStatut(detail.id, s)}
            style={{ fontSize:9, padding:"3px 9px", borderRadius:99, cursor:"pointer",
              border:`1px solid ${s===detail.statut?FC.vert:"rgba(255,255,255,0.1)"}`,
              background:s===detail.statut?"rgba(21,128,61,0.15)":"transparent",
              color:s===detail.statut?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>
            {s.replace("_"," ")}
          </button>
        ))}
      </div>
      {/* Fiches */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
        {TYPE_FICHE.map(f => (
          <button key={f.id} onClick={() => ouvrirFiche(detail, f.id)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:10,
              padding:"10px", cursor:"pointer", fontFamily:SA,
              display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>{f.ico}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{f.nom}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{productions.length} production{productions.length>1?"s":""}</div>
        <button onClick={() => setModal("creer")}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouvelle production
        </button>
      </div>

      {productions.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucune production enregistrée.
        </div>
      )}

      {productions.map(p => (
        <div key={p.id} onClick={() => setDetail(p)}
          style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.recetteNom}</div>
            <span style={{ fontSize:9, background:STATUT_COL[p.statut], color:STATUT_TXT[p.statut],
              borderRadius:4, padding:"2px 7px", fontWeight:700 }}>{p.statut.replace("_"," ")}</span>
          </div>
          <div style={{ fontSize:10, color:FC.creamD }}>
            {p.numero} · {new Date(p.date).toLocaleDateString("fr-FR")} · {p.quantite} pièce{p.quantite>1?"s":""}
            {p.dureeMin ? ` · ${fmtDuree(p.dureeMin)}` : ""}
          </div>
        </div>
      ))}

      {modal === "creer" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouvelle production</div>
              <button onClick={() => setModal(null)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Recette</label>
                <select value={form.recetteId}
                  onChange={e => {
                    const r = FOOD_RECETTES_INIT.find(x => x.id === e.target.value);
                    setForm(f => ({ ...f, recetteId:e.target.value, recetteNom:r?.nom||"" }));
                  }}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  <option value="">— Choisir une recette —</option>
                  {FOOD_RECETTES_INIT.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Quantité</label>
                  <input type="number" min={1} value={form.quantite} onChange={e => setForm(f=>({...f,quantite:parseInt(e.target.value)||1}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Opérateur</label>
                  <input value={form.operateur} onChange={e => setForm(f=>({...f,operateur:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>N° commande liée (optionnel)</label>
                <input value={form.commandeId} onChange={e => setForm(f=>({...f,commandeId:e.target.value}))} style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Observations</label>
                <textarea rows={2} value={form.observations} onChange={e => setForm(f=>({...f,observations:e.target.value}))}
                  style={{ ...inp, resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creer}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Créer la production
                </button>
                <button onClick={() => setModal(null)}
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
