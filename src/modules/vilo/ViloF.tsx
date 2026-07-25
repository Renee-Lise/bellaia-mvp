// ═══════════════════════════════════════════════════════════
// ViloF — Vue Fondatrice Vilo'Assistance
// Demandes · Missions · Contrats · Paiements · Supabase
// src/modules/vilo/ViloF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";

const SA = "system-ui, -apple-system, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const CV = {
  fond:"#070c0b", acc:"#0d9488", accL:"#14b8a6",
  or:"#c9a96e", creamD:"rgba(245,240,232,0.6)",
  card:"rgba(13,148,136,0.07)", line:"rgba(13,148,136,0.2)",
  vert:"#22c55e", danger:"#f87171",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(13,148,136,0.2)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const,
};

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
async function tok(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
}
async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers: { apikey:SB_KEY(), Authorization:"Bearer " + await tok() },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
async function sbPost(table: string, body: object): Promise<any> {
  if (!SB_URL()) return null;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}`, {
      method:"POST",
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await tok(),
        "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  } catch { return null; }
}
async function sbPatch(table: string, id: string, body: object): Promise<void> {
  if (!SB_URL()) return;
  try {
    await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}`, {
      method:"PATCH",
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await tok(),
        "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(body),
    });
  } catch {}
}

interface Mission {
  id:         string;
  reference?: string;
  clientNom:  string;
  clientTel?: string;
  type:       string;
  adresse?:   string;
  dateDebut:  string;
  dateFin?:   string;
  heure?:     string;
  heures?:    number;
  tarifHoraire?: number;
  total?:     number;
  statut:     "proposee"|"acceptee"|"en_cours"|"terminee"|"annulee";
  hote?:      string;
  notes?:     string;
}

const TYPES_MISSION = [
  "Aide ménagère","Aide à domicile","Garde d'enfants","Assistance administrative",
  "Courses","Accompagnement médical","Portage de repas","Autre",
];
const STATUTS: { id: Mission["statut"]; label: string; col: string }[] = [
  {id:"proposee",  label:"Proposée",    col:"#60a5fa"},
  {id:"acceptee",  label:"Acceptée",    col:"#22c55e"},
  {id:"en_cours",  label:"En cours",    col:"#fb923c"},
  {id:"terminee",  label:"Terminée",    col:"#9b59b6"},
  {id:"annulee",   label:"Annulée",     col:"#f87171"},
];

function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"}); }
  catch { return s; }
}
function fmtPrix(n?: number|null) {
  if (n==null) return "—";
  return n.toFixed(2).replace(".",",")+" €";
}

const FORM0: Partial<Mission> = {
  clientNom:"", type:TYPES_MISSION[0], dateDebut:today(), statut:"proposee", heures:2, tarifHoraire:12,
};

const ONGLETS = [
  {id:"missions",  ico:"🎯", label:"Missions"},
  {id:"planning",  ico:"📅", label:"Planning"},
  {id:"paiements", ico:"💰", label:"Paiements"},
  {id:"contrats",  ico:"📝", label:"Contrats"},
];

export default function ViloF({ user }: { user?: any }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [onglet,   setOnglet]   = useState<"missions"|"planning"|"paiements"|"contrats">("missions");
  const [modal,    setModal]    = useState<"form"|null>(null);
  const [editing,  setEditing]  = useState<Mission|null>(null);
  const [form,     setForm]     = useState<Partial<Mission>>({ ...FORM0 });
  const [source,   setSource]   = useState<"local"|"supabase">("local");
  const [saving,   setSaving]   = useState(false);
  const [filtre,   setFiltre]   = useState<Mission["statut"]|"tous">("tous");

  useEffect(() => {
    sbGet("bellaia_commandes",
      "bu=eq.VILO&order=date_commande.desc&limit=100&select=id,reference,client_nom,client_tel,statut,total,date_livraison,notes,lignes"
    ).then(rows => {
      if (rows.length > 0) {
        setMissions(rows.map(r => ({
          id:r.id, reference:r.reference, clientNom:r.client_nom, clientTel:r.client_tel,
          type: r.lignes ? (typeof r.lignes==="string"?JSON.parse(r.lignes):r.lignes)[0]?.libelle || "Aide à domicile" : "Aide à domicile",
          dateDebut:r.date_livraison || today(),
          total:r.total,
          statut: r.statut==="LIVRE"||r.statut==="CLOTURE" ? "terminee"
                : r.statut==="ANNULE" ? "annulee"
                : r.statut==="PRODUCTION"||r.statut==="COMMANDE" ? "en_cours"
                : r.statut==="BROUILLON" ? "proposee" : "acceptee",
          notes:r.notes,
        })));
        setSource("supabase");
      }
    }).catch(()=>{});
  }, []);

  const visibles = useMemo(() =>
    filtre==="tous" ? missions : missions.filter(m=>m.statut===filtre),
  [missions, filtre]);

  const stats = useMemo(() => ({
    total:    missions.length,
    actives:  missions.filter(m=>["acceptee","en_cours"].includes(m.statut)).length,
    ca:       missions.filter(m=>m.statut==="terminee").reduce((s,m)=>s+(m.total||0),0),
    heures:   missions.filter(m=>m.statut==="terminee").reduce((s,m)=>s+(m.heures||0),0),
  }), [missions]);

  const sauvegarder = async () => {
    if (!form.clientNom?.trim()) return;
    setSaving(true);
    const total = (form.heures||0) * (form.tarifHoraire||12);
    const ref   = editing?.reference || "VILO-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
    const nv: Mission = {
      id:editing?.id || "vilo_"+Date.now().toString().slice(-8),
      reference:ref, clientNom:form.clientNom||"",
      clientTel:form.clientTel, type:form.type||TYPES_MISSION[0],
      adresse:form.adresse, dateDebut:form.dateDebut||today(),
      heure:form.heure, heures:form.heures||2,
      tarifHoraire:form.tarifHoraire||12, total,
      statut:form.statut||"proposee", hote:form.hote, notes:form.notes,
    };
    if (editing) {
      setMissions(ms => ms.map(m => m.id===editing.id ? nv : m));
      await sbPatch("bellaia_commandes", editing.id, {
        statut: nv.statut==="terminee"?"LIVRE":nv.statut==="en_cours"?"PRODUCTION":nv.statut==="annulee"?"ANNULE":"COMMANDE",
        notes:nv.notes,
      }).catch(()=>{});
    } else {
      setMissions(ms => [nv,...ms]);
      await sbPost("bellaia_commandes", {
        bu:"VILO", reference:ref, client_nom:nv.clientNom, client_tel:nv.clientTel,
        statut:"BROUILLON", total, date_livraison:nv.dateDebut,
        notes:`${nv.heure||""} — ${nv.type}${nv.adresse?" — "+nv.adresse:""}${nv.notes?" — "+nv.notes:""}`,
        lignes:JSON.stringify([{libelle:nv.type,qte:nv.heures||1,prixUnitaire:nv.tarifHoraire||12,total}]),
      }).catch(()=>{});
    }
    setSaving(false);
    setModal(null); setEditing(null); setForm({...FORM0});
  };

  const changerStatut = async (id: string, statut: Mission["statut"]) => {
    setMissions(ms => ms.map(m => m.id===id ? {...m, statut} : m));
    const sbSt = statut==="terminee"?"LIVRE":statut==="en_cours"?"PRODUCTION":statut==="annulee"?"ANNULE":"COMMANDE";
    await sbPatch("bellaia_commandes", id, { statut:sbSt }).catch(()=>{});
  };

  const imprimerFiche = (m: Mission) => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Fiche Mission ${m.reference||""}</title>
<style>body{font-family:Arial,sans-serif;padding:28px;max-width:640px;margin:0 auto;color:#111;font-size:13px}
h1{color:#0d9488;font-size:18px;border-bottom:2px solid #0d9488;padding-bottom:6px}
p{margin:5px 0}.badge{display:inline-block;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:2px 10px;font-size:11px;color:#0d9488;font-weight:700}
@media print{button{display:none}}</style></head><body>
<h1>🤝 Vilo'Assistance — Fiche Mission</h1>
<p><strong>Référence :</strong> ${m.reference||"—"}</p>
<p><strong>Bénéficiaire :</strong> ${m.clientNom}${m.clientTel?" — "+m.clientTel:""}</p>
<p><strong>Type :</strong> ${m.type}</p>
<p><strong>Date :</strong> ${fmtDate(m.dateDebut)}${m.heure?" à "+m.heure:""}</p>
${m.adresse?`<p><strong>Adresse :</strong> ${m.adresse}</p>`:""}
${m.heures?`<p><strong>Durée :</strong> ${m.heures}h</p>`:""}
${m.tarifHoraire?`<p><strong>Tarif :</strong> ${m.tarifHoraire}€/h</p>`:""}
${m.total?`<p><strong>Total :</strong> <strong style="color:#0d9488">${m.total.toFixed(2)}€</strong></p>`:""}
${m.hote?`<p><strong>Hôte/Talent :</strong> ${m.hote}</p>`:""}
${m.notes?`<p><strong>Notes :</strong> ${m.notes}</p>`:""}
<p style="margin-top:16px"><span class="badge">${m.statut}</span></p>
<p style="margin-top:20px;color:#6b7280;font-size:11px">Vilo'Assistance · Bella'Studio · Sinnamary, Guyane</p>
</body></html>`;
    const w = window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CV.accL, letterSpacing:1 }}>
            🤝 Vilo'Assistance
          </div>
          <div style={{ fontSize:10, color:source==="supabase"?CV.vert:"rgba(255,255,255,0.35)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"} · {missions.length} mission{missions.length>1?"s":""}
          </div>
        </div>
        <button onClick={() => { setForm({...FORM0}); setEditing(null); setModal("form"); }}
          style={{ background:CV.acc, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouvelle mission
        </button>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
        {[
          {l:"Missions",  v:stats.total,          col:"#fff"},
          {l:"Actives",   v:stats.actives,         col:CV.accL},
          {l:"CA",        v:fmtPrix(stats.ca),     col:CV.or},
          {l:"Heures",    v:stats.heures+"h",       col:CV.creamD},
        ].map(k => (
          <div key={k.l} style={{ background:CV.card, border:`1px solid ${CV.line}`,
            borderRadius:9, padding:"9px", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, color:k.col }}>{k.v}</div>
            <div style={{ fontSize:9, color:CV.creamD, marginTop:1 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            style={{ flex:1, padding:"6px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:onglet===o.id?CV.acc:"rgba(255,255,255,0.06)",
              color:onglet===o.id?"#fff":"rgba(255,255,255,0.5)" }}>
            {o.ico} {o.label}
          </button>
        ))}
      </div>

      {/* ── Missions ── */}
      {onglet === "missions" && (
        <>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {(["tous",...STATUTS.map(s=>s.id)] as const).map(id => (
              <button key={id} onClick={() => setFiltre(id as any)}
                style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
                  fontSize:9, fontWeight:700, fontFamily:SA,
                  background:filtre===id?CV.acc:"rgba(255,255,255,0.07)",
                  color:filtre===id?"#fff":"rgba(255,255,255,0.5)" }}>
                {id==="tous"?"Toutes":STATUTS.find(s=>s.id===id)?.label||id}
              </button>
            ))}
          </div>
          {visibles.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CV.creamD, fontStyle:"italic" }}>
              Aucune mission {filtre!=="tous"?`"${filtre}"`:""}.
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {visibles.map(m => {
              const sc = STATUTS.find(s=>s.id===m.statut);
              return (
                <div key={m.id} style={{ background:CV.card, border:`1px solid ${CV.line}`,
                  borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.clientNom}</div>
                      <div style={{ fontSize:11, color:CV.creamD }}>{m.type}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
                        📅 {fmtDate(m.dateDebut)}{m.heure?" · "+m.heure:""}
                        {m.heures?" · "+m.heures+"h":""}
                        {m.total?" · "+fmtPrix(m.total):""}
                      </div>
                    </div>
                    <span style={{ fontSize:9, background:sc?.col+"22", color:sc?.col,
                      border:`1px solid ${sc?.col}44`, borderRadius:4,
                      padding:"2px 8px", fontWeight:700, alignSelf:"flex-start", flexShrink:0 }}>
                      {sc?.label}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {STATUTS.filter(s=>s.id!==m.statut).slice(0,2).map(s=>(
                      <button key={s.id} onClick={()=>changerStatut(m.id,s.id)}
                        style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                          border:`1px solid ${s.col}44`, background:"transparent",
                          color:s.col, fontFamily:SA }}>
                        → {s.label}
                      </button>
                    ))}
                    <button onClick={()=>{setEditing(m);setForm({...m});setModal("form");}}
                      style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                        border:"1px solid rgba(255,255,255,0.12)", background:"transparent",
                        color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                      ✏ Modifier
                    </button>
                    <button onClick={()=>imprimerFiche(m)}
                      style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                        border:`1px solid ${CV.or}44`, background:"transparent",
                        color:CV.or, fontFamily:SA }}>
                      📄 Fiche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Planning ── */}
      {onglet === "planning" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {missions.filter(m=>["acceptee","en_cours"].includes(m.statut))
            .sort((a,b)=>a.dateDebut<b.dateDebut?-1:1).map(m => (
            <div key={m.id} style={{ background:"rgba(13,148,136,0.1)",
              border:"1px solid rgba(13,148,136,0.25)", borderRadius:11, padding:"11px 13px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{m.clientNom}</div>
              <div style={{ fontSize:11, color:CV.creamD }}>{m.type}</div>
              <div style={{ fontSize:10, color:CV.accL, fontWeight:700, marginTop:3 }}>
                📅 {fmtDate(m.dateDebut)}{m.heure?" · "+m.heure:""}{m.heures?" · "+m.heures+"h":""}
              </div>
              {m.adresse && <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>📍 {m.adresse}</div>}
            </div>
          ))}
          {missions.filter(m=>["acceptee","en_cours"].includes(m.statut)).length===0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CV.creamD, fontStyle:"italic" }}>
              Aucune mission planifiée.
            </div>
          )}
        </div>
      )}

      {/* ── Paiements ── */}
      {onglet === "paiements" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ background:"rgba(13,148,136,0.1)", border:`1px solid ${CV.line}`,
            borderRadius:10, padding:"10px 13px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:CV.accL }}>
              CA missions terminées : {fmtPrix(stats.ca)}
            </div>
          </div>
          {missions.filter(m=>m.statut==="terminee"&&m.total).map(m=>(
            <div key={m.id} style={{ background:CV.card, border:`1px solid ${CV.line}`,
              borderRadius:11, padding:"11px 13px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{m.clientNom}</div>
                <div style={{ fontSize:10, color:CV.creamD }}>{m.type} · {fmtDate(m.dateDebut)}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:CV.vert }}>
                {fmtPrix(m.total)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Contrats ── */}
      {onglet === "contrats" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ fontSize:11, color:CV.creamD, fontStyle:"italic", padding:"8px 0" }}>
            Générez une fiche de mission imprimable depuis l'onglet Missions.
            Les contrats signés seront stockés dans la GED Bellaïa.
          </div>
          {missions.map(m=>(
            <div key={m.id} style={{ background:CV.card, border:`1px solid ${CV.line}`,
              borderRadius:11, padding:"11px 13px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{m.clientNom}</div>
                <div style={{ fontSize:10, color:CV.creamD }}>{m.type} · {m.reference}</div>
              </div>
              <button onClick={()=>imprimerFiche(m)}
                style={{ fontSize:10, padding:"5px 10px", borderRadius:7, cursor:"pointer",
                  border:`1px solid ${CV.or}44`, background:"transparent",
                  color:CV.or, fontFamily:SA }}>
                📄 Imprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:16, overflowY:"auto" }}>
          <div style={{ background:"#070c0b", border:`1px solid ${CV.line}`,
            borderRadius:16, padding:18, width:"100%", maxWidth:460, marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontFamily:FS, fontSize:14, color:CV.accL }}>
                {editing?"Modifier la mission":"Nouvelle mission"}
              </div>
              <button onClick={()=>{setModal(null);setEditing(null);setForm({...FORM0});}}
                style={{ background:"none", border:"none", color:CV.creamD,
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Bénéficiaire *","clientNom","text"],["Téléphone","clientTel","tel"],
                ["Adresse","adresse","text"],["Hôte / Talent","hote","text"]].map(([l,k,t])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CV.creamD }}>{l}</label>
                  <input type={t} value={(form as any)[k]||""}
                    onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CV.creamD }}>Type de service</label>
                <select value={form.type||TYPES_MISSION[0]}
                  onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                  style={{ ...inp, background:"#070c0b" }}>
                  {TYPES_MISSION.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CV.creamD }}>Date</label>
                  <input type="date" value={form.dateDebut||today()}
                    onChange={e=>setForm(f=>({...f,dateDebut:e.target.value}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CV.creamD }}>Heure</label>
                  <input type="time" value={form.heure||"09:00"}
                    onChange={e=>setForm(f=>({...f,heure:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CV.creamD }}>Durée (heures)</label>
                  <input type="number" min="0.5" step="0.5" value={form.heures||2}
                    onChange={e=>setForm(f=>({...f,heures:Number(e.target.value)}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CV.creamD }}>Tarif €/h</label>
                  <input type="number" value={form.tarifHoraire||12}
                    onChange={e=>setForm(f=>({...f,tarifHoraire:Number(e.target.value)}))} style={inp}/>
                </div>
              </div>
              <div style={{ background:"rgba(13,148,136,0.1)", border:`1px solid ${CV.line}`,
                borderRadius:8, padding:"8px 10px", fontSize:12, color:CV.accL, fontWeight:700 }}>
                Total estimé : {fmtPrix((form.heures||0)*(form.tarifHoraire||12))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CV.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes||""}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder} disabled={saving}
                  style={{ flex:1, background:CV.acc, border:"none", borderRadius:10,
                    padding:"10px", color:"#fff", fontWeight:700, fontSize:12,
                    cursor:"pointer", fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving?"…":"✅ Enregistrer"}
                </button>
                <button onClick={()=>{setModal(null);setEditing(null);setForm({...FORM0});}}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:CV.creamD,
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
