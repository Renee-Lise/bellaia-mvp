// ═══════════════════════════════════════════════════════════
// EventsPortail — Portail suivi client + TimelineSuivi + estimation
// src/modules/events/EventsPortail.tsx
// Phase 2 — autonome, sans dépendance aux globals de BellaiaApp.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { DevisClientView } from "./EventsDevis";
import type { LigneDevis, EtapeSuivi, EventsDemande } from "./eventsTypes";
import { ETAPES_SUIVI } from "./eventsConsts";
import { normaliserStatut } from "./eventsUtils";

// ── Couleurs autonomes ─────────────────────────────────────
const EV = {
  or:     "#10b981",
  orL:    "#34d399",
  creme:  "#e8f5ee",
  cremeD: "#a8d5be",
  line:   "rgba(16,185,129,0.25)",
  verre:  "rgba(16,185,129,0.06)",
  night:  "#0a1410",
};
const C = {
  warning:"#c9a96e", danger:"#f87171", muted:"rgba(255,255,255,0.45)",
  card:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.1)",
};
const FS = "Georgia, 'Times New Roman', serif";
const SA = "system-ui, sans-serif";

// ── Formatage date FR ──────────────────────────────────────
const fmt24 = (s?: string) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})
    +" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
};

// ══════════════════════════════════════════════════════════
// LignesDevisAuto — estimation automatique visible côté client
// ══════════════════════════════════════════════════════════
export function LignesDevisAuto({ lignes }: { lignes: LigneDevis[] }) {
  if (!lignes?.length) return null;
  const totalAuto = lignes
    .filter(l => l.statut==="automatique" && l.total)
    .reduce((s,l)=>s+(l.total||0),0);

  const COL_STATUT: Record<string,string> = {
    automatique:"rgba(16,185,129,0.12)",
    a_completer:"rgba(201,168,76,0.12)",
    suggestion:"rgba(124,58,237,0.12)",
  };
  const TXT_STATUT: Record<string,string> = {
    automatique:EV.or, a_completer:C.warning, suggestion:"#a78bfa",
  };
  const LBL_STATUT: Record<string,string> = {
    automatique:"Auto", a_completer:"À compléter", suggestion:"Suggestion",
  };

  return (
    <div style={{ background:"rgba(16,185,129,0.05)", border:"1px solid "+EV.line,
      borderRadius:13, padding:"14px", marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:EV.or, letterSpacing:1 }}>✦ ESTIMATION AUTOMATIQUE</div>
        <div style={{ fontSize:9, color:EV.cremeD }}>Prix de référence catalogue Bellaïa</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {lignes.map((l,i) => (
          <div key={l.id+"_"+i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            background:COL_STATUT[l.statut]||"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px 10px" }}>
            <div style={{ flex:1, marginRight:8 }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                <span style={{ fontSize:8, background:"rgba(6,95,70,0.3)", color:EV.or,
                  borderRadius:3, padding:"1px 5px", fontWeight:700 }}>{l.pole}</span>
                <span style={{ fontSize:8, background:COL_STATUT[l.statut],
                  color:TXT_STATUT[l.statut], borderRadius:3, padding:"1px 5px", fontWeight:700 }}>
                  {LBL_STATUT[l.statut]}
                </span>
              </div>
              <div style={{ fontSize:12, color:EV.creme, fontWeight:500 }}>{l.libelle}</div>
              {l.qte>1 && <div style={{ fontSize:10, color:EV.cremeD }}>× {l.qte}</div>}
              {l.note && <div style={{ fontSize:10, color:EV.cremeD, fontStyle:"italic", marginTop:2 }}>{l.note}</div>}
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              {l.total
                ? <div style={{ fontSize:13, fontWeight:700, color:EV.or }}>{l.total}€</div>
                : <div style={{ fontSize:11, color:C.warning }}>À compléter</div>}
            </div>
          </div>
        ))}
      </div>
      {totalAuto>0 && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid "+EV.line,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:EV.cremeD }}>Total estimé (prix catalogue)</div>
          <div style={{ fontSize:16, fontWeight:700, color:EV.or, fontFamily:FS }}>{totalAuto}€</div>
        </div>
      )}
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:8, lineHeight:1.5 }}>
        Estimation indicative. La fondatrice confirmera le devis final.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TimelineSuivi — fil de suivi des étapes de la demande
// ══════════════════════════════════════════════════════════
export function TimelineSuivi({ statutBrut, style }: { statutBrut?: string; style?: React.CSSProperties }) {
  const statutNorm = normaliserStatut(statutBrut || "nouvelle_demande");
  const idxActuel  = ETAPES_SUIVI.findIndex(e => e.statut === statutNorm);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, ...style }}>
      {ETAPES_SUIVI.map((e,i) => {
        const passe   = i <= idxActuel;
        const actuel  = i === idxActuel;
        const dernier = i === ETAPES_SUIVI.length-1;
        return (
          <div key={e.statut} style={{ display:"flex", alignItems:"stretch", gap:12 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:28, flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:13,
                background: passe?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.05)",
                border:"2px solid "+(actuel?"#10b981":passe?"rgba(16,185,129,0.5)":"rgba(255,255,255,0.1)"),
                boxShadow: actuel?"0 0 8px rgba(16,185,129,0.5)":"none" }}>
                {passe ? e.ico : "⚪"}
              </div>
              {!dernier && (
                <div style={{ flex:1, width:2, margin:"3px 0",
                  background: passe?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.07)" }}/>
              )}
            </div>
            <div style={{ paddingBottom:dernier?0:16, paddingTop:4 }}>
              <div style={{ fontSize:12, fontWeight:actuel?700:500, lineHeight:1.4,
                color: passe?"#10b981":actuel?"#34d399":"rgba(255,255,255,0.3)" }}>
                {e.label}
              </div>
              {actuel && (
                <div style={{ fontSize:9, color:"rgba(16,185,129,0.6)", marginTop:2, letterSpacing:1 }}>
                  EN COURS
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PortailSuiviClient — portail "Suivre ma demande"
// ══════════════════════════════════════════════════════════
export function PortailSuiviClient({ onBack }: { onBack: () => void }) {
  const [vue,        setVue]        = useState<"sections"|"recherche">("sections");
  const [ref,        setRef]        = useState("");
  const [dossier,    setDossier]    = useState<EventsDemande|null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur,     setErreur]     = useState("");
  const [section,    setSection]    = useState<string>("demandes");
  const [listeDossiers, setListeDossiers] = useState<EventsDemande[]>([]);
  const [chargList,  setChargList]  = useState(false);

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const sbGet = async (params: string) => {
    const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
    const r = await fetch(SB_URL+"/rest/v1/events_demandes?"+params+"&order=created_at.desc&limit=50", {
      headers:{ apikey:SB_KEY, Authorization:"Bearer "+token, "Content-Type":"application/json" }
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  };

  const sbPatch = async (id: string, data: object) => {
    const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
    await fetch(SB_URL+"/rest/v1/events_demandes?id=eq."+id, {
      method:"PATCH",
      headers:{ apikey:SB_KEY, Authorization:"Bearer "+token, "Content-Type":"application/json" },
      body: JSON.stringify(data),
    });
  };

  const chargerSection = async (sec: string) => {
    setSection(sec); setChargList(true); setListeDossiers([]);
    const filtres: Record<string,string> = {
      demandes:   "statut=in.(nouvelle_demande,a_traiter,a_modifier)",
      devis:      "statut=in.(devis_en_preparation,devis_envoye)",
      commandes:  "statut=in.(accepte,Converti en commande,converti_en_commande)",
      factures:   "numero_facture=not.is.null",
      paiements:  "statut_paiement=not.eq.non_paye",
      evenements: "date_souhaitee=not.is.null",
    };
    const rows = await sbGet(filtres[sec] || "");
    setListeDossiers(rows);
    setChargList(false);
  };

  const rechercher = async () => {
    if (!ref.trim()) return;
    setChargement(true); setErreur(""); setDossier(null);
    const rows = await sbGet("reference=eq."+encodeURIComponent(ref.trim())+"&select=*&limit=1");
    if (!rows?.length) setErreur("Aucune demande trouvée pour la référence "+ref.trim()+".");
    else setDossier(rows[0]);
    setChargement(false);
  };

  const onAccepte = async () => {
    if (!dossier) return;
    await sbPatch(dossier.id, {
      statut:"accepte", client_reponse:"accepte",
      client_reponse_at:new Date().toISOString(),
    });
    setDossier(d => d ? {...d, statut:"accepte", client_reponse:"accepte"} : null);

    // ── Créer automatiquement la facture FAC- dans le ERP central ──
    try {
      const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const token   = await (window as any).getTokenAsync?.() ?? SB_KEY;
      const montant = dossier.montant_estime || 0;
      const acompte = dossier.montant_acompte || Math.round(montant * 0.3 * 100) / 100;
      const facRef  = "FAC-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      const payload = {
        reference:     facRef,
        business_unit: "EVENTS",
        commande_id:   dossier.id,
        source_table:  "events_demandes",
        client_nom:    (dossier.client_prenom || "") + " " + (dossier.client_nom || ""),
        client_tel:    dossier.client_tel,
        client_email:  dossier.client_email,
        lignes:        JSON.stringify([{
          libelle:     dossier.prestation || dossier.type_evenement || "Prestation Events",
          qte:         1, unite:"prestation",
          prixUnitaire:montant, total:montant,
        }]),
        sous_total:    montant,
        total_ttc:     montant,
        acompte,
        solde:         Math.round((montant - acompte) * 100) / 100,
        statut:        "emise",
        date_emission: new Date().toISOString().split("T")[0],
      };
      await fetch(SB_URL + "/rest/v1/bellaia_factures", {
        method:"POST",
        headers:{
          apikey:SB_KEY, Authorization:"Bearer "+token,
          "Content-Type":"application/json", Prefer:"return=minimal",
        },
        body: JSON.stringify(payload),
      });
      // Lier la référence facture au dossier
      await sbPatch(dossier.id, { liaison_comptable: facRef });
    } catch { /* silencieux — ne bloque pas l'acceptation */ }
  };

  const onRefuse = async () => {
    if (!dossier) return;
    await sbPatch(dossier.id, {
      statut:"refuse", client_reponse:"refuse",
      client_reponse_at:new Date().toISOString(),
    });
    setDossier(d => d ? {...d, statut:"refuse", client_reponse:"refuse"} : null);
  };

  const onDemandeModif = async (msg: string) => {
    if (!dossier) return;
    await sbPatch(dossier.id, {
      statut:"a_modifier",
      fondatrice_notes:(dossier.fondatrice_notes||"")+"[Demande modif "+new Date().toLocaleString("fr-FR")+"]: "+msg+"\n",
    });
    setDossier(d => d ? {...d, statut:"a_modifier"} : null);
  };

  const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  const SECTIONS_PORTAIL = [
    {id:"demandes",   ico:"📋", label:"Mes demandes"},
    {id:"devis",      ico:"📄", label:"Mes devis"},
    {id:"commandes",  ico:"✅", label:"Mes commandes"},
    {id:"factures",   ico:"🧾", label:"Mes factures"},
    {id:"paiements",  ico:"💳", label:"Mes paiements"},
    {id:"evenements", ico:"🎉", label:"Mes événements"},
  ];

  const STATUT_COL: Record<string,string> = {
    nouvelle_demande:"rgba(201,168,76,0.2)", a_traiter:"rgba(124,58,237,0.2)",
    devis_envoye:"rgba(59,130,246,0.2)", accepte:"rgba(16,185,129,0.2)",
    refuse:"rgba(248,113,113,0.15)", a_modifier:"rgba(251,146,60,0.2)",
  };
  const STATUT_TXT: Record<string,string> = {
    nouvelle_demande:"#c9a96e", a_traiter:"#a78bfa", devis_envoye:"#60a5fa",
    accepte:"#10b981", refuse:"#f87171", a_modifier:"#fb923c",
  };

  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",
      display:"flex", flexDirection:"column", fontFamily:SA, color:EV.creme }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid "+EV.line,
        display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(0,0,0,0.3)" }}>
        <div style={{ fontFamily:FS, fontSize:14, color:EV.or }}>✨ Mon espace Bella'Events</div>
        <button onClick={onBack}
          style={{ background:"none", border:"1px solid "+EV.line, borderRadius:8,
            padding:"4px 10px", color:EV.cremeD, cursor:"pointer", fontSize:10, fontFamily:SA }}>
          ‹ Retour
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* Toggle vue */}
        <div style={{ display:"flex", gap:5, marginBottom:16 }}>
          {([["sections","📂 Mes dossiers"],["recherche","🔍 Suivi par référence"]] as const).map(([id,l])=>(
            <button key={id} onClick={()=>{ setVue(id); if(id==="sections") chargerSection("demandes"); }}
              style={{ flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:11, fontWeight:700, fontFamily:SA,
                background:vue===id?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.05)",
                color:vue===id?EV.or:EV.cremeD }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Vue sections ── */}
        {vue==="sections" && !dossier && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Navigation sections */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {SECTIONS_PORTAIL.map(s=>(
                <button key={s.id} onClick={()=>chargerSection(s.id)}
                  style={{ background:section===s.id?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.04)",
                    border:"1px solid "+(section===s.id?EV.or:"rgba(255,255,255,0.1)"),
                    borderRadius:12, padding:"12px 10px", cursor:"pointer",
                    textAlign:"center" as const, fontFamily:SA }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{s.ico}</div>
                  <div style={{ fontSize:11, fontWeight:700,
                    color:section===s.id?EV.or:"rgba(255,255,255,0.7)" }}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* Liste des dossiers de la section */}
            {chargList && <div style={{ textAlign:"center", padding:"20px", color:EV.cremeD }}>Chargement…</div>}
            {!chargList && listeDossiers.length===0 && (
              <div style={{ textAlign:"center", padding:"20px", color:EV.cremeD, fontSize:12, fontStyle:"italic" }}>
                Aucun dossier dans cette section.
              </div>
            )}
            {!chargList && listeDossiers.map(d=>(
              <div key={d.id} onClick={()=>setDossier(d)}
                style={{ background:"rgba(16,185,129,0.06)", border:"1px solid "+EV.line,
                  borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:EV.creme }}>
                    {d.client_prenom} {d.client_nom}
                  </div>
                  <span style={{ fontSize:9, background:STATUT_COL[d.statut]||"rgba(255,255,255,0.05)",
                    color:STATUT_TXT[d.statut]||EV.cremeD, borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
                    {d.statut}
                  </span>
                </div>
                <div style={{ fontSize:10, color:EV.cremeD }}>
                  {d.reference} · {d.prestation||d.type_evenement||"—"}
                </div>
                {d.montant_estime&&<div style={{ fontSize:12, fontWeight:700, color:EV.or, marginTop:3 }}>
                  {d.montant_estime}€
                </div>}
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>
                  {fmtDate(d.created_at?.split("T")[0])}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Vue dossier détaillé (depuis sections ou recherche) ── */}
        {dossier && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <button onClick={()=>setDossier(null)}
              style={{ alignSelf:"flex-start", background:"none",
                border:"1px solid "+EV.line, borderRadius:8,
                padding:"4px 10px", color:EV.cremeD, cursor:"pointer", fontSize:10, fontFamily:SA }}>
              ‹ {vue==="sections"?"Mes dossiers":"Recherche"}
            </button>

            {/* Carte identité */}
            <div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid "+EV.line,
              borderRadius:14, padding:"16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, color:EV.cremeD, marginBottom:2 }}>Référence</div>
                  <div style={{ fontSize:16, fontWeight:700, color:EV.or, fontFamily:FS }}>
                    {dossier.reference}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:EV.cremeD, marginBottom:2 }}>Créée le</div>
                  <div style={{ fontSize:11, color:EV.cremeD }}>{fmtDate(dossier.created_at?.split("T")[0])}</div>
                </div>
              </div>
              <div style={{ borderTop:"1px solid "+EV.line, paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                {dossier.client_prenom&&<div style={{ fontSize:12, color:EV.creme }}>
                  <span style={{ color:EV.cremeD }}>Client · </span>{dossier.client_prenom} {dossier.client_nom||""}
                </div>}
                {dossier.prestation&&<div style={{ fontSize:12, color:EV.creme }}>
                  <span style={{ color:EV.cremeD }}>Projet · </span>{dossier.prestation}
                </div>}
                {dossier.type_evenement&&<div style={{ fontSize:12, color:EV.creme }}>
                  <span style={{ color:EV.cremeD }}>Type · </span>{dossier.type_evenement}
                </div>}
                {dossier.date_souhaitee&&<div style={{ fontSize:12, color:EV.creme }}>
                  <span style={{ color:EV.cremeD }}>Date souhaitée · </span>
                  {new Date(dossier.date_souhaitee).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}
                </div>}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background:C.card, border:"1px solid "+EV.line, borderRadius:14, padding:"16px" }}>
              <div style={{ fontSize:11, color:EV.cremeD, marginBottom:10, fontWeight:700, letterSpacing:1 }}>
                SUIVI DE VOTRE DEMANDE
              </div>
              <TimelineSuivi statutBrut={dossier.statut}/>
            </div>

            {/* Devis client si disponible */}
            {(dossier.statut==="devis_envoye"||dossier.statut==="accepte"||
              dossier.statut==="refuse"||dossier.statut==="a_modifier"||
              !!(dossier.lignes_devis&&dossier.montant_estime)) && (
              <DevisClientView
                dossier={dossier}
                onAccepte={onAccepte}
                onRefuse={onRefuse}
                onDemandeModif={onDemandeModif}
              />
            )}

            {/* Historique */}
            <div style={{ background:C.card, border:"1px solid "+EV.line, borderRadius:14, padding:"16px" }}>
              <div style={{ fontSize:11, color:EV.cremeD, marginBottom:10, fontWeight:700, letterSpacing:1 }}>
                HISTORIQUE
              </div>
              <div style={{ display:"flex", gap:10, paddingLeft:4 }}>
                <div style={{ width:2, background:"rgba(16,185,129,0.2)", borderRadius:2 }}/>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                  {dossier.created_at&&<div>
                    <div style={{ fontSize:10, color:EV.cremeD }}>{fmtDate(dossier.created_at?.split("T")[0])}</div>
                    <div style={{ fontSize:12, color:EV.creme, marginTop:1 }}>Demande créée</div>
                  </div>}
                  {dossier.devis_genere_at&&<div>
                    <div style={{ fontSize:10, color:EV.cremeD }}>{fmtDate(dossier.devis_genere_at?.split("T")[0])}</div>
                    <div style={{ fontSize:12, color:EV.creme, marginTop:1 }}>Devis généré</div>
                  </div>}
                  {dossier.devis_envoye_at&&<div>
                    <div style={{ fontSize:10, color:EV.cremeD }}>{fmtDate(dossier.devis_envoye_at?.split("T")[0])}</div>
                    <div style={{ fontSize:12, color:EV.creme, marginTop:1 }}>Devis envoyé</div>
                  </div>}
                  {dossier.client_reponse_at&&<div>
                    <div style={{ fontSize:10, color:EV.cremeD }}>{fmtDate(dossier.client_reponse_at?.split("T")[0])}</div>
                    <div style={{ fontSize:12, color:dossier.client_reponse==="accepte"?EV.or:C.danger, marginTop:1 }}>
                      Client a {dossier.client_reponse==="accepte"?"accepté":"refusé"} le devis
                    </div>
                  </div>}
                  {dossier.acompte_paye&&<div>
                    <div style={{ fontSize:12, color:EV.or, marginTop:1 }}>✓ Acompte reçu</div>
                  </div>}
                </div>
              </div>
            </div>

            {/* Contact */}
            <button onClick={()=>window.open(
              "https://wa.me/?text="+encodeURIComponent("Bonjour, ma référence est "+(dossier.reference||"")+" et je souhaite des informations sur mon dossier."),"_blank"
            )}
              style={{ width:"100%", background:"rgba(37,211,102,0.12)",
                border:"1px solid rgba(37,211,102,0.3)", borderRadius:10, padding:"12px",
                color:"#25d366", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
              💬 Contacter Bella'Events
            </button>
          </div>
        )}

        {/* ── Vue recherche par référence ── */}
        {vue==="recherche" && !dossier && (
          <div>
            <div style={{ fontFamily:FS, fontSize:18, color:EV.or, marginBottom:6 }}>
              Retrouvez votre dossier
            </div>
            <div style={{ fontSize:12, color:EV.cremeD, marginBottom:16, lineHeight:1.6 }}>
              Saisissez la référence reçue après l'envoi de votre demande.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={ref} onChange={e=>setRef(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==="Enter"&&rechercher()}
                placeholder="BE-2026-XXXXXX"
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid "+EV.line,
                  borderRadius:10, padding:"11px 14px", color:EV.creme, fontSize:14,
                  fontFamily:SA, outline:"none", letterSpacing:1 }}/>
              <button onClick={rechercher} disabled={chargement}
                style={{ background:EV.or, border:"none", borderRadius:10,
                  padding:"11px 18px", color:"#062b1d", fontWeight:700, fontSize:13,
                  cursor:"pointer", fontFamily:SA, opacity:chargement?0.6:1 }}>
                {chargement?"…":"Rechercher"}
              </button>
            </div>
            {erreur&&<div style={{ fontSize:12, color:C.danger, marginTop:8 }}>{erreur}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default PortailSuiviClient;
