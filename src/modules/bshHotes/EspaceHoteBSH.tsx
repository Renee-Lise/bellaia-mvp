"use client";
// ═══════════════════════════════════════════════════════════
// Espace HÔTE / HÔTESSE — Bella'Secret Home (iPhone d'abord).
// 16 rubriques ; chaque hôte ne voit que ses propres informations.
// Actions : accepter / refuser une mission, disponibilités, documents,
// messagerie, signalements. En simulation (0128 non appliquée), les
// actions modifient seulement l'aperçu : rien n'est écrit en base.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { BSH, SERIF, SANS, TYPES_MISSION, STATUT_MISSION, ETAPES, FORMATIONS, CHARTE, chargerEspace, rpc, ecrire, dateFr, type Donnees } from "./bshHotesLib";
import { deposerPrive, nomFichierSur } from "../equipe/equipeLib";
import { sbRpc } from "../events/eventsAtelierLib";

// Transmission sécurisée (migration 0132) : dépôt dans le dossier privé de l'hôte
// (hotes/<hôte>/<document>/…), lisible par la fondatrice seule ; puis enregistrement.
const TAILLE_MAX = 10 * 1024 * 1024;
async function transmettreDocument(hoteId: string, docId: string, f: File): Promise<string> {
  if (!/^(image\/(jpeg|png|heic|heif|webp)|application\/pdf)$/.test(f.type || "")) throw new Error("Format accepté : photo (JPEG, PNG, HEIC) ou PDF.");
  if (f.size > TAILLE_MAX) throw new Error("Fichier trop lourd (10 Mo maximum).");
  const chemin = `hotes/${hoteId}/${docId}/${Date.now()}-${nomFichierSur(f.name)}`;
  try { await deposerPrive(chemin, f, f.type); }
  catch (e: any) { if (/row-level|policy|403|Unauthorized|not allowed/i.test(String(e?.message || e))) throw new Error("PAS_ACTIVE"); throw e; }
  try { await sbRpc("bsh_hote_document_depose", { p_doc: docId, p_chemin: chemin }); }
  catch (e: any) { if (/does not exist|404|PGRST202/i.test(String(e?.message || e))) throw new Error("PAS_ACTIVE"); throw e; }
  return chemin;
}

type Rub = "accueil" | "profil" | "candidature" | "dispos" | "planning" | "missions" | "evenements" | "invitations" | "presences" | "interventions" | "remunerations" | "documents" | "messages" | "formations" | "charte" | "signalement" | "menu";
const RUBRIQUES: [Rub, string, string][] = [
  ["accueil", "Tableau de bord", "✨"], ["profil", "Mon profil", "👤"], ["candidature", "Ma candidature", "📝"], ["dispos", "Mes disponibilités", "🗓"],
  ["planning", "Mon planning", "🕰"], ["missions", "Mes missions", "🎭"], ["evenements", "Événements BSH", "🕯"], ["invitations", "Mes invitations", "✉️"],
  ["presences", "Mes présences", "✅"], ["interventions", "Mes comptes rendus", "🗒"], ["remunerations", "Mes rémunérations", "💶"], ["documents", "Documents et contrats", "📁"],
  ["messages", "Messagerie", "💬"], ["formations", "Mes formations", "🎓"], ["charte", "La charte BSH", "📜"], ["signalement", "Signaler un incident", "🛡"],
];
const carte: React.CSSProperties = { background: "linear-gradient(160deg, rgba(58,15,28,0.55), rgba(22,9,13,0.9))", border: `1px solid ${BSH.ligne}`, borderRadius: 18, padding: 14 };
const bouton = (fort = false, c = BSH.or): React.CSSProperties => ({ minHeight: 44, padding: "10px 14px", borderRadius: 999, border: `1px solid ${fort ? c : BSH.ligne}`, background: fort ? `linear-gradient(135deg, ${c}, ${c}cc)` : "rgba(255,255,255,0.04)", color: fort ? BSH.noir : BSH.texte, fontWeight: 800, fontSize: 14, fontFamily: SANS, cursor: "pointer" });
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "10px 12px", borderRadius: 12, border: `1px solid ${BSH.ligne}`, background: "rgba(255,255,255,0.05)", color: BSH.texte, fontSize: 16, fontFamily: SANS };
const titre = (t: string) => <div style={{ fontFamily: SERIF, fontSize: 22, color: BSH.orClair, margin: "4px 0 10px" }}>{t}</div>;
const puce = (txt: string, c: string) => <span style={{ fontSize: 11, fontWeight: 800, color: c, border: `1px solid ${c}55`, background: `${c}18`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{txt}</span>;

export default function EspaceHoteBSH({ apercuHote }: { apercuHote?: string }) {
  const [d, setD] = useState<Donnees | null>(null);
  const [moi, setMoi] = useState<string | null>(apercuHote || null);
  const [rub, setRub] = useState<Rub>("accueil");
  const [msg, setMsg] = useState("");
  useEffect(() => { (async () => {
    const x = await chargerEspace(); setD(x);
    if (!apercuHote) { if (x.simulation) setMoi(x.hotes[0]?.id || null); else try { setMoi(await rpc("bsh_mon_hote", {})); } catch { setMoi(null); } }
  })(); }, [apercuHote]);
  const h = useMemo(() => d?.hotes.find((x: any) => x.id === moi), [d, moi]);
  if (!d) return <div style={{ color: BSH.doux, padding: 20, fontFamily: SANS }}>Chargement…</div>;
  if (!h) return <div style={{ ...carte, margin: 16, color: BSH.texte, fontFamily: SANS }}>Votre profil hôte n'est pas encore actif. Votre candidature est en cours d'examen par la fondatrice.</div>;

  // Titulaire OU remplaçant·e (0141) : la base ne renvoie de toute façon que ces missions
  const mesMissions = d.missions.filter((m: any) => m.hote_id === h.id || m.remplacant_id === h.id);
  const aRepondre = mesMissions.filter((m: any) => m.statut === "proposee" && m.hote_id === h.id); // seul·e le ou la titulaire répond
  const prochaines = mesMissions.filter((m: any) => ["acceptee", "confirmee"].includes(m.statut)).sort((a: any, b: any) => String(a.date_mission || "").localeCompare(String(b.date_mission || "")));
  const nonLus = d.messages.filter((m: any) => m.hote_id === h.id && m.de_fondatrice && !m.lu).length;
  const docsAttente = d.documents.filter((x: any) => x.hote_id === h.id && ["a_fournir", "a_signer"].includes(x.statut)).length;
  const maj = (cle: keyof Donnees, f: (l: any[]) => any[]) => setD(x => x ? ({ ...x, [cle]: f((x as any)[cle]) }) : x);
  const avertir = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const repondre = async (m: any, reponse: "acceptee" | "refusee") => {
    if (d.simulation) { maj("missions", l => l.map(x => x.id === m.id ? { ...x, statut: reponse, reponse_le: new Date().toISOString() } : x)); avertir(reponse === "acceptee" ? "Mission acceptée (simulation)." : "Mission refusée (simulation)."); return; }
    try { await rpc("bsh_hote_repondre", { p_mission: m.id, p_reponse: reponse, p_message: null }); maj("missions", l => l.map(x => x.id === m.id ? { ...x, statut: reponse } : x)); avertir("Réponse envoyée."); } catch (e: any) { avertir("❌ " + String(e?.message || e)); }
  };
  const etapesFaites = new Set(h.etapes || []);
  const progression = Math.round(etapesFaites.size / ETAPES.length * 100);

  const vue = (() => { switch (rub) {
    case "menu": return <>{titre("Mon espace")}<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {RUBRIQUES.map(([k, l, i]) => <button key={k} onClick={() => setRub(k)} style={{ ...carte, padding: "12px 6px", color: BSH.texte, fontFamily: SANS, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minHeight: 92 }}><span style={{ fontSize: 24 }}>{i}</span><span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{l}</span></button>)}</div></>;
    case "accueil": return <>
      <div style={{ ...carte, background: `radial-gradient(120% 140% at 100% 0%, ${BSH.rose}33, transparent 55%), linear-gradient(160deg, ${BSH.bordeaux}, ${BSH.noir})` }}>
        <div style={{ fontSize: 12, color: BSH.rose, letterSpacing: 2, textTransform: "uppercase" }}>Bonsoir</div>
        <div style={{ fontFamily: SERIF, fontSize: 28, color: BSH.orClair }}>{h.pseudo_scene || h.prenom}</div>
        <div style={{ fontSize: 13, color: BSH.doux, marginTop: 2 }}>{h.ville} · {(h.competences || []).map((c: string) => TYPES_MISSION.find(t => t[0] === c)?.[1] || c).join(" · ")}</div>
        <div style={{ marginTop: 12, fontSize: 12, color: BSH.doux }}>Parcours d'intégration — {progression} %</div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, marginTop: 4 }}><div style={{ height: 6, width: `${progression}%`, borderRadius: 99, background: `linear-gradient(90deg, ${BSH.rose}, ${BSH.or})` }} /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {puce(h.autorise_missions ? "Missions réelles autorisées" : "Missions réelles : en attente d'autorisation", h.autorise_missions ? BSH.ok : BSH.alerte)}
          {puce(h.autorise_remuneration ? "Rémunération autorisée" : "Rémunération : simulation", h.autorise_remuneration ? BSH.ok : BSH.doux)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[["À répondre", aRepondre.length, "missions"], ["Messages", nonLus, "messages"], ["Documents", docsAttente, "documents"]].map(([l, n, r]: any) =>
          <button key={l} onClick={() => setRub(r)} style={{ ...carte, padding: 12, cursor: "pointer", textAlign: "left" }}><div style={{ fontFamily: SERIF, fontSize: 26, color: n ? BSH.orClair : BSH.doux }}>{n}</div><div style={{ fontSize: 12, color: BSH.doux }}>{l}</div></button>)}
      </div>
      {aRepondre.map((m: any) => <CarteMission key={m.id} m={m} d={d} onRepondre={repondre} />)}
      <div style={{ ...carte }}><div style={{ fontFamily: SERIF, fontSize: 17, color: BSH.orClair, marginBottom: 6 }}>Prochainement</div>
        {prochaines.length ? prochaines.map((m: any) => <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: `1px solid ${BSH.ligne}` }}><span style={{ fontSize: 14 }}>{TYPES_MISSION.find(t => t[0] === m.role_mission)?.[2]} {m.titre}</span><span style={{ fontSize: 12, color: BSH.doux }}>{dateFr(m.date_mission)} · {m.heure_debut?.slice(0, 5)}</span></div>) : <div style={{ fontSize: 13, color: BSH.doux }}>Aucune mission prévue.</div>}
      </div>
    </>;
    case "missions": return <>{titre("Mes missions")}{mesMissions.length ? mesMissions.map((m: any) => <CarteMission key={m.id} m={m} d={d} moi={h.id} onRepondre={repondre} majMission={(id: string, patch: any) => maj("missions", l => l.map(x => x.id === id ? { ...x, ...patch } : x))} majPublication={(id: string, patch: any) => maj("publications" as any, l => (l || []).map((x: any) => x.id === id ? { ...x, ...patch } : x))} avertir={avertir} />) : <div style={{ color: BSH.doux }}>Aucune mission.</div>}</>;
    case "planning": return <>{titre("Mon planning")}{[...prochaines, ...d.disponibilites.filter((x: any) => x.hote_id === h.id)].sort((a: any, b: any) => (a.date_mission || a.jour).localeCompare(b.date_mission || b.jour)).map((x: any) =>
      <div key={x.id} style={{ ...carte, display: "flex", gap: 12, alignItems: "center" }}><div style={{ textAlign: "center", minWidth: 54 }}><div style={{ fontFamily: SERIF, fontSize: 24, color: BSH.orClair }}>{new Date((x.date_mission || x.jour) + "T12:00").getDate()}</div><div style={{ fontSize: 11, color: BSH.doux, textTransform: "uppercase" }}>{new Date((x.date_mission || x.jour) + "T12:00").toLocaleDateString("fr-FR", { month: "short" })}</div></div>
        <div style={{ flex: 1 }}>{x.titre ? <><b>{x.titre}</b><div style={{ fontSize: 12, color: BSH.doux }}>{x.heure_debut?.slice(0, 5)} – {x.heure_fin?.slice(0, 5)} · {x.lieu}</div></> : <><b style={{ color: x.type === "disponible" ? BSH.ok : BSH.rouge }}>{x.type === "disponible" ? "Disponible" : "Indisponible"}</b><div style={{ fontSize: 12, color: BSH.doux }}>{x.debut ? `${x.debut.slice(0, 5)} – ${x.fin?.slice(0, 5)}` : "Journée"}</div></>}</div></div>)}</>;
    case "dispos": return <Dispos d={d} h={h} maj={maj} avertir={avertir} />;
    case "evenements": return <>{titre("Événements Bella'Secret Home")}{d.evenements.filter((e: any) => e.statut !== "brouillon" || mesMissions.some((m: any) => m.evenement_id === e.id)).map((e: any) =>
      <div key={e.id} style={{ ...carte, display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 26, background: `linear-gradient(135deg, ${BSH.bordeaux}, ${BSH.rose}55)` }}>{e.ico}</div>
        <div><div style={{ fontFamily: SERIF, fontSize: 17, color: BSH.orClair }}>{e.nom}</div><div style={{ fontSize: 12, color: BSH.doux }}>{dateFr(e.date_evenement)} · {e.lieu} · {e.capacite} places</div>{mesMissions.some((m: any) => m.evenement_id === e.id) && <div style={{ marginTop: 4 }}>{puce("Vous êtes dans l'équipe", BSH.rose)}</div>}</div></div>)}</>;
    case "invitations": return <>{titre("Invitations")}{h.permissions?.voir_invites ? d.invitations.filter((i: any) => mesMissions.some((m: any) => m.evenement_id === i.evenement_id)).map((i: any) => <div key={i.id} style={{ ...carte, display: "flex", justifyContent: "space-between" }}><span>{i.nom_destinataire}</span><span style={{ fontFamily: "monospace", color: BSH.orClair }}>{i.code}</span></div>)
      : <div style={{ ...carte, fontSize: 14, color: BSH.doux }}>🔒 L'accès aux listes d'invités n'est pas activé pour votre profil. La fondatrice l'active individuellement, uniquement pour les missions d'accueil.</div>}</>;
    case "presences": return <>{titre("Mes présences")}{mesMissions.filter((m: any) => m.statut === "confirmee").length ? mesMissions.filter((m: any) => m.statut === "confirmee").map((m: any) => <div key={m.id} style={carte}><b>{m.titre}</b><div style={{ display: "flex", gap: 8, marginTop: 8 }}><button style={bouton(true)} onClick={async () => { if (d.simulation) return avertir("Arrivée pointée (simulation)."); try { await rpc("bsh_hote_pointer", { p_mission: m.id, p_type: "arrivee" }); avertir("Arrivée enregistrée."); } catch (e: any) { avertir("❌ " + e.message); } }}>Pointer mon arrivée</button><button style={bouton()} onClick={async () => { if (d.simulation) return avertir("Départ pointé (simulation)."); try { await rpc("bsh_hote_pointer", { p_mission: m.id, p_type: "depart" }); avertir("Départ enregistré."); } catch (e: any) { avertir("❌ " + e.message); } }}>Mon départ</button></div></div>)
      : <div style={{ ...carte, color: BSH.doux, fontSize: 14 }}>Le pointage s'ouvre le jour d'une mission confirmée par la fondatrice.</div>}</>;
    case "interventions": case "signalement": return <Signalement d={d} h={h} mode={rub} maj={maj} avertir={avertir} missions={mesMissions} />;
    case "remunerations": { const r = d.remunerations.filter((x: any) => x.hote_id === h.id); const tot = r.reduce((s: number, x: any) => s + Number(x.montant), 0); return <>{titre("Mes rémunérations")}
      <div style={{ ...carte }}><div style={{ fontSize: 12, color: BSH.doux }}>Total prévu</div><div style={{ fontFamily: SERIF, fontSize: 30, color: BSH.orClair }}>{tot.toFixed(2).replace(".", ",")} €</div><div style={{ fontSize: 12, color: BSH.alerte, marginTop: 4 }}>Montants indicatifs en simulation : aucun paiement n'est effectué tant que votre statut, vos documents et l'autorisation de la fondatrice ne sont pas validés.</div></div>
      {r.map((x: any) => <div key={x.id} style={{ ...carte, display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 14 }}>{x.libelle}</span><span style={{ whiteSpace: "nowrap" }}>{Number(x.montant).toFixed(2).replace(".", ",")} € {puce(x.simulation ? "simulation" : x.statut, x.simulation ? BSH.doux : BSH.ok)}</span></div>)}</>; }
    case "documents": return <>{titre("Documents et contrats")}{d.documents.filter((x: any) => x.hote_id === h.id).map((x: any) => <div key={x.id} style={{ ...carte, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div><b style={{ fontSize: 14 }}>{x.titre}</b><div>{puce({ a_fournir: "À fournir", a_signer: "À signer", recu: "Reçu", signe: "Signé", valide: "Validé", expire: "Expiré" }[x.statut as string] || x.statut, ["signe", "valide", "recu"].includes(x.statut) ? BSH.ok : BSH.alerte)}</div></div>
      {["a_fournir", "a_signer"].includes(x.statut) && <label style={{ ...bouton(true), display: "inline-flex", alignItems: "center" }}>{x.statut === "a_signer" ? "Signer" : "Envoyer"}<input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        if (d.simulation) { maj("documents", l => l.map(y => y.id === x.id ? { ...y, statut: "recu" } : y)); return avertir("Document reçu (simulation : rien n'est envoyé)."); }
        avertir("Envoi sécurisé en cours…");
        try { const chemin = await transmettreDocument(h.id, x.id, f); maj("documents", l => l.map(y => y.id === x.id ? { ...y, statut: "recu", storage_path: chemin } : y)); avertir("✅ Document transmis à la fondatrice, de façon privée."); }
        catch (err: any) { avertir(err?.message === "PAS_ACTIVE" ? "La transmission sécurisée n'est pas encore activée : remettez ce document directement à la fondatrice." : "❌ " + String(err?.message || err)); } }} /></label>}</div>)}
      <div style={{ fontSize: 12, color: BSH.doux }}>Vos documents sont conservés dans un espace privé visible uniquement par la fondatrice.</div></>;
    case "messages": return <Messages d={d} h={h} maj={maj} />;
    case "formations": return <>{titre("Mes formations")}{FORMATIONS.map(f => <details key={f.cle} style={carte}><summary style={{ cursor: "pointer", fontWeight: 800 }}>🎓 {f.titre} <span style={{ color: BSH.doux, fontWeight: 400, fontSize: 12 }}>· {f.duree}</span></summary><ul style={{ margin: "8px 0 0", paddingLeft: 18, color: BSH.texte, fontSize: 14, lineHeight: 1.6 }}>{f.points.map(p => <li key={p}>{p}</li>)}</ul></details>)}</>;
    case "charte": return <>{titre("La charte Bella'Secret Home")}<div style={carte}>{CHARTE.map((c, i) => <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i ? `1px solid ${BSH.ligne}` : "none" }}><span style={{ fontFamily: SERIF, color: BSH.or, fontSize: 18 }}>{i + 1}</span><span style={{ fontSize: 14, lineHeight: 1.5 }}>{c}</span></div>)}
      <div style={{ marginTop: 10, fontSize: 13, color: h.charte_signee_le ? BSH.ok : BSH.alerte }}>{h.charte_signee_le ? `✓ Charte signée le ${new Date(h.charte_signee_le).toLocaleDateString("fr-FR")}` : "Charte à signer (Documents et contrats)"}</div></div></>;
    case "profil": return <>{titre("Mon profil")}<div style={carte}>
      {[["Nom de scène", h.pseudo_scene], ["Prénom", h.prenom], ["Ville", h.ville], ["Langues", (h.langues || []).join(", ")], ["Statut juridique", ({ auto_entrepreneur: "Auto-entrepreneur", salarie: "Salarié·e", benevole: "Bénévole", a_definir: "À définir" } as any)[h.statut_juridique] || "À renseigner"]].map(([l, v]) =>
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${BSH.ligne}` }}><span style={{ color: BSH.doux, fontSize: 13 }}>{l}</span><span style={{ fontSize: 14 }}>{v || "—"}</span></div>)}</div>
      <div style={carte}><div style={{ fontFamily: SERIF, color: BSH.orClair, marginBottom: 6 }}>Mes autorisations</div>
        {[["Missions réelles", h.autorise_missions], ["Rémunération", h.autorise_remuneration], ["Voir les invités", h.permissions?.voir_invites], ["Pointer les invités", h.permissions?.pointer_invites], ["Messagerie", h.permissions?.messagerie]].map(([l, v]: any) =>
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 14 }}>{l}</span>{puce(v ? "Activée" : "Non activée", v ? BSH.ok : BSH.doux)}</div>)}
        <div style={{ fontSize: 12, color: BSH.doux, marginTop: 6 }}>Les autorisations sont accordées individuellement par la fondatrice.</div></div></>;
    case "candidature": return <>{titre("Mon parcours")}<div style={carte}>{ETAPES.map((e, i) => { const fait = etapesFaites.has(e.cle); return (
      <div key={e.cle} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${BSH.ligne}` : "none" }}>
        <div style={{ width: 28, height: 28, borderRadius: 99, flex: "none", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, background: fait ? `linear-gradient(135deg, ${BSH.rose}, ${BSH.or})` : "rgba(255,255,255,0.06)", color: fait ? BSH.noir : BSH.doux }}>{fait ? "✓" : i + 1}</div>
        <div><div style={{ fontWeight: 800, fontSize: 14, color: fait ? BSH.texte : BSH.doux }}>{e.titre}</div><div style={{ fontSize: 12, color: BSH.doux }}>{e.detail}{e.qui === "fondatrice" ? " — étape réalisée par la fondatrice" : ""}</div></div></div>); })}</div>
      <div style={{ fontSize: 12, color: BSH.doux }}>Candidature, compte actif et autorisation de travailler sont trois étapes distinctes.</div></>;
  } })();

  return (
    <div style={{ background: `radial-gradient(90% 60% at 100% 0%, ${BSH.bordeaux}, ${BSH.noir} 70%)`, minHeight: "100%", color: BSH.texte, fontFamily: SANS, paddingBottom: 96 }}>
      <div style={{ padding: "14px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontFamily: SERIF, fontSize: 19, color: BSH.orClair, letterSpacing: 0.5 }}>Bella'Secret Home</div><div style={{ fontSize: 11, color: BSH.rose, letterSpacing: 2.5, textTransform: "uppercase" }}>Espace hôtes</div></div>
        {d.simulation && puce("Simulation", BSH.alerte)}
      </div>
      {msg && <div style={{ ...carte, margin: "6px 16px", fontSize: 14 }}>{msg}</div>}
      <div style={{ padding: "6px 16px", display: "flex", flexDirection: "column", gap: 10 }}>{vue}</div>
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, paddingBottom: "max(10px, env(safe-area-inset-bottom))", paddingTop: 8, background: "rgba(11,7,9,0.94)", borderTop: `1px solid ${BSH.ligne}`, display: "flex", justifyContent: "space-around", backdropFilter: "blur(10px)" }}>
        {([["accueil", "Accueil", "✨"], ["missions", "Missions", "🎭"], ["planning", "Planning", "🗓"], ["messages", "Messages", "💬"], ["menu", "Plus", "☰"]] as [Rub, string, string][]).map(([k, l, i]) =>
          <button key={k} onClick={() => setRub(k)} style={{ background: "none", border: "none", color: rub === k ? BSH.or : BSH.doux, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, fontFamily: SANS, minWidth: 56, position: "relative" }}>
            <span style={{ fontSize: 20 }}>{i}</span>{l}{k === "messages" && nonLus > 0 && <span style={{ position: "absolute", top: -2, right: 10, background: BSH.rose, color: BSH.noir, borderRadius: 99, fontSize: 10, padding: "0 5px", fontWeight: 900 }}>{nonLus}</span>}
          </button>)}
      </nav>
    </div>
  );
}

const EXEC: Record<string, [string, string]> = { a_faire: ["À faire", BSH.or], en_cours: ["En cours", BSH.rose], realisee: ["Réalisée", BSH.ok], non_realisee: ["Non réalisée", BSH.rouge], reportee: ["Reportée", BSH.alerte], annulee: ["Annulée", BSH.doux] };
const ESP: Record<string, string> = { chaine: "Chaîne BSH", cercle: "Cercle BSH", lounge: "BSH Lounge", evenement: "Événement" };
/** Exécution et preuve de publication d'une mission d'animation (fonctions contrôlées de 0141). */
export function SuiviAnimation({ m, d, moi, majMission, majPublication, avertir }: any) {
  const [cr, setCr] = useState(m.compte_rendu || ""); const [preuve, setPreuve] = useState(""); const [ouvrirPreuve, setOuvrirPreuve] = useState(false);
  const pub = (d.publications || []).find((p: any) => p.id === m.communication_id);
  const res = (d.ressources || []).filter((r: any) => (m.ressources || []).includes(r.id));
  const bloque = ["annulee", "reportee"].includes(m.statut_execution) || ["annulee", "refusee"].includes(m.statut);
  const declarer = async (statut: string) => {
    if (["realisee", "non_realisee"].includes(statut) && cr.trim().length < 10) return avertir("Un compte rendu d'au moins 10 caractères est demandé.");
    try { await rpc("bsh_hote_execution", { p_mission: m.id, p_statut: statut, p_compte_rendu: cr.trim() || null }); majMission(m.id, { statut_execution: statut, compte_rendu: cr.trim() || m.compte_rendu }); avertir("✅ Enregistré."); }
    catch (e: any) { avertir(/function|schema cache|PGRST202/i.test(String(e?.message || e)) ? "Le suivi d'exécution sera activé prochainement par la fondatrice." : "❌ " + String(e?.message || e)); }
  };
  const confirmer = async () => {
    if (preuve.trim().length < 8) return avertir("Décrivez la preuve (8 caractères au moins) : lien du message, capture conservée…");
    try { await rpc("bsh_confirmer_publication", { p_communication: pub.id, p_preuve: preuve.trim(), p_url: null }); majPublication(pub.id, { statut: "publie" }); setOuvrirPreuve(false); avertir("✅ Publication confirmée avec votre preuve."); }
    catch (e: any) { avertir("❌ " + String(e?.message || e)); }
  };
  const [le, ce] = EXEC[m.statut_execution || "a_faire"] || EXEC.a_faire;
  return <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ fontSize: 13, color: BSH.doux }}>{m.remplacant_id === moi ? "Vous êtes remplaçant·e sur cette mission" : "Vous êtes responsable de cette mission"}{m.espace ? ` · ${ESP[m.espace] || m.espace}` : ""}</span><span style={{ fontSize: 11, fontWeight: 800, color: ce, border: `1px solid ${ce}55`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{le}</span></div>
    {pub && <div style={{ fontSize: 13 }}>📢 <b>{pub.titre}</b> · {pub.statut === "publie" ? "publication confirmée" : "pas encore publiée"}{pub.contenu ? <div style={{ fontSize: 13, color: BSH.doux, whiteSpace: "pre-wrap", marginTop: 4 }}>{pub.contenu}</div> : null}</div>}
    {res.length > 0 && <div style={{ fontSize: 13 }}>Ressources autorisées : {res.map((r: any) => r.url ? <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: BSH.orClair, marginRight: 8 }}>{r.titre}</a> : <span key={r.id} style={{ marginRight: 8 }}>{r.titre}</span>)}</div>}
    {!bloque && <>
      <textarea aria-label="Compte rendu" value={cr} onChange={e => setCr(e.target.value)} placeholder="Compte rendu : déroulé, participation, incident éventuel…" style={{ width: "100%", boxSizing: "border-box", minHeight: 64, borderRadius: 12, border: `1px solid ${BSH.ligne}`, background: "rgba(255,255,255,0.05)", color: BSH.texte, padding: 10, fontSize: 16, fontFamily: SANS }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {m.statut_execution !== "en_cours" && m.statut_execution !== "realisee" && <button style={bouton()} onClick={() => declarer("en_cours")}>Commencer</button>}
        <button style={bouton(true)} onClick={() => declarer("realisee")}>Mission réalisée</button>
        <button style={bouton()} onClick={() => declarer("non_realisee")}>Non réalisée</button>
      </div>
      {pub && pub.statut !== "publie" && ["programme", "pret"].includes(pub.statut) && (ouvrirPreuve ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <textarea aria-label="Preuve de publication" value={preuve} onChange={e => setPreuve(e.target.value)} placeholder="Ex. Message posté dans le Cercle à 21:02, capture conservée" style={{ width: "100%", boxSizing: "border-box", minHeight: 54, borderRadius: 12, border: `1px solid ${BSH.ligne}`, background: "rgba(255,255,255,0.05)", color: BSH.texte, padding: 10, fontSize: 16, fontFamily: SANS }} />
        <div style={{ display: "flex", gap: 6 }}><button style={bouton(true)} onClick={confirmer}>Confirmer avec cette preuve</button><button style={bouton()} onClick={() => setOuvrirPreuve(false)}>Annuler</button></div></div>
        : <button style={bouton()} onClick={() => setOuvrirPreuve(true)}>J'ai publié : confirmer avec une preuve</button>)}
    </>}
    {bloque && <div style={{ fontSize: 12, color: BSH.doux }}>{m.statut_execution === "reportee" ? "Mission reportée par la fondatrice." : "Mission annulée."}{m.motif ? ` Motif : ${m.motif}` : ""}</div>}
  </div>;
}

function CarteMission({ m, d, onRepondre, moi, majMission, majPublication, avertir }: { m: any; d: Donnees; onRepondre: (m: any, r: "acceptee" | "refusee") => void; moi?: string; majMission?: any; majPublication?: any; avertir?: (t: string) => void }) {
  const t = TYPES_MISSION.find(x => x[0] === m.role_mission); const [l, c] = STATUT_MISSION[m.statut] || [m.statut, BSH.doux];
  const ev = d.evenements.find((e: any) => e.id === m.evenement_id);
  return (
    <div style={{ ...carte, borderColor: m.statut === "proposee" ? `${BSH.or}88` : BSH.ligne }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div><div style={{ fontSize: 12, color: BSH.rose }}>{t?.[2]} {t?.[1]}</div><div style={{ fontFamily: SERIF, fontSize: 18, color: BSH.orClair }}>{ev?.nom || m.titre}</div></div>
        <span style={{ fontSize: 11, fontWeight: 800, color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{l}</span>
      </div>
      <div style={{ fontSize: 13, color: BSH.doux, marginTop: 6 }}>📅 {dateFr(m.date_mission)} · {m.heure_debut?.slice(0, 5)} – {m.heure_fin?.slice(0, 5)}<br />📍 {m.lieu}<br />💶 {Number(m.remuneration || 0).toFixed(0)} € indicatif {m.simulation ? "(simulation)" : ""}</div>
      {m.consignes && <div style={{ fontSize: 13, marginTop: 8, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>{m.consignes}</div>}
      {m.statut === "proposee" && (!moi || m.hote_id === moi) && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button style={{ ...bouton(true), flex: 1 }} onClick={() => onRepondre(m, "acceptee")}>Accepter</button><button style={{ ...bouton(), flex: 1 }} onClick={() => onRepondre(m, "refusee")}>Refuser</button></div>}
      {m.statut === "acceptee" && <div style={{ fontSize: 12, color: BSH.doux, marginTop: 8 }}>En attente de confirmation par la fondatrice.</div>}
      {(m.communication_id || m.animation_id || m.statut_execution) && majMission && <SuiviAnimation m={m} d={d} moi={moi} majMission={majMission} majPublication={majPublication} avertir={avertir} />}
    </div>
  );
}

function Dispos({ d, h, maj, avertir }: any) {
  const [jour, setJour] = useState(""); const [debut, setDebut] = useState("18:00"); const [fin, setFin] = useState("23:00"); const [type, setType] = useState("disponible");
  const liste = d.disponibilites.filter((x: any) => x.hote_id === h.id);
  const ajouter = async () => {
    if (!jour) return avertir("Choisissez une date.");
    const ligne = { hote_id: h.id, jour, debut: type === "disponible" ? debut : null, fin: type === "disponible" ? fin : null, type };
    if (d.simulation) { maj("disponibilites", (l: any[]) => [...l, { ...ligne, id: "s" + Date.now() }]); return avertir("Disponibilité ajoutée (simulation)."); }
    try { const r = await ecrire("bsh_hotes_disponibilites", null, ligne); maj("disponibilites", (l: any[]) => [...l, r]); avertir("Disponibilité enregistrée."); } catch (e: any) { avertir("❌ " + e.message); }
  };
  return <>{titre("Mes disponibilités")}
    <div style={carte}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input type="date" style={champ} value={jour} onChange={e => setJour(e.target.value)} />
        <select style={champ} value={type} onChange={e => setType(e.target.value)}><option value="disponible">Disponible</option><option value="indisponible">Indisponible</option></select>
        {type === "disponible" && <><input type="time" style={champ} value={debut} onChange={e => setDebut(e.target.value)} /><input type="time" style={champ} value={fin} onChange={e => setFin(e.target.value)} /></>}
      </div>
      <button style={{ ...bouton(true), width: "100%", marginTop: 10 }} onClick={ajouter}>Ajouter</button>
    </div>
    {liste.map((x: any) => <div key={x.id} style={{ ...carte, display: "flex", justifyContent: "space-between" }}><span>{dateFr(x.jour)}</span><span style={{ color: x.type === "disponible" ? BSH.ok : BSH.rouge }}>{x.type === "disponible" ? `${x.debut?.slice(0, 5)} – ${x.fin?.slice(0, 5)}` : "Indisponible"}</span></div>)}
  </>;
}

function Signalement({ d, h, mode, maj, avertir, missions }: any) {
  const [type, setType] = useState(mode === "signalement" ? "incident" : "compte_rendu"); const [gravite, setGravite] = useState("moyenne"); const [mission, setMission] = useState(""); const [txt, setTxt] = useState("");
  const liste = d.interventions.filter((x: any) => x.hote_id === h.id);
  const envoyer = async () => {
    if (txt.trim().length < 5) return avertir("Décrivez la situation en quelques mots.");
    const ligne = { hote_id: h.id, mission_id: mission || null, type, gravite: type === "incident" ? gravite : null, contenu: txt.trim() };
    if (d.simulation) { maj("interventions", (l: any[]) => [{ ...ligne, id: "s" + Date.now(), traite: false, created_at: new Date().toISOString() }, ...l]); setTxt(""); return avertir("Transmis à la fondatrice (simulation)."); }
    try { const r = await ecrire("bsh_interventions", null, ligne); maj("interventions", (l: any[]) => [r, ...l]); setTxt(""); avertir("Transmis à la fondatrice."); } catch (e: any) { avertir("❌ " + e.message); }
  };
  return <>{titre(mode === "signalement" ? "Signaler un incident" : "Mes comptes rendus")}
    {mode === "signalement" && <div style={{ ...carte, borderColor: `${BSH.rouge}66`, fontSize: 13 }}>En cas de danger immédiat : <b>appelez le 17 (police) ou le 15 (SAMU)</b>, puis prévenez la fondatrice.</div>}
    <div style={carte}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select style={champ} value={type} onChange={e => setType(e.target.value)}><option value="compte_rendu">Compte rendu</option><option value="incident">Incident</option><option value="demande">Demande</option></select>
        {type === "incident" ? <select style={champ} value={gravite} onChange={e => setGravite(e.target.value)}><option value="faible">Gravité faible</option><option value="moyenne">Moyenne</option><option value="haute">Haute</option></select>
          : <select style={champ} value={mission} onChange={e => setMission(e.target.value)}><option value="">Sans mission</option>{missions.map((m: any) => <option key={m.id} value={m.id}>{m.titre}</option>)}</select>}
      </div>
      <textarea style={{ ...champ, minHeight: 100, marginTop: 8 }} placeholder="Décrivez les faits, sans nommer les invités." value={txt} onChange={e => setTxt(e.target.value)} />
      <button style={{ ...bouton(true, type === "incident" ? BSH.rose : BSH.or), width: "100%", marginTop: 8 }} onClick={envoyer}>Transmettre à la fondatrice</button>
    </div>
    {liste.map((x: any) => <div key={x.id} style={carte}><div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontSize: 13 }}>{({ compte_rendu: "Compte rendu", incident: "Incident", demande: "Demande", note: "Note" } as any)[x.type]}</b>{puce(x.traite ? "Traité" : "Transmis", x.traite ? BSH.ok : BSH.or)}</div><div style={{ fontSize: 14, marginTop: 4 }}>{x.contenu}</div></div>)}
  </>;
}

function Messages({ d, h, maj }: any) {
  const [txt, setTxt] = useState("");
  const fil = d.messages.filter((m: any) => m.hote_id === h.id);
  useEffect(() => { if (!d.simulation) rpc("bsh_hote_messages_lus", {}).catch(() => {}); maj("messages", (l: any[]) => l.map(m => m.hote_id === h.id && m.de_fondatrice ? { ...m, lu: true } : m)); }, []);
  const envoyer = async () => {
    const c = txt.trim(); if (!c) return; setTxt("");
    const ligne = { hote_id: h.id, de_fondatrice: false, contenu: c };
    if (d.simulation) return maj("messages", (l: any[]) => [...l, { ...ligne, id: "s" + Date.now(), lu: true, created_at: new Date().toISOString() }]);
    try { const r = await ecrire("bsh_hotes_messages", null, ligne); maj("messages", (l: any[]) => [...l, r]); } catch { /* affiché au prochain chargement */ }
  };
  return <>{titre("Messagerie")}
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{fil.map((m: any) => <div key={m.id} style={{ alignSelf: m.de_fondatrice ? "flex-start" : "flex-end", maxWidth: "82%", padding: "10px 13px", borderRadius: 18, fontSize: 14, lineHeight: 1.45,
      background: m.de_fondatrice ? `linear-gradient(135deg, ${BSH.bordeaux}, #24101a)` : `linear-gradient(135deg, ${BSH.or}, ${BSH.orClair})`, color: m.de_fondatrice ? BSH.texte : BSH.noir, border: m.de_fondatrice ? `1px solid ${BSH.ligne}` : "none" }}>
      {m.de_fondatrice && <div style={{ fontSize: 11, color: BSH.rose, fontWeight: 800 }}>Fondatrice</div>}{m.contenu}<div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: "right" }}>{new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div></div>)}</div>
    <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 86 }}><input style={champ} value={txt} onChange={e => setTxt(e.target.value)} placeholder="Votre message…" onKeyDown={e => e.key === "Enter" && envoyer()} /><button style={bouton(true)} onClick={envoyer}>Envoyer</button></div>
  </>;
}
