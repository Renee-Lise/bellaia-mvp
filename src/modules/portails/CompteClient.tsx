"use client";
// ═══════════════════════════════════════════════════════════
// « Mon compte » de l'accueil client : quatre pages internes réelles (plus de renvoi vers un accueil générique).
// • Mes informations : prénom, nom, téléphone (profil de la personne connectée, règles d'accès de la base).
// • Notifications : historique, lues / non lues, tout marquer comme lu.
// • Confidentialité et mes données : données réellement conservées, droits, demandes RGPD suivies.
// • Aide et contact : questions fréquentes, formulaire, historique des demandes ; WhatsApp en complément.
// Les demandes utilisent la table « bellaia_demandes » (migration 0139). Tant qu'elle n'est pas appliquée,
// la page le dit clairement au lieu de simuler un envoi.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { sbSelect, sbUpdate, sbInsert } from "../events/eventsAtelierLib";
import CalendrierPremium from "../calendrier/CalendrierPremium";
import { MARQUES } from "../../design/marques";
import SecuriteCompte from "./SecuriteCompte";

export type PageCompte = "profil" | "notifications" | "confidentialite" | "aide" | "agenda" | "securite";
const T = { fond: "#faf6ef", carte: "#ffffff", texte: "#1c2246", doux: "rgba(28,34,70,0.62)", ligne: "rgba(28,34,70,0.12)", or: "#b8995a", rouge: "#b4523f", vert: "#3f7d5b" };
const SA = "-apple-system, system-ui, sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', serif";
const carte: React.CSSProperties = { background: T.carte, border: `1px solid ${T.ligne}`, borderRadius: 16, padding: 16, marginBottom: 12 };
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, borderRadius: 12, border: `1px solid ${T.ligne}`, padding: "10px 12px", fontSize: 16, fontFamily: SA, background: "#fff", color: T.texte };
const bouton = (plein = true): React.CSSProperties => ({ minHeight: 44, padding: "10px 16px", borderRadius: 22, border: plein ? "none" : `1px solid ${T.ligne}`, background: plein ? T.texte : "transparent", color: plein ? "#fff" : T.texte, fontSize: 15, fontWeight: 650, fontFamily: SA });
const TITRES: Record<PageCompte, string> = { agenda: "Mon agenda", profil: "Mes informations", notifications: "Notifications", confidentialite: "Confidentialité et mes données", aide: "Aide et contact", securite: "Sécurité du compte" };
const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const TYPES_DEMANDE: Record<string, string> = { aide: "Aide", contact: "Contact", rgpd_acces: "Accès à mes données", rgpd_rectification: "Rectification", rgpd_effacement: "Effacement", rgpd_portabilite: "Portabilité", rgpd_opposition: "Opposition" };
const STATUTS: Record<string, string> = { recue: "Reçue", en_cours: "En cours", repondue: "Répondue", close: "Close" };

function Message({ m }: { m: { ok: boolean; t: string } | null }) {
  if (!m) return null;
  return <div role="status" style={{ background: m.ok ? "#e8f3ec" : "#f8e9e5", color: m.ok ? T.vert : T.rouge, borderRadius: 12, padding: "10px 12px", fontSize: 14, marginBottom: 12 }}>{m.t}</div>;
}

// ── Mes informations
function Profil({ user }: { user: any }) {
  const [f, setF] = useState<{ prenom: string; nom: string; telephone: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { sbSelect<any>("profiles", `id=eq.${user?.id}&select=prenom,nom,telephone`).then(r => setF({ prenom: r[0]?.prenom || "", nom: r[0]?.nom || "", telephone: r[0]?.telephone || "" })).catch(() => setMsg({ ok: false, t: "Vos informations ne peuvent pas être chargées pour le moment." })); }, [user?.id]);
  const enregistrer = async () => {
    if (!f) return;
    if (f.telephone && !/^[+0-9 ().-]{6,20}$/.test(f.telephone)) { setMsg({ ok: false, t: "Numéro de téléphone invalide." }); return; }
    setOccupe(true);
    try { await sbUpdate("profiles", user.id, { prenom: f.prenom.trim().slice(0, 60), nom: f.nom.trim().slice(0, 60), telephone: f.telephone.trim().slice(0, 20), updated_at: new Date().toISOString() }); setMsg({ ok: true, t: "Informations enregistrées." }); }
    catch { setMsg({ ok: false, t: "Enregistrement impossible. Réessayez dans un instant." }); }
    setOccupe(false);
  };
  if (!f) return <><Message m={msg} />{!msg && <div style={{ color: T.doux }}>Chargement…</div>}</>;
  const L = (k: "prenom" | "nom" | "telephone", l: string, type = "text", auto = "") => (
    <label style={{ display: "block", marginBottom: 12 }}><span style={{ display: "block", fontSize: 13, color: T.doux, marginBottom: 4 }}>{l}</span>
      <input style={champ} type={type} autoComplete={auto} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>);
  return <>
    <Message m={msg} />
    <div style={carte}>
      {L("prenom", "Prénom", "text", "given-name")}{L("nom", "Nom", "text", "family-name")}{L("telephone", "Téléphone", "tel", "tel")}
      <div style={{ fontSize: 13, color: T.doux, marginBottom: 12 }}>Adresse e-mail de connexion : <strong>{user?.email || "—"}</strong> (modifiable sur demande depuis « Aide et contact »).</div>
      <button style={bouton()} disabled={occupe} onClick={enregistrer}>{occupe ? "Enregistrement…" : "Enregistrer"}</button>
    </div>
    <div style={{ ...carte, fontSize: 14, color: T.doux }}>Adresses de livraison : saisies au moment de chaque commande. Préférences de communication : en préparation (elles apparaîtront ici).</div>
  </>;
}

// ── Notifications
function Notifications({ user }: { user: any }) {
  const [liste, setListe] = useState<any[] | null>(null);
  const [filtre, setFiltre] = useState<"toutes" | "non_lues">("toutes");
  const charger = () => sbSelect<any>("bellaia_notifications", `user_id=eq.${user?.id}&select=id,type,titre,contenu,lu,created_at&order=created_at.desc&limit=100`).then(setListe).catch(() => setListe([]));
  useEffect(() => { charger(); }, [user?.id]);
  const marquer = async (n: any) => { try { await sbUpdate("bellaia_notifications", n.id, { lu: true }); setListe(l => (l || []).map(x => x.id === n.id ? { ...x, lu: true } : x)); } catch {} };
  const toutLu = async () => { for (const n of (liste || []).filter(x => !x.lu)) await marquer(n); };
  if (!liste) return <div style={{ color: T.doux }}>Chargement…</div>;
  const nonLues = liste.filter(x => !x.lu).length; const vues = filtre === "toutes" ? liste : liste.filter(x => !x.lu);
  return <>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {(["toutes", "non_lues"] as const).map(k => <button key={k} style={bouton(filtre === k)} onClick={() => setFiltre(k)}>{k === "toutes" ? `Toutes (${liste.length})` : `Non lues (${nonLues})`}</button>)}
      {nonLues > 0 && <button style={bouton(false)} onClick={toutLu}>Tout marquer comme lu</button>}
    </div>
    {vues.length === 0 ? <div style={{ ...carte, color: T.doux }}>{filtre === "non_lues" ? "Aucune notification non lue." : "Aucune notification pour le moment. Vos commandes, rendez-vous et réponses apparaîtront ici."}</div>
      : vues.map(n => <div key={n.id} style={{ ...carte, borderLeft: `4px solid ${n.lu ? T.ligne : T.or}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 15 }}>{n.titre || "Notification"}</strong><span style={{ fontSize: 12, color: T.doux, whiteSpace: "nowrap" }}>{dateFr(n.created_at)}</span></div>
          {n.contenu && <div style={{ fontSize: 14, color: T.doux, marginTop: 4 }}>{n.contenu}</div>}
          {!n.lu && <button style={{ ...bouton(false), marginTop: 10 }} onClick={() => marquer(n)}>Marquer comme lue</button>}
        </div>)}
    <div style={{ fontSize: 13, color: T.doux }}>Préférences de notification : réglables prochainement ; les alertes sur l'iPhone s'activent depuis l'application installée (bouton « 🔔+ Activer »).</div>
  </>;
}

// ── Demandes (aide et RGPD) : formulaire + historique
function Demandes({ types, intro, userId }: { types: string[]; intro: string; userId: string }) {
  const [liste, setListe] = useState<any[] | null>(null);
  const [indispo, setIndispo] = useState(false);
  const [f, setF] = useState({ type: types[0], objet: "", message: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const charger = () => sbSelect<any>("bellaia_demandes", `select=id,type,objet,statut,reponse,echeance,created_at&user_id=eq.${userId}&type=in.(${types.join(",")})&order=created_at.desc`).then(l => { setListe(l); setIndispo(false); }).catch(() => { setListe([]); setIndispo(true); });
  useEffect(() => { charger(); }, []);
  const envoyer = async () => {
    if (f.objet.trim().length < 3 || f.message.trim().length < 3) { setMsg({ ok: false, t: "Indiquez un objet et un message." }); return; }
    try { await sbInsert("bellaia_demandes", { type: f.type, objet: f.objet.trim().slice(0, 150), message: f.message.trim().slice(0, 3000) }); setF({ ...f, objet: "", message: "" }); setMsg({ ok: true, t: "Demande envoyée. Vous suivrez la réponse ici." }); charger(); }
    catch { setMsg({ ok: false, t: "Envoi impossible pour le moment." }); }
  };
  return <>
    <Message m={msg} />
    <div style={carte}>
      <div style={{ fontSize: 14, color: T.doux, marginBottom: 12 }}>{intro}</div>
      {indispo ? <div style={{ fontSize: 14, color: T.rouge }}>Le dépôt et le suivi des demandes dans l'application seront ouverts dès l'activation du service (en cours de validation). D'ici là, utilisez le contact ci-dessous.</div> : <>
        {types.length > 1 && <select style={{ ...champ, marginBottom: 10 }} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{types.map(t => <option key={t} value={t}>{TYPES_DEMANDE[t]}</option>)}</select>}
        <input style={{ ...champ, marginBottom: 10 }} placeholder="Objet" value={f.objet} maxLength={150} onChange={e => setF({ ...f, objet: e.target.value })} />
        <textarea style={{ ...champ, minHeight: 110, marginBottom: 10 }} placeholder="Votre message" value={f.message} maxLength={3000} onChange={e => setF({ ...f, message: e.target.value })} />
        <button style={bouton()} onClick={envoyer}>Envoyer</button></>}
    </div>
    {liste && liste.length > 0 && <div style={carte}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Mes demandes</div>
      {liste.map(d => <div key={d.id} style={{ borderTop: `1px solid ${T.ligne}`, padding: "10px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 14.5 }}>{d.objet}</strong><span style={{ fontSize: 12, color: T.doux }}>{STATUTS[d.statut] || d.statut}</span></div>
        <div style={{ fontSize: 12.5, color: T.doux }}>{TYPES_DEMANDE[d.type]} · {dateFr(d.created_at)}{d.echeance ? ` · réponse au plus tard le ${dateFr(d.echeance)}` : ""}</div>
        {d.reponse && <div style={{ fontSize: 14, marginTop: 6, background: T.fond, borderRadius: 10, padding: 10 }}>{d.reponse}</div>}
      </div>)}
    </div>}
  </>;
}

function Confidentialite({ userId }: { userId: string }) {
  return <>
    <div style={carte}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Les données que nous conservons</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.55 }}>
        <li>Votre compte : prénom, nom, téléphone, adresse e-mail de connexion.</li>
        <li>Vos commandes, réservations et demandes, avec leurs montants (aucun numéro de carte : les paiements passent par le prestataire de paiement).</li>
        <li>Vos notifications.</li>
      </ul>
      <div style={{ fontSize: 13.5, color: T.doux, marginTop: 10 }}>Ces données servent uniquement à traiter vos commandes et vos demandes. Elles ne sont ni vendues ni cédées.</div>
    </div>
    <div style={carte}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 8 }}>Vos droits</div>
      <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>Vous pouvez demander à <strong>accéder</strong> à vos données, les <strong>rectifier</strong>, les <strong>effacer</strong> (sauf celles que la loi oblige à conserver, comme les factures), les <strong>récupérer</strong> dans un format courant, ou vous <strong>opposer</strong> à un traitement. Réponse sous un mois. Une vérification d'identité peut être demandée. Vous pouvez aussi saisir la CNIL (cnil.fr).</div>
    </div>
    <div style={{ ...carte, fontSize: 14.5 }}>Documents de référence : <a href="/confidentialite" style={{ color: T.texte }}>politique de confidentialité</a> · <a href="/mentions-legales" style={{ color: T.texte }}>mentions légales</a> · <a href="/conditions-generales" style={{ color: T.texte }}>conditions générales</a></div>
    <Demandes userId={userId} types={["rgpd_acces", "rgpd_rectification", "rgpd_effacement", "rgpd_portabilite", "rgpd_opposition"]} intro="Choisissez le type de demande et précisez-la. Vous suivrez son traitement ci-dessous." />
  </>;
}

function Aide({ whatsapp, userId }: { whatsapp?: string; userId: string }) {
  const FAQ: [string, string][] = [
    ["Où suivre mes commandes ?", "Depuis l'accueil, rubrique « Mes commandes » : chaque commande affiche sa référence et son état."],
    ["Comment modifier mes informations ?", "Mon compte › Mes informations : prénom, nom et téléphone se modifient directement."],
    ["Comment recevoir les alertes sur mon iPhone ?", "Ajoutez Bellaïa à l'écran d'accueil (Safari › Partager › Sur l'écran d'accueil), ouvrez-la, puis touchez « 🔔+ Activer »."],
    ["Mes données sont-elles protégées ?", "Voir Mon compte › Confidentialité et mes données."],
  ];
  return <>
    <div style={carte}>
      <div style={{ fontFamily: SERIF, fontSize: 18, marginBottom: 6 }}>Questions fréquentes</div>
      {FAQ.map(([q, r]) => <details key={q} style={{ borderTop: `1px solid ${T.ligne}`, padding: "10px 0" }}><summary style={{ fontSize: 14.5, fontWeight: 600, minHeight: 28, cursor: "pointer" }}>{q}</summary><div style={{ fontSize: 14, color: T.doux, marginTop: 6 }}>{r}</div></details>)}
    </div>
    <div style={{ ...carte, fontSize: 14.5 }}>Documents de référence : <a href="/confidentialite" style={{ color: T.texte }}>politique de confidentialité</a> · <a href="/mentions-legales" style={{ color: T.texte }}>mentions légales</a> · <a href="/conditions-generales" style={{ color: T.texte }}>conditions générales</a></div>
    <Demandes userId={userId} types={["aide", "contact"]} intro="Une question sur une commande, un rendez-vous ou votre compte ? Écrivez-nous : la réponse apparaîtra ici." />
    {whatsapp && <div style={{ ...carte, fontSize: 14 }}>Vous préférez échanger par message ? <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: T.texte, fontWeight: 650 }}>Écrire sur WhatsApp</a> (facultatif).</div>}
  </>;
}

export default function CompteClient({ page, user, onRetour, whatsapp, onDeconnexion }: { page: PageCompte; user: any; onRetour: () => void; whatsapp?: string; onDeconnexion?: () => void }) {
  return (
    <div style={{ minHeight: "100dvh", background: T.fond, color: T.texte, fontFamily: SA }}>
      <div style={{ position: "sticky", top: "var(--bellaia-haut, env(safe-area-inset-top, 0px))", zIndex: 20, background: T.fond, borderBottom: `1px solid ${T.ligne}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onRetour} style={{ ...bouton(false), border: "none", padding: "8px 10px" }} aria-label="Retour à l'accueil">‹ Accueil</button>
        <h1 style={{ fontFamily: SERIF, fontSize: 20, margin: 0, flex: 1, minWidth: 0 }}>{TITRES[page]}</h1>
      </div>
      <div style={{ padding: "14px 14px 32px", maxWidth: 640, margin: "0 auto" }}>
        {page === "agenda" && <CalendrierPremium m={{ ...MARQUES.STUDIO, nom: "Bellaïa", logo: MARQUES.GENERAL.logo }} role="cliente" userId={user?.id} titre="Mon agenda" />}
        {page === "profil" && <Profil user={user} />}
        {page === "notifications" && <Notifications user={user} />}
        {page === "confidentialite" && <Confidentialite userId={user?.id} />}
        {page === "aide" && <Aide whatsapp={whatsapp} userId={user?.id} />}
        {page === "securite" && <SecuriteCompte user={user} onDeconnecte={onDeconnexion} />}
      </div>
    </div>
  );
}
