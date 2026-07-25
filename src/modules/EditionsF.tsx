// ═══════════════════════════════════════════════════════════
// EditionsF — Vue Fondatrice Bella'Studio Éditions
// Ebooks · Formations · Gestion contenu · Supabase
// src/modules/editions/EditionsF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";

const SA = "system-ui, -apple-system, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const CE = {
  fond:"#0a0b14", acc:"#6366f1", accL:"#818cf8",
  or:"#c9a96e", creamD:"rgba(245,240,232,0.6)",
  card:"rgba(99,102,241,0.07)", line:"rgba(99,102,241,0.2)",
  vert:"#22c55e",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(99,102,241,0.2)",
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
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await tok() },
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

type TypeContenu = "ebook"|"formation"|"guide"|"template"|"audio"|"video";
type StatutContenu = "brouillon"|"en_cours"|"finalise"|"publie"|"archive";

interface Contenu {
  id:          string;
  reference?:  string;
  titre:       string;
  type:        TypeContenu;
  description?: string;
  prix?:       number;
  pages?:      number;
  modules?:    number;
  statut:      StatutContenu;
  tags?:       string[];
  urlFichier?: string;
  ventes?:     number;
  createdAt:   string;
}

const TYPES: { id: TypeContenu; label: string; ico: string }[] = [
  {id:"ebook",    label:"Ebook",            ico:"📖"},
  {id:"formation",label:"Formation",         ico:"🎓"},
  {id:"guide",    label:"Guide pratique",    ico:"📋"},
  {id:"template", label:"Modèle / Template", ico:"📐"},
  {id:"audio",    label:"Audio / Podcast",   ico:"🎙"},
  {id:"video",    label:"Vidéo",             ico:"🎬"},
];
const STATUTS: { id: StatutContenu; label: string; col: string }[] = [
  {id:"brouillon", label:"Brouillon",   col:"rgba(255,255,255,0.4)"},
  {id:"en_cours",  label:"En cours",    col:"#fb923c"},
  {id:"finalise",  label:"Finalisé",    col:"#60a5fa"},
  {id:"publie",    label:"Publié",      col:"#22c55e"},
  {id:"archive",   label:"Archivé",     col:"rgba(255,255,255,0.2)"},
];

function fmtPrix(n?: number|null) {
  if (n==null||n===0) return "Gratuit";
  return n.toFixed(2).replace(".",",")+" €";
}

const FORM0: Partial<Contenu> = {
  titre:"", type:"ebook", statut:"brouillon", prix:0,
  createdAt: new Date().toISOString(),
};

export default function EditionsF({ user }: { user?: any }) {
  const [contenus, setContenus] = useState<Contenu[]>([]);
  const [onglet,   setOnglet]   = useState<"bibliotheque"|"nouveau"|"stats">("bibliotheque");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<Contenu|null>(null);
  const [form,     setForm]     = useState<Partial<Contenu>>({ ...FORM0 });
  const [source,   setSource]   = useState<"local"|"supabase">("local");
  const [saving,   setSaving]   = useState(false);
  const [filtreType, setFiltreType] = useState<TypeContenu|"tous">("tous");

  useEffect(() => {
    sbGet("bellaia_documents",
      "module=eq.EDITIONS&order=created_at.desc&limit=100&select=id,reference,titre,categorie,statut,notes,tags,created_at"
    ).then(rows => {
      if (rows.length > 0) {
        setContenus(rows.map(r => ({
          id:r.id, reference:r.reference, titre:r.titre,
          type: (r.categorie as TypeContenu)||"ebook",
          description:r.notes,
          statut: r.statut==="final"?"publie":r.statut==="brouillon"?"brouillon":"en_cours",
          tags:r.tags||[], createdAt:r.created_at,
        })));
        setSource("supabase");
      }
    }).catch(()=>{});
  }, []);

  const visibles = useMemo(() =>
    filtreType==="tous" ? contenus : contenus.filter(c=>c.type===filtreType),
  [contenus, filtreType]);

  const stats = useMemo(() => ({
    total:    contenus.length,
    publies:  contenus.filter(c=>c.statut==="publie").length,
    ca:       contenus.filter(c=>c.statut==="publie").reduce((s,c)=>s+((c.prix||0)*(c.ventes||0)),0),
  }), [contenus]);

  const sauvegarder = async () => {
    if (!form.titre?.trim()) return;
    setSaving(true);
    const ref = editing?.reference || "ED-"+new Date().getFullYear()+"-"+Date.now().toString().slice(-6);
    const nv: Contenu = {
      id:editing?.id||"ed_"+Date.now().toString().slice(-8),
      reference:ref, titre:form.titre||"", type:form.type||"ebook",
      description:form.description, prix:form.prix,
      pages:form.pages, modules:form.modules,
      statut:form.statut||"brouillon",
      urlFichier:form.urlFichier, tags:form.tags||[],
      createdAt:editing?.createdAt||new Date().toISOString(),
    };
    if (editing) {
      setContenus(cs=>cs.map(c=>c.id===editing.id?nv:c));
    } else {
      setContenus(cs=>[nv,...cs]);
      await sbPost("bellaia_documents", {
        reference:ref, titre:nv.titre, module:"EDITIONS",
        categorie:nv.type, notes:nv.description,
        statut:nv.statut==="publie"?"final":"brouillon",
        tags:nv.tags, type_fichier:"html",
        fichier_url:nv.urlFichier,
      }).catch(()=>{});
    }
    setSaving(false);
    setModal(false); setEditing(null); setForm({...FORM0});
  };

  const changerStatut = (id: string, statut: StatutContenu) => {
    setContenus(cs=>cs.map(c=>c.id===id?{...c,statut}:c));
  };

  const imprimerFiche = (c: Contenu) => {
    const t = TYPES.find(t=>t.id===c.type);
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${c.titre}</title>
<style>body{font-family:Arial,sans-serif;padding:28px;max-width:640px;margin:0 auto;color:#111;font-size:13px}
h1{color:#6366f1;font-size:18px;border-bottom:2px solid #6366f1;padding-bottom:6px}
.badge{display:inline-block;background:#eef2ff;border:1px solid #c7d2fe;border-radius:4px;padding:2px 10px;font-size:11px;color:#6366f1;font-weight:700}
@media print{button{display:none}}</style></head><body>
<h1>${t?.ico||"📖"} ${c.titre}</h1>
<p><strong>Référence :</strong> ${c.reference||"—"}</p>
<p><strong>Type :</strong> ${t?.label||c.type}</p>
${c.description?`<p><strong>Description :</strong> ${c.description}</p>`:""}
${c.prix!=null?`<p><strong>Prix :</strong> ${fmtPrix(c.prix)}</p>`:""}
${c.pages?`<p><strong>Pages :</strong> ${c.pages}</p>`:""}
${c.modules?`<p><strong>Modules :</strong> ${c.modules}</p>`:""}
<p style="margin-top:12px"><span class="badge">${c.statut}</span></p>
<p style="margin-top:20px;color:#6b7280;font-size:11px">Bella'Studio Éditions · Sinnamary, Guyane</p>
</body></html>`;
    const w = window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CE.accL }}>📚 Bella'Studio Éditions</div>
          <div style={{ fontSize:10, color:source==="supabase"?CE.vert:"rgba(255,255,255,0.35)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"} · {contenus.length} contenu{contenus.length>1?"s":""}
          </div>
        </div>
        <button onClick={()=>{setForm({...FORM0});setEditing(null);setModal(true);}}
          style={{ background:CE.acc, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouveau contenu
        </button>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {[
          {l:"Total",   v:stats.total,       col:"#fff"},
          {l:"Publiés", v:stats.publies,     col:CE.vert},
          {l:"CA",      v:fmtPrix(stats.ca), col:CE.or},
        ].map(k=>(
          <div key={k.l} style={{ background:CE.card, border:`1px solid ${CE.line}`,
            borderRadius:9, padding:"9px", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, color:k.col }}>{k.v}</div>
            <div style={{ fontSize:9, color:CE.creamD, marginTop:1 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filtres type */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {([{id:"tous" as const, label:"Tous", ico:"📦"},...TYPES]).map(t=>(
          <button key={t.id} onClick={()=>setFiltreType(t.id as any)}
            style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtreType===t.id?CE.acc:"rgba(255,255,255,0.07)",
              color:filtreType===t.id?"#fff":"rgba(255,255,255,0.5)" }}>
            {t.ico} {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {visibles.length===0 && (
        <div style={{ textAlign:"center", padding:"28px", color:CE.creamD, fontStyle:"italic" }}>
          Aucun contenu. Créez votre premier ebook ou formation.
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {visibles.map(c=>{
          const t  = TYPES.find(x=>x.id===c.type);
          const sc = STATUTS.find(s=>s.id===c.statut);
          return (
            <div key={c.id} style={{ background:CE.card, border:`1px solid ${CE.line}`,
              borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                  <span style={{ fontSize:20 }}>{t?.ico||"📖"}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{c.titre}</div>
                    <div style={{ fontSize:10, color:CE.creamD }}>
                      {t?.label}{c.pages?" · "+c.pages+" pages":""}{c.modules?" · "+c.modules+" modules":""}
                    </div>
                    {c.prix!=null && (
                      <div style={{ fontSize:11, fontWeight:700, color:CE.or, marginTop:2 }}>
                        {fmtPrix(c.prix)}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:9, background:sc?.col+"22", color:sc?.col,
                  border:`1px solid ${sc?.col}44`, borderRadius:4,
                  padding:"2px 8px", fontWeight:700, alignSelf:"flex-start", flexShrink:0 }}>
                  {sc?.label}
                </span>
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {c.statut!=="publie" && (
                  <button onClick={()=>changerStatut(c.id,"publie")}
                    style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                      border:"1px solid rgba(34,197,94,0.4)", background:"transparent",
                      color:"#22c55e", fontFamily:SA }}>
                    🌐 Publier
                  </button>
                )}
                {c.statut==="publie" && (
                  <button onClick={()=>changerStatut(c.id,"archive")}
                    style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                      border:"1px solid rgba(255,255,255,0.15)", background:"transparent",
                      color:"rgba(255,255,255,0.4)", fontFamily:SA }}>
                    Archiver
                  </button>
                )}
                <button onClick={()=>{setEditing(c);setForm({...c});setModal(true);}}
                  style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                    border:"1px solid rgba(255,255,255,0.12)", background:"transparent",
                    color:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                  ✏ Modifier
                </button>
                <button onClick={()=>imprimerFiche(c)}
                  style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                    border:`1px solid ${CE.or}44`, background:"transparent",
                    color:CE.or, fontFamily:SA }}>
                  📄 Fiche
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:16, overflowY:"auto" }}>
          <div style={{ background:"#0a0b14", border:`1px solid ${CE.line}`,
            borderRadius:16, padding:18, width:"100%", maxWidth:460, marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontFamily:FS, fontSize:14, color:CE.accL }}>
                {editing?"Modifier le contenu":"Nouveau contenu"}
              </div>
              <button onClick={()=>{setModal(false);setEditing(null);setForm({...FORM0});}}
                style={{ background:"none", border:"none", color:CE.creamD, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CE.creamD }}>Titre *</label>
                <input value={form.titre||""} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CE.creamD }}>Type</label>
                <select value={form.type||"ebook"} onChange={e=>setForm(f=>({...f,type:e.target.value as TypeContenu}))}
                  style={{ ...inp, background:"#0a0b14" }}>
                  {TYPES.map(t=><option key={t.id} value={t.id}>{t.ico} {t.label}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CE.creamD }}>Description</label>
                <textarea rows={2} value={form.description||""}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CE.creamD }}>Prix (€)</label>
                  <input type="number" min="0" value={form.prix||0}
                    onChange={e=>setForm(f=>({...f,prix:Number(e.target.value)}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CE.creamD }}>Pages / Modules</label>
                  <input type="number" value={form.pages||form.modules||""}
                    onChange={e=>setForm(f=>({...f,pages:Number(e.target.value)}))} style={inp}/>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CE.creamD }}>Lien fichier / URL</label>
                <input value={form.urlFichier||""} placeholder="https://…"
                  onChange={e=>setForm(f=>({...f,urlFichier:e.target.value}))} style={inp}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CE.creamD }}>Statut</label>
                <select value={form.statut||"brouillon"}
                  onChange={e=>setForm(f=>({...f,statut:e.target.value as StatutContenu}))}
                  style={{ ...inp, background:"#0a0b14" }}>
                  {STATUTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder} disabled={saving}
                  style={{ flex:1, background:CE.acc, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer",
                    fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving?"…":"✅ Enregistrer"}
                </button>
                <button onClick={()=>{setModal(false);setEditing(null);setForm({...FORM0});}}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:CE.creamD, fontSize:12, cursor:"pointer", fontFamily:SA }}>
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
