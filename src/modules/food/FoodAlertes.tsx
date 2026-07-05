// ═══════════════════════════════════════════════════════════
// FoodAlertes — Centre d'alertes Bella'Food Partie III
// Stock faible, DLC, température, productions oubliées
// src/modules/food/FoodAlertes.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_STOCK_INIT, FOOD_COLORS as FC, ALERTE_CONFIG } from "./foodConsts";
import { genererAlertesStock } from "./foodUtils";
import type { Alerte, NiveauAlerte, TypeAlerte } from "./foodTypes";

const SA = "system-ui, sans-serif";

const NIVEAU_COL: Record<NiveauAlerte, string> = {
  critique: "#f87171", attention: "#fb923c", info: "#22c55e",
};
const NIVEAU_BG: Record<NiveauAlerte, string> = {
  critique: "rgba(248,113,113,0.12)", attention: "rgba(251,146,60,0.12)", info: "rgba(21,128,61,0.08)",
};

export default function FoodAlertes() {
  const [alertesManuellesLues, setAlertesManuelles] = useState<Set<string>>(new Set());
  const [filtre, setFiltre] = useState<NiveauAlerte|"toutes">("toutes");

  // Alertes générées automatiquement depuis les stocks initiaux
  const alertesAuto: Alerte[] = useMemo(() =>
    genererAlertesStock(FOOD_STOCK_INIT), []
  );

  const toutes = alertesAuto;
  const filtrees = toutes.filter(a => filtre === "toutes" || a.niveau === filtre);
  const nbCrit   = toutes.filter(a => a.niveau === "critique").length;
  const nbAttn   = toutes.filter(a => a.niveau === "attention").length;
  const nonLues  = toutes.filter(a => !alertesManuellesLues.has(a.id)).length;

  const marquerLue = (id: string) =>
    setAlertesManuelles(s => { const n = new Set(s); n.add(id); return n; });

  const toutMarquerLu = () =>
    setAlertesManuelles(new Set(toutes.map(a => a.id)));

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Tableau de bord alertes */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { label:"Critiques",  val:nbCrit,  col:"#f87171", bg:"rgba(248,113,113,0.12)" },
          { label:"Attention",  val:nbAttn,  col:"#fb923c", bg:"rgba(251,146,60,0.12)"  },
          { label:"Non lues",   val:nonLues, col:FC.or,     bg:"rgba(201,168,76,0.12)"  },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.col}33`,
            borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ display:"flex", gap:4, flex:1 }}>
          {(["toutes","critique","attention","info"] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                fontSize:9, fontWeight:700, fontFamily:SA,
                background:filtre===f?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",
                color:filtre===f?"#fff":f==="toutes"?"rgba(255,255,255,0.5)":NIVEAU_COL[f as NiveauAlerte] }}>
              {f}
            </button>
          ))}
        </div>
        {nonLues > 0 && (
          <button onClick={toutMarquerLu}
            style={{ fontSize:10, padding:"4px 10px", borderRadius:99, cursor:"pointer",
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste alertes */}
      {filtrees.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          {toutes.length === 0 ? "✅ Aucune alerte — tout est sous contrôle !" : "Aucune alerte pour ce filtre."}
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filtrees.map(a => {
          const cfg = ALERTE_CONFIG[a.type];
          const lue = alertesManuellesLues.has(a.id);
          return (
            <div key={a.id}
              style={{ background:lue ? "rgba(255,255,255,0.02)" : NIVEAU_BG[a.niveau],
                border:`1px solid ${lue ? "rgba(255,255,255,0.07)" : cfg.col+"44"}`,
                borderRadius:12, padding:"11px 13px", opacity: lue ? 0.5 : 1 }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{cfg.ico}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:lue?"rgba(255,255,255,0.4)":"#fff" }}>
                      {a.titre}
                    </div>
                    <span style={{ fontSize:8, background:`${cfg.col}22`, color:cfg.col,
                      borderRadius:4, padding:"1px 6px", fontWeight:700, alignSelf:"flex-start",
                      flexShrink:0, marginLeft:8 }}>{a.niveau}</span>
                  </div>
                  <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.5 }}>{a.message}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{fmt(a.date)}</div>
                </div>
                {!lue && (
                  <button onClick={() => marquerLue(a.id)}
                    style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6,
                      padding:"3px 8px", color:"rgba(255,255,255,0.4)", cursor:"pointer",
                      fontSize:9, fontFamily:SA, flexShrink:0 }}>
                    Lu
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)",
        borderRadius:10, padding:"10px 13px", fontSize:10, color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>
        Les alertes sont générées automatiquement à partir des stocks, DLC, DDM et températures HACCP. En production, elles seront poussées en temps réel depuis Supabase.
      </div>
    </div>
  );
}
