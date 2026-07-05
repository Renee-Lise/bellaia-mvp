// ═══════════════════════════════════════════════════════════
// BELLA'FOOD — Module principal — Partie II complète
// src/modules/food/FoodF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import {
  FOOD_COLORS as FC, FOOD_STOCK_INIT, FOOD_CONSOMMABLES_INIT,
} from "./foodConsts";
import { getAlerteStock } from "./foodUtils";
import FoodDashboard   from "./FoodDashboard";
import FoodCatalogue   from "./FoodCatalogue";
import FoodRecettes    from "./FoodRecettes";
import FoodCommandes   from "./FoodCommandes";
import FoodStocks      from "./FoodStocks";
import FoodMateriel    from "./FoodMateriel";
import FoodCalculateur from "./FoodCalculateur";
import FoodImport      from "./FoodImport";
import FoodCourses     from "./FoodCourses";
import FoodAssistant   from "./FoodAssistant";
import FoodMenus       from "./FoodMenus";
import FoodPlanning    from "./FoodPlanning";
import FoodDevis       from "./FoodDevis";
import FoodRecherche   from "./FoodRecherche";
import type { CommandeFood, Recette } from "./foodTypes";

type Section =
  | "dashboard" | "catalogue" | "recettes" | "recherche"
  | "commandes" | "devis" | "menus" | "planning"
  | "stocks" | "materiel" | "consommables"
  | "calculateur" | "import" | "courses" | "assistant";

const SECTIONS: { id: Section; ico: string; label: string }[] = [
  {id:"dashboard",   ico:"◈",  label:"Accueil"},
  {id:"catalogue",   ico:"🛒",  label:"Catalogue"},
  {id:"recettes",    ico:"📖",  label:"Recettes"},
  {id:"recherche",   ico:"🔍",  label:"Recherche"},
  {id:"commandes",   ico:"📋",  label:"Commandes"},
  {id:"devis",       ico:"📄",  label:"Devis"},
  {id:"menus",       ico:"🍽",  label:"Menus"},
  {id:"planning",    ico:"📅",  label:"Planning"},
  {id:"stocks",      ico:"📦",  label:"Stocks"},
  {id:"materiel",    ico:"🧰",  label:"Matériel"},
  {id:"calculateur", ico:"💰",  label:"Calcul"},
  {id:"import",      ico:"📥",  label:"Import"},
  {id:"courses",     ico:"🛒",  label:"Courses"},
  {id:"assistant",   ico:"🤖",  label:"Assistant"},
];

export default function FoodF({ user }: { user?: any }) {
  const [section, setSection] = useState<Section>("dashboard");
  const [commandes] = useState<CommandeFood[]>([]);

  const alertes = getAlerteStock(FOOD_STOCK_INIT).length
               + getAlerteStock(FOOD_CONSOMMABLES_INIT).length;

  const titres: Record<Section, string> = {
    dashboard:"Bella'Food", catalogue:"Catalogue", recettes:"Recettes & fiches",
    recherche:"Rechercher une recette", commandes:"Commandes", devis:"Devis Food",
    menus:"Menus par événement", planning:"Planning de production",
    stocks:"Stocks matières", materiel:"Matériel & Consomm.",
    consommables:"Consommables", calculateur:"Calculateur de coût",
    import:"Importer une recette", courses:"Liste de courses", assistant:"Assistant Bellaïa",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh",
      background:"radial-gradient(ellipse at 15% 0%, #0a1f0a, #050e05 65%)",
      fontFamily:"system-ui, sans-serif", color:"#fff" }}>

      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${FC.line}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"rgba(0,0,0,0.4)", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:16, color:FC.or, letterSpacing:2 }}>
            🍃 Bella'Food
          </div>
          <div style={{ fontSize:9, color:FC.creamD, letterSpacing:2, marginTop:1 }}>
            CUISINE · PÂTISSERIE · BOISSONS · GLACERIE
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {alertes>0&&(
            <button onClick={()=>setSection("stocks")}
              style={{ background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)",
                borderRadius:99, padding:"3px 10px", color:"#f87171", fontSize:10,
                cursor:"pointer", fontWeight:700 }}>
              ⚠ {alertes} alerte{alertes>1?"s":""}
            </button>
          )}
          {section!=="dashboard"&&(
            <button onClick={()=>setSection("dashboard")}
              style={{ background:"none", border:`1px solid ${FC.line}`,
                borderRadius:8, padding:"4px 10px", color:FC.creamD, cursor:"pointer", fontSize:10 }}>
              ‹ Accueil
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", overflowX:"auto", borderBottom:`1px solid ${FC.line}`,
        background:"rgba(0,0,0,0.2)", flexShrink:0 }}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)}
            style={{ flex:"0 0 auto", padding:"8px 11px", border:"none", cursor:"pointer",
              background:"transparent", fontFamily:"system-ui,sans-serif",
              borderBottom:section===s.id?`2px solid ${FC.vert}`:"2px solid transparent",
              color:section===s.id?FC.vertL:"rgba(255,255,255,0.4)",
              fontSize:10, fontWeight:section===s.id?700:400,
              display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:15 }}>{s.ico}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Titre */}
      {section!=="dashboard"&&(
        <div style={{ padding:"12px 16px 0", fontSize:14, fontWeight:700, color:"#fff" }}>
          {titres[section]}
        </div>
      )}

      {/* Contenu */}
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>
        {section==="dashboard"  && <FoodDashboard commandes={commandes} stocks={FOOD_STOCK_INIT} consommables={FOOD_CONSOMMABLES_INIT} onNavigue={s=>setSection(s as Section)}/>}
        {section==="catalogue"  && <FoodCatalogue/>}
        {section==="recettes"   && <FoodRecettes/>}
        {section==="recherche"  && <FoodRecherche/>}
        {section==="commandes"  && <FoodCommandes/>}
        {section==="devis"      && <FoodDevis/>}
        {section==="menus"      && <FoodMenus/>}
        {section==="planning"   && <FoodPlanning/>}
        {section==="stocks"     && <FoodStocks/>}
        {(section==="materiel"||section==="consommables") && <FoodMateriel onglet={section==="consommables"?"consommables":"materiel"}/>}
        {section==="calculateur"&& <FoodCalculateur/>}
        {section==="import"     && <FoodImport onImporter={r=>{ alert("✅ Recette importée : "+(r.nom||"Sans nom")); }}/>}
        {section==="courses"    && <FoodCourses/>}
        {section==="assistant"  && <FoodAssistant/>}
      </div>
    </div>
  );
}
