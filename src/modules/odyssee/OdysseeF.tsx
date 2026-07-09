// ═══════════════════════════════════════════════════════════
// OdysseeF — Vue Fondatrice Bella'Odyssée
// Agenda · RDV · Catalogue prestations · Stats · Supabase
// src/modules/odyssee/OdysseeF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";

// ── Design Bella'Odyssée ───────────────────────────────────
const BO = {
  fond:"#0b0d1a", prune:"#1a0a1e", acc:"#9b59b6",
  acc2:"#6c3483", or:"#c9a96e", creme:"rgba(245,240,232,0.95)",
  cremeD:"rgba(245,240,232,0.55)", line:"rgba(255,255,255,0.1)",
  verre:"rgba(255,255,255,0.04)", vert:"#22c55e",
};
const SA = "system-ui, -apple-system, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const,
};

// ── Prestations catalogue (auto-contenu dans ce fichier) ──
const CATALOGUE_PRESTA = [
  {ico:"👁", nom:"Extensions de cils",          duree:"1h30–2h30", prix:null,  cat:"Cils",
    formules:[{l:"Cils à cils",p:null},{l:"Volume russe",p:null},{l:"Méga volume",p:null},{l:"Remplissage",p:null}]},
  {ico:"🦷", nom:"Blanchiment dentaire",         duree:"45min–1h30",prix:190,   cat:"Dentaire",
    formules:[{l:"Formule 1",p:190},{l:"Formule 2",p:260},{l:"Formule 3",p:330},{l:"Formule 4",p:450}]},
  {ico:"💎", nom:"Strass dentaires",             duree:"30min",     prix:40,    cat:"Dentaire",
    formules:[{l:"Strass simple",p:40},{l:"Pack Duo",p:70},{l:"Pack Trio",p:95}]},
  {ico:"✨", nom:"Contour dentaire",             duree:"Sur RDV",   prix:170,   cat:"Dentaire",
    formules:[{l:"Formule 1",p:170},{l:"Formule 2",p:300}]},
  {ico:"🌿", nom:"Browlift",                     duree:"45min",     prix:null,  cat:"Sourcils", formules:[]},
  {ico:"🌟", nom:"Lashlift / Rehaussement",      duree:"1h",        prix:null,  cat:"Cils",     formules:[]},
  {ico:"🎨", nom:"Teinture sourcils",            duree:"20min",     prix:null,  cat:"Sourcils", formules:[]},
  {ico:"🖌",  nom:"Teinture cils",               duree:"20min",     prix:null,  cat:"Cils",     formules:[]},
  {ico:"🧵", nom:"Épilation au fil",             duree:"15–30min",  prix:null,  cat:"Épilation",formules:[]},
];

// ── Helpers Supabase ───────────────────────────────────────
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
      headers:{ apikey:SB_KEY(), Authorization:"Bearer " + await tok(),
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
      headers:{ apikey:SB_KEY(), Authorization:"Bearer " + await tok(),
        "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(body),
    });
  } catch {}
}

// ── Types locaux ───────────────────────────────────────────
interface RDV {
  id: string;
  clientNom: string;
  clientTel?: string;
  prestation: string;
  date: string;
  heure: string;
  duree?: string;
  prix?: number;
  statut: "confirme"|"en_attente"|"realise"|"annule";
  notes?: string;
  acompte?: number;
  acomptePaye?: boolean;
}

const STATUTS: { id: RDV["statut"]; label: string; col: string }[] = [
  {id:"en_attente", label:"En attente",  col:"#fb923c"},
  {id:"confirme",   label:"Confirmé",    col:"#22c55e"},
  {id:"realise",    label:"Réalisé",     col:"#9b59b6"},
  {id:"annule",     label:"Annulé",      col:"#f87171"},
];

const HEURES = ["8h00","9h00","9h30","10h00","10h30","11h00","11h30","13h00","13h30","14h00","14h30","15h00","15h30","16h00","16h30","17h00","17h30"];

function today(): string { return new Date().toISOString().split("T")[0]; }
function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"}); }
  catch { return s; }
}
function fmtPrix(n?: number|null): string {
  if (n == null) return "Sur devis";
  return n.toFixed(2).replace(".",",") + " €";
}

const FORM0: Partial<RDV> = {
  clientNom:"", prestation:CATALOGUE_PRESTA[0].nom,
  date:today(), heure:"10h00", statut:"en_attente",
};

const ONGLETS = [
  {id:"agenda",    ico:"📅", label:"Agenda"},
  {id:"catalogue", ico:"💅", label:"Prestations"},
  {id:"stats",     ico:"📊", label:"Stats"},
];

// ══════════════════════════════════════════════════════════
export default function OdysseeF({ user }: { user?: any }) {
  const [rdvs,    setRdvs]    = useState<RDV[]>([]);
  const [onglet,  setOnglet]  = useState<"agenda"|"catalogue"|"stats">("agenda");
  const [modal,   setModal]   = useState<"form"|"detail"|null>(null);
  const [editing, setEditing] = useState<RDV|null>(null);
  const [form,    setForm]    = useState<Partial<RDV>>({ ...FORM0 });
  const [source,  setSource]  = useState<"local"|"supabase">("local");
  const [saving,  setSaving]  = useState(false);
  const [filtreDate, setFiltreDate] = useState<"tous"|"aujourd_hui"|"semaine">("tous");

  // Chargement RDV depuis Supabase
  useEffect(() => {
    sbGet("bellaia_commandes",
      "bu=eq.ODYSSEE&order=date_commande.desc&limit=100&select=id,reference,client_nom,client_tel,statut,total,acompte,acompte_paye,date_livraison,notes,lignes"
    ).then(rows => {
      if (rows.length > 0) {
        const mapped: RDV[] = rows.map(r => {
          const lignes = r.lignes ? (typeof r.lignes === "string" ? JSON.parse(r.lignes) : r.lignes) : [];
          const presta = lignes[0]?.libelle || "Prestation Odyssée";
          const heure  = r.notes?.match(/(\d+h\d*)/)?.[1] || "10h00";
          return {
            id:          r.id,
            clientNom:   r.client_nom,
            clientTel:   r.client_tel,
            prestation:  presta,
            date:        r.date_livraison || today(),
            heure,
            prix:        r.total,
            statut:      r.statut === "LIVRE" || r.statut === "CLOTURE" ? "realise"
                       : r.statut === "ANNULE" ? "annule"
                       : r.statut === "COMMANDE" || r.statut === "FACTURE" ? "confirme"
                       : "en_attente",
            acompte:     r.acompte,
            acomptePaye: r.acompte_paye,
            notes:       r.notes,
          };
        });
        setRdvs(mapped);
        setSource("supabase");
      }
    }).catch(() => {});
  }, []);

  const rdvsFiltres = useMemo(() => {
    const now = today();
    const semaine = new Date(); semaine.setDate(semaine.getDate() + 7);
    const semStr  = semaine.toISOString().split("T")[0];
    return rdvs.filter(r => {
      if (filtreDate === "aujourd_hui") return r.date === now;
      if (filtreDate === "semaine")     return r.date >= now && r.date <= semStr;
      return true;
    }).sort((a,b) => a.date < b.date ? -1 : 1);
  }, [rdvs, filtreDate]);

  const stats = useMemo(() => ({
    total:    rdvs.length,
    realises: rdvs.filter(r => r.statut === "realise").length,
    confirmes:rdvs.filter(r => r.statut === "confirme").length,
    ca:       rdvs.filter(r => r.statut === "realise").reduce((s,r) => s+(r.prix||0), 0),
    enAttente:rdvs.filter(r => r.statut === "en_attente").length,
  }), [rdvs]);

  const sauvegarder = async () => {
    if (!form.clientNom?.trim() || !form.prestation) return;
    setSaving(true);
    const localId = "rdv_" + Date.now().toString().slice(-8);
    const presta  = CATALOGUE_PRESTA.find(p => p.nom === form.prestation);
    const nv: RDV = {
      id:          editing?.id || localId,
      clientNom:   form.clientNom || "",
      clientTel:   form.clientTel,
      prestation:  form.prestation || "",
      date:        form.date || today(),
      heure:       form.heure || "10h00",
      prix:        form.prix ?? presta?.prix ?? undefined,
      statut:      form.statut || "en_attente",
      notes:       form.notes,
    };
    if (editing) {
      setRdvs(rs => rs.map(r => r.id === editing.id ? nv : r));
      await sbPatch("bellaia_commandes", editing.id, {
        statut: nv.statut === "realise" ? "LIVRE" : nv.statut === "confirme" ? "COMMANDE" : "BROUILLON",
        notes:  nv.notes,
      }).catch(() => {});
    } else {
      setRdvs(rs => [nv, ...rs]);
      await sbPost("bellaia_commandes", {
        bu:           "ODYSSEE",
        client_nom:   nv.clientNom,
        client_tel:   nv.clientTel,
        statut:       "BROUILLON",
        total:        nv.prix || 0,
        date_livraison:nv.date,
        notes:        `${nv.heure} — ${nv.prestation}${nv.notes ? " — " + nv.notes : ""}`,
        lignes:       JSON.stringify([{libelle:nv.prestation, qte:1, prixUnitaire:nv.prix||0, total:nv.prix||0}]),
      }).catch(() => {});
    }
    setSaving(false);
    setModal(null); setEditing(null); setForm({ ...FORM0 });
  };

  const changerStatut = async (id: string, statut: RDV["statut"]) => {
    setRdvs(rs => rs.map(r => r.id === id ? {...r, statut} : r));
    const sbStatut = statut==="realise"?"LIVRE":statut==="confirme"?"COMMANDE":statut==="annule"?"ANNULE":"BROUILLON";
    await sbPatch("bellaia_commandes", id, { statut:sbStatut }).catch(() => {});
  };

  const ouvrirWA = (rdv: RDV) => {
    if (!rdv.clientTel) return;
    const msg = `Bonjour ${rdv.clientNom.split(" ")[0]} 💅\n\nVotre rendez-vous Bella'Odyssée est confirmé :\n📅 ${fmtDate(rdv.date)} à ${rdv.heure}\n✨ ${rdv.prestation}\n${rdv.prix ? "💰 " + fmtPrix(rdv.prix) : ""}\n\nÀ bientôt ! 🌟`;
    window.open(`https://wa.me/${rdv.clientTel.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12,
      fontFamily:SA, minHeight:"100%" }}>

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:BO.or, letterSpacing:1 }}>
            💅 Bella'Odyssée
          </div>
          <div style={{ fontSize:10, color:source==="supabase"?BO.vert:"rgba(255,255,255,0.35)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"} · {rdvs.length} rendez-vous
          </div>
        </div>
        <button onClick={() => { setForm({ ...FORM0 }); setEditing(null); setModal("form"); }}
          style={{ background:BO.acc, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouveau RDV
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            style={{ flex:1, padding:"7px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, fontFamily:SA,
              background:onglet===o.id?"rgba(155,89,182,0.3)":"rgba(255,255,255,0.06)",
              color:onglet===o.id?BO.or:"rgba(255,255,255,0.5)" }}>
            {o.ico} {o.label}
          </button>
        ))}
      </div>

      {/* ── AGENDA ── */}
      {onglet === "agenda" && (
        <>
          {/* Filtres */}
          <div style={{ display:"flex", gap:5 }}>
            {([
              ["tous",         "Tous"],
              ["aujourd_hui",  "Aujourd'hui"],
              ["semaine",      "Cette semaine"],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFiltreDate(id)}
                style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                  fontSize:9, fontWeight:700, fontFamily:SA,
                  background:filtreDate===id?BO.acc:"rgba(255,255,255,0.07)",
                  color:filtreDate===id?"#fff":"rgba(255,255,255,0.5)" }}>
                {label}
              </button>
            ))}
          </div>

          {rdvsFiltres.length === 0 && (
            <div style={{ textAlign:"center", padding:"28px", color:BO.cremeD, fontStyle:"italic" }}>
              Aucun RDV {filtreDate === "aujourd_hui" ? "aujourd'hui" : filtreDate === "semaine" ? "cette semaine" : ""}.
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {rdvsFiltres.map(rdv => {
              const sc = STATUTS.find(s => s.id === rdv.statut);
              return (
                <div key={rdv.id} style={{ background:BO.verre, border:`1px solid ${BO.line}`,
                  borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
                        {rdv.clientNom}
                      </div>
                      <div style={{ fontSize:11, color:BO.cremeD }}>
                        {rdv.prestation}
                      </div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                        📅 {fmtDate(rdv.date)} · {rdv.heure}
                        {rdv.prix ? ` · ${fmtPrix(rdv.prix)}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize:9, background:sc?.col+"22", color:sc?.col,
                      border:`1px solid ${sc?.col}44`, borderRadius:4,
                      padding:"2px 8px", fontWeight:700, alignSelf:"flex-start", flexShrink:0 }}>
                      {sc?.label}
                    </span>
                  </div>
                  {/* Actions */}
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {STATUTS.filter(s => s.id !== rdv.statut).slice(0,3).map(s => (
                      <button key={s.id} onClick={() => changerStatut(rdv.id, s.id)}
                        style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                          border:`1px solid ${s.col}44`, background:"transparent",
                          color:s.col, fontFamily:SA }}>
                        → {s.label}
                      </button>
                    ))}
                    <button onClick={() => { setEditing(rdv); setForm({...rdv}); setModal("form"); }}
                      style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                        border:"1px solid rgba(255,255,255,0.12)", background:"transparent",
                        color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                      ✏ Modifier
                    </button>
                    {rdv.clientTel && (
                      <button onClick={() => ouvrirWA(rdv)}
                        style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                          border:"1px solid rgba(37,211,102,0.3)", background:"transparent",
                          color:"#25d366", fontFamily:SA }}>
                        💬 WA
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── CATALOGUE PRESTATIONS ── */}
      {onglet === "catalogue" && (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {CATALOGUE_PRESTA.map(p => (
            <div key={p.nom} style={{ background:BO.verre, border:`1px solid ${BO.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{p.ico}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{p.nom}</div>
                  <div style={{ fontSize:10, color:BO.cremeD, marginTop:1 }}>
                    ⏱ {p.duree}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:BO.or, marginTop:3 }}>
                    {fmtPrix(p.prix)}
                  </div>
                  {p.formules.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                      {p.formules.map(f => (
                        <span key={f.l} style={{ fontSize:9,
                          background:"rgba(155,89,182,0.12)",
                          border:"1px solid rgba(155,89,182,0.25)",
                          color:BO.cremeD, borderRadius:4, padding:"2px 7px" }}>
                          {f.l}{f.p != null ? ` — ${f.p}€` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STATISTIQUES ── */}
      {onglet === "stats" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              {label:"RDV total",         v:stats.total,               col:"#fff"},
              {label:"CA réalisé",         v:fmtPrix(stats.ca),         col:BO.or},
              {label:"Réalisés",           v:stats.realises,            col:BO.vert},
              {label:"En attente",         v:stats.enAttente,           col:"#fb923c"},
            ].map(s => (
              <div key={s.label} style={{ background:BO.verre, border:`1px solid ${BO.line}`,
                borderRadius:10, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:s.col }}>{s.v}</div>
                <div style={{ fontSize:9, color:BO.cremeD, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Prestations les plus demandées */}
          <div style={{ background:BO.verre, border:`1px solid ${BO.line}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:BO.or, marginBottom:8 }}>
              Prestations demandées
            </div>
            {CATALOGUE_PRESTA.slice(0,5).map(p => {
              const count = rdvs.filter(r => r.prestation === p.nom).length;
              return (
                <div key={p.nom} style={{ display:"flex", justifyContent:"space-between",
                  padding:"5px 0", borderBottom:`1px solid ${BO.line}` }}>
                  <span style={{ fontSize:11, color:"#fff" }}>{p.ico} {p.nom}</span>
                  <span style={{ fontSize:11, color:BO.or, fontWeight:700 }}>
                    {count} RDV
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL FORMULAIRE RDV ── */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:16, overflowY:"auto" }}>
          <div style={{ background:"#0d0b18", border:`1px solid ${BO.line}`,
            borderRadius:16, padding:18, width:"100%", maxWidth:460, marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontFamily:FS, fontSize:14, color:BO.or }}>
                {editing ? "Modifier le RDV" : "Nouveau RDV"}
              </div>
              <button onClick={() => { setModal(null); setEditing(null); setForm({ ...FORM0 }); }}
                style={{ background:"none", border:"none", color:BO.cremeD,
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Nom client *","clientNom","text"],["Téléphone","clientTel","tel"]].map(([l,k,t]) => (
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:BO.cremeD }}>{l}</label>
                  <input type={t} value={(form as any)[k]||""}
                    onChange={e => setForm(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:BO.cremeD }}>Prestation</label>
                <select value={form.prestation||""} onChange={e => {
                  const p = CATALOGUE_PRESTA.find(pr => pr.nom === e.target.value);
                  setForm(f => ({ ...f, prestation:e.target.value, prix:p?.prix ?? f.prix }));
                }} style={{ ...inp, background:"#1a1a2e" }}>
                  {CATALOGUE_PRESTA.map(p => (
                    <option key={p.nom} value={p.nom}>{p.ico} {p.nom}</option>
                  ))}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:BO.cremeD }}>Date</label>
                  <input type="date" value={form.date||today()}
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:BO.cremeD }}>Heure</label>
                  <select value={form.heure||"10h00"} onChange={e=>setForm(f=>({...f,heure:e.target.value}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:BO.cremeD }}>Prix (€) — laisser vide si sur devis</label>
                <input type="number" value={form.prix||""} placeholder="Sur devis"
                  onChange={e=>setForm(f=>({...f,prix:e.target.value?Number(e.target.value):undefined}))}
                  style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:BO.cremeD }}>Statut</label>
                <select value={form.statut||"en_attente"} onChange={e=>setForm(f=>({...f,statut:e.target.value as any}))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:BO.cremeD }}>Notes</label>
                <textarea rows={2} value={form.notes||""}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder} disabled={saving}
                  style={{ flex:1, background:BO.acc, border:"none", borderRadius:10,
                    padding:"10px", color:"#fff", fontWeight:700, fontSize:12,
                    cursor:"pointer", fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving ? "…" : "✅ Enregistrer"}
                </button>
                <button onClick={() => { setModal(null); setEditing(null); setForm({ ...FORM0 }); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:BO.cremeD,
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
