// ═══════════════════════════════════════════════════════════
// FoodMateriel — Matériel & Consommables — ÉDITION COMPLÈTE
// Ajouter, modifier, supprimer, changer état/priorité/quantité
// src/modules/food/FoodMateriel.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT, FOOD_COLORS as FC } from "./foodConsts";
import type { Materiel, Consommable, EtatMateriel, PrioriteAchat, StatutStock } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 9px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const ETAT_COL: Record<EtatMateriel, string> = {
  neuf:"#22c55e", bon:"#22c55e", a_remplacer:"#fb923c", manquant:"#f87171",
};
const ETAT_BG: Record<EtatMateriel, string> = {
  neuf:"rgba(21,128,61,0.15)", bon:"rgba(21,128,61,0.1)",
  a_remplacer:"rgba(251,146,60,0.15)", manquant:"rgba(248,113,113,0.15)",
};
const PRIO_COL: Record<PrioriteAchat, string> = {
  urgent:"#f87171", utile:"#fb923c", plus_tard:"rgba(255,255,255,0.4)",
};
const CONSO_COL: Record<StatutStock, string> = {
  disponible:"#22c55e", faible:"#fb923c", rupture:"#f87171",
};

const CAT_MATERIEL = ["patisserie","cuisson","decoration","conservation","livraison","transport","mesure","boissons","glace","autre"];
const CAT_CONSO = ["emballage","support","cuisson","conservation","hygiene","decoration","service","patisserie","autre"];

const FORM_MAT0: Partial<Materiel>  = { etat:"bon", priorite:"utile", qteDispo:0 };
const FORM_CON0: Partial<Consommable> = { statut:"disponible", qteDispo:0, seuilAlerte:0 };

interface Props { onglet?: "materiel"|"consommables" }

export default function FoodMateriel({ onglet: ongletInit = "materiel" }: Props) {
  const [onglet,       setOnglet]       = useState<"materiel"|"consommables">(ongletInit);
  const [materiel,     setMateriel]     = useState<Materiel[]>(FOOD_MATERIEL_INIT.map(m => ({ ...m })));
  const [consommables, setConsommables] = useState<Consommable[]>(FOOD_CONSOMMABLES_INIT.map(c => ({ ...c })));
  const [search,       setSearch]       = useState("");
  const [modal,        setModal]        = useState<"mat"|"conso"|null>(null);
  const [editMat,      setEditMat]      = useState<Materiel|null>(null);
  const [editCon,      setEditCon]      = useState<Consommable|null>(null);
  const [formMat,      setFormMat]      = useState<Partial<Materiel>>(FORM_MAT0);
  const [formCon,      setFormCon]      = useState<Partial<Consommable>>(FORM_CON0);

  const urgentsMat   = materiel.filter(m => m.priorite==="urgent" && m.etat==="manquant").length;
  const alertesConso = consommables.filter(c => c.statut!=="disponible").length;

  const filtMat  = useMemo(() => materiel.filter(m =>
    !search || m.nom.toLowerCase().includes(search.toLowerCase())), [materiel, search]);
  const filtCon  = useMemo(() => consommables.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase())), [consommables, search]);

  // ── Matériel ───────────────────────────────────────────
  const ouvrirMat = (m?: Materiel) => {
    setEditMat(m || null);
    setFormMat(m ? { ...m } : { ...FORM_MAT0 });
    setModal("mat");
  };
  const sauvegarderMat = () => {
    if (!formMat.nom?.trim()) return;
    if (editMat) {
      setMateriel(ms => ms.map(m => m.id === editMat.id ? { ...m, ...formMat } as Materiel : m));
    } else {
      setMateriel(ms => [{
        ...(formMat as Materiel),
        id:"m_"+Date.now().toString().slice(-5),
        qteDispo:formMat.qteDispo||0, etat:formMat.etat||"bon", priorite:formMat.priorite||"utile",
      }, ...ms]);
    }
    setModal(null); setEditMat(null); setFormMat(FORM_MAT0);
  };
  const supprimerMat = (id: string) => {
    if (!confirm("Supprimer ce matériel ?")) return;
    setMateriel(ms => ms.filter(m => m.id !== id));
  };
  const changerEtat = (id: string, etat: EtatMateriel) =>
    setMateriel(ms => ms.map(m => m.id===id ? {...m, etat} : m));
  const changerPrio = (id: string, priorite: PrioriteAchat) =>
    setMateriel(ms => ms.map(m => m.id===id ? {...m, priorite} : m));
  const ajusterQteMat = (id: string, delta: number) =>
    setMateriel(ms => ms.map(m => m.id!==id ? m : {...m, qteDispo:Math.max(0,m.qteDispo+delta)}));

  // ── Consommables ────────────────────────────────────────
  const ouvrirCon = (c?: Consommable) => {
    setEditCon(c || null);
    setFormCon(c ? { ...c } : { ...FORM_CON0 });
    setModal("conso");
  };
  const sauvegarderCon = () => {
    if (!formCon.nom?.trim()) return;
    if (editCon) {
      setConsommables(cs => cs.map(c => c.id===editCon.id ? { ...c, ...formCon } as Consommable : c));
    } else {
      setConsommables(cs => [{
        ...(formCon as Consommable),
        id:"c_"+Date.now().toString().slice(-5),
        qteDispo:formCon.qteDispo||0, seuilAlerte:formCon.seuilAlerte||0,
        statut:formCon.statut||"disponible",
      }, ...cs]);
    }
    setModal(null); setEditCon(null); setFormCon(FORM_CON0);
  };
  const supprimerCon = (id: string) => {
    if (!confirm("Supprimer ce consommable ?")) return;
    setConsommables(cs => cs.filter(c => c.id !== id));
  };
  const changerStatutCon = (id: string, statut: StatutStock) =>
    setConsommables(cs => cs.map(c => c.id===id ? {...c, statut} : c));
  const ajusterQteCon = (id: string, delta: number) =>
    setConsommables(cs => cs.map(c => c.id!==id ? c : {
      ...c, qteDispo:Math.max(0,c.qteDispo+delta),
      statut:c.qteDispo+delta===0?"rupture":c.qteDispo+delta<=c.seuilAlerte?"faible":"disponible",
    }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {([["materiel","🧰 Matériel"],["consommables","🛍 Consommables"]] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setOnglet(id)}
            style={{ flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, fontFamily:SA,
              background:onglet===id?FC.vert:"rgba(255,255,255,0.06)",
              color:onglet===id?"#fff":"rgba(255,255,255,0.5)" }}>
            {label}
            {id==="materiel"&&urgentsMat>0&&<span style={{ marginLeft:5, background:"#f87171", color:"#fff",
              borderRadius:99, padding:"0 5px", fontSize:9 }}>{urgentsMat}</span>}
            {id==="consommables"&&alertesConso>0&&<span style={{ marginLeft:5, background:"#fb923c", color:"#fff",
              borderRadius:99, padding:"0 5px", fontSize:9 }}>{alertesConso}</span>}
          </button>
        ))}
      </div>

      {/* Barre outils */}
      <div style={{ display:"flex", gap:8 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...inp, flex:1, padding:"8px 12px" }}/>
        <button onClick={()=>onglet==="materiel" ? ouvrirMat() : ouvrirCon()}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"8px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, flexShrink:0 }}>
          + Ajouter
        </button>
      </div>

      {/* ── MATÉRIEL ── */}
      {onglet==="materiel" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtMat.map(m => (
            <div key={m.id} style={{ background:FC.card,
              border:`1px solid ${m.priorite==="urgent"&&m.etat==="manquant"?"rgba(248,113,113,0.3)":FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {m.categorie} · {m.qteDispo} dispo
                    {m.prixAchat ? ` · ${m.prixAchat}€` : ""}
                    {m.fournisseur ? ` · ${m.fournisseur}` : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>ouvrirMat(m)}
                    style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:6,
                      padding:"3px 8px", color:FC.creamD, cursor:"pointer", fontSize:11 }}>✏</button>
                  <button onClick={()=>supprimerMat(m.id)}
                    style={{ background:"rgba(248,113,113,0.1)", border:"none", borderRadius:6,
                      padding:"3px 7px", color:"#f87171", cursor:"pointer", fontSize:11 }}>✕</button>
                </div>
              </div>

              {/* Quantité */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <button onClick={()=>ajusterQteMat(m.id,-1)}
                  style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:6,
                    padding:"3px 9px", color:"#f87171", cursor:"pointer", fontSize:13 }}>−</button>
                <span style={{ fontSize:14, fontWeight:700, color:FC.or, minWidth:30, textAlign:"center" }}>
                  {m.qteDispo}
                </span>
                <button onClick={()=>ajusterQteMat(m.id,1)}
                  style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:6,
                    padding:"3px 9px", color:FC.vertL, cursor:"pointer", fontSize:13 }}>+</button>
                <span style={{ fontSize:10, color:FC.creamD, marginLeft:2 }}>disponible{m.qteDispo>1?"s":""}</span>
              </div>

              {/* État */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:4 }}>
                {(["neuf","bon","a_remplacer","manquant"] as EtatMateriel[]).map(e=>(
                  <button key={e} onClick={()=>changerEtat(m.id,e)}
                    style={{ fontSize:8, padding:"2px 7px", borderRadius:99, cursor:"pointer",
                      border:`1px solid ${e===m.etat?ETAT_COL[e]:"rgba(255,255,255,0.1)"}`,
                      background:e===m.etat?ETAT_BG[e]:"transparent",
                      color:e===m.etat?ETAT_COL[e]:"rgba(255,255,255,0.35)", fontFamily:SA }}>
                    {e.replace("_"," ")}
                  </button>
                ))}
              </div>

              {/* Priorité */}
              <div style={{ display:"flex", gap:4 }}>
                {(["urgent","utile","plus_tard"] as PrioriteAchat[]).map(p=>(
                  <button key={p} onClick={()=>changerPrio(m.id,p)}
                    style={{ fontSize:8, padding:"2px 7px", borderRadius:99, cursor:"pointer",
                      border:`1px solid ${p===m.priorite?PRIO_COL[p]:"rgba(255,255,255,0.1)"}`,
                      background:p===m.priorite?"rgba(255,255,255,0.08)":"transparent",
                      color:p===m.priorite?PRIO_COL[p]:"rgba(255,255,255,0.35)", fontFamily:SA }}>
                    {p==="urgent"?"⚡ Urgent":p==="utile"?"Utile":"Plus tard"}
                  </button>
                ))}
              </div>

              {m.utilite&&<div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:4, fontStyle:"italic" }}>{m.utilite}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── CONSOMMABLES ── */}
      {onglet==="consommables" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtCon.map(c=>(
            <div key={c.id} style={{ background:FC.card,
              border:`1px solid ${c.statut!=="disponible"?"rgba(251,146,60,0.3)":FC.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{c.nom}</div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {c.categorie}
                    {c.qteParProduit ? ` · ${c.qteParProduit}/produit` : ""}
                    {c.coutUnitaire ? ` · ${c.coutUnitaire}€/u` : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:4, alignItems:"flex-start" }}>
                  <span style={{ fontSize:9, background:c.statut==="disponible"?"rgba(21,128,61,0.15)":c.statut==="faible"?"rgba(251,146,60,0.15)":"rgba(248,113,113,0.15)",
                    color:CONSO_COL[c.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                    {c.statut.replace("_"," ")}
                  </span>
                  <button onClick={()=>ouvrirCon(c)}
                    style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:6,
                      padding:"3px 8px", color:FC.creamD, cursor:"pointer", fontSize:11 }}>✏</button>
                  <button onClick={()=>supprimerCon(c.id)}
                    style={{ background:"rgba(248,113,113,0.1)", border:"none", borderRadius:6,
                      padding:"3px 7px", color:"#f87171", cursor:"pointer", fontSize:11 }}>✕</button>
                </div>
              </div>

              {/* Quantité */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <button onClick={()=>ajusterQteCon(c.id,-1)}
                  style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:6,
                    padding:"3px 9px", color:"#f87171", cursor:"pointer", fontSize:13 }}>−</button>
                <span style={{ fontSize:14, fontWeight:700,
                  color:c.qteDispo<=c.seuilAlerte?"#fb923c":FC.or, minWidth:30, textAlign:"center" }}>
                  {c.qteDispo}
                </span>
                <button onClick={()=>ajusterQteCon(c.id,1)}
                  style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:6,
                    padding:"3px 9px", color:FC.vertL, cursor:"pointer", fontSize:13 }}>+</button>
                <span style={{ fontSize:10, color:FC.creamD }}>· seuil {c.seuilAlerte}</span>
              </div>

              {/* Statut rapide */}
              <div style={{ display:"flex", gap:4 }}>
                {(["disponible","faible","rupture"] as StatutStock[]).map(s=>(
                  <button key={s} onClick={()=>changerStatutCon(c.id,s)}
                    style={{ fontSize:8, padding:"2px 8px", borderRadius:99, cursor:"pointer",
                      border:`1px solid ${s===c.statut?CONSO_COL[s]:"rgba(255,255,255,0.1)"}`,
                      background:s===c.statut?"rgba(255,255,255,0.08)":"transparent",
                      color:s===c.statut?CONSO_COL[s]:"rgba(255,255,255,0.35)", fontFamily:SA }}>
                    {s.replace("_"," ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Matériel ── */}
      {modal==="mat" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {editMat ? "Modifier le matériel" : "Ajouter du matériel"}
              </div>
              <button onClick={()=>{setModal(null);setEditMat(null);setFormMat(FORM_MAT0);}}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Nom *","nom","text","Robot pâtissier, moule..."],["Fournisseur","fournisseur","text","Metro, Amazon..."],
                ["Utilité","utilite","text","Description de l'utilisation"]].map(([l,k,t,ph])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
                  <input type={t} placeholder={ph} value={(formMat[k as keyof Materiel] as string)||""}
                    onChange={e=>setFormMat(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
                  <select value={formMat.categorie||""} onChange={e=>setFormMat(f=>({...f,categorie:e.target.value}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {CAT_MATERIEL.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>État</label>
                  <select value={formMat.etat||"bon"} onChange={e=>setFormMat(f=>({...f,etat:e.target.value as EtatMateriel}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {(["neuf","bon","a_remplacer","manquant"] as EtatMateriel[]).map(e=><option key={e} value={e}>{e.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Priorité</label>
                  <select value={formMat.priorite||"utile"} onChange={e=>setFormMat(f=>({...f,priorite:e.target.value as PrioriteAchat}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {(["urgent","utile","plus_tard"] as PrioriteAchat[]).map(p=><option key={p} value={p}>{p.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Quantité dispo</label>
                  <input type="number" min={0} value={formMat.qteDispo||0}
                    onChange={e=>setFormMat(f=>({...f,qteDispo:parseInt(e.target.value)||0}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Prix achat (€)</label>
                  <input type="number" min={0} value={formMat.prixAchat||""}
                    onChange={e=>setFormMat(f=>({...f,prixAchat:parseFloat(e.target.value)||undefined}))} style={inp}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarderMat}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editMat?"Enregistrer":"Ajouter"}
                </button>
                <button onClick={()=>{setModal(null);setEditMat(null);setFormMat(FORM_MAT0);}}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Consommable ── */}
      {modal==="conso" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {editCon?"Modifier le consommable":"Ajouter un consommable"}
              </div>
              <button onClick={()=>{setModal(null);setEditCon(null);setFormCon(FORM_CON0);}}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Nom *","nom","text","Boîtes bento, stickers..."],["Fournisseur","fournisseur","text","Amazon, imprimeur..."]].map(([l,k,t,ph])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
                  <input type={t} placeholder={ph} value={(formCon[k as keyof Consommable] as string)||""}
                    onChange={e=>setFormCon(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
                  <select value={formCon.categorie||""} onChange={e=>setFormCon(f=>({...f,categorie:e.target.value}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {CAT_CONSO.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Statut</label>
                  <select value={formCon.statut||"disponible"} onChange={e=>setFormCon(f=>({...f,statut:e.target.value as StatutStock}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {(["disponible","faible","rupture"] as StatutStock[]).map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
                {[["Qté disponible","qteDispo","number"],["Seuil alerte","seuilAlerte","number"],
                  ["Qté/produit","qteParProduit","number"],["Coût unitaire €","coutUnitaire","number"]].map(([l,k,t])=>(
                  <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
                    <input type={t} min={0} value={(formCon[k as keyof Consommable] as number)||""}
                      onChange={e=>setFormCon(f=>({...f,[k]:parseFloat(e.target.value)||0}))} style={inp}/>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarderCon}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  ✅ {editCon?"Enregistrer":"Ajouter"}
                </button>
                <button onClick={()=>{setModal(null);setEditCon(null);setFormCon(FORM_CON0);}}
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
