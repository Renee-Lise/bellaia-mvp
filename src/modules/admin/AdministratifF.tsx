"use client";
// ═══════════════════════════════════════════════════════════
// Administratif — espace fondatrice
// Devis, factures, acomptes, avoirs, bons (commande, achat, livraison,
// transport, envoi), bordereaux (envoi, expédition), reçus, courriers.
// • Génération automatique depuis une commande ou un devis existant,
//   conversion d'un document en un autre (devis → facture → BL…).
// • Modifier, dupliquer, convertir ; facture validée = verrouillée.
// • PDF à texte réel : télécharger / imprimer, ou partage direct
//   (feuille de partage : WhatsApp, Mail…) ; liens WhatsApp et mail.
// Table : bellaia_pieces, bellaia_emetteurs (migration 0108).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbDelete, sbRpc, SB_URL, SB_KEY, jeton, partagerFichier, telecharger, slug, uploadStorage, compresserImage } from "../events/eventsAtelierLib";
import { PIECES, defPiece, STATUTS, UNITES, calculerTotaux, totalLigne, euros, dateFr, normaliserLignes, MENTION_TVA_DEFAUT, PENALITES_DEFAUT, type Ligne, type TypePiece } from "./piecesTypes";
import { miseEnPage, pdfPiece, dessinerPage, type MiseEnPage } from "./pdfPiece";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.6)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", bleu: "#60a5fa" };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 14, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 40 };
const btn = (fort = false, couleur = C.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? couleur : C.ligne}`, background: fort ? `${couleur}22` : C.card, color: fort ? couleur : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer", whiteSpace: "nowrap" });
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", letterSpacing: 0.4 };
const BU = [["GENERAL", "Général"], ["BSH", "Bella'Secret Home"], ["EVENTS", "Bella'Even's"], ["FOOD", "Bella'Food"], ["ODYSSEE", "Bella'Odyssée"], ["VILO", "Vilo'Assistance"], ["STRUCTURE", "Bella'Structure"], ["INVEST", "BellaInvest"]];
const aujourdhui = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // heure de Cayenne
const plusJours = (d: string, n: number) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const COMPTABLES = ["facture", "facture_acompte", "avoir"];
/** Infos du pôle, complétées par celles de « Général » (même entrepreneure : SIRET, adresse, IBAN…). */
const fusionEm = (ems: any[], bu: string) => { const o: any = { ...(ems.find(e => e.bu === "GENERAL") || {}) }; Object.entries(ems.find(e => e.bu === bu) || {}).forEach(([k, v]) => { if (v !== null && v !== "" && v !== undefined) o[k] = v; }); return o; };

function messageErreur(e: any) {
  const m = String(e?.message || e);
  if (m.includes("contenu verrouillé")) return "Cette facture est validée : son contenu ne peut plus changer. Pour corriger, crée un avoir.";
  if (m.includes("suppression interdite")) return "Une facture numérotée ne peut pas être supprimée : annule-la par un avoir.";
  return m;
}

async function patchEmetteur(bu: string, patch: any) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/rest/v1/bellaia_emetteurs?bu=eq.${bu}`, { method: "PATCH", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json())[0];
}

function nouvellePiece(type: TypePiece, bu = "GENERAL", em?: any): any {
  const d = defPiece(type); const date = aujourdhui();
  return {
    type, bu, statut: "brouillon", objet: "", date_document: date,
    date_echeance: ["facture", "facture_acompte"].includes(type) ? plusJours(date, 30) : null,
    destinataire: {}, lignes: d.lignes ? [{ designation: "", qte: 1, unite: "pièce", pu: 0, tva_pct: Number(em?.tva_defaut) || 0 }] : [],
    remise_pct: 0, acompte: 0, champs: type === "devis" ? { validite: plusJours(date, 30) } : type === "bon_achat" ? { code: Math.random().toString(36).slice(2, 8).toUpperCase(), valable_jusqu: plusJours(date, 365) } : type === "courrier" ? { lieu: em?.ville || "", formule: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.", signataire: "Renée-Lise Vilosa" } : {},
    conditions: d.conditions || (["facture", "facture_acompte"].includes(type) ? em?.conditions_paiement || "" : ""), notes: "", mentions: "", historique: [],
  };
}

export default function AdministratifF() {
  const [onglet, setOnglet] = useState<"docs" | "emetteurs" | "outils">("docs");
  const [pieces, setPieces] = useState<any[]>([]);
  const [emetteurs, setEmetteurs] = useState<any[]>([]);
  const [ouverte, setOuverte] = useState<any>(null);
  const [choixType, setChoixType] = useState(false);
  const [generer, setGenerer] = useState(false);
  const [fType, setFType] = useState("tous"); const [fBu, setFBu] = useState("tous"); const [fTexte, setFTexte] = useState("");
  const [msg, setMsg] = useState(""); const [charge, setCharge] = useState(true);
  const [cle, setCle] = useState(0);
  const ouvrir = (p: any) => { setOuverte(p); setCle(c => c + 1); };

  const charger = async () => {
    try {
      const [p, e] = await Promise.all([sbSelect("bellaia_pieces", "select=*&order=date_document.desc,created_at.desc&limit=500"), sbSelect("bellaia_emetteurs", "select=*")]);
      setPieces(p); setEmetteurs(e); setMsg("");
    } catch (er: any) { setMsg("⚠️ " + messageErreur(er)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);
  const emDe = (bu: string) => fusionEm(emetteurs, bu);

  const liste = pieces.filter(p => (fType === "tous" || p.type === fType) && (fBu === "tous" || p.bu === fBu) &&
    (!fTexte.trim() || JSON.stringify([p.numero, p.objet, p.destinataire?.nom, p.destinataire?.societe]).toLowerCase().includes(fTexte.toLowerCase())));
  const aFacturer = pieces.filter(p => p.type === "devis" && p.statut === "accepte" && !pieces.some(x => x.parent_id === p.id && ["facture", "facture_acompte"].includes(x.type)));
  const impayees = pieces.filter(p => ["facture", "facture_acompte"].includes(p.type) && p.numero && !["paye", "annule"].includes(p.statut));

  if (ouverte) return <Editeur key={cle} piece={ouverte} emetteurs={emetteurs} toutes={pieces} onFermer={() => { setOuverte(null); charger(); }} onOuvrir={(p: any) => { ouvrir(p); charger(); }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA, color: C.texte }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 800, flex: "1 1 100%" }}>🧾 Administratif</div>
        <button style={btn(onglet === "docs")} onClick={() => setOnglet("docs")}>📄 Documents ({pieces.length})</button>
        <button style={btn(onglet === "emetteurs")} onClick={() => setOnglet("emetteurs")}>⚙️ Mes informations légales</button>
        <button style={btn(onglet === "outils")} onClick={() => setOnglet("outils")}>🗂 Outils & déclarations</button>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("⚠️") ? C.rouge : C.ok }}>{msg}</div>}
      {onglet === "emetteurs" && <Emetteurs emetteurs={emetteurs} setEmetteurs={setEmetteurs} />}
      {onglet === "outils" && <OutilsAdministratifs />}
      {onglet === "docs" && <>
        {emetteurs.length > 0 && !emetteurs.some(e => e.siret) && <div style={{ fontSize: 12, color: C.or, background: `${C.or}14`, border: `1px solid ${C.or}44`, borderRadius: 10, padding: 10 }}>ℹ️ Complète « Mes informations légales » (SIRET, adresse, IBAN, logo) : elles apparaissent automatiquement sur tous tes documents.</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn(true)} onClick={() => setChoixType(true)}>+ Nouveau document</button>
          <button style={btn(true, C.bleu)} onClick={() => setGenerer(true)}>✨ Générer depuis une commande / un devis</button>
        </div>
        {(aFacturer.length > 0 || impayees.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10 }}>
            {aFacturer.map(p => <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><span style={{ flex: 1 }}>✅ Devis accepté à facturer : <b>{p.numero}</b> · {p.destinataire?.nom} · {euros(p.total_ttc)}</span><button style={btn()} onClick={() => ouvrir(p)}>Ouvrir</button></div>)}
            {impayees.length > 0 && <div style={{ fontSize: 13, color: C.or }}>⏳ {impayees.length} facture(s) en attente de paiement · {euros(impayees.reduce((s, p) => s + Number(p.total_ttc) - Number(p.acompte || 0), 0))}</div>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6 }}>
          <select style={champ} value={fType} onChange={e => setFType(e.target.value)}><option value="tous">Tous les types</option>{PIECES.map(p => <option key={p.id} value={p.id}>{p.ico} {p.libelle}</option>)}</select>
          <select style={champ} value={fBu} onChange={e => setFBu(e.target.value)}><option value="tous">Tous les pôles</option>{BU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input style={champ} placeholder="Rechercher (n°, client, objet)" value={fTexte} onChange={e => setFTexte(e.target.value)} />
        </div>
        {charge && <div style={{ fontSize: 13, color: C.doux }}>Chargement…</div>}
        {!charge && liste.length === 0 && <div style={{ fontSize: 14, color: C.doux, textAlign: "center", padding: 24 }}>Aucun document. Crée-en un ou génère-le depuis une commande.</div>}
        {liste.map(p => { const d = defPiece(p.type); const s = STATUTS[p.statut] || STATUTS.brouillon; return (
          <button key={p.id} onClick={() => ouvrir(p)} style={{ textAlign: "left", background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${s[1]}`, borderRadius: 12, padding: "10px 12px", color: C.texte, cursor: "pointer", fontFamily: SA, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>{d.ico}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{d.libelle} · {p.numero || "brouillon"}</span>
              <span style={{ display: "block", fontSize: 12, color: C.doux, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dateFr(p.date_document)} · {p.destinataire?.nom || p.destinataire?.societe || "—"}{p.objet ? " · " + p.objet : ""} · {BU.find(b => b[0] === p.bu)?.[1]}</span>
            </span>
            <span style={{ textAlign: "right" }}>
              {d.prix && <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{euros(p.total_ttc)}</span>}
              <span style={{ fontSize: 11, color: s[1], fontWeight: 700 }}>{s[0]}</span>
            </span>
          </button>); })}
      </>}

      {choixType && <Feuille titre="Quel document ?" onFermer={() => setChoixType(false)}>
        {(["vente", "logistique", "courrier"] as const).map(f => <div key={f} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={lbl}>{f === "vente" ? "Vente et paiement" : f === "logistique" ? "Livraison et expédition" : "Courrier"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 6 }}>
            {PIECES.filter(p => p.famille === f).map(p => <button key={p.id} style={{ ...btn(), whiteSpace: "normal", textAlign: "left" }} onClick={() => { setChoixType(false); ouvrir(nouvellePiece(p.id, "GENERAL", emDe("GENERAL"))); }}>{p.ico} {p.libelle}</button>)}
          </div>
        </div>)}
      </Feuille>}
      {generer && <Generer emetteurs={emetteurs} pieces={pieces} onFermer={() => setGenerer(false)} onPrete={(p: any) => { setGenerer(false); ouvrir(p); }} />}
    </div>
  );
}

function Feuille({ titre, onFermer, children }: any) {
  return (
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#16131c", border: `1px solid ${C.ligne}`, borderRadius: "16px 16px 0 0", padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 10, maxHeight: "90vh", overflowY: "auto", fontFamily: SA, color: C.texte, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}><div style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>{titre}</div><button style={btn()} onClick={onFermer}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

// ── Génération automatique depuis l'existant ─────────────────
function Generer({ emetteurs, pieces, onFermer, onPrete }: any) {
  const [sources, setSources] = useState<any[] | null>(null);
  const [cible, setCible] = useState<TypePiece>("facture");
  useEffect(() => {
    (async () => {
      const [cmds, evd, fd] = await Promise.all([
        sbSelect("bellaia_commandes", "select=*&order=created_at.desc&limit=100").catch(() => []),
        sbSelect("events_devis", "select=*,events_devis_lignes(*)&order=created_at.desc&limit=100").catch(() => sbSelect("events_devis", "select=*&order=created_at.desc&limit=100").catch(() => [])),
        sbSelect("food_devis", "select=*&order=created_at.desc&limit=100").catch(() => []),
      ]);
      setSources([
        ...cmds.map((c: any) => ({ cle: "bellaia_commandes:" + c.id, table: "bellaia_commandes", id: c.id, bu: c.bu || "GENERAL", libelle: `Commande ${c.reference || ""}`, client: { nom: c.client_nom || "", telephone: c.client_tel || "" }, lignes: normaliserLignes(c.lignes), date: c.date_commande || c.created_at, total: c.total, acompte: c.acompte_paye ? Number(c.acompte) || 0 : 0, ref: c.reference })),
        ...evd.map((d: any) => ({ cle: "events_devis:" + d.id, table: "events_devis", id: d.id, bu: "EVENTS", libelle: `Devis Events ${d.reference || ""} · ${d.evenement || ""}`, client: { nom: [d.client_prenom, d.client_nom].filter(Boolean).join(" "), telephone: d.client_tel || "", email: d.client_email || "" }, lignes: normaliserLignes((d.events_devis_lignes || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))), date: d.created_at, total: d.total_ht, ref: d.reference, objet: d.evenement })),
        ...fd.map((d: any) => ({ cle: "food_devis:" + d.id, table: "food_devis", id: d.id, bu: "FOOD", libelle: `Devis Food ${d.reference || ""}`, client: { nom: d.client || "", telephone: d.tel || "", email: d.email || "" }, lignes: normaliserLignes(d.lignes), date: d.date_creation || d.created_at, ref: d.reference })),
      ]);
    })();
  }, []);
  const choisir = (s: any) => {
    const deja = pieces.find((p: any) => p.source_table === s.table && p.source_id === s.id && p.type === cible);
    if (deja && !confirm(`Un document « ${defPiece(cible).libelle} » existe déjà pour cette source (${deja.numero || "brouillon"}). En créer un autre ?`)) return;
    const em = fusionEm(emetteurs, s.bu);
    const p = nouvellePiece(cible, s.bu, em);
    onPrete({ ...p, destinataire: s.client, lignes: s.lignes.length ? s.lignes.map((l: Ligne) => ({ ...l, tva_pct: l.tva_pct || Number(em.tva_defaut) || 0 })) : p.lignes, acompte: s.acompte || 0, objet: s.objet || "", source_table: s.table, source_id: s.id,
      champs: { ...p.champs, ...(cible === "bon_livraison" ? { ref_commande: s.ref } : { ref_devis: s.ref }) }, historique: [{ le: new Date().toISOString(), action: `Généré depuis ${s.libelle}` }] });
  };
  return (
    <Feuille titre="✨ Générer automatiquement" onFermer={onFermer}>
      <div style={{ fontSize: 13, color: C.doux }}>Choisis le document à créer, puis la commande ou le devis de départ : client et lignes sont repris, tout reste modifiable avant validation.</div>
      <select style={champ} value={cible} onChange={e => setCible(e.target.value as TypePiece)}>{PIECES.filter(p => p.lignes).map(p => <option key={p.id} value={p.id}>{p.ico} {p.libelle}</option>)}</select>
      {!sources && <div style={{ fontSize: 13, color: C.doux }}>Recherche des commandes et devis…</div>}
      {sources && sources.length === 0 && <div style={{ fontSize: 13, color: C.doux }}>Aucune commande ni devis trouvé dans les autres modules.</div>}
      {sources?.map(s => <button key={s.cle} style={{ ...btn(), whiteSpace: "normal", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }} onClick={() => choisir(s)}>
        <span>{s.libelle}</span><span style={{ fontSize: 12, color: C.doux, fontWeight: 400 }}>{s.client.nom || "—"} · {s.lignes.length} ligne(s){s.total ? " · " + euros(s.total) : ""} · {dateFr(String(s.date || "").slice(0, 10))}</span>
      </button>)}
    </Feuille>
  );
}

// ── Éditeur d'un document ────────────────────────────────────
function Editeur({ piece, emetteurs, toutes, onFermer, onOuvrir }: any) {
  const [p, setP] = useState<any>(() => JSON.parse(JSON.stringify(piece)));
  const [modifie, setModifie] = useState(!piece.id);
  const [msg, setMsg] = useState("");
  const [apercu, setApercu] = useState<MiseEnPage | null>(null);
  const [occupe, setOccupe] = useState("");
  const d = defPiece(p.type);
  const em = fusionEm(emetteurs, p.bu);
  const verrou = COMPTABLES.includes(p.type) && !!piece.numero;
  const maj = (patch: any) => { if (verrou && Object.keys(patch).some(k => !["statut", "notes"].includes(k))) return; setP((x: any) => ({ ...x, ...patch })); setModifie(true); };
  const majChamp = (k: string, v: any) => maj({ champs: { ...p.champs, [k]: v } });
  const majDest = (k: string, v: any) => maj({ destinataire: { ...p.destinataire, [k]: v } });
  const majLigne = (i: number, patch: any) => maj({ lignes: p.lignes.map((l: Ligne, j: number) => (j === i ? { ...l, ...patch } : l)) });
  const t = calculerTotaux(p.lignes || [], p.remise_pct);
  const clients = useMemo(() => { const m = new Map<string, any>(); toutes.forEach((x: any) => { if (x.destinataire?.nom) m.set(x.destinataire.nom, x.destinataire); }); return [...m.values()]; }, [toutes]);

  const pourEnvoi = (x: any) => {
    const tt = calculerTotaux(x.lignes || [], x.remise_pct);
    const { id, created_at, updated_at, numero, valide_le, ...reste } = x;
    return { ...reste, emetteur: { nom_commercial: em.nom_commercial, raison_sociale: em.raison_sociale, siret: em.siret }, total_ht: d.prix ? tt.ht : 0, total_tva: d.prix ? tt.tva : 0, total_ttc: d.prix ? tt.ttc : x.type === "recu" ? Number(x.champs?.montant) || 0 : x.type === "bon_achat" ? Number(x.champs?.valeur) || 0 : 0 };
  };
  const histo = (action: string) => [...(p.historique || []), { le: new Date().toISOString(), action }];

  const enregistrer = async (action = "Modifié"): Promise<any> => {
    setOccupe("Enregistrement…");
    try {
      let r: any;
      if (p.id) {
        const corps = verrou ? { statut: p.statut, notes: p.notes, historique: histo(action) } : { ...pourEnvoi(p), historique: histo(action) };
        [r] = await sbUpdate("bellaia_pieces", p.id, corps);
      } else {
        [r] = await sbInsert("bellaia_pieces", { ...pourEnvoi(p), historique: histo(action === "Modifié" ? "Créé" : action) });
        if (d.numeroAuto === "creation") { const n = await sbRpc<string>("bellaia_numeroter_piece", { p_id: r.id }); r = { ...r, numero: n }; }
      }
      setP(r); setModifie(false); setMsg("✅ Document enregistré à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + (r.numero ? ` · n° ${r.numero}` : ""));
      setOccupe(""); return r;
    } catch (e: any) { setMsg("⚠️ " + messageErreur(e)); setOccupe(""); return null; }
  };

  const valider = async () => {
    if (!confirm(`Valider et numéroter cette ${d.libelle.toLowerCase()} ?\nUne fois validée, son contenu ne pourra plus être modifié (correction = avoir).`)) return;
    const r = p.id && !modifie ? p : await enregistrer("Enregistré avant validation"); if (!r) return;
    try {
      const n = await sbRpc<string>("bellaia_numeroter_piece", { p_id: r.id });
      const [v] = await sbUpdate("bellaia_pieces", r.id, { historique: [...(r.historique || []), { le: new Date().toISOString(), action: `Validée n° ${n}` }] });
      onOuvrir(v); setMsg(`✅ Validée : ${n}. Elle apparaît aussi dans le suivi des paiements (Factures).`);
    } catch (e: any) { setMsg("⚠️ " + messageErreur(e)); }
  };

  const fichierPdf = async () => { const r = modifie ? await enregistrer() : p; if (!r) return null; return { blob: await pdfPiece(r, em), nom: `${slug((r.numero || d.libelle + "-brouillon") + "-" + (r.destinataire?.nom || ""))}.pdf`, r }; };
  const action = async (quoi: "telecharger" | "partager" | "imprimer") => {
    const fen = quoi === "imprimer" ? window.open("", "_blank") : null; // ouvert tout de suite (sinon bloqué sur iPhone)
    setOccupe("Préparation du PDF…");
    try {
      const f = await fichierPdf(); if (!f) { fen?.close(); setOccupe(""); return; }
      if (quoi === "telecharger") { telecharger(f.blob, f.nom); setMsg("✅ PDF téléchargé : tu peux l'envoyer toi-même (mail, WhatsApp…)"); }
      else if (quoi === "partager") { const res = await partagerFichier(f.blob, f.nom, `${d.libelle} ${f.r.numero || ""}`); setMsg(res === "partage" ? "✅ Partagé" : res === "telecharge" ? "✅ Partage direct indisponible ici : PDF téléchargé" : ""); }
      else { const u = URL.createObjectURL(f.blob); if (fen) fen.location.href = u; else window.open(u, "_blank"); setMsg("🖨 PDF ouvert : utilise Imprimer (ou Partager → Imprimer sur iPhone)"); }
      if (f.r.id && f.r.statut === "brouillon" && quoi === "partager" && !COMPTABLES.includes(f.r.type)) { const [v] = await sbUpdate("bellaia_pieces", f.r.id, { statut: "envoye", historique: [...(f.r.historique || []), { le: new Date().toISOString(), action: "Partagé" }] }); setP(v); }
    } catch (e: any) { fen?.close(); setMsg("⚠️ " + messageErreur(e)); }
    setOccupe("");
  };
  const texteMessage = () => `Bonjour${p.destinataire?.nom ? " " + p.destinataire.nom : ""}, voici ${d.libelle === "Facture" ? "votre facture" : "votre " + d.libelle.toLowerCase()}${p.numero ? " n° " + p.numero : ""}${d.prix ? " d'un montant de " + euros(t.ttc) : ""}. ${em.nom_commercial || ""}`.trim();
  const whatsapp = () => { const tel = String(p.destinataire?.telephone || "").replace(/\D/g, "").replace(/^0(6|5)/, "594$1"); window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texteMessage() + "\n(PDF en pièce jointe)")}`, "_blank"); };
  const mail = () => { location.href = `mailto:${p.destinataire?.email || ""}?subject=${encodeURIComponent(`${d.libelle} ${p.numero || ""} — ${em.nom_commercial || ""}`)}&body=${encodeURIComponent(texteMessage() + "\n\nLe document est joint à ce message.")}`; };

  const dupliquer = () => { const { id, numero, valide_le, created_at, updated_at, ...reste } = p; onOuvrir({ ...reste, statut: "brouillon", date_document: aujourdhui(), parent_id: null, source_table: null, source_id: null, historique: [{ le: new Date().toISOString(), action: `Copie de ${p.numero || "brouillon"}` }] }); };
  const convertir = (cible: TypePiece) => {
    const base = nouvellePiece(cible, p.bu, em);
    let lignes = p.lignes;
    if (cible === "facture_acompte" && p.type === "devis") { const pct = Number(p.champs?.acompte_pct) || 30; lignes = [{ designation: `Acompte de ${pct} % sur devis ${p.numero || ""}${p.objet ? " — " + p.objet : ""}`, qte: 1, unite: "forfait", pu: Math.round(t.ttc * pct) / 100, tva_pct: 0 }]; }
    if (cible === "facture" && p.type === "facture_acompte") lignes = toutes.find((x: any) => x.id === p.parent_id)?.lignes || p.lignes;
    const acompte = cible === "facture" ? toutes.filter((x: any) => x.type === "facture_acompte" && x.numero && (x.parent_id === p.id || x.id === p.id || (p.parent_id && x.parent_id === p.parent_id))).reduce((s: number, x: any) => s + Number(x.total_ttc), 0) : 0;
    onOuvrir({ ...base, destinataire: p.destinataire, objet: p.objet, lignes: cible === "recu" || cible === "bon_achat" ? [] : lignes, remise_pct: cible === "facture_acompte" ? 0 : p.remise_pct, acompte, parent_id: p.id, source_table: p.source_table, source_id: p.source_id,
      champs: { ...base.champs, ref_devis: p.type === "devis" ? p.numero : p.champs?.ref_devis, ref_commande: p.numero, ref_facture: COMPTABLES.includes(p.type) ? p.numero : undefined, ...(cible === "recu" ? { montant: t.ttc - (p.acompte || 0), pour: `${d.libelle.toLowerCase()} ${p.numero || ""}` } : {}) },
      historique: [{ le: new Date().toISOString(), action: `Créé depuis ${d.libelle} ${p.numero || ""}` }] });
  };
  const supprimer = async () => { if (!p.id) return onFermer(); if (!confirm("Supprimer ce document ?")) return; try { await sbDelete("bellaia_pieces", p.id); onFermer(); } catch (e: any) { setMsg("⚠️ " + messageErreur(e)); } };
  const fermer = () => { if (modifie && !confirm("Des modifications ne sont pas enregistrées. Quitter ?")) return; onFermer(); };

  const voir = async () => { setOccupe("Mise en page…"); try { setApercu(await miseEnPage({ ...pourEnvoi(p), numero: p.numero }, em)); } catch (e: any) { setMsg("⚠️ " + e.message); } setOccupe(""); };
  const enfants = toutes.filter((x: any) => x.parent_id && x.parent_id === p.id);
  const parent = toutes.find((x: any) => x.id === p.parent_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: SA, color: C.texte }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button style={btn()} onClick={fermer}>← Retour</button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{d.ico} {d.libelle} · {p.numero || (COMPTABLES.includes(p.type) ? "brouillon (numéro à la validation)" : "nouveau")}</div>
          <div style={{ fontSize: 12, color: (STATUTS[p.statut] || STATUTS.brouillon)[1] }}>{(STATUTS[p.statut] || STATUTS.brouillon)[0]}{verrou ? " · 🔒 verrouillée" : ""}{modifie ? " · modifications non enregistrées" : ""}</div>
        </div>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("⚠️") ? C.rouge : C.ok }}>{msg}</div>}
      {occupe && <div style={{ fontSize: 13, color: C.or }}>⏳ {occupe}</div>}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!verrou && <button style={btn(true)} onClick={() => enregistrer()} disabled={!!occupe}>💾 Enregistrer</button>}
        {COMPTABLES.includes(p.type) && !piece.numero && <button style={btn(true, C.ok)} onClick={valider} disabled={!!occupe}>✅ Valider et numéroter</button>}
        <button style={btn()} onClick={voir}>👁 Aperçu</button>
        <button style={btn()} onClick={() => action("telecharger")}>⬇️ Télécharger PDF</button>
        <button style={btn(true, C.bleu)} onClick={() => action("partager")}>📤 Partager directement</button>
        <button style={btn()} onClick={() => action("imprimer")}>🖨 Imprimer</button>
        <button style={btn()} onClick={whatsapp}>💬 WhatsApp</button>
        <button style={btn()} onClick={mail}>✉️ Mail</button>
        <button style={btn()} onClick={dupliquer}>⧉ Dupliquer</button>
        {(p.id || piece.id) && d.conversions.length > 0 && <select style={{ ...champ, width: "auto" }} value="" onChange={e => e.target.value && convertir(e.target.value as TypePiece)}><option value="">↪ Créer à partir de ce document…</option>{d.conversions.map(c => <option key={c} value={c}>{defPiece(c).ico} {defPiece(c).libelle}</option>)}</select>}
        {(!verrou) && <button style={btn(false)} onClick={supprimer}>🗑</button>}
      </div>
      <div style={{ fontSize: 12, color: C.doux }}>« Télécharger » : tu envoies toi-même le PDF. « Partager directement » : la feuille de partage s'ouvre (WhatsApp, Mail, Messages…) avec le PDF joint.</div>
      {(parent || enfants.length > 0) && <div style={{ fontSize: 12, color: C.doux }}>Lié : {parent && <span>issu de {defPiece(parent.type).libelle} {parent.numero} · </span>}{enfants.map((x: any) => `${defPiece(x.type).libelle} ${x.numero || "brouillon"}`).join(" · ")}</div>}

      {verrou && <div style={{ fontSize: 13, color: C.or, background: `${C.or}14`, borderRadius: 10, padding: 10 }}>🔒 Document validé : seuls le statut et les notes internes se modifient. Pour corriger : « ↪ Créer à partir de ce document » → Avoir.</div>}

      {/* Statut + pôle + dates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Statut</span><select style={champ} value={p.statut} onChange={e => { setP((x: any) => ({ ...x, statut: e.target.value })); setModifie(true); }}>{Object.entries(STATUTS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Pôle émetteur</span><select style={champ} disabled={verrou} value={p.bu} onChange={e => maj({ bu: e.target.value })}>{BU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Date</span><input type="date" style={champ} disabled={verrou} value={p.date_document || ""} onChange={e => maj({ date_document: e.target.value })} /></label>
        {["facture", "facture_acompte"].includes(p.type) && <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Échéance</span><input type="date" style={champ} disabled={verrou} value={p.date_echeance || ""} onChange={e => maj({ date_echeance: e.target.value })} /></label>}
      </div>

      {/* Destinataire */}
      <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={lbl}>{p.type === "bon_achat" ? "Client (acheteur)" : "Destinataire"}</span>
        <input style={champ} list="admin-clients" disabled={verrou} placeholder="Nom" value={p.destinataire?.nom || ""} onChange={e => { const c = clients.find((x: any) => x.nom === e.target.value); maj({ destinataire: c ? { ...c } : { ...p.destinataire, nom: e.target.value } }); }} />
        <datalist id="admin-clients">{clients.map((c: any) => <option key={c.nom} value={c.nom} />)}</datalist>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6 }}>
          {([["societe", "Société (facultatif)"], ["telephone", "Téléphone"], ["email", "E-mail"], ["adresse", "Adresse"], ["code_postal", "Code postal"], ["ville", "Ville"]] as const).map(([k, l]) => <input key={k} style={champ} disabled={verrou} placeholder={l} value={p.destinataire?.[k] || ""} onChange={e => majDest(k, e.target.value)} />)}
        </div>
      </div>

      {p.type !== "bon_achat" && <input style={champ} disabled={verrou} placeholder={p.type === "courrier" ? "Objet du courrier" : "Objet (ex. Anniversaire de Léa — 25/01)"} value={p.objet || ""} onChange={e => maj({ objet: e.target.value })} />}

      {/* Champs propres au type */}
      {d.champs.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
        {d.champs.map(f => <label key={f.cle} style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: f.type === "zone" ? "1 / -1" : undefined }}>
          <span style={lbl}>{f.libelle}</span>
          {f.type === "zone" ? <textarea style={{ ...champ, minHeight: f.cle === "corps" ? 220 : 70, lineHeight: 1.5 }} disabled={verrou} value={p.champs?.[f.cle] || ""} onChange={e => majChamp(f.cle, e.target.value)} />
            : <input style={champ} disabled={verrou} type={f.type === "date" ? "date" : f.type === "nombre" ? "number" : "text"} inputMode={f.type === "nombre" ? "decimal" : undefined} placeholder={f.aide || ""} value={p.champs?.[f.cle] ?? ""} onChange={e => majChamp(f.cle, f.type === "nombre" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />}
        </label>)}
      </div>}

      {/* Lignes */}
      {d.lignes && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={lbl}>{p.type === "bordereau_envoi" ? "Documents / pièces envoyés" : "Lignes"}</span>
        {p.lignes.map((l: Ligne, i: number) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...champ, flex: 1 }} disabled={verrou} placeholder="Désignation" value={l.designation} onChange={e => majLigne(i, { designation: e.target.value })} />
              {!verrou && <button style={btn()} title="Monter" onClick={() => { if (!i) return; const x = [...p.lignes]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; maj({ lignes: x }); }}>↑</button>}
              {!verrou && <button style={btn()} title="Supprimer la ligne" onClick={() => maj({ lignes: p.lignes.filter((_: any, j: number) => j !== i) })}>✕</button>}
            </div>
            <input style={{ ...champ, fontSize: 13 }} disabled={verrou} placeholder="Détail (facultatif)" value={l.detail || ""} onChange={e => majLigne(i, { detail: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: d.prix ? "repeat(auto-fit,minmax(90px,1fr))" : "1fr 2fr", gap: 6 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>Qté</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" value={l.qte} onChange={e => majLigne(i, { qte: Number(e.target.value) })} /></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>Unité</span><input style={champ} disabled={verrou} list="admin-unites" value={l.unite} onChange={e => majLigne(i, { unite: e.target.value })} /></label>
              {d.prix && <>
                <label style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>Prix unit. €</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" step="0.01" value={l.pu} onChange={e => majLigne(i, { pu: Number(e.target.value) })} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>Remise %</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" value={l.remise_pct || 0} onChange={e => majLigne(i, { remise_pct: Number(e.target.value) })} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>TVA %</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" value={l.tva_pct || 0} onChange={e => majLigne(i, { tva_pct: Number(e.target.value) })} /></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, justifyContent: "flex-end" }}><span style={lbl}>Total</span><span style={{ fontSize: 15, fontWeight: 800, padding: "9px 0" }}>{euros(totalLigne(l))}</span></div>
              </>}
            </div>
          </div>
        ))}
        <datalist id="admin-unites">{UNITES.map(u => <option key={u} value={u} />)}</datalist>
        {!verrou && <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => maj({ lignes: [...p.lignes, { designation: "", qte: 1, unite: "pièce", pu: 0, tva_pct: Number(em.tva_defaut) || 0 }] })}>+ Ajouter une ligne</button>}
        {d.prix && <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 2, width: 120 }}><span style={lbl}>Remise globale %</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" value={p.remise_pct || 0} onChange={e => maj({ remise_pct: Number(e.target.value) })} /></label>
            {p.type !== "facture_acompte" && <label style={{ display: "flex", flexDirection: "column", gap: 2, width: 140 }}><span style={lbl}>Acompte déjà versé €</span><input style={champ} disabled={verrou} type="number" inputMode="decimal" value={p.acompte || 0} onChange={e => maj({ acompte: Number(e.target.value) })} /></label>}
          </div>
          <div style={{ fontSize: 13, color: C.doux }}>{t.tva ? `HT ${euros(t.ht)} · TVA ${euros(t.tva)} · ` : ""}<b style={{ color: C.texte, fontSize: 17 }}>Total {euros(t.ttc)}</b>{p.acompte ? ` · reste ${euros(t.ttc - p.acompte)}` : ""}</div>
        </div>}
      </div>}

      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Conditions (imprimées)</span><textarea style={{ ...champ, minHeight: 60 }} disabled={verrou} value={p.conditions || ""} onChange={e => maj({ conditions: e.target.value })} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Mentions complémentaires (imprimées)</span><textarea style={{ ...champ, minHeight: 50 }} disabled={verrou} value={p.mentions || ""} onChange={e => maj({ mentions: e.target.value })} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Notes internes (jamais imprimées)</span><textarea style={{ ...champ, minHeight: 50 }} value={p.notes || ""} onChange={e => { setP((x: any) => ({ ...x, notes: e.target.value })); setModifie(true); }} /></label>
      {(p.historique || []).length > 0 && <details><summary style={{ fontSize: 12, color: C.doux, cursor: "pointer" }}>Historique ({p.historique.length})</summary>{p.historique.map((h: any, i: number) => <div key={i} style={{ fontSize: 12, color: C.doux }}>{new Date(h.le).toLocaleString("fr-FR")} — {h.action}</div>)}</details>}

      {apercu && <Apercu m={apercu} onFermer={() => setApercu(null)} />}
    </div>
  );
}

function Apercu({ m, onFermer }: { m: MiseEnPage; onFermer: () => void }) {
  const boite = useRef<HTMLDivElement>(null);
  const [larg, setLarg] = useState(360);
  useEffect(() => { const w = Math.min(760, (boite.current?.clientWidth || 360) - 4); setLarg(w); }, []);
  return (
    <Feuille titre={`Aperçu · ${m.pages.length} page(s)`} onFermer={onFermer}>
      <div ref={boite} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {m.pages.map((_, i) => <PageCanvas key={i} m={m} i={i} largeur={larg} />)}
      </div>
    </Feuille>
  );
}
function PageCanvas({ m, i, largeur }: { m: MiseEnPage; i: number; largeur: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) dessinerPage(m, i, ref.current, largeur); }, [m, i, largeur]);
  return <canvas ref={ref} style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.5)", borderRadius: 4, maxWidth: "100%" }} />;
}

// ── Informations légales par pôle ────────────────────────────
function Emetteurs({ emetteurs, setEmetteurs }: any) {
  const [bu, setBu] = useState("GENERAL");
  const e = emetteurs.find((x: any) => x.bu === bu) || { bu };
  const [f, setF] = useState<any>(e);
  const [msg, setMsg] = useState("");
  useEffect(() => { setF(emetteurs.find((x: any) => x.bu === bu) || { bu }); }, [bu, emetteurs]);
  const [envoi, setEnvoi] = useState(false);
  const sauver = async () => {
    if (envoi) return;
    setEnvoi(true);
    try {
      const { bu: _b, updated_at, ...patch } = f; const r = await patchEmetteur(bu, patch);
      if (!r) throw new Error("Enregistrement non confirmé par le serveur.");
      setEmetteurs((xs: any[]) => xs.map(x => (x.bu === bu ? r : x)));
      setMsg("✅ Informations enregistrées à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (er: any) { setMsg("⚠️ " + er.message); }
    setEnvoi(false);
  };
  const derniere = emetteurs.find((x: any) => x.bu === bu)?.updated_at;
  const copierDe = (src: string) => { const s = emetteurs.find((x: any) => x.bu === src); if (!s) return; const { bu: _b, nom_commercial, couleur, logo_url, updated_at, ...rest } = s; setF({ ...f, ...rest }); };
  const logo = async (file?: File) => {
    if (!file) return; setMsg("Envoi du logo…");
    try { const c = await compresserImage(file); const chemin = `logos/${bu.toLowerCase()}-${Date.now().toString(36)}.${c.ext}`; const url = await uploadStorage(chemin, c.blob, c.type); setF({ ...f, logo_url: url }); setMsg("Logo prêt — pense à enregistrer."); }
    catch (er: any) { setMsg("⚠️ " + er.message); }
  };
  const champs: [string, string][] = [["nom_commercial", "Nom commercial (ex. Bella'Secret Home)"], ["raison_sociale", "Raison sociale / nom de l'entrepreneur"], ["forme_juridique", "Forme (EI, micro-entreprise, SAS…)"], ["siret", "SIRET"], ["rcs_rm", "RCS / RM (si inscrit)"], ["adresse", "Adresse"], ["code_postal", "Code postal"], ["ville", "Ville"], ["telephone", "Téléphone"], ["email", "E-mail"], ["site", "Site internet"], ["iban", "IBAN (affiché sur devis et factures)"], ["bic", "BIC"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>Ces informations s'impriment sur chaque document du pôle. Un champ laissé vide dans un pôle reprend celui de « Général ». Elles sont obligatoires sur une facture (nom, adresse, SIRET). Vérifie la mention de TVA avec ton comptable.</div>
      <select style={champ} value={bu} onChange={ev => setBu(ev.target.value)}>{BU.map(([v, l]) => <option key={v} value={v}>{l}{emetteurs.find((x: any) => x.bu === v)?.siret ? " ✓" : ""}</option>)}</select>
      {bu !== "GENERAL" && <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => copierDe("GENERAL")}>Reprendre les informations de « Général »</button>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6 }}>
        {champs.map(([k, l]) => <input key={k} style={champ} placeholder={l} value={f[k] || ""} onChange={ev => setF({ ...f, [k]: ev.target.value })} />)}
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Mention TVA</span><input style={champ} placeholder={MENTION_TVA_DEFAUT} value={f.mention_tva || ""} onChange={ev => setF({ ...f, mention_tva: ev.target.value })} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>TVA par défaut (%)</span><input style={champ} type="number" inputMode="decimal" value={f.tva_defaut ?? 0} onChange={ev => setF({ ...f, tva_defaut: Number(ev.target.value) })} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Conditions de paiement (factures)</span><textarea style={{ ...champ, minHeight: 50 }} placeholder="ex. Paiement à réception par virement, espèces ou SumUp." value={f.conditions_paiement || ""} onChange={ev => setF({ ...f, conditions_paiement: ev.target.value })} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>Pénalités de retard</span><textarea style={{ ...champ, minHeight: 60 }} placeholder={PENALITES_DEFAUT} value={f.penalites || ""} onChange={ev => setF({ ...f, penalites: ev.target.value })} /></label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {f.logo_url && <img src={f.logo_url} alt="Logo" style={{ height: 48, background: "#fff", borderRadius: 6, padding: 4 }} />}
        <label style={btn()}>🖼 {f.logo_url ? "Changer le logo" : "Ajouter le logo"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={ev => { logo(ev.target.files?.[0]); ev.target.value = ""; }} /></label>
        <label style={{ ...btn(), display: "flex", alignItems: "center", gap: 6 }}>Couleur <input type="color" value={f.couleur || "#6B1A2B"} onChange={ev => setF({ ...f, couleur: ev.target.value })} /></label>
      </div>
      <div style={{ position: "sticky", bottom: 0, background: "#120c10", padding: "10px 0 calc(10px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${C.ligne}` }}>
        <button style={{ ...btn(true), opacity: envoi ? 0.6 : 1, minHeight: 46, fontSize: 15 }} onClick={sauver} disabled={envoi}>{envoi ? "⏳ Enregistrement…" : "💾 Enregistrer"}</button>
        {msg ? <div style={{ fontSize: 14, fontWeight: 700, color: msg.startsWith("⚠️") ? C.rouge : C.ok }}>{msg}</div>
          : derniere && <div style={{ fontSize: 12, color: C.doux }}>Dernier enregistrement : {new Date(derniere).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}
      </div>
    </div>
  );
}


// ── Outils & déclarations : documents de travail MODIFIABLES (copies
// dans le Google Drive de la fondatrice : facture, livre des recettes /
// achats / marge) et guides de déclaration. Liens ajoutables.
function OutilsAdministratifs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [titre, setTitre] = useState("");
  const [lien, setLien] = useState("");
  const [msg, setMsg] = useState("");
  const charger = async () => { try { setDocs(await sbSelect("bellaia_documents", "module=eq.administratif&categorie=in.(outil,guide)&select=id,titre,categorie,fichier_url,notes&order=categorie.desc,titre.asc")); } catch (e: any) { setMsg("❌ " + String(e?.message || e)); } };
  useEffect(() => { charger(); }, []);
  const ajouter = async () => {
    if (!titre.trim() || !/^https:\/\//.test(lien.trim())) { setMsg("Titre et lien https:// requis."); return; }
    try { await sbInsert("bellaia_documents", { titre: titre.trim(), module: "administratif", categorie: "outil", type_fichier: "lien", fichier_url: lien.trim(), statut: "actif" }); setTitre(""); setLien(""); setMsg("✅ Document ajouté."); charger(); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const groupe = (c: string, t: string) => { const l = docs.filter(d => d.categorie === c); return !l.length ? null : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{t}</div>
      {l.map(d => (
        <div key={d.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 700 }}>{d.titre}</div>{d.notes && <div style={{ fontSize: 12, color: C.doux, marginTop: 2 }}>{d.notes}</div>}</div>
          <a href={d.fichier_url} target="_blank" rel="noopener noreferrer" style={{ ...btn(true), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{c === "outil" ? "✏️ Ouvrir et modifier" : "📖 Consulter"}</a>
        </div>))}
    </div>); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>Vos documents de travail pour les déclarations et démarches. Les modèles s'ouvrent dans votre Google Drive, où vous pouvez les modifier librement (copies personnelles : les originaux de la formation restent intacts).</div>
      {msg && <div style={{ fontSize: 13 }}>{msg}</div>}
      {groupe("outil", "✏️ Documents modifiables")}
      {groupe("guide", "📖 Guides et obligations")}
      <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Ajouter un document (lien Google Drive, Sheets, Docs…)</div>
        <input style={champ} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre" />
        <input style={champ} value={lien} onChange={e => setLien(e.target.value)} placeholder="https://…" />
        <button style={btn(true)} onClick={ajouter}>Ajouter</button>
      </div>
    </div>
  );
}
