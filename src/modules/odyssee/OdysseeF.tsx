"use client";
// ═══════════════════════════════════════════════════════════
// BELLA'ODYSSÉE — Module complet fondatrice
// Clientes · Prestations · Produits · Consentements · Fidélité · Cartes cadeaux · Stats
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "../shared/supabaseHelpers";
import { B, FS, SA } from "../shared/constants";

// ── Types
interface Cliente { id:string; nom:string; prenom:string; telephone?:string; email?:string; date_naissance?:string; allergies?:string; notes_internes?:string; points_fidelite?:number; created_at?:string; }
interface Prestation { id:string; nom:string; categorie:string; prix:number; duree_min?:number; description?:string; statut:string; }
interface Produit { id:string; nom:string; categorie:string; prix:number; stock:number; reference?:string; statut:string; }
interface ConsentementSigne { id:string; cliente_id:string; type:string; signe_le:string; pdf_url?:string; }
interface CartesCadeaux { id:string; numero:string; montant_initial:number; montant_restant:number; statut:string; date_emission:string; date_expiration:string; }

// ── Mini composants UI réutilisables
const Card = ({ children, style={} }: any) => (
  <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: "12px 14px", ...style }}>
    {children}
  </div>
);
const Btn = ({ children, onClick, v="primary", sm=false, disabled=false }: any) => {
  const bg: Record<string,string> = {
    primary: `linear-gradient(135deg,${B.violet},#9333ea)`,
    gold:    `linear-gradient(135deg,${B.gold},#b8860b)`,
    ghost:   "rgba(255,255,255,0.07)",
    danger:  "rgba(239,68,68,0.15)",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: bg[v]||bg.primary, border: `1px solid ${v==="ghost"?B.border:v==="danger"?"rgba(239,68,68,0.4)":"transparent"}`, borderRadius: 10, padding: sm ? "5px 11px" : "9px 16px", color: v==="danger"?"#ef4444":"#fff", cursor: disabled?"not-allowed":"pointer", fontSize: sm?11:13, fontWeight: 700, fontFamily: SA, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
};
const Fld = ({ label, children }: any) => (
  <div style={{ display:"flex", flexDirection:"column", gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: B.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
    {children}
  </div>
);
const Inp = ({ value, onChange, placeholder="", type="text", rows=1 }: any) =>
  rows > 1
    ? <textarea value={value||""} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${B.border}`, borderRadius:10, padding:"9px 12px", color:B.cream, fontSize:13, outline:"none", fontFamily:SA, resize:"vertical", width:"100%", boxSizing:"border-box" }}/>
    : <input value={value||""} onChange={onChange} placeholder={placeholder} type={type}
        style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${B.border}`, borderRadius:10, padding:"9px 12px", color:B.cream, fontSize:13, outline:"none", fontFamily:SA, width:"100%", boxSizing:"border-box" }}/>;
const Sel = ({ value, onChange, options }: any) => (
  <select value={value||""} onChange={onChange}
    style={{ background:"#1a1625", border:`1px solid ${B.border}`, borderRadius:10, padding:"9px 12px", color:B.cream, fontSize:13, fontFamily:SA, width:"100%", outline:"none" }}>
    {options.map((o: any) => typeof o === "string"
      ? <option key={o} value={o}>{o}</option>
      : <option key={o.id} value={o.id}>{o.label}</option>
    )}
  </select>
);
const Modal = ({ title, onClose, children }: any) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
    <div style={{ background:"#13111a", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:"20px 16px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:16, fontWeight:800, color:B.cream, fontFamily:FS }}>{title}</div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:8, padding:"6px 12px", color:B.cream, cursor:"pointer", fontSize:13 }}>✕</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>{children}</div>
    </div>
  </div>
);
const Badge = ({ label, color }: any) => (
  <span style={{ fontSize:9, padding:"2px 8px", borderRadius:20, background:`${color}20`, color, fontWeight:700, fontFamily:SA }}>{label}</span>
);
const today = () => new Date().toISOString().split("T")[0];

// ── Onglets
const ONGS = [
  { id:"dash",         l:"📊 Dashboard" },
  { id:"clientes",     l:"👩 Clientes" },
  { id:"prestations",  l:"💅 Prestations" },
  { id:"produits",     l:"🛍 Produits" },
  { id:"consentements",l:"📝 Consentements" },
  { id:"fidelite",     l:"⭐ Fidélité" },
  { id:"cadeaux",      l:"🎁 Cartes cadeaux" },
  { id:"catalogue",    l:"📖 Catalogue" },
  { id:"stats",        l:"📈 Stats" },
];

const CATS_PRESTA = ["Extensions de cils","Remplissage cils","Browlift","Lashlift","Teinture cils","Blanchiment dentaire","Strass dentaire","Autre"];
const CATS_PRODUIT = ["Cosmétiques","Parfums femme","Parfums homme","Homme","Cadeaux","Autre"];
const TYPES_CONSENT = ["Consentement prestations regard","Consentement blanchiment dentaire","Consentement strass dentaire"];
const MONTANTS_CDG = [25, 50, 100, 150];

// ── Composant principal
export default function OdysseeF({ user }: { user: any }) {
  const [ong, setOng] = useState("dash");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [consentements, setConsentements] = useState<ConsentementSigne[]>([]);
  const [cartes, setCartes] = useState<CartesCadeaux[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string|null>(null);
  const [form, setForm] = useState<any>({});
  const f = (k: string) => (v: any) => setForm((x: any) => ({ ...x, [k]: typeof v === "string" ? v : v.target?.value ?? v }));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, pr, pd, co, ca] = await Promise.all([
        sbSelect<Cliente>("clients", { filters:{ type_client:"eq.cliente_odyssee" }, order:"nom.asc", limit:200 })
          .catch(()=>sbSelect<Cliente>("clients", { order:"nom.asc", limit:200 })),
        sbSelect<Prestation>("events_catalogue", { filters:{ categorie:"like.*eil*" }, order:"nom.asc", limit:100 }).catch(()=>[]),
        sbSelect<Produit>("stocks", { filters:{ univers:"eq.ODYSSEE" }, order:"nom.asc", limit:200 }),
        sbSelect<ConsentementSigne>("documents", { filters:{ type_document:"like.*consentement*" }, order:"created_at.desc", limit:100 }).catch(()=>[]),
        sbSelect<CartesCadeaux>("reservations", { filters:{ univers:"eq.ODYSSEE" }, order:"created_at.desc", limit:100 }).catch(()=>[]),
      ]);
      setClientes(cl||[]); setPrestations(pr||[]); setProduits(pd||[]);
      setConsentements(co||[]); setCartes(ca||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Sauvegarde cliente
  const saveCliente = async () => {
    if (!form.nom?.trim()) return;
    const data = { nom:form.nom, prenom:form.prenom||"", telephone:form.telephone||"", email:form.email||"",
      date_naissance:form.date_naissance||null, allergies:form.allergies||"", notes_internes:form.notes_internes||"",
      type_client:"cliente_odyssee", statut:"actif", fondatrice_id: user?.fondatrice_id || user?.id };
    if (form._id) await sbUpdate("clients", form._id, data);
    else await sbInsert("clients", data);
    setModal(null); setForm({}); reload();
  };

  // ── Sauvegarde produit (dans stocks)
  const saveProduit = async () => {
    if (!form.nom?.trim()) return;
    const data = { nom:form.nom, categorie:form.categorie||"Cosmétiques", univers:"ODYSSEE",
      prix_vente:parseFloat(form.prix)||0, quantite:parseFloat(form.stock)||0,
      quantite_min:parseFloat(form.stock_min)||2, unite:"unité", statut:"actif",
      reference:form.reference||"", notes:form.notes||"" };
    if (form._id) await sbUpdate("stocks", form._id, data);
    else await sbInsert("stocks", data);
    setModal(null); setForm({}); reload();
  };

  // ── Carte cadeau
  const saveCarte = async () => {
    const num = `CDG-OD-${Date.now()}`;
    const mt = parseFloat(form.montant)||50;
    const data = { univers:"ODYSSEE", prestation:`Carte cadeau ${mt}€`, montant:mt, acompte:0, statut:"actif",
      client_nom:form.beneficiaire||"Non renseigné", notes:`Carte cadeau émise le ${today()}`, statut_pmt:"payé",
      date_rdv:form.expiration ? new Date(form.expiration).toISOString() : null };
    await sbInsert("reservations", data);
    setModal(null); setForm({}); reload();
  };

  // ── Points fidélité
  const addPoints = async (clienteId: string, pts: number) => {
    const cl = clientes.find(c=>c.id===clienteId);
    if (!cl) return;
    const nouveaux = (cl.points_fidelite||0) + pts;
    await sbUpdate("clients", clienteId, { points_fidelite: nouveaux } as any);
    reload();
  };

  // ── Exports
  const exportCatalogue = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Catalogue Bella'Odyssée</title>
<style>body{font-family:Georgia,serif;padding:40px;color:#1a1a1a;max-width:800px;margin:auto}
h1{color:#7c3aed;font-size:28px}h2{color:#7c3aed;font-size:18px;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:30px}
.item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px}
.prix{font-weight:700;color:#7c3aed}.footer{margin-top:40px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}</style></head>
<body><h1>💅 Bella'Odyssée</h1><p style="color:#666">Catalogue des prestations et produits</p>
<h2>Prestations</h2>${prestations.map(p=>`<div class="item"><span>${p.nom}</span><span class="prix">${p.prix||"—"}€</span></div>`).join("")}
<h2>Produits</h2>${produits.map(p=>`<div class="item"><span>${p.nom} · ${p.categorie}</span><span class="prix">${p.prix_vente||p.prix||"—"}€</span></div>`).join("")}
<div class="footer">Bella'Odyssée · Bella'Studio · Sinnamary, Guyane française</div></body></html>`;
    const w = window.open("","_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const caTotal = produits.reduce((s,p)=>s+(parseFloat((p as any).prix_vente||p.prix||0)*parseFloat((p as any).quantite||p.stock||0)),0);
  const clientesActives = clientes.filter(c=>(c as any).statut==="actif").length;
  const produitsAlerte = produits.filter(p=>parseFloat((p as any).quantite||p.stock||0)<=parseFloat((p as any).quantite_min||2));
  const cartesActives = cartes.filter(c=>(c as any).statut==="actif").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, minHeight:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:B.cream, fontFamily:FS }}>💅 Bella'Odyssée</div>
          <div style={{ fontSize:10, color:B.muted }}>Beauté · Bien-être · Produits</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
        {ONGS.map(o=>(
          <button key={o.id} onClick={()=>setOng(o.id)}
            style={{ padding:"5px 12px", borderRadius:99, border:`1px solid ${ong===o.id?B.gold:B.border}`, background:ong===o.id?`${B.gold}18`:"transparent", color:ong===o.id?B.gold:B.muted, cursor:"pointer", fontSize:10, fontWeight:ong===o.id?700:400, whiteSpace:"nowrap", fontFamily:SA }}>
            {o.l}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD */}
      {ong==="dash" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { l:"Clientes actives",   v:clientesActives,   c:B.violetL },
              { l:"Produits en stock",  v:produits.length,    c:B.gold },
              { l:"Alertes stock",      v:produitsAlerte.length, c:produitsAlerte.length>0?"#ef4444":B.success },
              { l:"Cartes cadeaux",     v:cartesActives,      c:"#0d9488" },
            ].map(k=>(
              <div key={k.l} style={{ flex:1, minWidth:70, background:`${k.c}12`, border:`1px solid ${k.c}30`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:700, color:k.c, fontFamily:FS }}>{k.v}</div>
                <div style={{ fontSize:9, color:B.muted, marginTop:2 }}>{k.l}</div>
              </div>
            ))}
          </div>
          {produitsAlerte.length > 0 && (
            <Card style={{ borderColor:"rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:6 }}>⚠ {produitsAlerte.length} produit{produitsAlerte.length>1?"s":""} en alerte stock</div>
              {produitsAlerte.map(p=>(
                <div key={p.id} style={{ fontSize:11, color:B.cream, display:"flex", justifyContent:"space-between" }}>
                  <span>{p.nom}</span>
                  <span style={{ color:"#ef4444" }}>{(p as any).quantite||p.stock} / min {(p as any).quantite_min||2}</span>
                </div>
              ))}
            </Card>
          )}
          <Card>
            <div style={{ fontSize:11, fontWeight:700, color:B.muted, marginBottom:6 }}>Actions rapides</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn v="gold" onClick={()=>{setForm({});setModal("cliente");}}>+ Cliente</Btn>
              <Btn v="primary" onClick={()=>{setForm({categorie:"Cosmétiques",stock:0,stock_min:2});setModal("produit");}}>+ Produit</Btn>
              <Btn v="ghost" onClick={()=>{setForm({montant:50,expiration:""});setModal("carte");}}>🎁 Carte cadeau</Btn>
              <Btn v="ghost" onClick={exportCatalogue}>📄 Catalogue PDF</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── CLIENTES */}
      {ong==="clientes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>{clientes.length} cliente{clientes.length>1?"s":""}</div>
            <Btn v="gold" onClick={()=>{setForm({});setModal("cliente");}}>+ Nouvelle cliente</Btn>
          </div>
          {loading ? <div style={{ textAlign:"center", color:B.muted, padding:20 }}>Chargement…</div> : (
            clientes.length===0
              ? <div style={{ textAlign:"center", color:B.muted, padding:24 }}>Aucune cliente enregistrée.</div>
              : clientes.map(cl=>(
                <Card key={cl.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>{cl.prenom||""} {cl.nom}</div>
                      <div style={{ fontSize:10, color:B.muted, marginTop:2 }}>{cl.telephone||""} {cl.email?"· "+cl.email:""}</div>
                      {cl.allergies && <div style={{ fontSize:10, color:"#f59e0b", marginTop:3 }}>⚠ {cl.allergies}</div>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                      <Badge label={`⭐ ${cl.points_fidelite||0} pts`} color={B.gold}/>
                      <div style={{ display:"flex", gap:4 }}>
                        <Btn sm v="ghost" onClick={()=>addPoints(cl.id,1)}>+1 pt</Btn>
                        <Btn sm v="ghost" onClick={()=>{setForm({...cl,_id:cl.id});setModal("cliente");}}>✏</Btn>
                        <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("clients",cl.id).then(reload);}}>✕</Btn>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      )}

      {/* ── PRESTATIONS */}
      {ong==="prestations" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Prestations Bella'Odyssée</div>
          {CATS_PRESTA.map(cat=>(
            <div key={cat}>
              <div style={{ fontSize:10, fontWeight:700, color:B.muted, textTransform:"uppercase", letterSpacing:"0.06em", margin:"10px 0 5px" }}>{cat}</div>
              {prestations.filter(p=>p.categorie===cat).map(p=>(
                <Card key={p.id} style={{ marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ fontSize:12, color:B.cream }}>{p.nom}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:B.gold }}>{p.prix||"—"}€</div>
                  </div>
                </Card>
              ))}
              {prestations.filter(p=>p.categorie===cat).length===0 && (
                <div style={{ fontSize:11, color:B.muted, padding:"4px 0" }}>Aucune prestation dans cette catégorie.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PRODUITS */}
      {ong==="produits" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>{produits.length} produit{produits.length>1?"s":""}</div>
            <Btn v="gold" onClick={()=>{setForm({categorie:"Cosmétiques",stock:0,stock_min:2});setModal("produit");}}>+ Produit</Btn>
          </div>
          {CATS_PRODUIT.map(cat=>{
            const items = produits.filter(p=>p.categorie===cat);
            if (items.length===0) return null;
            return (
              <div key={cat}>
                <div style={{ fontSize:10, fontWeight:700, color:B.muted, textTransform:"uppercase", letterSpacing:"0.06em", margin:"10px 0 5px" }}>{cat}</div>
                {items.map(p=>{
                  const qte = parseFloat((p as any).quantite||p.stock||0);
                  const min = parseFloat((p as any).quantite_min||2);
                  return (
                    <Card key={p.id} style={{ marginBottom:6, borderLeft:`3px solid ${qte<=min?"#ef4444":B.violetL}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:B.cream }}>{p.nom}</div>
                          <div style={{ fontSize:10, color:B.muted }}>{(p as any).reference||"—"}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:14, fontWeight:700, color:B.gold }}>{(p as any).prix_vente||p.prix||0}€</div>
                          <div style={{ fontSize:10, color:qte<=min?"#ef4444":B.success }}>Stock : {qte}</div>
                          <div style={{ display:"flex", gap:4, marginTop:4, justifyContent:"flex-end" }}>
                            <Btn sm v="ghost" onClick={()=>{setForm({...p,_id:p.id,prix:(p as any).prix_vente||p.prix,stock:(p as any).quantite||p.stock,stock_min:(p as any).quantite_min||2});setModal("produit");}}>✏</Btn>
                            <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("stocks",p.id).then(reload);}}>✕</Btn>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONSENTEMENTS */}
      {ong==="consentements" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Consentements signés</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, background:"rgba(124,58,237,0.06)", border:`1px solid ${B.violetL}30`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:B.violetL, fontWeight:700 }}>ℹ Signature électronique</div>
            <div style={{ fontSize:11, color:B.muted }}>Les consentements sont générés et archivés dans Documents. Sélectionnez un type pour créer un nouveau consentement.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {TYPES_CONSENT.map(t=>(
                <Btn key={t} v="ghost" onClick={()=>{setForm({type:t,cliente_id:"",signe_le:today()});setModal("consent");}}>
                  📝 {t}
                </Btn>
              ))}
            </div>
          </div>
          {consentements.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:B.muted, marginTop:4 }}>Consentements archivés ({consentements.length})</div>
              {consentements.map(co=>(
                <Card key={co.id}>
                  <div style={{ fontSize:12, color:B.cream }}>{(co as any).titre||co.type||"Consentement"}</div>
                  <div style={{ fontSize:10, color:B.muted, marginTop:3 }}>{co.signe_le||(co as any).created_at?.slice(0,10)||"—"}</div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── FIDÉLITÉ */}
      {ong==="fidelite" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Programme Fidélité Prestige</div>
          <Card style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(201,168,76,0.1))" }}>
            <div style={{ fontSize:16, fontWeight:800, color:B.gold, fontFamily:FS, marginBottom:4 }}>⭐ Carte Fidélité Bella'Odyssée</div>
            <div style={{ fontSize:11, color:B.muted }}>1 prestation = 1 point · Les règles sont configurables</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
              {[{pts:5,r:"5% de remise"},{pts:10,r:"Prestation offerte"},{pts:15,r:"Kit cadeau"},{pts:20,r:"Journée VIP"}].map(r=>(
                <div key={r.pts} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:B.gold }}>{r.pts} pts</div>
                  <div style={{ fontSize:10, color:B.muted }}>{r.r}</div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ fontSize:11, fontWeight:700, color:B.muted, marginTop:4 }}>Classement clientes</div>
          {clientes.sort((a,b)=>(b.points_fidelite||0)-(a.points_fidelite||0)).slice(0,10).map(cl=>(
            <Card key={cl.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:12, color:B.cream }}>{cl.prenom||""} {cl.nom}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Badge label={`⭐ ${cl.points_fidelite||0} pts`} color={B.gold}/>
                  <Btn sm v="ghost" onClick={()=>addPoints(cl.id,1)}>+1 pt</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── CARTES CADEAUX */}
      {ong==="cadeaux" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Cartes cadeaux</div>
            <Btn v="gold" onClick={()=>{setForm({montant:50});setModal("carte");}}>+ Créer</Btn>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {MONTANTS_CDG.map(m=>(
              <button key={m} onClick={()=>{setForm({montant:m});setModal("carte");}}
                style={{ flex:1, minWidth:70, background:`${B.violetL}12`, border:`1px solid ${B.violetL}30`, borderRadius:12, padding:"12px 8px", textAlign:"center", cursor:"pointer" }}>
                <div style={{ fontSize:18, fontWeight:700, color:B.gold, fontFamily:FS }}>{m}€</div>
                <div style={{ fontSize:9, color:B.muted }}>Carte cadeau</div>
              </button>
            ))}
            <button onClick={()=>{setForm({montant:""});setModal("carte");}}
              style={{ flex:1, minWidth:70, background:`${B.gold}12`, border:`1px solid ${B.gold}30`, borderRadius:12, padding:"12px 8px", textAlign:"center", cursor:"pointer" }}>
              <div style={{ fontSize:18, fontWeight:700, color:B.gold, fontFamily:FS }}>Libre</div>
              <div style={{ fontSize:9, color:B.muted }}>Montant libre</div>
            </button>
          </div>
          {cartes.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:B.muted }}>Cartes émises ({cartes.length})</div>
              {cartes.slice(0,20).map(ca=>(
                <Card key={ca.id}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:B.cream }}>{(ca as any).client_nom||"—"}</div>
                      <div style={{ fontSize:10, color:B.muted }}>Émise le {(ca as any).created_at?.slice(0,10)||"—"}</div>
                    </div>
                    <Badge label={`${(ca as any).montant||0}€`} color={B.gold}/>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── CATALOGUE */}
      {ong==="catalogue" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Catalogue Bella'Odyssée</div>
            <Btn v="gold" onClick={exportCatalogue}>📄 Exporter PDF</Btn>
          </div>
          <Card>
            <div style={{ fontSize:12, fontWeight:700, color:B.violetL, marginBottom:8 }}>💅 Prestations</div>
            {prestations.slice(0,10).map(p=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${B.border}`, fontSize:12 }}>
                <span style={{ color:B.cream }}>{p.nom}</span>
                <span style={{ color:B.gold, fontWeight:700 }}>{p.prix||"—"}€</span>
              </div>
            ))}
            {prestations.length===0 && <div style={{ fontSize:11, color:B.muted }}>Aucune prestation enregistrée.</div>}
          </Card>
          <Card>
            <div style={{ fontSize:12, fontWeight:700, color:B.violetL, marginBottom:8 }}>🛍 Produits</div>
            {produits.slice(0,20).map(p=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${B.border}`, fontSize:12 }}>
                <span style={{ color:B.cream }}>{p.nom}</span>
                <span style={{ color:B.gold, fontWeight:700 }}>{(p as any).prix_vente||p.prix||"—"}€</span>
              </div>
            ))}
            {produits.length===0 && <div style={{ fontSize:11, color:B.muted }}>Aucun produit enregistré.</div>}
          </Card>
        </div>
      )}

      {/* ── STATISTIQUES */}
      {ong==="stats" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:B.cream }}>Statistiques Bella'Odyssée</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { l:"Clientes",            v:clientes.length,                                          c:B.violetL },
              { l:"Produits actifs",     v:produits.filter(p=>(p as any).statut==="actif").length,  c:B.gold },
              { l:"Valeur stock",        v:`${Math.round(caTotal)}€`,                               c:"#0d9488" },
              { l:"Cartes cadeaux",      v:cartes.length,                                            c:"#f59e0b" },
            ].map(k=>(
              <div key={k.l} style={{ flex:1, minWidth:70, background:`${k.c}12`, border:`1px solid ${k.c}30`, borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:700, color:k.c, fontFamily:FS }}>{k.v}</div>
                <div style={{ fontSize:9, color:B.muted, marginTop:2 }}>{k.l}</div>
              </div>
            ))}
          </div>
          <Card>
            <div style={{ fontSize:11, fontWeight:700, color:B.muted, marginBottom:8 }}>Top produits par catégorie</div>
            {CATS_PRODUIT.map(cat=>{
              const items = produits.filter(p=>p.categorie===cat);
              if (items.length===0) return null;
              return (
                <div key={cat} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, color:B.muted, fontWeight:700 }}>{cat} ({items.length})</div>
                  {items.slice(0,3).map(p=>(
                    <div key={p.id} style={{ fontSize:11, color:B.cream, display:"flex", justifyContent:"space-between", padding:"3px 0" }}>
                      <span>{p.nom}</span><span style={{ color:B.gold }}>{(p as any).prix_vente||p.prix||0}€</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Modal cliente */}
      {modal==="cliente" && (
        <Modal title={form._id?"Modifier cliente":"Nouvelle cliente"} onClose={()=>{setModal(null);setForm({});}}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fld label="Prénom"><Inp value={form.prenom} onChange={f("prenom")} placeholder="Prénom"/></Fld>
            <Fld label="Nom *"><Inp value={form.nom} onChange={f("nom")} placeholder="Nom"/></Fld>
          </div>
          <Fld label="Téléphone"><Inp value={form.telephone} onChange={f("telephone")} type="tel" placeholder="+594…"/></Fld>
          <Fld label="Email"><Inp value={form.email} onChange={f("email")} type="email" placeholder="email@…"/></Fld>
          <Fld label="Date de naissance"><Inp value={form.date_naissance} onChange={f("date_naissance")} type="date"/></Fld>
          <Fld label="Allergies / Contre-indications">
            <Inp value={form.allergies} onChange={f("allergies")} placeholder="Ex: latex, allergie nickel…" rows={2}/>
          </Fld>
          <Fld label="Notes internes">
            <Inp value={form.notes_internes} onChange={f("notes_internes")} placeholder="Préférences, observations…" rows={2}/>
          </Fld>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="gold" onClick={saveCliente}>Enregistrer</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {/* Modal produit */}
      {modal==="produit" && (
        <Modal title={form._id?"Modifier produit":"Nouveau produit"} onClose={()=>{setModal(null);setForm({});}}>
          <Fld label="Nom *"><Inp value={form.nom} onChange={f("nom")} placeholder="Nom du produit"/></Fld>
          <Fld label="Catégorie"><Sel value={form.categorie||"Cosmétiques"} onChange={f("categorie")} options={CATS_PRODUIT}/></Fld>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <Fld label="Prix vente €"><Inp type="number" value={form.prix} onChange={f("prix")} placeholder="0"/></Fld>
            <Fld label="Stock"><Inp type="number" value={form.stock} onChange={f("stock")} placeholder="0"/></Fld>
            <Fld label="Alerte min"><Inp type="number" value={form.stock_min} onChange={f("stock_min")} placeholder="2"/></Fld>
          </div>
          <Fld label="Référence"><Inp value={form.reference} onChange={f("reference")} placeholder="REF-OD-001"/></Fld>
          <Fld label="Notes"><Inp value={form.notes} onChange={f("notes")} placeholder="Notes…" rows={2}/></Fld>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="gold" onClick={saveProduit}>Enregistrer</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {/* Modal carte cadeau */}
      {modal==="carte" && (
        <Modal title="Nouvelle carte cadeau" onClose={()=>{setModal(null);setForm({});}}>
          <Fld label="Montant €">
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[25,50,100,150].map(m=>(
                <button key={m} onClick={()=>setForm((x: any)=>({...x,montant:m}))}
                  style={{ padding:"6px 14px", borderRadius:10, border:`2px solid ${form.montant===m?B.gold:B.border}`, background:form.montant===m?`${B.gold}18`:"transparent", color:form.montant===m?B.gold:B.muted, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                  {m}€
                </button>
              ))}
            </div>
            <Inp type="number" value={form.montant} onChange={f("montant")} placeholder="Montant libre"/>
          </Fld>
          <Fld label="Bénéficiaire"><Inp value={form.beneficiaire} onChange={f("beneficiaire")} placeholder="Nom du bénéficiaire"/></Fld>
          <Fld label="Date d'expiration"><Inp type="date" value={form.expiration} onChange={f("expiration")}/></Fld>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="gold" onClick={saveCarte}>Émettre la carte</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {/* Modal consentement */}
      {modal==="consent" && (
        <Modal title={form.type||"Consentement"} onClose={()=>{setModal(null);setForm({});}}>
          <Fld label="Cliente concernée">
            <Sel value={form.cliente_id||""} onChange={f("cliente_id")}
              options={[{id:"",label:"— Choisir une cliente —"},...clientes.map(cl=>({id:cl.id,label:`${cl.prenom||""} ${cl.nom}`.trim()}))]}/>
          </Fld>
          <Fld label="Date de signature"><Inp type="date" value={form.signe_le||today()} onChange={f("signe_le")}/></Fld>
          <div style={{ background:"rgba(124,58,237,0.08)", border:`1px solid ${B.violetL}30`, borderRadius:10, padding:"12px", fontSize:11, color:B.muted }}>
            En enregistrant, vous confirmez que la cliente a lu et signé le consentement le {form.signe_le||today()}.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="gold" onClick={async()=>{
              await sbInsert("documents",{type_document:`consentement_${form.type?.toLowerCase().replace(/\s+/g,"_")||"odyssee"}`,titre:form.type,client_id:form.cliente_id||null,fondatrice_id:user?.id,notes:`Signé le ${form.signe_le||today()}`,statut:"validé"});
              setModal(null);setForm({});reload();
            }}>Enregistrer le consentement</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
