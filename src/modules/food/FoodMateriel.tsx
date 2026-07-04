import React, { useState } from "react";
import { FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT, FOOD_COLORS as FC } from "./foodConsts";
import type { Materiel, Consommable } from "./foodTypes";

const ETAT_COL: Record<string, string> = {
  neuf:"#22c55e", bon:"#22c55e", a_remplacer:"#fb923c", manquant:"#f87171"
};
const ETAT_BG: Record<string, string> = {
  neuf:"rgba(21,128,61,0.15)", bon:"rgba(21,128,61,0.1)",
  a_remplacer:"rgba(251,146,60,0.15)", manquant:"rgba(248,113,113,0.15)"
};
const PRIO_COL: Record<string, string> = {
  urgent:"#f87171", utile:"#fb923c", plus_tard:"rgba(255,255,255,0.4)"
};
const CONSO_COL: Record<string, string> = {
  disponible:"#22c55e", faible:"#fb923c", rupture:"#f87171"
};

interface Props { onglet?: "materiel" | "consommables"; }

export default function FoodMateriel({ onglet: ongletInit = "materiel" }: Props) {
  const [onglet,       setOnglet]       = useState<"materiel"|"consommables">(ongletInit);
  const [materiel,     setMateriel]     = useState<Materiel[]>(FOOD_MATERIEL_INIT);
  const [consommables, setConsommables] = useState<Consommable[]>(FOOD_CONSOMMABLES_INIT);
  const [search,       setSearch]       = useState("");

  const fmtMateriel  = materiel.filter(m =>
    !search || m.nom.toLowerCase().includes(search.toLowerCase()));
  const fmtConso = consommables.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()));

  const urgents     = materiel.filter(m => m.priorite === "urgent" && m.etat === "manquant").length;
  const conso_alerte = consommables.filter(c => c.statut !== "disponible").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Onglets */}
      <div style={{ display:"flex", gap:6 }}>
        {([["materiel","🧰 Matériel"], ["consommables","🛍 Consommables"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setOnglet(id)}
            style={{ flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, fontFamily:"sans-serif",
              background: onglet === id ? FC.vert : "rgba(255,255,255,0.06)",
              color: onglet === id ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {label}
            {id === "materiel" && urgents > 0 &&
              <span style={{ marginLeft:6, background:"#f87171", color:"#fff",
                borderRadius:99, padding:"1px 6px", fontSize:9 }}>{urgents}</span>}
            {id === "consommables" && conso_alerte > 0 &&
              <span style={{ marginLeft:6, background:"#fb923c", color:"#fff",
                borderRadius:99, padding:"1px 6px", fontSize:9 }}>{conso_alerte}</span>}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher..."
        style={{ width:"100%", background:"rgba(255,255,255,0.07)",
          border:`1px solid ${FC.line}`, borderRadius:10, padding:"9px 13px",
          color:"#fff", fontSize:13, fontFamily:"sans-serif", outline:"none",
          boxSizing:"border-box" as any }} />

      {/* Matériel */}
      {onglet === "materiel" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {fmtMateriel.map(m => (
            <div key={m.id} style={{ background:"rgba(255,255,255,0.04)",
              border:`1px solid ${m.priorite === "urgent" && m.etat === "manquant" ? "rgba(248,113,113,0.3)" : FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.nom}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
                    {m.categorie} · {m.qteDispo} disponible{m.qteDispo > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:9, background: ETAT_BG[m.etat], color: ETAT_COL[m.etat],
                    borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                    {m.etat.replace("_"," ")}
                  </span>
                  <span style={{ fontSize:9, color: PRIO_COL[m.priorite], fontWeight:700 }}>
                    {m.priorite === "urgent" ? "⚡ URGENT" : m.priorite === "utile" ? "Utile" : "Plus tard"}
                  </span>
                </div>
              </div>
              {m.utilite && <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>{m.utilite}</div>}
              {m.prixAchat && <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:4 }}>Prix : {m.prixAchat}€</div>}
            </div>
          ))}
        </div>
      )}

      {/* Consommables */}
      {onglet === "consommables" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {fmtConso.map(c => (
            <div key={c.id} style={{ background:"rgba(255,255,255,0.04)",
              border:`1px solid ${c.statut !== "disponible" ? "rgba(251,146,60,0.3)" : FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{c.nom}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
                    {c.categorie}
                    {c.qteParProduit ? ` · ${c.qteParProduit} / produit` : ""}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:9, background: c.statut === "disponible" ? "rgba(21,128,61,0.15)" : c.statut === "faible" ? "rgba(251,146,60,0.15)" : "rgba(248,113,113,0.15)",
                    color: CONSO_COL[c.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                    {c.statut.replace("_"," ")}
                  </span>
                  <span style={{ fontSize:13, fontWeight:700, color: c.qteDispo <= c.seuilAlerte ? "#fb923c" : FC.or }}>
                    {c.qteDispo}
                  </span>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Seuil alerte : {c.seuilAlerte}</span>
                {c.coutUnitaire && <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{c.coutUnitaire}€ / unité</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
