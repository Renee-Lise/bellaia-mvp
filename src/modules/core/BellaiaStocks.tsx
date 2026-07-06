// ═══════════════════════════════════════════════════════════
// BellaiaStocks — Stock central Bellaïa LOT V
// Tous modules : Food, Events, BSH, Odyssée, General
// Filtre par business_unit — données depuis stock_global
// src/modules/core/BellaiaStocks.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC, FOOD_STOCK_INIT } from "../food/foodConsts";
import type { StockGlobal, BusinessUnit, CategorieStock, NiveauAlerteStock } from "./coreTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const BU_LIST: (BusinessUnit | "tous")[] = ["tous","FOOD","EVENTS","BSH","ODYSSEE","GENERAL"];
const CATS: CategorieStock[] = [
  "matieres_premieres","produits_finis","consommables","emballages",
  "materiel","mobilier","decoration","papeterie","lingerie",
  "parfums","cosmetiques","accessoires","informatique","autre",
];

const NIVEAU_COL: Record<NiveauAlerteStock, string> = {
  ok:"#22c55e", alerte:"#fb923c", critique:"#f87171", rupture:"#f87171",
};
const NIVEAU_BG: Record<NiveauAlerteStock, string> = {
  ok:"rgba(21,128,61,0.12)", alerte:"rgba(251,146,60,0.15)",
  critique:"rgba(248,113,113,0.15)", rupture:"rgba(248,113,113,0.2)",
};
const BU_ICO: Record<string, string> = {
  FOOD:"🍃", EVENTS:"✨", BSH:"💜", ODYSSEE:"💆", GENERAL:"📦", STRUCTURE:"🏗",
};

// Convertir FOOD_STOCK_INIT → StockGlobal (bridge temporaire)
function bridgeFromFoodStock(): StockGlobal[] {
  return FOOD_STOCK_INIT.map(s => {
    const dispo = s.qteRestante;
    const niveau: NiveauAlerteStock =
      dispo === 0                             ? "rupture"  :
      s.seuilCritique && dispo <= s.seuilCritique ? "critique" :
      dispo <= s.seuilAlerte                  ? "alerte"   : "ok";
    return {
      id:              s.id,
      businessUnit:    "FOOD" as BusinessUnit,
      nom:             s.nom,
      categorie:       "matieres_premieres" as CategorieStock,
      unite:           s.unite,
      fournisseurNom:  s.fournisseur,
      prixAchat:       s.prixAchat,
      stockActuel:     s.qteRestante,
      stockReserve:    0,
      stockDisponible: s.qteRestante,
      stockMin:        s.seuilAlerte,
      seuilCritique:   s.seuilCritique,
      dlc:             s.dlc,
      ddm:             s.ddm,
      notes:           s.notes,
      actif:           true,
      niveauAlerte:    niveau,
    };
  });
}

const FORM0: Partial<StockGlobal> = {
  businessUnit:"FOOD", categorie:"matieres_premieres",
  stockActuel:0, stockReserve:0, stockDisponible:0, stockMin:0, actif:true,
};

export default function BellaiaStocks() {
  const [stocks,     setStocks]     = useState<StockGlobal[]>(bridgeFromFoodStock);
  const [filtreBU,   setFiltreBU]   = useState<BusinessUnit|"tous">("tous");
  const [filtreNiv,  setFiltreNiv]  = useState<NiveauAlerteStock|"tous">("tous");
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState<"form"|"ajuster"|null>(null);
  const [editing,    setEditing]    = useState<StockGlobal|null>(null);
  const [ajustId,    setAjustId]    = useState<string|null>(null);
  const [ajustDelta, setAjustDelta] = useState(0);
  const [form,       setForm]       = useState<Partial<StockGlobal>>(FORM0);

  const visibles = useMemo(() => stocks.filter(s => {
    if (!s.actif)                            return false;
    if (filtreBU !== "tous" && s.businessUnit !== filtreBU) return false;
    if (filtreNiv !== "tous" && s.niveauAlerte !== filtreNiv) return false;
    if (search && !s.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [stocks, filtreBU, filtreNiv, search]);

  const nbAlertes = useMemo(() =>
    stocks.filter(s => s.niveauAlerte !== "ok" && s.actif).length,
  [stocks]);

  const calcNiveau = (dispo: number, min: number, critique?: number): NiveauAlerteStock => {
    if (dispo <= 0)                            return "rupture";
    if (critique && dispo <= critique)         return "critique";
    if (dispo <= min)                          return "alerte";
    return "ok";
  };

  const ouvrir = (s?: StockGlobal) => {
    setEditing(s || null);
    setForm(s ? { ...s } : { ...FORM0 });
    setModal("form");
  };

  const sauvegarder = () => {
    if (!form.nom?.trim()) return;
    const dispo = (form.stockActuel || 0) - (form.stockReserve || 0);
    const nv: StockGlobal = {
      ...(form as StockGlobal),
      id:              editing?.id || "sg_" + Date.now().toString().slice(-6),
      stockDisponible: dispo,
      niveauAlerte:    calcNiveau(dispo, form.stockMin || 0, form.seuilCritique),
      actif:           true,
    };
    if (editing) {
      setStocks(ss => ss.map(s => s.id === editing.id ? nv : s));
    } else {
      setStocks(ss => [nv, ...ss]);
    }
    setModal(null); setEditing(null); setForm(FORM0);
  };

  const supprimer = (id: string) => {
    if (!confirm("Archiver cet article ?")) return;
    setStocks(ss => ss.map(s => s.id === id ? { ...s, actif:false } : s));
  };

  const ouvrirAjuster = (id: string) => { setAjustId(id); setAjustDelta(0); setModal("ajuster"); };

  const appliquerAjustement = () => {
    if (!ajustId) return;
    setStocks(ss => ss.map(s => {
      if (s.id !== ajustId) return s;
      const nouveau = Math.max(0, Math.round((s.stockActuel + ajustDelta) * 100) / 100);
      const dispo   = Math.max(0, nouveau - s.stockReserve);
      return { ...s, stockActuel:nouveau, stockDisponible:dispo,
        niveauAlerte:calcNiveau(dispo, s.stockMin, s.seuilCritique) };
    }));
    setModal(null); setAjustId(null); setAjustDelta(0);
  };

  const stockAjuste = ajustId ? stocks.find(s => s.id === ajustId) : null;

  const F = ({ label, k, type="text", ph="", opts }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      {opts ? (
        <select value={(form[k as keyof StockGlobal] as string)||""}
          onChange={e => setForm(f => ({ ...f, [k]:e.target.value }))}
          style={{ ...inp, background:"#1a1a2e" }}>
          {opts.map((o: string) => <option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
        </select>
      ) : (
        <input type={type} placeholder={ph}
          value={(form[k as keyof StockGlobal] as any) ?? ""}
          onChange={e => setForm(f => ({
            ...f, [k]: type==="number" ? (parseFloat(e.target.value)||0) : e.target.value
          }))}
          style={inp}/>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Stock central Bellaïa</div>
          <div style={{ fontSize:10, color:FC.creamD }}>
            {stocks.filter(s=>s.actif).length} articles · {nbAlertes > 0 ? `⚠ ${nbAlertes} en alerte` : "✅ tout OK"}
          </div>
        </div>
        <button onClick={() => ouvrir()}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Ajouter
        </button>
      </div>

      {/* Recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher un article..."
        style={{ ...inp, padding:"8px 12px", fontSize:13 }}/>

      {/* Filtres BU */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {BU_LIST.map(bu => (
          <button key={bu} onClick={() => setFiltreBU(bu as any)}
            style={{ padding:"5px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtreBU===bu?FC.vert:"rgba(255,255,255,0.06)",
              color:filtreBU===bu?"#fff":"rgba(255,255,255,0.5)" }}>
            {bu !== "tous" ? BU_ICO[bu]+" " : ""}{bu}
          </button>
        ))}
      </div>

      {/* Filtres niveau */}
      <div style={{ display:"flex", gap:4 }}>
        {(["tous","ok","alerte","critique","rupture"] as const).map(n => (
          <button key={n} onClick={() => setFiltreNiv(n as any)}
            style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:filtreNiv===n?(n==="tous"?FC.vert:NIVEAU_BG[n as NiveauAlerteStock]):"rgba(255,255,255,0.04)",
              color:filtreNiv===n?(n==="tous"?"#fff":NIVEAU_COL[n as NiveauAlerteStock]):"rgba(255,255,255,0.4)" }}>
            {n}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {visibles.map(s => {
          const niv    = s.niveauAlerte || "ok";
          const pctBar = Math.min(100, s.stockMin > 0
            ? Math.round(s.stockDisponible / (s.stockMin * 3) * 100) : 100);
          return (
            <div key={s.id} style={{ background:"rgba(255,255,255,0.04)",
              border:`1px solid ${niv !== "ok" ? NIVEAU_COL[niv]+"44" : FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              {/* Ligne 1 */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div>
                  <div style={{ display:"flex", gap:5, marginBottom:2 }}>
                    <span style={{ fontSize:8, color:FC.creamD }}>
                      {BU_ICO[s.businessUnit]} {s.businessUnit}
                    </span>
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)" }}>
                      {s.categorie?.replace(/_/g," ")}
                    </span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{s.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {s.fournisseurNom || ""}
                    {s.dlc ? ` · DLC ${s.dlc}` : ""}
                    {s.prixAchat ? ` · ${s.prixAchat}€/${s.unite}` : ""}
                  </div>
                </div>
                <span style={{ fontSize:9, background:NIVEAU_BG[niv], color:NIVEAU_COL[niv],
                  borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>
                  {niv}
                </span>
              </div>

              {/* Barre */}
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:5, marginBottom:8 }}>
                <div style={{ height:5, borderRadius:99, width:`${pctBar}%`,
                  background:niv==="ok"?FC.vert:NIVEAU_COL[niv], transition:"width 0.3s" }}/>
              </div>

              {/* Quantités */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:14 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:niv==="ok"?FC.or:NIVEAU_COL[niv] }}>
                      {s.stockDisponible} <span style={{ fontSize:10 }}>{s.unite}</span>
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>Disponible</div>
                  </div>
                  {s.stockReserve > 0 && (
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#a78bfa" }}>{s.stockReserve} {s.unite}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>Réservé</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>/ {s.stockMin} min</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  <button onClick={() => ouvrirAjuster(s.id)}
                    style={{ background:"rgba(21,128,61,0.2)", border:`1px solid ${FC.vert}`,
                      borderRadius:7, padding:"4px 10px", color:FC.vertL,
                      cursor:"pointer", fontSize:11, fontFamily:SA }}>+/−</button>
                  <button onClick={() => ouvrir(s)}
                    style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:7,
                      padding:"4px 8px", color:FC.creamD, cursor:"pointer", fontSize:11 }}>✏</button>
                  <button onClick={() => supprimer(s.id)}
                    style={{ background:"rgba(248,113,113,0.1)", border:"none", borderRadius:7,
                      padding:"4px 7px", color:"#f87171", cursor:"pointer", fontSize:11 }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        {visibles.length === 0 && (
          <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontStyle:"italic" }}>
            Aucun article correspondant.
          </div>
        )}
      </div>

      {/* Modal ajout / édition */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:520, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {editing ? "Modifier l'article" : "Ajouter au stock central"}
              </div>
              <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <F label="Nom *"             k="nom"          ph="Farine T55, Boîtes bento..."/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <F label="Module"          k="businessUnit" opts={["FOOD","EVENTS","BSH","ODYSSEE","GENERAL"]}/>
                <F label="Catégorie"       k="categorie"    opts={CATS}/>
                <F label="Sous-catégorie"  k="sousCategorie" ph="Farines, Emballages..."/>
                <F label="Unité"           k="unite"        ph="kg, pièce, litre..."/>
                <F label="Qté actuelle"    k="stockActuel"  type="number" ph="0"/>
                <F label="Stock réservé"   k="stockReserve" type="number" ph="0"/>
                <F label="Stock minimum"   k="stockMin"     type="number" ph="0"/>
                <F label="Seuil critique"  k="seuilCritique" type="number" ph="0"/>
                <F label="Prix achat (€)"  k="prixAchat"    type="number" ph="0"/>
                <F label="Fournisseur"     k="fournisseurNom" ph="Metro, Amazon..."/>
                <F label="DLC"             k="dlc"          type="date"/>
                <F label="Emplacement"     k="emplacement"  ph="Étagère A2, Congélateur..."/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editing?"Enregistrer":"Ajouter"}
                </button>
                <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.5)",
                    fontSize:12, cursor:"pointer", fontFamily:SA }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajustement */}
      {modal === "ajuster" && stockAjuste && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:360, width:"100%" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:3 }}>
              Ajuster : {stockAjuste.nom}
            </div>
            <div style={{ fontSize:11, color:FC.creamD, marginBottom:14 }}>
              {BU_ICO[stockAjuste.businessUnit]} {stockAjuste.businessUnit}
              {" · "}Actuel : {stockAjuste.stockActuel} {stockAjuste.unite}
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
              <button onClick={() => setAjustDelta(d => Math.round((d-0.5)*100)/100)}
                style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:8,
                  padding:"8px 16px", color:"#f87171", fontSize:18, cursor:"pointer" }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:700,
                  color:ajustDelta>0?FC.vertL:ajustDelta<0?"#f87171":"#fff" }}>
                  {ajustDelta>0?"+":""}{ajustDelta} {stockAjuste.unite}
                </div>
                <div style={{ fontSize:12, color:FC.creamD, marginTop:2 }}>
                  → {Math.max(0,Math.round((stockAjuste.stockActuel+ajustDelta)*100)/100)} {stockAjuste.unite}
                </div>
              </div>
              <button onClick={() => setAjustDelta(d => Math.round((d+0.5)*100)/100)}
                style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:8,
                  padding:"8px 16px", color:FC.vertL, fontSize:18, cursor:"pointer" }}>+</button>
            </div>
            <input type="number" step={0.1} value={ajustDelta}
              onChange={e => setAjustDelta(parseFloat(e.target.value)||0)}
              placeholder="Valeur exacte..."
              style={{ ...inp, marginBottom:10 }}/>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={appliquerAjustement}
                style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                  color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                ✅ Appliquer
              </button>
              <button onClick={() => setModal(null)}
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                  borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.5)",
                  fontSize:12, cursor:"pointer", fontFamily:SA }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
