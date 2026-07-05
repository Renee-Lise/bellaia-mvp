// ═══════════════════════════════════════════════════════════
// FoodHACCP — Module HACCP Bella'Food Partie III
// Températures, nettoyage, traçabilité, conformité
// src/modules/food/FoodHACCP.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { FOOD_COLORS as FC, HACCP_SEUILS } from "./foodConsts";
import type { RelevéTemperature, FicheNettoyage, TraçabiliteProduit } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 9px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const ZONES = [
  {id:"chambre_froide" as const, nom:"Chambre froide", ico:"❄️"},
  {id:"congelateur"    as const, nom:"Congélateur",    ico:"🧊"},
  {id:"laboratoire"    as const, nom:"Laboratoire",    ico:"🏭"},
  {id:"transport"      as const, nom:"Transport",      ico:"🚗"},
];

const ZONES_NETTOYAGE = [
  "Plan de travail principal","Réfrigérateur","Congélateur","Sol laboratoire",
  "Matériel de découpe","Robot pâtissier","Four","Ustensiles divers",
];

const isConforme = (zone: string, temp: number): boolean => {
  const s = HACCP_SEUILS[zone as keyof typeof HACCP_SEUILS];
  if (!s) return true;
  return temp >= s.min && temp <= s.max;
};

export default function FoodHACCP() {
  const [onglet, setOnglet] = useState<"temperatures"|"nettoyage"|"tracabilite">("temperatures");
  const [releves,      setReleves]      = useState<RelevéTemperature[]>([]);
  const [fiches,       setFiches]       = useState<FicheNettoyage[]>([]);
  const [tracabilites, setTracabilites] = useState<TraçabiliteProduit[]>([]);

  // Formulaire températures
  const [formTemp, setFormTemp] = useState({
    zone: "chambre_froide" as RelevéTemperature["zone"],
    temperature: 4,
    operateur: "",
    action: "",
  });

  // Formulaire nettoyage
  const [formNett, setFormNett] = useState({
    zone: ZONES_NETTOYAGE[0], produitUtilise: "", operateur: "", observations: "",
  });

  const ajouterReleve = () => {
    const conforme = isConforme(formTemp.zone, formTemp.temperature);
    const r: RelevéTemperature = {
      id: "rlv_" + Date.now().toString().slice(-5),
      zone:        formTemp.zone,
      temperature: formTemp.temperature,
      dateHeure:   new Date().toISOString(),
      operateur:   formTemp.operateur || "—",
      conforme,
      action:      conforme ? undefined : (formTemp.action || "À corriger"),
    };
    setReleves(rs => [r, ...rs]);
  };

  const ajouterFiche = () => {
    const f: FicheNettoyage = {
      id:             "nett_" + Date.now().toString().slice(-5),
      zone:           formNett.zone,
      date:           new Date().toISOString().split("T")[0],
      heure:          new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }),
      operateur:      formNett.operateur || "—",
      produitUtilise: formNett.produitUtilise || undefined,
      valide:         true,
      observations:   formNett.observations || undefined,
    };
    setFiches(fs => [f, ...fs]);
    setFormNett({ zone:ZONES_NETTOYAGE[0], produitUtilise:"", operateur:"", observations:"" });
  };

  const imprimerBilanHACCP = () => {
    const nonConformes = releves.filter(r => !r.conforme);
    const html = `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Bilan HACCP — Bella'Food</title>
<style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;font-size:13px}
h1{color:#15803d;border-bottom:2px solid #15803d;padding-bottom:8px}
h2{color:#15803d;font-size:14px;margin-top:20px}
table{width:100%;border-collapse:collapse;margin:10px 0}
thead th{background:#15803d;color:#fff;padding:6px 10px;text-align:left;font-size:11px}
tbody td{padding:5px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}
.nc{background:#fee2e2;color:#dc2626}.ok{color:#16a34a}
.footer{font-size:10px;color:#9ca3af;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px}
@media print{body{padding:0}}</style></head><body>
<h1>✅ Bilan HACCP — Bella'Food</h1>
<p>Généré le ${new Date().toLocaleDateString("fr-FR")} · ${releves.length} relevés · ${fiches.length} fiches de nettoyage</p>
<h2>Relevés de température</h2>
<table><thead><tr><th>Zone</th><th>Température</th><th>Date/Heure</th><th>Opérateur</th><th>Statut</th></tr></thead>
<tbody>${releves.slice(0,20).map(r => `<tr class='${r.conforme?"":"nc"}'>
  <td>${r.zone.replace("_"," ")}</td>
  <td>${r.temperature}°C</td>
  <td>${new Date(r.dateHeure).toLocaleString("fr-FR")}</td>
  <td>${r.operateur}</td>
  <td class='${r.conforme?"ok":""}' style='font-weight:700'>${r.conforme?"✅ Conforme":"⚠ Non conforme"}${r.action?" — "+r.action:""}</td>
</tr>`).join("")}</tbody></table>
<h2>Fiches de nettoyage</h2>
<table><thead><tr><th>Zone</th><th>Date</th><th>Heure</th><th>Opérateur</th><th>Produit</th></tr></thead>
<tbody>${fiches.slice(0,20).map(f => `<tr>
  <td>${f.zone}</td><td>${f.date}</td><td>${f.heure}</td><td>${f.operateur}</td><td>${f.produitUtilise||"—"}</td>
</tr>`).join("")}</tbody></table>
${nonConformes.length ? `<h2 style='color:#dc2626'>⚠ Points non conformes (${nonConformes.length})</h2>
<ul>${nonConformes.map(r=>`<li>${r.zone.replace("_"," ")} — ${r.temperature}°C (${new Date(r.dateHeure).toLocaleString("fr-FR")}) — ${r.action||"Action non définie"}</li>`).join("")}</ul>` : ""}
<div class='footer'>Bella'Food — Bellaïa · Document HACCP préparatoire non substitutif à une certification officielle</div>
</body></html>`;
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  const nonConformes = useMemo(() => releves.filter(r => !r.conforme).length, [releves]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {([["temperatures","🌡 Températures"],["nettoyage","🧹 Nettoyage"],["tracabilite","📋 Traçabilité"]] as const).map(([id,l])=>(
          <button key={id} onClick={() => setOnglet(id)}
            style={{ flex:1, padding:"8px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, fontFamily:SA,
              background:onglet===id?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.05)",
              color:onglet===id?FC.vertL:"rgba(255,255,255,0.5)" }}>{l}</button>
        ))}
      </div>

      {/* Bilan + impression */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ flex:1, display:"flex", gap:8 }}>
          <div style={{ background:nonConformes>0?"rgba(248,113,113,0.12)":"rgba(21,128,61,0.1)",
            border:`1px solid ${nonConformes>0?"rgba(248,113,113,0.3)":FC.line}`,
            borderRadius:8, padding:"6px 12px", fontSize:11,
            color:nonConformes>0?"#f87171":FC.vertL }}>
            {nonConformes > 0 ? `⚠ ${nonConformes} non-conforme${nonConformes>1?"s":""}` : "✅ Tout conforme"}
          </div>
        </div>
        <button onClick={imprimerBilanHACCP}
          style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:8, padding:"6px 12px", color:"rgba(255,255,255,0.7)",
            fontSize:11, cursor:"pointer", fontFamily:SA }}>
          🖨 Bilan HACCP
        </button>
      </div>

      {/* ── Températures ── */}
      {onglet==="temperatures" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10 }}>NOUVEAU RELEVÉ</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Zone</label>
                <select value={formTemp.zone} onChange={e => setFormTemp(f => ({ ...f, zone:e.target.value as any }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.ico} {z.nom}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Température (°C)</label>
                <input type="number" step={0.1} value={formTemp.temperature}
                  onChange={e => setFormTemp(f => ({ ...f, temperature:parseFloat(e.target.value)||0 }))}
                  style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Opérateur</label>
                <input value={formTemp.operateur} onChange={e => setFormTemp(f => ({ ...f, operateur:e.target.value }))} style={inp}/>
              </div>
            </div>
            {/* Seuil affiché */}
            {(() => {
              const seuil = HACCP_SEUILS[formTemp.zone as keyof typeof HACCP_SEUILS];
              const ok    = seuil ? formTemp.temperature >= seuil.min && formTemp.temperature <= seuil.max : true;
              return seuil ? (
                <div style={{ fontSize:11, color:ok?"#22c55e":"#f87171", marginBottom:8,
                  background:ok?"rgba(21,128,61,0.08)":"rgba(248,113,113,0.08)",
                  border:`1px solid ${ok?FC.line:"rgba(248,113,113,0.3)"}`,
                  borderRadius:8, padding:"6px 10px" }}>
                  {ok ? `✅ Conforme — seuil ${seuil.min}°C à ${seuil.max}°C`
                      : `⚠ Non conforme — seuil : ${seuil.min}°C à ${seuil.max}°C`}
                </div>
              ) : null;
            })()}
            <button onClick={ajouterReleve}
              style={{ width:"100%", background:FC.vert, border:"none", borderRadius:9,
                padding:"9px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
              ✅ Enregistrer le relevé
            </button>
          </div>
          {/* Historique */}
          {releves.slice(0,10).map(r => (
            <div key={r.id} style={{ background:r.conforme?FC.card:"rgba(248,113,113,0.08)",
              border:`1px solid ${r.conforme?FC.line:"rgba(248,113,113,0.3)"}`,
              borderRadius:10, padding:"10px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:12, color:"#fff", fontWeight:600 }}>
                    {ZONES.find(z=>z.id===r.zone)?.ico} {r.zone.replace("_"," ")}
                  </div>
                  <div style={{ fontSize:10, color:FC.creamD }}>
                    {new Date(r.dateHeure).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                    {r.operateur !== "—" ? ` · ${r.operateur}` : ""}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18, fontWeight:700, color:r.conforme?FC.or:"#f87171" }}>
                    {r.temperature}°C
                  </div>
                  <div style={{ fontSize:9, color:r.conforme?"#22c55e":"#f87171", fontWeight:700 }}>
                    {r.conforme?"✅ OK":"⚠ NON CONFORME"}
                  </div>
                </div>
              </div>
              {r.action && <div style={{ fontSize:10, color:"#fb923c", marginTop:4 }}>→ {r.action}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Nettoyage ── */}
      {onglet==="nettoyage" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10 }}>NOUVELLE FICHE</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Zone nettoyée</label>
                <select value={formNett.zone} onChange={e => setFormNett(f => ({ ...f, zone:e.target.value }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {ZONES_NETTOYAGE.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Opérateur</label>
                  <input value={formNett.operateur} onChange={e => setFormNett(f=>({...f,operateur:e.target.value}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Produit utilisé</label>
                  <input value={formNett.produitUtilise} onChange={e => setFormNett(f=>({...f,produitUtilise:e.target.value}))} style={inp}/>
                </div>
              </div>
              <button onClick={ajouterFiche}
                style={{ background:FC.vert, border:"none", borderRadius:9, padding:"9px",
                  color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                ✅ Valider le nettoyage
              </button>
            </div>
          </div>
          {fiches.slice(0,10).map(f => (
            <div key={f.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:10, padding:"10px 13px", display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:12, color:"#fff" }}>{f.zone}</div>
                <div style={{ fontSize:10, color:FC.creamD }}>{f.date} à {f.heure} · {f.operateur}</div>
                {f.produitUtilise && <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{f.produitUtilise}</div>}
              </div>
              <span style={{ fontSize:12, color:"#22c55e", alignSelf:"center" }}>✅</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Traçabilité ── */}
      {onglet==="tracabilite" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6 }}>
              La traçabilité est enregistrée automatiquement lors de la création d'une production dans l'onglet Production. Elle liste les lots d'ingrédients utilisés, l'opérateur, les températures et la DLC.
            </div>
          </div>
          {tracabilites.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px", color:FC.creamD, fontSize:13, fontStyle:"italic" }}>
              Aucune fiche de traçabilité. Créez une production pour en générer automatiquement.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
