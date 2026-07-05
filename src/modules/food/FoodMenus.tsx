// ═══════════════════════════════════════════════════════════
// FoodMenus — Menus par type d'événement Bella'Food Partie II
// src/modules/food/FoodMenus.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_CATALOGUE, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import type { Menu, LigneMenu, TypeMenu, StatutMenu } from "./foodTypes";

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

// ── Suggestions automatiques par type de menu ──────────────
function suggererProduits(type: TypeMenu, nbPersonnes: number): LigneMenu[] {
  const filtered = FOOD_CATALOGUE.filter(p => p.disponible);
  const suggestions: LigneMenu[] = [];

  const ajouter = (categorie: string, qteParPers: number = 1) => {
    const prod = filtered.filter(p => p.categorie === categorie || p.sousCat === categorie);
    if (!prod.length) return;
    // Prendre 1 à 2 produits de la catégorie
    prod.slice(0, Math.min(2, prod.length)).forEach(p => {
      const qteBase = p.unite === "par personne" ? nbPersonnes
        : p.unite === "douzaine" ? Math.ceil(nbPersonnes / 12 * qteParPers)
        : qteParPers;
      suggestions.push({
        produitId:   p.id,
        nom:         p.nom,
        categorie:   p.categorie,
        qte:         qteBase,
        unite:       p.unite || "prestation",
        prixUnitaire:p.prix,
        totalEstime: p.prix ? Math.round(p.prix * qteBase * 100)/100 : null,
      });
    });
  };

  if (type === "buffet" || type === "cocktail") {
    ajouter("buffet", 1);
    ajouter("jus", Math.ceil(nbPersonnes / 10));
    ajouter("patisserie", Math.ceil(nbPersonnes / 12));
  } else if (type === "anniversaire") {
    ajouter("cake", 1);
    ajouter("cupcake", Math.ceil(nbPersonnes / 12));
    ajouter("jus", Math.ceil(nbPersonnes / 10));
  } else if (type === "mariage") {
    ajouter("mariage", 1);
    ajouter("buffet", 1);
    ajouter("boisson", Math.ceil(nbPersonnes / 8));
  } else if (type === "baby_shower" || type === "communion" || type === "bapteme") {
    ajouter("patisserie", 1);
    ajouter("cupcake", Math.ceil(nbPersonnes / 12));
    ajouter("jus", Math.ceil(nbPersonnes / 10));
  } else if (type === "repas_creole" || type === "repas_guyanais" || type === "repas_local") {
    ajouter("repas_guyanais", 1);
    ajouter("accompagnement", Math.ceil(nbPersonnes / 4));
    ajouter("boisson", Math.ceil(nbPersonnes / 8));
  } else if (type === "brunch") {
    ajouter("brunch", 1);
    ajouter("viennoiserie", Math.ceil(nbPersonnes / 6));
    ajouter("smoothie", Math.ceil(nbPersonnes / 4));
  } else if (type === "premium") {
    ajouter("entremet", 1);
    ajouter("macarons", Math.ceil(nbPersonnes / 12));
    ajouter("cocktail", Math.ceil(nbPersonnes / 4));
  } else {
    ajouter("patisserie", 1);
    ajouter("boisson", Math.ceil(nbPersonnes / 8));
  }

  return suggestions.filter((v,i,a) => a.findIndex(x=>x.produitId===v.produitId)===i);
}

export default function FoodMenus() {
  const [menus,   setMenus]   = useState<Menu[]>([]);
  const [modal,   setModal]   = useState<"creer"|"detail"|null>(null);
  const [detail,  setDetail]  = useState<Menu|null>(null);
  const [filtre,  setFiltre]  = useState<TypeMenu|"tous">("tous");

  const FORM_INIT: Omit<Menu,"id"|"dateCreation"> = {
    nom:"", type:"anniversaire", nbPersonnes:10, lignes:[], statut:"brouillon",
  };
  const [form, setForm] = useState<Omit<Menu,"id"|"dateCreation">>(FORM_INIT);

  const visibles = menus.filter(m => filtre==="tous" || m.type===filtre);

  const totalMenu = (m: Menu) =>
    m.lignes.reduce((s,l) => s+(l.totalEstime||0),0);

  const creerMenu = () => {
    if (!form.nom.trim()) return;
    const lignesSugg = form.lignes.length
      ? form.lignes
      : suggererProduits(form.type, form.nbPersonnes);
    setMenus(ms => [{
      ...form, id:"m_"+Date.now().toString().slice(-5),
      dateCreation:new Date().toISOString().split("T")[0],
      lignes: lignesSugg,
    }, ...ms]);
    setModal(null);
    setForm(FORM_INIT);
  };

  const changerStatut = (id:string, statut:StatutMenu) =>
    setMenus(ms => ms.map(m => m.id===id?{...m,statut}:m));

  const imprimerMenu = (m: Menu) => {
    const total = totalMenu(m);
    const lignesHtml = m.lignes.map(l =>
      `<tr><td>${l.nom}</td><td>${l.qte} ${l.unite}</td><td>${l.prixUnitaire!=null?fmtPrix(l.prixUnitaire):"Sur devis"}</td><td>${l.totalEstime!=null?fmtPrix(l.totalEstime):"—"}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Menu ${m.nom}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}
h1{color:#15803d;border-bottom:2px solid #15803d;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{padding:7px 10px;border:1px solid #e5e7eb;font-size:12px}
thead{background:#15803d;color:#fff}.total{font-weight:bold;color:#15803d;font-size:14px;margin-top:12px;text-align:right}
</style></head><body>
<h1>🍽 ${m.nom}</h1>
<p>${TYPES_MENU.find(t=>t.id===m.type)?.nom||m.type} · ${m.nbPersonnes} personnes · ${m.dateCreation}</p>
<table><thead><tr><th>Produit</th><th>Quantité</th><th>P.U.</th><th>Total</th></tr></thead>
<tbody>${lignesHtml}</tbody></table>
<p class='total'>Total estimé : ${fmtPrix(total)}</p>
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

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
          {detail.lignes.map((l,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize:12, color:"#fff" }}>{l.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>{l.qte} {l.unite}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color:l.totalEstime?FC.or:FC.creamD }}>
                  {l.totalEstime!=null?fmtPrix(l.totalEstime):"Sur devis"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8,
          borderTop:`1px solid ${FC.line}` }}>
          <span style={{ fontSize:12, color:FC.creamD }}>Total estimé</span>
          <span style={{ fontSize:18, fontWeight:700, color:FC.or, fontFamily:FS }}>
            {fmtPrix(totalMenu(detail))}
          </span>
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
        <div style={{ fontSize:12, color:FC.creamD }}>{visibles.length} menu{visibles.length>1?"s":""}</div>
        <button onClick={()=>{setForm(FORM_INIT);setModal("creer");}}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Créer un menu
        </button>
      </div>

      {/* Filtres type */}
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

      {menus.length===0 && (
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
            {" · "}{m.nbPersonnes} personnes · {m.lignes.length} produits
          </div>
          {totalMenu(m) > 0 && (
            <div style={{ fontSize:13, fontWeight:700, color:FC.or, marginTop:4 }}>
              {fmtPrix(totalMenu(m))}
            </div>
          )}
        </div>
      ))}

      {/* Modal création */}
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
                💡 Les produits seront suggérés automatiquement selon le type et le nombre de personnes.
              </div>
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
