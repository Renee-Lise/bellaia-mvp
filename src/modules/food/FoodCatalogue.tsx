// ═══════════════════════════════════════════════════════════
// FoodCatalogue — Catalogue produits ÉDITABLE Bella'Food
// Créer, modifier, dupliquer, archiver, (in)visibilité
// src/modules/food/FoodCatalogue.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_CATALOGUE, FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import type { Produit, CategorieRecette } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

interface Props { onSelectionner?: (produit: Produit) => void; }

const FORM0: Omit<Produit,"id"> = {
  nom:"", categorie:"patisserie", disponible:true, visibleEvents:true, prix:null,
};

export default function FoodCatalogue({ onSelectionner }: Props) {
  const [produits, setProduits] = useState<Produit[]>(
    FOOD_CATALOGUE.map(p => ({ ...p }))
  );
  const [cat,      setCat]      = useState("tous");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<"form"|null>(null);
  const [editing,  setEditing]  = useState<Produit|null>(null);
  const [form,     setForm]     = useState<Omit<Produit,"id">>(FORM0);
  const [showArch, setShowArch] = useState(false);

  const filtres = useMemo(() => produits.filter(p => {
    if (!showArch && !p.disponible && !(p as any).archive) {
      // Masquer non disponibles sauf si on affiche les archivés
    }
    const matchCat  = cat === "tous" || p.categorie === cat;
    const matchSrch = !search || p.nom.toLowerCase().includes(search.toLowerCase());
    const matchArch = showArch ? true : !(p as any).archive;
    return matchCat && matchSrch && matchArch;
  }), [produits, cat, search, showArch]);

  const ouvrir = (p?: Produit) => {
    setEditing(p || null);
    setForm(p ? { ...p } : { ...FORM0 });
    setModal("form");
  };

  const sauvegarder = () => {
    if (!form.nom.trim()) return;
    if (editing) {
      setProduits(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } : p));
    } else {
      const nv: Produit = {
        ...form,
        id: "cp_" + Date.now().toString().slice(-6),
      };
      setProduits(ps => [nv, ...ps]);
    }
    setModal(null); setEditing(null); setForm(FORM0);
  };

  const dupliquer = (p: Produit) => {
    const nv: Produit = {
      ...p,
      id:  "cp_" + Date.now().toString().slice(-6),
      nom: p.nom + " (copie)",
      disponible: false,
    };
    setProduits(ps => [nv, ...ps]);
  };

  const archiver = (id: string) =>
    setProduits(ps => ps.map(p => p.id === id ? { ...p, archive:true, disponible:false } as any : p));

  const supprimer = (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    setProduits(ps => ps.filter(p => p.id !== id));
  };

  const toggleDispo = (id: string) =>
    setProduits(ps => ps.map(p => p.id === id ? { ...p, disponible:!p.disponible } : p));

  const toggleVisible = (id: string) =>
    setProduits(ps => ps.map(p => p.id === id ? { ...p, visibleEvents:!p.visibleEvents } : p));

  const Field = ({ label, k, type="text", ph="" }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form as any)[k] ?? ""}
        onChange={e => setForm(f => ({
          ...f, [k]: type==="number" ? (parseFloat(e.target.value)||null) : e.target.value
        }))}
        style={inp}/>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Barre outils */}
      <div style={{ display:"flex", gap:8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...inp, flex:1, padding:"8px 12px" }}/>
        <button onClick={() => ouvrir()}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, flexShrink:0 }}>
          + Créer
        </button>
      </div>

      {/* Filtres catégories */}
      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
        {["tous", ...FOOD_CATEGORIES].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:cat===c?FC.vert:"rgba(255,255,255,0.06)",
              color:cat===c?"#fff":"rgba(255,255,255,0.5)" }}>
            {c}
          </button>
        ))}
        <button onClick={() => setShowArch(a=>!a)}
          style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
            fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
            background:showArch?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",
            color:"rgba(255,255,255,0.4)" }}>
          {showArch ? "Masquer archivés" : "Voir archivés"}
        </button>
      </div>

      <div style={{ fontSize:11, color:FC.creamD }}>
        {filtres.length} produit{filtres.length>1?"s":""}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtres.map(p => {
          const archive = (p as any).archive;
          return (
            <div key={p.id} style={{ background:FC.card,
              border:`1px solid ${archive?"rgba(255,255,255,0.05)":FC.line}`,
              borderRadius:12, padding:"12px 14px",
              opacity:archive?0.5:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {p.categorie}{p.sousCat ? " · " + p.sousCat : ""}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:700,
                    color:p.prix!=null?FC.or:"rgba(255,255,255,0.3)" }}>
                    {p.prix!=null?fmtPrix(p.prix):"Sur devis"}
                  </div>
                </div>
              </div>

              {/* Badges état */}
              <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
                <button onClick={() => toggleDispo(p.id)}
                  style={{ fontSize:9, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                    border:"none", fontFamily:SA,
                    background:p.disponible?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.06)",
                    color:p.disponible?FC.vertL:"rgba(255,255,255,0.4)" }}>
                  {p.disponible ? "✅ Disponible" : "○ Indisponible"}
                </button>
                <button onClick={() => toggleVisible(p.id)}
                  style={{ fontSize:9, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                    border:"none", fontFamily:SA,
                    background:p.visibleEvents?"rgba(201,168,76,0.15)":"rgba(255,255,255,0.06)",
                    color:p.visibleEvents?FC.or:"rgba(255,255,255,0.4)" }}>
                  {p.visibleEvents ? "👁 Visible Events" : "○ Masqué Events"}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:5 }}>
                {onSelectionner && (
                  <button onClick={() => onSelectionner(p)}
                    style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                      background:FC.vert, border:"none", color:"#fff", fontFamily:SA }}>
                    Choisir
                  </button>
                )}
                <button onClick={() => ouvrir(p)}
                  style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                    background:"rgba(255,255,255,0.06)", border:"none",
                    color:"rgba(255,255,255,0.6)", fontFamily:SA }}>
                  ✏ Modifier
                </button>
                <button onClick={() => dupliquer(p)}
                  style={{ fontSize:10, padding:"4px 10px", borderRadius:7, cursor:"pointer",
                    background:"rgba(255,255,255,0.04)", border:"none",
                    color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                  ⎘ Dupliquer
                </button>
                {!archive && (
                  <button onClick={() => archiver(p.id)}
                    style={{ fontSize:10, padding:"4px 9px", borderRadius:7, cursor:"pointer",
                      background:"rgba(255,255,255,0.04)", border:"none",
                      color:"rgba(255,255,255,0.35)", fontFamily:SA }}>
                    📁
                  </button>
                )}
                <button onClick={() => supprimer(p.id)}
                  style={{ fontSize:10, padding:"4px 8px", borderRadius:7, cursor:"pointer",
                    background:"rgba(248,113,113,0.1)", border:"none",
                    color:"#f87171", fontFamily:SA }}>
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal création/édition */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {editing ? "Modifier le produit" : "Nouveau produit"}
              </div>
              <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <Field label="Nom *"                 k="nom"         ph="Layer cake chocolat..."/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
                  <select value={form.categorie || "patisserie"}
                    onChange={e => setForm(f => ({ ...f, categorie:e.target.value as CategorieRecette }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Field label="Sous-catégorie"      k="sousCat"     ph="bento, number cake..."/>
                <Field label="Prix (€)"             k="prix"        type="number" ph="0"/>
                <Field label="Unité"                k="unite"       ph="pièce, part, kg..."/>
                <Field label="Temps prépa (min)"    k="tempsPrepa"  type="number" ph="0"/>
                <Field label="Temps total (min)"    k="tempsTotal"  type="number" ph="0"/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Description</label>
                <textarea rows={2} value={form.description || ""}
                  onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <Field label="Allergènes (virgules)"  k="allergenes"  ph="gluten, lactose..."/>
              {/* Toggles */}
              <div style={{ display:"flex", gap:14 }}>
                {([["disponible","Disponible"],["visibleEvents","Visible Events"]] as const).map(([k,l])=>(
                  <label key={k} style={{ display:"flex", gap:6, alignItems:"center",
                    cursor:"pointer", fontSize:11, color:FC.creamD }}>
                    <input type="checkbox"
                      checked={!!(form[k as keyof typeof form])}
                      onChange={e => setForm(f => ({ ...f, [k]:e.target.checked }))}
                      style={{ accentColor:FC.vert, width:16, height:16 }}/>
                    {l}
                  </label>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editing?"Enregistrer":"Créer"}
                </button>
                <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.5)",
                    fontSize:12, cursor:"pointer", fontFamily:SA }}>
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
