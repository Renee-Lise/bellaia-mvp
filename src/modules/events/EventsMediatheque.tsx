"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Event — Médiathèque d'inspiration (déco, papeterie, cliparts)
// Import de DOSSIERS ENTIERS (ordinateur) ou de sélections multiples
// (iPhone / Android), y compris par glisser-déposer de dossiers.
// • compression côté navigateur (≈ 10× moins lourd, transparence gardée)
// • 4 envois en parallèle, barre de progression, pause / reprise
// • reprise sans doublon : un fichier déjà importé (même dossier, même
//   nom, même taille) est ignoré → on peut relancer l'import du même
//   dossier après une coupure.
// Mode "choisir" : utilisé par l'Atelier papeterie pour insérer une image.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { sbSelect, sbInsert, sbDelete, sbUpdate, sbUpdateIds, uploadStorage, supprimerStorage, compresserImage, slug, fmtOctets } from "./eventsAtelierLib";
import { SUPPORTS, THEMES, COULEURS, classerParNom, couleursImage, supportDe, themeDe } from "./classement";

const C = { card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", cream: "#e8e3d5", muted: "rgba(255,255,255,0.45)", gold: "#c9a84c", vert: "#065f46", rose: "#b5838d", rouge: "#f87171", ok: "#4ade80" };
const SA = "Inter,system-ui,sans-serif";
const QUOTA = 1_000_000_000; // offre Supabase gratuite : 1 Go de stockage
const IGNORES = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX)(\/|$)|(^|\/)\._/i;
const ACCEPTE = /\.(jpe?g|png|webp|gif|svg|heic|heif|pdf)$/i;

type Media = { id: string; url: string; chemin_storage: string; nom_fichier: string; dossier: string; type_mime: string; taille_octets: number; taille_stockee: number; largeur?: number; hauteur?: number; created_at: string;
  type_support?: string | null; theme?: string | null; couleurs?: string[]; nature?: string | null };
const NATURES: [string, string][] = [["fond", "Fond / texture"], ["illustration", "Illustration / personnage"], ["gabarit", "Gabarit / modèle"], ["photo", "Photo"], ["logo", "Logo"]];
const coul = (id: string) => COULEURS.find(c => c.id === id);
const Pastille = ({ id, taille = 14 }: { id: string; taille?: number }) => <span title={coul(id)?.libelle} style={{ display: "inline-block", width: taille, height: taille, borderRadius: 99, background: coul(id)?.hex || "#888", border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} />;
type Entree = { file: File; dossier: string };

const btn = (actif = false): React.CSSProperties => ({ padding: "8px 13px", borderRadius: 10, border: `1px solid ${actif ? C.gold : C.border}`, background: actif ? `${C.gold}22` : C.card, color: actif ? C.gold : C.cream, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: SA });

// Parcours récursif d'un dossier glissé-déposé
async function lireEntree(entry: any, chemin: string, out: Entree[]) {
  if (!entry) return;
  if (entry.isFile) {
    const file: File = await new Promise((ok, ko) => entry.file(ok, ko));
    out.push({ file, dossier: chemin });
  } else if (entry.isDirectory) {
    const lecteur = entry.createReader();
    const sous = chemin ? `${chemin}/${entry.name}` : entry.name;
    for (;;) {
      const lot: any[] = await new Promise((ok, ko) => lecteur.readEntries(ok, ko));
      if (!lot.length) break;
      for (const e of lot) await lireEntree(e, sous, out);
    }
  }
}

export default function EventsMediatheque({ mode = "gerer", onChoisir }: { mode?: "gerer" | "choisir"; onChoisir?: (m: Media) => void }) {
  const [medias, setMedias] = useState<Media[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");
  const [dossier, setDossier] = useState<string>("__tous");
  const [fSupport, setFSupport] = useState("__tous");
  const [fTheme, setFTheme] = useState("__tous");
  const [fCouleur, setFCouleur] = useState("__tous");
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [edition, setEdition] = useState<Media | null>(null);
  const [classement, setClassement] = useState<{ fait: number; total: number } | null>(null);
  const [recherche, setRecherche] = useState("");
  const [limite, setLimite] = useState(120);
  const [file_, setFile] = useState<Entree[]>([]);
  const [etat, setEtat] = useState<"repos" | "envoi" | "pause">("repos");
  const [stats, setStats] = useState({ total: 0, faits: 0, ignores: 0, erreurs: 0, gagne: 0 });
  const [journal, setJournal] = useState<string[]>([]);
  const [survol, setSurvol] = useState(false);
  const pauseRef = useRef(false);
  const refDossier = useRef<HTMLInputElement>(null);
  const refFichiers = useRef<HTMLInputElement>(null);

  const charger = async () => {
    setCharge(true); setErreur("");
    try {
      const tous: Media[] = [];
      for (let off = 0; ; off += 1000) {
        const lot = await sbSelect<Media>("events_medias", `select=*&order=created_at.desc&limit=1000&offset=${off}`);
        tous.push(...lot);
        if (lot.length < 1000) break;
      }
      setMedias(tous);
    } catch (e: any) { setErreur(e.message || String(e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);
  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => { if (etat === "envoi") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [etat]);

  const dossiers = useMemo(() => {
    const m = new Map<string, number>();
    medias.forEach(x => m.set(x.dossier || "(sans dossier)", (m.get(x.dossier || "(sans dossier)") || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [medias]);
  const occupe = useMemo(() => medias.reduce((s, x) => s + (x.taille_stockee || 0), 0), [medias]);
  // Hiérarchie : support → thème → couleur (chaque niveau filtre le suivant)
  const nivSupport = useMemo(() => medias.filter(x => dossier === "__tous" || (x.dossier || "(sans dossier)") === dossier), [medias, dossier]);
  const nivTheme = useMemo(() => nivSupport.filter(x => fSupport === "__tous" || (x.type_support || "__aucun") === fSupport), [nivSupport, fSupport]);
  const nivCouleur = useMemo(() => nivTheme.filter(x => fTheme === "__tous" || (x.theme || "__aucun") === fTheme), [nivTheme, fTheme]);
  const compter = (liste: Media[], cle: (m: Media) => string[]) => { const m = new Map<string, number>(); liste.forEach(x => cle(x).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return m; };
  const cSupports = useMemo(() => compter(nivSupport, x => [x.type_support || "__aucun"]), [nivSupport]);
  const cThemes = useMemo(() => compter(nivTheme, x => [x.theme || "__aucun"]), [nivTheme]);
  const cCouleurs = useMemo(() => compter(nivCouleur, x => (x.couleurs?.length ? x.couleurs : ["__aucun"])), [nivCouleur]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return nivCouleur.filter(x => (fCouleur === "__tous" || (fCouleur === "__aucun" ? !x.couleurs?.length : x.couleurs?.includes(fCouleur))) && (!q || x.nom_fichier.toLowerCase().includes(q) || (x.dossier || "").toLowerCase().includes(q)));
  }, [nivCouleur, fCouleur, recherche]);
  const nonClasses = medias.filter(m => !m.type_support || !m.couleurs?.length).length;

  // Classement automatique : support et nature d'après le nom, couleurs d'après l'image
  const classerTout = async () => {
    const cibles = medias.filter(m => !m.type_support || !m.couleurs?.length);
    if (!cibles.length) return;
    setClassement({ fait: 0, total: cibles.length });
    const file = [...cibles]; const maj = new Map<string, Partial<Media>>();
    const ouvrier = async () => { for (;;) { const m = file.shift(); if (!m) return;
      const parNom = classerParNom(m.nom_fichier, m.dossier);
      const patch: any = {};
      if (!m.type_support && parNom.support) patch.type_support = parNom.support;
      if (!m.theme && parNom.theme) patch.theme = parNom.theme;
      if (!m.nature && parNom.nature) patch.nature = parNom.nature;
      if (!m.couleurs?.length) { let c = parNom.couleurs; if (!c.length && m.type_mime !== "application/pdf") { try { c = await couleursImage(m.url); } catch {} } if (c.length) patch.couleurs = c; }
      if (Object.keys(patch).length) { try { await sbUpdate("events_medias", m.id, patch); maj.set(m.id, patch); } catch {} }
      setClassement(s => s && { ...s, fait: s.fait + 1 });
    } };
    await Promise.all(Array.from({ length: 6 }, ouvrier));
    setMedias(xs => xs.map(x => maj.has(x.id) ? { ...x, ...maj.get(x.id) } : x));
    setClassement(null);
  };
  const appliquerSelection = async (patch: any, ajoutCouleur?: string) => {
    if (!selection?.size) return;
    const ids = [...selection];
    try {
      if (ajoutCouleur) { for (const m of medias.filter(x => selection.has(x.id))) { const c = Array.from(new Set([...(m.couleurs || []), ajoutCouleur])); await sbUpdate("events_medias", m.id, { couleurs: c }); } setMedias(xs => xs.map(x => selection.has(x.id) ? { ...x, couleurs: Array.from(new Set([...(x.couleurs || []), ajoutCouleur])) } : x)); }
      else { await sbUpdateIds("events_medias", ids, patch); setMedias(xs => xs.map(x => selection.has(x.id) ? { ...x, ...patch } : x)); }
      setJournal(j => [`✅ ${ids.length} visuel(s) classé(s)`, ...j].slice(0, 50));
    } catch (e: any) { setErreur(e.message); }
  };

  const ajouterALaFile = (entrees: Entree[]) => {
    const ok = entrees.filter(e => !IGNORES.test(`${e.dossier}/${e.file.name}`) && ACCEPTE.test(e.file.name));
    const refuses = entrees.length - ok.length;
    setFile(f => [...f, ...ok]);
    setStats(s => ({ ...s, total: s.total + ok.length }));
    if (refuses) setJournal(j => [`${refuses} fichier(s) ignoré(s) : format non pris en charge ou fichier système`, ...j].slice(0, 50));
  };

  const depuisInput = (lst: FileList | null) => {
    if (!lst) return;
    const e: Entree[] = [];
    Array.from(lst).forEach(f => {
      const rel = (f as any).webkitRelativePath || "";
      const d = rel ? rel.split("/").slice(0, -1).join("/") : "Import du " + new Date().toLocaleDateString("fr-FR");
      e.push({ file: f, dossier: d });
    });
    ajouterALaFile(e);
  };

  const depuisDepot = async (ev: React.DragEvent) => {
    ev.preventDefault(); setSurvol(false);
    const items = Array.from(ev.dataTransfer.items || []);
    const out: Entree[] = [];
    if (items.length && (items[0] as any).webkitGetAsEntry) {
      for (const it of items) await lireEntree((it as any).webkitGetAsEntry(), "", out);
      // fichiers posés à la racine : on les range dans un dossier daté
      out.forEach(o => { if (!o.dossier) o.dossier = "Import du " + new Date().toLocaleDateString("fr-FR"); });
    } else Array.from(ev.dataTransfer.files).forEach(f => out.push({ file: f, dossier: "Import du " + new Date().toLocaleDateString("fr-FR") }));
    ajouterALaFile(out);
  };

  const lancer = async () => {
    if (!file_.length) return;
    pauseRef.current = false; setEtat("envoi");
    const deja = new Set(medias.map(m => `${m.dossier}|${m.nom_fichier}|${m.taille_octets}`));
    const travail = [...file_];
    const nouveaux: Media[] = [];
    const ouvrier = async () => {
      for (;;) {
        if (pauseRef.current) return;
        const e = travail.shift();
        if (!e) return;
        const cle = `${e.dossier}|${e.file.name}|${e.file.size}`;
        if (deja.has(cle)) { setStats(s => ({ ...s, ignores: s.ignores + 1 })); setFile(f => f.filter(x => x !== e)); continue; }
        try {
          if (e.file.size > 50_000_000 && !/^image\//.test(e.file.type)) throw new Error("plus de 50 Mo (limite Supabase)");
          const c = await compresserImage(e.file);
          if (c.blob.size > 50_000_000) throw new Error("plus de 50 Mo après compression");
          const base = e.file.name.replace(/\.[^.]+$/, "");
          const chemin = `${slug(e.dossier).slice(0, 60) || "divers"}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${slug(base)}.${c.ext}`;
          const url = await uploadStorage(chemin, c.blob, c.type);
          const parNom = classerParNom(e.file.name, e.dossier);
          let couleurs = parNom.couleurs;
          if (!couleurs.length && /^image\//.test(c.type) && c.type !== "image/svg+xml") { const u = URL.createObjectURL(c.blob); try { couleurs = await couleursImage(u); } catch {} URL.revokeObjectURL(u); }
          const [row] = await sbInsert<Media>("events_medias", { url, chemin_storage: chemin, nom_fichier: e.file.name, dossier: e.dossier, type_mime: c.type, taille_octets: e.file.size, taille_stockee: c.blob.size, largeur: c.largeur || null, hauteur: c.hauteur || null, type_support: parNom.support, theme: parNom.theme, nature: parNom.nature, couleurs });
          deja.add(cle); if (row) nouveaux.push(row);
          setStats(s => ({ ...s, faits: s.faits + 1, gagne: s.gagne + Math.max(0, e.file.size - c.blob.size) }));
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (/duplicate key|23505/.test(msg)) { setStats(s => ({ ...s, ignores: s.ignores + 1 })); }
          else { setStats(s => ({ ...s, erreurs: s.erreurs + 1 })); setJournal(j => [`❌ ${e.dossier}/${e.file.name} — ${msg}`, ...j].slice(0, 50)); }
        }
        setFile(f => f.filter(x => x !== e));
      }
    };
    await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
    setMedias(m => [...nouveaux.reverse(), ...m]);
    setEtat(pauseRef.current ? "pause" : "repos");
    if (!pauseRef.current) setJournal(j => ["✅ Import terminé", ...j].slice(0, 50));
  };

  const supprimer = async (m: Media) => {
    if (!confirm(`Supprimer « ${m.nom_fichier} » de la médiathèque ?`)) return;
    try { await supprimerStorage(m.chemin_storage); await sbDelete("events_medias", m.id); setMedias(x => x.filter(y => y.id !== m.id)); }
    catch (e: any) { alert("Suppression impossible : " + (e.message || e)); }
  };

  const enCours = etat === "envoi";
  const pct = stats.total ? Math.round(((stats.faits + stats.ignores + stats.erreurs) / stats.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA }}>
      {mode === "gerer" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.cream }}>🖼️ Médiathèque d'inspiration ({medias.length})</div>
          <div
            onDragOver={e => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)} onDrop={depuisDepot}
            style={{ border: `2px dashed ${survol ? C.gold : C.border}`, borderRadius: 14, padding: "16px 14px", textAlign: "center", background: survol ? `${C.gold}10` : C.card }}>
            <div style={{ fontSize: 12, color: C.cream, fontWeight: 700, marginBottom: 4 }}>Glisse ici tes dossiers entiers (ordinateur)</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Les sous-dossiers sont conservés. Photos, PNG transparents, SVG, PDF acceptés.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={btn()} onClick={() => refDossier.current?.click()} disabled={enCours}>📁 Choisir un dossier</button>
              <button style={btn()} onClick={() => refFichiers.current?.click()} disabled={enCours}>🖼️ Choisir des fichiers</button>
            </div>
            <input ref={refDossier} type="file" multiple style={{ display: "none" }} {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => { depuisInput(e.target.files); e.target.value = ""; }} />
            <input ref={refFichiers} type="file" multiple accept="image/*,.svg,.pdf" style={{ display: "none" }} onChange={e => { depuisInput(e.target.files); e.target.value = ""; }} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Sur iPhone : « Choisir des fichiers » → Sélectionner → tout sélectionner dans le dossier (l'app Fichiers ne permet pas de choisir un dossier entier).</div>
          </div>

          {(stats.total > 0 || file_.length > 0) && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.cream }}>
                <span>{enCours ? "Envoi en cours…" : etat === "pause" ? "En pause" : file_.length ? `${file_.length} fichier(s) prêts` : "Terminé"}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${C.vert},${C.ok})`, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>
                ✅ {stats.faits} envoyés · ⏭️ {stats.ignores} déjà présents · ❌ {stats.erreurs} erreurs · 💾 {fmtOctets(stats.gagne)} économisés par la compression
              </div>
              {enCours && <div style={{ fontSize: 11, color: C.gold }}>Garde cette page ouverte et l'écran allumé pendant l'envoi. En cas de coupure, relance le même dossier : rien ne sera envoyé deux fois.</div>}
              <div style={{ display: "flex", gap: 8 }}>
                {!enCours && file_.length > 0 && <button style={btn(true)} onClick={lancer}>⬆️ {etat === "pause" ? "Reprendre" : "Lancer l'envoi"} ({file_.length})</button>}
                {enCours && <button style={btn()} onClick={() => { pauseRef.current = true; }}>⏸️ Pause</button>}
                {!enCours && <button style={btn()} onClick={() => { setFile([]); setStats({ total: 0, faits: 0, ignores: 0, erreurs: 0, gagne: 0 }); setEtat("repos"); }}>Vider</button>}
              </div>
              {journal.length > 0 && <div style={{ maxHeight: 110, overflowY: "auto", fontSize: 10, color: C.muted, display: "flex", flexDirection: "column", gap: 2 }}>{journal.map((l, i) => <div key={i}>{l}</div>)}</div>}
            </div>
          )}

          <div style={{ fontSize: 11, color: occupe > QUOTA * 0.8 ? C.rouge : C.muted }}>
            Espace utilisé : {fmtOctets(occupe)} / 1 Go (offre gratuite Supabase)
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, marginTop: 4 }}><div style={{ width: `${Math.min(100, (occupe / QUOTA) * 100)}%`, height: "100%", background: occupe > QUOTA * 0.8 ? C.rouge : C.rose, borderRadius: 99 }} /></div>
          </div>
        </>
      )}

      {erreur && <div style={{ color: C.rouge, fontSize: 12 }}>⚠️ {erreur}</div>}

      <Niveau titre="1 · Support" valeur={fSupport} onChange={v => { setFSupport(v); setFTheme("__tous"); setFCouleur("__tous"); setLimite(120); }}
        options={[...cSupports.keys()].sort((a, b) => (cSupports.get(b) || 0) - (cSupports.get(a) || 0)).map(k => [k, k === "__aucun" ? "Non classé" : `${supportDe(k)?.ico || ""} ${supportDe(k)?.libelle || k}`, cSupports.get(k) || 0])} total={nivSupport.length} />
      <Niveau titre="2 · Thème" valeur={fTheme} onChange={v => { setFTheme(v); setFCouleur("__tous"); setLimite(120); }}
        options={[...cThemes.keys()].sort((a, b) => (cThemes.get(b) || 0) - (cThemes.get(a) || 0)).map(k => [k, k === "__aucun" ? "Sans thème" : themeDe(k)?.libelle || k, cThemes.get(k) || 0])} total={nivTheme.length} />
      <Niveau titre="3 · Couleur" valeur={fCouleur} onChange={v => { setFCouleur(v); setLimite(120); }}
        options={[...cCouleurs.keys()].sort((a, b) => (cCouleurs.get(b) || 0) - (cCouleurs.get(a) || 0)).map(k => [k, k === "__aucun" ? "Sans couleur" : coul(k)?.libelle || k, cCouleurs.get(k) || 0, k])} total={nivCouleur.length} />
      {mode === "gerer" && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {nonClasses > 0 && <button style={btn(true)} onClick={classerTout} disabled={!!classement}>{classement ? `⏳ Classement… ${classement.fait}/${classement.total}` : `✨ Classer automatiquement (${nonClasses})`}</button>}
        <button style={btn(!!selection)} onClick={() => setSelection(s => s ? null : new Set())}>{selection ? `☑️ ${selection.size} sélectionné(s) — terminer` : "☑️ Sélectionner pour classer"}</button>
        {selection && <button style={btn()} onClick={() => setSelection(new Set(visibles.slice(0, limite).map(m => m.id)))}>Tout sélectionner ({Math.min(visibles.length, limite)})</button>}
      </div>}
      {selection && selection.size > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: C.card, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: 10 }}>
          <select style={{ ...btn(), flex: "1 1 150px" }} value="" onChange={e => e.target.value && appliquerSelection({ type_support: e.target.value === "__aucun" ? null : e.target.value })}><option value="">Support…</option>{SUPPORTS.map(s => <option key={s.id} value={s.id}>{s.ico} {s.libelle}</option>)}<option value="__aucun">Retirer le support</option></select>
          <select style={{ ...btn(), flex: "1 1 150px" }} value="" onChange={e => e.target.value && appliquerSelection({ theme: e.target.value === "__aucun" ? null : e.target.value })}><option value="">Thème…</option>{THEMES.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}<option value="__aucun">Retirer le thème</option></select>
          <select style={{ ...btn(), flex: "1 1 150px" }} value="" onChange={e => e.target.value && appliquerSelection({}, e.target.value)}><option value="">+ Couleur…</option>{COULEURS.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}</select>
          <select style={{ ...btn(), flex: "1 1 150px" }} value="" onChange={e => e.target.value && appliquerSelection({ nature: e.target.value })}><option value="">Nature…</option>{NATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={dossier} onChange={e => { setDossier(e.target.value); setLimite(120); }} style={{ ...btn(), flex: "1 1 160px" }}>
          <option value="__tous">Tous les dossiers ({medias.length})</option>
          {dossiers.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}
        </select>
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un fichier…" style={{ ...btn(), flex: "1 1 160px", fontWeight: 400, outline: "none" }} />
      </div>

      {charge ? <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20 }}>Chargement…</div>
        : visibles.length === 0 ? <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20 }}>Aucun visuel {medias.length ? "pour ce filtre" : "pour l'instant — importe tes dossiers ci-dessus"}.</div>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 }}>
              {visibles.slice(0, limite).map(m => (
                <div key={m.id} style={{ position: "relative", background: "repeating-conic-gradient(#2a2630 0% 25%, #221f27 0% 50%) 50%/14px 14px", border: `${selection?.has(m.id) ? 3 : 1}px solid ${selection?.has(m.id) ? C.gold : C.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer" }}
                  onClick={() => { if (mode === "choisir") return onChoisir?.(m); if (selection) return setSelection(s => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; }); setEdition(m); }} title={`${m.dossier}/${m.nom_fichier}`}>
                  {m.type_mime === "application/pdf"
                    ? <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📄</div>
                    : <img src={m.url} alt={m.nom_fichier} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", display: "block" }} />}
                  <div style={{ fontSize: 9, color: C.muted, padding: "3px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "rgba(0,0,0,0.5)", display: "flex", gap: 3, alignItems: "center" }}>{(m.couleurs || []).slice(0, 3).map(c => <Pastille key={c} id={c} taille={8} />)}<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{supportDe(m.type_support)?.ico} {m.nom_fichier}</span></div>
                  {mode === "gerer" && !selection && <button onClick={ev => { ev.stopPropagation(); supprimer(m); }} style={{ position: "absolute", top: 4, right: 4, border: "none", borderRadius: 99, width: 22, height: 22, background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: 11 }}>✕</button>}
                </div>
              ))}
            </div>
          )}
      {visibles.length > limite && <button style={btn()} onClick={() => setLimite(l => l + 120)}>Afficher plus ({visibles.length - limite} restants)</button>}
      {edition && (
        <div onClick={() => setEdition(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#16131c", border: `1px solid ${C.border}`, borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 8, maxHeight: "88vh", overflowY: "auto" }}>
            <img src={edition.url} alt="" style={{ maxHeight: 220, objectFit: "contain", background: "repeating-conic-gradient(#2a2630 0% 25%, #221f27 0% 50%) 50%/14px 14px", borderRadius: 10 }} />
            <div style={{ fontSize: 12, color: C.cream, wordBreak: "break-all" }}>{edition.nom_fichier}</div>
            {([["type_support", "Support", SUPPORTS.map(s => [s.id, `${s.ico} ${s.libelle}`])], ["theme", "Thème", THEMES.map(t => [t.id, t.libelle])], ["nature", "Nature", NATURES]] as const).map(([cle, l, opts]) => (
              <select key={cle} style={btn()} value={(edition as any)[cle] || ""} onChange={async e => { const v = e.target.value || null; await sbUpdate("events_medias", edition.id, { [cle]: v }); setEdition({ ...edition, [cle]: v }); setMedias(xs => xs.map(x => x.id === edition.id ? { ...x, [cle]: v } : x)); }}>
                <option value="">{l} : non défini</option>{(opts as any).map(([v, t]: any) => <option key={v} value={v}>{l} : {t}</option>)}
              </select>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{COULEURS.map(c => { const on = edition.couleurs?.includes(c.id); return <button key={c.id} style={{ ...btn(on), padding: "4px 8px", fontSize: 11, display: "flex", gap: 5, alignItems: "center" }} onClick={async () => { const n = on ? (edition.couleurs || []).filter(x => x !== c.id) : [...(edition.couleurs || []), c.id]; await sbUpdate("events_medias", edition.id, { couleurs: n }); setEdition({ ...edition, couleurs: n }); setMedias(xs => xs.map(x => x.id === edition.id ? { ...x, couleurs: n } : x)); }}><Pastille id={c.id} taille={10} />{c.libelle}</button>; })}</div>
            <button style={btn()} onClick={() => setEdition(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Niveau({ titre, valeur, onChange, options, total }: { titre: string; valeur: string; onChange: (v: string) => void; options: (string | number)[][]; total: number }) {
  if (options.length <= 1 && options[0]?.[0] === "__aucun") return null;
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
      <span style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", minWidth: 74 }}>{titre}</span>
      <button style={{ ...btn(valeur === "__tous"), padding: "4px 9px", fontSize: 11, flexShrink: 0 }} onClick={() => onChange("__tous")}>Tous ({total})</button>
      {options.map(([v, l, n, pastille]) => <button key={v as string} style={{ ...btn(valeur === v), padding: "4px 9px", fontSize: 11, flexShrink: 0, display: "flex", gap: 5, alignItems: "center" }} onClick={() => onChange(v as string)}>{pastille && pastille !== "__aucun" ? <Pastille id={pastille as string} taille={10} /> : null}{l} ({n})</button>)}
    </div>
  );
}
