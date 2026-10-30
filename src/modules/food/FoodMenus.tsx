// ═══════════════════════════════════════════════════════════
// FoodMenus — Menus Bella'Food, branchés sur food_menus (migration 0054)
// Un menu = des lignes de vraies recettes (food_recettes) pour un
// nombre de personnes donné, avec liste de courses agrégée.
// src/modules/food/FoodMenus.tsx
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { getRecettesFoodAvecDiagnostic, getStockGlobalFood } from "./foodApi";
import { getMenusFoodAvecDiagnostic, creerMenuFood, majMenuFood, agregerIngredients } from "./menusApi";
import { creerAchatFood, construireLignesAchatDepuisManque } from "./achatsApi";
import { calculerTotauxAchat } from "./foodUtils";
import type { Menu, LigneMenu, TypeMenu, StatutMenu, Recette, StockItem } from "./foodTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";

const TYPES_MENU: { id: TypeMenu; nom: string; ico: string }[] = [
  {id:"buffet",         nom:"Buffet",               ico:"🍱"},
  {id:"cocktail",       nom:"Cocktail",              ico:"🍹"},
  {id:"brunch",         nom:"Brunch",                ico:"☕"},
  {id:"anniversaire",   nom:"Anniversaire",          ico:"🎂"},
  {id:"mariage",        nom:"Mariage",               ico:"💒"},
  {id:"communion",      nom:"Communion",             ico:"⛪"},
  {id:"bapteme",        nom:"Baptême",               ico:"🕊"},
  {id:"baby_shower",    nom:"Baby Shower",           ico:"🍼"},
  {id:"repas_creole",   nom:"Repas créole",          ico:"🌴"},
  {id:"repas_guyanais", nom:"Repas guyanais",        ico:"🌿"},
  {id:"repas_local",    nom:"Repas local",           ico:"🥘"},
  {id:"entreprise",     nom:"Entreprise",            ico:"💼"},
  {id:"enfant",         nom:"Menu enfant",           ico:"🧒"},
  {id:"premium",        nom:"Menu premium",          ico:"⭐"},
];

const STATUT_COL: Record<StatutMenu, string> = {
  brouillon:"rgba(201,168,76,0.15)", valide:"rgba(21,128,61,0.2)", archive:"rgba(255,255,255,0.06)",
};
const STATUT_TXT: Record<StatutMenu, string> = {
  brouillon:"#c9a96e", valide:"#22c55e", archive:"rgba(255,255,255,0.3)",
};

const inpStyle: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

export default function FoodMenus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [chargement, setChargement] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [modal, setModal] = useState<"creer"|null>(null);
  const [detail, setDetail] = useState<Menu|null>(null);
  const [filtre, setFiltre] = useState<TypeMenu|"tous">("tous");
  const [recetteAjout, setRecetteAjout] = useState("");
  const [portionsAjout, setPortionsAjout] = useState(4);
  const [erreur, setErreur] = useState<string | null>(null);

  const FORM_INIT: Omit<Menu,"id"|"dateCreation"> = {
    nom:"", type:"anniversaire", nbPersonnes:10, lignes:[], statut:"brouillon",
  };
  const [form, setForm] = useState<Omit<Menu,"id"|"dateCreation">>(FORM_INIT);

  const charger = async () => {
    setChargement(true);
    const [{ menus: m, diagnostic: dMenus }, { recettes: r, diagnostic: dRecettes }, s] = await Promise.all([
      getMenusFoodAvecDiagnostic(), getRecettesFoodAvecDiagnostic(), getStockGlobalFood(),
    ]);
    setMenus(m);
    setRecettes(r);
    setStocks(s);
    setDiagnostic(dMenus || dRecettes);
    setChargement(false);
  };
  useEffect(() => { charger(); }, []);

  const recettesParId = new Map(recettes.map(r => [r.id, r]));
  const visibles = menus.filter(m => filtre==="tous" || m.type===filtre);

  const creerMenu = async () => {
    if (!form.nom.trim()) { setErreur("Le nom du menu est obligatoire."); return; }
    const res = await creerMenuFood(form);
    if (!res.ok) { setErreur(res.error || "Échec de l'enregistrement — réessayez."); return; }
    setModal(null);
    setForm(FORM_INIT);
    setErreur(null);
    await charger();
  };

  const changerStatut = async (id:string, statut:StatutMenu) => {
    const res = await majMenuFood(id, { statut });
    if (!res.ok) { alert("Échec de l'enregistrement du statut."); return; }
    setMenus(ms => ms.map(m => m.id===id?{...m,statut}:m));
    setDetail(d => d && d.id===id ? {...d,statut} : d);
  };

  const ajouterLigne = async () => {
    if (!detail || !recetteAjout || portionsAjout <= 0) return;
    const recette = recettesParId.get(recetteAjout);
    if (!recette) return;
    const nouvelleLigne: LigneMenu = { recetteId: recette.id, recetteNom: recette.nom, nbPortions: portionsAjout };
    const lignes = [...detail.lignes, nouvelleLigne];
    const res = await majMenuFood(detail.id, { lignes });
    if (!res.ok) { alert("Échec de l'enregistrement de la ligne."); return; }
    const miseAJour = { ...detail, lignes };
    setDetail(miseAJour);
    setMenus(ms => ms.map(m => m.id===detail.id ? miseAJour : m));
    setRecetteAjout("");
  };

  const supprimerLigne = async (index: number) => {
    if (!detail) return;
    const lignes = detail.lignes.filter((_, i) => i !== index);
    const res = await majMenuFood(detail.id, { lignes });
    if (!res.ok) { alert("Échec de la suppression."); return; }
    const miseAJour = { ...detail, lignes };
    setDetail(miseAJour);
    setMenus(ms => ms.map(m => m.id===detail.id ? miseAJour : m));
  };

  const genererListeCourses = (m: Menu) => {
    const agreges = agregerIngredients(m.lignes, recettesParId);
    if (agreges.length === 0) { alert("Ce menu n'a pas encore de recette avec ingrédients renseignés."); return; }
    const lignesTexte = agreges.map(a =>
      a.quantite != null
        ? `- ${a.nom} : ${a.quantite} ${a.unite}${a.incertain ? " (+ quantité non chiffrée sur une autre recette)" : ""}`
        : `- ${a.nom} : à doser (${a.unite})`
    );
    const texte = [`Liste de courses — ${m.nom} (${m.nbPersonnes} personnes)`, "", ...lignesTexte].join("\n");
    navigator.clipboard?.writeText(texte).then(
      () => alert("Liste de courses copiée — collez-la où vous voulez."),
      () => alert("Impossible de copier automatiquement — recopiez la liste manuellement.")
    );
  };

  const creerAchatDepuisManque = async (m: Menu) => {
    const agreges = agregerIngredients(m.lignes, recettesParId);
    const lignesAchat = construireLignesAchatDepuisManque(agreges, stocks);
    if (lignesAchat.length === 0) {
      alert("Rien à acheter : tout est déjà en stock, ou les quantités de ce menu ne sont pas encore chiffrées.");
      return;
    }
    const tots = calculerTotauxAchat(lignesAchat);
    const res = await creerAchatFood({
      reference: "ACH-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
      fournisseurNom: "",
      date: new Date().toISOString().split("T")[0],
      lignes: lignesAchat,
      statut: "brouillon",
      observations: `Généré depuis le menu "${m.nom}" — quantités manquantes par rapport au stock.`,
      ...tots,
    });
    if (!res.ok) { alert("Échec de la création de l'achat — réessayez."); return; }
    alert(`Brouillon d'achat créé (${lignesAchat.length} ligne${lignesAchat.length>1?"s":""}) — retrouvez-le dans l'onglet Achats pour choisir le fournisseur et ajuster les prix.`);
  };

  const imprimerMenu = (m: Menu) => {
    const lignesHtml = m.lignes.map(l => {
      const recette = recettesParId.get(l.recetteId);
      return `<tr><td>${l.recetteNom}</td><td>${l.nbPortions} portion${l.nbPortions>1?"s":""}</td><td>${recette ? (recette.statut==="validee"?"Validée":"Brouillon") : "—"}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Menu ${m.nom}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}
h1{color:#15803d;border-bottom:2px solid #15803d;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{padding:7px 10px;border:1px solid #e5e7eb;font-size:12px}
thead{background:#15803d;color:#fff}
</style></head><body>
<h1>🍽 ${m.nom}</h1>
<p>${TYPES_MENU.find(t=>t.id===m.type)?.nom||m.type} · ${m.nbPersonnes} personnes · ${m.dateCreation}</p>
<table><thead><tr><th>Recette</th><th>Portions</th><th>Statut recette</th></tr></thead>
<tbody>${lignesHtml}</tbody></table>
${m.notes?`<p style='font-size:11px;color:#6b7280'>Notes : ${m.notes}</p>`:""}
</body></html>`;
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),400);
  };

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={()=>setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:8, padding:"5px 12px", color:"rgba(255,255,255,0.5)",
          cursor:"pointer", fontSize:11, fontFamily:SA }}>‹ Retour</button>

      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:FS, fontSize:16, color:"#fff" }}>{detail.nom}</div>
            <div style={{ fontSize:11, color:FC.creamD, marginTop:2 }}>
              {TYPES_MENU.find(t=>t.id===detail.type)?.ico} {TYPES_MENU.find(t=>t.id===detail.type)?.nom}
              {" · "}{detail.nbPersonnes} pers.
            </div>
          </div>
          <span style={{ fontSize:9, background:STATUT_COL[detail.statut],
            color:STATUT_TXT[detail.statut], borderRadius:4, padding:"2px 8px", fontWeight:700, alignSelf:"flex-start" }}>
            {detail.statut}
          </span>
        </div>

        {detail.lignes.length === 0 && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontStyle:"italic", padding:"8px 0" }}>
            Aucune recette dans ce menu pour l'instant.
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
          {detail.lignes.map((l,i) => {
            const recette = recettesParId.get(l.recetteId);
            return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize:12, color:"#fff" }}>{l.recetteNom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>
                  {l.nbPortions} portion{l.nbPortions>1?"s":""}
                  {recette && recette.statut!=="validee" && <span style={{ color:"#fb923c" }}> · {recette.statut === "brouillon" ? "brouillon" : recette.statut}</span>}
                  {!recette && <span style={{ color:"#f87171" }}> · recette introuvable</span>}
                </div>
              </div>
              <button onClick={()=>supprimerLigne(i)}
                style={{ fontSize:10, padding:"3px 9px", borderRadius:7, cursor:"pointer",
                  background:"rgba(248,113,113,0.1)", border:"none", color:"#f87171", fontFamily:SA }}>
                ✕
              </button>
            </div>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:6, alignItems:"flex-end" }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Ajouter une recette</label>
            <select value={recetteAjout} onChange={e=>setRecetteAjout(e.target.value)} style={{ ...inpStyle, background:"#1a1a2e" }}>
              <option value="">— Choisir —</option>
              {recettes.filter(r=>r.statut!=="archivee").map(r=>(
                <option key={r.id} value={r.id}>{r.nom}{r.statut!=="validee"?" (brouillon)":""}</option>
              ))}
            </select>
          </div>
          <div style={{ width:80, display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Portions</label>
            <input type="number" min={1} value={portionsAjout} onChange={e=>setPortionsAjout(parseInt(e.target.value)||1)} style={inpStyle}/>
          </div>
          <button onClick={ajouterLigne} disabled={!recetteAjout}
            style={{ background:FC.vert, border:"none", borderRadius:8, padding:"9px 14px",
              color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, opacity:recetteAjout?1:0.5 }}>
            + Ajouter
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {(["brouillon","valide","archive"] as StatutMenu[]).map(s=>(
          <button key={s} onClick={()=>changerStatut(detail.id,s)}
            style={{ fontSize:9, padding:"3px 10px", borderRadius:99, cursor:"pointer",
              border:`1px solid ${s===detail.statut?FC.vert:"rgba(255,255,255,0.1)"}`,
              background:s===detail.statut?"rgba(21,128,61,0.15)":"transparent",
              color:s===detail.statut?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>
            {s}
          </button>
        ))}
        <button onClick={()=>genererListeCourses(detail)}
          style={{ fontSize:10, padding:"4px 12px", borderRadius:99, cursor:"pointer",
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
            color:"rgba(255,255,255,0.7)", fontFamily:SA }}>
          📋 Liste de courses
        </button>
        <button onClick={()=>creerAchatDepuisManque(detail)}
          style={{ fontSize:10, padding:"4px 12px", borderRadius:99, cursor:"pointer",
            background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.3)",
            color:FC.or, fontFamily:SA }}>
          🛒 Créer un achat (ce qui manque)
        </button>
        <button onClick={()=>imprimerMenu(detail)}
          style={{ fontSize:10, padding:"4px 12px", borderRadius:99, cursor:"pointer",
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
            color:"rgba(255,255,255,0.7)", fontFamily:SA }}>
          🖨 Imprimer
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{chargement ? "Chargement…" : `${visibles.length} menu${visibles.length>1?"s":""}`}</div>
        <button onClick={()=>{setForm(FORM_INIT);setErreur(null);setModal("creer");}}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Créer un menu
        </button>
      </div>

      {diagnostic && (
        <div style={{ fontSize:10, color:"#f87171", fontFamily:"monospace", background:"rgba(248,113,113,0.08)", borderRadius:8, padding:"8px 10px" }}>
          {diagnostic}
        </div>
      )}

      <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:2 }}>
        <button onClick={()=>setFiltre("tous")}
          style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
            fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
            background:filtre==="tous"?FC.vert:"rgba(255,255,255,0.06)",
            color:filtre==="tous"?"#fff":"rgba(255,255,255,0.4)" }}>Tous</button>
        {TYPES_MENU.map(t=>(
          <button key={t.id} onClick={()=>setFiltre(t.id)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtre===t.id?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",
              color:filtre===t.id?"#fff":"rgba(255,255,255,0.4)" }}>
            {t.ico} {t.nom}
          </button>
        ))}
      </div>

      {!chargement && menus.length===0 && !diagnostic && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucun menu créé. Commencez par "Créer un menu".
        </div>
      )}

      {visibles.map(m => (
        <div key={m.id} onClick={()=>setDetail(m)}
          style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.nom}</div>
            <span style={{ fontSize:9, background:STATUT_COL[m.statut],
              color:STATUT_TXT[m.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
              {m.statut}
            </span>
          </div>
          <div style={{ fontSize:11, color:FC.creamD }}>
            {TYPES_MENU.find(t=>t.id===m.type)?.ico} {TYPES_MENU.find(t=>t.id===m.type)?.nom}
            {" · "}{m.nbPersonnes} personnes · {m.lignes.length} recette{m.lignes.length>1?"s":""}
          </div>
        </div>
      ))}

      {modal==="creer" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouveau menu</div>
              <button onClick={()=>setModal(null)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Nom du menu *</label>
                <input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}
                  placeholder="Menu anniversaire 30 ans..." style={inpStyle}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as TypeMenu}))}
                    style={{ ...inpStyle, background:"#1a1a2e" }}>
                    {TYPES_MENU.map(t=><option key={t.id} value={t.id}>{t.ico} {t.nom}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Nb personnes</label>
                  <input type="number" min={1} value={form.nbPersonnes}
                    onChange={e=>setForm(f=>({...f,nbPersonnes:parseInt(e.target.value)||10}))}
                    style={inpStyle}/>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:SA }}>Notes</label>
                <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  rows={2} placeholder="Contraintes alimentaires, personnalisation..."
                  style={{ ...inpStyle, resize:"vertical" }}/>
              </div>
              <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
                borderRadius:8, padding:"10px 12px", fontSize:11, color:FC.creamD }}>
                💡 Ajoutez les recettes une fois le menu créé, depuis sa fiche.
              </div>
              {erreur && (
                <div style={{ fontSize:11, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:8, padding:"8px 12px" }}>
                  ⚠️ {erreur}
                </div>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creerMenu}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
                    padding:"10px", color:"#fff", fontWeight:700, fontSize:12,
                    cursor:"pointer", fontFamily:SA }}>
                  ✅ Créer le menu
                </button>
                <button onClick={()=>setModal(null)}
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
