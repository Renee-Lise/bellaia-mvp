// ═══════════════════════════════════════════════════════════
// ClientCenter.tsx — CRM Central Bellaïa LOT VII
// Liste clients · Fiche complète · Historique · Adresses
// src/modules/crm/ClientCenter.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type {
  Client, StatutClient, Adresse, ContactLie, EntreeHistorique,
} from "./crmTypes";
import {
  nomComplet, fmtDate, fmtPrix, initiales, estAnniversaire,
  calculerAge, STATUT_COULEURS, MODULE_LABELS, rechercherClientsLocal,
} from "./crmUtils";
import {
  getClients, getClient, creerClient, majClient,
  ajouterAdresse, ajouterContact, getHistoriqueClient,
} from "./crmApi";

// ── Design tokens locaux (pas de dépendance sur core/) ─────
const SA  = "system-ui, -apple-system, sans-serif";
const FS  = "Georgia, 'Times New Roman', serif";
const CLR = {
  vert:   "#15803d", vertL:"#22c55e",
  or:     "#c9a96e", creamD:"rgba(245,240,232,0.6)",
  card:   "rgba(255,255,255,0.04)", line:"rgba(255,255,255,0.1)",
  danger: "#f87171", warn:"#fb923c", info:"#60a5fa",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const MODULES = ["FOOD","EVENTS","BSH","ODYSSEE","STRUCTURE","GENERAL"];

const HIST_ICO: Record<string, string> = {
  devis_events:"📄", commande_food:"🍰", facture:"🧾",
  paiement:"💳", evenement:"🎉", prestation:"✨",
  achat:"🛒", document:"📁", communication:"💬", note:"📝",
};

const ONGLETS = [
  {id:"infos",      ico:"👤", label:"Infos"},
  {id:"historique", ico:"📋", label:"Historique"},
  {id:"adresses",   ico:"📍", label:"Adresses"},
  {id:"contacts",   ico:"👥", label:"Contacts"},
  {id:"preferences",ico:"⚙",  label:"Préférences"},
] as const;

type Onglet = typeof ONGLETS[number]["id"];

// ══════════════════════════════════════════════════════════
// COMPOSANT : Fiche client détaillée
// ══════════════════════════════════════════════════════════
function FicheClient({
  clientId,
  onBack,
}: {
  clientId: string;
  onBack: () => void;
}) {
  const [client,     setClient]     = useState<Client | null>(null);
  const [historique, setHistorique] = useState<EntreeHistorique[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [onglet,     setOnglet]     = useState<Onglet>("infos");
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState<Partial<Client>>({});
  const [saving,     setSaving]     = useState(false);
  // Ajout adresse
  const [showAddr,   setShowAddr]   = useState(false);
  const [newAddr,    setNewAddr]    = useState<Partial<Adresse>>({ type:"domicile", pays:"France" });
  // Ajout contact
  const [showCont,   setShowCont]   = useState(false);
  const [newCont,    setNewCont]    = useState<Partial<ContactLie>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getClient(clientId), getHistoriqueClient(clientId)])
      .then(([cli, hist]) => {
        if (cli) { setClient(cli); setForm({ ...cli }); }
        setHistorique(hist);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  const sauvegarder = useCallback(async () => {
    if (!form.nom?.trim() || !client) return;
    setSaving(true);
    await majClient(client.id, form);
    setClient(c => c ? { ...c, ...form } as Client : null);
    setEditing(false);
    setSaving(false);
  }, [client, form]);

  const validerAdresse = useCallback(async () => {
    if (!newAddr.ligne1?.trim() || !client) return;
    await ajouterAdresse({ ...newAddr as Adresse, clientId: client.id });
    setShowAddr(false);
    setNewAddr({ type:"domicile", pays:"France" });
    // Recharger
    const cli = await getClient(client.id);
    if (cli) setClient(cli);
  }, [client, newAddr]);

  const validerContact = useCallback(async () => {
    if (!newCont.nom?.trim() || !client) return;
    await ajouterContact({ ...newCont as ContactLie, clientId: client.id });
    setShowCont(false);
    setNewCont({});
    const cli = await getClient(client.id);
    if (cli) setClient(cli);
  }, [client, newCont]);

  const caTotal = useMemo(() =>
    historique.filter(h => h.typeEntite === "facture")
      .reduce((s, h) => s + (h.montant || 0), 0),
  [historique]);

  const anniv = client?.dateNaissance ? estAnniversaire(client.dateNaissance) : false;

  if (loading) return (
    <div style={{ textAlign:"center", padding:40, color:CLR.creamD, fontFamily:SA }}>
      Chargement de la fiche…
    </div>
  );
  if (!client) return (
    <div style={{ textAlign:"center", padding:40, color:CLR.danger, fontFamily:SA }}>
      Client introuvable.
    </div>
  );

  const statCol = STATUT_COULEURS[client.statut];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:SA }}>
      {/* Barre actions */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onBack}
          style={{ background:"none", border:`1px solid ${CLR.line}`, borderRadius:8,
            padding:"4px 12px", color:CLR.creamD, cursor:"pointer", fontSize:11 }}>
          ‹ Retour
        </button>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${CLR.vert}`,
              borderRadius:8, padding:"4px 12px", color:CLR.vertL,
              cursor:"pointer", fontSize:11 }}>
            ✏ Modifier
          </button>
        )}
        {client.whatsapp || client.telephone ? (
          <button onClick={() => window.open(
            "https://wa.me/" + (client.whatsapp||client.telephone||"").replace(/\D/g,""), "_blank"
          )}
            style={{ background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
              borderRadius:8, padding:"4px 12px", color:"#25d366",
              cursor:"pointer", fontSize:11, marginLeft:"auto" }}>
            💬 WhatsApp
          </button>
        ) : null}
      </div>

      {/* Carte identité */}
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${CLR.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
          {/* Avatar initiales */}
          <div style={{ width:48, height:48, borderRadius:"50%", flexShrink:0,
            background:statCol.bg, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:700, color:statCol.txt }}>
            {anniv ? "🎂" : initiales(client)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FS, fontSize:16, color:"#fff", fontWeight:700 }}>
              {nomComplet(client)}
              {anniv && <span style={{ marginLeft:8, fontSize:12 }}>🎂 Anniversaire aujourd'hui !</span>}
            </div>
            {client.societe && (
              <div style={{ fontSize:11, color:CLR.creamD, marginTop:1 }}>{client.societe}</div>
            )}
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:1 }}>
              {client.reference}
            </div>
          </div>
          <span style={{ fontSize:9, background:statCol.bg, color:statCol.txt,
            borderRadius:4, padding:"2px 8px", fontWeight:700, flexShrink:0 }}>
            {client.statut}
          </span>
        </div>

        {/* Stats rapides */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
          {[
            {l:"Historique",  v: historique.length + " action" + (historique.length>1?"s":"")},
            {l:"CA total",    v: fmtPrix(caTotal),    col:CLR.or},
            {l:"Âge",         v: client.dateNaissance
              ? (calculerAge(client.dateNaissance) + " ans")
              : "—"},
          ].map(s => (
            <div key={s.l} style={{ background:"rgba(0,0,0,0.2)", borderRadius:8,
              padding:"7px 9px", textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:700, color:(s as any).col || "#fff" }}>{s.v}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Modules actifs */}
        {client.modulesActifs?.length ? (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
            {client.modulesActifs.map(m => (
              <span key={m} style={{ fontSize:9, background:"rgba(255,255,255,0.07)",
                color:CLR.creamD, borderRadius:4, padding:"2px 7px" }}>
                {MODULE_LABELS[m] || m}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Onglets navigation */}
      <div style={{ display:"flex", gap:5 }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            style={{ flex:1, padding:"7px 4px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:onglet===o.id?CLR.vert:"rgba(255,255,255,0.06)",
              color:onglet===o.id?"#fff":"rgba(255,255,255,0.5)",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:14 }}>{o.ico}</span>
            {o.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Infos ── */}
      {onglet === "infos" && !editing && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            {ico:"📞", val:client.telephone},
            {ico:"💬", val:client.whatsapp && client.whatsapp !== client.telephone ? client.whatsapp : undefined},
            {ico:"✉️", val:client.email},
            {ico:"🎂", val:client.dateNaissance ? fmtDate(client.dateNaissance) : undefined},
          ].filter(r => r.val).map(r => (
            <div key={r.ico} style={{ display:"flex", gap:10, padding:"9px 12px",
              background:CLR.card, border:`1px solid ${CLR.line}`, borderRadius:9 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{r.ico}</span>
              <span style={{ fontSize:12, color:CLR.creamD, alignSelf:"center" }}>{r.val}</span>
            </div>
          ))}
          {client.notes && (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:9, padding:"10px 12px", fontSize:11,
              color:CLR.creamD, fontStyle:"italic", lineHeight:1.6 }}>
              {client.notes}
            </div>
          )}
          {client.allergies?.length ? (
            <div style={{ background:"rgba(251,146,60,0.1)",
              border:"1px solid rgba(251,146,60,0.3)", borderRadius:9, padding:"9px 12px" }}>
              <div style={{ fontSize:10, color:CLR.warn, fontWeight:700, marginBottom:3 }}>
                ⚠ Allergies / contraintes
              </div>
              <div style={{ fontSize:11, color:CLR.creamD }}>{client.allergies.join(", ")}</div>
            </div>
          ) : null}
          {client.tags?.length ? (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {client.tags.map(t => (
                <span key={t} style={{ fontSize:9, background:"rgba(21,128,61,0.15)",
                  color:CLR.vertL, borderRadius:4, padding:"2px 8px" }}>{t}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Onglet Infos — édition ── */}
      {onglet === "infos" && editing && (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {[
            ["Nom *",         "nom",            "text"],
            ["Prénom",        "prenom",          "text"],
            ["Société",       "societe",         "text"],
            ["Téléphone",     "telephone",       "tel"],
            ["WhatsApp",      "whatsapp",        "tel"],
            ["Email",         "email",           "email"],
          ].map(([label, key, type]) => (
            <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <label style={{ fontSize:10, color:CLR.creamD }}>{label}</label>
              <input type={type}
                value={(form[key as keyof Client] as string) || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={inp}/>
            </div>
          ))}
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:CLR.creamD }}>Date de naissance</label>
            <input type="date" value={form.dateNaissance || ""}
              onChange={e => setForm(f => ({ ...f, dateNaissance: e.target.value }))}
              style={inp}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:CLR.creamD }}>Notes</label>
            <textarea rows={3} value={form.notes || ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ ...inp, resize:"vertical" as const }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, color:CLR.creamD }}>Statut</label>
            <select value={form.statut || "actif"}
              onChange={e => setForm(f => ({ ...f, statut: e.target.value as StatutClient }))}
              style={{ ...inp, background:"#1a1a2e" }}>
              {(["actif","inactif","prospect","vip","archive"] as StatutClient[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={sauvegarder} disabled={saving}
              style={{ flex:1, background:CLR.vert, border:"none", borderRadius:10, padding:"10px",
                color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer",
                fontFamily:SA, opacity:saving ? 0.6 : 1 }}>
              {saving ? "…" : "✅ Enregistrer"}
            </button>
            <button onClick={() => { setEditing(false); setForm({ ...client }); }}
              style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                padding:"10px", color:CLR.creamD, fontSize:12, cursor:"pointer", fontFamily:SA }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Onglet Historique ── */}
      {onglet === "historique" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {historique.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CLR.creamD, fontStyle:"italic" }}>
              Aucun historique pour ce client.
            </div>
          )}
          {historique.map((h, i) => (
            <div key={i} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"10px 13px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{HIST_ICO[h.typeEntite] || "📌"}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{h.libelle}</div>
                  {h.reference && (
                    <div style={{ fontSize:10, color:CLR.creamD }}>{h.reference}</div>
                  )}
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>
                    {fmtDate(h.dateAction)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                {h.montant != null && (
                  <div style={{ fontSize:13, fontWeight:700, color:CLR.or }}>
                    {fmtPrix(h.montant)}
                  </div>
                )}
                {h.statut && (
                  <div style={{ fontSize:9, color:CLR.creamD }}>{h.statut}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet Adresses ── */}
      {onglet === "adresses" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {client.adresses?.map(a => (
            <div key={a.id} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:10, color:CLR.or, fontWeight:700, marginBottom:3 }}>
                {a.type} {a.principale ? "⭐" : ""}
              </div>
              <div style={{ fontSize:12, color:"#fff" }}>{a.ligne1}</div>
              {a.ligne2 && <div style={{ fontSize:11, color:CLR.creamD }}>{a.ligne2}</div>}
              <div style={{ fontSize:11, color:CLR.creamD }}>
                {[a.codePostal, a.commune, a.pays].filter(Boolean).join(" — ")}
              </div>
            </div>
          ))}
          {!showAddr && (
            <button onClick={() => setShowAddr(true)}
              style={{ background:"rgba(21,128,61,0.08)", border:`1px dashed ${CLR.vert}`,
                borderRadius:10, padding:"10px", color:CLR.vertL,
                cursor:"pointer", fontSize:12, fontFamily:SA }}>
              + Ajouter une adresse
            </button>
          )}
          {showAddr && (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>Type</label>
                <select value={newAddr.type || "domicile"}
                  onChange={e => setNewAddr(f => ({ ...f, type: e.target.value as any }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {["domicile","livraison","facturation","autre"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {[["Ligne 1 *","ligne1"],["Ligne 2","ligne2"],["Commune","commune"],
                ["Code postal","codePostal"],["Pays","pays"]].map(([l,k]) => (
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>{l}</label>
                  <input value={(newAddr as any)[k] || ""}
                    onChange={e => setNewAddr(f => ({ ...f, [k]: e.target.value }))}
                    style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={validerAdresse}
                  style={{ flex:1, background:CLR.vert, border:"none", borderRadius:9,
                    padding:"9px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  Ajouter
                </button>
                <button onClick={() => setShowAddr(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:9, padding:"9px", color:CLR.creamD,
                    fontSize:12, cursor:"pointer" }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Contacts ── */}
      {onglet === "contacts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {client.contacts?.map(c => (
            <div key={c.id} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                {c.role && (
                  <span style={{ fontSize:10, color:CLR.creamD, marginLeft:8, fontWeight:400 }}>
                    ({c.role})
                  </span>
                )}
              </div>
              {c.telephone && <div style={{ fontSize:11, color:CLR.creamD }}>📞 {c.telephone}</div>}
              {c.email     && <div style={{ fontSize:11, color:CLR.creamD }}>✉️ {c.email}</div>}
              {c.notes     && <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontStyle:"italic" }}>{c.notes}</div>}
            </div>
          ))}
          {!showCont && (
            <button onClick={() => setShowCont(true)}
              style={{ background:"rgba(21,128,61,0.08)", border:`1px dashed ${CLR.vert}`,
                borderRadius:10, padding:"10px", color:CLR.vertL,
                cursor:"pointer", fontSize:12, fontFamily:SA }}>
              + Ajouter un contact
            </button>
          )}
          {showCont && (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
              {[["Nom *","nom"],["Prénom","prenom"],["Rôle","role"],
                ["Téléphone","telephone"],["Email","email"],["Notes","notes"]].map(([l,k]) => (
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>{l}</label>
                  <input value={(newCont as any)[k] || ""}
                    onChange={e => setNewCont(f => ({ ...f, [k]: e.target.value }))}
                    style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={validerContact}
                  style={{ flex:1, background:CLR.vert, border:"none", borderRadius:9,
                    padding:"9px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  Ajouter
                </button>
                <button onClick={() => setShowCont(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:9, padding:"9px", color:CLR.creamD,
                    fontSize:12, cursor:"pointer" }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Préférences ── */}
      {onglet === "preferences" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {client.allergies?.length ? (
            <div style={{ background:"rgba(251,146,60,0.1)",
              border:"1px solid rgba(251,146,60,0.3)", borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:11, color:CLR.warn, fontWeight:700, marginBottom:5 }}>
                ⚠ Allergies / contraintes alimentaires
              </div>
              <div style={{ fontSize:12, color:CLR.creamD }}>{client.allergies.join(" · ")}</div>
            </div>
          ) : null}
          {client.preferences?.saveurs?.length ? (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:11, color:CLR.or, fontWeight:700, marginBottom:5 }}>
                🍓 Saveurs préférées
              </div>
              <div style={{ fontSize:12, color:CLR.creamD }}>
                {client.preferences.saveurs.join(" · ")}
              </div>
            </div>
          ) : null}
          {client.preferences?.couleurs?.length ? (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:11, color:CLR.or, fontWeight:700, marginBottom:5 }}>
                🎨 Couleurs préférées
              </div>
              <div style={{ fontSize:12, color:CLR.creamD }}>
                {client.preferences.couleurs.join(" · ")}
              </div>
            </div>
          ) : null}
          {client.preferences?.notes && (
            <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:10, padding:"11px 13px" }}>
              <div style={{ fontSize:11, color:CLR.or, fontWeight:700, marginBottom:5 }}>
                📝 Notes préférences
              </div>
              <div style={{ fontSize:12, color:CLR.creamD, lineHeight:1.6 }}>
                {client.preferences.notes}
              </div>
            </div>
          )}
          <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
            borderRadius:10, padding:"11px 13px" }}>
            <div style={{ fontSize:11, color:CLR.or, fontWeight:700, marginBottom:5 }}>
              🔒 RGPD
            </div>
            <div style={{ fontSize:12, color:client.rgpdOk ? CLR.vertL : CLR.creamD }}>
              {client.rgpdOk
                ? `✅ Consentement accordé le ${fmtDate(client.rgpdDate)}`
                : "⚠ Consentement non recueilli"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL : Liste clients
// ══════════════════════════════════════════════════════════
const FORM0: Omit<Client, "id" | "reference" | "createdAt" | "updatedAt"> = {
  nom: "", statut: "actif", rgpdOk: false, modulesActifs: [],
};

export default function ClientCenter() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [source,   setSource]   = useState<"supabase"|"local">("local");
  const [search,   setSearch]   = useState("");
  const [filtreSt, setFiltreSt] = useState<StatutClient|"tous">("tous");
  const [detail,   setDetail]   = useState<string|null>(null);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState<typeof FORM0>({ ...FORM0 });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getClients().then(res => {
      setClients(res.clients);
      setSource(res.source);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const resultats = useMemo(() => {
    const base = filtreSt === "tous"
      ? clients
      : clients.filter(c => c.statut === filtreSt);
    if (!search.trim()) return base;
    return rechercherClientsLocal(base, search).map(r => r.client);
  }, [clients, search, filtreSt]);

  const anniversairesAujourdhui = useMemo(() =>
    clients.filter(c => c.dateNaissance && estAnniversaire(c.dateNaissance)),
  [clients]);

  const creer = useCallback(async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    const nv = await creerClient(form);
    if (nv) setClients(cs => [nv, ...cs]);
    setModal(false);
    setForm({ ...FORM0 });
    setSaving(false);
  }, [form]);

  if (detail) {
    return <FicheClient clientId={detail} onBack={() => setDetail(null)}/>;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CLR.or }}>👥 CRM Bellaïa</div>
          <div style={{ fontSize:10, color:source==="supabase"?CLR.vertL:"rgba(255,255,255,0.35)" }}>
            {source==="supabase" ? "✅ Connecté" : "📦 Local"}
            {" · "}{clients.length} client{clients.length>1?"s":""}
          </div>
        </div>
        <button onClick={() => { setForm({ ...FORM0 }); setModal(true); }}
          style={{ background:CLR.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouveau client
        </button>
      </div>

      {/* Anniversaires du jour */}
      {anniversairesAujourdhui.length > 0 && (
        <div style={{ background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.3)",
          borderRadius:10, padding:"9px 12px" }}>
          <div style={{ fontSize:11, color:CLR.or, fontWeight:700, marginBottom:4 }}>
            🎂 Anniversaire{anniversairesAujourdhui.length>1?"s":""} aujourd'hui
          </div>
          {anniversairesAujourdhui.map(c => (
            <div key={c.id} style={{ fontSize:12, color:CLR.creamD }}>
              {nomComplet(c)}
              {c.dateNaissance ? ` — ${calculerAge(c.dateNaissance)} ans` : ""}
            </div>
          ))}
        </div>
      )}

      {/* Recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Nom, téléphone, email, référence…"
        style={{ ...inp, padding:"9px 13px", fontSize:13 }}/>

      {/* Filtres statut */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {(["tous","actif","prospect","vip","inactif","archive"] as const).map(s => {
          const col = s !== "tous" ? STATUT_COULEURS[s] : null;
          return (
            <button key={s} onClick={() => setFiltreSt(s as any)}
              style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
                background:filtreSt===s?(s==="tous"?CLR.vert:(col?.bg||"rgba(255,255,255,0.1)")):"rgba(255,255,255,0.06)",
                color:filtreSt===s?(s==="tous"?"#fff":(col?.txt||"#fff")):"rgba(255,255,255,0.5)" }}>
              {s}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading && (
        <div style={{ textAlign:"center", padding:"28px", color:CLR.creamD }}>Chargement…</div>
      )}
      {!loading && clients.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px", color:CLR.creamD, fontStyle:"italic" }}>
          Aucun client. Commencez par créer le premier.
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {resultats.map(c => {
          const col    = STATUT_COULEURS[c.statut];
          const anniv  = c.dateNaissance && estAnniversaire(c.dateNaissance);
          return (
            <div key={c.id} onClick={() => setDetail(c.id)}
              style={{ background:CLR.card,
                border:`1px solid ${anniv?"rgba(201,168,76,0.4)":CLR.line}`,
                borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:col.bg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, fontWeight:700, color:col.txt, flexShrink:0 }}>
                    {anniv ? "🎂" : initiales(c)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
                      {nomComplet(c)}
                    </div>
                    <div style={{ fontSize:10, color:CLR.creamD }}>
                      {c.telephone || c.email || c.reference}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize:9, background:col.bg, color:col.txt,
                  borderRadius:4, padding:"2px 7px", fontWeight:700, alignSelf:"flex-start" }}>
                  {c.statut}
                </span>
              </div>
              {c.societe && (
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:46 }}>
                  {c.societe}
                </div>
              )}
              {c.tags?.length ? (
                <div style={{ display:"flex", gap:4, marginLeft:46, marginTop:4, flexWrap:"wrap" }}>
                  {c.tags.slice(0,3).map(t => (
                    <span key={t} style={{ fontSize:8, background:"rgba(21,128,61,0.12)",
                      color:CLR.vertL, borderRadius:3, padding:"1px 5px" }}>{t}</span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Modal création */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0d1117", border:`1px solid ${CLR.line}`,
            borderRadius:16, padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontFamily:FS, fontSize:15, color:"#fff" }}>Nouveau client</div>
              <button onClick={() => setModal(false)}
                style={{ background:"none", border:"none", color:CLR.creamD,
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[
                ["Nom *",       "nom",       "text"],
                ["Prénom",      "prenom",    "text"],
                ["Société",     "societe",   "text"],
                ["Téléphone",   "telephone", "tel"],
                ["WhatsApp",    "whatsapp",  "tel"],
                ["Email",       "email",     "email"],
              ].map(([label, key, type]) => (
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>{label}</label>
                  <input type={type}
                    value={(form as any)[key] || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>Modules actifs</label>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {MODULES.map(m => {
                    const sel = form.modulesActifs?.includes(m as any);
                    return (
                      <button key={m} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          modulesActifs: sel
                            ? (f.modulesActifs||[]).filter(x => x !== m)
                            : [...(f.modulesActifs||[]), m as any],
                        }))}
                        style={{ fontSize:9, padding:"3px 9px", borderRadius:99, cursor:"pointer",
                          border:`1px solid ${sel?CLR.vert:"rgba(255,255,255,0.15)"}`,
                          background:sel?"rgba(21,128,61,0.15)":"transparent",
                          color:sel?CLR.vertL:"rgba(255,255,255,0.5)", fontFamily:SA }}>
                        {MODULE_LABELS[m] || m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label style={{ display:"flex", gap:8, alignItems:"center",
                cursor:"pointer", fontSize:11, color:CLR.creamD, marginTop:4 }}>
                <input type="checkbox" checked={form.rgpdOk || false}
                  onChange={e => setForm(f => ({ ...f, rgpdOk: e.target.checked }))}
                  style={{ accentColor:CLR.vert, width:16, height:16 }}/>
                Consentement RGPD accordé
              </label>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={creer} disabled={saving}
                  style={{ flex:1, background:CLR.vert, border:"none", borderRadius:10,
                    padding:"11px", color:"#fff", fontWeight:700, fontSize:13,
                    cursor:"pointer", fontFamily:SA, opacity:saving?0.6:1 }}>
                  {saving ? "…" : "✅ Créer le client"}
                </button>
                <button onClick={() => setModal(false)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"11px", color:CLR.creamD,
                    fontSize:13, cursor:"pointer", fontFamily:SA }}>
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
