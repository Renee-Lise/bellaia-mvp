// ═══════════════════════════════════════════════════════════
// FoodCalculateur — Calculateur complet Bella'Food Partie II
// Énergie, coût/portion, prix premium, seuil de rentabilité
// src/modules/food/FoodCalculateur.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC, FOOD_RECETTES_INIT } from "./foodConsts";
import { calculerPrix, fmtPrix } from "./foodUtils";

const SA = "system-ui, sans-serif";

const inpBase: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

export default function FoodCalculateur() {
  const [source, setSource] = useState<"manuel"|"recette">("manuel");
  const [recetteId, setRecetteId] = useState("");
  const [form, setForm] = useState({
    coutMatiere:      0,
    coutConsommables: 0,
    coutEmballage:    0,
    coutDecoration:   0,
    coutMainOeuvre:   0,
    coutEnergie:      0,
    coutLivraison:    0,
    coutCharges:      0,
    margeSouhaitee:   40,
    supplement:       0,
    remise:           0,
    acomptePct:       30,
    nbPortions:       1,
  });

  // Si recette sélectionnée, pré-remplir les coûts
  const chargerRecette = (id: string) => {
    const r = FOOD_RECETTES_INIT.find(x => x.id === id);
    if (!r) return;
    setForm(f => ({
      ...f,
      coutMatiere:      r.coutMatiere      || 0,
      coutConsommables: r.coutConsommables || 0,
      nbPortions:       r.nbParts          || 1,
    }));
    setRecetteId(id);
  };

  const res = useMemo(() => calculerPrix({
    coutMatiere:      form.coutMatiere,
    coutConsommables: form.coutConsommables,
    coutEmballage:    form.coutEmballage,
    coutDecoration:   form.coutDecoration,
    coutMainOeuvre:   form.coutMainOeuvre,
    coutLivraison:    form.coutLivraison,
    coutCharges:      form.coutCharges + form.coutEnergie,
    margeSouhaitee:   form.margeSouhaitee,
    supplement:       form.supplement,
    remise:           form.remise,
    acomptePct:       form.acomptePct,
  }), [form]);

  const prixParPortion    = form.nbPortions > 1 ? Math.round(res.prixVenteConseille / form.nbPortions * 100)/100 : null;
  const prixPremium       = Math.round(res.prixVenteConseille * 1.3 * 100)/100;
  const seuilRentabilite  = res.coutTotal > 0 ? Math.ceil(res.coutTotal / Math.max(res.prixVenteConseille, 0.01)) : null;

  const Inp = ({ label, k, suffix="€" }: { label:string; k:keyof typeof form; suffix?:string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
        {label} ({suffix})
      </label>
      <input type="number" min={0} step={0.01} value={form[k] as number}
        onChange={e => setForm(f => ({...f,[k]:parseFloat(e.target.value)||0}))}
        style={inpBase}/>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Onglets source */}
      <div style={{ display:"flex", gap:6 }}>
        {(["manuel","recette"] as const).map(s => (
          <button key={s} onClick={()=>setSource(s)}
            style={{ flex:1, padding:"7px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, fontFamily:SA,
              background:source===s?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.05)",
              color:source===s?FC.vertL:"rgba(255,255,255,0.5)" }}>
            {s==="manuel"?"✏ Manuel":"📖 Depuis recette"}
          </button>
        ))}
      </div>

      {source==="recette" && (
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Choisir une recette</label>
          <select value={recetteId} onChange={e=>chargerRecette(e.target.value)}
            style={{ ...inpBase, background:"#1a1a2e" }}>
            <option value="">— Sélectionner —</option>
            {FOOD_RECETTES_INIT.map(r=>(
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
          {recetteId && <div style={{ fontSize:10, color:FC.creamD }}>Coûts pré-remplis depuis la recette. Ajustez si nécessaire.</div>}
        </div>
      )}

      {/* Coûts */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>COÛTS DE REVIENT</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Inp label="Matières premières"  k="coutMatiere"/>
          <Inp label="Consommables"         k="coutConsommables"/>
          <Inp label="Emballage"            k="coutEmballage"/>
          <Inp label="Décoration"           k="coutDecoration"/>
          <Inp label="Main-d'œuvre"         k="coutMainOeuvre"/>
          <Inp label="Énergie (four...)"    k="coutEnergie"/>
          <Inp label="Livraison"            k="coutLivraison"/>
          <Inp label="Charges fixes"        k="coutCharges"/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10,
          paddingTop:8, borderTop:`1px solid ${FC.line}` }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Coût total</span>
          <span style={{ fontSize:16, fontWeight:700, color:"#f87171" }}>{fmtPrix(res.coutTotal)}</span>
        </div>
      </div>

      {/* Paramètres */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>PARAMÈTRES</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Inp label="Marge souhaitée"  k="margeSouhaitee" suffix="%"/>
          <Inp label="Supplément"       k="supplement"/>
          <Inp label="Remise"           k="remise"/>
          <Inp label="Acompte"          k="acomptePct" suffix="%"/>
          <Inp label="Nb de portions"   k="nbPortions" suffix="pcs"/>
        </div>
      </div>

      {/* Résultats enrichis */}
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, letterSpacing:1, marginBottom:10 }}>RÉSULTATS</div>
        {[
          {label:"Coût total",             val:fmtPrix(res.coutTotal),              col:"#f87171"},
          {label:"Prix minimum",           val:fmtPrix(res.prixMinConseille),        col:"rgba(255,255,255,0.6)"},
          {label:"Prix conseillé",         val:fmtPrix(res.prixVenteConseille),      col:FC.or,    big:true},
          {label:"Prix premium (+30%)",    val:fmtPrix(prixPremium),                 col:FC.vertL},
          prixParPortion ? {label:"Prix par portion",       val:fmtPrix(prixParPortion),            col:FC.creamD} : null,
          {label:"Marge brute",            val:fmtPrix(res.margeBrute),              col:FC.vertL},
          {label:"Taux de marge",          val:res.tauxMarge+"%",                    col:FC.vertL},
          seuilRentabilite ? {label:"Seuil rentabilité",    val:seuilRentabilite+" vente(s)",       col:"rgba(255,200,100,0.8)"} : null,
          {label:"Acompte ("+form.acomptePct+"%)", val:fmtPrix(res.acompte),         col:"rgba(255,200,100,0.8)"},
          {label:"Solde",                  val:fmtPrix(res.solde),                   col:"rgba(255,255,255,0.5)"},
        ].filter(Boolean).map((r:any) => (
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{r.label}</span>
            <span style={{ fontSize:r.big?18:13, fontWeight:r.big?700:600, color:r.col }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
