"use client";
// ═══════════════════════════════════════════════════════════
// Bibliothèque de consignes IA (fondatrice et accès complet). Modèles classés par métier, éditables et
// VERSIONNÉS : une modification crée une nouvelle version (bellaia_documents, module CONSIGNES, référence
// « consigne:<clé>:v<n> ») ; l'ancienne reste consultable. Les modèles livrés (src/lib/consignes.ts) sont la
// version 1. La bibliothèque produit un texte à copier : elle n'appelle aucune IA et n'engage aucun coût.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte } from "./equipeLib";
import { METIERS, CONSIGNES_V1, RISQUES, remplir, controlerModele, variablesDuTexte, expressionsNonNatives, type Consigne, type Metier, type Risque } from "../../lib/consignes";

type Version = Consigne & { id?: string; statut: string; le?: string; motif?: string };
const versDepuisLigne = (l: any): Version | null => {
  try { const n = JSON.parse(l.notes || "{}"); return { cle: n.cle, metier: l.categorie, titre: l.titre, objectif: n.objectif || "", variables: n.variables || [], texte: l.contenu_html || "", sortie: n.sortie || "", risque: n.risque || "brouillon", version: l.version || 1, id: l.id, statut: l.statut || "brouillon", le: l.created_at, motif: n.motif }; }
  catch { return null; }
};

export default function BibliothequeConsignes() {
  const [lignes, setLignes] = useState<Version[]>([]);
  const [metier, setMetier] = useState<Metier | "tous">("tous");
  const [q, setQ] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [edition, setEdition] = useState<Version | null>(null);
  const [motif, setMotif] = useState("");
  const [msg, setMsg] = useState("");
  const [indispo, setIndispo] = useState(false);

  const charger = () => sbSelect<any>("bellaia_documents", "module=eq.CONSIGNES&select=id,titre,categorie,contenu_html,notes,version,statut,created_at&order=created_at.asc&limit=1000")
    .then(l => { setLignes(l.map(versDepuisLigne).filter(Boolean) as Version[]); setIndispo(false); }).catch(() => setIndispo(true));
  useEffect(() => { charger(); }, []);

  // Historique par clé : v1 livrée + versions enregistrées ; version courante = dernière validée, sinon v1
  const historique = (cle: string): Version[] => {
    const base = CONSIGNES_V1.find(c => c.cle === cle);
    const enr = lignes.filter(l => l.cle === cle).sort((a, b) => a.version - b.version);
    return [...(base && !enr.some(e => e.version === 1) ? [{ ...base, statut: "valide" } as Version] : []), ...enr];
  };
  const courante = (cle: string): Version => { const h = historique(cle); return [...h].reverse().find(v => v.statut === "valide") || h[0]; };
  const cles = useMemo(() => [...new Set([...CONSIGNES_V1.map(c => c.cle), ...lignes.map(l => l.cle)])], [lignes]);
  const liste = cles.map(courante).filter(Boolean).filter(c => (metier === "tous" || c.metier === metier) && (!q.trim() || (c.titre + " " + c.objectif + " " + c.texte).toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => q.trim() ? Number(!a.titre.toLowerCase().includes(q.trim().toLowerCase())) - Number(!b.titre.toLowerCase().includes(q.trim().toLowerCase())) : 0);

  const enregistrer = async (v: Version, nouvelleCle?: boolean) => {
    const erreurs = controlerModele(v);
    if (erreurs.length) { setMsg("❌ " + erreurs.join(" ")); return; }
    if (!nouvelleCle && motif.trim().length < 3) { setMsg("❌ Indiquez le motif de la modification."); return; }
    const version = nouvelleCle ? 1 : Math.max(...historique(v.cle).map(h => h.version)) + 1;
    try {
      await sbInsert("bellaia_documents", { module: "CONSIGNES", reference: `consigne:${v.cle}:v${version}`, titre: v.titre.trim(), categorie: v.metier, contenu_html: v.texte, version, statut: "brouillon", entite_type: "consigne", tags: [v.metier, v.risque],
        notes: JSON.stringify({ cle: v.cle, objectif: v.objectif, variables: v.variables, sortie: v.sortie, risque: v.risque, motif: motif.trim() || "Création" }) });
      setMsg(`✅ Version ${version} enregistrée en brouillon. Validez-la pour qu'elle devienne la version utilisée.`); setEdition(null); setMotif(""); setOuverte(v.cle); await charger();
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const valider = async (v: Version) => {
    try {
      for (const a of lignes.filter(l => l.cle === v.cle && l.statut === "valide" && l.id && l.id !== v.id)) await sbUpdate("bellaia_documents", a.id!, { statut: "remplacee" });
      await sbUpdate("bellaia_documents", v.id!, { statut: "valide" }); setMsg(`✅ Version ${v.version} validée : c'est désormais la version utilisée.`); await charger();
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  if (edition) {
    const vars = variablesDuTexte(edition.texte);
    const maj = (p: Partial<Version>) => setEdition({ ...edition, ...p });
    return (
      <div style={{ fontFamily: SA, color: C.texte }}>
        <button style={btn()} onClick={() => { setEdition(null); setMsg(""); }}>‹ Annuler</button>
        {msg && <div role="status" style={{ ...carte, margin: "10px 0", color: msg.startsWith("✅") ? C.ok : C.rouge }}>{msg}</div>}
        <div style={{ ...carte, marginTop: 10, display: "grid", gap: 8 }}>
          <label><div style={lbl}>Titre</div><input style={champ} value={edition.titre} onChange={e => maj({ titre: e.target.value })} /></label>
          <label><div style={lbl}>Métier</div><select style={champ} value={edition.metier} onChange={e => maj({ metier: e.target.value as Metier })}>{METIERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label><div style={lbl}>Objectif</div><input style={champ} value={edition.objectif} onChange={e => maj({ objectif: e.target.value })} /></label>
          <label><div style={lbl}>Consigne (variables entre doubles accolades, ex. {"{{client}}"})</div><textarea style={{ ...champ, minHeight: 140 }} value={edition.texte} onChange={e => {
            const t = e.target.value; const noms = variablesDuTexte(t);
            maj({ texte: t, variables: noms.map(n => edition.variables.find(v => v.nom === n) || { nom: n, libelle: n }) }); }} /></label>
          {vars.length > 0 && <div style={{ fontSize: 12.5, color: C.doux }}>Variables : {vars.join(", ")}</div>}
          {expressionsNonNatives(edition.texte).length > 0 && <div style={{ fontSize: 12.5, color: C.orange }}>Expressions qui ne sont pas des commandes garanties (traitées comme du texte) : {expressionsNonNatives(edition.texte).join(", ")}</div>}
          <label><div style={lbl}>Résultat attendu</div><input style={champ} value={edition.sortie} onChange={e => maj({ sortie: e.target.value })} /></label>
          <label><div style={lbl}>Niveau de risque</div><select style={champ} value={edition.risque} onChange={e => maj({ risque: e.target.value as Risque })}>{(Object.keys(RISQUES) as Risque[]).map(k => <option key={k} value={k}>{RISQUES[k].libelle}</option>)}</select></label>
          {!edition.id && edition.version === 0 ? null : <label><div style={lbl}>Motif de la modification (conservé dans l'historique)</div><input style={champ} value={motif} onChange={e => setMotif(e.target.value)} placeholder="ex. ajout des conditions d'annulation" /></label>}
          <button style={btn(true)} onClick={() => enregistrer(edition, edition.version === 0)}>Enregistrer une nouvelle version</button>
        </div>
      </div>
    );
  }

  if (ouverte) {
    const c = courante(ouverte); const h = historique(ouverte); const r = remplir(c, valeurs);
    return (
      <div style={{ fontFamily: SA, color: C.texte }}>
        <button style={btn()} onClick={() => { setOuverte(null); setValeurs({}); setMsg(""); }}>‹ Toutes les consignes</button>
        {msg && <div role="status" style={{ ...carte, margin: "10px 0", color: msg.startsWith("✅") ? C.ok : C.rouge }}>{msg}</div>}
        <div style={{ ...carte, marginTop: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{c.titre} <span style={{ fontSize: 12, color: C.doux }}>· version {c.version}</span></div>
          <div style={{ fontSize: 13, color: C.doux, margin: "4px 0" }}>{c.objectif}</div>
          <div style={{ fontSize: 12.5, color: c.risque === "action_sensible" ? C.orange : C.doux }}>{RISQUES[c.risque].libelle} — {RISQUES[c.risque].autorisation}</div>
        </div>
        <div style={{ ...carte, marginTop: 10, display: "grid", gap: 8 }}>
          {c.variables.map(v => <label key={v.nom}><div style={lbl}>{v.libelle}{v.facultatif ? " (facultatif)" : ""}</div><input style={champ} aria-label={v.libelle} placeholder={v.exemple || ""} value={valeurs[v.nom] || ""} onChange={e => setValeurs({ ...valeurs, [v.nom]: e.target.value })} /></label>)}
          {r.manquantes.length > 0 && <div style={{ fontSize: 12.5, color: C.orange }}>À compléter : {r.manquantes.join(", ")}</div>}
          {r.alertes.length > 0 && <div style={{ fontSize: 12.5, color: C.orange }}>Expressions non garanties (traitées comme du texte) : {r.alertes.join(", ")}</div>}
          <textarea readOnly aria-label="Consigne prête" style={{ ...champ, minHeight: 180, fontSize: 13 }} value={r.texte} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={btn(true)} disabled={r.manquantes.length > 0} onClick={() => navigator.clipboard?.writeText(r.texte).then(() => setMsg("✅ Consigne copiée. Aucun service IA n'a été appelé."), () => setMsg("❌ Copie impossible : sélectionnez le texte."))}>Copier la consigne</button>
            <button style={btn()} onClick={() => { setMotif(""); setEdition({ ...c, id: undefined, statut: "brouillon" }); }}>Modifier (nouvelle version)</button>
            <button style={btn()} onClick={() => { setMotif("Copie de « " + c.titre + " »"); setEdition({ ...c, cle: `perso.${Date.now().toString(36)}`, titre: c.titre + " (copie)", version: 0, id: undefined, statut: "brouillon" }); }}>Dupliquer</button>
          </div>
        </div>
        <div style={{ ...carte, marginTop: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Historique des versions</div>
          {[...h].reverse().map(v => <div key={v.version} style={{ borderTop: `1px solid ${C.ligne}`, padding: "6px 0", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span>v{v.version} · {v.statut === "valide" ? "utilisée" : v.statut === "remplacee" ? "remplacée" : "brouillon"}{v.le ? " · " + new Date(v.le).toLocaleDateString("fr-FR") : " · livrée"}{v.motif ? " — " + v.motif : ""}</span>
            {v.id && v.statut === "brouillon" && <button style={btn(true, C.ok)} onClick={() => valider(v)}>Valider</button>}
          </div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SA, color: C.texte }}>
      {indispo && <div style={{ ...carte, marginBottom: 10, color: C.orange, fontSize: 13 }}>Versions enregistrées indisponibles : seuls les modèles livrés sont affichés.</div>}
      {msg && <div role="status" style={{ ...carte, marginBottom: 10, color: msg.startsWith("✅") ? C.ok : C.rouge }}>{msg}</div>}
      <div style={{ ...carte, marginBottom: 10, fontSize: 12.5, color: C.doux }}>Modèles à remplir puis copier. La bibliothèque n'appelle aucune IA : aucun coût. Chaque consigne impose de citer ses sources et interdit toute publication, dépense, suppression ou décision sans votre accord.</div>
      <input style={{ ...champ, marginBottom: 8 }} placeholder="Rechercher une consigne…" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher une consigne" />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        <button style={btn(metier === "tous")} onClick={() => setMetier("tous")}>Tous ({cles.length})</button>
        {METIERS.map(([k, l]) => <button key={k} style={btn(metier === k)} onClick={() => setMetier(k)}>{l}</button>)}
      </div>
      <button style={{ ...btn(true), marginBottom: 10 }} onClick={() => { setMotif("Création"); setEdition({ cle: `perso.${Date.now().toString(36)}`, metier: metier === "tous" ? "recherche" : metier, titre: "", objectif: "", variables: [], texte: "", sortie: "", risque: "brouillon", version: 0, statut: "brouillon" }); }}>＋ Nouvelle consigne</button>
      {liste.map(c => <button key={c.cle} onClick={() => { setOuverte(c.cle); setValeurs({}); setMsg(""); }} style={{ ...carte, display: "block", width: "100%", textAlign: "left", marginBottom: 8, color: C.texte, fontFamily: SA, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{c.titre}</b><span style={{ fontSize: 12, color: c.risque === "action_sensible" ? C.orange : C.doux }}>{RISQUES[c.risque].libelle}</span></div>
        <div style={{ fontSize: 12.5, color: C.doux, marginTop: 3 }}>{METIERS.find(m => m[0] === c.metier)?.[1]} · v{c.version} · {c.objectif}</div>
      </button>)}
      {liste.length === 0 && <div style={{ ...carte, color: C.doux }}>Aucune consigne ne correspond.</div>}
    </div>
  );
}
