import React, { useState } from "react";
import { FOOD_RECETTES_INIT, FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { fmtDuree, fmtPrix, calculerCoutRecette } from "./foodUtils";
import type { Recette } from "./foodTypes";

const STATUT_COL: Record<string, string> = {
  validee:     "rgba(21,128,61,0.2)",
  testee:      "rgba(201,168,76,0.2)",
  a_ameliorer: "rgba(251,146,60,0.2)",
  archivee:    "rgba(255,255,255,0.06)",
};
const STATUT_TXT: Record<string, string> = {
  validee: "#22c55e", testee: "#c9a96e", a_ameliorer: "#fb923c", archivee: "rgba(255,255,255,0.3)",
};
const ETOILES = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function FoodRecettes() {
  const [recettes, setRecettes] = useState<Recette[]>(FOOD_RECETTES_INIT);
  const [detail,   setDetail]   = useState<Recette | null>(null);
  const [filtCat,  setFiltCat]  = useState("tous");

  const filtrees = recettes.filter(r => filtCat === "tous" || r.categorie === filtCat);

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <button onClick={() => setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:8, padding:"5px 12px", color:"rgba(255,255,255,0.6)",
          cursor:"pointer", fontSize:11, fontFamily:"sans-serif" }}>
        ‹ Retour
      </button>

      {/* En-tête */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{detail.nom}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>
              {FOOD_CATEGORIES.find(c => c.id === detail.categorie)?.nom} · {detail.nbParts} part{detail.nbParts > 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <span style={{ fontSize:9, background: STATUT_COL[detail.statut],
              color: STATUT_TXT[detail.statut], borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
              {detail.statut.replace("_", " ")}
            </span>
            <span style={{ fontSize:11, color: FC.or }}>{ETOILES(detail.difficulte)}</span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Prépa",  val: fmtDuree(detail.tempsPrepa)     },
            { label:"Cuisson",val: fmtDuree(detail.tempsCuisson)   },
            { label:"Repos",  val: detail.tempsRepos ? fmtDuree(detail.tempsRepos) : "—" },
          ].map(t => (
            <div key={t.label} style={{ textAlign:"center", background:"rgba(255,255,255,0.04)",
              borderRadius:8, padding:"8px" }}>
              <div style={{ fontSize:11, fontWeight:700, color: FC.vert }}>{t.val}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingrédients */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color: FC.or, marginBottom:10, letterSpacing:1 }}>
          INGRÉDIENTS
        </div>
        {detail.ingredients.map(ing => (
          <div key={ing.id} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>{ing.nom}</span>
            <span style={{ fontSize:12, color: FC.or, fontWeight:600 }}>
              {ing.quantite} {ing.unite}
            </span>
          </div>
        ))}
        {detail.coutMatiere != null && (
          <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
            Coût matière estimé : {fmtPrix(detail.coutMatiere)}
          </div>
        )}
      </div>

      {/* Épices & protéines */}
      {(detail.epices?.length || detail.proteines?.length) && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {detail.epices?.map(e => (
            <span key={e} style={{ fontSize:10, background:"rgba(201,168,76,0.15)",
              color: FC.or, borderRadius:99, padding:"3px 10px" }}>🌿 {e}</span>
          ))}
          {detail.proteines?.map(p => (
            <span key={p} style={{ fontSize:10, background:"rgba(21,128,61,0.15)",
              color: FC.vertL, borderRadius:99, padding:"3px 10px" }}>🥩 {p}</span>
          ))}
        </div>
      )}

      {/* Étapes */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color: FC.or, marginBottom:10, letterSpacing:1 }}>
          ÉTAPES
        </div>
        {detail.etapes.map((e, i) => (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background: FC.vert,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {i + 1}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", lineHeight:1.6, paddingTop:2 }}>{e}</div>
          </div>
        ))}
      </div>

      {/* Prix */}
      {detail.prixConseille && (
        <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"14px", display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Prix conseillé</div>
            <div style={{ fontSize:18, fontWeight:700, color: FC.or }}>{fmtPrix(detail.prixConseille)}</div>
          </div>
          {detail.margeEstimee && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Marge estimée</div>
              <div style={{ fontSize:16, fontWeight:700, color: FC.vertL }}>{fmtPrix(detail.margeEstimee)}</div>
            </div>
          )}
        </div>
      )}

      {detail.conservation && (
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>
          Conservation : {detail.conservation}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Filtres */}
      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
        {["tous", ...FOOD_CATEGORIES.map(c => c.id)].map(id => (
          <button key={id} onClick={() => setFiltCat(id)}
            style={{ padding:"5px 12px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, flexShrink:0, fontFamily:"sans-serif",
              background: filtCat === id ? FC.vert : "rgba(255,255,255,0.06)",
              color: filtCat === id ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {id === "tous" ? "Toutes" : FOOD_CATEGORIES.find(c => c.id === id)?.nom || id}
          </button>
        ))}
      </div>

      {/* Liste recettes */}
      {filtrees.map(r => (
        <div key={r.id} onClick={() => setDetail(r)}
          style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{r.nom}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:2 }}>
                {r.nbParts} parts · {fmtDuree(r.tempsPrepa + r.tempsCuisson)} au total
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
              <span style={{ fontSize:9, background: STATUT_COL[r.statut],
                color: STATUT_TXT[r.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                {r.statut.replace("_", " ")}
              </span>
              {r.prixConseille && (
                <span style={{ fontSize:12, color: FC.or, fontWeight:700 }}>
                  {fmtPrix(r.prixConseille)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
            {r.ingredients.slice(0, 3).map(i => (
              <span key={i.id} style={{ fontSize:9, color:"rgba(255,255,255,0.35)",
                background:"rgba(255,255,255,0.05)", borderRadius:4, padding:"1px 6px" }}>
                {i.nom}
              </span>
            ))}
            {r.ingredients.length > 3 && (
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>
                +{r.ingredients.length - 3}
              </span>
            )}
          </div>
        </div>
      ))}
      {filtrees.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
          Aucune recette dans cette catégorie.
        </div>
      )}
    </div>
  );
}
