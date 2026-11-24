"use client";
// ═══════════════════════════════════════════════════════════
// BSH — Assistant de communication : consignes destinées à Meta AI, réponses rapides, FAQ, messages de
// bienvenue et d'absence, modèles éditoriaux. Conservation, validation et EXPORT MANUEL uniquement :
// Bellaïa ne se connecte ni à Meta AI ni à WhatsApp Business et ne publie rien. Aucune donnée personnelle
// ne doit figurer dans ces textes (contrôle à l'écran). Table bsh_assistant_contenus (0141).
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { K, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, sbInsert, sbUpdate, telecharger, libelleInstant } from "./bshAgendaLib";
import type { Donnees } from "./BshAgendaHub";

export type ContenuAssistant = { id: string; type: string; titre: string; raccourci: string | null; contenu: string; statut: string; valide_le: string | null; version: number; updated_at?: string };
export const TYPES_ASSISTANT: [string, string, string][] = [
  ["consigne_meta_ai", "Consigne pour Meta AI", "Instructions à recopier dans l'outil Meta, si votre compte y a accès."],
  ["reponse_rapide", "Réponse rapide", "WhatsApp Business : réponses enregistrées, insérées avec « / » (envoi manuel)."],
  ["faq", "FAQ", "Questions fréquentes et réponses validées."],
  ["bienvenue", "Message de bienvenue", "Envoyé automatiquement par l'application WhatsApp Business à un nouveau contact."],
  ["absence", "Message d'absence", "Envoyé par l'application WhatsApp Business selon l'horaire choisi."],
  ["modele", "Modèle éditorial", "Texte type pour les publications (à adapter avant usage)."],
];
/** Données personnelles visibles dans un texte (adresse e-mail, téléphone, IBAN) : à retirer avant validation. */
export function donneesPersonnelles(t: string): string[] {
  const r: string[] = [];
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)) r.push("adresse e-mail");
  if (/(\+?\d[\s.-]?){9,}/.test(t)) r.push("numéro de téléphone");
  if (/\bFR\d{2}[\s]?\d{4}/i.test(t)) r.push("IBAN");
  return r;
}

export default function BshAssistant({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [type, setType] = useState("reponse_rapide"); const [edition, setEdition] = useState<Partial<ContenuAssistant> | null>(null); const [msg, setMsg] = useState("");
  const liste = (d.assistant || []).filter(c => c.type === type && c.statut !== "archive");
  const valides = (d.assistant || []).filter(c => c.statut === "valide");
  const exporter = () => {
    const blocs = TYPES_ASSISTANT.map(([k, l]) => { const v = valides.filter(c => c.type === k); return v.length ? `=== ${l} ===\n` + v.map(c => `${c.raccourci ? c.raccourci + " — " : ""}${c.titre}\n${c.contenu}\n`).join("\n") : ""; }).filter(Boolean);
    telecharger(new Blob([`BSH — contenus validés pour l'assistant de communication (export manuel du ${new Date().toLocaleDateString("fr-FR")})\nÀ recopier vous-même dans WhatsApp Business ou dans l'outil Meta. Aucune donnée personnelle.\n\n${blocs.join("\n")}`], { type: "text/plain;charset=utf-8" }), "bsh-assistant-contenus-valides.txt");
    setMsg(`✅ ${valides.length} contenu(s) validé(s) exporté(s).`);
  };
  if (!d.v141) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Titre>Assistant de communication</Titre><Vide>Cette rubrique s'activera avec la migration 0141 (préparée et testée, en attente de ton accord).</Vide><Limites /></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <Titre action={<div style={{ display: "flex", gap: 6 }}><button style={bouton("ghost", true)} disabled={!valides.length} onClick={exporter}>⬇️ Exporter les contenus validés ({valides.length})</button><button style={bouton("plein", true)} onClick={() => setEdition({ type, titre: "", contenu: "", raccourci: null, statut: "brouillon" })}>＋ Nouveau</button></div>}>Assistant de communication</Titre>
    <Limites />
    <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto" }}>{TYPES_ASSISTANT.map(([k, l]) => <button key={k} role="tab" aria-selected={type === k} style={bouton(type === k ? "or" : "ghost", true)} onClick={() => setType(k)}>{l} · {(d.assistant || []).filter(c => c.type === k && c.statut !== "archive").length}</button>)}</div>
    <div style={{ fontSize: 11, color: K.cremeD }}>{TYPES_ASSISTANT.find(t => t[0] === type)?.[2]}</div>
    {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
    {liste.length === 0 ? <Vide>Aucun contenu de ce type.</Vide> : liste.map(c => <Carte key={c.id} style={{ display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}>
      <div onClick={() => setEdition(c)} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: K.creme }}>{c.raccourci ? `${c.raccourci} · ` : ""}{c.titre}</div><div style={{ fontSize: 12, color: K.cremeF, whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{c.contenu}</div></div>
        <Etiquette couleur={c.statut === "valide" ? K.ok : K.alerte}>{c.statut === "valide" ? `Validé · v${c.version}` : `Brouillon · v${c.version}`}</Etiquette></div>
    </Carte>)}
    {edition && <EditeurAssistant c={edition} onFermer={() => setEdition(null)} onFait={t => { setEdition(null); setMsg(t); recharger(); }} />}
  </div>;
}

function Limites() {
  return <div role="note" style={{ fontSize: 11, color: K.cremeF, border: `1px solid ${K.ligne}`, borderRadius: 10, padding: "8px 10px", lineHeight: 1.5 }}>
    <b style={{ color: K.or }}>Ce que fait cette rubrique, et ce qu'elle ne fait pas.</b> Elle conserve et fait valider les textes, puis les exporte pour que tu les recopies toi-même. Bellaïa n'a aucun accès à Meta AI ni à WhatsApp Business et ne publie rien dans les groupes ou les chaînes. Points à vérifier dans le centre d'aide WhatsApp avant usage : nombre de réponses rapides enregistrables, fonctionnement des messages de bienvenue et d'absence, disponibilité de l'agent IA de Meta pour les entreprises dans ton pays (il peut désactiver ces messages, et les conversations concernées peuvent être utilisées par Meta). Ne mets aucune donnée personnelle ni confidentielle dans ces textes.
  </div>;
}

function EditeurAssistant({ c: init, onFermer, onFait }: { c: Partial<ContenuAssistant>; onFermer: () => void; onFait: (t: string) => void }) {
  const [c, setC] = useState<Partial<ContenuAssistant>>(init); const [err, setErr] = useState("");
  const maj = (x: Partial<ContenuAssistant>) => setC(v => ({ ...v, ...x }));
  const perso = donneesPersonnelles(`${c.titre || ""} ${c.contenu || ""}`);
  const enregistrer = async (valider: boolean) => {
    if (!(c.titre || "").trim() || !(c.contenu || "").trim()) return setErr("Titre et texte obligatoires.");
    if (c.raccourci && !/^\/[a-z0-9_-]{1,24}$/i.test(c.raccourci)) return setErr("Raccourci : « / » suivi de 1 à 24 lettres, chiffres, - ou _.");
    if (valider && perso.length) return setErr(`Validation impossible : retire ${perso.join(", ")} du texte.`);
    const change = init.id && (c.contenu !== init.contenu || c.titre !== init.titre || c.raccourci !== init.raccourci);
    const ligne: any = { type: c.type, titre: c.titre!.trim(), raccourci: c.type === "reponse_rapide" ? (c.raccourci || null) : null, contenu: c.contenu!.trim(), updated_at: new Date().toISOString(),
      statut: valider ? "valide" : change ? "brouillon" : (init.statut || "brouillon"), valide_le: valider ? new Date().toISOString() : change ? null : (init.valide_le || null), version: change ? (init.version || 1) + 1 : (init.version || 1) };
    try { if (init.id) await sbUpdate("bsh_assistant_contenus", init.id, ligne); else await sbInsert("bsh_assistant_contenus", ligne, "return=minimal"); onFait(valider ? "✅ Contenu validé (prêt pour l'export manuel)" : "✅ Brouillon enregistré"); } catch (e: any) { setErr(String(e?.message || e)); }
  };
  return <Feuille titre={init.id ? "Modifier le contenu" : "Nouveau contenu"} onFermer={onFermer}>
    <div style={grille(200)}>
      <Champ label="Type"><select style={champ} value={c.type} onChange={e => maj({ type: e.target.value })}>{TYPES_ASSISTANT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
      <Champ label="Titre *"><input style={champ} value={c.titre || ""} onChange={e => maj({ titre: e.target.value })} /></Champ>
      {c.type === "reponse_rapide" && <Champ label="Raccourci" aide="Ex. /horaires"><input style={champ} value={c.raccourci || ""} onChange={e => maj({ raccourci: e.target.value || null })} /></Champ>}
    </div>
    <Champ label="Texte *" aide={`${(c.contenu || "").length} / 4000 caractères`}><textarea aria-label="Texte" style={{ ...champ, minHeight: 120 }} maxLength={4000} value={c.contenu || ""} onChange={e => maj({ contenu: e.target.value })} /></Champ>
    {perso.length > 0 && <div role="alert" style={{ fontSize: 12, color: K.alerte }}>Donnée personnelle détectée : {perso.join(", ")}. À retirer avant validation.</div>}
    {init.updated_at && <div style={{ fontSize: 11, color: K.cremeD }}>Version {init.version} · modifiée {libelleInstant(init.updated_at)}{init.valide_le ? ` · validée ${libelleInstant(init.valide_le)}` : ""}. Toute modification d'un texte validé le repasse en brouillon.</div>}
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
      {init.id && init.statut !== "archive" && <button style={bouton("ghost", true)} onClick={async () => { try { await sbUpdate("bsh_assistant_contenus", init.id!, { statut: "archive", valide_le: null }); onFait("Contenu archivé"); } catch (e: any) { setErr(String(e?.message || e)); } }}>Archiver</button>}
      <button style={bouton("ghost")} onClick={onFermer}>Annuler</button>
      <button style={bouton("ghost")} onClick={() => enregistrer(false)}>💾 Brouillon</button>
      <button style={bouton("plein")} onClick={() => enregistrer(true)}>✓ Valider</button>
    </div>
  </Feuille>;
}
