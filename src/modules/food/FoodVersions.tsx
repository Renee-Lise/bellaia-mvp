// ═══════════════════════════════════════════════════════════
// FoodVersions — Versions de recettes Bella'Food Partie IV
// Créer, comparer, sélectionner les versions d'une recette
// src/modules/food/FoodVersions.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_RECETTES_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix, fmtDuree } from "./foodUtils";
import type { VersionRecette, TypeVersion } from "./foodTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const TYPES_VERSION: { id: TypeVersion; nom: string; ico: string; col: string }[] = [
  {id:"originale",       nom:"Originale",         ico:"⭐", col:FC.or},
  {id:"economique",      nom:"Économique",         ico:"💚", col:"#22c55e"},
  {id:"premium",         nom:"Premium",            ico:"💎", col:"#a78bfa"},
  {id:"evenementielle",  nom:"Événementielle",     ico:"🎉", col:"#60a5fa"},
  {id:"sans_lactose",    nom:"Sans lactose",       ico:"🥛", col:"#fb923c"},
  {id:"sans_gluten",     nom:"Sans gluten",        ico:"🌾", col:"#f59e0b"},
  {id:"enfant",          nom:"Enfant",             ico:"🧒", col:"#34d399"},
  {id:"grande_quantite", nom:"Grande quantité",    ico:"📦", col:"#94a3b8"},
  {id:"version_test",    nom:"Version test",       ico:"🧪", col:"#6b7280"},
  {id:"validee",         nom:"Validée",            ico:"✅", col:"#10b981"},
];

const STATUT_COL = {
  brouillon:"rgba(201,168,76,0.15)", test:"rgba(96,165,250,0.15)",
  validee:"rgba(16,185,129,0.2)", archivee:"rgba(255,255,255,0.06)",
};
const STATUT_TXT = {
  brouillon:"#c9a96e", test:"#60a5fa", validee:"#22c55e", archivee:"rgba(255,255,255,0.3)",
};

const FORM0: Partial<VersionRecette> = {
  statut:"brouillon", typeVersion:"version_test",
  dateCreation:new Date().toISOString().split("T")[0],
};

export default function FoodVersions() {
  const [versions,   setVersions]   = useState<VersionRecette[]>([]);
  const [modal,      setModal]      = useState<"creer"|"comparer"|null>(null);
  const [detail,     setDetail]     = useState<VersionRecette|null>(null);
  const [filtreRec,  setFiltreRec]  = useState("");
  const [form,       setForm]       = useState<Partial<VersionRecette>>(FORM0);
  const [selection,  setSelection]  = useState<Set<string>>(new Set());

  // Grouper par recette
  const parRecette = useMemo(() => {
    const map: Record<string, VersionRecette[]> = {};
    for (const v of versions) {
      if (!map[v.recetteId]) map[v.recetteId] = [];
      map[v.recetteId].push(v);
    }
    return map;
  }, [versions]);

  const creer = () => {
    if (!form.recetteId || !form.nomVersion?.trim()) return;
    const recette = FOOD_RECETTES_INIT.find(r => r.id === form.recetteId);
    const nv: VersionRecette = {
      id:             "ver_" + Date.now().toString().slice(-5),
      recetteId:      form.recetteId!,
      recetteNom:     recette?.nom || form.recetteId,
      typeVersion:    form.typeVersion || "version_test",
      nomVersion:     form.nomVersion!,
      ingredients:    recette?.ingredients || [],
      coutMatiere:    form.coutMatiere || recette?.coutMatiere || 0,
      coutConsommables: form.coutConsommables || recette?.coutConsommables || 0,
      tempsProduction: form.tempsProduction ||
        ((recette?.tempsPrepa||0) + (recette?.tempsCuisson||0) + (recette?.tempsRepos||0)),
      prixConseille:  form.prixConseille ?? recette?.prixConseille ?? null,
      prixPremium:    form.prixPremium ?? null,
      margeEstimee:   form.margeEstimee ?? recette?.margeEstimee ?? null,
      notes:          form.notes,
      statut:         form.statut || "brouillon",
      dateCreation:   new Date().toISOString().split("T")[0],
    };
    setVersions(vs => [nv, ...vs]);
    setModal(null);
    setForm(FORM0);
    setDetail(nv);
  };

  const toggleSelection = (id: string) => {
    setSelection(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const versionsSelectionnees = versions.filter(v => selection.has(v.id));

  const margeCalc = (v: VersionRecette) => {
    if (!v.prixConseille) return null;
    const cout = v.coutMatiere + v.coutConsommables;
    return Math.round((v.prixConseille - cout) / v.prixConseille * 100);
  };

  const Field = ({ label, k, type="text", ph="" }: { label:string; k:keyof VersionRecette; type?:string; ph?:string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD, fontFamily:SA }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form[k] as string|number|undefined) ?? ""}
        onChange={e => setForm(f => ({
          ...f, [k]: type==="number" ? (parseFloat(e.target.value)||undefined) : e.target.value
        }))}
        style={inp}/>
    </div>
  );

  // Vue comparaison
  if (modal === "comparer" && versionsSelectionnees.length >= 2) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={() => { setModal(null); setSelection(new Set()); }}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>
          ‹ Retour
        </button>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
          Comparaison — {versionsSelectionnees[0].recetteNom}
        </div>
      </div>
      <div style={{ display:"grid", gap:8,
        gridTemplateColumns:`repeat(${Math.min(versionsSelectionnees.length, 2)}, 1fr)` }}>
        {versionsSelectionnees.map(v => {
          const marge = margeCalc(v);
          const cfg   = TYPES_VERSION.find(t => t.id === v.typeVersion);
          return (
            <div key={v.id} style={{ background:`${cfg?.col || FC.or}11`,
              border:`1px solid ${cfg?.col || FC.line}44`, borderRadius:12, padding:13 }}>
              <div style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
                <span style={{ fontSize:16 }}>{cfg?.ico}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{v.nomVersion}</div>
                  <div style={{ fontSize:9, color:FC.creamD }}>{cfg?.nom}</div>
                </div>
              </div>
              {[
                {l:"Coût matière",     v:fmtPrix(v.coutMatiere),     col:"#f87171"},
                {l:"Consommables",     v:fmtPrix(v.coutConsommables), col:"#fb923c"},
                {l:"Coût total",       v:fmtPrix(v.coutMatiere+v.coutConsommables), col:"rgba(255,255,255,0.7)"},
                {l:"Prix conseillé",   v:fmtPrix(v.prixConseille),   col:FC.or},
                {l:"Prix premium",     v:fmtPrix(v.prixPremium),     col:"#a78bfa"},
                {l:"Marge estimée",    v:marge != null ? marge+"%" : "—", col:"#22c55e"},
                {l:"Temps production", v:fmtDuree(v.tempsProduction), col:FC.creamD},
              ].map(r => (
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:10, color:FC.creamD }}>{r.l}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:r.col }}>{r.v}</span>
                </div>
              ))}
              {v.notes && <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:8, fontStyle:"italic" }}>{v.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Vue détail
  if (detail) {
    const cfg   = TYPES_VERSION.find(t => t.id === detail.typeVersion);
    const marge = margeCalc(detail);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setDetail(null)}
            style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
              padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>
            ‹ Retour
          </button>
          <button onClick={() => {
            setSelection(new Set([detail.id]));
            setModal("comparer");
          }}
            style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${FC.vert}`,
              borderRadius:8, padding:"4px 12px", color:FC.vertL, cursor:"pointer", fontSize:11, fontFamily:SA }}>
            ⚖ Comparer
          </button>
        </div>
        <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{detail.nomVersion}</div>
              <div style={{ fontSize:11, color:FC.creamD }}>{detail.recetteNom}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
              <span style={{ fontSize:18 }}>{cfg?.ico}</span>
              <span style={{ fontSize:9, background:STATUT_COL[detail.statut],
                color:STATUT_TXT[detail.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                {detail.statut}
              </span>
            </div>
          </div>
          {[
            {l:"Coût matière",      v:fmtPrix(detail.coutMatiere),     col:"#f87171"},
            {l:"Consommables",      v:fmtPrix(detail.coutConsommables), col:"#fb923c"},
            {l:"Prix conseillé",    v:fmtPrix(detail.prixConseille),   col:FC.or, big:true},
            {l:"Prix premium",      v:fmtPrix(detail.prixPremium),     col:"#a78bfa"},
            {l:"Marge estimée",     v:marge != null ? marge+"%" : "—", col:"#22c55e"},
            {l:"Temps production",  v:fmtDuree(detail.tempsProduction), col:FC.creamD},
          ].map(r => (
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between",
              padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:11, color:FC.creamD }}>{r.l}</span>
              <span style={{ fontSize:(r as any).big?15:12, fontWeight:(r as any).big?700:600, color:r.col }}>{r.v}</span>
            </div>
          ))}
          {detail.notes && <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:8, fontStyle:"italic" }}>{detail.notes}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{versions.length} version{versions.length>1?"s":""}</div>
        <div style={{ display:"flex", gap:6 }}>
          {selection.size >= 2 && (
            <button onClick={() => setModal("comparer")}
              style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${FC.vert}`,
                borderRadius:8, padding:"6px 12px", color:FC.vertL, fontWeight:700,
                fontSize:11, cursor:"pointer", fontFamily:SA }}>
              ⚖ Comparer ({selection.size})
            </button>
          )}
          <button onClick={() => { setForm(FORM0); setModal("creer"); }}
            style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
              color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
            + Nouvelle version
          </button>
        </div>
      </div>

      {/* Filtre recette */}
      <select value={filtreRec} onChange={e => setFiltreRec(e.target.value)}
        style={{ ...inp, background:"#1a1a2e" }}>
        <option value="">— Toutes les recettes —</option>
        {FOOD_RECETTES_INIT.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
      </select>

      {/* Liste */}
      {versions.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucune version créée. Créez la première version d'une recette.
        </div>
      )}

      {Object.entries(parRecette)
        .filter(([rid]) => !filtreRec || rid === filtreRec)
        .map(([rid, vs]) => (
          <div key={rid}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:6, letterSpacing:1 }}>
              {vs[0].recetteNom} — {vs.length} version{vs.length>1?"s":""}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {vs.map(v => {
                const cfg   = TYPES_VERSION.find(t => t.id === v.typeVersion);
                const marge = margeCalc(v);
                const sel   = selection.has(v.id);
                return (
                  <div key={v.id}
                    style={{ background:sel?"rgba(21,128,61,0.12)":FC.card,
                      border:`1px solid ${sel?FC.vert:FC.line}`, borderRadius:11, padding:"11px 13px",
                      display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", flex:1 }}
                      onClick={() => setDetail(v)}>
                      <span style={{ fontSize:20 }}>{cfg?.ico}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>{v.nomVersion}</div>
                        <div style={{ fontSize:10, color:FC.creamD }}>
                          {cfg?.nom}
                          {v.prixConseille ? ` · ${fmtPrix(v.prixConseille)}` : ""}
                          {marge != null ? ` · ${marge}% marge` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:9, background:STATUT_COL[v.statut],
                        color:STATUT_TXT[v.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                        {v.statut}
                      </span>
                      <input type="checkbox" checked={sel}
                        onChange={() => toggleSelection(v.id)}
                        style={{ width:16, height:16, accentColor:FC.vert, cursor:"pointer" }}
                        title="Sélectionner pour comparer"/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* Modal création */}
      {modal === "creer" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouvelle version</div>
              <button onClick={() => setModal(null)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Recette de base *</label>
                <select value={form.recetteId || ""} onChange={e => setForm(f => ({ ...f, recetteId:e.target.value }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  <option value="">— Choisir —</option>
                  {FOOD_RECETTES_INIT.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <Field label="Nom de la version *" k="nomVersion" ph="Ex : Version sans gluten, Version économique..."/>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Type de version</label>
                <select value={form.typeVersion || "version_test"} onChange={e => setForm(f => ({ ...f, typeVersion:e.target.value as TypeVersion }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {TYPES_VERSION.map(t => <option key={t.id} value={t.id}>{t.ico} {t.nom}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Field label="Coût matière (€)"    k="coutMatiere"      type="number"/>
                <Field label="Consommables (€)"    k="coutConsommables" type="number"/>
                <Field label="Prix conseillé (€)"  k="prixConseille"    type="number"/>
                <Field label="Prix premium (€)"    k="prixPremium"      type="number"/>
                <Field label="Temps prod. (min)"   k="tempsProduction"  type="number"/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
                  style={{ ...inp, resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creer}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ Créer la version
                </button>
                <button onClick={() => setModal(null)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
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
