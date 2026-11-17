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
import { sbSelect, sbInsert, sbDelete, uploadStorage, supprimerStorage, compresserImage, slug, fmtOctets } from "./eventsAtelierLib";

const C = { card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", cream: "#e8e3d5", muted: "rgba(255,255,255,0.45)", gold: "#c9a84c", vert: "#065f46", rose: "#b5838d", rouge: "#f87171", ok: "#4ade80" };
const SA = "Inter,system-ui,sans-serif";
const QUOTA = 1_000_000_000; // offre Supabase gratuite : 1 Go de stockage
const IGNORES = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX)(\/|$)|(^|\/)\._/i;
const ACCEPTE = /\.(jpe?g|png|webp|gif|svg|heic|heif|pdf)$/i;

type Media = { id: string; url: string; chemin_storage: string; nom_fichier: string; dossier: string; type_mime: string; taille_octets: number; taille_stockee: number; largeur?: number; hauteur?: number; created_at: string };
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
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return medias.filter(x => (dossier === "__tous" || (x.dossier || "(sans dossier)") === dossier) && (!q || x.nom_fichier.toLowerCase().includes(q) || (x.dossier || "").toLowerCase().includes(q)));
  }, [medias, dossier, recherche]);

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
          const [row] = await sbInsert<Media>("events_medias", { url, chemin_storage: chemin, nom_fichier: e.file.name, dossier: e.dossier, type_mime: c.type, taille_octets: e.file.size, taille_stockee: c.blob.size, largeur: c.largeur || null, hauteur: c.hauteur || null });
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
                <div key={m.id} style={{ position: "relative", background: "repeating-conic-gradient(#2a2630 0% 25%, #221f27 0% 50%) 50%/14px 14px", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", cursor: mode === "choisir" ? "pointer" : "default" }}
                  onClick={() => mode === "choisir" && onChoisir?.(m)} title={`${m.dossier}/${m.nom_fichier}`}>
                  {m.type_mime === "application/pdf"
                    ? <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📄</div>
                    : <img src={m.url} alt={m.nom_fichier} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", display: "block" }} />}
                  <div style={{ fontSize: 9, color: C.muted, padding: "3px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "rgba(0,0,0,0.5)" }}>{m.nom_fichier}</div>
                  {mode === "gerer" && <button onClick={() => supprimer(m)} style={{ position: "absolute", top: 4, right: 4, border: "none", borderRadius: 99, width: 22, height: 22, background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: 11 }}>✕</button>}
                </div>
              ))}
            </div>
          )}
      {visibles.length > limite && <button style={btn()} onClick={() => setLimite(l => l + 120)}>Afficher plus ({visibles.length - limite} restants)</button>}
    </div>
  );
}
