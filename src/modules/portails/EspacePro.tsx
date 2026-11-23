"use client";
// ═══════════════════════════════════════════════════════════
// Espace professionnel commun (hôte, prestataire, partenaire, collaboratrice) — écrans internes réels,
// sans redirection WhatsApp. Données lues avec les règles d'accès de la base (RLS) : la personne ne voit que
// SES missions, SES documents, SES rôles et permissions.
// Missions : accusé de réception, avancement, pièce jointe, signalement, demande de transfert, soumission à
// validation. Ces actions passent par les fonctions sécurisées de 0137 quand elles existent, sinon par le fil
// de la mission (déjà autorisé à la personne assignée) : la trace est la même pour la fondatrice.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbRpc } from "../events/eventsAtelierLib";
import { deposerPrive, lienPrive, nomFichierSur } from "../equipe/equipeLib";
import CalendrierPremium from "../calendrier/CalendrierPremium";
import { MARQUES } from "../../design/marques";

const T = { fond: "#faf6ef", carte: "#fff", texte: "#1c2246", doux: "rgba(28,34,70,0.62)", ligne: "rgba(28,34,70,0.12)", or: "#b8995a", rouge: "#b4523f", vert: "#3f7d5b" };
const SA = "-apple-system, system-ui, sans-serif", SERIF = "Georgia, 'Iowan Old Style', serif";
const carte: React.CSSProperties = { background: T.carte, border: `1px solid ${T.ligne}`, borderRadius: 16, padding: 14, marginBottom: 12 };
const bouton = (plein = true): React.CSSProperties => ({ minHeight: 44, padding: "9px 14px", borderRadius: 22, border: plein ? "none" : `1px solid ${T.ligne}`, background: plein ? T.texte : "transparent", color: plein ? "#fff" : T.texte, fontSize: 14.5, fontWeight: 650, fontFamily: SA });
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, borderRadius: 12, border: `1px solid ${T.ligne}`, padding: "10px 12px", fontSize: 16, fontFamily: SA };
const STATUT: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", a_valider: "À valider", fait: "Terminée", annule: "Annulée" };
const dateFr = (d?: string | null) => d ? new Date(String(d).slice(0, 10) + "T12:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
type Onglet = "accueil" | "missions" | "agenda" | "documents" | "profil";

async function action(rpc: string, args: any, repli: () => Promise<any>) {
  // Fonction sécurisée (0137) si présente, sinon trace équivalente dans le fil de la mission
  try { await sbRpc(rpc, args); } catch { await repli(); }
}

function Missions({ userId }: { userId: string }) {
  const [liste, setListe] = useState<any[] | null>(null);
  const [ouverte, setOuverte] = useState<any | null>(null);
  const [fil, setFil] = useState<any[]>([]);
  const [texte, setTexte] = useState("");
  const [msg, setMsg] = useState("");
  const charger = () => sbSelect<any>("bellaia_missions", `assigne_a=eq.${userId}&select=id,titre,details,pole,statut,priorite,date_prevue,echeance,created_at&order=echeance.asc.nullslast,created_at.desc&limit=200`).then(setListe).catch(() => setListe([]));
  useEffect(() => { charger(); }, [userId]);
  const chargerFil = async (m: any) => setFil(await sbSelect<any>("bellaia_missions_fil", `mission_id=eq.${m.id}&select=id,type,texte,fichier_chemin,created_at,auteur&order=created_at.asc`).catch(() => []));
  const ouvrir = async (m: any) => { setOuverte(m); setMsg(""); await chargerFil(m); };
  const trace = (type: string, t: string, fichier?: string) => sbInsert("bellaia_missions_fil", { mission_id: ouverte.id, auteur: userId, type, texte: t, ...(fichier ? { fichier_chemin: fichier } : {}) });
  const faire = async (f: () => Promise<any>, ok: string) => { try { await f(); setMsg(ok); setTexte(""); await chargerFil(ouverte); } catch { setMsg("Action impossible pour le moment."); } };
  if (ouverte) return <div>
    <button style={{ ...bouton(false), border: "none", paddingLeft: 0 }} onClick={() => { setOuverte(null); charger(); }}>‹ Mes missions</button>
    <div style={carte}>
      <div style={{ fontFamily: SERIF, fontSize: 19 }}>{ouverte.titre || "Mission"}</div>
      <div style={{ fontSize: 13, color: T.doux, margin: "4px 0 8px" }}>{ouverte.pole} · {STATUT[ouverte.statut] || ouverte.statut} · échéance {dateFr(ouverte.echeance || ouverte.date_prevue)}</div>
      {ouverte.details && <div style={{ fontSize: 14.5, whiteSpace: "pre-line" }}>{ouverte.details}</div>}
    </div>
    {msg && <div role="status" style={{ ...carte, background: "#eef5f0", color: T.vert }}>{msg}</div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      <button style={bouton()} onClick={() => faire(() => action("mission_accuser_reception", { p_id: ouverte.id }, () => trace("statut", "Réception confirmée")), "Réception confirmée.")}>Accuser réception</button>
      {[25, 50, 75].map(p => <button key={p} style={bouton(false)} onClick={() => faire(() => action("mission_avancer", { p_id: ouverte.id, p_progression: p, p_commentaire: null }, async () => { await sbRpc("mission_maj_assignee", { p_id: ouverte.id, p_statut: "en_cours", p_commentaire: null }).catch(() => {}); await trace("statut", `Avancement : ${p} %`); }), `Avancement ${p} % enregistré.`)}>{p} %</button>)}
      <button style={bouton(false)} onClick={() => faire(() => action("mission_avancer", { p_id: ouverte.id, p_progression: 100, p_commentaire: null }, async () => { await sbRpc("mission_maj_assignee", { p_id: ouverte.id, p_statut: "a_valider", p_commentaire: null }); await trace("statut", "Avancement : 100 % — soumis à validation"); }), "Mission soumise à validation.")}>Soumettre à validation</button>
    </div>
    <div style={carte}>
      <textarea style={{ ...champ, minHeight: 80, marginBottom: 8 }} placeholder="Message, problème ou demande…" value={texte} maxLength={2000} onChange={e => setTexte(e.target.value)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button style={bouton()} disabled={!texte.trim()} onClick={() => faire(() => trace("commentaire", texte.trim()), "Message ajouté.")}>Envoyer</button>
        <button style={bouton(false)} disabled={!texte.trim()} onClick={() => faire(() => trace("commentaire", "[Problème signalé] " + texte.trim()), "Problème signalé à la fondatrice.")}>Signaler un problème</button>
        <button style={bouton(false)} disabled={!texte.trim()} onClick={() => faire(() => trace("commentaire", "[Demande de transfert] " + texte.trim()), "Demande de transfert envoyée.")}>Demander un transfert</button>
        <label style={{ ...bouton(false), display: "inline-flex", alignItems: "center", cursor: "pointer" }}>📎 Pièce jointe
          <input type="file" hidden accept="image/*,application/pdf" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 15 * 1024 * 1024) { setMsg("Fichier trop volumineux (15 Mo maximum)."); return; }
            await faire(async () => { const chemin = await deposerPrive(`missions/${ouverte.id}/${Date.now()}-${nomFichierSur(f.name)}`, f); await trace("fichier", f.name, chemin); }, "Pièce jointe déposée."); }} />
        </label>
      </div>
    </div>
    <div style={carte}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Historique</div>
      {fil.length === 0 ? <div style={{ color: T.doux, fontSize: 14 }}>Aucun échange pour l'instant.</div> : fil.map(x => <div key={x.id} style={{ borderTop: `1px solid ${T.ligne}`, padding: "8px 0", fontSize: 14 }}>
        <div style={{ fontSize: 12, color: T.doux }}>{new Date(x.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{x.auteur === userId ? " · vous" : ""}</div>
        {x.fichier_chemin ? <button style={{ ...bouton(false), minHeight: 36, marginTop: 4 }} onClick={async () => { const l = await lienPrive(x.fichier_chemin); if (l) window.open(l, "_blank"); }}>📎 {x.texte || "Fichier"}</button> : <div>{x.texte}</div>}
      </div>)}
    </div>
  </div>;
  if (!liste) return <div style={{ color: T.doux }}>Chargement…</div>;
  return liste.length === 0 ? <div style={carte}>Aucune mission ne vous est attribuée pour le moment. Les missions transmises depuis l'Administration générale apparaîtront ici.</div>
    : <>{liste.map(m => <button key={m.id} onClick={() => ouvrir(m)} style={{ ...carte, display: "block", width: "100%", textAlign: "left", fontFamily: SA, color: T.texte }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{m.titre || "Mission"}</strong><span style={{ fontSize: 12.5, color: m.statut === "a_faire" ? T.or : T.doux }}>{STATUT[m.statut] || m.statut}</span></div>
        <div style={{ fontSize: 13, color: T.doux, marginTop: 3 }}>{m.pole} · échéance {dateFr(m.echeance || m.date_prevue)}</div>
      </button>)}</>;
}

function Documents({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<any[] | null>(null);
  const [pj, setPj] = useState<any[]>([]);
  useEffect(() => {
    sbSelect<any>("bellaia_documents", "select=id,titre,categorie,statut,url,created_at&order=created_at.desc&limit=100").then(setDocs).catch(() => setDocs([]));
    sbSelect<any>("bellaia_missions", `assigne_a=eq.${userId}&select=id`).then(async ms => { if (!ms.length) return; setPj(await sbSelect<any>("bellaia_missions_fil", `type=eq.fichier&mission_id=in.(${ms.map((m: any) => m.id).join(",")})&select=id,texte,fichier_chemin,created_at&order=created_at.desc`).catch(() => [])); }).catch(() => {});
  }, [userId]);
  if (!docs) return <div style={{ color: T.doux }}>Chargement…</div>;
  return <>
    <div style={carte}><div style={{ fontWeight: 700, marginBottom: 6 }}>Documents partagés avec vous</div>
      {docs.length === 0 ? <div style={{ color: T.doux, fontSize: 14 }}>Aucun document pour le moment.</div> : docs.map(d => <div key={d.id} style={{ borderTop: `1px solid ${T.ligne}`, padding: "8px 0", fontSize: 14.5 }}>{d.titre || "Document"} <span style={{ color: T.doux, fontSize: 12.5 }}>· {d.categorie || "—"}</span></div>)}</div>
    <div style={carte}><div style={{ fontWeight: 700, marginBottom: 6 }}>Pièces jointes de mes missions</div>
      {pj.length === 0 ? <div style={{ color: T.doux, fontSize: 14 }}>Aucune pièce jointe.</div> : pj.map(x => <button key={x.id} style={{ ...bouton(false), display: "block", marginTop: 6 }} onClick={async () => { const l = await lienPrive(x.fichier_chemin); if (l) window.open(l, "_blank"); }}>📎 {x.texte || "Fichier"}</button>)}</div>
    <div style={{ ...carte, fontSize: 13.5, color: T.doux }}>Documents à fournir : la fondatrice vous les demandera dans une mission ; déposez-les en pièce jointe de cette mission.</div>
  </>;
}

function Profil({ user }: { user: any }) {
  const [roles, setRoles] = useState<any[] | null>(null);
  const [perms, setPerms] = useState<any[]>([]);
  useEffect(() => {
    sbSelect<any>("bellaia_roles", `user_id=eq.${user?.id}&select=role,statut,libelle,created_at`).then(setRoles).catch(() => setRoles([]));
    sbSelect<any>("bellaia_permissions", `user_id=eq.${user?.id}&select=*`).then(setPerms).catch(() => setPerms([]));
  }, [user?.id]);
  const actives = perms.filter(p => (p.statut ?? "active") === "active" && (!p.expire_le || new Date(p.expire_le) > new Date()));
  const poles = useMemo(() => Array.from(new Set(actives.map(p => p.univers === "*" ? "Tous les pôles" : p.univers))), [perms]);
  return <>
    <div style={carte}><div style={{ fontFamily: SERIF, fontSize: 19 }}>{[user?.prenom, user?.nom].filter(Boolean).join(" ") || "Mon profil professionnel"}</div>
      <div style={{ fontSize: 13.5, color: T.doux }}>{user?.email}</div></div>
    <div style={carte}><div style={{ fontWeight: 700, marginBottom: 6 }}>Rôles</div>
      {!roles ? "…" : [{ role: user?.role, statut: "actif", libelle: "rôle principal" }, ...roles].filter(r => r.role && r.role !== "cliente").map((r, i) => <div key={i} style={{ borderTop: `1px solid ${T.ligne}`, padding: "8px 0", fontSize: 14.5, display: "flex", justifyContent: "space-between" }}><span>{r.role}{r.libelle ? ` · ${r.libelle}` : ""}</span><span style={{ color: r.statut === "actif" ? T.vert : T.rouge, fontSize: 13 }}>{r.statut}</span></div>)}</div>
    <div style={carte}><div style={{ fontWeight: 700, marginBottom: 6 }}>Pôles et autorisations</div>
      {actives.length === 0 ? <div style={{ color: T.doux, fontSize: 14 }}>Aucune autorisation particulière : vous voyez vos missions et vos documents.</div>
        : <><div style={{ fontSize: 14, marginBottom: 6 }}>Pôles : {poles.join(", ")}</div>{actives.map(p => <div key={p.id} style={{ fontSize: 13.5, color: T.doux }}>• {p.permission}{p.expire_le ? ` (jusqu'au ${dateFr(p.expire_le)})` : ""}</div>)}</>}</div>
    <div style={{ ...carte, fontSize: 13.5, color: T.doux }}>Vos rôles et autorisations sont attribués par la fondatrice. Pour une modification, envoyez un message depuis une mission ou « Aide et contact ».</div>
  </>;
}

export default function EspacePro({ user, titre = "Mon espace professionnel" }: { user: any; titre?: string }) {
  const [onglet, setOnglet] = useState<Onglet>("accueil");
  const [resume, setResume] = useState<{ afaire: number; encours: number; avalider: number } | null>(null);
  useEffect(() => { sbSelect<any>("bellaia_missions", `assigne_a=eq.${user?.id}&select=statut`).then(l => setResume({ afaire: l.filter((m: any) => m.statut === "a_faire").length, encours: l.filter((m: any) => m.statut === "en_cours").length, avalider: l.filter((m: any) => m.statut === "a_valider").length })).catch(() => setResume({ afaire: 0, encours: 0, avalider: 0 })); }, [user?.id, onglet]);
  const ONGLETS: [Onglet, string][] = [["accueil", "Accueil"], ["missions", "Missions"], ["agenda", "Agenda"], ["documents", "Documents"], ["profil", "Profil"]];
  return (
    <div style={{ minHeight: "100dvh", background: T.fond, color: T.texte, fontFamily: SA }}>
      <div style={{ padding: "12px 14px 6px" }}><h1 style={{ fontFamily: SERIF, fontSize: 22, margin: 0 }}>{titre}</h1></div>
      <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "6px 12px 10px", borderBottom: `1px solid ${T.ligne}` }}>
        {ONGLETS.map(([k, l]) => <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)} style={{ ...bouton(onglet === k), whiteSpace: "nowrap", flexShrink: 0 }}>{l}</button>)}
      </div>
      <div style={{ padding: "14px 14px 40px", maxWidth: 680, margin: "0 auto" }}>
        {onglet === "accueil" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["À faire", resume?.afaire], ["En cours", resume?.encours], ["À valider", resume?.avalider]].map(([l, n]) => <div key={l as string} style={{ ...carte, marginBottom: 0, textAlign: "center" }}><div style={{ fontSize: 24, fontFamily: SERIF }}>{n ?? "…"}</div><div style={{ fontSize: 12.5, color: T.doux }}>{l}</div></div>)}
          </div>
          <button style={{ ...bouton(), width: "100%", marginBottom: 8 }} onClick={() => setOnglet("missions")}>Voir mes missions</button>
          <button style={{ ...bouton(false), width: "100%" }} onClick={() => setOnglet("agenda")}>Mon agenda professionnel</button>
          <div style={{ ...carte, marginTop: 12, fontSize: 13.5, color: T.doux }}>Messagerie interne : ouverte après sa mise en sécurité. En attendant, échangez dans le fil de chaque mission.</div>
        </>}
        {onglet === "missions" && <Missions userId={user?.id} />}
        {onglet === "agenda" && <CalendrierPremium m={{ ...MARQUES.STUDIO, nom: "Bellaïa", logo: MARQUES.GENERAL.logo }} role="assistante" userId={user?.id} titre="Agenda professionnel" />}
        {onglet === "documents" && <Documents userId={user?.id} />}
        {onglet === "profil" && <Profil user={user} />}
      </div>
    </div>
  );
}
