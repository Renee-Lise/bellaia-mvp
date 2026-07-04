import React, { useState } from "react";
import { FOOD_CATALOGUE, FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import type { Produit } from "./foodTypes";

interface Props {
  onSelectionner?: (produit: Produit) => void;
}

export default function FoodCatalogue({ onSelectionner }: Props) {
  const [cat,    setCat]    = useState("tous");
  const [search, setSearch] = useState("");

  const produitsFiltres = FOOD_CATALOGUE.filter(p => {
    const matchCat    = cat === "tous" || p.categorie === cat;
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.disponible;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Recherche */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher un produit..."
        style={{ width:"100%", background:"rgba(255,255,255,0.07)",
          border:`1px solid ${FC.line}`, borderRadius:10, padding:"9px 13px",
          color:"#fff", fontSize:13, fontFamily:"sans-serif",
          outline:"none", boxSizing:"border-box" }}
      />

      {/* Filtres catégorie */}
      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
        <button key="tous" onClick={() => setCat("tous")}
          style={{ padding:"5px 12px", borderRadius:99, border:"none", cursor:"pointer",
            fontSize:10, fontWeight:700, flexShrink:0, fontFamily:"sans-serif",
            background: cat === "tous" ? FC.vert : "rgba(255,255,255,0.06)",
            color: cat === "tous" ? "#fff" : "rgba(255,255,255,0.5)" }}>
          Tous
        </button>
        {FOOD_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ padding:"5px 12px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, flexShrink:0, fontFamily:"sans-serif",
              background: cat === c.id ? FC.vert : "rgba(255,255,255,0.06)",
              color: cat === c.id ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {c.ico} {c.nom}
          </button>
        ))}
      </div>

      {/* Compteur */}
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
        {produitsFiltres.length} produit{produitsFiltres.length > 1 ? "s" : ""}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {produitsFiltres.map(p => (
          <div key={p.id}
            onClick={() => onSelectionner?.(p)}
            style={{ background:"rgba(255,255,255,0.04)",
              border:`1px solid ${FC.line}`, borderRadius:12, padding:"13px 14px",
              cursor: onSelectionner ? "pointer" : "default",
              display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:3 }}>
                {p.nom}
              </div>
              {p.description && (
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.5 }}>
                  {p.description}
                </div>
              )}
              <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                <span style={{ fontSize:9, background:"rgba(21,128,61,0.15)", color: FC.vertL,
                  borderRadius:4, padding:"2px 6px", fontWeight:700 }}>
                  {FOOD_CATEGORIES.find(c => c.id === p.categorie)?.nom || p.categorie}
                </span>
                {p.visibleEvents && (
                  <span style={{ fontSize:9, background:"rgba(16,185,129,0.1)", color:"#10b981",
                    borderRadius:4, padding:"2px 6px", fontWeight:700 }}>
                    ✨ Events
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
              <div style={{ fontSize:14, fontWeight:700, color: FC.or }}>
                {p.prix != null ? fmtPrix(p.prix) : "Sur devis"}
              </div>
              {p.unite && <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:1 }}>/ {p.unite}</div>}
            </div>
          </div>
        ))}
        {produitsFiltres.length === 0 && (
          <div style={{ textAlign:"center", padding:"28px", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
            Aucun produit trouvé.
          </div>
        )}
      </div>
    </div>
  );
}
