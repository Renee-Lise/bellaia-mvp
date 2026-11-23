"use client";
// ═══════════════════════════════════════════════════════════
// Actions requises — espace fondatrice
// Toutes les décisions qui attendent la fondatrice, au même endroit :
// univers, décision attendue, données manquantes, priorité,
// fonctionnalités bloquées, conséquences de la validation.
// Table : bellaia_actions (migration 0111) — fondatrice uniquement.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate, sbInsert } from "../events/eventsAtelierLib";
import { deposerPrive, ouvrirPrive, nomFichierSur } from "./equipeLib";
import { compterActions } from "../../lib/actionsRequises";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", bleu: "#60a5fa" };
const PRIO: Record<number, [string, string]> = { 1: ["Urgent", C.rouge], 2: ["Important", C.orange], 3: ["Quand possible", C.bleu], 4: ["Plus tard", C.doux] };
// État détaillé (dernier « etat » inscrit dans l'historique) — distingue ce qui est réellement en service.
export const ETATS: Record<string, [string, string]> = {
  operationnel: ["Opérationnel", "#4ade80"], developpe_teste: ["Développé et testé", "#60a5fa"], previsualisation: ["En prévisualisation", "#c9a96e"],
  attente_migration: ["En attente de migration", "#a78bfa"], attente_validation: ["En attente de validation", "#fb923c"], bloque: ["Bloqué", "#f87171"],
};
export const etatDe = (a: any): string | null => { const h = Array.isArray(a?.historique) ? a.historique : []; for (let i = h.length - 1; i >= 0; i--) if (h[i]?.etat && ETATS[h[i].etat]) return h[i].etat; return null; };
const STATUTS: [string, string][] = [["a_faire", "À faire"], ["en_cours", "En cours"], ["fait", "Fait"], ["reporte", "Reporté"]];
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
const btn = (fort = false, c = C.or): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box", minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });

export default function ActionsRequises() {
  const [actions, setActions] = useState<any[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState<"ouvertes" | "toutes" | "faites">("ouvertes");
  const [univers, setUnivers] = useState("");
  const [prio, setPrio] = useState(0);
  const [etatFiltre, setEtatFiltre] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const charger = async () => {
    setCharge(true); setErreur("");
    // La ligne « suivi_exigences » porte le tableau de suivi (écran dédié) : ce n'est pas une décision à prendre.
    try { setActions((await sbSelect("bellaia_actions", "select=*&order=priorite.asc,created_at.asc")).filter((a: any) => a.cle !== "suivi_exigences")); }
    catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const listeUnivers = useMemo(() => Array.from(new Set(actions.map(a => a.univers))).sort(), [actions]);
  const visibles = actions.filter(a =>
    (filtre === "toutes" || (filtre === "faites" ? a.statut === "fait" : a.statut !== "fait")) && (!univers || a.univers === univers) && (!prio || a.priorite === prio) && (!etatFiltre || etatDe(a) === etatFiltre));
  const titreDe = (cle: string) => actions.find(x => x.cle === cle)?.titre || cle;
  const bloquePar = (a: any) => (a.depend_de || []).filter((c: string) => actions.some(x => x.cle === c && x.statut !== "fait"));
  const joindre = async (a: any, f?: File) => {
    if (!f) return;
    try {
      const chemin = `actions/${a.id}/${Date.now()}-${nomFichierSur(f.name)}`;
      await deposerPrive(chemin, f, f.type);
      await maj(a, { pieces_jointes: [...(a.pieces_jointes || []), { chemin, nom: f.name, le: new Date().toISOString() }] });
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const compte = compterActions(actions);
  const nbOuvertes = compte.aTraiter;
  const nbUrgentes = compte.urgentes;

  const maj = async (a: any, patch: any) => {
    try {
      const [n] = await sbUpdate("bellaia_actions", a.id, { ...patch, updated_at: new Date().toISOString(), ...(patch.statut === "fait" ? { resolu_le: new Date().toISOString() } : {}) });
      setActions(l => l.map(x => x.id === a.id ? n : x));
      setMsg(`✅ Enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  const ajouter = async () => {
    const titre = prompt("Titre de la nouvelle action ?"); if (!titre) return;
    try { const [n] = await sbInsert("bellaia_actions", { univers: univers || "Général", titre, decision: titre, priorite: 2 }); setActions(l => [...l, n]); setOuverte(n.id); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>📌 Actions requises</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          Les décisions et informations que vous seule pouvez donner. Répondez directement ici : rien n'est publié ni mis en production sans votre accord.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...btn(true, C.rouge), cursor: "default" }}>{nbUrgentes} urgente{nbUrgentes > 1 ? "s" : ""}</div>
        <div style={{ ...btn(true), cursor: "default" }}>{nbOuvertes} en attente</div>
        {compte.enCours > 0 && <div style={{ ...btn(false), cursor: "default" }}>{compte.enCours} en cours</div>}
        <button style={btn()} onClick={ajouter}>＋ Ajouter</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["ouvertes", "En attente"], ["faites", "Faites"], ["toutes", "Toutes"]] as const).map(([k, l]) =>
          <button key={k} style={btn(filtre === k)} onClick={() => setFiltre(k)}>{l}</button>)}
        <select style={{ ...champ, width: "auto", minWidth: 160 }} value={univers} onChange={e => setUnivers(e.target.value)}>
          <option value="">Tous les univers</option>
          {listeUnivers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select style={{ ...champ, width: "auto", minWidth: 140 }} value={prio} onChange={e => setPrio(Number(e.target.value))}>
          <option value={0}>Toutes priorités</option>{[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRIO[p][0]}</option>)}
        </select>
        <select aria-label="État" style={{ ...champ, width: "auto", minWidth: 170 }} value={etatFiltre} onChange={e => setEtatFiltre(e.target.value)}>
          <option value="">Tous les états</option>{Object.entries(ETATS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {erreur && <div style={{ color: C.rouge }}>{erreur}</div>}
      {!charge && !visibles.length && <div style={{ color: C.doux, padding: 20, textAlign: "center" }}>Rien en attente ici. 🎉</div>}

      {visibles.map(a => {
        const [pl, pc] = PRIO[a.priorite] || PRIO[2];
        const ouv = ouverte === a.id;
        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${a.statut === "fait" ? C.ok : pc}`, borderRadius: 14, padding: 14, opacity: a.statut === "fait" ? 0.7 : 1 }}>
            <button onClick={() => setOuverte(ouv ? null : a.id)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.or, textTransform: "uppercase" }}>{a.univers}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: pc, border: `1px solid ${pc}66`, borderRadius: 99, padding: "1px 8px" }}>{pl}</span>
                {(() => { const e = etatDe(a); return e ? <span style={{ fontSize: 11, fontWeight: 800, color: ETATS[e][1], background: `${ETATS[e][1]}1f`, borderRadius: 99, padding: "1px 8px" }}>{ETATS[e][0]}</span> : null; })()}
                <span style={{ fontSize: 11, color: C.doux }}>{STATUTS.find(s => s[0] === a.statut)?.[1]}{a.reponse && a.statut !== "fait" ? " · réponse partielle" : ""}</span>
                {a.date_limite && <span style={{ fontSize: 11, fontWeight: 800, color: new Date(a.date_limite) < new Date() && a.statut !== "fait" ? C.rouge : C.doux }}>⏰ {new Date(a.date_limite + "T12:00").toLocaleDateString("fr-FR")}</span>}
                {bloquePar(a).length > 0 && <span style={{ fontSize: 11, color: C.doux }}>🔗 après {bloquePar(a).length} action(s)</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{a.titre}</div>
              {!ouv && <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.45 }}>{a.decision}</div>}
            </button>
            {ouv && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {([["Décision attendue", a.decision], ["Données manquantes", a.donnees_manquantes], ["Fonctionnalités bloquées", a.bloque], ["Après validation", a.consequences]] as const).filter(x => x[1]).map(([t, v]) => (
                  <div key={t}><div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase" }}>{t}</div><div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 2 }}>{v}</div></div>
                ))}
                {(a.depend_de || []).length > 0 && (
                  <div><div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase" }}>Dépend de</div>
                    {(a.depend_de || []).map((c: string) => { const d = actions.find(x => x.cle === c); return <div key={c} style={{ fontSize: 13 }}>{d?.statut === "fait" ? "✅" : "⏳"} {titreDe(c)}</div>; })}
                  </div>)}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase" }}>Date limite</div>
                  <input type="date" style={{ ...champ, width: "auto" }} value={a.date_limite || ""} onChange={e => maj(a, { date_limite: e.target.value || null })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", marginBottom: 4 }}>Pièces jointes</div>
                  {(a.pieces_jointes || []).map((pj: any, i: number) => <button key={i} style={{ ...btn(), marginRight: 6, marginBottom: 6 }} onClick={() => ouvrirPrive(pj.chemin)}>📎 {pj.nom}</button>)}
                  <label style={btn()}>＋ Joindre un document<input type="file" accept="application/pdf,image/*,.heic,.doc,.docx" style={{ display: "none" }} onChange={e => joindre(a, e.target.files?.[0])} /></label>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", marginBottom: 4 }}>Votre réponse</div>
                  <textarea style={{ ...champ, minHeight: 90 }} placeholder="Écrivez votre décision ou les informations demandées…"
                    value={brouillon[a.id] ?? a.reponse ?? ""} onChange={e => setBrouillon(b => ({ ...b, [a.id]: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={btn(true)} onClick={() => maj(a, { reponse: brouillon[a.id] ?? a.reponse ?? "", statut: a.statut === "a_faire" ? "en_cours" : a.statut })}>💾 Enregistrer (réponse partielle)</button>
                  {a.statut !== "fait"
                    ? <button style={btn(true, C.ok)} onClick={() => maj(a, { reponse: brouillon[a.id] ?? a.reponse ?? "", statut: "fait" })}>✓ Fait / validé</button>
                    : <button style={btn()} onClick={() => maj(a, { statut: "en_cours", resolu_le: null })}>↺ Rouvrir</button>}
                  {a.statut !== "reporte" && a.statut !== "fait" && <button style={btn()} onClick={() => maj(a, { statut: "reporte" })}>⏸ Reporter</button>}
                  <select style={{ ...champ, width: "auto" }} value={a.priorite} onChange={e => maj(a, { priorite: Number(e.target.value) })}>
                    {[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRIO[p][0]}</option>)}
                  </select>
                </div>
                {a.resolu_le && <div style={{ fontSize: 12, color: C.doux }}>Validé le {new Date(a.resolu_le).toLocaleString("fr-FR")}</div>}
                {(a.historique || []).length > 0 && (
                  <details><summary style={{ fontSize: 12, color: C.doux, cursor: "pointer" }}>Historique des décisions ({a.historique.length})</summary>
                    {[...a.historique].reverse().map((h: any, i: number) => <div key={i} style={{ fontSize: 12, color: C.doux, borderTop: `1px solid ${C.ligne}`, padding: "4px 0" }}>{new Date(h.le).toLocaleString("fr-FR")} · {STATUTS.find(s => s[0] === h.statut)?.[1] || h.statut}{h.reponse ? ` — « ${String(h.reponse).slice(0, 160)} »` : ""}</div>)}
                  </details>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
