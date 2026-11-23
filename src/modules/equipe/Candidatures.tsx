"use client";
// ═══════════════════════════════════════════════════════════
// Candidatures et demandes d'accès — Administration générale (fondatrice, ou permissions
// candidatures.gerer / candidatures.decider). Données : bellaia_candidatures (0135) et invitations (0137).
// • Proposition calculée par RÈGLES (moteur src/lib/candidatures.ts, IA désactivée) : jamais une décision.
// • Acceptation / refus : uniquement par une personne habilitée, connectée ; motif obligatoire pour un refus.
// • Accepter un dossier n'ouvre AUCUN accès : la fondatrice crée ensuite une invitation à usage unique,
//   qu'elle transmet elle-même ; la personne l'accepte connectée avec la même adresse.
// • Tant que 0135 n'est pas appliquée en production, l'écran l'indique au lieu d'échouer.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate, sbRpc } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, lienPrive } from "./equipeLib";
import { evaluer, verifierCompletude, type Candidature } from "../../lib/candidatures";

const TYPES: Record<string, string> = { hote: "Hôte / hôtesse", assistant: "Assistant·e", modele: "Modèle", membres: "Espace Membres", autre: "Autre" };
const STATUTS: Record<string, [string, string]> = {
  nouvelle: ["Nouvelle", C.bleu], incomplet: ["Incomplet", C.orange], a_analyser: ["À analyser", C.bleu], a_contacter: ["À contacter", C.violet],
  entretien: ["Entretien", C.violet], preselectionne: ["Présélectionné", C.or], en_attente: ["En attente", C.doux], accepte: ["Accepté", C.ok],
  refuse: ["Refusé", C.rouge], suspendu: ["Suspendu", C.rouge], archive: ["Archivé", C.doux],
};
const ROLE_PAR_TYPE: Record<string, string> = { hote: "hote", assistant: "assistante", modele: "autre", membres: "autre", autre: "autre" };
const ETAPES = ["a_contacter", "entretien", "preselectionne", "en_attente", "incomplet", "archive"];
const absente = (e: any) => /does not exist|42P01|PGRST205|Could not find the table|404/i.test(String(e?.message || e));

export default function Candidatures() {
  const [liste, setListe] = useState<any[] | null>(null);
  const [indispo, setIndispo] = useState(false);
  const [filtre, setFiltre] = useState("ouvertes");
  const [sel, setSel] = useState<any | null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [motif, setMotif] = useState("");
  const [msg, setMsg] = useState("");
  const [lien, setLien] = useState("");
  const [occupe, setOccupe] = useState(false);

  const charger = async () => {
    try { setListe(await sbSelect("bellaia_candidatures", "select=id,type,nom_affiche,email,telephone,ville,poles,disponibilites,experience,motivation,langues,donnees,majeur_declare,statut,proposition,decision_motif,decision_le,conserver_jusqu_au,created_at&order=created_at.desc&limit=300")); setIndispo(false); }
    catch (e) { if (absente(e)) { setIndispo(true); setListe([]); } else { setMsg("❌ " + String((e as any)?.message || e)); setListe([]); } }
  };
  useEffect(() => { charger(); }, []);

  const ouvrir = async (c: any, rafraichir = false) => {
    setSel(c); if (!rafraichir) { setMotif(""); setMsg(""); setLien(""); }
    setHist(await sbSelect("bellaia_candidatures_historique", `candidature_id=eq.${c.id}&select=id,action,motif,le&order=le.desc&limit=50`).catch(() => []));
    setDocs(await sbSelect("bellaia_candidatures_documents", `candidature_id=eq.${c.id}&select=id,type,taille,created_at`).catch(() => []));
  };
  const agir = async (f: () => Promise<any>, ok: string) => {
    setOccupe(true); setMsg("");
    try { await f(); setMsg("✅ " + ok); await charger(); const maj = (await sbSelect<any>("bellaia_candidatures", `id=eq.${sel.id}&select=*`))[0]; if (maj) await ouvrir(maj, true); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setOccupe(false);
  };

  const visibles = useMemo(() => (liste || []).filter(c => filtre === "toutes" ? true : filtre === "ouvertes" ? !["accepte", "refuse", "archive"].includes(c.statut) : c.statut === filtre), [liste, filtre]);

  if (liste === null) return <div style={{ color: C.doux, fontFamily: SA, padding: 20 }}>Chargement des candidatures…</div>;
  if (indispo) return (
    <div style={{ ...carte, fontFamily: SA, color: C.texte }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Candidatures — en attente d'activation</div>
      <div style={{ fontSize: 13.5, color: C.doux, lineHeight: 1.5 }}>La gestion des candidatures s'active avec la migration 0135 (préparée et testée sur une base isolée, non appliquée en production). Condition préalable : une sauvegarde dont la restauration réelle conclut « COMPLET », puis votre autorisation. Aucun formulaire public n'est ouvert d'ici là.</div>
    </div>
  );

  if (sel) {
    const prop = sel.proposition;
    const manquants = verifierCompletude(sel as Candidature);
    return (
      <div style={{ fontFamily: SA, color: C.texte }}>
        <button style={{ ...btn(), marginBottom: 10 }} onClick={() => { setSel(null); setMsg(""); }}>‹ Toutes les candidatures</button>
        {msg && <div role="status" style={{ ...carte, marginBottom: 10, color: msg.startsWith("✅") ? C.ok : C.rouge }}>{msg}</div>}
        <div style={{ ...carte, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{sel.nom_affiche}</div>
            <span style={{ color: STATUTS[sel.statut]?.[1], fontWeight: 800, fontSize: 13 }}>{STATUTS[sel.statut]?.[0] || sel.statut}</span>
          </div>
          <div style={{ fontSize: 13, color: C.doux, margin: "4px 0 8px" }}>{TYPES[sel.type] || sel.type} · reçue le {new Date(sel.created_at).toLocaleDateString("fr-FR")} · conservée jusqu'au {sel.conserver_jusqu_au ? new Date(sel.conserver_jusqu_au).toLocaleDateString("fr-FR") : "—"}</div>
          {([["E-mail", sel.email], ["Téléphone", sel.telephone], ["Ville", sel.ville], ["Pôles", (sel.poles || []).join(", ")], ["Langues", (sel.langues || []).join(", ")], ["Disponibilités", sel.disponibilites], ["Expérience", sel.experience], ["Motivation", sel.motivation]] as [string, any][]).filter(([, v]) => v).map(([k, v]) =>
            <div key={k} style={{ marginBottom: 6 }}><div style={lbl}>{k}</div><div style={{ fontSize: 14, whiteSpace: "pre-line" }}>{v}</div></div>)}
          {manquants.length > 0 && <div style={{ fontSize: 13, color: C.orange }}>Éléments manquants : {manquants.join(", ")}</div>}
        </div>

        <div style={{ ...carte, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Proposition (règles, sans IA) — n'est pas une décision</div>
          {prop ? <>
            <div style={{ fontSize: 14 }}>Statut proposé : <b>{STATUTS[prop.statut_propose]?.[0] || prop.statut_propose}</b></div>
            <div style={{ fontSize: 13, color: C.doux, margin: "4px 0" }}>{prop.explication}</div>
            {(prop.criteres || []).map((k: any) => <div key={k.code} style={{ fontSize: 12.5, color: k.resultat === "bloquant" || k.resultat === "defavorable" ? C.orange : C.doux }}>• {k.libelle} : {k.detail}</div>)}
          </> : <div style={{ fontSize: 13, color: C.doux }}>Aucune proposition calculée.</div>}
          <button disabled={occupe} style={{ ...btn(), marginTop: 8 }} onClick={() => agir(() => sbRpc("candidature_proposer", { p_id: sel.id, p_proposition: evaluer(sel as Candidature) }), "Proposition calculée.")}>Calculer la proposition</button>
        </div>

        <div style={{ ...carte, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Suivi du dossier</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ETAPES.filter(s => s !== sel.statut).map(s => <button key={s} disabled={occupe} style={btn()} onClick={() => agir(() => sbUpdate("bellaia_candidatures", sel.id, { statut: s }), `Dossier passé en « ${STATUTS[s][0]} ».`)}>{STATUTS[s][0]}</button>)}
          </div>
          <div style={{ ...lbl, marginTop: 12 }}>Décision (personne habilitée)</div>
          <textarea style={{ ...champ, minHeight: 64, marginBottom: 6 }} maxLength={1000} placeholder="Motif (obligatoire pour un refus, conservé dans l'historique)" value={motif} onChange={e => setMotif(e.target.value)} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button disabled={occupe || sel.statut === "accepte"} style={btn(true, C.ok)} onClick={() => { if (window.confirm("Accepter ce dossier ? Aucun accès n'est ouvert tant que vous n'avez pas créé et transmis l'invitation.")) agir(() => sbUpdate("bellaia_candidatures", sel.id, { statut: "accepte", decision_motif: motif.trim() || null }), "Dossier accepté. Créez l'invitation pour ouvrir l'accès."); }}>Accepter</button>
            <button disabled={occupe || sel.statut === "refuse" || motif.trim().length < 3} style={btn(true, C.rouge)} onClick={() => { if (window.confirm("Refuser ce dossier ? Le motif sera conservé.")) agir(() => sbUpdate("bellaia_candidatures", sel.id, { statut: "refuse", decision_motif: motif.trim() }), "Dossier refusé."); }}>Refuser</button>
          </div>
          {sel.statut === "accepte" && <div style={{ marginTop: 12 }}>
            <div style={lbl}>Invitation à usage unique</div>
            <div style={{ fontSize: 13, color: C.doux, marginBottom: 6 }}>Rôle proposé : {ROLE_PAR_TYPE[sel.type]} — aucune permission supplémentaire. Les permissions se règlent ensuite dans « Accès & permissions ».</div>
            <button disabled={occupe} style={btn(true)} onClick={() => agir(async () => { const j = await sbRpc<string>("creer_invitation", { p_candidature: sel.id, p_roles: [ROLE_PAR_TYPE[sel.type]], p_permissions: [], p_univers: "*" }); setLien(`${window.location.origin}/?invitation=${j}`); }, "Invitation créée : copiez le lien et transmettez-le vous-même.")}>Créer l'invitation</button>
            {lien && <div style={{ marginTop: 8 }}>
              <input readOnly style={champ} value={lien} onFocus={e => e.currentTarget.select()} aria-label="Lien d'invitation" />
              <button style={{ ...btn(), marginTop: 6 }} onClick={() => navigator.clipboard?.writeText(lien).then(() => setMsg("✅ Lien copié. Il n'est affiché qu'une fois."))}>Copier le lien</button>
              <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>Rien n'est envoyé automatiquement. Le lien n'est valable qu'une fois, pour l'adresse {sel.email}.</div>
            </div>}
          </div>}
        </div>

        <div style={{ ...carte, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Documents fournis ({docs.length})</div>
          {docs.length === 0 ? <div style={{ fontSize: 13, color: C.doux }}>Aucun document.</div> : docs.map(d =>
            <button key={d.id} style={{ ...btn(), marginRight: 6, marginBottom: 6 }} onClick={async () => { try { const ch = await sbRpc<string>("document_candidature_consulter", { p_id: d.id }); const l = await lienPrive(ch, 300); if (l) window.open(l, "_blank"); } catch (e: any) { setMsg("❌ " + String(e?.message || e)); } }}>📄 {d.type} · {Math.round((d.taille || 0) / 1024)} Ko</button>)}
          <div style={{ fontSize: 12, color: C.doux }}>Chaque consultation est enregistrée ; lien valable 5 minutes.</div>
        </div>

        <div style={carte}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Historique (non modifiable)</div>
          {hist.length === 0 ? <div style={{ fontSize: 13, color: C.doux }}>—</div> : hist.map(h => <div key={h.id} style={{ fontSize: 12.5, borderTop: `1px solid ${C.ligne}`, padding: "6px 0" }}>{new Date(h.le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {h.action}{h.motif ? ` — ${h.motif}` : ""}</div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SA, color: C.texte }}>
      {msg && <div style={{ ...carte, marginBottom: 10, color: C.rouge }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        {[["ouvertes", "À traiter"], ["accepte", "Acceptées"], ["refuse", "Refusées"], ["archive", "Archivées"], ["toutes", "Toutes"]].map(([k, l]) =>
          <button key={k} style={btn(filtre === k)} onClick={() => setFiltre(k)}>{l} ({(liste || []).filter(c => k === "toutes" ? true : k === "ouvertes" ? !["accepte", "refuse", "archive"].includes(c.statut) : c.statut === k).length})</button>)}
      </div>
      {visibles.length === 0 ? <div style={{ ...carte, color: C.doux, fontSize: 14 }}>Aucune candidature dans cette liste.</div> :
        visibles.map(c => <button key={c.id} onClick={() => ouvrir(c)} style={{ ...carte, display: "block", width: "100%", textAlign: "left", marginBottom: 8, color: C.texte, fontFamily: SA, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{c.nom_affiche}</b><span style={{ color: STATUTS[c.statut]?.[1], fontSize: 12.5, fontWeight: 800 }}>{STATUTS[c.statut]?.[0] || c.statut}</span></div>
          <div style={{ fontSize: 12.5, color: C.doux, marginTop: 3 }}>{TYPES[c.type] || c.type} · {c.ville || "—"} · {new Date(c.created_at).toLocaleDateString("fr-FR")}{c.proposition ? ` · proposé : ${STATUTS[c.proposition.statut_propose]?.[0] || ""}` : ""}</div>
        </button>)}
    </div>
  );
}
