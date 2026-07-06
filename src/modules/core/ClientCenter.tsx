// ═══════════════════════════════════════════════════════════
// ClientCenter — CRM Central Bellaïa LOT VII
// Un client unique pour tous les modules
// Fiche client + historique automatique + adresses + contacts
// src/modules/core/ClientCenter.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type {
  Client, StatutClient, EntreeHistoriqueClient,
  Adresse, Contact, BusinessUnit,
} from "./coreTypes";
import { BELLAÏA_COLORS as FC, SA, FS, INP_STYLE as inp } from "./coreDesign";
import {
  getClients, getClient, creerClient, majClient,
  getHistoriqueClient, ajouterAdresse, ajouterContact,
} from "./coreApi";

const BU_LIST: BusinessUnit[] = ["FOOD","EVENTS","BSH","ODYSSEE","GENERAL"];

const STATUT_COL: Record<StatutClient, string> = {
  actif:   "rgba(21,128,61,0.2)",
  inactif: "rgba(201,168,76,0.15)",
  archive: "rgba(255,255,255,0.06)",
};
const STATUT_TXT: Record<StatutClient, string> = {
  actif:"#22c55e", inactif:"#c9a96e", archive:"rgba(255,255,255,0.35)",
};

const HISTORIQUE_ICO: Record<string, string> = {
  devis_events:"📄", facture:"🧾", paiement:"💳",
  commande_food:"🍰", note:"📝",
};

const FORM0: Omit<Client, "id"> = {
  nom:"", statut:"actif", businessUnits:[], tags:[],
};

function fmtDate(s?: string): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"});
}

function fmtPrix(n?: number): string {
  if (n == null) return "—";
  return n.toFixed(2).replace(".", ",") + "€";
}

// ── Composant fiche client ──────────────────────────────────
function FicheClient({
  clientId, onBack,
}: { clientId: string; onBack: () => void }) {
  const [client,    setClient]    = useState<Client|null>(null);
  const [historique,setHistorique]= useState<EntreeHistoriqueClient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState<Partial<Client>>({});
  const [onglet,    setOnglet]    = useState<"infos"|"historique"|"adresses"|"contacts">("infos");
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [showAddCont, setShowAddCont] = useState(false);
  const [newAddr, setNewAddr] = useState<Partial<Adresse>>({ type:"domicile", pays:"France" });
  const [newCont, setNewCont] = useState<Partial<Contact>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getClient(clientId), getHistoriqueClient(clientId)])
      .then(([cli, hist]) => {
        if (cli) { setClient(cli); setForm(cli); }
        setHistorique(hist);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  const sauvegarder = async () => {
    if (!form.nom?.trim() || !client) return;
    await majClient(client.id, form);
    setClient(c => c ? { ...c, ...form } as Client : null);
    setEditing(false);
  };

  const ajouterAdr = async () => {
    if (!newAddr.ligne1?.trim() || !client) return;
    await ajouterAdresse({ ...newAddr as Adresse, clientId: client.id });
    setShowAddAddr(false);
    setNewAddr({ type:"domicile", pays:"France" });
    // Recharger
    const cli = await getClient(client.id);
    if (cli) setClient(cli);
  };

  const ajouterCon = async () => {
    if (!newCont.nom?.trim() || !client) return;
    await ajouterContact({ ...newCont as Contact, clientId: client.id });
    setShowAddCont(false);
    setNewCont({});
    const cli = await getClient(client.id);
    if (cli) setClient(cli);
  };

  const montantTotal = useMemo(() =>
    historique.filter(h => h.typeEntite === "facture")
      .reduce((s, h) => s + (h.montant || 0), 0),
  [historique]);

  if (loading) return (
    <div style={{ textAlign:"center", padding:40, color:FC.creamD, fontFamily:SA }}>
      Chargement de la fiche client…
    </div>
  );
  if (!client) return (
    <div style={{ textAlign:"center", padding:40, color:FC.danger, fontFamily:SA }}>
      Client introuvable.
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={onBack}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11 }}>
          ‹ Retour
        </button>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${FC.vert}`,
              borderRadius:8, padding:"4px 12px", color:FC.vertL,
              cursor:"pointer", fontSize:11 }}>
            ✏ Modifier
          </button>
        )}
      </div>

      {/* Carte identité */}
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:FS, fontSize:18, color:"#fff", fontWeight:700 }}>
              {client.prenom ? `${client.prenom} ${client.nom}` : client.nom}
            </div>
            {client.societe && <div style={{ fontSize:11, color:FC.creamD }}>{client.societe}</div>}
            <div style={{ fontSize:10, color:FC.creamD, marginTop:2 }}>{client.reference}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
            <span style={{ fontSize:9, background:STATUT_COL[client.statut],
              color:STATUT_TXT[client.statut], borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
              {client.statut}
            </span>
            {client.businessUnits?.map(bu => (
              <span key={bu} style={{ fontSize:8, background:"rgba(255,255,255,0.07)",
                color:FC.creamD, borderRadius:3, padding:"1px 6px" }}>{bu}</span>
            ))}
          </div>
        </div>
        {/* Stats rapides */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8 }}>
          {[
            {l:"Historique",  v:String(historique.length)+" entrées", col:FC.creamD},
            {l:"CA total",    v:fmtPrix(montantTotal),                 col:FC.or},
            {l:"Depuis",      v:fmtDate(client.dateNaissance || undefined), col:FC.creamD},
          ].map(s => (
            <div key={s.l} style={{ background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"8px 10px",
              textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:700, color:s.col }}>{s.v}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {([
          ["infos","👤 Infos"],
          ["historique","📋 Historique"],
          ["adresses","📍 Adresses"],
          ["contacts","👥 Contacts"],
        ] as const).map(([id,l]) => (
          <button key={id} onClick={() => setOnglet(id)}
            style={{ flex:1, padding:"7px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, fontFamily:SA,
              background:onglet===id?FC.vert:"rgba(255,255,255,0.06)",
              color:onglet===id?"#fff":"rgba(255,255,255,0.5)" }}>{l}</button>
        ))}
      </div>

      {/* ── Infos ── */}
      {onglet==="infos" && !editing && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            ["📞", client.telephone],
            ["✉️", client.email],
            ["💬", client.whatsapp],
            ["🎂", client.dateNaissance ? fmtDate(client.dateNaissance) : undefined],
          ].filter(([,v])=>v).map(([ico,val])=>(
            <div key={ico as string} style={{ display:"flex", gap:8, padding:"8px 12px",
              background:FC.card, borderRadius:9, border:`1px solid ${FC.line}` }}>
              <span>{ico}</span>
              <span style={{ fontSize:12, color:FC.creamD }}>{val}</span>
            </div>
          ))}
          {client.notes && (
            <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:9, padding:"10px 12px", fontSize:11, color:FC.creamD,
              fontStyle:"italic" }}>{client.notes}</div>
          )}
          {client.preferences?.allergenes?.length && (
            <div style={{ background:"rgba(251,146,60,0.1)", border:"1px solid rgba(251,146,60,0.3)",
              borderRadius:9, padding:"8px 12px" }}>
              <div style={{ fontSize:10, color:"#fb923c", fontWeight:700, marginBottom:3 }}>⚠ Allergènes</div>
              <div style={{ fontSize:11, color:FC.creamD }}>{client.preferences.allergenes.join(", ")}</div>
            </div>
          )}
          {client.tags?.length && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {client.tags.map(t => (
                <span key={t} style={{ fontSize:9, background:"rgba(21,128,61,0.15)",
                  color:FC.vertL, borderRadius:4, padding:"2px 8px" }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Formulaire édition ── */}
      {onglet==="infos" && editing && (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {[
            ["Nom *",       "nom",       "text"],
            ["Prénom",      "prenom",    "text"],
            ["Société",     "societe",   "text"],
            ["Téléphone",   "telephone", "tel"],
            ["Email",       "email",     "email"],
            ["WhatsApp",    "whatsapp",  "tel"],
          ].map(([label, key, type]) => (
            <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
              <input type={type}
                value={(form[key as keyof Client] as string) || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={inp}/>
            </div>
          ))}
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Date de naissance</label>
            <input type="date" value={form.dateNaissance || ""}
              onChange={e => setForm(f => ({ ...f, dateNaissance:e.target.value }))}
              style={inp}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Notes</label>
            <textarea rows={3} value={form.notes || ""}
              onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
              style={{ ...inp, resize:"vertical" as const }}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={sauvegarder}
              style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"10px",
                color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
              ✅ Enregistrer
            </button>
            <button onClick={() => { setEditing(false); setForm(client); }}
              style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                padding:"10px", color:FC.creamD, fontSize:12, cursor:"pointer", fontFamily:SA }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Historique ── */}
      {onglet==="historique" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {historique.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:FC.creamD, fontStyle:"italic" }}>
              Aucun historique disponible pour ce client.
            </div>
          )}
          {historique.map((h, i) => (
            <div key={i} style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:10, padding:"10px 13px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:18 }}>{HISTORIQUE_ICO[h.typeEntite] || "📌"}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{h.libelle}</div>
                  {h.reference && <div style={{ fontSize:10, color:FC.creamD }}>{h.reference}</div>}
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>{fmtDate(h.dateAction)}</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                {h.montant != null && (
                  <div style={{ fontSize:13, fontWeight:700, color:FC.or }}>{fmtPrix(h.montant)}</div>
                )}
                {h.statut && <div style={{ fontSize:9, color:FC.creamD }}>{h.statut}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Adresses ── */}
      {onglet==="adresses" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {client.adresses?.map(a => (
            <div key={a.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:10, padding:"10px 13px" }}>
              <div style={{ fontSize:10, color:FC.or, fontWeight:700, marginBottom:3 }}>
                {a.type} {a.principale ? "⭐" : ""}
              </div>
              <div style={{ fontSize:12, color:"#fff" }}>{a.ligne1}</div>
              {a.ligne2 && <div style={{ fontSize:12, color:FC.creamD }}>{a.ligne2}</div>}
              <div style={{ fontSize:11, color:FC.creamD }}>
                {[a.codePostal, a.commune, a.pays].filter(Boolean).join(" — ")}
              </div>
            </div>
          ))}
          {!showAddAddr && (
            <button onClick={() => setShowAddAddr(true)}
              style={{ background:"rgba(21,128,61,0.1)", border:`1px dashed ${FC.vert}`,
                borderRadius:10, padding:"10px", color:FC.vertL, cursor:"pointer",
                fontSize:12, fontFamily:SA }}>
              + Ajouter une adresse
            </button>
          )}
          {showAddAddr && (
            <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
              {[["Ligne 1 *","ligne1"],["Ligne 2","ligne2"],["Commune","commune"],
                ["Code postal","codePostal"],["Pays","pays"]].map(([l,k])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
                  <input value={(newAddr as any)[k] || ""} onChange={e => setNewAddr(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={ajouterAdr}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:9, padding:"9px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Ajouter</button>
                <button onClick={() => setShowAddAddr(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:9,
                    padding:"9px", color:FC.creamD, fontSize:12, cursor:"pointer" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contacts ── */}
      {onglet==="contacts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {client.contacts?.map(c => (
            <div key={c.id} style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:10, padding:"10px 13px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                {c.role && <span style={{ fontSize:10, color:FC.creamD, marginLeft:8 }}>({c.role})</span>}
              </div>
              {c.telephone && <div style={{ fontSize:11, color:FC.creamD }}>📞 {c.telephone}</div>}
              {c.email     && <div style={{ fontSize:11, color:FC.creamD }}>✉️ {c.email}</div>}
            </div>
          ))}
          {!showAddCont && (
            <button onClick={() => setShowAddCont(true)}
              style={{ background:"rgba(21,128,61,0.1)", border:`1px dashed ${FC.vert}`,
                borderRadius:10, padding:"10px", color:FC.vertL, cursor:"pointer",
                fontSize:12, fontFamily:SA }}>
              + Ajouter un contact
            </button>
          )}
          {showAddCont && (
            <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
              {[["Nom *","nom"],["Prénom","prenom"],["Rôle","role"],["Téléphone","telephone"],["Email","email"]].map(([l,k])=>(
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>{l}</label>
                  <input value={(newCont as any)[k] || ""} onChange={e => setNewCont(f=>({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={ajouterCon}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:9, padding:"9px",
                    color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Ajouter</button>
                <button onClick={() => setShowAddCont(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:9,
                    padding:"9px", color:FC.creamD, fontSize:12, cursor:"pointer" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Composant liste clients ─────────────────────────────────
const FORM_CLIENT0: Omit<Client, "id"> = { nom:"", statut:"actif", businessUnits:[] };

export default function ClientCenter() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [source,   setSource]   = useState<"supabase"|"local">("local");
  const [search,   setSearch]   = useState("");
  const [filtreBU, setFiltreBU] = useState<BusinessUnit|"tous">("tous");
  const [detail,   setDetail]   = useState<string|null>(null);  // clientId
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState<Omit<Client,"id">>(FORM_CLIENT0);
  const [saving,   setSaving]   = useState(false);

  // Chargement initial
  useEffect(() => {
    getClients({ statut:"actif" })
      .then(rows => {
        if (rows.length) { setClients(rows); setSource("supabase"); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const visibles = useMemo(() => clients.filter(c => {
    if (filtreBU !== "tous" && !c.businessUnits?.includes(filtreBU)) return false;
    if (search && !`${c.nom} ${c.prenom||""} ${c.email||""} ${c.telephone||""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [clients, search, filtreBU]);

  const creer = useCallback(async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    const nv = await creerClient(form);
    if (nv) {
      setClients(cs => [nv, ...cs]);
    } else {
      // Fallback local si Supabase indisponible
      const local: Client = { ...form, id:"cli_"+Date.now().toString().slice(-6), statut:"actif" };
      setClients(cs => [local, ...cs]);
    }
    setModal(false); setForm(FORM_CLIENT0); setSaving(false);
  }, [form]);

  if (detail) return <FicheClient clientId={detail} onBack={() => setDetail(null)}/>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>CRM Bellaïa</div>
          <div style={{ fontSize:10, color:source==="supabase"?FC.vertL:"rgba(255,255,255,0.3)" }}>
            {source==="supabase" ? "✅ Connecté" : "📦 Local"} · {clients.length} client{clients.length>1?"s":""}
          </div>
        </div>
        <button onClick={() => { setForm(FORM_CLIENT0); setModal(true); }}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouveau client
        </button>
      </div>

      {/* Recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Nom, email, téléphone…"
        style={{ ...inp, padding:"9px 13px", fontSize:13 }}/>

      {/* Filtres BU */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {(["tous",...BU_LIST] as const).map(bu => (
          <button key={bu} onClick={() => setFiltreBU(bu as any)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtreBU===bu?FC.vert:"rgba(255,255,255,0.06)",
              color:filtreBU===bu?"#fff":"rgba(255,255,255,0.5)" }}>
            {bu}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading && <div style={{ textAlign:"center", padding:"24px", color:FC.creamD }}>Chargement…</div>}

      {!loading && clients.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px", color:FC.creamD, fontStyle:"italic" }}>
          Aucun client. Créez le premier avec "+ Nouveau client".
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {visibles.map(c => (
          <div key={c.id} onClick={() => setDetail(c.id)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </div>
                <div style={{ fontSize:10, color:FC.creamD }}>
                  {c.telephone || c.email || c.reference || ""}
                </div>
              </div>
              <div style={{ display:"flex", gap:4, alignItems:"flex-start" }}>
                <span style={{ fontSize:9, background:STATUT_COL[c.statut],
                  color:STATUT_TXT[c.statut], borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                  {c.statut}
                </span>
              </div>
            </div>
            {c.tags?.length ? (
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {c.tags.slice(0,3).map(t => (
                  <span key={t} style={{ fontSize:8, background:"rgba(21,128,61,0.12)",
                    color:FC.vertL, borderRadius:3, padding:"1px 5px" }}>{t}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Modal création */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Nouveau client</div>
              <button onClick={() => setModal(false)}
                style={{ background:"none", border:"none", color:FC.creamD, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[
                ["Nom *",     "nom",       "text"],
                ["Prénom",    "prenom",    "text"],
                ["Société",   "societe",   "text"],
                ["Téléphone", "telephone", "tel"],
                ["Email",     "email",     "email"],
                ["WhatsApp",  "whatsapp",  "tel"],
              ].map(([label, key, type]) => (
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>{label}</label>
                  <input type={type}
                    value={(form[key as keyof typeof form] as string) || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Modules concernés</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {BU_LIST.map(bu => {
                    const sel = form.businessUnits?.includes(bu);
                    return (
                      <button key={bu} type="button" onClick={() => setForm(f => ({
                        ...f, businessUnits: sel
                          ? (f.businessUnits||[]).filter(x=>x!==bu)
                          : [...(f.businessUnits||[]), bu],
                      }))}
                        style={{ fontSize:10, padding:"4px 10px", borderRadius:99, cursor:"pointer",
                          border:`1px solid ${sel?FC.vert:"rgba(255,255,255,0.15)"}`,
                          background:sel?"rgba(21,128,61,0.15)":"transparent",
                          color:sel?FC.vertL:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                        {bu}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={creer} disabled={saving}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"11px",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                    fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving ? "…" : "✅ Créer le client"}
                </button>
                <button onClick={() => setModal(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"11px", color:FC.creamD, fontSize:13, cursor:"pointer", fontFamily:SA }}>
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
