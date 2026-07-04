import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { calculerPrix, fmtPrix } from "./foodUtils";

export default function FoodCalculateur() {
  const [form, setForm] = useState({
    coutMatiere:       0,
    coutConsommables:  0,
    coutEmballage:     0,
    coutDecoration:    0,
    coutMainOeuvre:    0,
    coutLivraison:     0,
    coutCharges:       0,
    margeSouhaitee:    40,
    supplement:        0,
    remise:            0,
    acomptePct:        30,
  });

  const res = useMemo(() => calculerPrix({
    coutMatiere:       form.coutMatiere,
    coutConsommables:  form.coutConsommables,
    coutEmballage:     form.coutEmballage,
    coutDecoration:    form.coutDecoration,
    coutMainOeuvre:    form.coutMainOeuvre,
    coutLivraison:     form.coutLivraison,
    coutCharges:       form.coutCharges,
    margeSouhaitee:    form.margeSouhaitee,
    supplement:        form.supplement,
    remise:            form.remise,
    acomptePct:        form.acomptePct,
  }), [form]);

  const inp = (label: string, key: keyof typeof form, suffix = "€") => (
    <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:"sans-serif" }}>
        {label} ({suffix})
      </label>
      <input
        type="number" min={0} step={0.01}
        value={form[key] as number}
        onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
        style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13,
          fontFamily:"sans-serif", outline:"none", width:"100%", boxSizing:"border-box" as any }}
      />
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
        Saisissez les coûts pour calculer automatiquement le prix de vente conseillé et la marge.
      </div>

      {/* Coûts */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color: FC.or, letterSpacing:1, marginBottom:2 }}>
          COÛTS
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp("Matières premières",  "coutMatiere")}
          {inp("Consommables",        "coutConsommables")}
          {inp("Emballage",           "coutEmballage")}
          {inp("Décoration",          "coutDecoration")}
          {inp("Main-d'œuvre",        "coutMainOeuvre")}
          {inp("Livraison",           "coutLivraison")}
          {inp("Charges fixes",       "coutCharges")}
        </div>
        <div style={{ paddingTop:8, borderTop:`1px solid ${FC.line}`,
          display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Coût total</span>
          <span style={{ fontSize:14, fontWeight:700, color:"#f87171" }}>
            {fmtPrix(res.coutTotal)}
          </span>
        </div>
      </div>

      {/* Paramètres de prix */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color: FC.or, letterSpacing:1, marginBottom:2 }}>
          PARAMÈTRES
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp("Marge souhaitée",   "margeSouhaitee", "%")}
          {inp("Supplément",        "supplement")}
          {inp("Remise",            "remise")}
          {inp("Acompte",           "acomptePct", "%")}
        </div>
      </div>

      {/* Résultats */}
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color: FC.or, letterSpacing:1, marginBottom:4 }}>
          RÉSULTAT
        </div>
        {[
          { label:"Prix minimum conseillé", val: fmtPrix(res.prixMinConseille), col:"rgba(255,255,255,0.6)" },
          { label:"Prix de vente conseillé",val: fmtPrix(res.prixVenteConseille), col: FC.or,    big:true },
          { label:"Marge brute",            val: fmtPrix(res.margeBrute),         col: FC.vertL         },
          { label:"Taux de marge",          val: `${res.tauxMarge}%`,              col: FC.vertL         },
          { label:"Acompte ("+form.acomptePct+"%)",  val: fmtPrix(res.acompte),  col:"rgba(255,200,100,0.8)" },
          { label:"Solde restant",           val: fmtPrix(res.solde),             col:"rgba(255,255,255,0.5)" },
        ].map(r => (
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", padding:"5px 0",
            borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{r.label}</span>
            <span style={{ fontSize:(r as any).big ? 18 : 13,
              fontWeight:(r as any).big ? 700 : 600, color: r.col }}>
              {r.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
