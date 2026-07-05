// ═══════════════════════════════════════════════════════════
// FoodRecherche — Moteur de recherche recettes Bella'Food Partie II
// Multi-critères : texte, catégorie, temps, budget, allergènes
// Export fiche cuisine/laboratoire/réseaux HTML
// src/modules/food/FoodRecherche.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_RECETTES_INIT, FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { rechercherRecettes, genererFicheHTML, fmtDuree, fmtPrix } from "./foodUtils";
import type { CriteresRecherche, TypeFiche } from "./foodTypes";

const SA = "system-ui, sans-serif";
const ETOILES = (n:number) => "★".repeat(n)+"☆".repeat(5-n);

const ALLERGENES_COMMUNS = ["gluten","lait","oeufs","arachides","fruits à coque","soja","crustacés","poisson","moutarde","céleri"];

const FICHES: {id:TypeFiche;nom:string;ico:string}[] = [
  {id:"cuisine",    nom:"Fiche cuisine",    ico:"🍳"},
  {id:"laboratoire",nom:"Fiche labo",       ico:"🔬"},
  {id:"haccp",      nom:"Fiche HACCP",      ico:"✅"},
  {id:"reseaux",    nom:"Publication RS",   ico:"📱"},
  {id:"impression", nom:"Impression",       ico:"🖨"},
];

export default function FoodRecherche() {
  const [criteres, setCriteres] = useState<CriteresRecherche>({});
  const [filtrePaneau, setFiltrePaneau] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState<string|null>(null);
  const [typeFiche, setTypeFiche] = useState<TypeFiche>("cuisine");

  const resultats = useMemo(() => rechercherRecettes(criteres), [criteres]);

  const maj = (k: keyof CriteresRecherche, v: any) =>
    setCriteres(c => ({ ...c, [k]: v || undefined }));

  const toggleAllergene = (a: string) =>
    setCriteres(c => {
      const list = c.allergenes||[];
      return { ...c, allergenes: list.includes(a) ? list.filter(x=>x!==a) : [...list,a] };
    });

  const ouvrirFiche = (recetteId: string, type: TypeFiche) => {
    const r = FOOD_RECETTES_INIT.find(x=>x.id===recetteId);
    if (!r) return;
    let html = genererFicheHTML(r, type);

    if (type==="reseaux") {
      // Format réseau social simplifié
      const txt = [
        `✨ ${r.nom}`,
        "",
        `📋 ${r.nbParts} portions · ${fmtDuree((r.tempsPrepa||0)+(r.tempsCuisson||0))} · ${"★".repeat(r.difficulte||3)}`,
        "",
        "🥗 Ingrédients principaux :",
        ...r.ingredients.slice(0,5).map(i=>`• ${i.nom} — ${i.quantite} ${i.unite}`),
        r.ingredients.length>5 ? `…et ${r.ingredients.length-5} autres` : "",
        "",
        "📌 Bella'Food — Sinnamary, Guyane",
        "#bellafood #bellaïa #patisserie #guyane",
      ].join("\n");
      html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>${r.nom}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:0 auto;background:#fafafa}
.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#15803d;font-size:20px;margin:0 0 8px}pre{white-space:pre-wrap;font-family:Arial;font-size:13px;line-height:1.7}
button{background:#15803d;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:12px}
</style></head><body><div class='card'><h1>${r.nom}</h1><pre>${txt}</pre>
<button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent).then(()=>alert('Copié ✅'))">📋 Copier pour les réseaux</button>
</div></body></html>`;
    } else if (type==="haccp") {
      html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>HACCP — ${r.nom}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px}
h1{color:#15803d}table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{padding:6px 10px;border:1px solid #ccc;font-size:12px}thead{background:#15803d;color:#fff}
.risque{background:#fff3cd}
</style></head><body>
<h1>✅ Fiche HACCP — ${r.nom}</h1>
<p>Date : ${new Date().toLocaleDateString("fr-FR")} · Préparateur : Bella'Food</p>
<table><thead><tr><th>Étape</th><th>Risque potentiel</th><th>Mesure préventive</th><th>Température</th></tr></thead>
<tbody>
<tr><td>Réception matières premières</td><td class='risque'>Contamination, DLC dépassée</td><td>Vérifier DLC, état, température</td><td>Froid : ≤4°C</td></tr>
<tr><td>Stockage</td><td class='risque'>Prolifération bactérienne</td><td>Respecter les zones de stockage</td><td>Réfrig. ≤4°C / Congel. ≤-18°C</td></tr>
<tr><td>Préparation</td><td class='risque'>Contamination croisée</td><td>Plan de travail propre, gants</td><td>Ambiante ≤25°C</td></tr>
${r.tempsCuisson>0?`<tr><td>Cuisson</td><td>Survie pathogènes</td><td>Température à cœur atteinte</td><td>${r.temperature||"≥75"}°C à cœur</td></tr>`:""}
<tr><td>Refroidissement</td><td class='risque'>Zone dangereuse 10-63°C</td><td>Refroidir rapidement</td><td>Passer de 63°C à 10°C en <2h</td></tr>
<tr><td>Conservation</td><td class='risque'>Prolifération</td><td>${r.conservation||"Suivre préconisations recette"}</td><td>≤4°C</td></tr>
<tr><td>Livraison</td><td class='risque'>Rupture chaîne du froid</td><td>Glacière, transport rapide</td><td>≤8°C pendant transport</td></tr>
</tbody></table>
${r.allergenes?.length?`<p><strong>⚠️ Allergènes déclarés :</strong> ${r.allergenes.join(", ")}</p>`:""}
<p style='font-size:10px;color:#6b7280;margin-top:16px'>Document préparatoire — non substitutif à une certification officielle HACCP</p>
</body></html>`;
    }

    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),400);
  };

  const inpStyle: React.CSSProperties = {
    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:8, padding:"7px 9px", color:"#fff", fontSize:12,
    fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Recherche principale */}
      <input value={criteres.texte||""}
        onChange={e=>maj("texte",e.target.value)}
        placeholder="🔍 Rechercher une recette (nom, ingrédient, tag…)"
        style={{ ...inpStyle, padding:"10px 13px", fontSize:13 }}/>

      {/* Toggle filtres avancés */}
      <button onClick={()=>setFiltrePaneau(f=>!f)}
        style={{ alignSelf:"flex-start", background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.12)", borderRadius:8,
          padding:"5px 12px", color:"rgba(255,255,255,0.6)",
          cursor:"pointer", fontSize:11, fontFamily:SA }}>
        {filtrePaneau?"▲ Masquer les filtres":"▼ Filtres avancés"}
      </button>

      {filtrePaneau && (
        <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
          {/* Catégorie */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Catégorie</label>
            <select value={criteres.categorie||""} onChange={e=>maj("categorie",e.target.value)}
              style={{ ...inpStyle, background:"#1a1a2e" }}>
              <option value="">Toutes</option>
              {FOOD_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.ico} {c.nom}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Difficulté max</label>
              <select value={criteres.difficulteMax||""} onChange={e=>maj("difficulteMax",e.target.value?parseInt(e.target.value):undefined)}
                style={{ ...inpStyle, background:"#1a1a2e" }}>
                <option value="">Toutes</option>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{ETOILES(n)}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Temps max (min)</label>
              <input type="number" min={0} step={15} value={criteres.tempsMaxMin||""}
                onChange={e=>maj("tempsMaxMin",e.target.value?parseInt(e.target.value):undefined)}
                placeholder="ex: 60" style={inpStyle}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Budget max (€)</label>
              <input type="number" min={0} step={1} value={criteres.budgetMax||""}
                onChange={e=>maj("budgetMax",e.target.value?parseFloat(e.target.value):undefined)}
                placeholder="ex: 10" style={inpStyle}/>
            </div>
          </div>
          {/* Allergènes à exclure */}
          <div>
            <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:6 }}>
              Exclure les allergènes
            </label>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {ALLERGENES_COMMUNS.map(a=>{
                const actif = criteres.allergenes?.includes(a);
                return (
                  <button key={a} onClick={()=>toggleAllergene(a)}
                    style={{ fontSize:9, padding:"3px 9px", borderRadius:99, cursor:"pointer",
                      border:`1px solid ${actif?"#f87171":"rgba(255,255,255,0.15)"}`,
                      background:actif?"rgba(248,113,113,0.15)":"rgba(255,255,255,0.04)",
                      color:actif?"#f87171":"rgba(255,255,255,0.5)", fontFamily:SA }}>
                    {actif?"✕ ":""}{a}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={()=>setCriteres({})}
            style={{ alignSelf:"flex-start", background:"transparent",
              border:"1px solid rgba(255,255,255,0.15)", borderRadius:8,
              padding:"4px 12px", color:"rgba(255,255,255,0.4)",
              cursor:"pointer", fontSize:10, fontFamily:SA }}>
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Résultats */}
      <div style={{ fontSize:11, color:FC.creamD }}>
        {resultats.length} recette{resultats.length>1?"s":""} trouvée{resultats.length>1?"s":""}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {resultats.map(r => (
          <div key={r.id} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"13px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{r.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD, marginTop:2 }}>
                  {FOOD_CATEGORIES.find(c=>c.id===r.categorie)?.nom||r.categorie}
                  {" · "}{ETOILES(r.difficulte)}
                  {" · "}{fmtDuree((r.tempsPrepa||0)+(r.tempsCuisson||0))}
                  {" · "}{r.nbParts} portion{r.nbParts>1?"s":""}
                </div>
                {r.coutMatiere&&<div style={{ fontSize:10, color:FC.or, marginTop:2 }}>
                  Coût : {fmtPrix(r.coutMatiere)}
                  {r.prixConseille?" → conseillé "+fmtPrix(r.prixConseille):""}
                </div>}
              </div>
              <div style={{ display:"flex", gap:4, flexDirection:"column", alignItems:"flex-end" }}>
                {r.allergenes?.length&&(
                  <div style={{ fontSize:8, color:"#fb923c", background:"rgba(251,146,60,0.1)",
                    borderRadius:4, padding:"1px 5px" }}>⚠ {r.allergenes.length} allergène{r.allergenes.length>1?"s":""}</div>
                )}
              </div>
            </div>

            {/* Tags */}
            {r.tags?.length&&(
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
                {r.tags.slice(0,4).map(t=>(
                  <span key={t} style={{ fontSize:8, background:"rgba(21,128,61,0.15)", color:FC.vertL,
                    borderRadius:3, padding:"1px 6px" }}>{t}</span>
                ))}
              </div>
            )}

            {/* Sélecteur fiche */}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {FICHES.map(f=>(
                <button key={f.id} onClick={()=>ouvrirFiche(r.id, f.id)}
                  style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                    color:"rgba(255,255,255,0.6)", fontFamily:SA }}>
                  {f.ico} {f.nom}
                </button>
              ))}
            </div>
          </div>
        ))}

        {resultats.length===0 && (
          <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
            Aucune recette ne correspond aux critères.
          </div>
        )}
      </div>
    </div>
  );
}
