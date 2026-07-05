// ═══════════════════════════════════════════════════════════
// FoodEtiquettes — Module Étiquettes Bella'Food Partie IV
// Génération, formats, impression HTML
// src/modules/food/FoodEtiquettes.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_RECETTES_INIT, FOOD_COLORS as FC } from "./foodConsts";
import type { Etiquette, FormatEtiquette, MentionEtiquette } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const FORMATS: { id: FormatEtiquette; nom: string; ico: string; desc: string; w: number; h: number }[] = [
  {id:"petit",     nom:"Petite",     ico:"🏷",  desc:"50×30mm",         w:190, h:110},
  {id:"moyen",     nom:"Moyenne",    ico:"🔖",  desc:"80×50mm",         w:300, h:190},
  {id:"boite",     nom:"Boîte",      ico:"📦",  desc:"100×70mm",        w:380, h:265},
  {id:"bouteille", nom:"Bouteille",  ico:"🍶",  desc:"90×50mm (wrap)", w:340, h:190},
  {id:"pot_glace", nom:"Pot glace",  ico:"🍦",  desc:"Couvercle Ø70",   w:265, h:265},
];

const MENTIONS: { id: MentionEtiquette; nom: string }[] = [
  {id:"interne",  nom:"Interne"},
  {id:"client",   nom:"Client"},
  {id:"livraison",nom:"Livraison"},
];

function genEtiquetteHTML(e: Etiquette, fmt: typeof FORMATS[0]): string {
  const isBoite    = e.format === "boite";
  const isBouteille = e.format === "bouteille";
  const dlcLabel   = e.dlc ? "DLC : "+e.dlc : e.ddm ? "DDM : "+e.ddm : "";
  const bgCouleur  = e.mention === "interne" ? "#f0fdf4" : e.mention === "livraison" ? "#eff6ff" : "#fff";
  const bordColor  = e.mention === "interne" ? "#15803d" : e.mention === "livraison" ? "#2563eb" : "#065f46";

  return `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Étiquette — ${e.nomProduit}</title>
<style>
@page { size: ${fmt.w}px ${fmt.h}px; margin: 0; }
body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; }
.etiq {
  width: ${fmt.w-8}px; height: ${fmt.h-8}px;
  margin: 4px; padding: 8px;
  background: ${bgCouleur};
  border: 2px solid ${bordColor};
  border-radius: 6px;
  box-sizing: border-box;
  display: flex; flex-direction: column; justify-content: space-between;
}
.nom { font-size: ${isBoite ? 14 : 11}px; font-weight: 700; color: #1a1a1a; margin-bottom: 3px; }
.info { font-size: ${isBoite ? 10 : 8}px; color: #374151; line-height: 1.5; }
.dlc { font-size: ${isBoite ? 11 : 9}px; font-weight: 700; color: #dc2626; margin-top: 3px; }
.lot { font-size: 8px; color: #6b7280; }
.allerg { font-size: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 3px;
  padding: 2px 4px; margin-top: 3px; color: #92400e; font-weight: 700; }
.mention { font-size: 7px; color: ${bordColor}; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; text-align: right; }
.footer { font-size: 7px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 2px; }
@media print { body { margin: 0; } button { display: none; } }
</style></head><body>
<div class='etiq'>
  <div>
    <div class='nom'>🍃 ${e.nomProduit}</div>
    <div class='info'>
      Fabrication : <strong>${new Date(e.dateFabrication).toLocaleDateString("fr-FR")}</strong>
      ${e.poids ? "<br>Poids : "+e.poids : ""}
      ${e.volume ? "<br>Volume : "+e.volume : ""}
      ${e.conditionsConservation ? "<br>Conservation : "+e.conditionsConservation : ""}
    </div>
    ${dlcLabel ? `<div class='dlc'>${dlcLabel}</div>` : ""}
    ${e.numerLot ? `<div class='lot'>Lot : ${e.numerLot}</div>` : ""}
    ${e.referenceProduction ? `<div class='lot'>Réf. prod. : ${e.referenceProduction}</div>` : ""}
    ${e.allergenes?.length ? `<div class='allerg'>⚠ Allergènes : ${e.allergenes.join(", ")}</div>` : ""}
    ${e.ingredients && isBoite ? `<div class='info' style='margin-top:3px;font-size:8px'>Ingrédients : ${e.ingredients}</div>` : ""}
  </div>
  <div>
    <div class='mention'>${e.mention}</div>
    <div class='footer'>Bella'Food — Sinnamary, Guyane</div>
  </div>
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
}

const FORM0: Partial<Etiquette> = {
  dateFabrication: new Date().toISOString().split("T")[0],
  format: "moyen",
  mention: "client",
};

export default function FoodEtiquettes() {
  const [etiquettes, setEtiquettes] = useState<Etiquette[]>([]);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState<Partial<Etiquette>>(FORM0);
  const [previewFmt, setPreviewFmt] = useState<FormatEtiquette>("moyen");

  const chargerDepuisRecette = (id: string) => {
    const r = FOOD_RECETTES_INIT.find(x => x.id === id);
    if (!r) return;
    setForm(f => ({
      ...f,
      nomProduit: r.nom,
      allergenes: r.allergenes,
      ingredients: r.ingredients.map(i => i.nom).join(", "),
      conditionsConservation: r.conservation,
    }));
  };

  const creer = () => {
    if (!form.nomProduit?.trim()) return;
    const e: Etiquette = {
      id:                   "etiq_" + Date.now().toString().slice(-5),
      nomProduit:           form.nomProduit!,
      dateFabrication:      form.dateFabrication || new Date().toISOString().split("T")[0],
      dlc:                  form.dlc,
      ddm:                  form.ddm,
      numerLot:             form.numerLot,
      allergenes:           form.allergenes,
      ingredients:          form.ingredients,
      poids:                form.poids,
      volume:               form.volume,
      conditionsConservation: form.conditionsConservation,
      referenceProduction:  form.referenceProduction,
      mention:              form.mention || "client",
      format:               form.format || "moyen",
    };
    setEtiquettes(es => [e, ...es]);
    setModal(false);
    setForm(FORM0);
    // Ouvrir directement dans un nouvel onglet pour impression
    const fmt = FORMATS.find(f => f.id === e.format)!;
    const html = genEtiquetteHTML(e, fmt);
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const imprimer = (e: Etiquette) => {
    const fmt = FORMATS.find(f => f.id === e.format)!;
    const html = genEtiquetteHTML(e, fmt);
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html); win.document.close();
  };

  const Field = ({ label, k, type="text", ph="" }: { label:string; k:keyof Etiquette; type?:string; ph?:string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form[k] as string|undefined) ?? ""}
        onChange={e => setForm(f => ({ ...f, [k]: e.target.value || undefined }))}
        style={inp}/>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{etiquettes.length} étiquette{etiquettes.length>1?"s":""}</div>
        <button onClick={() => { setForm(FORM0); setModal(true); }}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouvelle étiquette
        </button>
      </div>

      {/* Formats disponibles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
        {FORMATS.map(f => (
          <div key={f.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:10, padding:"9px 12px", display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:18 }}>{f.ico}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{f.nom}</div>
              <div style={{ fontSize:9, color:FC.creamD }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {etiquettes.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
          Aucune étiquette générée. Créez la première.
        </div>
      )}

      {etiquettes.map(e => {
        const fmt = FORMATS.find(f => f.id === e.format);
        const mentionCol = e.mention === "interne" ? FC.vertL : e.mention === "livraison" ? "#60a5fa" : FC.or;
        return (
          <div key={e.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px", display:"flex",
            justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{e.nomProduit}</div>
              <div style={{ fontSize:10, color:FC.creamD }}>
                {fmt?.ico} {fmt?.nom} · {new Date(e.dateFabrication).toLocaleDateString("fr-FR")}
                {e.dlc ? ` · DLC: ${e.dlc}` : ""}
              </div>
              <span style={{ fontSize:9, color:mentionCol, fontWeight:700 }}>{e.mention}</span>
            </div>
            <button onClick={() => imprimer(e)}
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:8, padding:"6px 12px", color:"rgba(255,255,255,0.7)",
                fontSize:11, cursor:"pointer", fontFamily:SA }}>
              🖨 Imprimer
            </button>
          </div>
        );
      })}

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouvelle étiquette</div>
              <button onClick={() => setModal(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {/* Import depuis recette */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Importer depuis une recette (optionnel)</label>
                <select onChange={e => chargerDepuisRecette(e.target.value)}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  <option value="">— Choisir —</option>
                  {FOOD_RECETTES_INIT.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <Field label="Nom du produit *"       k="nomProduit"            ph="Layer Cake chocolat"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Field label="Date fabrication"     k="dateFabrication"       type="date"/>
                <Field label="DLC"                  k="dlc"                   type="date"/>
                <Field label="DDM"                  k="ddm"                   type="date"/>
                <Field label="N° lot"               k="numerLot"              ph="LOT-001"/>
                <Field label="Poids"                k="poids"                 ph="350g"/>
                <Field label="Volume"               k="volume"                ph="250ml"/>
              </div>
              <Field label="Conservation"           k="conditionsConservation" ph="Conserver au réfrigérateur..."/>
              <Field label="Ingrédients"            k="ingredients"           ph="Farine, sucre, beurre..."/>
              <Field label="Réf. production"        k="referenceProduction"   ph="PROD-2026-XXXX"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Format</label>
                  <select value={form.format || "moyen"} onChange={e => setForm(f => ({ ...f, format:e.target.value as FormatEtiquette }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {FORMATS.map(f => <option key={f.id} value={f.id}>{f.ico} {f.nom} ({f.desc})</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Mention</label>
                  <select value={form.mention || "client"} onChange={e => setForm(f => ({ ...f, mention:e.target.value as MentionEtiquette }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {MENTIONS.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creer}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  🖨 Générer et imprimer
                </button>
                <button onClick={() => setModal(false)}
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
