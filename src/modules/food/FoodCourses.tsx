// ═══════════════════════════════════════════════════════════
// FoodCourses — Liste de courses intelligente Bella'Food
// Fusion ingrédients, stock, budget, export WhatsApp / impression
// src/modules/food/FoodCourses.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_RECETTES_INIT, FOOD_STOCK_INIT, FOOD_COLORS as FC } from "./foodConsts";
import {
  genererListeCourses, calculerBudgetCourses,
  exportCoursesWhatsApp, fmtPrix,
} from "./foodUtils";
import type { Recette, LigneCourses } from "./foodTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";

// ── Helpers UI ─────────────────────────────────────────────
const Btn = ({ onClick, children, v="default", full=false, disabled=false }: any) => {
  const styles: Record<string, React.CSSProperties> = {
    default: { background:FC.vert, color:"#fff", border:"none" },
    ghost:   { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.6)", border:"1px solid rgba(255,255,255,0.1)" },
    wa:      { background:"rgba(37,211,102,0.12)", color:"#25d366", border:"1px solid rgba(37,211,102,0.3)" },
    print:   { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.7)", border:"1px solid rgba(255,255,255,0.15)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...(styles[v]||styles.default), borderRadius:10, padding:"9px 14px",
        width:full?"100%":undefined, fontSize:12, fontWeight:700,
        cursor:disabled?"not-allowed":"pointer", fontFamily:SA, opacity:disabled?0.5:1 }}>
      {children}
    </button>
  );
};

export default function FoodCourses() {
  const [recettesSelectionnees, setRecettesSelectionnees] = useState<Set<string>>(new Set());
  const [coches,                setCoches]                = useState<Set<string>>(new Set());
  const [afficherDisponibles,   setAfficherDisponibles]   = useState(false);

  // Convertir stocks en map id→qte
  const stockMap = useMemo(() =>
    Object.fromEntries(FOOD_STOCK_INIT.map(s => [s.id, s.qteRestante])),
  []);

  // Recettes sélectionnées
  const recettesChoisies = useMemo(() =>
    FOOD_RECETTES_INIT.filter(r => recettesSelectionnees.has(r.id)),
  [recettesSelectionnees]);

  // Générer la liste de courses
  const lignes: LigneCourses[] = useMemo(() =>
    genererListeCourses(recettesChoisies, afficherDisponibles ? {} : stockMap),
  [recettesChoisies, stockMap, afficherDisponibles]);

  const budget = useMemo(() => calculerBudgetCourses(lignes), [lignes]);

  const lignesNonCochees = lignes.filter(l => !coches.has(l.ingredientId));
  const lignesCochees    = lignes.filter(l =>  coches.has(l.ingredientId));

  const toggleRecette = (id: string) => {
    setRecettesSelectionnees(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleCoche = (id: string) => {
    setCoches(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const ouvrirWhatsApp = () => {
    const msg = exportCoursesWhatsApp(lignes, budget);
    window.open("https://wa.me/?text="+encodeURIComponent(msg), "_blank");
  };

  const imprimer = () => {
    const lignesHtml = lignes.map(l => (
      `<tr><td>${l.nom}</td><td>${l.quantiteAacheter} ${l.unite}</td>`
      + `<td>${l.prixEstime ? (l.prixEstime*l.quantiteAacheter).toFixed(2)+"€" : "—"}</td>`
      + `<td>${(l.recettes||[]).join(", ")}</td></tr>`
    )).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste de courses</title>
<style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#065f46}
table{width:100%;border-collapse:collapse}th,td{padding:6px 10px;border:1px solid #e5e7eb;font-size:12px}
th{background:#065f46;color:#fff}.total{font-size:14px;font-weight:bold;color:#065f46;margin-top:16px}
@media print{button{display:none}}</style></head><body>
<h1>🛒 Liste de courses — Bella'Food</h1>
<p>${new Date().toLocaleDateString("fr-FR")} · ${recettesChoisies.map(r=>r.nom).join(", ")}</p>
<table><thead><tr><th>Ingrédient</th><th>Quantité</th><th>Coût est.</th><th>Recettes</th></tr></thead>
<tbody>${lignesHtml}</tbody></table>
<p class="total">Budget estimé : ${fmtPrix(budget)}</p>
</body></html>`;
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),400);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Sélection des recettes */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>
          SÉLECTIONNER LES RECETTES
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto" }}>
          {FOOD_RECETTES_INIT.map(r => (
            <div key={r.id} onClick={()=>toggleRecette(r.id)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"8px 10px", borderRadius:8, cursor:"pointer",
                background:recettesSelectionnees.has(r.id)?"rgba(21,128,61,0.15)":"rgba(255,255,255,0.03)",
                border:`1px solid ${recettesSelectionnees.has(r.id)?FC.vert:"rgba(255,255,255,0.06)"}` }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{r.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>
                  {r.nbParts} {r.nbParts>1?"portions":"portion"} · {r.ingredients.length} ingrédients
                </div>
              </div>
              <div style={{ width:18, height:18, borderRadius:"50%",
                background:recettesSelectionnees.has(r.id)?FC.vert:"rgba(255,255,255,0.1)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, color:"#fff" }}>
                {recettesSelectionnees.has(r.id) ? "✓" : ""}
              </div>
            </div>
          ))}
        </div>
        {recettesSelectionnees.size > 0 && (
          <div style={{ marginTop:8, fontSize:11, color:FC.creamD }}>
            {recettesSelectionnees.size} recette{recettesSelectionnees.size>1?"s":"" } sélectionnée{recettesSelectionnees.size>1?"s":""}
          </div>
        )}
      </div>

      {/* Options */}
      {recettesSelectionnees.size > 0 && (
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="checkbox" checked={afficherDisponibles}
            onChange={e=>setAfficherDisponibles(e.target.checked)}
            style={{ width:16, height:16, accentColor:FC.vert }} id="show_all"/>
          <label htmlFor="show_all" style={{ fontSize:11, color:FC.creamD, cursor:"pointer" }}>
            Afficher même les ingrédients déjà en stock
          </label>
        </div>
      )}

      {/* Liste de courses générée */}
      {recettesSelectionnees.size > 0 && lignes.length > 0 && (
        <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
          borderRadius:14, padding:"14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, letterSpacing:1 }}>
              🛒 LISTE ({lignes.length} articles)
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:FC.vert }}>
              {fmtPrix(budget)}
            </div>
          </div>

          {/* Articles restants */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
            {lignesNonCochees.map(l => (
              <div key={l.ingredientId} onClick={()=>toggleCoche(l.ingredientId)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"8px 10px", borderRadius:8, cursor:"pointer",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ width:16, height:16, borderRadius:3,
                    border:"1.5px solid rgba(255,255,255,0.3)",
                    background:"transparent", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:12, color:"#fff", fontWeight:500 }}>{l.nom}</div>
                    {l.recettes && l.recettes.length > 0 && (
                      <div style={{ fontSize:9, color:FC.creamD }}>
                        {l.recettes.slice(0,2).join(", ")}{l.recettes.length>2?" +"+( l.recettes.length-2):""}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:FC.vert }}>
                    {l.quantiteAacheter} {l.unite}
                  </div>
                  {l.prixEstime && (
                    <div style={{ fontSize:9, color:FC.creamD }}>
                      {fmtPrix(l.prixEstime * l.quantiteAacheter)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Articles cochés */}
          {lignesCochees.length > 0 && (
            <div>
              <div style={{ fontSize:9, color:FC.creamD, letterSpacing:1, marginBottom:6 }}>
                DÉJÀ ACHETÉS ({lignesCochees.length})
              </div>
              {lignesCochees.map(l => (
                <div key={l.ingredientId} onClick={()=>toggleCoche(l.ingredientId)}
                  style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px",
                    borderRadius:8, cursor:"pointer", opacity:0.4, marginBottom:4 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:16, height:16, borderRadius:3,
                      background:FC.vert, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:9, color:"#fff", flexShrink:0 }}>✓</div>
                    <span style={{ fontSize:11, color:FC.creamD, textDecoration:"line-through" }}>{l.nom}</span>
                  </div>
                  <span style={{ fontSize:11, color:FC.creamD }}>{l.quantiteAacheter} {l.unite}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {recettesSelectionnees.size > 0 && lignes.length === 0 && (
        <div style={{ textAlign:"center", padding:"20px", fontSize:12, color:FC.creamD }}>
          ✅ Tous les ingrédients sont en stock !
        </div>
      )}

      {/* Actions d'export */}
      {lignes.length > 0 && (
        <div style={{ display:"flex", gap:8 }}>
          <Btn v="wa" onClick={ouvrirWhatsApp}>💬 WhatsApp</Btn>
          <Btn v="print" onClick={imprimer}>🖨 Imprimer</Btn>
          <Btn v="ghost" onClick={()=>setCoches(new Set())}>Réinitialiser</Btn>
        </div>
      )}

      {recettesSelectionnees.size === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Sélectionnez des recettes pour générer la liste de courses.
        </div>
      )}
    </div>
  );
}
