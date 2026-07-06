// ═══════════════════════════════════════════════════════════
// CatalogueAdmin — Catalogue administrable LOT V
// Créer, modifier, dupliquer, archiver des produits
// Tous modules : Food, Events, BSH, Odyssée...
// src/modules/core/CatalogueAdmin.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from "react";
import type { CatalogueProduit, BusinessUnit, StatutProduit } from "./coreTypes";
import { BELLAÏA_COLORS as FC } from "./coreDesign";
import { FOOD_CATALOGUE } from "../food/foodConsts";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const BU_LIST: BusinessUnit[] = ["FOOD","EVENTS","BSH","ODYSSEE","STRUCTURE","GENERAL"];
const STATUTS: StatutProduit[] = ["actif","brouillon","archive","rupture"];

const STATUT_COL: Record<StatutProduit, string> = {
  actif:"rgba(21,128,61,0.2)", brouillon:"rgba(201,168,76,0.15)",
  archive:"rgba(255,255,255,0.06)", rupture:"rgba(248,113,113,0.15)",
};
const STATUT_TXT: Record<StatutProduit, string> = {
  actif:"#22c55e", brouillon:"#c9a96e", archive:"rgba(255,255,255,0.3)", rupture:"#f87171",
};

// Initialiser depuis les constantes Food existantes
function produitFromFoodCatalogue(): CatalogueProduit[] {
  return FOOD_CATALOGUE.map(p => ({
    id:           p.id,
    businessUnit: "FOOD" as BusinessUnit,
    categorieSlug:p.categorie,
    sousCategorie:p.sousCat,
    nom:          p.nom,
    descriptionCourte: p.description || "",
    prix:         p.prix,
    coutRevient:  null,
    tva:          0,
    unite:        p.unite || "prestation",
    visibleClient:p.visibleEvents || p.disponible,
    disponible:   p.disponible,
    statut:       (p.disponible ? "actif" : "archive") as StatutProduit,
    tags:         [],
    allergenes:   [],
  }));
}

const FORM0: Partial<CatalogueProduit> = {
  businessUnit:"FOOD", statut:"brouillon",
  visibleClient:true, disponible:true, tva:0,
};

const CATS_PAR_BU: Record<BusinessUnit, string[]> = {
  FOOD:      ["patisserie","boissons","repas","buffet","glace","traiteur","pack"],
  EVENTS:    ["decoration","papeterie","location","coordination","animation"],
  BSH:       ["lingerie","accessoires","parfums","cosmetiques","soins"],
  ODYSSEE:   ["extensions_cils","soins_visage","maquillage","coiffure","ongles"],
  STRUCTURE: ["conseil","formation","accompagnement"],
  GENERAL:   ["general","autre"],
  INVEST:    ["immobilier","placement"],
};

export default function CatalogueAdmin() {
  const [produits,  setProduits]  = useState<CatalogueProduit[]>(produitFromFoodCatalogue);
  const [modal,     setModal]     = useState<"form"|null>(null);
  const [editing,   setEditing]   = useState<CatalogueProduit|null>(null);
  const [form,      setForm]      = useState<Partial<CatalogueProduit>>(FORM0);
  const [filtreBU,  setFiltreBU]  = useState<BusinessUnit|"tous">("tous");
  const [filtreStatut, setFiltreStatut] = useState<StatutProduit|"tous">("tous");
  const [search,    setSearch]    = useState("");

  const visibles = useMemo(() =>
    produits.filter(p => {
      if (filtreBU     !== "tous" && p.businessUnit !== filtreBU)   return false;
      if (filtreStatut !== "tous" && p.statut !== filtreStatut)      return false;
      if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
  [produits, filtreBU, filtreStatut, search]);

  const ouvrir = useCallback((p?: CatalogueProduit) => {
    setEditing(p || null);
    setForm(p ? { ...p } : { ...FORM0 });
    setModal("form");
  }, []);

  const dupliquer = useCallback((p: CatalogueProduit) => {
    const nv: CatalogueProduit = {
      ...p,
      id:     "cp_" + Date.now().toString().slice(-6),
      nom:    p.nom + " (copie)",
      statut: "brouillon",
    };
    setProduits(ps => [nv, ...ps]);
  }, []);

  const archiver = useCallback((id: string) => {
    setProduits(ps => ps.map(p => p.id === id ? { ...p, statut:"archive" } : p));
  }, []);

  const supprimer = useCallback((id: string) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    setProduits(ps => ps.filter(p => p.id !== id));
  }, []);

  const sauvegarder = () => {
    if (!form.nom?.trim() || !form.businessUnit) return;
    if (editing) {
      setProduits(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } as CatalogueProduit : p));
    } else {
      setProduits(ps => [{
        ...(form as CatalogueProduit),
        id: "cp_" + Date.now().toString().slice(-6),
      }, ...ps]);
    }
    setModal(null); setEditing(null); setForm(FORM0);
  };

  const F = ({ label, k, type="text", ph="" }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form[k as keyof CatalogueProduit] as any) ?? ""}
        onChange={e => setForm(f => ({
          ...f, [k]: type==="number" ? (parseFloat(e.target.value)||undefined) : e.target.value
        }))}
        style={inp}/>
    </div>
  );

  const catsDisp = CATS_PAR_BU[form.businessUnit || "GENERAL"] || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Filtres */}
      <div style={{ display:"flex", gap:8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...inp, flex:1, padding:"8px 12px" }}/>
        <button onClick={() => ouvrir()}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"8px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, flexShrink:0 }}>
          + Créer
        </button>
      </div>

      {/* Filtres BU */}
      <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:2 }}>
        {(["tous", ...BU_LIST] as const).map(bu => (
          <button key={bu} onClick={() => setFiltreBU(bu as any)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtreBU===bu?FC.vert:"rgba(255,255,255,0.06)",
              color:filtreBU===bu?"#fff":"rgba(255,255,255,0.5)" }}>
            {bu}
          </button>
        ))}
      </div>

      {/* Filtres statut */}
      <div style={{ display:"flex", gap:4 }}>
        {(["tous",...STATUTS] as const).map(s => (
          <button key={s} onClick={() => setFiltreStatut(s as any)}
            style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:filtreStatut===s?(s==="tous"?FC.vert:STATUT_COL[s as StatutProduit]):"rgba(255,255,255,0.04)",
              color:filtreStatut===s?(s==="tous"?"#fff":STATUT_TXT[s as StatutProduit]):"rgba(255,255,255,0.4)" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11, color:FC.creamD }}>{visibles.length} produit{visibles.length>1?"s":""}</div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visibles.map(p => (
          <div key={p.id} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                  <span style={{ fontSize:9, background:"rgba(255,255,255,0.06)",
                    color:FC.creamD, borderRadius:3, padding:"1px 6px", fontWeight:700 }}>
                    {p.businessUnit}
                  </span>
                  <span style={{ fontSize:9, background:STATUT_COL[p.statut],
                    color:STATUT_TXT[p.statut], borderRadius:3, padding:"1px 6px", fontWeight:700 }}>
                    {p.statut}
                  </span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>
                  {p.categorieSlug}{p.sousCategorie ? " · " + p.sousCategorie : ""}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:p.prix ? FC.or : "rgba(255,255,255,0.3)" }}>
                  {p.prix != null ? p.prix.toFixed(2)+"€" : "Sur devis"}
                </div>
                {p.coutRevient && (
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    Coût : {p.coutRevient}€
                  </div>
                )}
              </div>
            </div>
            {p.descriptionCourte && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:7, fontStyle:"italic" }}>
                {p.descriptionCourte.slice(0,80)}{p.descriptionCourte.length > 80 ? "…" : ""}
              </div>
            )}
            {/* Actions */}
            <div style={{ display:"flex", gap:5 }}>
              <button onClick={() => ouvrir(p)}
                style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                  background:"rgba(255,255,255,0.06)", border:`1px solid ${FC.line}`,
                  color:"rgba(255,255,255,0.6)", fontFamily:SA }}>✏ Modifier</button>
              <button onClick={() => dupliquer(p)}
                style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                  background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
                  color:"rgba(255,255,255,0.5)", fontFamily:SA }}>⎘ Dupliquer</button>
              {p.statut !== "archive" && (
                <button onClick={() => archiver(p.id)}
                  style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                    background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
                    color:"rgba(255,255,255,0.4)", fontFamily:SA }}>📁 Archiver</button>
              )}
              <button onClick={() => supprimer(p.id)}
                style={{ fontSize:10, padding:"4px 8px", borderRadius:7, cursor:"pointer",
                  background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)",
                  color:"#f87171", fontFamily:SA }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal création / édition */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:560, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>
                {editing ? "Modifier le produit" : "Créer un produit"}
              </div>
              <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {/* Module */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Module *</label>
                  <select value={form.businessUnit || "FOOD"}
                    onChange={e => setForm(f => ({ ...f, businessUnit: e.target.value as BusinessUnit }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {BU_LIST.map(bu => <option key={bu} value={bu}>{bu}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Statut</label>
                  <select value={form.statut || "brouillon"}
                    onChange={e => setForm(f => ({ ...f, statut: e.target.value as StatutProduit }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <F label="Nom *"                k="nom"              ph="Nom du produit"/>
              <F label="Description courte"   k="descriptionCourte" ph="Résumé en 1 ligne"/>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Description longue</label>
                <textarea rows={3} value={form.descriptionLongue || ""}
                  onChange={e => setForm(f => ({ ...f, descriptionLongue: e.target.value }))}
                  style={{ ...inp, resize:"vertical" }}/>
              </div>

              {/* Catégorie */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
                  <select value={form.categorieSlug || ""}
                    onChange={e => setForm(f => ({ ...f, categorieSlug: e.target.value }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    <option value="">— Choisir —</option>
                    {catsDisp.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <F label="Sous-catégorie"  k="sousCategorie" ph="Layer cake, Buffet..."/>
              </div>

              {/* Prix & coûts */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                <F label="Prix (€)"         k="prix"             type="number" ph="0"/>
                <F label="Prix promo (€)"   k="prixPromotion"    type="number" ph="0"/>
                <F label="Coût revient (€)" k="coutRevient"      type="number" ph="0"/>
                <F label="TVA (%)"          k="tva"              type="number" ph="0"/>
              </div>

              {/* Temps */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <F label="Durée (min)"       k="dureeMin"         type="number" ph="0"/>
                <F label="Prépa (min)"       k="tempsPreparation" type="number" ph="0"/>
                <F label="Production (min)"  k="tempsProduction"  type="number" ph="0"/>
              </div>

              <F label="Unité"             k="unite"            ph="prestation, pièce, kg..."/>
              <F label="Tags (virgules)"   k="tags"             ph="gâteau, anniversaire, premium..."/>

              {/* Toggles */}
              <div style={{ display:"flex", gap:14 }}>
                {([["visibleClient","Visible client"],["disponible","Disponible"]] as const).map(([k,l]) => (
                  <label key={k} style={{ display:"flex", gap:6, alignItems:"center",
                    cursor:"pointer", fontSize:11, color:FC.creamD }}>
                    <input type="checkbox" checked={!!(form[k])}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))}
                      style={{ accentColor:FC.vert, width:16, height:16 }}/>
                    {l}
                  </label>
                ))}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"11px",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editing ? "Enregistrer" : "Créer le produit"}
                </button>
                <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
