"use client";
// ═══════════════════════════════════════════════════════════
// Registre éditorial — pièces, lexique, matrice des tomes
// • Pièces : identifiant stable, nom d'origine, type, tome, provenance,
//   empreinte SHA-256, preuve (fichier joint / trace / à retrouver),
//   publication (brouillon → à relire → approuvé → publié), trace des
//   validations. Dépôt du fichier d'origine dans le bucket PRIVÉ avec
//   contrôle de l'empreinte (le bon fichier, sans altération).
// • Lexique : entrée, traduction, source, tome, réemplois, statut.
// • Matrice : pour chaque tome, pièces attendues présentes / manquantes.
// • Export CSV / JSON. Tables editions_ressources, editions_lexique (0109).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, uploadStorage, telecharger } from "../events/eventsAtelierLib";
import { BUCKET_HISTOIRES, urlSignee } from "./histoiresLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.6)", or: "#e8b24a", ok: "#4ade80", rouge: "#f87171", bleu: "#60a5fa" };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 13, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 38 };
const btn = (fort = false): React.CSSProperties => ({ minHeight: 38, padding: "7px 11px", borderRadius: 10, border: `1px solid ${fort ? C.or : C.ligne}`, background: fort ? `${C.or}22` : C.card, color: fort ? C.or : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer", whiteSpace: "nowrap" });
const PREUVES: [string, string, string][] = [["fichier_joint", "Fichier joint", C.ok], ["trace_historique", "Trace historique", C.bleu], ["a_retrouver", "À retrouver", C.rouge]];
const PUBLICATIONS: [string, string][] = [["brouillon", "Brouillon"], ["a_relire", "À relire"], ["approuve", "Approuvé"], ["publie", "Publié"]];
const STATUTS_LEX: [string, string][] = [["candidat", "Candidat"], ["atteste", "Attesté par source"], ["relu", "Relu en contexte"], ["approuve", "Approuvé"]];
const ATTENDUS: [string, string][] = [["couverture", "Couverture"], ["double_page", "Doubles pages"], ["quatrieme", "Quatrième"], ["fiche_pedagogique", "Fiche pédagogique"], ["lexique", "Entrées de lexique"], ["manuscrit", "Manuscrit"]];
const TYPES = ["manuscrit", "couverture", "double_page", "illustration", "quatrieme", "fiche_pedagogique", "corrige", "lexique", "apercu_cahier", "cahier", "audio", "integration", "autre"];

async function sha256(f: File) { const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer()); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); }
function exporter(nom: string, lignes: any[], format: "csv" | "json") {
  if (format === "json") return telecharger(new Blob([JSON.stringify(lignes, null, 2)], { type: "application/json" }), nom + ".json");
  const cles = Object.keys(lignes[0] || { vide: "" });
  telecharger(new Blob(["﻿" + [cles.join(";"), ...lignes.map(l => cles.map(k => `"${String(Array.isArray(l[k]) ? l[k].join(",") : typeof l[k] === "object" && l[k] ? JSON.stringify(l[k]) : l[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n")], { type: "text/csv" }), nom + ".csv");
}

export default function EditionsRegistre({ collections }: { collections: { id: string; titre: string; tomes: number }[] }) {
  const [col, setCol] = useState(collections[0]?.id);
  const [vue, setVue] = useState<"pieces" | "lexique" | "matrice">("pieces");
  const [pieces, setPieces] = useState<any[]>([]);
  const [lexique, setLexique] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const charger = async () => {
    try {
      const [p, l] = await Promise.all([sbSelect("editions_ressources", `select=*&collection=eq.${col}&order=tome.asc.nullsfirst,identifiant.asc`), sbSelect("editions_lexique", `select=*&collection=eq.${col}&order=tome_premiere.asc.nullslast,entree.asc`)]);
      setPieces(p); setLexique(l); setMsg("");
    } catch (e: any) { setMsg("⚠️ " + e.message); }
  };
  useEffect(() => { if (col) charger(); }, [col]);
  const majPiece = async (p: any, patch: any, trace?: string) => {
    const validation = trace ? [...(p.validation || []), { le: new Date().toISOString(), action: trace }] : p.validation;
    try { const [r] = await sbUpdate("editions_ressources", p.id, { ...patch, validation, updated_at: new Date().toISOString() }); setPieces(xs => xs.map(x => (x.id === p.id ? r : x))); }
    catch (e: any) { setMsg("⚠️ " + e.message); }
  };
  const deposer = async (p: any, f?: File) => {
    if (!f) return;
    setMsg(`Vérification de « ${f.name} »…`);
    const h = await sha256(f);
    if (p.sha256 && h !== p.sha256 && !confirm(`L'empreinte du fichier ne correspond pas à celle du registre.\nAttendu : ${p.sha256.slice(0, 16)}…\nReçu : ${h.slice(0, 16)}…\nC'est peut-être une autre version. Le déposer quand même (le registre gardera les deux empreintes) ?`)) { setMsg(""); return; }
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const chemin = `${col}/ressources/${p.identifiant}.${ext}`;
      await uploadStorage(chemin, f, f.type || "application/octet-stream", BUCKET_HISTOIRES);
      await majPiece(p, { stockage_chemin: chemin, preuve: "fichier_joint", ...(p.sha256 ? {} : { sha256: h, octets: f.size }), ...(p.sha256 && h !== p.sha256 ? { note: `${p.note || ""} · Version déposée différente : ${h}`.trim() } : {}) }, `Fichier déposé (${h === p.sha256 ? "empreinte conforme" : "empreinte " + h.slice(0, 12)})`);
      setMsg(h === p.sha256 ? "✅ Fichier déposé — empreinte conforme au registre" : "✅ Fichier déposé");
    } catch (e: any) { setMsg("⚠️ " + e.message); }
  };
  const ouvrir = async (p: any) => { const w = window.open("", "_blank"); const u = await urlSignee(p.stockage_chemin, 600); if (u && w) w.location.href = u; else w?.close(); };
  const ajouterPiece = async () => {
    const identifiant = prompt("Identifiant stable de la pièce (ex. tic-t03-double-page-02) :"); if (!identifiant) return;
    try { const [r] = await sbInsert("editions_ressources", { collection: col, identifiant: identifiant.trim(), type: "autre", preuve: "a_retrouver", publication: "brouillon" }); setPieces(xs => [...xs, r]); }
    catch (e: any) { setMsg("⚠️ " + (String(e.message).includes("duplicate") ? "Cet identifiant existe déjà." : e.message)); }
  };
  const ajouterMot = async () => {
    const entree = prompt("Mot ou expression :"); if (!entree) return; const francais = prompt("Traduction française :"); if (!francais) return;
    try { const [r] = await sbInsert("editions_lexique", { collection: col, entree: entree.trim(), francais: francais.trim(), statut: "candidat" }); setLexique(xs => [...xs, r]); }
    catch (e: any) { setMsg("⚠️ " + (String(e.message).includes("duplicate") ? "Ce mot existe déjà." : e.message)); }
  };
  const majMot = async (m: any, patch: any) => {
    try { const [r] = await sbUpdate("editions_lexique", m.id, { ...patch, historique: [...(m.historique || []), { le: new Date().toISOString(), modif: patch }], updated_at: new Date().toISOString() }); setLexique(xs => xs.map(x => (x.id === m.id ? r : x))); }
    catch (e: any) { setMsg("⚠️ " + e.message); }
  };
  const nbTomes = collections.find(c => c.id === col)?.tomes || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: SA, color: C.texte }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {collections.length > 1 && <select style={{ ...champ, width: "auto" }} value={col} onChange={e => setCol(e.target.value)}>{collections.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}</select>}
        <button style={btn(vue === "pieces")} onClick={() => setVue("pieces")}>🗂 Pièces ({pieces.length})</button>
        <button style={btn(vue === "lexique")} onClick={() => setVue("lexique")}>🗣 Lexique ({lexique.length})</button>
        <button style={btn(vue === "matrice")} onClick={() => setVue("matrice")}>▦ Matrice des tomes</button>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("⚠️") ? C.rouge : msg.startsWith("✅") ? C.ok : C.or }}>{msg}</div>}

      {vue === "pieces" && <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn(true)} onClick={ajouterPiece}>+ Pièce</button>
          <button style={btn()} onClick={() => exporter(`registre-${col}`, pieces, "csv")}>⬇️ CSV</button>
          <button style={btn()} onClick={() => exporter(`registre-${col}`, pieces, "json")}>⬇️ JSON</button>
        </div>
        <div style={{ fontSize: 12, color: C.doux }}>Dépose chaque fichier d'origine : son empreinte SHA-256 est comparée au registre. Les fichiers restent privés (aucun lien public).</div>
        {pieces.map(p => { const pr = PREUVES.find(x => x[0] === p.preuve) || PREUVES[2]; return (
          <details key={p.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${pr[2]}`, borderRadius: 12, padding: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 13 }}>
              <b>{p.identifiant}</b> · {p.type}{p.tome ? ` · tome ${p.tome}` : ""} · <span style={{ color: pr[2] }}>{pr[1]}</span> · {PUBLICATIONS.find(x => x[0] === p.publication)?.[1]}{p.stockage_chemin ? " · 📎 déposé" : ""}
              <div style={{ fontSize: 12, color: C.doux, marginTop: 2 }}>{p.nom_original || "—"}</div>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6 }}>
                <select style={champ} value={p.type} onChange={e => majPiece(p, { type: e.target.value })}>{[...new Set([p.type, ...TYPES])].map(t => <option key={t} value={t}>{t}</option>)}</select>
                <input style={champ} type="number" placeholder="Tome" defaultValue={p.tome ?? ""} onBlur={e => majPiece(p, { tome: e.target.value === "" ? null : Number(e.target.value) })} />
                <input style={champ} placeholder="Scène / page" defaultValue={p.scene ?? ""} onBlur={e => majPiece(p, { scene: e.target.value || null })} />
                <input style={champ} placeholder="Niveau (PS, GS, CP…)" defaultValue={p.niveau ?? ""} onBlur={e => majPiece(p, { niveau: e.target.value || null })} />
                <input style={champ} placeholder="Version" defaultValue={p.version ?? ""} onBlur={e => majPiece(p, { version: e.target.value || null })} />
                <select style={champ} value={p.preuve} onChange={e => majPiece(p, { preuve: e.target.value })}>{PREUVES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <select style={champ} value={p.publication} onChange={e => majPiece(p, { publication: e.target.value }, `Statut → ${e.target.value}`)}>{PUBLICATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
              <input style={champ} placeholder="Nom original du fichier" defaultValue={p.nom_original ?? ""} onBlur={e => majPiece(p, { nom_original: e.target.value || null })} />
              <input style={champ} placeholder="Provenance (lien du fil, dossier…)" defaultValue={p.provenance ?? ""} onBlur={e => majPiece(p, { provenance: e.target.value || null })} />
              <textarea style={{ ...champ, minHeight: 44 }} placeholder="Note" defaultValue={p.note ?? ""} onBlur={e => majPiece(p, { note: e.target.value || null })} />
              <div style={{ fontSize: 11, color: C.doux, wordBreak: "break-all" }}>SHA-256 : {p.sha256 || "—"}{p.octets ? ` · ${(p.octets / 1048576).toFixed(2)} Mo` : ""}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <label style={btn()}>📎 {p.stockage_chemin ? "Redéposer" : "Déposer le fichier"}<input type="file" style={{ display: "none" }} onChange={e => { deposer(p, e.target.files?.[0]); e.target.value = ""; }} /></label>
                {p.stockage_chemin && <button style={btn()} onClick={() => ouvrir(p)}>Ouvrir ↗</button>}
              </div>
              {(p.validation || []).length > 0 && <div style={{ fontSize: 11, color: C.doux }}>{p.validation.map((v: any, i: number) => <div key={i}>{new Date(v.le).toLocaleString("fr-FR")} — {v.action}</div>)}</div>}
            </div>
          </details>); })}
      </>}

      {vue === "lexique" && <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn(true)} onClick={ajouterMot}>+ Mot</button>
          <button style={btn()} onClick={() => exporter(`lexique-${col}`, lexique, "csv")}>⬇️ CSV</button>
          <button style={btn()} onClick={() => exporter(`lexique-${col}`, lexique, "json")}>⬇️ JSON</button>
        </div>
        <div style={{ fontSize: 12, color: C.doux }}>Statuts : candidat → attesté par source → relu en contexte (personne compétente en créole guyanais) → approuvé. Seuls les mots approuvés iront dans les albums publiés.</div>
        {lexique.map(m => (
          <div key={m.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}><b style={{ fontSize: 15 }}>{m.entree}</b><span style={{ color: C.doux }}>— {m.francais}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 6 }}>
              <select style={champ} value={m.statut} onChange={e => majMot(m, { statut: e.target.value })}>{STATUTS_LEX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <input style={champ} type="number" placeholder="1re apparition (tome)" defaultValue={m.tome_premiere ?? ""} onBlur={e => majMot(m, { tome_premiere: e.target.value === "" ? null : Number(e.target.value) })} />
              <input style={champ} placeholder="Réemplois (tomes : 2,3)" defaultValue={(m.reemplois || []).join(",")} onBlur={e => majMot(m, { reemplois: e.target.value.split(/[,; ]+/).filter(Boolean).map(Number).filter(Number.isFinite) })} />
              <input style={champ} placeholder="Variante / graphie" defaultValue={m.variante ?? ""} onBlur={e => majMot(m, { variante: e.target.value || null })} />
            </div>
            <input style={champ} placeholder="Exemple en contexte" defaultValue={m.exemple ?? ""} onBlur={e => majMot(m, { exemple: e.target.value || null })} />
            <div style={{ fontSize: 11, color: C.doux }}>Source : {m.source || "—"}{m.rubrique ? ` · ${m.rubrique}` : ""}{m.note ? ` · ${m.note}` : ""}</div>
          </div>
        ))}
      </>}

      {vue === "matrice" && <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 560 }}>
          <thead><tr><th style={{ textAlign: "left", padding: 6, color: C.doux }}>Tome</th>{ATTENDUS.map(([k, l]) => <th key={k} style={{ padding: 6, color: C.doux, fontWeight: 700 }}>{l}</th>)}</tr></thead>
          <tbody>{Array.from({ length: nbTomes }, (_, i) => i + 1).map(n => (
            <tr key={n} style={{ borderTop: `1px solid ${C.ligne}` }}>
              <td style={{ padding: 6, fontWeight: 800 }}>{n}</td>
              {ATTENDUS.map(([k]) => {
                const nb = k === "lexique" ? lexique.filter(m => m.tome_premiere === n).length : pieces.filter(p => p.tome === n && (p.type === k || (k === "double_page" && p.type === "illustration"))).length;
                const app = k === "lexique" ? lexique.filter(m => m.tome_premiere === n && m.statut === "approuve").length : pieces.filter(p => p.tome === n && p.type === k && ["approuve", "publie"].includes(p.publication)).length;
                return <td key={k} style={{ padding: 6, textAlign: "center", color: nb ? (app === nb ? C.ok : C.or) : C.rouge }}>{nb ? `${nb}${app ? ` (${app} ✓)` : ""}` : "manque"}</td>;
              })}
            </tr>))}</tbody>
        </table>
        <div style={{ fontSize: 11, color: C.doux, marginTop: 6 }}>Orange : présent mais pas encore approuvé · Vert : tout approuvé · Rouge : à retrouver ou à produire. Les illustrations non rattachées comptent comme doubles pages à confirmer.</div>
      </div>}
    </div>
  );
}
