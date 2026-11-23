"use client";
// ═══════════════════════════════════════════════════════════
// Suivi des exigences — espace fondatrice
// Tableau unique des exigences et des travaux : pour chaque consigne,
// reçue / dans le rapport / développée / testée / déployée, preuve,
// travail restant, priorité et statut (8 statuts du registre).
// Données : une ligne de bellaia_actions (cle = « suivi_exigences »,
// RLS : fondatrice uniquement). Les rapports privés y sont aussi
// conservés (texte intégral) pour ne pas dépendre d'un fichier temporaire.
// Aucune donnée n'est inscrite dans le dépôt public.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate } from "../events/eventsAtelierLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", bleu: "#60a5fa", violet: "#a78bfa" };
export const STATUTS_SUIVI: [string, string, string][] = [
  ["a_faire", "À faire", C.doux], ["en_cours", "En cours", C.bleu], ["bloque", "Bloqué", C.rouge], ["a_tester", "À tester", C.violet],
  ["a_valider", "À valider", C.orange], ["valide", "Validé", C.ok], ["deploye", "Déployé", "#22d3ee"], ["archive", "Archivé", "rgba(241,236,224,0.35)"],
];
const BLOCS: Record<string, string> = { "1": "Entreprise & univers", "2": "Atelier, Pinterest, Etsy, sécurité", "3": "PHB, Red Team, Bloxks, outils", "4": "Jeux, audiovisuel, délégation, 30 k€", "5": "Éditions", "6": "Autres consignes", "7": "Messagerie, design et veille" };
const PRIO: Record<number, [string, string]> = { 1: ["Urgent", C.rouge], 2: ["Important", C.orange], 3: ["Quand possible", C.bleu], 4: ["Plus tard", C.doux] };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", boxSizing: "border-box", minHeight: 42 };
const btn = (fort = false, c = C.or): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box", minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const couleurValeur = (v: string) => /^oui|^production/i.test(v) ? C.ok : /^partiel|^prévisualisation|^vérifié/i.test(v) ? C.orange : /^non/i.test(v) ? C.rouge : C.doux;

export type Exigence = { id: string; b: string; u: string; t: string; r: string; a: string; d: string; te: string; tp?: string; de: string; p: string; re: string; pr: number; s: string; resp?: string; dec?: string; h?: any[] };
// Règle du registre : jamais « Déployé » sans identifiant de déploiement de production.
export const preuveDeploiementValide = (preuve: string) => /dpl_[A-Za-z0-9]{8,}/.test(preuve || "");

export default function SuiviExigences({ onRetour }: { onRetour?: () => void }) {
  const [ligne, setLigne] = useState<any>(null);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");
  const [onglet, setOnglet] = useState<"exigences" | "rapports">("exigences");
  const [bloc, setBloc] = useState("");
  const [statut, setStatut] = useState("");
  const [prio, setPrio] = useState(0);
  const [q, setQ] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [rapport, setRapport] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const lire = async () => (await sbSelect("bellaia_actions", "select=*&cle=eq.suivi_exigences&limit=1"))[0] || null;
  const charger = async () => {
    setCharge(true); setErreur("");
    try { setLigne(await lire()); } catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const pieces: any[] = Array.isArray(ligne?.pieces_jointes) ? ligne.pieces_jointes : [];
  const items: Exigence[] = pieces.find(p => p?.type === "suivi_exigences")?.items || [];
  const rapports = pieces.filter(p => p?.type === "rapport");
  const visibles = useMemo(() => items.filter(x => (!bloc || x.b === bloc) && (!statut || x.s === statut) && (!prio || x.pr === prio)
    && (!q || `${x.id} ${x.t} ${x.u} ${x.re} ${x.p} ${x.resp || ""} ${x.dec || ""}`.toLowerCase().includes(q.toLowerCase()))), [items, bloc, statut, prio, q]);
  const nbDecisions = items.filter(x => x.dec && x.s !== "archive").length;
  const compte = (s: string) => items.filter(x => x.s === s).length;

  // Relit la ligne avant d'écrire (évite d'écraser une modification faite ailleurs), puis remplace l'exigence modifiée.
  const changerStatut = async (x: Exigence, s: string) => {
    let preuve = x.p;
    if (s === "deploye" && !preuveDeploiementValide(preuve)) {
      const id = prompt("Identifiant du déploiement de production (dpl_…) — obligatoire pour « Déployé » :") || "";
      if (!preuveDeploiementValide(id)) { setMsg("❌ « Déployé » refusé : identifiant de déploiement de production manquant ou invalide."); return; }
      preuve = `${preuve} · Production : ${id.trim()}`;
    }
    try {
      const frais = await lire(); if (!frais) throw new Error("Ligne de suivi introuvable.");
      const pj = (frais.pieces_jointes || []).map((p: any) => p?.type !== "suivi_exigences" ? p : {
        ...p, items: (p.items || []).map((it: Exigence) => it.id !== x.id ? it : { ...it, s, p: preuve, h: [...(it.h || []), { le: new Date().toISOString(), de: it.s, a: s }] }),
      });
      const [n] = await sbUpdate("bellaia_actions", frais.id, { pieces_jointes: pj, updated_at: new Date().toISOString() });
      setLigne(n); setMsg(`✅ ${x.id} : ${STATUTS_SUIVI.find(t => t[0] === s)?.[1]} (enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})`);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const telecharger = (r: any) => {
    const url = URL.createObjectURL(new Blob([r.contenu || ""], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = r.nom || "rapport.md"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onRetour && <button style={btn()} onClick={onRetour} aria-label="Retour">← Retour</button>}
        <div style={{ fontSize: 20, fontWeight: 900 }}>🧭 Suivi des exigences</div>
      </div>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>
        Chaque consigne est suivie séparément : reçue, présente dans le rapport, développée, testée, déployée — avec sa preuve. Une consigne citée dans un rapport n'est pas une consigne exécutée.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn(onglet === "exigences")} onClick={() => setOnglet("exigences")}>Exigences ({items.length})</button>
        <button style={btn(onglet === "rapports")} onClick={() => setOnglet("rapports")}>Rapports privés ({rapports.length})</button>
        <button style={btn()} onClick={charger}>↻ Actualiser</button>
      </div>
      {msg && <div role="status" style={{ fontSize: 13 }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {erreur && <div style={{ color: C.rouge }}>Lecture impossible : {erreur}</div>}
      {!charge && !erreur && !ligne && <div style={{ color: C.doux }}>Aucun tableau de suivi enregistré pour le moment.</div>}

      {onglet === "exigences" && ligne && <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUTS_SUIVI.map(([k, l, c]) => <button key={k} style={{ ...btn(statut === k, c), minHeight: 34, padding: "4px 10px", fontSize: 12 }} onClick={() => setStatut(statut === k ? "" : k)}>{l} · {compte(k)}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input style={{ ...champ, flex: "1 1 200px" }} placeholder="Rechercher une exigence…" value={q} onChange={e => setQ(e.target.value)} />
          <select style={champ} value={bloc} onChange={e => setBloc(e.target.value)}><option value="">Toutes les consignes</option>{Object.entries(BLOCS).map(([k, l]) => <option key={k} value={k}>{k}. {l}</option>)}</select>
          <select style={champ} value={prio} onChange={e => setPrio(Number(e.target.value))}><option value={0}>Toutes priorités</option>{Object.entries(PRIO).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div style={{ fontSize: 12, color: C.doux }}>{visibles.length} exigence{visibles.length > 1 ? "s" : ""} affichée{visibles.length > 1 ? "s" : ""} · {nbDecisions} décision{nbDecisions > 1 ? "s" : ""} attendue{nbDecisions > 1 ? "s" : ""} de votre part</div>
        {visibles.map(x => {
          const st = STATUTS_SUIVI.find(t => t[0] === x.s) || STATUTS_SUIVI[0];
          const ouvert = ouverte === x.id;
          return (
            <div key={x.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12 }}>
              <button onClick={() => setOuverte(ouvert ? null : x.id)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }} aria-expanded={ouvert}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.doux, fontWeight: 800 }}>{x.id} · {x.u}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: st[2], background: `${st[2]}1f`, borderRadius: 99, padding: "1px 8px" }}>{st[1]}</span>
                  {PRIO[x.pr] && <span style={{ fontSize: 11, fontWeight: 800, color: PRIO[x.pr][1] }}>{PRIO[x.pr][0]}</span>}
                  {x.dec && <span style={{ fontSize: 11, fontWeight: 800, color: C.orange }}>⚖︎ décision attendue</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, lineHeight: 1.35 }}>{x.t}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {([["Reçue", x.r], ["Rapport", x.a], ["Développée", x.d], ["Test local", x.te], ["Test prévisu", x.tp || "Non"], ["Production", x.de]] as const).map(([l, v]) =>
                    <span key={l} style={{ fontSize: 11, borderRadius: 8, padding: "2px 7px", border: `1px solid ${couleurValeur(v)}55`, color: couleurValeur(v) }}>{l} : {String(v).split(/[ (—:]/)[0]}</span>)}
                </div>
              </button>
              {ouvert && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
                {([["Responsable", x.resp || "À désigner"], ["Reçue", x.r], ["Présente dans le rapport", x.a], ["Développée", x.d], ["Testée localement (résultat)", x.te], ["Testée en prévisualisation (base réelle)", x.tp || "Non"], ["Déployée en production", x.de], ["Preuve vérifiable", x.p], ["Travail restant", x.re], ["Décision à valider par la fondatrice", x.dec]] as const).map(([l, v]) => v ? (
                  <div key={l}><div style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase" }}>{l}</div><div>{v}</div></div>) : null)}
                <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase" }}>Statut</span>
                  <select style={champ} value={x.s} onChange={e => changerStatut(x, e.target.value)}>{STATUTS_SUIVI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </label>
                {(x.h || []).length > 0 && <details><summary style={{ fontSize: 12, color: C.doux, cursor: "pointer" }}>Historique ({x.h!.length})</summary>
                  {[...x.h!].reverse().map((h: any, i: number) => <div key={i} style={{ fontSize: 12, color: C.doux }}>{new Date(h.le).toLocaleString("fr-FR")} · {STATUTS_SUIVI.find(t => t[0] === h.de)?.[1] || h.de || "—"} → {STATUTS_SUIVI.find(t => t[0] === h.a)?.[1] || h.a}{h.note ? ` — ${h.note}` : ""}</div>)}
                </details>}
              </div>}
            </div>
          );
        })}
      </>}

      {onglet === "rapports" && ligne && (rapport === null
        ? rapports.map((r, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px" }}><div style={{ fontWeight: 700 }}>{r.titre || r.nom}</div><div style={{ fontSize: 12, color: C.doux }}>{r.le ? new Date(r.le).toLocaleDateString("fr-FR") : ""} · {Math.round((r.contenu || "").length / 1024)} Ko · privé</div></div>
            <button style={btn(true)} onClick={() => setRapport(i)}>Lire</button>
            <button style={btn()} onClick={() => telecharger(r)}>⬇︎ Télécharger</button>
          </div>))
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "sticky", top: 0, background: "#0b0709", padding: "6px 0", zIndex: 2 }}>
              <button style={btn()} onClick={() => setRapport(null)}>← Retour aux rapports</button>
              <button style={btn()} onClick={() => telecharger(rapports[rapport])}>⬇︎ Télécharger</button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: SA, fontSize: 14, lineHeight: 1.55, background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 14, margin: 0 }}>{rapports[rapport]?.contenu}</pre>
          </div>)}
    </div>
  );
}
