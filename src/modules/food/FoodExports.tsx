// ═══════════════════════════════════════════════════════════
// FoodExports — Exports analytiques Bella'Food Partie IV
// CSV, WhatsApp, PDF HTML imprimable, rapport mensuel
// src/modules/food/FoodExports.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_RECETTES_INIT, FOOD_STOCK_INIT, FOOD_CATALOGUE, FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix, fmtDuree } from "./foodUtils";

const SA = "system-ui, sans-serif";

type TypeExport =
  | "recettes" | "stocks" | "catalogue" | "rapport_mensuel";

const EXPORTS: { id: TypeExport; nom: string; ico: string; desc: string }[] = [
  {id:"recettes",       nom:"Recettes",          ico:"📖", desc:"Liste complète des recettes avec coûts"},
  {id:"stocks",         nom:"Stocks",            ico:"📦", desc:"État actuel des stocks et alertes"},
  {id:"catalogue",      nom:"Catalogue",         ico:"🛒", desc:"Catalogue produits avec prix"},
  {id:"rapport_mensuel",nom:"Rapport mensuel",   ico:"📊", desc:"Résumé complet de l'activité"},
];

// ── Générateur CSV ─────────────────────────────────────────
function genCSV(headers: string[], rows: string[][]): string {
  const lines = [
    headers.join(";"),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")),
  ];
  return "\uFEFF" + lines.join("\r\n"); // BOM pour Excel
}

function telechargerCSV(content: string, filename: string) {
  const blob = new Blob([content], { type:"text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Générateurs par type ───────────────────────────────────
function exportRecettesCSV() {
  const headers = ["Nom","Catégorie","Statut","Difficulté","Nb parts","Prépa (min)","Cuisson (min)","Coût matière €","Prix conseillé €","Marge €","Allergènes"];
  const rows = FOOD_RECETTES_INIT.map(r => [
    r.nom, r.categorie, r.statut, String(r.difficulte),
    String(r.nbParts), String(r.tempsPrepa), String(r.tempsCuisson),
    String(r.coutMatiere||""), String(r.prixConseille||""),
    String(r.margeEstimee||""), (r.allergenes||[]).join(", "),
  ]);
  telechargerCSV(genCSV(headers, rows), "bellaïa_recettes_" + new Date().toISOString().slice(0,10) + ".csv");
}

function exportStocksCSV() {
  const headers = ["Nom","Catégorie","Unité","Qté restante","Seuil alerte","Prix achat €","Fournisseur","Statut"];
  const rows = FOOD_STOCK_INIT.map(s => {
    const statut = s.qteRestante === 0 ? "Rupture" : s.qteRestante <= s.seuilAlerte ? "Faible" : "OK";
    return [s.nom, s.categorie, s.unite, String(s.qteRestante), String(s.seuilAlerte), String(s.prixAchat||""), s.fournisseur||"", statut];
  });
  telechargerCSV(genCSV(headers, rows), "bellaïa_stocks_" + new Date().toISOString().slice(0,10) + ".csv");
}

function exportCatalogueCSV() {
  const headers = ["Nom","Catégorie","Sous-catégorie","Prix €","Unité","Disponible","Visible Events"];
  const rows = FOOD_CATALOGUE.map(p => [
    p.nom, p.categorie, p.sousCat||"", String(p.prix ?? "Sur devis"),
    p.unite||"", p.disponible ? "Oui":"Non", p.visibleEvents ? "Oui":"Non",
  ]);
  telechargerCSV(genCSV(headers, rows), "bellaïa_catalogue_" + new Date().toISOString().slice(0,10) + ".csv");
}

// ── Rapport mensuel HTML ───────────────────────────────────
function genRapportHTML(): string {
  const date     = new Date().toLocaleDateString("fr-FR", {month:"long", year:"numeric"});
  const recettes = FOOD_RECETTES_INIT;
  const stocks   = FOOD_STOCK_INIT;
  const alertes  = stocks.filter(s => s.qteRestante <= s.seuilAlerte);
  const top5     = [...recettes]
    .filter(r => r.prixConseille && r.coutMatiere)
    .sort((a,b) => (b.margeEstimee||0) - (a.margeEstimee||0))
    .slice(0,5);
  const stocksRows = stocks.map(s => {
    const ok = s.qteRestante > s.seuilAlerte;
    return `<tr style='background:${ok?"":"#fee2e2"}'>
      <td>${s.nom}</td><td>${s.qteRestante} ${s.unite}</td>
      <td style='color:${ok?"#16a34a":"#dc2626"};font-weight:700'>${ok?"✅ OK":"⚠ Alerte"}</td>
    </tr>`;
  }).join("");
  const recettesRows = top5.map((r,i) => {
    const cout = (r.coutMatiere||0) + (r.coutConsommables||0);
    const marge = r.prixConseille ? Math.round((1-cout/r.prixConseille)*100) : 0;
    return `<tr>
      <td>${i+1}. ${r.nom}</td>
      <td style='text-align:right'>${r.prixConseille ? r.prixConseille+"€" : "—"}</td>
      <td style='text-align:right;color:#16a34a;font-weight:700'>${marge}%</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Rapport Bella'Food — ${date}</title>
<style>
body{font-family:'Helvetica Neue',Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto;color:#1a1a1a;font-size:13px}
h1{color:#15803d;font-family:Georgia,serif;font-size:24px;border-bottom:3px solid #15803d;padding-bottom:10px}
h2{color:#15803d;font-size:16px;margin-top:28px;border-left:4px solid #15803d;padding-left:10px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}
.kpi{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;text-align:center}
.kpi-val{font-size:22px;font-weight:700;color:#15803d}
.kpi-lbl{font-size:10px;color:#6b7280;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:12px 0}
thead th{background:#15803d;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
tbody td{padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}
.footer{margin-top:30px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
@media print{body{padding:10px}button{display:none}}
</style></head><body>
<h1>🍃 Rapport Bella'Food</h1>
<p style='color:#6b7280'>Généré le ${new Date().toLocaleDateString("fr-FR")} · Période : ${date}</p>
<div class='kpi-grid'>
  <div class='kpi'><div class='kpi-val'>${recettes.length}</div><div class='kpi-lbl'>Recettes</div></div>
  <div class='kpi'><div class='kpi-val'>${recettes.filter(r=>r.statut==="validee").length}</div><div class='kpi-lbl'>Validées</div></div>
  <div class='kpi'><div class='kpi-val'>${stocks.length}</div><div class='kpi-lbl'>Produits en stock</div></div>
  <div class='kpi'><div class='kpi-val' style='color:${alertes.length>0?"#dc2626":"#15803d"}'>${alertes.length}</div><div class='kpi-lbl'>Alertes stock</div></div>
</div>
<h2>Top 5 recettes les plus rentables</h2>
<table><thead><tr><th>Recette</th><th style='text-align:right'>Prix</th><th style='text-align:right'>Marge</th></tr></thead>
<tbody>${recettesRows}</tbody></table>
<h2>État des stocks</h2>
<table><thead><tr><th>Produit</th><th>Quantité</th><th>Statut</th></tr></thead>
<tbody>${stocksRows}</tbody></table>
${alertes.length > 0 ? `<h2 style='color:#dc2626'>⚠ Points d'attention (${alertes.length})</h2>
<ul>${alertes.map(s=>`<li><strong>${s.nom}</strong> : ${s.qteRestante} ${s.unite} restant${s.qteRestante>1?"s":""} (seuil: ${s.seuilAlerte})</li>`).join("")}</ul>` : ""}
<div class='footer'>Rapport généré par Bella'Food — Bellaïa · Sinnamary, Guyane</div>
</body></html>`;
}

// ── Résumé WhatsApp ────────────────────────────────────────
function genWhatsApp(): string {
  const alertes = FOOD_STOCK_INIT.filter(s => s.qteRestante <= s.seuilAlerte);
  const top1    = [...FOOD_RECETTES_INIT]
    .filter(r => r.margeEstimee).sort((a,b) => (b.margeEstimee||0)-(a.margeEstimee||0))[0];
  return [
    "*🍃 Résumé Bella'Food — " + new Date().toLocaleDateString("fr-FR") + "*",
    "",
    `📖 ${FOOD_RECETTES_INIT.length} recettes · ${FOOD_RECETTES_INIT.filter(r=>r.statut==="validee").length} validées`,
    `📦 ${FOOD_STOCK_INIT.length} stocks suivis · ${alertes.length} alertes`,
    alertes.length > 0 ? "⚠ À acheter : " + alertes.slice(0,3).map(s=>s.nom).join(", ") : "✅ Stocks OK",
    "",
    top1 ? `⭐ Recette la plus rentable : ${top1.nom} (${top1.margeEstimee}€ de marge estimée)` : "",
    "",
    "_Bella'Food — Bellaïa_",
  ].filter(l => l !== undefined).join("\n");
}

export default function FoodExports() {
  const [loading, setLoading] = useState<TypeExport|null>(null);

  const lancer = (type: TypeExport) => {
    setLoading(type);
    setTimeout(() => {
      try {
        switch (type) {
          case "recettes":         exportRecettesCSV();  break;
          case "stocks":           exportStocksCSV();    break;
          case "catalogue":        exportCatalogueCSV(); break;
          case "rapport_mensuel": {
            const html = genRapportHTML();
            const win = window.open("","_blank");
            if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(()=>win.print(),400); }
            break;
          }
        }
      } finally { setLoading(null); }
    }, 200);
  };

  const envoyerWA = () => {
    const msg = genWhatsApp();
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:12, color:FC.creamD, lineHeight:1.6 }}>
        Exportez vos données Bella'Food en CSV (Excel), PDF ou WhatsApp.
      </div>

      {/* Exports CSV + rapport */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {EXPORTS.map(e => (
          <div key={e.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"13px 14px",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:22 }}>{e.ico}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{e.nom}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>{e.desc}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => lancer(e.id)} disabled={loading === e.id}
                style={{ background:FC.vert, border:"none", borderRadius:8,
                  padding:"7px 12px", color:"#fff", fontWeight:700, fontSize:11,
                  cursor:loading===e.id?"wait":"pointer", fontFamily:SA,
                  opacity:loading===e.id?0.6:1 }}>
                {loading===e.id ? "…" : e.id === "rapport_mensuel" ? "🖨 PDF" : "⬇ CSV"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp */}
      <div style={{ background:"rgba(37,211,102,0.08)", border:"1px solid rgba(37,211,102,0.25)",
        borderRadius:12, padding:"13px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Résumé WhatsApp</div>
          <div style={{ fontSize:10, color:FC.creamD }}>Envoyer le résumé de l'activité</div>
        </div>
        <button onClick={envoyerWA}
          style={{ background:"rgba(37,211,102,0.15)", border:"1px solid rgba(37,211,102,0.35)",
            borderRadius:8, padding:"7px 14px", color:"#25d366", fontWeight:700,
            fontSize:12, cursor:"pointer", fontFamily:SA }}>
          💬 WhatsApp
        </button>
      </div>

      {/* Exports à venir */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:8 }}>PROCHAINEMENT</div>
        {["Export Excel (.xlsx) natif","Export PDF professionnel (API serveur)","Rapport comptabilité","Export commandes et factures"].map(item => (
          <div key={item} style={{ fontSize:11, color:"rgba(255,255,255,0.35)", padding:"4px 0",
            borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            ○ {item}
          </div>
        ))}
      </div>
    </div>
  );
}
