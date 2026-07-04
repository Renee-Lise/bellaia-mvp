import React, { useState } from "react";
import { FOOD_STOCK_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { getAlerteStock, fmtPrix } from "./foodUtils";
import type { StockItem } from "./foodTypes";

export default function FoodStocks() {
  const [stocks, setStocks] = useState<StockItem[]>(FOOD_STOCK_INIT);
  const [search, setSearch] = useState("");

  const alertes = new Set(getAlerteStock(stocks).map(s => s.id));
  const filtres = stocks.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));

  const majQte = (id: string, delta: number) => {
    setStocks(ss => ss.map(s => s.id === id
      ? { ...s, qteRestante: Math.max(0, Math.round((s.qteRestante + delta) * 100) / 100) }
      : s
    ));
  };

  const statut = (s: StockItem) => {
    if (s.qteRestante === 0) return { txt:"Rupture", col:"#f87171", bg:"rgba(248,113,113,0.15)" };
    if (s.qteRestante <= s.seuilAlerte) return { txt:"Faible", col:"#fb923c", bg:"rgba(251,146,60,0.15)" };
    return { txt:"OK", col:"#22c55e", bg:"rgba(21,128,61,0.12)" };
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Alertes */}
      {alertes.size > 0 && (
        <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:10, padding:"10px 13px", fontSize:12, color:"#f87171" }}>
          ⚠ {alertes.size} produit{alertes.size > 1 ? "s" : ""} sous le seuil d'alerte
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher..."
        style={{ width:"100%", background:"rgba(255,255,255,0.07)",
          border:`1px solid ${FC.line}`, borderRadius:10, padding:"9px 13px",
          color:"#fff", fontSize:13, fontFamily:"sans-serif", outline:"none",
          boxSizing:"border-box" as any }} />

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtres.map(s => {
          const st = statut(s);
          return (
            <div key={s.id} style={{ background:"rgba(255,255,255,0.04)",
              border:`1px solid ${alertes.has(s.id) ? "rgba(248,113,113,0.3)" : FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{s.nom}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
                    {s.categorie} · {s.fournisseur || "fournisseur non défini"}
                  </div>
                </div>
                <span style={{ fontSize:9, background: st.bg, color: st.col,
                  borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>
                  {st.txt}
                </span>
              </div>

              {/* Barre de stock */}
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:6, marginBottom:8 }}>
                <div style={{
                  height:6, borderRadius:99,
                  width: `${Math.min(100, (s.qteRestante / Math.max(s.seuilAlerte * 3, s.qteRestante + 1)) * 100)}%`,
                  background: alertes.has(s.id) ? "#f87171" : FC.vert,
                  transition:"width 0.3s",
                }} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontSize:14, fontWeight:700,
                    color: alertes.has(s.id) ? "#f87171" : FC.or }}>
                    {s.qteRestante} {s.unite}
                  </span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:6 }}>
                    / seuil {s.seuilAlerte}
                  </span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => majQte(s.id, -0.5)}
                    style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:6,
                      padding:"4px 10px", color:"#f87171", cursor:"pointer", fontSize:12 }}>−</button>
                  <button onClick={() => majQte(s.id, 0.5)}
                    style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:6,
                      padding:"4px 10px", color:"#22c55e", cursor:"pointer", fontSize:12 }}>+</button>
                </div>
              </div>
              {s.prixAchat && (
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:4 }}>
                  Prix achat : {fmtPrix(s.prixAchat)} / {s.unite}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
