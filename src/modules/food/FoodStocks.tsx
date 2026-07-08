// ═══════════════════════════════════════════════════════════
// FoodStocks — Stocks Bella'Food — ÉDITION COMPLÈTE
// Source : stock_global (business_unit=FOOD) avec fallback local
// Ajouter, modifier, supprimer, ajuster quantités, seuils, DLC
// src/modules/food/FoodStocks.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import { FOOD_STOCK_INIT, FOOD_FOURNISSEURS_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { getAlerteStock, fmtPrix } from "./foodUtils";
import type { StockItem, UniteMesure } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 9px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

// ── Fallback : convertir stock_global vers StockItem ────────
function mapStockGlobal(r: any): StockItem {
  return {
    id:              r.id,
    nom:             r.nom,
    categorie:       r.categorie || "sec",
    unite:           r.unite,
    qteRestante:     r.stock_actuel ?? r.qteRestante ?? 0,
    seuilAlerte:     r.stock_min ?? r.seuilAlerte ?? 0,
    seuilCritique:   r.seuil_critique,
    prixAchat:       r.prix_achat,
    fournisseur:     r.fournisseur_nom,
    dlc:             r.dlc,
    ddm:             r.ddm,
    notes:           r.notes,
  };
}

// ── Charger depuis Supabase stock_global (business_unit=FOOD) ──
async function chargerStockDepuisSupabase(): Promise<StockItem[] | null> {
  try {
    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!SB_URL) return null;
    const token  = await (window as any).getTokenAsync?.() ?? SB_KEY;
    const r = await fetch(
      SB_URL + "/rest/v1/stock_global?business_unit=eq.FOOD&actif=eq.true&order=nom.asc",
      { headers: { apikey:SB_KEY, Authorization:"Bearer "+token } }
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(mapStockGlobal);
  } catch {
    return null;  // Silencieux — fallback sur données locales
  }
}

// ── Persister une modification vers Supabase ────────────────
async function patcherStockSupabase(id: string, payload: object): Promise<void> {
  try {
    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!SB_URL) return;
    const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
    await fetch(SB_URL + "/rest/v1/stock_global?id=eq."+id, {
      method:"PATCH",
      headers: {
        apikey:SB_KEY, Authorization:"Bearer "+token,
        "Content-Type":"application/json", Prefer:"return=minimal",
      },
      body: JSON.stringify(payload),
    });
  } catch { /* silencieux */ }
}

// ── Créer dans Supabase stock_global ───────────────────────
async function creerStockSupabase(item: StockItem): Promise<string | null> {
  try {
    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!SB_URL) return null;
    const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
    const payload = {
      business_unit: "FOOD",
      nom:           item.nom,
      categorie:     "matieres_premieres",
      unite:         item.unite,
      stock_actuel:  item.qteRestante,
      stock_reserve: 0,
      stock_min:     item.seuilAlerte,
      seuil_critique:item.seuilCritique,
      prix_achat:    item.prixAchat,
      fournisseur_nom:item.fournisseur,
      dlc:           item.dlc,
      ddm:           item.ddm,
      notes:         item.notes,
      actif:         true,
    };
    const r = await fetch(SB_URL + "/rest/v1/stock_global", {
      method:"POST",
      headers: {
        apikey:SB_KEY, Authorization:"Bearer "+token,
        "Content-Type":"application/json", Prefer:"return=representation",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) ? data[0]?.id : data?.id ?? null;
  } catch { return null; }
}

const UNITES: UniteMesure[] = ["g","kg","mg","ml","L","cl","piece","unite","boite","sachet","pot","bouteille","pincee"];
const CATEGORIES = ["sec","frais","aromes","garnitures","colorants","epices","conserves","surgele","autre"];

const STATUT_STOCK = (s: StockItem) => {
  if (s.qteRestante === 0)            return {txt:"Rupture", col:"#f87171", bg:"rgba(248,113,113,0.15)"};
  if (s.seuilCritique && s.qteRestante <= s.seuilCritique)
                                       return {txt:"Critique", col:"#f87171", bg:"rgba(248,113,113,0.12)"};
  if (s.qteRestante <= s.seuilAlerte) return {txt:"Faible",   col:"#fb923c", bg:"rgba(251,146,60,0.15)"};
  return                                      {txt:"OK",       col:"#22c55e", bg:"rgba(21,128,61,0.12)"};
};

const FORM0: Partial<StockItem> = {
  categorie:"sec", unite:"kg", qteRestante:0, seuilAlerte:0, seuilCritique:0,
};

export default function FoodStocks() {
  const [stocks,   setStocks]  = useState<StockItem[]>(FOOD_STOCK_INIT.map(s => ({ ...s })));
  const [source,   setSource]  = useState<"local"|"supabase">("local");
  const [loading,  setLoading] = useState(false);
  const [search,   setSearch]  = useState("");
  const [modal,    setModal]   = useState<"form"|"ajuster"|null>(null);
  const [editing,  setEditing] = useState<StockItem|null>(null);
  const [ajustId,  setAjustId] = useState<string|null>(null);
  const [ajustDelta, setAjustDelta] = useState(0);
  const [form,     setForm]    = useState<Partial<StockItem>>(FORM0);

  // ── Tentative de chargement depuis Supabase au montage ──
  useEffect(() => {
    setLoading(true);
    chargerStockDepuisSupabase().then(rows => {
      if (rows && rows.length > 0) {
        setStocks(rows);
        setSource("supabase");
      }
      // Si null ou vide : on garde FOOD_STOCK_INIT (fallback silencieux)
      setLoading(false);
    });
  }, []);

  const alertes = useMemo(() => new Set(getAlerteStock(stocks).map(s => s.id)), [stocks]);

  const filtres = useMemo(() =>
    stocks.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase())),
  [stocks, search]);

  // ── Ouvrir modale ajout ou modification ────────────────
  const ouvrir = (s?: StockItem) => {
    setEditing(s || null);
    setForm(s ? { ...s } : { ...FORM0, id:undefined });
    setModal("form");
  };

  // ── Sauvegarder (local + Supabase si connecté) ─────────
  const sauvegarder = async () => {
    if (!form.nom?.trim()) return;
    if (editing) {
      setStocks(ss => ss.map(s => s.id === editing.id ? { ...s, ...form } as StockItem : s));
      if (source === "supabase") {
        await patcherStockSupabase(editing.id, {
          nom:           form.nom,
          unite:         form.unite,
          stock_actuel:  form.qteRestante,
          stock_min:     form.seuilAlerte,
          seuil_critique:form.seuilCritique,
          prix_achat:    form.prixAchat,
          fournisseur_nom:form.fournisseur,
          dlc:           form.dlc,
          ddm:           form.ddm,
          notes:         form.notes,
        });
      }
    } else {
      const localId = "s_" + Date.now().toString().slice(-6);
      const nv: StockItem = {
        ...(form as StockItem),
        id:           localId,
        qteRestante:  form.qteRestante || 0,
        seuilAlerte:  form.seuilAlerte || 0,
      };
      // Tenter de créer dans Supabase
      if (source === "supabase") {
        const sbId = await creerStockSupabase(nv);
        if (sbId) nv.id = sbId;
      }
      setStocks(ss => [nv, ...ss]);
    }
    setModal(null); setEditing(null); setForm(FORM0);
  };

  // ── Supprimer / archiver ───────────────────────────────
  const supprimer = async (id: string) => {
    if (!confirm("Supprimer cet article du stock ?")) return;
    setStocks(ss => ss.filter(s => s.id !== id));
    if (source === "supabase") {
      await patcherStockSupabase(id, { actif: false });
    }
  };

  // ── Ajustement rapide de quantité ──────────────────────
  const ouvrirAjuster = (id: string) => { setAjustId(id); setAjustDelta(0); setModal("ajuster"); };

  const appliquerAjustement = async () => {
    if (!ajustId) return;
    let nouvQte = 0;
    setStocks(ss => ss.map(s => {
      if (s.id !== ajustId) return s;
      nouvQte = Math.max(0, Math.round((s.qteRestante + ajustDelta) * 100) / 100);
      return { ...s, qteRestante: nouvQte };
    }));
    if (source === "supabase") {
      await patcherStockSupabase(ajustId, { stock_actuel: nouvQte });
    }
    setModal(null); setAjustId(null); setAjustDelta(0);
  };

  const stockAjuste = ajustId ? stocks.find(s => s.id === ajustId) : null;

  const Field = ({ label, k, type="text", ph="", opts }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      {opts ? (
        <select value={(form[k as keyof StockItem] as string) || ""}
          onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
          style={{ ...inp, background:"#1a1a2e" }}>
          {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} placeholder={ph}
          value={(form[k as keyof StockItem] as string|number|undefined) ?? ""}
          onChange={e => setForm(f => ({
            ...f, [k]: type==="number" ? (parseFloat(e.target.value) ?? undefined) : e.target.value
          }))}
          style={inp}/>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Barre d'outils */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...inp, flex:1, padding:"8px 12px", fontSize:13 }}/>
        <button onClick={() => ouvrir()}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"8px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, flexShrink:0 }}>
          + Ajouter
        </button>
      </div>

      {/* Source des données */}
      {loading ? (
        <div style={{ fontSize:11, color:FC.creamD, textAlign:"center", padding:"6px" }}>
          Chargement du stock central…
        </div>
      ) : (
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textAlign:"right" }}>
          {source === "supabase"
            ? "✅ Connecté au stock central Bellaïa"
            : "📦 Données locales (stock central non disponible)"}
        </div>
      )}

      {alertes.size > 0 && (
        <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:10, padding:"9px 13px", fontSize:12, color:"#f87171" }}>
          ⚠ {alertes.size} article{alertes.size > 1?"s":""} sous le seuil d'alerte
        </div>
      )}

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {filtres.map(s => {
          const st = STATUT_STOCK(s);
          const pct = Math.min(100, s.seuilAlerte > 0
            ? Math.round(s.qteRestante / (s.seuilAlerte * 3) * 100) : 100);
          return (
            <div key={s.id} style={{ background:FC.card,
              border:`1px solid ${alertes.has(s.id) ? "rgba(248,113,113,0.3)" : FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              {/* Ligne 1 — nom + statut */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{s.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {s.categorie}
                    {s.fournisseur ? " · " + s.fournisseur : ""}
                    {s.dlc ? " · DLC " + s.dlc : ""}
                  </div>
                </div>
                <span style={{ fontSize:9, background:st.bg, color:st.col,
                  borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>
                  {st.txt}
                </span>
              </div>

              {/* Barre */}
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:5, marginBottom:8 }}>
                <div style={{ height:5, borderRadius:99, width:`${pct}%`,
                  background:alertes.has(s.id) ? "#f87171" : FC.vert, transition:"width 0.3s" }}/>
              </div>

              {/* Quantité + contrôles */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontSize:16, fontWeight:700,
                    color:alertes.has(s.id) ? "#f87171" : FC.or }}>
                    {s.qteRestante} {s.unite}
                  </span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:6 }}>
                    / seuil {s.seuilAlerte}
                  </span>
                  {s.prixAchat && (
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:10 }}>
                      {s.prixAchat}€/{s.unite}
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  <button onClick={() => ouvrirAjuster(s.id)}
                    style={{ background:"rgba(21,128,61,0.2)", border:`1px solid ${FC.vert}`,
                      borderRadius:7, padding:"4px 10px", color:FC.vertL,
                      cursor:"pointer", fontSize:11, fontFamily:SA }}>
                    +/−
                  </button>
                  <button onClick={() => ouvrir(s)}
                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                      borderRadius:7, padding:"4px 10px", color:"rgba(255,255,255,0.6)",
                      cursor:"pointer", fontSize:11, fontFamily:SA }}>
                    ✏
                  </button>
                  <button onClick={() => supprimer(s.id)}
                    style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)",
                      borderRadius:7, padding:"4px 8px", color:"#f87171",
                      cursor:"pointer", fontSize:11 }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modale ajout / modification ── */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {editing ? "Modifier l'article" : "Ajouter un article"}
              </div>
              <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <Field label="Nom *"                k="nom"           ph="Farine T55, Sucre glace..."/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Field label="Catégorie"          k="categorie"     opts={CATEGORIES}/>
                <Field label="Unité"              k="unite"         opts={UNITES}/>
                <Field label="Quantité actuelle"  k="qteRestante"   type="number" ph="0"/>
                <Field label="Seuil alerte"       k="seuilAlerte"   type="number" ph="0"/>
                <Field label="Seuil critique"     k="seuilCritique" type="number" ph="0"/>
                <Field label="Prix achat (€/u)"   k="prixAchat"     type="number" ph="0"/>
                <Field label="Fournisseur"        k="fournisseur"   ph="Metro, Carrefour..."/>
                <Field label="DLC"                k="dlc"           type="date"/>
                <Field label="DDM"                k="ddm"           type="date"/>
                <Field label="Date achat"         k="dateAchat"     type="date"/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
                  style={{ ...inp, resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editing ? "Enregistrer" : "Ajouter"}
                </button>
                <button onClick={() => { setModal(null); setEditing(null); setForm(FORM0); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale ajustement rapide ── */}
      {modal === "ajuster" && stockAjuste && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:360, width:"100%" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>
              Ajuster la quantité
            </div>
            <div style={{ fontSize:12, color:FC.creamD, marginBottom:14 }}>
              {stockAjuste.nom} — actuel : {stockAjuste.qteRestante} {stockAjuste.unite}
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
              <button onClick={() => setAjustDelta(d => Math.round((d - 0.5)*100)/100)}
                style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:8,
                  padding:"8px 16px", color:"#f87171", fontSize:18, cursor:"pointer" }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:700,
                  color:ajustDelta > 0 ? FC.vertL : ajustDelta < 0 ? "#f87171" : "#fff" }}>
                  {ajustDelta > 0 ? "+" : ""}{ajustDelta} {stockAjuste.unite}
                </div>
                <div style={{ fontSize:12, color:FC.creamD, marginTop:2 }}>
                  → {Math.max(0, Math.round((stockAjuste.qteRestante + ajustDelta)*100)/100)} {stockAjuste.unite}
                </div>
              </div>
              <button onClick={() => setAjustDelta(d => Math.round((d + 0.5)*100)/100)}
                style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:8,
                  padding:"8px 16px", color:FC.vertL, fontSize:18, cursor:"pointer" }}>+</button>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input type="number" step={0.1} value={ajustDelta}
                onChange={e => setAjustDelta(parseFloat(e.target.value)||0)}
                placeholder="Valeur manuelle..."
                style={{ ...inp, flex:1 }}/>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={appliquerAjustement}
                style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                  color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                ✅ Appliquer
              </button>
              <button onClick={() => setModal(null)}
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                  padding:"10px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
