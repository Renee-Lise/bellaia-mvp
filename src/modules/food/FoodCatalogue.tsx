// ═══════════════════════════════════════════════════════════
// FoodCatalogue — Catalogue produits ÉDITABLE Bella'Food
// Branché sur catalogue_produits (zone 2 — migration 0050) : plus de
// données en dur, la fondatrice voit tous les statuts (brouillon,
// actif, archive), seul statut='actif'+visible_client=true+
// disponible=true sort côté client (ClientFood).
// src/modules/food/FoodCatalogue.tsx
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import {
  getCatalogueFoodAvecDiagnostic, creerProduitCatalogue, majProduitCatalogue,
  supprimerProduitCatalogue,
} from "./catalogueApi";
import type { Produit } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

type ProduitForm = Partial<Produit> & { visibleClient?: boolean };

const FORM0: ProduitForm = {
  nom: "", categorie: "autre", disponible: true, visibleClient: false, prix: null, statut: "brouillon",
};

const STATUT_LABEL: Record<string, string> = { brouillon: "Brouillon", actif: "Actif", archive: "Archivé" };
const STATUT_COL: Record<string, string> = {
  brouillon: "rgba(255,255,255,0.06)", actif: "rgba(21,128,61,0.2)", archive: "rgba(255,255,255,0.04)",
};
const STATUT_TXT: Record<string, string> = {
  brouillon: "rgba(255,255,255,0.5)", actif: FC.vertL, archive: "rgba(255,255,255,0.3)",
};

export default function FoodCatalogue() {
  const [produits, setProduits] = useState<(Produit & { visibleClient?: boolean })[]>([]);
  const [chargement, setChargement] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [cat,      setCat]      = useState("tous");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<"form"|null>(null);
  const [editing,  setEditing]  = useState<Produit|null>(null);
  const [form,     setForm]     = useState<ProduitForm>(FORM0);
  const [showArch, setShowArch] = useState(false);
  const [erreur,   setErreur]   = useState<string | null>(null);
  const [sauvegarde, setSauvegarde] = useState(false);

  const charger = async () => {
    setChargement(true);
    const { produits: p, diagnostic: d } = await getCatalogueFoodAvecDiagnostic();
    setProduits(p);
    setDiagnostic(d);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const filtres = useMemo(() => produits.filter(p => {
    const matchCat  = cat === "tous" || p.categorie === cat;
    const matchSrch = !search || p.nom.toLowerCase().includes(search.toLowerCase());
    const matchArch = showArch ? true : p.statut !== "archive";
    return matchCat && matchSrch && matchArch;
  }), [produits, cat, search, showArch]);

  const ouvrir = (p?: Produit & { visibleClient?: boolean }) => {
    setEditing(p || null);
    setForm(p ? { ...p } : { ...FORM0 });
    setErreur(null);
    setModal("form");
  };

  const sauvegarder = async () => {
    if (!form.nom?.trim()) { setErreur("Le nom du produit est obligatoire."); return; }
    setSauvegarde(true);
    setErreur(null);
    const res = editing ? await majProduitCatalogue(editing.id, form) : await creerProduitCatalogue(form);
    setSauvegarde(false);
    if (!res.ok) {
      setErreur((res as { error?: string }).error || "Échec de l'enregistrement — réessayez.");
      return;
    }
    setModal(null); setEditing(null); setForm(FORM0);
    await charger();
  };

  const dupliquer = async (p: Produit & { visibleClient?: boolean }) => {
    const res = await creerProduitCatalogue({ ...p, id: undefined, nom: `${p.nom} (copie)`, statut: "brouillon", visibleClient: false });
    if (res.ok) charger();
    else setErreur("Échec de la duplication — réessayez.");
  };

  const archiver = async (id: string) => {
    const res = await majProduitCatalogue(id, { statut: "archive", visibleClient: false });
    if (res.ok) charger();
    else setErreur("Échec de l'archivage — réessayez.");
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer définitivement ce produit ? Préférez « Archiver » pour le retirer sans perdre l'historique.")) return;
    const res = await supprimerProduitCatalogue(id);
    if (res.ok) charger();
    else setErreur("Échec de la suppression — réessayez.");
  };

  const toggleDispo = async (p: Produit) => { if ((await majProduitCatalogue(p.id, { disponible: !p.disponible })).ok) charger(); };
  const toggleVisible = async (p: Produit & { visibleClient?: boolean }) => { if ((await majProduitCatalogue(p.id, { visibleClient: !p.visibleClient })).ok) charger(); };

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

      {diagnostic && (
        <div style={{ fontSize:10, color:"#f87171", fontFamily:"monospace", background:"rgba(248,113,113,0.08)", borderRadius:8, padding:"8px 10px" }}>
          {diagnostic}
        </div>
      )}

      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
        {["tous", ...FOOD_CATEGORIES.map(c => c.id)].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:cat===c?FC.vert:"rgba(255,255,255,0.06)",
              color:cat===c?"#fff":"rgba(255,255,255,0.5)" }}>
            {c === "tous" ? "Toutes" : FOOD_CATEGORIES.find(fc => fc.id === c)?.nom || c}
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
        {chargement ? "Chargement…" : `${filtres.length} produit${filtres.length>1?"s":""}`}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtres.map(p => {
          const archive = p.statut === "archive";
          return (
            <div key={p.id} style={{ background:FC.card,
              border:`1px solid ${archive?"rgba(255,255,255,0.05)":FC.line}`,
              borderRadius:12, padding:"12px 14px",
              opacity:archive?0.5:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {FOOD_CATEGORIES.find(c => c.id === p.categorie)?.nom || p.categorie}{p.sousCat ? " · " + p.sousCat : ""}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:700,
                    color:p.prix!=null?FC.or:"rgba(255,255,255,0.3)" }}>
                    {p.prix!=null?fmtPrix(p.prix):"Sur devis"}
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, fontFamily:SA, fontWeight:700,
                  background: STATUT_COL[p.statut || "brouillon"], color: STATUT_TXT[p.statut || "brouillon"] }}>
                  {STATUT_LABEL[p.statut || "brouillon"]}
                </span>
                <button onClick={() => toggleDispo(p)}
                  style={{ fontSize:9, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                    border:"none", fontFamily:SA,
                    background:p.disponible?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.06)",
                    color:p.disponible?FC.vertL:"rgba(255,255,255,0.4)" }}>
                  {p.disponible ? "✅ Disponible" : "○ Indisponible"}
                </button>
                <button onClick={() => toggleVisible(p)}
                  style={{ fontSize:9, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                    border:"none", fontFamily:SA,
                    background:p.visibleClient?"rgba(201,168,76,0.15)":"rgba(255,255,255,0.06)",
                    color:p.visibleClient?FC.or:"rgba(255,255,255,0.4)" }}>
                  {p.visibleClient ? "👁 Visible boutique" : "○ Masqué boutique"}
                </button>
              </div>

              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
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
                    📁 Archiver
                  </button>
                )}
                <button onClick={() => supprimer(p.id)}
                  style={{ fontSize:10, padding:"4px 8px", borderRadius:7, cursor:"pointer",
                    background:"rgba(248,113,113,0.1)", border:"none",
                    color:"#f87171", fontFamily:SA }}>
                  ✕ Supprimer
                </button>
              </div>
            </div>
          );
        })}
        {!chargement && !diagnostic && filtres.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
            Aucun produit {cat !== "tous" ? "dans cette catégorie" : "pour l'instant"}.
          </div>
        )}
      </div>

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
              <Field label="Nom *"                 k="nom"         ph="Poulet boucané, Jus goyave..."/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
                  <select value={form.categorie || "autre"}
                    onChange={e => setForm(f => ({ ...f, categorie:e.target.value as any }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {FOOD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.ico} {c.nom}</option>)}
                  </select>
                </div>
                <Field label="Sous-catégorie"      k="sousCat"     ph="bento, number cake..."/>
                <Field label="Prix (€)"             k="prix"        type="number" ph="0"/>
                <Field label="Unité"                k="unite"       ph="pièce, part, kg..."/>
                <Field label="Temps prépa (min)"    k="tempsPrepa"  type="number" ph="0"/>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Statut</label>
                  <select value={form.statut || "brouillon"}
                    onChange={e => setForm(f => ({ ...f, statut:e.target.value as any }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    <option value="brouillon">Brouillon</option>
                    <option value="actif">Actif</option>
                    <option value="archive">Archivé</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Description</label>
                <textarea rows={2} value={form.description || ""}
                  onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Allergènes (séparés par une virgule)</label>
                <input value={(form.allergenes || []).join(", ")}
                  onChange={e => setForm(f => ({ ...f, allergenes: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) }))}
                  placeholder="gluten, lait, crustacés…" style={inp}/>
              </div>
              <label style={{ display:"flex", gap:6, alignItems:"center", cursor:"pointer", fontSize:11, color:FC.creamD }}>
                <input type="checkbox" checked={!!form.disponible}
                  onChange={e => setForm(f => ({ ...f, disponible:e.target.checked }))}
                  style={{ accentColor:FC.vert, width:16, height:16 }}/>
                Disponible
              </label>
              <label style={{ display:"flex", gap:6, alignItems:"center", cursor:"pointer", fontSize:11, color:FC.creamD }}>
                <input type="checkbox" checked={!!form.visibleClient}
                  onChange={e => setForm(f => ({ ...f, visibleClient:e.target.checked }))}
                  style={{ accentColor:FC.vert, width:16, height:16 }}/>
                Visible dans la boutique cliente
              </label>

              {erreur && (
                <div style={{ fontSize:11, color: "#f87171", background: "rgba(248,113,113,0.1)", borderRadius: 8, padding: "8px 12px" }}>
                  ⚠️ {erreur}
                </div>
              )}

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder} disabled={sauvegarde}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, opacity: sauvegarde ? 0.7 : 1 }}>
                  {sauvegarde ? "Enregistrement…" : (editing?"✅ Enregistrer":"✅ Créer")}
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
