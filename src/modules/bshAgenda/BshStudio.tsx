"use client";
// ═══════════════════════════════════════════════════════════
// BSH — Studio créatif (affiches quotidiennes, stories verticales, visuels de sondage, cartes de jeu,
// invitations privées, visuels événementiels, campagnes saisonnières, scénographies).
// Identité BSH : palette nuit / bordeaux / or, ambiances glamour, sensuelle, dark romance, et le
// personnage principal UNIQUEMENT s'il est déposé et validé dans la médiathèque (aucun visage inventé).
// Brouillons, variantes (parent), aperçu au format réel, corrections, historique des versions
// (ajout seul, garanti par la base), export PNG vers la médiathèque (à valider). Tables 0141.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { K, FS, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, sbInsert, sbUpdate, uploadStorage, slug, libelleInstant, BUCKET_BSH } from "./bshAgendaLib";
import type { Donnees, Creation } from "./BshAgendaHub";
import { FORMATS_STUDIO, AMBIANCES, utilisable } from "./continuite";
import { empreinteFichier } from "./BshMediatheque";

type Contenu = { surtitre: string; titre: string; texte: string; mention: string; fond_id: string | null; personnage: boolean; alignement: "haut" | "centre" | "bas"; choix?: string[] };
const VIDE: Contenu = { surtitre: "Bella'Secret Home", titre: "", texte: "", mention: "", fond_id: null, personnage: false, alignement: "bas", choix: [] };
const STATUTS: [string, string, string][] = [["brouillon", "Brouillon", K.cremeD], ["a_corriger", "À corriger", K.alerte], ["valide", "Validée", K.ok], ["archive", "Archivée", K.cremeD]];

function chargerImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(ok => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
}
function lignes(ctx: CanvasRenderingContext2D, texte: string, max: number) {
  const out: string[] = [];
  for (const para of (texte || "").split("\n")) { let l = ""; for (const m of para.split(" ")) { const t = l ? l + " " + m : m; if (ctx.measureText(t).width > max && l) { out.push(l); l = m; } else l = t; } out.push(l); }
  return out;
}
/** Dessine la création au format réel (pixels) : fond, voile d'ambiance, cadre or, textes. */
export async function dessiner(cv: HTMLCanvasElement, format: string, ambiance: string, c: Contenu, urls: { fond?: string | null; personnage?: string | null }) {
  const f = FORMATS_STUDIO[format] || FORMATS_STUDIO.affiche; cv.width = f.l; cv.height = f.h; const ctx = cv.getContext("2d"); if (!ctx) return;
  const [, , accent, base] = AMBIANCES.find(a => a[0] === ambiance) || AMBIANCES[0];
  const g = ctx.createLinearGradient(0, 0, 0, f.h); g.addColorStop(0, base); g.addColorStop(1, K.fond); ctx.fillStyle = g; ctx.fillRect(0, 0, f.l, f.h);
  const couvrir = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => { const s = Math.max(w / img.width, h / img.height); ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s); };
  if (urls.fond) { const i = await chargerImage(urls.fond); if (i) { ctx.globalAlpha = 0.85; couvrir(i, 0, 0, f.l, f.h); ctx.globalAlpha = 1; } }
  if (urls.personnage && c.personnage) { const i = await chargerImage(urls.personnage); if (i) { const h = f.h * 0.62, w = h * i.width / i.height; ctx.drawImage(i, f.l - w * 0.92, f.h - h, w, h); } }
  const v = ctx.createLinearGradient(0, f.h * 0.35, 0, f.h); v.addColorStop(0, "rgba(11,7,9,0)"); v.addColorStop(1, "rgba(11,7,9,0.88)"); ctx.fillStyle = v; ctx.fillRect(0, 0, f.l, f.h);
  const m = Math.round(f.l * 0.06); ctx.strokeStyle = K.or; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(2, f.l / 360); ctx.strokeRect(m / 2, m / 2, f.l - m, f.h - m); ctx.globalAlpha = 1;
  const larg = f.l - m * 2.4; const tT = Math.round(f.l * 0.085), tX = Math.round(f.l * 0.038), tS = Math.round(f.l * 0.03);
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = `700 ${tT}px 'Cormorant Garamond', Georgia, serif`; const lt = lignes(ctx, c.titre, larg);
  ctx.font = `400 ${tX}px Inter, system-ui, sans-serif`; const lx = lignes(ctx, c.texte, larg);
  const choix = format === "sondage" ? (c.choix || []).filter(Boolean) : [];
  const hauteur = tS * 1.8 + lt.length * tT * 1.08 + tX * 0.8 + lx.length * tX * 1.35 + choix.length * tX * 2.1 + (c.mention ? tS * 2.4 : 0);
  let y = c.alignement === "haut" ? m * 1.6 : c.alignement === "centre" ? (f.h - hauteur) / 2 : f.h - m * 1.6 - hauteur;
  ctx.fillStyle = K.rose; ctx.font = `600 ${tS}px Inter, system-ui, sans-serif`; ctx.fillText((c.surtitre || "").toUpperCase(), f.l / 2, y); y += tS * 1.8;
  ctx.fillStyle = K.creme; ctx.font = `700 ${tT}px 'Cormorant Garamond', Georgia, serif`; for (const l of lt) { ctx.fillText(l, f.l / 2, y); y += tT * 1.08; } y += tX * 0.8;
  ctx.fillStyle = "rgba(241,231,226,0.86)"; ctx.font = `400 ${tX}px Inter, system-ui, sans-serif`; for (const l of lx) { ctx.fillText(l, f.l / 2, y); y += tX * 1.35; }
  for (const ch of choix) { ctx.strokeStyle = accent; ctx.lineWidth = 3; const w = larg * 0.8, x = (f.l - w) / 2; ctx.strokeRect(x, y + tX * 0.2, w, tX * 1.6); ctx.fillStyle = K.creme; ctx.fillText(ch, f.l / 2, y + tX * 0.5); y += tX * 2.1; }
  if (c.mention) { y += tS * 0.6; ctx.fillStyle = K.or; ctx.font = `600 ${tS}px Inter, system-ui, sans-serif`; ctx.fillText(c.mention, f.l / 2, y); }
}

export default function BshStudio({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [ouverte, setOuverte] = useState<Creation | null>(null); const [nouvelle, setNouvelle] = useState(false); const [filtre, setFiltre] = useState(""); const [msg, setMsg] = useState("");
  if (!d.v141) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Titre>Studio créatif</Titre><Vide>Le studio (brouillons, variantes, versions, export vers la médiathèque) s'activera avec la migration 0141, préparée et testée, en attente de ton accord.</Vide></div>;
  const liste = d.creations.filter(c => !filtre || c.format === filtre);
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <Titre action={<button style={bouton("plein", true)} onClick={() => setNouvelle(true)}>＋ Nouvelle création</button>}>Studio créatif</Titre>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button style={bouton(!filtre ? "or" : "ghost", true)} onClick={() => setFiltre("")}>Tout</button>{Object.entries(FORMATS_STUDIO).map(([k, f]) => <button key={k} style={bouton(filtre === k ? "or" : "ghost", true)} onClick={() => setFiltre(k)}>{f.libelle}</button>)}</div>
    {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
    {liste.length === 0 ? <Vide>Aucune création.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))", gap: 8 }}>
      {liste.map(c => { const [, l, coul] = STATUTS.find(s => s[0] === c.statut) || STATUTS[0]; const parent = d.creations.find(x => x.id === c.parent_id);
        return <Carte key={c.id}><button onClick={() => setOuverte(c)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.creme }}>{c.titre}</div>
          <div style={{ fontSize: 11, color: K.cremeD }}>{FORMATS_STUDIO[c.format]?.libelle} · {AMBIANCES.find(a => a[0] === c.ambiance)?.[1]} · version {c.version_courante}{parent ? ` · variante de « ${parent.titre} »` : ""}</div>
          <div style={{ marginTop: 6 }}><Etiquette couleur={coul}>{l}</Etiquette></div></button></Carte>; })}
    </div>}
    {nouvelle && <NouvelleCreation d={d} onFermer={() => setNouvelle(false)} onFait={(c) => { setNouvelle(false); recharger(); setOuverte(c); }} />}
    {ouverte && <Atelier key={ouverte.id} d={d} c={d.creations.find(x => x.id === ouverte.id) || ouverte} onFermer={() => setOuverte(null)} recharger={recharger} flash={setMsg} ouvrir={setOuverte} />}
  </div>;
}

function NouvelleCreation({ d, onFermer, onFait }: { d: Donnees; onFermer: () => void; onFait: (c: Creation) => void }) {
  const [titre, setTitre] = useState(""); const [format, setFormat] = useState("affiche"); const [ambiance, setAmbiance] = useState("glamour"); const [campagne, setCampagne] = useState(""); const [err, setErr] = useState("");
  const creer = async () => {
    if (!titre.trim()) return setErr("Titre obligatoire.");
    try { const [c] = await sbInsert<Creation>("bsh_creations", { titre: titre.trim(), format, ambiance, campagne_id: campagne || null, statut: "brouillon" }); await sbInsert("bsh_creations_versions", { creation_id: c.id, contenu: { ...VIDE, titre: titre.trim() }, note_correction: "Création" }, "return=minimal"); onFait({ ...c, version_courante: 1 }); }
    catch (e: any) { setErr(String(e?.message || e)); }
  };
  return <Feuille titre="Nouvelle création" onFermer={onFermer}>
    <div style={grille(200)}>
      <Champ label="Titre *"><input style={champ} value={titre} onChange={e => setTitre(e.target.value)} /></Champ>
      <Champ label="Format"><select style={champ} value={format} onChange={e => setFormat(e.target.value)}>{Object.entries(FORMATS_STUDIO).map(([k, f]) => <option key={k} value={k}>{f.libelle} ({f.l} × {f.h})</option>)}</select></Champ>
      <Champ label="Ambiance"><select style={champ} value={ambiance} onChange={e => setAmbiance(e.target.value)}>{AMBIANCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
      <Champ label="Campagne"><select style={champ} value={campagne} onChange={e => setCampagne(e.target.value)}><option value="">—</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
    </div>
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={creer}>Créer le brouillon</button></div>
  </Feuille>;
}

function Atelier({ d, c, onFermer, recharger, flash, ouvrir }: { d: Donnees; c: Creation; onFermer: () => void; recharger: () => void; flash: (t: string) => void; ouvrir: (c: Creation) => void }) {
  const versions = useMemo(() => d.versions.filter(v => v.creation_id === c.id).sort((a, b) => b.numero - a.numero), [d.versions, c.id]);
  const [contenu, setContenu] = useState<Contenu>({ ...VIDE, ...(versions[0]?.contenu || {}) });
  const [note, setNote] = useState(""); const [err, setErr] = useState(""); const [occupe, setOccupe] = useState(""); const [pub, setPub] = useState(c.communication_id || "");
  const cv = useRef<HTMLCanvasElement>(null);
  const maj = (x: Partial<Contenu>) => setContenu(v => ({ ...v, ...x }));
  const fonds = d.ressources.filter(r => utilisable(r) && r.url && r.type !== "personnage_reference");
  const personnage = d.ressources.find(r => r.type === "personnage_reference" && utilisable(r) && r.url);
  const fond = fonds.find(r => r.id === contenu.fond_id);
  useEffect(() => { if (cv.current) dessiner(cv.current, c.format, c.ambiance, contenu, { fond: fond?.url, personnage: personnage?.url }); }, [contenu, c.format, c.ambiance, fond?.url, personnage?.url]);
  const f = FORMATS_STUDIO[c.format] || FORMATS_STUDIO.affiche;
  const modifie = JSON.stringify(contenu) !== JSON.stringify({ ...VIDE, ...(versions[0]?.contenu || {}) });
  const sauver = async () => { try { await sbInsert("bsh_creations_versions", { creation_id: c.id, contenu, note_correction: note || null }, "return=minimal"); setNote(""); flash(`✅ Version ${c.version_courante + 1} enregistrée`); recharger(); } catch (e: any) { setErr(String(e?.message || e)); } };
  const statut = async (s: string, t: string) => { try { await sbUpdate("bsh_creations", c.id, { statut: s, updated_at: new Date().toISOString() }); flash(t); recharger(); } catch (e: any) { setErr(String(e?.message || e)); } };
  const variante = async (format: string) => { try { const [v] = await sbInsert<Creation>("bsh_creations", { titre: `${c.titre} – ${FORMATS_STUDIO[format].libelle}`, format, ambiance: c.ambiance, campagne_id: c.campagne_id, parent_id: c.id, statut: "brouillon" }); await sbInsert("bsh_creations_versions", { creation_id: v.id, contenu, note_correction: `Variante de « ${c.titre} » v${c.version_courante}` }, "return=minimal"); flash("✅ Variante créée en brouillon"); recharger(); ouvrir({ ...v, version_courante: 1 }); } catch (e: any) { setErr(String(e?.message || e)); } };
  const exporter = async () => {
    if (!cv.current) return; if (c.statut !== "valide") return setErr("Valide la création avant de l'exporter vers la médiathèque.");
    setOccupe("Export…"); setErr("");
    try {
      const blob: Blob = await new Promise((ok, ko) => cv.current!.toBlob(b => b ? ok(b) : ko(new Error("Export impossible (image de fond sans autorisation de partage)")), "image/png"));
      const e = await empreinteFichier(blob); const dbl = d.ressources.find(r => (r.empreinte || "") === e); if (dbl) { setOccupe(""); return setErr(`Cet export existe déjà dans la médiathèque (« ${dbl.titre} »).`); }
      const chemin = `studio/${Date.now().toString(36)}-${slug(c.titre)}.png`; const url = await uploadStorage(chemin, blob, "image/png", BUCKET_BSH);
      const droitsFond = fond ? fond.droits : "proprietaire";
      const [r] = await sbInsert<any>("bsh_ressources", { titre: `${c.titre} (v${c.version_courante})`, univers: c.format === "carte_jeu" ? "secret_games" : "secret_agenda", type: c.format, campagne_id: c.campagne_id, url, chemin_storage: chemin, empreinte: e, statut_validation: "a_valider", droits: droitsFond, droits_note: fond ? `Fond : ${fond.titre}` : "Création Bellaïa" });
      await sbUpdate("bsh_creations", c.id, { ressource_finale_id: r.id, updated_at: new Date().toISOString() }); flash("✅ Exportée dans la médiathèque (à valider avant usage)"); recharger();
    } catch (e: any) { setErr(String(e?.message || e)); }
    setOccupe("");
  };
  const lierPublication = async () => {
    const finale = d.ressources.find(r => r.id === c.ressource_finale_id);
    if (!finale || finale.statut_validation !== "valide") return setErr("Le visuel exporté doit être validé dans la médiathèque avant d'être associé à une publication.");
    try { await sbUpdate("bsh_communications", pub, { visuel_url: finale.url, updated_at: new Date().toISOString() }); await sbUpdate("bsh_creations", c.id, { communication_id: pub }); flash("✅ Visuel associé à la publication (aucune publication n'est envoyée)"); recharger(); } catch (e: any) { setErr(String(e?.message || e)); }
  };
  const [, libS, coulS] = STATUTS.find(s => s[0] === c.statut) || STATUTS[0];
  return <Feuille titre={c.titre} onFermer={onFermer} large>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Etiquette couleur={coulS}>{libS}</Etiquette><span style={{ fontSize: 11, color: K.cremeD }}>{f.libelle} · {f.l} × {f.h} px · version {c.version_courante}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 12 }}>
      <div><canvas ref={cv} aria-label="Aperçu au format réel" style={{ width: "100%", maxWidth: f.h > f.l ? 280 : 420, height: "auto", aspectRatio: `${f.l} / ${f.h}`, borderRadius: 10, display: "block", margin: "0 auto", border: `1px solid ${K.ligne}` }} />
        <div style={{ fontSize: 10, color: personnage ? K.cremeD : K.alerte, textAlign: "center", marginTop: 4 }}>{personnage ? `Personnage de référence : ${personnage.titre}` : "Aucun personnage principal validé dans la médiathèque : il n'apparaît pas."}</div></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Champ label="Surtitre"><input style={champ} value={contenu.surtitre} onChange={e => maj({ surtitre: e.target.value })} /></Champ>
        <Champ label="Titre"><input style={champ} value={contenu.titre} onChange={e => maj({ titre: e.target.value })} /></Champ>
        <Champ label="Texte"><textarea style={{ ...champ, minHeight: 70 }} value={contenu.texte} onChange={e => maj({ texte: e.target.value })} /></Champ>
        {c.format === "sondage" && <Champ label="Choix du sondage (un par ligne)"><textarea style={{ ...champ, minHeight: 60 }} value={(contenu.choix || []).join("\n")} onChange={e => maj({ choix: e.target.value.split("\n").slice(0, 5) })} /></Champ>}
        <Champ label="Mention"><input style={champ} value={contenu.mention} onChange={e => maj({ mention: e.target.value })} placeholder="Ex. Ce soir 21 h · Cercle BSH" /></Champ>
        <div style={grille(150)}>
          <Champ label="Fond (ressource validée)"><select style={champ} value={contenu.fond_id || ""} onChange={e => maj({ fond_id: e.target.value || null })}><option value="">Dégradé d'ambiance</option>{fonds.map(r => <option key={r.id} value={r.id}>{r.titre}</option>)}</select></Champ>
          <Champ label="Texte placé"><select style={champ} value={contenu.alignement} onChange={e => maj({ alignement: e.target.value as any })}><option value="haut">En haut</option><option value="centre">Au centre</option><option value="bas">En bas</option></select></Champ>
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: personnage ? K.creme : K.cremeD }}><input type="checkbox" disabled={!personnage} checked={contenu.personnage && !!personnage} onChange={e => maj({ personnage: e.target.checked })} />Afficher le personnage principal</label>
        <Champ label="Note de correction (enregistrée avec la version)"><input style={champ} value={note} onChange={e => setNote(e.target.value)} /></Champ>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={bouton("plein", true)} disabled={!modifie && !note} onClick={sauver}>💾 Enregistrer la version {c.version_courante + 1}</button>
          {c.statut !== "valide" && <button style={bouton("or", true)} disabled={modifie} title={modifie ? "Enregistre d'abord la version" : ""} onClick={() => statut("valide", "✅ Création validée")}>✓ Valider</button>}
          {c.statut !== "a_corriger" && <button style={bouton("ghost", true)} onClick={() => statut("a_corriger", "Correction demandée")}>✎ À corriger</button>}
          {c.statut !== "archive" && <button style={bouton("ghost", true)} onClick={() => statut("archive", "Création archivée")}>Archiver</button>}
        </div>
      </div>
    </div>
    <Carte style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.or }}>Variantes</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(FORMATS_STUDIO).filter(([k]) => k !== c.format).map(([k, x]) => <button key={k} style={bouton("ghost", true)} onClick={() => variante(k)}>⧉ {x.libelle}</button>)}</div>
      {d.creations.filter(x => x.parent_id === c.id).map(x => <button key={x.id} style={{ ...bouton("ghost", true), justifyContent: "flex-start" }} onClick={() => ouvrir(x)}>↳ {x.titre}</button>)}
    </Carte>
    <Carte style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.or }}>Export et publication</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button style={bouton("or", true)} disabled={!!occupe} onClick={exporter}>⬆️ Exporter vers la médiathèque (PNG {f.l} × {f.h})</button>
        <select aria-label="Publication à illustrer" style={{ ...champ, width: "auto", maxWidth: 260 }} value={pub} onChange={e => setPub(e.target.value)}><option value="">Publication à illustrer…</option>{d.pubs.filter(p => p.id && !["publie", "annule", "archive"].includes(p.statut)).map(p => <option key={p.id} value={p.id}>{p.titre} · {libelleInstant(p.date_programmee)}</option>)}</select>
        <button style={bouton("ghost", true)} disabled={!pub} onClick={lierPublication}>Associer le visuel</button>
      </div>
      {occupe && <div style={{ fontSize: 12, color: K.or }}>⏳ {occupe}</div>}
    </Carte>
    <Carte style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.or }}>Historique des versions ({versions.length})</div>
      {versions.map(v => <div key={v.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: K.cremeF, borderTop: `1px solid ${K.ligne}`, paddingTop: 4 }}>
        <span style={{ fontFamily: FS, color: K.or, minWidth: 28 }}>v{v.numero}</span><span style={{ flex: 1 }}>{v.note_correction || "—"} · {libelleInstant(v.created_at)}</span>
        <button style={bouton("ghost", true)} onClick={() => setContenu({ ...VIDE, ...v.contenu })}>Reprendre</button></div>)}
      <div style={{ fontSize: 10, color: K.cremeD }}>Les versions ne sont jamais modifiées ni supprimées : reprendre une version crée la suivante à l'enregistrement.</div>
    </Carte>
    <Erreur msg={err} />
  </Feuille>;
}
