// ═══════════════════════════════════════════════════════════
// FoodInventaire — Inventaire Bella'Food Partie III
// Stock théorique vs réel, écarts, corrections, historique
// src/modules/food/FoodInventaire.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_STOCK_INIT, FOOD_COLORS as FC } from "./foodConsts";
import type { Inventaire, LigneInventaire } from "./foodTypes";

const SA = "system-ui, sans-serif";

export default function FoodInventaire() {
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [enCours,     setEnCours]     = useState<LigneInventaire[]>([]);
  const [modeComptage,setModeComptage]= useState(false);
  const [detail,      setDetail]      = useState<Inventaire|null>(null);

  const startInventaire = () => {
    const lignes: LigneInventaire[] = FOOD_STOCK_INIT.map(s => ({
      stockItemId:    s.id,
      nom:            s.nom,
      unite:          s.unite,
      stockTheorique: s.qteRestante,
      stockReel:      s.qteRestante, // pré-rempli, à corriger par l'opérateur
      ecart:          0,
      justification:  "",
    }));
    setEnCours(lignes);
    setModeComptage(true);
  };

  const majReelle = (id: string, val: number) => {
    setEnCours(ls => ls.map(l => l.stockItemId !== id ? l : {
      ...l,
      stockReel: val,
      ecart:     Math.round((val - l.stockTheorique) * 100) / 100,
    }));
  };

  const majJustification = (id: string, txt: string) => {
    setEnCours(ls => ls.map(l => l.stockItemId !== id ? l : { ...l, justification: txt }));
  };

  const validerInventaire = () => {
    const inv: Inventaire = {
      id:    "inv_" + Date.now().toString().slice(-5),
      date:  new Date().toISOString().split("T")[0],
      type:  "complet",
      lignes: enCours,
      statut: "valide",
    };
    setInventaires(is => [inv, ...is]);
    setModeComptage(false);
    setEnCours([]);
    setDetail(inv);
  };

  const ecartTotal = useMemo(() =>
    enCours.reduce((s, l) => s + Math.abs(l.ecart), 0), [enCours]);
  const nbEcarts   = useMemo(() =>
    enCours.filter(l => l.ecart !== 0).length, [enCours]);

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={() => setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:`1px solid ${FC.line}`,
          borderRadius:8, padding:"4px 12px", color:FC.creamD, cursor:"pointer",
          fontSize:11, fontFamily:SA }}>‹ Retour</button>
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>
          Inventaire du {new Date(detail.date).toLocaleDateString("fr-FR")}
        </div>
        <div style={{ fontSize:11, color:FC.creamD, marginBottom:12 }}>
          {detail.lignes.filter(l => l.ecart !== 0).length} écart{detail.lignes.filter(l=>l.ecart!==0).length>1?"s":""} détecté{detail.lignes.filter(l=>l.ecart!==0).length>1?"s":""}
        </div>
        {detail.lignes.filter(l => l.ecart !== 0).map(l => (
          <div key={l.stockItemId} style={{ display:"flex", justifyContent:"space-between",
            padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize:12, color:"#fff" }}>{l.nom}</div>
              <div style={{ fontSize:10, color:FC.creamD }}>
                Théorique : {l.stockTheorique} {l.unite} → Réel : {l.stockReel} {l.unite}
              </div>
              {l.justification && <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontStyle:"italic" }}>{l.justification}</div>}
            </div>
            <div style={{ fontSize:13, fontWeight:700,
              color: l.ecart < 0 ? "#f87171" : "#22c55e" }}>
              {l.ecart > 0 ? "+" : ""}{l.ecart} {l.unite}
            </div>
          </div>
        ))}
        {detail.lignes.filter(l => l.ecart === 0).length > 0 && (
          <div style={{ fontSize:11, color:FC.creamD, marginTop:8 }}>
            ✅ {detail.lignes.filter(l=>l.ecart===0).length} produit{detail.lignes.filter(l=>l.ecart===0).length>1?"s":""} sans écart
          </div>
        )}
      </div>
    </div>
  );

  if (modeComptage) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:4 }}>
          Inventaire en cours
        </div>
        <div style={{ fontSize:11, color:FC.creamD }}>
          {nbEcarts} écart{nbEcarts>1?"s":" "} · Δ total : {ecartTotal.toFixed(2)}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:420, overflowY:"auto" }}>
        {enCours.map(l => (
          <div key={l.stockItemId} style={{ background:FC.card,
            border:`1px solid ${l.ecart !== 0 ? (l.ecart < 0 ? "rgba(248,113,113,0.3)" : "rgba(21,128,61,0.3)") : FC.line}`,
            borderRadius:10, padding:"10px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{l.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>Théorique : {l.stockTheorique} {l.unite}</div>
              </div>
              {l.ecart !== 0 && (
                <span style={{ fontSize:13, fontWeight:700, color: l.ecart<0?"#f87171":"#22c55e", alignSelf:"flex-start" }}>
                  {l.ecart>0?"+":""}{l.ecart}
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <label style={{ fontSize:10, color:FC.creamD, flexShrink:0 }}>Qté réelle :</label>
              <input type="number" min={0} step={0.1} value={l.stockReel}
                onChange={e => majReelle(l.stockItemId, parseFloat(e.target.value)||0)}
                style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:7, padding:"5px 9px", color:"#fff", fontSize:12,
                  fontFamily:SA, outline:"none", width:80 }} />
              <span style={{ fontSize:10, color:FC.creamD }}>{l.unite}</span>
            </div>
            {l.ecart !== 0 && (
              <input value={l.justification || ""}
                onChange={e => majJustification(l.stockItemId, e.target.value)}
                placeholder="Justification (perte, casse, consommation...)"
                style={{ marginTop:6, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:7, padding:"5px 9px", color:FC.creamD, fontSize:10,
                  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={validerInventaire}
          style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
            padding:"11px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
          ✅ Valider l'inventaire
        </button>
        <button onClick={() => { setModeComptage(false); setEnCours([]); }}
          style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
            padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontFamily:SA }}>
          Annuler
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:6 }}>
          Gestion des inventaires
        </div>
        <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6, marginBottom:12 }}>
          Compare le stock théorique (calculé) et le stock réel (compté physiquement). Identifie les écarts pour correction.
        </div>
        <button onClick={startInventaire}
          style={{ width:"100%", background:FC.vert, border:"none", borderRadius:10,
            padding:"11px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
          🔢 Démarrer un inventaire complet
        </button>
      </div>
      {inventaires.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucun inventaire réalisé. Démarrez le premier.
        </div>
      )}
      {inventaires.map(inv => {
        const nb = inv.lignes.filter(l => l.ecart !== 0).length;
        return (
          <div key={inv.id} onClick={() => setDetail(inv)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
                Inventaire {inv.type} — {new Date(inv.date).toLocaleDateString("fr-FR")}
              </div>
              <span style={{ fontSize:9, background: nb>0?"rgba(248,113,113,0.12)":"rgba(21,128,61,0.12)",
                color:nb>0?"#f87171":"#22c55e", borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                {nb > 0 ? `${nb} écart${nb>1?"s":""}` : "Sans écart"}
              </span>
            </div>
            <div style={{ fontSize:10, color:FC.creamD, marginTop:3 }}>
              {inv.lignes.length} produits · {inv.statut}
            </div>
          </div>
        );
      })}
    </div>
  );
}
