"use client";
// ═══════════════════════════════════════════════════════════
// Histoires du soir — gestion fondatrice (Mo Ti-Péyi)
// • Les 10 fiches de la collection, état éditorial, publication.
// • Publication bloquée par la base tant que le texte n'est pas validé.
// • Médias (couverture, audio, vidéo + affiche + WebVTT) déposés dans un
//   bucket privé, publiés INDÉPENDAMMENT ; durée mesurée sur le fichier.
// • Aperçu famille avant toute publication.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import LecteurHistoire from "./LecteurHistoire";
import { sbSelect, sbUpdate, sbInsert, sbDelete, uploadStorage } from "../events/eventsAtelierLib";
import { BUCKET_HISTOIRES, lectureFondatrice, decouperManuscrit, type TomeLecture } from "./histoiresLib";
import { telecharger } from "../events/eventsAtelierLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.6)", or: "#e8b24a", ok: "#4ade80", rouge: "#f87171", bleu: "#60a5fa" };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 11px", color: "#fff", fontSize: 14, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box" };
const btn = (fort = false): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? C.or : C.ligne}`, background: fort ? `${C.or}22` : C.card, color: fort ? C.or : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const ETATS_ED: [string, string, string][] = [["a_ecrire", "À écrire", C.doux], ["brouillon", "Brouillon", C.bleu], ["texte_fourni", "Texte fourni (à relire)", C.or], ["valide", "Texte validé", C.ok]];
const ETATS_MEDIA: [string, string][] = [["absent", "Aucun"], ["brouillon", "Brouillon"], ["revision", "En révision"], ["publie", "Publié"]];
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", letterSpacing: 0.4 };

function messageBase(e: any): string {
  const m = String(e?.message || e);
  if (m.includes("histoires_publie_si_valide")) return "Publication impossible : le texte doit d'abord être « validé ».";
  if (m.includes("aucun texte de scène")) return "Validation impossible : ce tome n'a pas encore de texte.";
  if (m.includes("histoires_audio_publie")) return "Audio : dépose d'abord le fichier (sa durée réelle est mesurée automatiquement).";
  if (m.includes("histoires_video_publie")) return "Vidéo : il faut le MP4, l'image d'affiche ET le fichier de sous-titres WebVTT avant de publier.";
  if (m.includes("histoires_couverture_publie")) return "Couverture : dépose l'image et écris son texte alternatif avant de publier.";
  return m;
}

function dureeMedia(f: File, type: "audio" | "video"): Promise<number | null> {
  return new Promise(ok => {
    const el = document.createElement(type); const url = URL.createObjectURL(f);
    const fin = (v: number | null) => { URL.revokeObjectURL(url); ok(v); };
    el.preload = "metadata"; el.onloadedmetadata = () => fin(Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 10) / 10 : null); el.onerror = () => fin(null);
    el.src = url; setTimeout(() => fin(null), 20000);
  });
}
const fmt = (s?: number | null) => (s ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s` : "");

export default function HistoiresGestion({ espace = "jeunesse" }: { espace?: "jeunesse" | "editions" }) {
  const [fCol, setFCol] = useState("__toutes");
  const [tomes, setTomes] = useState<any[]>([]);
  const [nbScenes, setNbScenes] = useState<Record<string, number>>({});
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [apercu, setApercu] = useState<TomeLecture | null>(null);
  const [msg, setMsg] = useState("");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    try {
      const t = await sbSelect("histoires_tomes", `select=*&espace=eq.${espace}&order=volume.asc,collection.asc,numero.asc`);
      const s = await sbSelect<{ tome_id: string; texte: string }>("histoires_scenes", "select=tome_id,texte");
      const n: Record<string, number> = {}; s.forEach(x => { if (x.texte?.trim()) n[x.tome_id] = (n[x.tome_id] || 0) + 1; });
      setTomes(t); setNbScenes(n); setMsg("");
    } catch (e: any) { setMsg("⚠️ " + messageBase(e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const maj = async (t: any, patch: any) => {
    try { const [r] = await sbUpdate("histoires_tomes", t.id, patch); setTomes(xs => xs.map(x => (x.id === t.id ? r : x))); setMsg("✅ Enregistré"); setTimeout(() => setMsg(""), 1800); return true; }
    catch (e: any) { setMsg("⚠️ " + messageBase(e)); return false; }
  };

  if (apercu) return <LecteurHistoire tome={apercu} apercu onRetour={() => setApercu(null)} />;

  const publies = tomes.filter(t => t.publie).length;
  const collections = [...new Map(tomes.map(t => [t.collection, t.collection_titre])).entries()];
  const visibles = tomes.filter(t => fCol === "__toutes" || t.collection === fCol);
  const exporter = (format: "json" | "csv") => {
    const lignes = visibles.map(t => ({ collection: t.collection_titre, serie: t.serie || "", volume: t.volume, tome: t.numero, identifiant: t.identifiant, titre: t.titre, titres_reperes: (t.titres_reperes || []).join(" | "), etat: t.etat_editorial, publie: t.publie, parties: nbScenes[t.id] || 0, couverture: t.couverture_etat, audio: t.audio_etat, video: t.video_etat, notes: t.notes_fondatrice || "" }));
    const blob = format === "json" ? new Blob([JSON.stringify(lignes, null, 2)], { type: "application/json" })
      : new Blob(["\ufeff" + [Object.keys(lignes[0] || { vide: "" }).join(";"), ...lignes.map(l => Object.values(l).map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))].join("\n")], { type: "text/csv" });
    telecharger(blob, `catalogue-${espace}.${format}`);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA, color: C.texte }}>
      <div style={{ background: "linear-gradient(160deg,#1b1640,#0d1024)", borderRadius: 14, padding: 14, border: `1px solid ${C.or}44` }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{espace === "editions" ? "📚 Ebooks — texte maître" : "🌙 Histoires du soir & albums"}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          {tomes.length} fiche(s) · {Object.keys(nbScenes).length} texte(s) · {publies} publiée(s). {espace === "editions" ? "Espace privé : rien n'est en vente ni visible des clients. Les textes autobiographiques restent des choix éditoriaux à valider." : "Rien n'est visible des familles tant que tu ne publies pas ; les tomes « À écrire » restent privés (titres compris)."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {collections.length > 1 && <><button style={btn(fCol === "__toutes")} onClick={() => setFCol("__toutes")}>Toutes</button>{collections.map(([c, l]) => <button key={c} style={btn(fCol === c)} onClick={() => setFCol(c)}>{l}</button>)}</>}
        <button style={btn()} onClick={() => exporter("csv")}>⬇️ CSV</button><button style={btn()} onClick={() => exporter("json")}>⬇️ JSON</button>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("⚠️") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ fontSize: 13, color: C.doux }}>Chargement…</div>}
      {visibles.map((t, i) => {
        const e = ETATS_ED.find(x => x[0] === t.etat_editorial) || ETATS_ED[0];
        return (
          <React.Fragment key={t.id}>
          {(i === 0 || visibles[i - 1].collection !== t.collection) && <div style={{ fontSize: 14, fontWeight: 800, color: C.or, marginTop: 6 }}>{t.serie ? t.serie + " › " : ""}{t.collection_titre}{espace === "editions" ? ` (volume ${t.volume})` : ""}</div>}
          <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${t.publie ? C.ok : e[2]}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setOuvert(ouvert === t.id ? null : t.id)} style={{ background: "none", border: "none", color: C.texte, textAlign: "left", cursor: "pointer", padding: 0, fontFamily: SA }}>
              <div style={{ fontSize: 12, color: C.doux, fontWeight: 700 }}>{t.collection_titre} · Vol. {t.volume} · Tome {t.numero} · {t.identifiant}</div>
              {(t.titres_reperes || []).length > 1 && <div style={{ fontSize: 12, color: C.or, marginTop: 2 }}>Variantes : {t.titres_reperes.join(" / ")}</div>}
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{t.titre}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, fontSize: 11 }}>
                <span style={{ color: e[2], fontWeight: 700 }}>● {e[1]}</span>
                <span style={{ color: t.publie ? C.ok : C.doux }}>{t.publie ? "● Publié" : "○ Non publié"}</span>
                <span style={{ color: C.doux }}>· {nbScenes[t.id] || 0} partie(s)</span>
                <span style={{ color: C.doux }}>· Couverture {ETATS_MEDIA.find(x => x[0] === t.couverture_etat)?.[1]} · Audio {ETATS_MEDIA.find(x => x[0] === t.audio_etat)?.[1]} · Vidéo {ETATS_MEDIA.find(x => x[0] === t.video_etat)?.[1]}</span>
              </div>
            </button>
            {ouvert === t.id && <FicheTome t={t} unite={espace === "editions" ? "chapitre" : "partie"} nbTextes={nbScenes[t.id] || 0} maj={maj} recharger={charger} setMsg={setMsg} ouvrirApercu={async () => { try { setApercu(await lectureFondatrice(t)); } catch (er: any) { setMsg("⚠️ " + messageBase(er)); } }} />}
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FicheTome({ t, unite = "partie", nbTextes, maj, recharger, setMsg, ouvrirApercu }: any) {
  const [notes, setNotes] = useState(t.notes_fondatrice || "");
  const [importe, setImporte] = useState<any[] | null>(null);
  const lireFichier = async (f?: File) => { if (!f) return; const txt = await f.text(); const parts = decouperManuscrit(txt); if (!parts.length) return setMsg("⚠️ Aucun texte reconnu dans ce fichier."); setImporte(parts); };
  const appliquerImport = async () => {
    if (!importe) return;
    const lignes = importe.map((x, i) => ({ tome_id: t.id, identifiant: `${t.identifiant}-${i + 1}`, ordre: i + 1, titre: x.titre || "", mise_en_scene: x.mise_en_scene, texte: x.texte, updated_at: new Date().toISOString() }));
    try {
      // Identifiants stables : réimporter met à jour les mêmes parties, sans doublon.
      await sbInsert("histoires_scenes?on_conflict=tome_id,identifiant", lignes, "resolution=merge-duplicates,return=minimal");
      const restantes = (scenes || []).filter(s => s.ordre > lignes.length);
      if (restantes.length && confirm(`Le fichier contient ${lignes.length} ${unite}(s) ; ${restantes.length} ancienne(s) ${unite}(s) en plus existent. Les supprimer ?`)) for (const s of restantes) await sbDelete("histoires_scenes", s.id);
      if (t.etat_editorial === "a_ecrire") await maj(t, { etat_editorial: "brouillon" });
      setImporte(null); setMsg(`✅ ${lignes.length} ${unite}(s) importée(s)`); setScenes(await sbSelect("histoires_scenes", `select=*&tome_id=eq.${t.id}&order=ordre.asc`)); recharger();
    } catch (e: any) { setMsg("⚠️ " + messageBase(e)); }
  };
  const imageScene = async (s: any, f?: File) => {
    if (!f) return;
    try { const ext = (f.name.split(".").pop() || "png").toLowerCase(); const chemin = `${t.collection}/${t.identifiant}/page-${s.ordre}-${Date.now().toString(36)}.${ext}`; await uploadStorage(chemin, f, f.type || "image/png", BUCKET_HISTOIRES); await sbUpdate("histoires_scenes", s.id, { image_chemin: chemin }); setScenes(xs => xs!.map(x => (x.id === s.id ? { ...x, image_chemin: chemin } : x))); setMsg("✅ Illustration déposée (privée)"); }
    catch (e: any) { setMsg("⚠️ " + (e.message || e)); }
  };
  const [synopsis, setSynopsis] = useState(t.synopsis || "");
  const [scenes, setScenes] = useState<any[] | null>(null);
  const [envoi, setEnvoi] = useState("");
  useEffect(() => { sbSelect("histoires_scenes", `select=*&tome_id=eq.${t.id}&order=ordre.asc`).then(setScenes).catch(() => setScenes([])); }, [t.id]);

  const deposer = async (f: File | undefined, champChemin: string, type: string, extra: (f: File) => Promise<any> = async () => ({})) => {
    if (!f) return;
    setEnvoi(`Envoi de « ${f.name} » (${(f.size / 1048576).toFixed(1)} Mo)…`);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const chemin = `${t.collection}/${t.identifiant}/${type}-${Date.now().toString(36)}.${ext}`;
      await uploadStorage(chemin, f, f.type || (ext === "vtt" ? "text/vtt" : "application/octet-stream"), BUCKET_HISTOIRES);
      const plus = await extra(f);
      // Un média remplacé repasse en brouillon : il doit être revalidé.
      const etatCle = champChemin.startsWith("couverture") ? "couverture_etat" : champChemin.startsWith("audio") ? "audio_etat" : "video_etat";
      await maj(t, { [champChemin]: chemin, ...plus, [etatCle]: "brouillon" });
    } catch (e: any) { setMsg("⚠️ Envoi impossible : " + (e.message || e) + (f.size > 50 * 1048576 ? " (fichier de plus de 50 Mo : réduis-le ou augmente la limite de stockage Supabase)" : "")); }
    setEnvoi("");
  };

  const sauverScene = async (s: any) => {
    try { await sbUpdate("histoires_scenes", s.id, { texte: s.texte, titre: s.titre, mise_en_scene: s.mise_en_scene, image_alt: s.image_alt || null, updated_at: new Date().toISOString() }); setMsg("✅ Partie enregistrée"); recharger(); }
    catch (e: any) { setMsg("⚠️ " + messageBase(e)); }
  };
  const ajouterScene = async () => {
    const ordre = (scenes?.length || 0) + 1;
    try { const [r] = await sbInsert("histoires_scenes", { tome_id: t.id, identifiant: `${t.identifiant}-${ordre}`, ordre, titre: "", texte: "" }); setScenes(xs => [...(xs || []), r]); }
    catch (e: any) { setMsg("⚠️ " + messageBase(e)); }
  };

  const media = (titre: string, etatCle: string, children: React.ReactNode) => (
    <div style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, flex: 1 }}>{titre}</div>
        <select style={{ ...champ, width: "auto" }} value={t[etatCle]} onChange={ev => maj(t, { [etatCle]: ev.target.value })}>{ETATS_MEDIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      {children}
    </div>
  );
  const fichier = (label: string, accept: string, onFile: (f?: File) => void, present: boolean) => (
    <label style={{ ...btn(), display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>{present ? "Remplacer" : "Déposer"} : {label}<input type="file" accept={accept} style={{ display: "none" }} onChange={ev => { onFile(ev.target.files?.[0]); ev.target.value = ""; }} /></label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${C.ligne}`, paddingTop: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn(true)} onClick={ouvrirApercu} disabled={!nbTextes}>👁 Aperçu famille</button>
        <select style={{ ...champ, width: "auto" }} value={t.etat_editorial} onChange={ev => maj(t, { etat_editorial: ev.target.value, ...(ev.target.value !== "valide" ? { publie: false } : {}) })}>{ETATS_ED.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button style={btn(!t.publie)} disabled={t.etat_editorial !== "valide"} title={t.etat_editorial !== "valide" ? "Valide d'abord le texte" : ""} onClick={() => { if (!t.publie && !confirm(`Publier « ${t.titre} » pour les familles ?\n(Le texte devient lisible dans l'espace Mo Ti-Péyi en production.)`)) return; maj(t, { publie: !t.publie }); }}>{t.publie ? "Retirer de la publication" : "📢 Publier le texte"}</button>
      </div>
      {t.etat_editorial !== "valide" && <div style={{ fontSize: 12, color: C.doux }}>Publication possible seulement quand le texte est « validé ».</div>}
      <span style={lbl}>Notes éditoriales (privées)</span>
      <textarea style={{ ...champ, minHeight: 60 }} value={notes} onChange={ev => setNotes(ev.target.value)} onBlur={() => notes !== (t.notes_fondatrice || "") && maj(t, { notes_fondatrice: notes || null })} />
      <span style={lbl}>Synopsis</span>
      <textarea style={{ ...champ, minHeight: 60 }} value={synopsis} onChange={ev => setSynopsis(ev.target.value)} onBlur={() => synopsis !== (t.synopsis || "") && maj(t, { synopsis: synopsis || null })} />

      {media("🖼️ Couverture", "couverture_etat", <>
        {fichier("image", "image/*", f => deposer(f, "couverture_chemin", "couverture"), !!t.couverture_chemin)}
        <input style={champ} placeholder="Texte alternatif (description de l'image) *" defaultValue={t.couverture_alt || ""} onBlur={ev => ev.target.value !== (t.couverture_alt || "") && maj(t, { couverture_alt: ev.target.value || null })} />
      </>)}
      {media("🎧 Audio", "audio_etat", <>
        {fichier("audio (MP3 / M4A)", "audio/*", f => deposer(f, "audio_chemin", "audio", async x => ({ audio_duree_s: await dureeMedia(x, "audio") })), !!t.audio_chemin)}
        {t.audio_chemin && <div style={{ fontSize: 12, color: C.doux }}>Durée réelle mesurée : {fmt(t.audio_duree_s) || "inconnue — fichier illisible ?"}</div>}
        {t.audio_chemin && scenes && scenes.length > 0 && <Reperes t={t} scenes={scenes} maj={maj} />}
      </>)}
      {media("🎬 Vidéo", "video_etat", <>
        <div style={{ fontSize: 12, color: C.doux }}>MP4 (H.264/AAC), image d'affiche et sous-titres WebVTT calés sur le montage final.</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {fichier("vidéo MP4", "video/mp4", f => deposer(f, "video_chemin", "video", async x => ({ video_duree_s: await dureeMedia(x, "video") })), !!t.video_chemin)}
          {fichier("affiche", "image/*", f => deposer(f, "video_affiche_chemin", "affiche"), !!t.video_affiche_chemin)}
          {fichier("sous-titres .vtt", ".vtt,text/vtt", f => deposer(f, "video_vtt_chemin", "soustitres"), !!t.video_vtt_chemin)}
        </div>
        {t.video_chemin && <div style={{ fontSize: 12, color: C.doux }}>Durée réelle mesurée : {fmt(t.video_duree_s) || "inconnue"} · Affiche {t.video_affiche_chemin ? "✓" : "manquante"} · Sous-titres {t.video_vtt_chemin ? "✓" : "manquants"}</div>}
      </>)}
      {envoi && <div style={{ fontSize: 13, color: C.or }}>⏳ {envoi}</div>}

      <span style={lbl}>Texte — {unite}s ({scenes?.length ?? "…"})</span>
      <label style={{ ...btn(), alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}>📥 Importer le texte (.md / .txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" style={{ display: "none" }} onChange={ev => { lireFichier(ev.target.files?.[0]); ev.target.value = ""; }} /></label>
      {importe && <div style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${C.or}55`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{importe.length} {unite}(s) reconnue(s) — le texte est repris tel quel</div>
        {importe.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.doux }}>{i + 1}. {x.titre || "(sans titre)"} — {x.texte.slice(0, 80)}… ({x.texte.length} car.)</div>)}
        <div style={{ display: "flex", gap: 6 }}><button style={btn(true)} onClick={appliquerImport}>Importer</button><button style={btn()} onClick={() => setImporte(null)}>Annuler</button></div>
      </div>}
      <div style={{ fontSize: 12, color: C.doux }}>Le titre et la mise en scène sont des repères de production : jamais montrés aux familles ni lus à voix haute.</div>
      {scenes?.map((s, i) => (
        <details key={s.id} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{unite === "chapitre" ? "Chapitre" : "Partie"} {s.ordre} · {s.titre || "(sans titre)"} · {s.texte.length} caractères</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <input style={champ} placeholder="Titre technique (repère)" value={s.titre} onChange={ev => setScenes(xs => xs!.map((x, j) => (j === i ? { ...x, titre: ev.target.value } : x)))} />
            <input style={champ} placeholder="Mise en scène (repère)" value={s.mise_en_scene || ""} onChange={ev => setScenes(xs => xs!.map((x, j) => (j === i ? { ...x, mise_en_scene: ev.target.value } : x)))} />
            <textarea style={{ ...champ, minHeight: 220, fontFamily: "Georgia, serif", lineHeight: 1.6 }} value={s.texte} onChange={ev => setScenes(xs => xs!.map((x, j) => (j === i ? { ...x, texte: ev.target.value } : x)))} />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ ...btn(), display: "inline-flex", gap: 6 }}>🖼 {s.image_chemin ? "Remplacer l'illustration" : "Illustration de la page"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={ev => { imageScene(s, ev.target.files?.[0]); ev.target.value = ""; }} /></label>
              {s.image_chemin && <span style={{ fontSize: 12, color: C.ok }}>✓ illustration déposée</span>}
            </div>
            {s.image_chemin && <input style={champ} placeholder="Description de l'illustration (texte alternatif) *" value={s.image_alt || ""} onChange={ev => setScenes(xs => xs!.map((x, j) => (j === i ? { ...x, image_alt: ev.target.value } : x)))} />}
            <button style={btn(true)} onClick={() => sauverScene(scenes[i])}>💾 Enregistrer la partie</button>
          </div>
        </details>
      ))}
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={ajouterScene}>+ Ajouter {unite === "chapitre" ? "un chapitre" : "une partie"}</button>
    </div>
  );
}

/** Minutage réel par partie (secondes de début) — facultatif. Sans lui, pas de choix de partie en audio. */
function Reperes({ t, scenes, maj }: any) {
  const init = Object.fromEntries((t.audio_reperes || []).map((r: any) => [r.scene, String(r.debut_s)]));
  const [v, setV] = useState<Record<string, string>>(init);
  const complet = scenes.every((s: any) => v[s.identifiant] !== undefined && v[s.identifiant] !== "" && Number.isFinite(Number(v[s.identifiant])));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, color: C.doux }}>Début de chaque partie dans l'audio (en secondes, relevé à l'écoute). Facultatif : le choix de partie n'apparaît que si toutes sont renseignées.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>
        {scenes.map((s: any) => <label key={s.id} style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 2 }}>Partie {s.ordre}<input style={champ} inputMode="decimal" value={v[s.identifiant] ?? ""} onChange={ev => setV({ ...v, [s.identifiant]: ev.target.value })} /></label>)}
      </div>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => maj(t, { audio_reperes: complet ? scenes.map((s: any) => ({ scene: s.identifiant, debut_s: Number(v[s.identifiant]) })) : [] })}>Enregistrer le minutage{complet ? "" : " (incomplet → effacé)"}</button>
    </div>
  );
}
