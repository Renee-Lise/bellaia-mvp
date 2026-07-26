// ═══════════════════════════════════════════════════════════
// MoTiPeyiF — Vue Fondatrice Mo Ti-Péyi
// Catalogue cartes · Séries · Commandes · Téléchargements
// Respecte le cahier des charges Mo Ti-Péyi validé
// src/modules/motipy/MoTiPeyiF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";

const SA = "system-ui, -apple-system, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const CM = {
  fond:"#0b1505", acc:"#22c55e", accL:"#4ade80",
  or:"#f59e0b", creamD:"rgba(245,240,232,0.6)",
  card:"rgba(34,197,94,0.07)", line:"rgba(34,197,94,0.2)",
  rouge:"#ef4444", bleu:"#60a5fa", violet:"#a855f7",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(34,197,94,0.2)",
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

// ── Familles de cartes validées ───────────────────────────
const FAMILLES = [
  {id:"deplacements", label:"Déplacements",     ico:"🏃", col:"#22c55e", total:120},
  {id:"actions",      label:"Actions",           ico:"⚡", col:"#f59e0b", total:120},
  {id:"nature",       label:"Nature Guyanaise",  ico:"🌿", col:"#4ade80", total:120},
  {id:"conditions",   label:"Conditions",        ico:"🔀", col:"#60a5fa", total:120},
  {id:"boucles",      label:"Boucles",           ico:"🔁", col:"#a855f7", total:120},
  {id:"debogage",     label:"Débogage",          ico:"🔍", col:"#ef4444", total:120},
  {id:"evenements",   label:"Événements",        ico:"⭐", col:"#f59e0b", total:120},
  {id:"recompenses",  label:"Récompenses",       ico:"🏆", col:"#c9a96e", total:120},
];

// ── Niveaux scolaires ─────────────────────────────────────
const NIVEAUX = ["PS","MS","GS","CP","Tous"];

// ── Personnages validés ───────────────────────────────────
const PERSONNAGES = [
  "Ti-Colibri (mascotte)", "Awa l'Awara", "Lola", "Kimi",
  "Théo", "Jade", "Marcus", "Priya",
  "L'Ara Rouge", "Le Caïman", "La Tortue Luth",
  "Le Jaguar", "L'Anaconda",
];

interface Commande {
  id:        string;
  reference: string;
  clientNom: string;
  clientTel?: string;
  produit:   string;
  qte:       number;
  prix:      number;
  statut:    "en_attente"|"confirmee"|"expediee"|"livree";
  date:      string;
}

interface Carte {
  id:      string;
  famille: string;
  nom:     string;
  niveau:  string;
  statut:  "brouillon"|"validee"|"imprimee";
  description?: string;
}

function fmtPrix(n: number) { return n.toFixed(2).replace(".",",")+" €"; }
function today() { return new Date().toISOString().split("T")[0]; }

const PRODUITS = [
  {nom:"Boîte complète Mo Ti-Péyi — 120 cartes", prix:29.90},
  {nom:"Pack Démarreur — 30 cartes",              prix:12.90},
  {nom:"Extension Familles",                      prix:14.90},
  {nom:"Fiche pédagogique PDF",                   prix:4.90},
  {nom:"Poster A2 — Univers Mo Ti-Péyi",          prix:9.90},
];

const ONGLETS = [
  {id:"catalogue", ico:"🃏", label:"Cartes"},
  {id:"commandes", ico:"📦", label:"Commandes"},
  {id:"stats",     ico:"📊", label:"Stats"},
];

export default function MoTiPeyiF({ user }: { user?: any }) {
  const [cartes,   setCartes]   = useState<Carte[]>([]);
  const [commandes,setCommandes]= useState<Commande[]>([]);
  const [onglet,   setOnglet]   = useState<"catalogue"|"commandes"|"stats">("catalogue");
  const [modal,    setModal]    = useState<"carte"|"commande"|null>(null);
  const [formCarte, setFormCarte] = useState<Partial<Carte>>({famille:"deplacements",niveau:"PS",statut:"brouillon"});
  const [formCmd,   setFormCmd]   = useState<Partial<Commande>>({clientNom:"",produit:PRODUITS[0].nom,qte:1,prix:PRODUITS[0].prix,statut:"en_attente",date:today()});
  const [source,   setSource]   = useState<"local"|"supabase">("local");
  const [saving,   setSaving]   = useState(false);
  const [filtreFam,setFiltreFam]= useState<string>("tous");

  useEffect(() => {
    // Charger commandes depuis bellaia_commandes (bu=MOTIPY)
    sbGet("bellaia_commandes",
      "bu=eq.MOTIPY&order=created_at.desc&limit=50&select=id,reference,client_nom,client_tel,statut,total,lignes,date_commande"
    ).then(rows => {
      if (rows.length > 0) {
        setCommandes(rows.map(r => {
          const l = r.lignes ? (typeof r.lignes==="string"?JSON.parse(r.lignes):r.lignes)[0] : {};
          return {
            id:r.id, reference:r.reference||r.id.slice(0,8),
            clientNom:r.client_nom, clientTel:r.client_tel,
            produit:l?.libelle||"Produit Mo Ti-Péyi", qte:l?.qte||1,
            prix:r.total||0,
            statut: r.statut==="LIVRE"||r.statut==="CLOTURE"?"livree"
                  : r.statut==="PRODUCTION"?"expediee"
                  : r.statut==="COMMANDE"?"confirmee":"en_attente",
            date:r.date_commande||today(),
          };
        }));
        setSource("supabase");
      }
    }).catch(()=>{});

    // Cartes depuis bellaia_documents (module=MOTIPY)
    sbGet("bellaia_documents",
      "module=eq.MOTIPY&order=created_at.desc&limit=120&select=id,titre,categorie,statut,notes"
    ).then(rows => {
      if (rows.length > 0) {
        setCartes(rows.map(r=>({
          id:r.id, famille:r.categorie||"deplacements", nom:r.titre,
          niveau:"Tous", statut:r.statut==="final"?"validee":"brouillon",
          description:r.notes,
        })));
      }
    }).catch(()=>{});
  }, []);

  const visibleCartes = useMemo(() =>
    filtreFam==="tous" ? cartes : cartes.filter(c=>c.famille===filtreFam),
  [cartes, filtreFam]);

  const stats = useMemo(() => ({
    totalCartes:  cartes.length,
    validees:     cartes.filter(c=>c.statut==="validee").length,
    commandes:    commandes.length,
    ca:           commandes.filter(c=>["livree","expediee"].includes(c.statut)).reduce((s,c)=>s+c.prix,0),
  }), [cartes, commandes]);

  const sauverCarte = async () => {
    if (!formCarte.nom?.trim()) return;
    setSaving(true);
    const nv: Carte = {
      id:"mc_"+Date.now().toString().slice(-8),
      famille:formCarte.famille||"deplacements", nom:formCarte.nom,
      niveau:formCarte.niveau||"PS", statut:formCarte.statut||"brouillon",
      description:formCarte.description,
    };
    setCartes(cs=>[nv,...cs]);
    await sbPost("bellaia_documents", {
      module:"MOTIPY", titre:nv.nom, categorie:nv.famille,
      statut:nv.statut==="validee"?"final":"brouillon", notes:nv.description,
    }).catch(()=>{});
    setSaving(false);
    setModal(null); setFormCarte({famille:"deplacements",niveau:"PS",statut:"brouillon"});
  };

  const sauverCommande = async () => {
    if (!formCmd.clientNom?.trim()) return;
    setSaving(true);
    const ref = "MTP-"+new Date().getFullYear()+"-"+Date.now().toString().slice(-6);
    const nv: Commande = {
      id:"cmd_"+Date.now().toString().slice(-8), reference:ref,
      clientNom:formCmd.clientNom||"", clientTel:formCmd.clientTel,
      produit:formCmd.produit||PRODUITS[0].nom,
      qte:formCmd.qte||1, prix:(formCmd.qte||1)*(formCmd.prix||0),
      statut:"en_attente", date:formCmd.date||today(),
    };
    setCommandes(cs=>[nv,...cs]);
    await sbPost("bellaia_commandes",{
      bu:"MOTIPY", reference:ref, client_nom:nv.clientNom, client_tel:nv.clientTel,
      statut:"BROUILLON", total:nv.prix, date_commande:nv.date,
      lignes:JSON.stringify([{libelle:nv.produit,qte:nv.qte,prixUnitaire:formCmd.prix||0,total:nv.prix}]),
    }).catch(()=>{});
    setSaving(false);
    setModal(null); setFormCmd({clientNom:"",produit:PRODUITS[0].nom,qte:1,prix:PRODUITS[0].prix,statut:"en_attente",date:today()});
  };

  const imprimerBon = (cmd: Commande) => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Commande ${cmd.reference}</title>
<style>body{font-family:Arial,sans-serif;padding:28px;max-width:640px;margin:0 auto;color:#111;font-size:13px}
h1{color:#22c55e;font-size:18px;border-bottom:2px solid #22c55e;padding-bottom:6px}
@media print{button{display:none}}</style></head><body>
<h1>🌿 Mo Ti-Péyi — Bon de commande</h1>
<p><strong>Référence :</strong> ${cmd.reference}</p>
<p><strong>Client :</strong> ${cmd.clientNom}${cmd.clientTel?" — "+cmd.clientTel:""}</p>
<p><strong>Produit :</strong> ${cmd.produit}</p>
<p><strong>Quantité :</strong> ${cmd.qte}</p>
<p><strong>Total :</strong> <strong style="color:#22c55e">${fmtPrix(cmd.prix)}</strong></p>
<p><strong>Date :</strong> ${new Date(cmd.date).toLocaleDateString("fr-FR")}</p>
<p style="margin-top:16px;color:#6b7280;font-size:11px">Mo Ti-Péyi · Bella'Studio · Sinnamary, Guyane</p>
</body></html>`;
    const w = window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CM.accL }}>🌿 Mo Ti-Péyi</div>
          <div style={{ fontSize:10, color:source==="supabase"?CM.acc:"rgba(255,255,255,0.35)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"}
            {" · "}{cartes.length} cartes · {commandes.length} commandes
          </div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={()=>setModal("commande")}
            style={{ background:"rgba(34,197,94,0.15)", border:`1px solid ${CM.acc}44`,
              borderRadius:8, padding:"6px 12px", color:CM.accL,
              fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:SA }}>
            📦 Commande
          </button>
          <button onClick={()=>setModal("carte")}
            style={{ background:CM.acc, border:"none", borderRadius:8, padding:"6px 12px",
              color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:SA }}>
            + Carte
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
        {[
          {l:"Cartes",   v:`${stats.totalCartes}/960`, col:"#fff"},
          {l:"Validées", v:stats.validees,             col:CM.acc},
          {l:"Commandes",v:stats.commandes,            col:CM.or},
          {l:"CA",       v:fmtPrix(stats.ca),          col:CM.accL},
        ].map(k=>(
          <div key={k.l} style={{ background:CM.card, border:`1px solid ${CM.line}`,
            borderRadius:9, padding:"8px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:k.col }}>{k.v}</div>
            <div style={{ fontSize:9, color:CM.creamD, marginTop:1 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {ONGLETS.map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id as any)}
            style={{ flex:1, padding:"7px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, fontFamily:SA,
              background:onglet===o.id?CM.acc:"rgba(255,255,255,0.06)",
              color:onglet===o.id?"#fff":"rgba(255,255,255,0.5)" }}>
            {o.ico} {o.label}
          </button>
        ))}
      </div>

      {/* ── Catalogue cartes ── */}
      {onglet==="catalogue" && (
        <>
          <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
            <button onClick={()=>setFiltreFam("tous")}
              style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
                fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
                background:filtreFam==="tous"?CM.acc:"rgba(255,255,255,0.07)",
                color:filtreFam==="tous"?"#fff":"rgba(255,255,255,0.5)" }}>
              Toutes
            </button>
            {FAMILLES.map(f=>(
              <button key={f.id} onClick={()=>setFiltreFam(f.id)}
                style={{ padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer",
                  fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
                  background:filtreFam===f.id?f.col:"rgba(255,255,255,0.07)",
                  color:filtreFam===f.id?"#fff":"rgba(255,255,255,0.5)" }}>
                {f.ico} {f.label}
              </button>
            ))}
          </div>

          {/* Barre de progression par famille */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {FAMILLES.filter(f=>filtreFam==="tous"||f.id===filtreFam).map(f=>{
              const count = cartes.filter(c=>c.famille===f.id).length;
              const pct   = Math.round(count/f.total*100);
              return (
                <div key={f.id} style={{ background:CM.card, border:`1px solid ${CM.line}`,
                  borderRadius:10, padding:"9px 12px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{f.ico} {f.label}</span>
                    <span style={{ fontSize:10, color:f.col, fontWeight:700 }}>{count}/{f.total}</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
                    <div style={{ height:4, width:`${pct}%`, background:f.col, borderRadius:2 }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Liste cartes si filtre famille */}
          {filtreFam!=="tous" && visibleCartes.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {visibleCartes.map(c=>(
                <div key={c.id} style={{ background:"rgba(255,255,255,0.04)",
                  border:`1px solid ${CM.line}`, borderRadius:9, padding:"8px 11px",
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{c.nom}</div>
                    <div style={{ fontSize:9, color:CM.creamD }}>Niveau {c.niveau}</div>
                  </div>
                  <span style={{ fontSize:9,
                    color:c.statut==="validee"?CM.acc:"rgba(255,255,255,0.4)",
                    fontWeight:700 }}>
                    {c.statut==="validee"?"✅":"⏳"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Commandes ── */}
      {onglet==="commandes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {commandes.length===0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CM.creamD, fontStyle:"italic" }}>
              Aucune commande. Créez la première avec le bouton 📦 Commande.
            </div>
          )}
          {commandes.map(cmd=>{
            const stCol = {en_attente:"#60a5fa",confirmee:"#22c55e",expediee:"#f59e0b",livree:"#a855f7"}[cmd.statut];
            return (
              <div key={cmd.id} style={{ background:CM.card, border:`1px solid ${CM.line}`,
                borderRadius:12, padding:"11px 13px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{cmd.clientNom}</div>
                    <div style={{ fontSize:10, color:CM.creamD }}>{cmd.produit} × {cmd.qte}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>
                      {new Date(cmd.date).toLocaleDateString("fr-FR")} · {cmd.reference}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:CM.or }}>{fmtPrix(cmd.prix)}</div>
                    <span style={{ fontSize:8, color:stCol, fontWeight:700 }}>{cmd.statut}</span>
                  </div>
                </div>
                <button onClick={()=>imprimerBon(cmd)}
                  style={{ fontSize:9, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                    border:`1px solid ${CM.or}44`, background:"transparent",
                    color:CM.or, fontFamily:SA }}>
                  📄 Bon de commande
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats ── */}
      {onglet==="stats" && (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          <div style={{ background:CM.card, border:`1px solid ${CM.line}`,
            borderRadius:12, padding:"13px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:CM.or, marginBottom:8 }}>
              Avancement du projet Mo Ti-Péyi
            </div>
            <div style={{ fontSize:12, color:"#fff", marginBottom:3 }}>
              {stats.totalCartes} cartes créées sur 960 prévues ({Math.round(stats.totalCartes/960*100)}%)
            </div>
            <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, marginBottom:12 }}>
              <div style={{ height:6, width:`${Math.round(stats.totalCartes/960*100)}%`,
                background:CM.acc, borderRadius:3 }}/>
            </div>
            {FAMILLES.map(f=>{
              const count = cartes.filter(c=>c.famille===f.id).length;
              return (
                <div key={f.id} style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", borderBottom:`1px solid ${CM.line}` }}>
                  <span style={{ fontSize:10, color:"#fff" }}>{f.ico} {f.label}</span>
                  <span style={{ fontSize:10, color:f.col, fontWeight:700 }}>
                    {count}/{f.total} ({Math.round(count/f.total*100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Carte */}
      {modal==="carte" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#0b1505", border:`1px solid ${CM.line}`,
            borderRadius:16, padding:18, width:"100%", maxWidth:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontFamily:FS, fontSize:14, color:CM.accL }}>Nouvelle carte</div>
              <button onClick={()=>setModal(null)}
                style={{ background:"none", border:"none", color:CM.creamD, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CM.creamD }}>Nom de la carte *</label>
                <input value={formCarte.nom||""} onChange={e=>setFormCarte(f=>({...f,nom:e.target.value}))} style={inp}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CM.creamD }}>Famille</label>
                  <select value={formCarte.famille||"deplacements"}
                    onChange={e=>setFormCarte(f=>({...f,famille:e.target.value}))}
                    style={{ ...inp, background:"#0b1505" }}>
                    {FAMILLES.map(f=><option key={f.id} value={f.id}>{f.ico} {f.label}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CM.creamD }}>Niveau</label>
                  <select value={formCarte.niveau||"PS"}
                    onChange={e=>setFormCarte(f=>({...f,niveau:e.target.value}))}
                    style={{ ...inp, background:"#0b1505" }}>
                    {NIVEAUX.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CM.creamD }}>Description</label>
                <textarea rows={2} value={formCarte.description||""}
                  onChange={e=>setFormCarte(f=>({...f,description:e.target.value}))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauverCarte} disabled={saving}
                  style={{ flex:1, background:CM.acc, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving?"…":"✅ Créer"}
                </button>
                <button onClick={()=>setModal(null)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:CM.creamD, fontSize:12, cursor:"pointer", fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Commande */}
      {modal==="commande" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#0b1505", border:`1px solid ${CM.line}`,
            borderRadius:16, padding:18, width:"100%", maxWidth:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontFamily:FS, fontSize:14, color:CM.accL }}>Nouvelle commande</div>
              <button onClick={()=>setModal(null)}
                style={{ background:"none", border:"none", color:CM.creamD, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Client *","clientNom","text"],["Téléphone","clientTel","tel"]].map(([l,k,t])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CM.creamD }}>{l}</label>
                  <input type={t} value={(formCmd as any)[k]||""}
                    onChange={e=>setFormCmd(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CM.creamD }}>Produit</label>
                <select value={formCmd.produit||""}
                  onChange={e=>{
                    const p = PRODUITS.find(x=>x.nom===e.target.value);
                    setFormCmd(f=>({...f,produit:e.target.value,prix:p?.prix||f.prix}));
                  }} style={{ ...inp, background:"#0b1505" }}>
                  {PRODUITS.map(p=><option key={p.nom} value={p.nom}>{p.nom} — {fmtPrix(p.prix)}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CM.creamD }}>Quantité</label>
                  <input type="number" min="1" value={formCmd.qte||1}
                    onChange={e=>setFormCmd(f=>({...f,qte:Number(e.target.value)}))} style={inp}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CM.creamD }}>Date</label>
                  <input type="date" value={formCmd.date||today()}
                    onChange={e=>setFormCmd(f=>({...f,date:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div style={{ background:"rgba(34,197,94,0.1)", border:`1px solid ${CM.line}`,
                borderRadius:8, padding:"8px 10px", fontSize:12, color:CM.accL, fontWeight:700 }}>
                Total : {fmtPrix((formCmd.qte||1)*(formCmd.prix||0))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauverCommande} disabled={saving}
                  style={{ flex:1, background:CM.acc, border:"none", borderRadius:10, padding:"10px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving?"…":"✅ Enregistrer"}
                </button>
                <button onClick={()=>setModal(null)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"10px", color:CM.creamD, fontSize:12, cursor:"pointer", fontFamily:SA }}>
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
