// ═══════════════════════════════════════════════════════════
// EventsDemandesF — Onglet Demandes côté fondatrice
// src/modules/events/EventsDemandesF.tsx
// Phase 2 — imports explicites + workflow devis complet
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { ModalGenerationDevis, DevisClientView, buildDevisHTML } from "./EventsDevis";
import { analyserDemandeClient } from "./eventsUtils";
import { EVENTS_CATEGORIES } from "./eventsConsts";
import type { EventsDemande, LigneDevis } from "./eventsTypes";
import { creerFacture } from "../core/coreApi";

// ── Couleurs autonomes (sans dépendance à BellaiaApp.tsx) ──
const C = {
  or:     "#c9a96e",
  gold:   "#c9a96e",
  cream:  "#f0e6d3",
  creamD: "rgba(240,230,211,0.6)",
  success:"#10b981",
  danger: "#f87171",
  warning:"#c9a96e",
  violetL:"#a78bfa",
  muted:  "rgba(255,255,255,0.45)",
  mutedL: "rgba(255,255,255,0.25)",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.1)",
  surface:"rgba(255,255,255,0.06)",
};
const EV = { or:"#10b981", line:"rgba(16,185,129,0.25)" };
const FS = "Georgia, 'Times New Roman', serif";
const SA = "system-ui, sans-serif";

// ── Helpers UI autonomes ───────────────────────────────────
const fmt = (s: string) => s ? new Date(s).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"}) : "";

const Btn = ({ onClick, children, v="default", sm=false, full=false, disabled=false }: any) => {
  const styles: Record<string, React.CSSProperties> = {
    gold:    { background:C.or, color:"#2d1a00", border:"none" },
    ghost:   { background:"transparent", color:C.muted, border:"1px solid "+C.border },
    danger:  { background:"rgba(248,113,113,0.15)", color:C.danger, border:"1px solid rgba(248,113,113,0.35)" },
    success: { background:"rgba(16,185,129,0.15)", color:C.success, border:"1px solid rgba(16,185,129,0.35)" },
    default: { background:C.surface, color:C.cream, border:"1px solid "+C.border },
    events:  { background:"#065f46", color:"#fff", border:"none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...(styles[v]||styles.default), borderRadius:9,
        padding: sm ? "5px 10px" : "9px 16px",
        width: full ? "100%" : undefined,
        fontSize: sm ? 10 : 12, fontWeight:700, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily:SA, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
};

const Fld = ({ label, children }: any) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    <label style={{ fontSize:10, color:C.muted, fontFamily:SA }}>{label}</label>
    {children}
  </div>
);

const Inp = ({ value, onChange, placeholder="", type="text", ...rest }: any) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} {...rest}
    style={{ background:C.surface, border:"1px solid "+C.border, borderRadius:8,
      padding:"8px 10px", color:"#fff", fontSize:12, fontFamily:SA, outline:"none",
      width:"100%", boxSizing:"border-box" as const }} />
);

const Sel = ({ value, onChange, options }: any) => (
  <select value={value} onChange={onChange}
    style={{ background:"#1a1a2e", border:"1px solid "+C.border, borderRadius:8,
      padding:"8px 10px", color:"#fff", fontSize:12, fontFamily:SA, outline:"none",
      width:"100%", boxSizing:"border-box" as const }}>
    {options.map((o: any) => typeof o === "string"
      ? <option key={o} value={o}>{o}</option>
      : <option key={o.value} value={o.value}>{o.label}</option>
    )}
  </select>
);

const Mdl = ({ title, onClose, children }: any) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000,
    display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
    <div style={{ background:"#111827", border:"1px solid "+C.border, borderRadius:16,
      padding:20, maxWidth:520, margin:"auto", width:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{title}</div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{children}</div>
    </div>
  </div>
);

// ── Badges de statut ───────────────────────────────────────
const STATUT_COL: Record<string, string> = {
  nouvelle_demande: "rgba(201,168,76,0.2)", a_traiter: "rgba(124,58,237,0.2)",
  devis_en_preparation: "rgba(59,130,246,0.15)", devis_envoye: "rgba(59,130,246,0.2)",
  accepte: "rgba(16,185,129,0.2)", refuse: "rgba(248,113,113,0.15)",
  converti_en_commande: "rgba(80,180,120,0.2)", a_modifier: "rgba(251,146,60,0.15)",
  // legacy text statuts
  "Nouvelle demande": "rgba(201,168,76,0.2)", "À traiter": "rgba(124,58,237,0.2)",
  "Devis envoyé": "rgba(59,130,246,0.2)", "Accepté": "rgba(16,185,129,0.2)",
  "Refusé": "rgba(248,113,113,0.15)", "Converti en commande": "rgba(80,180,120,0.2)",
};
const STATUT_TXT: Record<string, string> = {
  nouvelle_demande: C.warning, a_traiter: C.violetL,
  devis_en_preparation: "#60a5fa", devis_envoye: "#3b82f6",
  accepte: C.success, refuse: C.danger,
  converti_en_commande: C.success, a_modifier: "#fb923c",
  "Nouvelle demande": C.warning, "À traiter": C.violetL,
  "Devis envoyé": "#3b82f6", "Accepté": C.success,
  "Refusé": C.danger, "Converti en commande": C.success,
};
const STATUTS_EV = [
  "nouvelle_demande","a_traiter","devis_en_preparation",
  "devis_envoye","accepte","refuse","a_modifier","Converti en commande",
];

// ── LignesDevisAuto (autonome) ─────────────────────────────
function LignesDevisAutoF({ lignes }: { lignes: LigneDevis[] }) {
  if (!lignes?.length) return null;
  const total = lignes.filter(l => l.statut==="automatique" && l.total).reduce((s,l)=>s+(l.total||0),0);
  return (
    <div style={{ background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.2)",
      borderRadius:10, padding:"10px 12px", marginTop:8 }}>
      <div style={{ fontSize:10, fontWeight:700, color:EV.or, marginBottom:8, letterSpacing:1 }}>
        ✦ ESTIMATION AUTOMATIQUE
      </div>
      {lignes.map((l,i) => (
        <div key={l.id+"_"+i} style={{ display:"flex", justifyContent:"space-between",
          padding:"4px 0", borderBottom:"1px solid rgba(16,185,129,0.08)" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>{l.libelle}</div>
          <div style={{ fontSize:11, fontWeight:700,
            color: l.total ? EV.or : C.warning }}>
            {l.total ? l.total+"€" : "À compléter"}
          </div>
        </div>
      ))}
      {total > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6,
          paddingTop:6, borderTop:"1px solid rgba(16,185,129,0.2)" }}>
          <span style={{ fontSize:11, color:C.muted }}>Total estimé</span>
          <span style={{ fontSize:14, fontWeight:700, color:EV.or }}>{total}€</span>
        </div>
      )}
    </div>
  );
}

// ── Bloc d'actions fondatrice ──────────────────────────────
function BlocActionsFondatrice({
  c, onGenerer, onEnvoyer, onVoir, onConvertir,
}: {
  c: EventsDemande;
  onGenerer: () => void;
  onEnvoyer: () => void;
  onVoir:    () => void;
  onConvertir: () => void;
}) {
  const aDevis  = !!(c.numero_devis || c.lignes_devis);
  const envoye  = c.statut === "devis_envoye";
  const accepte = c.statut === "accepte" || c.client_reponse === "accepte";
  const refuse  = c.statut === "refuse"  || c.client_reponse === "refuse";
  const converti= c.statut === "Converti en commande" || c.statut === "converti_en_commande";

  if (converti) return (
    <div style={{ marginTop:8, fontSize:11, color:C.success, fontStyle:"italic" }}>
      ✅ Convertie en commande
    </div>
  );

  // Devis accepté par le client — conversion en attente
  if (accepte && !converti) return (
    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)",
        borderRadius:10, padding:"9px 12px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.success, marginBottom:3 }}>
          ✅ Devis accepté par le client
        </div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>
          La commande peut être créée automatiquement.
        </div>
      </div>
      <button onClick={onConvertir}
        style={{ width:"100%", background:"rgba(16,185,129,0.2)",
          border:"1px solid "+C.success, borderRadius:9, padding:"10px",
          color:C.success, fontWeight:700, fontSize:13,
          cursor:"pointer", fontFamily:SA }}>
        🚀 Créer la commande automatiquement
      </button>
      <div style={{ display:"flex", gap:6 }}>
        {aDevis && (
          <button onClick={onVoir}
            style={{ flex:1, background:"transparent",
              border:"1px solid rgba(255,255,255,0.12)", borderRadius:9,
              padding:"7px", color:C.muted, fontSize:11, cursor:"pointer", fontFamily:SA }}>
            👁 Voir le devis
          </button>
        )}
        <button onClick={onGenerer}
          style={{ flex:1, background:"transparent",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:9,
            padding:"7px", color:C.mutedL, fontSize:10, cursor:"pointer", fontFamily:SA }}>
          ✏ Modifier le devis
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
      {/* Ligne principale */}
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={onGenerer}
          style={{ flex:1, background:"#065f46", border:"none", borderRadius:9,
            padding:"9px 0", color:"#fff", fontWeight:700, fontSize:12,
            cursor:"pointer", fontFamily:SA }}>
          {aDevis ? "✏ Modifier le devis" : "📄 Générer le devis"}
        </button>
        {aDevis && !envoye && !accepte && !refuse && (
          <button onClick={onEnvoyer}
            style={{ flex:1, background:"rgba(59,130,246,0.15)",
              border:"1px solid rgba(59,130,246,0.4)", borderRadius:9,
              padding:"9px 0", color:"#60a5fa", fontWeight:700, fontSize:12,
              cursor:"pointer", fontFamily:SA }}>
            📤 Envoyer
          </button>
        )}
        {aDevis && (
          <button onClick={onVoir}
            style={{ background:"transparent", border:"1px solid "+C.border,
              borderRadius:9, padding:"9px 12px", color:C.muted, fontSize:11,
              cursor:"pointer", fontFamily:SA }}>
            👁
          </button>
        )}
      </div>
      {/* Convertir — seulement si accepté */}
      {accepte && (
        <button onClick={onConvertir}
          style={{ width:"100%", background:"rgba(16,185,129,0.15)",
            border:"1px solid #10b981", borderRadius:9, padding:"9px",
            color:C.success, fontWeight:700, fontSize:12,
            cursor:"pointer", fontFamily:SA }}>
          🚀 Convertir en commande
        </button>
      )}
      {/* Convertir sans devis — option secondaire si non encore accepté */}
      {!accepte && !refuse && (
        <button onClick={onConvertir}
          style={{ width:"100%", background:"transparent",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:9,
            padding:"7px", color:C.mutedL, fontSize:10,
            cursor:"pointer", fontFamily:SA }}>
          → Convertir sans devis
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export function BellaEventsF({ user }: any) {
  const [ong,            setOng]            = useState("demandes");
  const [modalDevis,     setModalDevis]     = useState(false);
  const [formDevis,      setFormDevis]      = useState<any>({});
  const [modalDevisGen,  setModalDevisGen]  = useState<EventsDemande|null>(null);
  const [modalVoir,      setModalVoir]      = useState<EventsDemande|null>(null);
  const [modalEnvoyer,   setModalEnvoyer]   = useState<EventsDemande|null>(null);
  const [modalConflit,   setModalConflit]   = useState<any>(null);
  const [demandesEvents, setDemandesEvents] = useState<EventsDemande[]>([]);
  const [lDem,           setLDem]           = useState(true);
  const [erreurDem,      setErreurDem]      = useState<string|null>(null);

  // ── Lecture des demandes depuis Supabase (helpers globaux) ─
  const rDem = useCallback(async () => {
    setLDem(true); setErreurDem(null);
    try {
      const token = await (window as any).getTokenAsync?.() ?? "";
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const r = await fetch(SB_URL+"/rest/v1/events_demandes?select=*&order=created_at.desc&limit=100", {
        headers: { apikey:SB_KEY, Authorization:"Bearer "+token, "Content-Type":"application/json" },
      });
      if (!r.ok) {
        setErreurDem("Erreur "+r.status+" — vérifiez la connexion Supabase.");
        setDemandesEvents([]);
      } else {
        const rows = await r.json();
        setDemandesEvents(Array.isArray(rows) ? rows : []);
      }
    } catch (e) {
      setErreurDem("Connexion impossible. Réessayez.");
      setDemandesEvents([]);
    }
    setLDem(false);
  }, []);

  useEffect(() => { rDem(); }, [rDem]);

  // ── Patch Supabase ─────────────────────────────────────────
  const sbPatchLocal = async (id: string, data: object) => {
    const token = await (window as any).getTokenAsync?.() ?? "";
    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const r = await fetch(SB_URL+"/rest/v1/events_demandes?id=eq."+id, {
      method:"PATCH",
      headers:{ apikey:SB_KEY, Authorization:"Bearer "+token, "Content-Type":"application/json" },
      body: JSON.stringify(data),
    });
    return { ok: r.ok };
  };

  const changerStatut = async (d: EventsDemande, statut: string) => {
    await sbPatchLocal(d.id, { statut, updated_at:new Date().toISOString() });
    rDem();
  };

  // ── Envoyer le devis par WhatsApp ─────────────────────────
  const envoyerDevisWhatsApp = async (d: EventsDemande) => {
    const tel = (d.client_tel||"").replace(/\D/g,"");
    const url = "https://bellaia-11-azure.vercel.app";
    const msg = [
      "Bonjour "+(d.client_prenom||"")+" 👋",
      "",
      "Votre devis Bella'Events est prêt !",
      "",
      "Référence : "+(d.reference||d.id),
      d.numero_devis ? "N° Devis : "+d.numero_devis : "",
      d.montant_estime ? "Montant : "+d.montant_estime+"€" : "",
      d.montant_acompte ? "Acompte (30%) : "+d.montant_acompte+"€" : "",
      "",
      "Suivez votre dossier ici : "+url,
      "",
      "Cordialement,",
      "Bella'Events ✨",
    ].filter(s=>s!==null).join("\n");

    // Mettre à jour le statut
    await sbPatchLocal(d.id, {
      statut: "devis_envoye",
      devis_envoye_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    rDem();

    // Ouvrir WhatsApp
    const waUrl = tel
      ? "https://wa.me/"+tel+"?text="+encodeURIComponent(msg)
      : "https://wa.me/?text="+encodeURIComponent(msg);
    window.open(waUrl, "_blank");
    setModalEnvoyer(null);
  };

  // ── Voir devis (window.print) ──────────────────────────────
  const voirDevisPDF = (d: EventsDemande) => {
    let lignes: any[] = [];
    try {
      const raw = typeof d.lignes_devis==="string" ? JSON.parse(d.lignes_devis) : d.lignes_devis;
      lignes = Array.isArray(raw) ? raw : [];
    } catch {}
    const total   = d.montant_estime   || 0;
    const acompte = d.montant_acompte  || Math.round(total*0.3);
    const solde   = d.montant_solde    || (total-acompte);
    const html = buildDevisHTML({
      demande:d, numDevis:d.numero_devis||d.reference||d.id,
      lignes, totalHT:total, acompte, solde, acomptePct:30,
      conditions:"Devis valable 30 jours. Acompte de 30% requis à la confirmation de la commande.",
    });
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(), 400);
  };

  // ── Convertir en commande (automatique si devis accepté) ──
  const convertirEnCommande = async (d: EventsDemande) => {
    // 1. Patcher le statut de la demande
    await sbPatchLocal(d.id, {
      statut: "Converti en commande",
      updated_at: new Date().toISOString(),
    });

    // 2. Créer la commande dans events_commandes via sbPost global si disponible
    try {
      const token = await (window as any).getTokenAsync?.() ?? "";
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const cmdPayload = {
        reference:       await genRefLocal("BEC"),
        statut:          "Devis accepté",
        client_prenom:   d.client_prenom,
        client_nom:      d.client_nom,
        client_tel:      d.client_tel,
        client_email:    d.client_email,
        prestation:      d.prestation,
        categorie:       d.categorie,
        type_evenement:  d.type_evenement,
        date_souhaitee:  d.date_souhaitee,
        nb_invites:      d.nb_invites,
        montant_estime:  d.montant_estime,
        montant_acompte: d.montant_acompte,
        montant_solde:   d.montant_solde,
        numero_devis:    d.numero_devis,
        source_demande:  d.id,
        created_at:      new Date().toISOString(),
      };
      await fetch(SB_URL + "/rest/v1/events_commandes", {
        method: "POST",
        headers: { apikey:SB_KEY, Authorization:"Bearer "+token,
          "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify(cmdPayload),
      });
    } catch { /* non bloquant */ }

    // 3. Notification fondatrice
    try {
      const notifPayload = {
        pole: "EVENTS",
        type_notification: "confirmation_commande",
        titre: "Commande créée — " + (d.reference || d.id),
        message: "Le devis " + (d.numero_devis||"") + " a été accepté par le client.\n"
          + "Client : " + (d.client_prenom||"") + " " + (d.client_nom||"") + "\n"
          + "Montant : " + (d.montant_estime||0) + "€",
        canal: "interne",
        statut: "a_envoyer",
        source_table: "events_demandes",
        source_id: d.id,
        created_at: new Date().toISOString(),
      };
      const token = await (window as any).getTokenAsync?.() ?? "";
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      await fetch(SB_URL + "/rest/v1/notifications", {
        method:"POST",
        headers:{ apikey:SB_KEY, Authorization:"Bearer "+token,
          "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify(notifPayload),
      });
    } catch { /* non bloquant */ }

    // 4. Créer la facture FAC- dans bellaïa_factures (ERP central)
    try {
      const lignesDevis: any[] = d.lignes_devis
        ? (typeof d.lignes_devis === "string" ? JSON.parse(d.lignes_devis) : d.lignes_devis)
        : [];
      const lignesFacture = lignesDevis.length > 0
        ? lignesDevis.map((l: any) => ({
            libelle:      l.libelle || l.categorie || "Prestation Events",
            qte:          l.qte || 1,
            unite:        l.unite || "prestation",
            prixUnitaire: l.prixUnitaire ?? l.prix ?? 0,
            total:        l.total ?? (l.prixUnitaire ?? 0) * (l.qte ?? 1),
            sourceModule: "EVENTS" as const,
          }))
        : [{
            libelle:      d.prestation || "Prestation Bella'Events",
            qte:          1,
            unite:        "prestation",
            prixUnitaire: d.montant_estime || 0,
            total:        d.montant_estime || 0,
            sourceModule: "EVENTS" as const,
          }];
      await creerFacture({
        bu:          "EVENTS",
        commandeId:  d.id,
        sourceTable: "events_demandes",
        clientNom:   (d.client_prenom || "") + " " + (d.client_nom || "").trim(),
        clientTel:   d.client_tel,
        clientEmail: d.client_email,
        lignes:      lignesFacture,
        acomptePct:  30,
        notes:       "Facture générée automatiquement depuis devis " + (d.numero_devis || d.reference || ""),
      });
    } catch { /* non bloquant — la conversion ne dépend pas de la facturation */ }

    rDem();
  };

  // Génère une référence locale simple si genererReference global absent
  const genRefLocal = async (prefix: string) => {
    try {
      const token = await (window as any).getTokenAsync?.() ?? "";
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const r = await fetch(SB_URL + "/rest/v1/rpc/prochaine_reference", {
        method: "POST",
        headers: { apikey:SB_KEY, Authorization:"Bearer "+token, "Content-Type":"application/json" },
        body: JSON.stringify({ prefixe: prefix }),
      });
      if (r.ok) { const d = await r.json(); return d || prefix+"-"+Date.now().toString().slice(-6); }
    } catch {}
    return prefix + "-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
  };

  const nbNouvelles = demandesEvents.filter(c =>
    c.statut==="nouvelle_demande" || c.statut==="Nouvelle demande"
  ).length;

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(6,95,70,0.3),rgba(16,185,129,0.1))",
        border:"1px solid rgba(6,95,70,0.4)", borderRadius:16, padding:"14px 16px", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:4 }}>✨</div>
        <div style={{ fontFamily:FS, fontSize:17, fontWeight:900, color:"#fff", marginBottom:2 }}>Bella'Events</div>
        <div style={{ fontSize:11, color:C.muted }}>Papeterie · Décoration · Location · Coordination légère</div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5, overflowX:"auto" }}>
        {[
          ["demandes","📋 Demandes"+(nbNouvelles>0?" ("+nbNouvelles+")":"")],
          ["catalogue","🛍 Catalogue"],["commandes","📦 Commandes"],["documents","📄 Documents"],
        ].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)}
            style={{ padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, fontFamily:SA, flexShrink:0,
              background: ong===id?"#065f46":C.card,
              color: ong===id?"#fff":C.muted }}>{l}</button>
        ))}
      </div>

      {/* ── Onglet Demandes ── */}
      {ong==="demandes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>
              Demandes ({demandesEvents.length})
            </div>
            <Btn sm v="gold" onClick={()=>{ setFormDevis({statut:"a_traiter"}); setModalDevis(true); }}>
              + Créer un devis
            </Btn>
          </div>

          {lDem && <div style={{ textAlign:"center", padding:"20px", color:C.muted, fontSize:12 }}>Chargement…</div>}
          {!lDem && erreurDem && (
            <div style={{ background:"rgba(180,80,80,0.12)", border:"1px solid rgba(180,80,80,0.35)",
              borderRadius:12, padding:"14px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:C.danger, fontWeight:700, marginBottom:6 }}>⚠ {erreurDem}</div>
              <Btn sm v="ghost" onClick={rDem}>Réessayer</Btn>
            </div>
          )}
          {!lDem && !erreurDem && demandesEvents.length===0 && (
            <div style={{ textAlign:"center", padding:"24px", color:C.muted, fontSize:13 }}>
              Aucune demande reçue pour le moment
            </div>
          )}

          {!lDem && !erreurDem && demandesEvents.map(c=>{
            const lignesEstimees = analyserDemandeClient({
              prestation:c.prestation, message:c.message, theme:c.theme,
              couleurs:c.couleurs, nbInvites:c.nb_invites,
              typeEvt:c.type_evenement, budget:c.budget,
            });
            return (
              <div key={c.id} style={{ background:C.card, border:"1px solid "+C.border,
                borderRadius:13, padding:"14px" }}>
                {/* En-tête demande */}
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <span style={{ fontSize:10, color:C.gold, fontWeight:700 }}>
                      {c.reference || c.id}
                    </span>
                    {c.numero_devis && (
                      <span style={{ fontSize:9, color:"#60a5fa" }}>
                        Devis {c.numero_devis}
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <span style={{
                      background:STATUT_COL[c.statut]||"rgba(255,255,255,0.05)",
                      color:STATUT_TXT[c.statut]||C.muted,
                      fontSize:9, fontWeight:700, borderRadius:4, padding:"2px 7px" }}>
                      {c.statut}
                    </span>
                    <span style={{ fontSize:10, color:C.muted }}>
                      {c.created_at ? fmt(c.created_at.split("T")[0]) : ""}
                    </span>
                  </div>
                </div>

                {/* Client */}
                <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:2 }}>
                  {c.client_prenom} {c.client_nom}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>
                  {c.prestation}{c.categorie?" · "+c.categorie:""}{c.prix?" · "+c.prix:""}
                </div>
                {c.client_tel   && <div style={{ fontSize:10, color:C.muted }}>📞 {c.client_tel}</div>}
                {c.client_email && <div style={{ fontSize:10, color:C.muted }}>✉️ {c.client_email}</div>}
                {(c.date_souhaitee||c.heure_souhaitee) && (
                  <div style={{ fontSize:10, color:C.muted }}>
                    📅 {c.date_souhaitee?fmt(c.date_souhaitee):"À définir"}
                    {c.heure_souhaitee?" à "+c.heure_souhaitee:""}
                  </div>
                )}
                {c.type_evenement && (
                  <div style={{ fontSize:10, color:C.muted }}>
                    🎉 {c.type_evenement}{c.nb_invites?" · "+c.nb_invites+" invités":""}
                  </div>
                )}
                {c.theme   && <div style={{ fontSize:10, color:C.muted }}>🎨 {c.theme}</div>}
                {c.budget  && <div style={{ fontSize:10, color:C.muted }}>💰 Budget : {c.budget}€</div>}
                {c.message && (
                  <div style={{ fontSize:10, color:C.muted, marginTop:4, fontStyle:"italic" }}>
                    "{c.message}"
                  </div>
                )}

                {/* Montants si devis généré */}
                {c.montant_estime && c.montant_estime > 0 && (
                  <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
                    {[
                      ["Total",   c.montant_estime+"€",  C.gold],
                      ["Acompte", (c.montant_acompte||Math.round(c.montant_estime*0.3))+"€", C.warning],
                      ["Solde",   (c.montant_solde||(c.montant_estime-(c.montant_acompte||Math.round(c.montant_estime*0.3))))+"€", C.muted],
                    ].map(([lbl,val,col])=>(
                      <div key={lbl as string} style={{ background:"rgba(255,255,255,0.04)",
                        borderRadius:6, padding:"4px 8px" }}>
                        <div style={{ fontSize:9, color:C.muted }}>{lbl}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:col as string }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sélecteur de statut rapide */}
                <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
                  {STATUTS_EV.map(s=>(
                    <button key={s} onClick={()=>changerStatut(c,s)}
                      style={{ fontSize:8, padding:"2px 6px", borderRadius:4, cursor:"pointer",
                        border:"1px solid "+(s===c.statut?"#10b981":"rgba(255,255,255,0.1)"),
                        background:s===c.statut?"rgba(16,185,129,0.15)":"transparent",
                        color:s===c.statut?"#10b981":C.muted, fontFamily:SA }}>
                      {s.replace("_"," ")}
                    </button>
                  ))}
                </div>

                {/* Estimation automatique */}
                {lignesEstimees.length > 0 && (
                  <LignesDevisAutoF lignes={lignesEstimees as any}/>
                )}

                {/* Bloc d'actions fondatrice */}
                <BlocActionsFondatrice
                  c={c}
                  onGenerer={()=>setModalDevisGen(c)}
                  onEnvoyer={()=>setModalEnvoyer(c)}
                  onVoir={()=>voirDevisPDF(c)}
                  onConvertir={()=>convertirEnCommande(c)}
                />
              </div>
            );
          })}
        </div>
      )}

      {ong==="catalogue" && (
        <div style={{ textAlign:"center", padding:"20px", color:C.muted }}>
          Catalogue — voir BellaEventsCatalogue
        </div>
      )}
      {ong==="commandes" && (
        <div style={{ textAlign:"center", padding:"20px", color:C.muted }}>
          Commandes — voir BellaEventsCommandes
        </div>
      )}
      {ong==="documents" && (
        <div style={{ textAlign:"center", padding:"20px", color:C.muted }}>
          Documents — voir BellaEventsDocuments
        </div>
      )}

      {/* ── Modale génération / édition devis ── */}
      {modalDevisGen && (
        <ModalGenerationDevis
          demande={modalDevisGen}
          onClose={()=>setModalDevisGen(null)}
          onValide={(numDevis)=>{
            setModalDevisGen(null);
            rDem();
          }}
        />
      )}

      {/* ── Modale envoi WhatsApp ── */}
      {modalEnvoyer && (
        <Mdl title="Envoyer le devis" onClose={()=>setModalEnvoyer(null)}>
          <div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.25)",
            borderRadius:10, padding:"12px 14px", fontSize:12, color:"rgba(255,255,255,0.8)", lineHeight:1.7 }}>
            <strong style={{ color:"#fff" }}>
              {modalEnvoyer.client_prenom} {modalEnvoyer.client_nom}
            </strong><br/>
            Dévis {modalEnvoyer.numero_devis||"(non numéroté)"}<br/>
            {modalEnvoyer.montant_estime ? "Montant : "+modalEnvoyer.montant_estime+"€" : "Montant : non défini"}<br/>
            Tél : {modalEnvoyer.client_tel||"non renseigné"}
          </div>
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px dashed rgba(255,255,255,0.15)",
            borderRadius:10, padding:"10px 12px", fontSize:11, color:C.muted }}>
            📧 E-mail automatique — SMTP non configuré
          </div>
          <Btn v="success" full onClick={()=>envoyerDevisWhatsApp(modalEnvoyer)}>
            💬 Envoyer par WhatsApp
          </Btn>
          <Btn v="ghost" onClick={()=>setModalEnvoyer(null)}>Annuler</Btn>
        </Mdl>
      )}

      {/* ── Modale création devis interne ── */}
      {modalDevis && (
        <Mdl title="Créer un devis" onClose={()=>{setModalDevis(false);setFormDevis({});}}>
          <Fld label="Client *">
            <Inp value={formDevis.client||""} onChange={(e:any)=>setFormDevis({...formDevis,client:e.target.value})} placeholder="Nom du client"/>
          </Fld>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fld label="Téléphone *">
              <Inp value={formDevis.tel||""} onChange={(e:any)=>setFormDevis({...formDevis,tel:e.target.value})} placeholder="+594..."/>
            </Fld>
            <Fld label="Email">
              <Inp type="email" value={formDevis.email||""} onChange={(e:any)=>setFormDevis({...formDevis,email:e.target.value})} placeholder="email@..."/>
            </Fld>
          </div>
          <Fld label="Prestation">
            <Inp value={formDevis.prestation||""} onChange={(e:any)=>setFormDevis({...formDevis,prestation:e.target.value})} placeholder="Nom de la prestation"/>
          </Fld>
          <Fld label="Catégorie">
            <Sel value={formDevis.categorie||""} onChange={(e:any)=>setFormDevis({...formDevis,categorie:e.target.value})}
              options={[{value:"",label:"—"}, ...EVENTS_CATEGORIES.map(c=>({value:c.id,label:c.nom}))]}/>
          </Fld>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fld label="Date">
              <Inp type="date" value={formDevis.date||""} onChange={(e:any)=>setFormDevis({...formDevis,date:e.target.value})}/>
            </Fld>
            <Fld label="Nb invités">
              <Inp type="number" value={formDevis.invites||""} onChange={(e:any)=>setFormDevis({...formDevis,invites:e.target.value})}/>
            </Fld>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fld label="Montant (€)">
              <Inp type="number" value={formDevis.montant||""} onChange={(e:any)=>setFormDevis({...formDevis,montant:e.target.value})}/>
            </Fld>
            <Fld label="Acompte (€)">
              <Inp type="number" value={formDevis.acompte||""} onChange={(e:any)=>setFormDevis({...formDevis,acompte:e.target.value})}/>
            </Fld>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="gold" full onClick={()=>{
              // Création via Supabase directement depuis le formulaire
              alert("Fonctionnalité : créer la demande via sbPost depuis eventsApi.ts — à connecter en Phase 2.");
              setModalDevis(false); setFormDevis({});
            }}>Créer le devis</Btn>
            <Btn v="ghost" onClick={()=>{setModalDevis(false);setFormDevis({});}}>Annuler</Btn>
          </div>
        </Mdl>
      )}

      {/* ── Modale conflit planning ── */}
      {modalConflit && (
        <Mdl title="⚠ Conflit de planning détecté" onClose={()=>setModalConflit(null)}>
          <div style={{ background:"rgba(180,80,80,0.12)", border:"1px solid rgba(180,80,80,0.35)",
            borderRadius:12, padding:"12px 14px", marginBottom:6 }}>
            <div style={{ fontSize:12, color:C.danger, fontWeight:700, marginBottom:6 }}>
              Ce créneau chevauche une activité existante.
            </div>
            {modalConflit.conflits?.map((c:any) => (
              <div key={c.id} style={{ fontSize:11, color:"rgba(255,200,200,0.8)", marginBottom:4 }}>
                <strong>{c.titre}</strong> ({c.pole})
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="ghost" full onClick={()=>setModalConflit(null)}>Choisir une autre date</Btn>
          </div>
        </Mdl>
      )}
    </div>
  );
}

export default BellaEventsF;
