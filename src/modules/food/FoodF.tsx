// ═══════════════════════════════════════════════════════════
// BELLA'FOOD — Module principal — Parties I + II + III + IV
// src/modules/food/FoodF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_COLORS as FC, FOOD_STOCK_INIT, FOOD_CONSOMMABLES_INIT } from "./foodConsts";
import { getAlerteStock, genererAlertesStock } from "./foodUtils";
// Parties I & II
import FoodDashboard    from "./FoodDashboard";
import FoodCatalogue    from "./FoodCatalogue";
import FoodRecettes     from "./FoodRecettes";
import FoodCommandes    from "./FoodCommandes";
import FoodStocks       from "./FoodStocks";
import FoodMateriel     from "./FoodMateriel";
import FoodCalculateur  from "./FoodCalculateur";
import FoodImport       from "./FoodImport";
import FoodCourses      from "./FoodCourses";
import FoodAssistant    from "./FoodAssistant";
import FoodMenus        from "./FoodMenus";
import FoodPlanning     from "./FoodPlanning";
import FoodDevis        from "./FoodDevis";
import FoodRecherche    from "./FoodRecherche";
// Partie III
import FoodDashboardPro from "./FoodDashboardPro";
import FoodFournisseurs from "./FoodFournisseurs";
import FoodAchats       from "./FoodAchats";
import FoodInventaire   from "./FoodInventaire";
import FoodProduction   from "./FoodProduction";
import FoodHACCP        from "./FoodHACCP";
import FoodAlertes      from "./FoodAlertes";
// Partie IV
import FoodVersions     from "./FoodVersions";
import FoodPertes       from "./FoodPertes";
import FoodEtiquettes   from "./FoodEtiquettes";
import FoodPredictif    from "./FoodPredictif";
import FoodExports      from "./FoodExports";
import type { CommandeFood } from "./foodTypes";

type Section =
  | "dashboard" | "catalogue" | "recettes" | "recherche"
  | "commandes" | "devis" | "menus" | "planning"
  | "stocks" | "materiel" | "consommables"
  | "calculateur" | "import" | "courses" | "assistant"
  | "dashboard_pro" | "fournisseurs" | "achats"
  | "inventaire" | "production" | "haccp" | "alertes"
  | "versions" | "pertes" | "etiquettes" | "predictif" | "exports";

const NAV = [
  {groupe:"PILOTAGE",   items:[
    {id:"dashboard_pro" as Section, ico:"📊", label:"Dashboard"},
    {id:"alertes"        as Section, ico:"🔔", label:"Alertes"},
    {id:"predictif"      as Section, ico:"🤖", label:"Prédictif"},
    {id:"exports"        as Section, ico:"📤", label:"Exports"},
  ]},
  {groupe:"VENTES",     items:[
    {id:"commandes"    as Section, ico:"📋", label:"Commandes"},
    {id:"devis"        as Section, ico:"📄", label:"Devis"},
    {id:"menus"        as Section, ico:"🍽",  label:"Menus"},
  ]},
  {groupe:"PRODUCTION", items:[
    {id:"recettes"    as Section, ico:"📖", label:"Recettes"},
    {id:"versions"    as Section, ico:"🔀", label:"Versions"},
    {id:"production"  as Section, ico:"🏭", label:"Production"},
    {id:"planning"    as Section, ico:"📅", label:"Planning"},
    {id:"pertes"      as Section, ico:"📉", label:"Pertes"},
    {id:"etiquettes"  as Section, ico:"🏷",  label:"Étiquettes"},
    {id:"haccp"       as Section, ico:"✅", label:"HACCP"},
  ]},
  {groupe:"ACHATS",     items:[
    {id:"achats"       as Section, ico:"🛒", label:"Achats"},
    {id:"fournisseurs" as Section, ico:"🏪", label:"Fournisseurs"},
    {id:"stocks"       as Section, ico:"📦", label:"Stocks"},
    {id:"inventaire"   as Section, ico:"🔢", label:"Inventaire"},
    {id:"courses"      as Section, ico:"🛍",  label:"Courses"},
  ]},
  {groupe:"OUTILS",     items:[
    {id:"catalogue"   as Section, ico:"🛍",  label:"Catalogue"},
    {id:"recherche"   as Section, ico:"🔍", label:"Recherche"},
    {id:"calculateur" as Section, ico:"💰", label:"Calcul"},
    {id:"import"      as Section, ico:"📥", label:"Import"},
    {id:"assistant"   as Section, ico:"💬", label:"Assistant"},
    {id:"materiel"    as Section, ico:"🧰", label:"Matériel"},
    {id:"dashboard"   as Section, ico:"◈",  label:"Accueil"},
  ]},
];

const ALL_SECTIONS = NAV.flatMap(g => g.items);

export default function FoodF({ user }: { user?: any }) {
  const [section, setSection] = useState<Section>("dashboard_pro");
  const [commandes] = useState<CommandeFood[]>([]);

  const nbAlertes = getAlerteStock(FOOD_STOCK_INIT).length
                  + getAlerteStock(FOOD_CONSOMMABLES_INIT).length;

  const titres: Record<Section, string> = {
    dashboard:"Accueil", catalogue:"Catalogue", recettes:"Recettes",
    recherche:"Rechercher", commandes:"Commandes", devis:"Devis",
    menus:"Menus", planning:"Planning", stocks:"Stocks",
    materiel:"Matériel", consommables:"Consommables",
    calculateur:"Calculateur", import:"Import recette",
    courses:"Liste de courses", assistant:"Assistant",
    dashboard_pro:"Dashboard Pro", fournisseurs:"Fournisseurs",
    achats:"Achats", inventaire:"Inventaire",
    production:"Production", haccp:"HACCP", alertes:"Alertes",
    versions:"Versions de recettes", pertes:"Pertes",
    etiquettes:"Étiquettes", predictif:"Assistant prédictif", exports:"Exports",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh",
      background:"radial-gradient(ellipse at 15% 0%,#0a1f0a,#050e05 65%)",
      fontFamily:"system-ui,sans-serif", color:"#fff" }}>

      {/* Header */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${FC.line}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"rgba(0,0,0,0.4)", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:15, color:FC.or, letterSpacing:2 }}>
            🍃 Bella'Food
          </div>
          <div style={{ fontSize:8, color:FC.creamD, letterSpacing:1 }}>
            PRODUCTION · ACHATS · HACCP · IA · ERP
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {nbAlertes > 0 && (
            <button onClick={() => setSection("alertes")}
              style={{ background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)",
                borderRadius:99, padding:"3px 9px", color:"#f87171", fontSize:10,
                cursor:"pointer", fontWeight:700 }}>
              🔔 {nbAlertes}
            </button>
          )}
          {section !== "dashboard_pro" && (
            <button onClick={() => setSection("dashboard_pro")}
              style={{ background:"none", border:`1px solid ${FC.line}`,
                borderRadius:8, padding:"3px 9px", color:FC.creamD, cursor:"pointer", fontSize:10 }}>
              📊
            </button>
          )}
        </div>
      </div>

      {/* Nav scrollable */}
      <div style={{ display:"flex", overflowX:"auto", borderBottom:`1px solid ${FC.line}`,
        background:"rgba(0,0,0,0.2)", flexShrink:0 }}>
        {ALL_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flex:"0 0 auto", padding:"7px 9px", border:"none", cursor:"pointer",
              background:"transparent", fontFamily:"system-ui,sans-serif",
              borderBottom:section===s.id?`2px solid ${FC.vert}`:"2px solid transparent",
              color:section===s.id?FC.vertL:"rgba(255,255,255,0.35)",
              fontSize:9, fontWeight:section===s.id?700:400,
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              transition:"color 0.15s" }}>
            <span style={{ fontSize:14 }}>{s.ico}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Titre section */}
      {!["dashboard_pro","dashboard"].includes(section) && (
        <div style={{ padding:"10px 14px 0", fontSize:13, fontWeight:700, color:"#fff" }}>
          {titres[section]}
        </div>
      )}

      {/* Contenu */}
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        {section==="dashboard_pro" && <FoodDashboardPro commandes={commandes}/>}
        {section==="dashboard"     && <FoodDashboard commandes={commandes} stocks={FOOD_STOCK_INIT} consommables={FOOD_CONSOMMABLES_INIT} onNavigue={s=>setSection(s as Section)}/>}
        {section==="alertes"       && <FoodAlertes/>}
        {section==="predictif"     && <FoodPredictif/>}
        {section==="exports"       && <FoodExports/>}
        {section==="catalogue"     && <FoodCatalogue/>}
        {section==="recettes"      && <FoodRecettes/>}
        {section==="versions"      && <FoodVersions/>}
        {section==="recherche"     && <FoodRecherche/>}
        {section==="commandes"     && <FoodCommandes/>}
        {section==="devis"         && <FoodDevis/>}
        {section==="menus"         && <FoodMenus/>}
        {section==="planning"      && <FoodPlanning/>}
        {section==="production"    && <FoodProduction/>}
        {section==="pertes"        && <FoodPertes/>}
        {section==="etiquettes"    && <FoodEtiquettes/>}
        {section==="haccp"         && <FoodHACCP/>}
        {section==="fournisseurs"  && <FoodFournisseurs/>}
        {section==="achats"        && <FoodAchats/>}
        {section==="stocks"        && <FoodStocks/>}
        {section==="inventaire"    && <FoodInventaire/>}
        {section==="courses"       && <FoodCourses/>}
        {(section==="materiel"||section==="consommables") && <FoodMateriel onglet={section==="consommables"?"consommables":"materiel"}/>}
        {section==="calculateur"   && <FoodCalculateur/>}
        {section==="import"        && <FoodImport onImporter={r=>alert("✅ Importée : "+(r.nom||"Sans nom"))}/>}
        {section==="assistant"     && <FoodAssistant/>}
      </div>
    </div>
  );
}
