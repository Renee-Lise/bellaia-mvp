"use client";
// ═══════════════════════════════════════════════════════════
// Centre de gestion des hôtes BSH — fondatrice.
// Candidatures, profils et autorisations individuelles, événements,
// missions (création, attribution, conditions), disponibilités et
// équipes, invitations, présences, comptes rendus et incidents,
// documents, rémunérations (simulation), suspension / révocation,
// historique. Les règles de la base (0128) sont appliquées ici aussi :
// aucune mission réelle ni rémunération sans les validations requises.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { BSH, SERIF, SANS, TYPES_MISSION, STATUT_MISSION, ETAPES, chargerEspace, ecrire, dateFr, peutConfirmerReelle, peutValiderRemuneration, type Donnees } from "./bshHotesLib";
import EspaceHoteBSH from "./EspaceHoteBSH";

type Vue = "bord" | "candidatures" | "hotes" | "evenements" | "missions" | "equipes" | "invitations" | "presences" | "comptes" | "documents" | "remunerations" | "historique";
const carte: React.CSSProperties = { background: "linear-gradient(160deg, rgba(58,15,28,0.5), rgba(22,9,13,0.92))", border: `1px solid ${BSH.ligne}`, borderRadius: 16, padding: 14 };
const bouton = (fort = false, c = BSH.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 13px", borderRadius: 999, border: `1px solid ${fort ? c : BSH.ligne}`, background: fort ? `linear-gradient(135deg, ${c}, ${c}cc)` : "rgba(255,255,255,0.04)", color: fort ? BSH.noir : BSH.texte, fontWeight: 800, fontSize: 13, fontFamily: SANS, cursor: "pointer", whiteSpace: "nowrap" });
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 42, padding: "9px 11px", borderRadius: 12, border: `1px solid ${BSH.ligne}`, background: "rgba(255,255,255,0.05)", color: BSH.texte, fontSize: 16, fontFamily: SANS };
const puce = (txt: string, c: string) => <span style={{ fontSize: 11, fontWeight: 800, color: c, border: `1px solid ${c}55`, background: `${c}18`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{txt}</span>;
const H = (t: string, s?: string) => <div style={{ margin: "2px 0 8px" }}><div style={{ fontFamily: SERIF, fontSize: 21, color: BSH.orClair }}>{t}</div>{s && <div style={{ fontSize: 12, color: BSH.doux }}>{s}</div>}</div>;

export default function CentreHotesBSH() {
  const [d, setD] = useState<Donnees | null>(null);
  const [vue, setVue] = useState<Vue>("bord");
  const [sel, setSel] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { chargerEspace().then(setD); }, []);
  const avertir = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };
  const journal = (action: string) => setD(x => x ? ({ ...x, historique: [{ le: new Date().toISOString(), action }, ...x.historique] }) : x);
  const maj = async (cle: keyof Donnees, table: string, id: string, patch: any, libelle: string) => {
    if (!d) return;
    if (!d.simulation) { try { await ecrire(table, id, patch); } catch (e: any) { return avertir("❌ " + String(e?.message || e)); } }
    setD(x => x ? ({ ...x, [cle]: (x as any)[cle].map((r: any) => r.id === id ? { ...r, ...patch } : r) }) : x); journal(libelle); avertir("✓ " + libelle + (d.simulation ? " (simulation)" : ""));
  };
  const ajouter = async (cle: keyof Donnees, table: string, ligne: any, libelle: string) => {
    if (!d) return;
    let r = { ...ligne, id: "s" + Date.now() };
    if (!d.simulation) { try { r = await ecrire(table, null, ligne); } catch (e: any) { return avertir("❌ " + String(e?.message || e)); } }
    setD(x => x ? ({ ...x, [cle]: [r, ...(x as any)[cle]] }) : x); journal(libelle); avertir("✓ " + libelle + (d.simulation ? " (simulation)" : ""));
  };
  if (!d) return <div style={{ color: BSH.doux, padding: 20, fontFamily: SANS }}>Chargement…</div>;
  if (apercu) return <div><button style={{ ...bouton(true), position: "fixed", top: 12, right: 12, zIndex: 50 }} onClick={() => setApercu(null)}>← Centre de gestion</button><EspaceHoteBSH apercuHote={apercu} /></div>;

  const nom = (id: string) => { const h = d.hotes.find((x: any) => x.id === id); return h ? (h.pseudo_scene || h.prenom) : "—"; };
  const badges = {
    candidatures: d.candidatures.filter((c: any) => ["recue", "entretien"].includes(c.statut)).length,
    missions: d.missions.filter((m: any) => m.statut === "acceptee").length,
    comptes: d.interventions.filter((i: any) => !i.traite).length,
    documents: d.documents.filter((x: any) => x.statut === "recu").length,
  } as Record<string, number>;
  const ONGLETS: [Vue, string][] = [["bord", "Tableau de bord"], ["candidatures", "Candidatures"], ["hotes", "Hôtes & autorisations"], ["evenements", "Événements"], ["missions", "Missions"], ["equipes", "Disponibilités & équipes"], ["invitations", "Invitations"], ["presences", "Présences"], ["comptes", "Comptes rendus & incidents"], ["documents", "Documents"], ["remunerations", "Rémunérations"], ["historique", "Historique"]];

  const contenu = (() => { switch (vue) {
    case "bord": {
      const kpi: [string, number, Vue][] = [["Hôtes actifs", d.hotes.filter((h: any) => h.statut === "active").length, "hotes"], ["Candidatures à traiter", badges.candidatures, "candidatures"], ["Missions à confirmer", badges.missions, "missions"], ["Incidents / demandes", badges.comptes, "comptes"], ["Documents reçus", badges.documents, "documents"], ["Autorisés missions réelles", d.hotes.filter((h: any) => h.autorise_missions).length, "hotes"]];
      return <>{H("Tableau de bord", "Vue d'ensemble de l'équipe Bella'Secret Home")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{kpi.map(([l, n, v]) => <button key={l} onClick={() => setVue(v)} style={{ ...carte, textAlign: "left", cursor: "pointer" }}><div style={{ fontFamily: SERIF, fontSize: 28, color: n ? BSH.orClair : BSH.doux }}>{n}</div><div style={{ fontSize: 12, color: BSH.doux }}>{l}</div></button>)}</div>
        <div style={carte}><div style={{ fontFamily: SERIF, color: BSH.orClair, marginBottom: 6 }}>Prochains événements</div>
          {d.evenements.map((e: any) => { const eq = d.missions.filter((m: any) => m.evenement_id === e.id); return <div key={e.id} style={{ padding: "8px 0", borderTop: `1px solid ${BSH.ligne}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{e.ico} {e.nom}</b><span style={{ fontSize: 12, color: BSH.doux }}>{dateFr(e.date_evenement)}</span></div><div style={{ fontSize: 12, color: BSH.doux }}>Équipe : {eq.length ? eq.map((m: any) => `${nom(m.hote_id)} (${STATUT_MISSION[m.statut]?.[0]})`).join(" · ") : "à constituer"}</div></div>; })}</div>
        <div style={{ ...carte, borderColor: `${BSH.alerte}55`, fontSize: 13 }}>🔒 Garde-fous actifs : aucune mission réelle sans majorité vérifiée, charte signée et autorisation ; rémunérations en simulation tant que statut juridique, conditions et autorisation ne sont pas validés ; aucun paiement par l'application.</div></>;
    }
    case "candidatures": return <>{H("Candidatures", "Une candidature n'ouvre aucun accès : le compte hôte est créé après validation.")}
      {d.candidatures.map((c: any) => <div key={c.id} style={carte}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><b>{c.pseudo || c.prenom}</b> <span style={{ fontSize: 12, color: BSH.doux }}>· {c.prenom} · {c.ville}</span></div>{puce({ recue: "Reçue", entretien: "Entretien", acceptee: "Acceptée", refusee: "Refusée" }[c.statut as string] || c.statut, c.statut === "acceptee" ? BSH.ok : c.statut === "refusee" ? BSH.rouge : BSH.or)}</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>{c.motivation}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{puce(c.majeur_confirme ? "Majorité déclarée" : "Majorité non déclarée", c.majeur_confirme ? BSH.ok : BSH.rouge)}{puce(c.charte_acceptee ? "Charte acceptée" : "Charte non acceptée", c.charte_acceptee ? BSH.ok : BSH.alerte)}</div>
        {["recue", "entretien"].includes(c.statut) && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {c.statut === "recue" && <button style={bouton()} onClick={() => maj("candidatures", "bsh_hotes_candidatures", c.id, { statut: "entretien" }, `Entretien planifié — ${c.pseudo || c.prenom}`)}>Planifier un entretien</button>}
          <button style={bouton(true, BSH.ok)} disabled={!c.majeur_confirme} onClick={() => maj("candidatures", "bsh_hotes_candidatures", c.id, { statut: "acceptee", decision_le: new Date().toISOString() }, `Candidature acceptée — ${c.pseudo || c.prenom} (profil à créer, sans permission)`)}>Accepter</button>
          <button style={bouton(false, BSH.rouge)} onClick={() => confirm("Refuser cette candidature ?") && maj("candidatures", "bsh_hotes_candidatures", c.id, { statut: "refusee", decision_le: new Date().toISOString() }, `Candidature refusée — ${c.pseudo || c.prenom}`)}>Refuser</button>
        </div>}
      </div>)}</>;
    case "hotes": return <>{H("Hôtes & autorisations", "Chaque droit est accordé individuellement ; rien n'est activé automatiquement.")}
      {d.hotes.map((h: any) => { const ouvert = sel === h.id; const etapes = new Set(h.etapes || []); return <div key={h.id} style={carte}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div><div style={{ fontFamily: SERIF, fontSize: 18, color: BSH.orClair }}>{h.pseudo_scene || h.prenom}</div><div style={{ fontSize: 12, color: BSH.doux }}>{h.prenom} · {h.ville || "—"} · parcours {etapes.size}/10</div></div>
          <div style={{ display: "flex", gap: 6 }}>{puce(h.statut === "active" ? "Actif" : h.statut === "inactive" ? "Suspendu" : h.statut, h.statut === "active" ? BSH.ok : BSH.rouge)}<button style={bouton()} onClick={() => setSel(ouvert ? null : h.id)}>{ouvert ? "Fermer" : "Gérer"}</button></div></div>
        {ouvert && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: BSH.doux }}>Parcours : {ETAPES.map(e => `${etapes.has(e.cle) ? "✓" : "○"} ${e.titre}`).join(" · ")}</div>
          {([["majeur_confirme", "Majorité vérifiée (pièce contrôlée)"], ["identite_verifiee", "Identité vérifiée"], ["conditions_validees", "Conditions contractuelles validées"], ["autorise_missions", "Autoriser les missions réelles"], ["autorise_remuneration", "Autoriser la rémunération"]] as [string, string][]).map(([k, l]) => {
            const bloque = k === "autorise_missions" && !h.autorise_missions ? (!h.majeur_confirme ? "majorité non vérifiée" : !h.charte_signee_le ? "charte non signée" : null)
              : k === "autorise_remuneration" && !h.autorise_remuneration ? (!h.conditions_validees ? "conditions non validées" : (!h.statut_juridique || h.statut_juridique === "a_definir") ? "statut juridique à définir" : null) : null;
            return <label key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 14, opacity: bloque ? 0.55 : 1 }}><span>{l}{bloque && <span style={{ fontSize: 11, color: BSH.alerte }}> — {bloque}</span>}</span>
              <input type="checkbox" checked={!!h[k]} disabled={!!bloque} onChange={e => (e.target.checked ? confirm(`Confirmer : ${l} pour ${h.pseudo_scene || h.prenom} ?`) : true) && maj("hotes", "bsh_hotes", h.id, { [k]: e.target.checked }, `${l} : ${e.target.checked ? "oui" : "non"} — ${h.pseudo_scene || h.prenom}`)} style={{ width: 22, height: 22, accentColor: BSH.or }} /></label>; })}
          <div style={{ fontSize: 12, color: BSH.doux, marginTop: 4 }}>Permissions de l'espace hôte</div>
          {([["voir_invites", "Voir les listes d'invités (missions d'accueil)"], ["pointer_invites", "Pointer les invités à l'entrée"], ["voir_documents", "Voir ses documents"], ["messagerie", "Messagerie"]] as [string, string][]).map(([k, l]) =>
            <label key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{l}</span><input type="checkbox" checked={!!h.permissions?.[k]} onChange={e => maj("hotes", "bsh_hotes", h.id, { permissions: { ...h.permissions, [k]: e.target.checked } }, `Permission « ${l} » : ${e.target.checked ? "accordée" : "retirée"} — ${h.pseudo_scene || h.prenom}`)} style={{ width: 22, height: 22, accentColor: BSH.or }} /></label>)}
          <select style={champ} value={h.statut_juridique || ""} onChange={e => maj("hotes", "bsh_hotes", h.id, { statut_juridique: e.target.value || null }, `Statut juridique : ${e.target.value || "non renseigné"} — ${h.pseudo_scene || h.prenom}`)}>
            <option value="">Statut juridique : non renseigné</option><option value="auto_entrepreneur">Auto-entrepreneur</option><option value="salarie">Salarié·e</option><option value="benevole">Bénévole</option><option value="a_definir">À définir</option></select>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={bouton()} onClick={() => setApercu(h.id)}>👁 Voir son espace</button>
            {h.statut === "active" ? <button style={bouton(false, BSH.rouge)} onClick={() => confirm("Suspendre l'accès ? Les missions futures restent visibles pour vous.") && maj("hotes", "bsh_hotes", h.id, { statut: "inactive" }, `Accès suspendu — ${h.pseudo_scene || h.prenom}`)}>Suspendre l'accès</button>
              : <button style={bouton(true, BSH.ok)} onClick={() => maj("hotes", "bsh_hotes", h.id, { statut: "active" }, `Accès rétabli — ${h.pseudo_scene || h.prenom}`)}>Rétablir l'accès</button>}
            <button style={bouton(false, BSH.rouge)} onClick={() => confirm("Révoquer toutes les autorisations de cet hôte ?") && maj("hotes", "bsh_hotes", h.id, { autorise_missions: false, autorise_remuneration: false, permissions: { voir_invites: false, pointer_invites: false, voir_documents: true, messagerie: true } }, `Autorisations révoquées — ${h.pseudo_scene || h.prenom}`)}>Révoquer les autorisations</button>
          </div>
        </div>}
      </div>; })}</>;
    case "evenements": return <Evenements d={d} ajouter={ajouter} />;
    case "missions": return <Missions d={d} nom={nom} ajouter={ajouter} maj={maj} avertir={avertir} />;
    case "equipes": { const jours = Array.from(new Set([...d.disponibilites.map((x: any) => x.jour), ...d.evenements.map((e: any) => e.date_evenement)])).sort();
      return <>{H("Disponibilités & équipes", "Qui est disponible pour chaque date d'événement")}
        {jours.map(j => { const ev = d.evenements.find((e: any) => e.date_evenement === j); return <div key={j} style={carte}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{dateFr(j)}</b>{ev && puce(ev.nom, BSH.rose)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{d.hotes.map((h: any) => { const x = d.disponibilites.find((y: any) => y.hote_id === h.id && y.jour === j); const m = d.missions.find((y: any) => y.hote_id === h.id && y.date_mission === j);
            return <span key={h.id}>{puce(`${h.pseudo_scene || h.prenom} · ${m ? STATUT_MISSION[m.statut][0] : x ? (x.type === "disponible" ? `dispo ${x.debut?.slice(0, 5) || ""}` : "indispo") : "?"}`, m ? BSH.or : x?.type === "disponible" ? BSH.ok : x ? BSH.rouge : BSH.doux)}</span>; })}</div></div>; })}</>; }
    case "invitations": return <>{H("Invitations", "Codes d'accès par événement — confidentiels")}
      {d.evenements.map((e: any) => { const l = d.invitations.filter((i: any) => i.evenement_id === e.id); return <div key={e.id} style={carte}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{e.ico} {e.nom}</b><span style={{ fontSize: 12, color: BSH.doux }}>{l.filter((i: any) => i.utilisee).length}/{l.length} utilisées</span></div>
        {l.map((i: any) => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: `1px solid ${BSH.ligne}` }}><span>{i.nom_destinataire} · {i.categorie}</span><span style={{ fontFamily: "monospace", color: BSH.orClair }}>{i.code}</span></div>)}
        {!l.length && <div style={{ fontSize: 12, color: BSH.doux }}>Aucune invitation (gérées dans Secret Agenda).</div>}</div>; })}</>;
    case "presences": return <>{H("Présences", "Pointages des hôtes sur les missions confirmées")}
      {d.missions.filter((m: any) => ["confirmee", "terminee"].includes(m.statut)).map((m: any) => { const p = d.presences.find((x: any) => x.mission_id === m.id); return <div key={m.id} style={{ ...carte, display: "flex", justifyContent: "space-between", gap: 8 }}><span><b>{nom(m.hote_id)}</b> · {m.titre}<br /><span style={{ fontSize: 12, color: BSH.doux }}>{dateFr(m.date_mission)}</span></span>{puce(p ? `Arrivée ${new Date(p.arrivee).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Non pointé", p ? BSH.ok : BSH.doux)}</div>; })}
      {!d.missions.some((m: any) => ["confirmee", "terminee"].includes(m.statut)) && <div style={{ ...carte, fontSize: 13, color: BSH.doux }}>Aucune mission confirmée pour l'instant.</div>}</>;
    case "comptes": return <>{H("Comptes rendus & incidents")}{d.interventions.map((i: any) => <div key={i.id} style={{ ...carte, borderColor: i.type === "incident" ? `${BSH.rouge}66` : BSH.ligne }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 13 }}>{({ compte_rendu: "Compte rendu", incident: "Incident", demande: "Demande", note: "Note" } as any)[i.type]} · {nom(i.hote_id)}</b>{i.gravite && puce(`Gravité ${i.gravite}`, i.gravite === "haute" ? BSH.rouge : BSH.alerte)}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>{i.contenu}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}><span style={{ fontSize: 11, color: BSH.doux }}>{new Date(i.created_at).toLocaleString("fr-FR")}</span>{i.traite ? puce("Traité", BSH.ok) : <button style={bouton(true)} onClick={() => maj("interventions", "bsh_interventions", i.id, { traite: true }, `${i.type === "incident" ? "Incident" : "Demande"} traité(e) — ${nom(i.hote_id)}`)}>Marquer traité</button>}</div></div>)}</>;
    case "documents": return <>{H("Documents", "Charte, confidentialité, contrats, justificatifs de statut et d'identité")}
      {d.hotes.map((h: any) => <div key={h.id} style={carte}><b>{h.pseudo_scene || h.prenom}</b>{d.documents.filter((x: any) => x.hote_id === h.id).map((x: any) => <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderTop: `1px solid ${BSH.ligne}`, fontSize: 13 }}><span>{x.titre}</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{puce({ a_fournir: "À fournir", a_signer: "À signer", recu: "Reçu", signe: "Signé", valide: "Validé", expire: "Expiré" }[x.statut as string] || x.statut, ["signe", "valide"].includes(x.statut) ? BSH.ok : x.statut === "recu" ? BSH.or : BSH.alerte)}{x.statut === "recu" && <button style={bouton(true, BSH.ok)} onClick={() => maj("documents", "bsh_hotes_documents", x.id, { statut: "valide" }, `Document validé : ${x.titre} — ${h.pseudo_scene || h.prenom}`)}>Valider</button>}</span></div>)}
        <button style={{ ...bouton(), marginTop: 8 }} onClick={() => ajouter("documents", "bsh_hotes_documents", { hote_id: h.id, type: "contrat", titre: "Contrat / convention de mission", statut: "a_signer" }, `Contrat demandé — ${h.pseudo_scene || h.prenom}`)}>+ Demander un contrat</button></div>)}</>;
    case "remunerations": return <>{H("Rémunérations", "Préparation uniquement — aucun paiement n'est effectué par l'application")}
      {d.remunerations.map((r: any) => { const h = d.hotes.find((x: any) => x.id === r.hote_id); const m = d.missions.find((x: any) => x.id === r.mission_id); const blocage = peutValiderRemuneration(h, r, m);
        return <div key={r.id} style={carte}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 14 }}><b>{nom(r.hote_id)}</b> · {r.libelle}</span><b style={{ color: BSH.orClair, whiteSpace: "nowrap" }}>{Number(r.montant).toFixed(2).replace(".", ",")} €</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>{puce(r.simulation ? "Simulation" : r.statut, r.simulation ? BSH.doux : BSH.ok)}
            <button style={{ ...bouton(!blocage, BSH.ok), opacity: blocage ? 0.5 : 1 }} disabled={!!blocage} onClick={() => maj("remunerations", "bsh_remunerations", r.id, { statut: "validee", valide_le: new Date().toISOString() }, `Rémunération validée — ${nom(r.hote_id)}`)}>Valider</button></div>
          {blocage && <div style={{ fontSize: 11, color: BSH.alerte, marginTop: 6 }}>Validation impossible : {blocage}.</div>}</div>; })}</>;
    case "historique": return <>{H("Historique")}{d.historique.map((x: any, i: number) => <div key={i} style={{ ...carte, padding: 10, fontSize: 13 }}><span style={{ color: BSH.doux, fontSize: 11 }}>{new Date(x.le).toLocaleString("fr-FR")}</span><br />{x.action}</div>)}</>;
  } })();

  return (
    <div style={{ background: `radial-gradient(90% 50% at 0% 0%, ${BSH.bordeaux}, ${BSH.noir} 70%)`, minHeight: "100%", color: BSH.texte, fontFamily: SANS, padding: "14px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontFamily: SERIF, fontSize: 21, color: BSH.orClair }}>Centre des hôtes</div><div style={{ fontSize: 11, color: BSH.rose, letterSpacing: 2.5, textTransform: "uppercase" }}>Bella'Secret Home · Fondatrice</div></div>
        {d.simulation && puce("Simulation — 0128 non appliquée", BSH.alerte)}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "12px -16px 10px", padding: "0 16px 4px", WebkitOverflowScrolling: "touch" }}>
        {ONGLETS.map(([k, l]) => <button key={k} onClick={() => setVue(k)} style={{ ...bouton(vue === k), position: "relative", flex: "none" }}>{l}{badges[k] ? <span style={{ marginLeft: 6, background: BSH.rose, color: BSH.noir, borderRadius: 99, padding: "0 6px", fontSize: 11 }}>{badges[k]}</span> : null}</button>)}
      </div>
      {msg && <div style={{ ...carte, marginBottom: 8, fontSize: 14 }}>{msg}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{contenu}</div>
    </div>
  );
}

function Evenements({ d, ajouter }: any) {
  const [f, setF] = useState({ nom: "", date_evenement: "", lieu: "", capacite: 20, ico: "🕯" });
  return <>{H("Événements", "Créés en brouillon : la publication reste une décision séparée")}
    <div style={carte}><div style={{ display: "grid", gap: 8 }}>
      <input style={champ} placeholder="Nom de l'événement" value={f.nom} onChange={e => setF({ ...f, nom: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="date" style={champ} value={f.date_evenement} onChange={e => setF({ ...f, date_evenement: e.target.value })} /><input type="number" style={champ} value={f.capacite} onChange={e => setF({ ...f, capacite: Number(e.target.value) })} /></div>
      <input style={champ} placeholder="Lieu" value={f.lieu} onChange={e => setF({ ...f, lieu: e.target.value })} />
      <button style={bouton(true)} disabled={!f.nom || !f.date_evenement} onClick={() => { ajouter("evenements", "bsh_evenements", { ...f, statut: "brouillon", publie: false }, `Événement créé (brouillon) : ${f.nom}`); setF({ nom: "", date_evenement: "", lieu: "", capacite: 20, ico: "🕯" }); }}>Créer l'événement (brouillon)</button></div></div>
    {d.evenements.map((e: any) => <div key={e.id} style={{ ...carte, display: "flex", justifyContent: "space-between", gap: 8 }}><span><b>{e.ico} {e.nom}</b><br /><span style={{ fontSize: 12, color: BSH.doux }}>{dateFr(e.date_evenement)} · {e.lieu} · {e.capacite} places</span></span>{puce(e.statut === "brouillon" ? "Brouillon" : "Actif", e.statut === "brouillon" ? BSH.doux : BSH.ok)}</div>)}</>;
}

function Missions({ d, nom, ajouter, maj, avertir }: any) {
  const [f, setF] = useState<any>({ role_mission: "accueil", evenement_id: d.evenements[0]?.id || "", hote_id: "", date_mission: d.evenements[0]?.date_evenement || "", heure_debut: "19:00", heure_fin: "23:00", remuneration: 60, consignes: "", simulation: true });
  const [filtre, setFiltre] = useState("tous");
  const dispo = (h: any) => d.disponibilites.find((x: any) => x.hote_id === h.id && x.jour === f.date_mission);
  const creer = () => {
    const ev = d.evenements.find((e: any) => e.id === f.evenement_id); const t = TYPES_MISSION.find(x => x[0] === f.role_mission);
    ajouter("missions", "bsh_missions", { ...f, hote_id: f.hote_id || null, titre: t?.[1], lieu: ev?.lieu || null, statut: "proposee" }, `Mission proposée : ${t?.[1]} — ${f.hote_id ? nom(f.hote_id) : "non attribuée"}${f.simulation ? " (simulation)" : ""}`);
  };
  const confirmer = (m: any) => {
    if (!m.simulation) { const b = peutConfirmerReelle(d.hotes.find((h: any) => h.id === m.hote_id)); if (b) return avertir(`Mission réelle impossible : ${b}.`); }
    maj("missions", "bsh_missions", m.id, { statut: "confirmee" }, `Mission confirmée : ${m.titre} — ${nom(m.hote_id)}`);
  };
  const liste = d.missions.filter((m: any) => filtre === "tous" || m.statut === filtre);
  return <>{H("Missions", "Créer, attribuer, configurer les conditions, confirmer")}
    <div style={carte}><div style={{ display: "grid", gap: 8 }}>
      <select style={champ} value={f.role_mission} onChange={e => setF({ ...f, role_mission: e.target.value })}>{TYPES_MISSION.map(([k, l, i]) => <option key={k} value={k}>{i} {l}</option>)}</select>
      <select style={champ} value={f.evenement_id} onChange={e => { const ev = d.evenements.find((x: any) => x.id === e.target.value); setF({ ...f, evenement_id: e.target.value, date_mission: ev?.date_evenement || f.date_mission }); }}><option value="">Sans événement</option>{d.evenements.map((e: any) => <option key={e.id} value={e.id}>{e.nom} — {dateFr(e.date_evenement)}</option>)}</select>
      <select style={champ} value={f.hote_id} onChange={e => setF({ ...f, hote_id: e.target.value })}><option value="">Attribuer plus tard</option>{d.hotes.filter((h: any) => h.statut === "active").map((h: any) => { const x = dispo(h); return <option key={h.id} value={h.id}>{h.pseudo_scene || h.prenom} — {x ? (x.type === "disponible" ? "disponible" : "indisponible") : "dispo inconnue"}</option>; })}</select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><input type="date" style={champ} value={f.date_mission} onChange={e => setF({ ...f, date_mission: e.target.value })} /><input type="time" style={champ} value={f.heure_debut} onChange={e => setF({ ...f, heure_debut: e.target.value })} /><input type="time" style={champ} value={f.heure_fin} onChange={e => setF({ ...f, heure_fin: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="number" style={champ} value={f.remuneration} onChange={e => setF({ ...f, remuneration: Number(e.target.value) })} /><label style={{ ...champ, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="checkbox" checked={f.simulation} onChange={e => setF({ ...f, simulation: e.target.checked })} /> Simulation</label></div>
      <textarea style={{ ...champ, minHeight: 70 }} placeholder="Conditions et consignes (tenue, horaires d'arrivée, rôle…)" value={f.consignes} onChange={e => setF({ ...f, consignes: e.target.value })} />
      {!f.simulation && <div style={{ fontSize: 12, color: BSH.alerte }}>Mission réelle : la confirmation exigera majorité vérifiée, charte signée et autorisation de l'hôte.</div>}
      <button style={bouton(true)} onClick={creer}>Proposer la mission</button></div></div>
    <select style={champ} value={filtre} onChange={e => setFiltre(e.target.value)}><option value="tous">Toutes les missions</option>{Object.entries(STATUT_MISSION).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
    {liste.map((m: any) => { const [l, c] = STATUT_MISSION[m.statut] || [m.statut, BSH.doux]; return <div key={m.id} style={carte}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span><b>{TYPES_MISSION.find(t => t[0] === m.role_mission)?.[2]} {m.titre}</b><br /><span style={{ fontSize: 12, color: BSH.doux }}>{nom(m.hote_id)} · {dateFr(m.date_mission)} {m.heure_debut?.slice(0, 5)}–{m.heure_fin?.slice(0, 5)} · {Number(m.remuneration || 0)} €</span></span><span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>{puce(l, c)}{m.simulation && puce("simulation", BSH.doux)}</span></div>
      {m.statut === "acceptee" && <button style={{ ...bouton(true, BSH.ok), marginTop: 8 }} onClick={() => confirmer(m)}>Confirmer la mission</button>}
      {["confirmee"].includes(m.statut) && <button style={{ ...bouton(), marginTop: 8 }} onClick={() => maj("missions", "bsh_missions", m.id, { statut: "terminee" }, `Mission terminée : ${m.titre} — ${nom(m.hote_id)}`)}>Marquer terminée</button>}
    </div>; })}</>;
}
