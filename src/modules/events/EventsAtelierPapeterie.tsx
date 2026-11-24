"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Event — Atelier papeterie (éditeur type Canva)
// • Patrons d'origine (est_modele) : jamais modifiés par erreur —
//   on les DUPLIQUE au nom du client (règle du Guide Patrons).
// • « Créer un pack client » : duplique tout un pack d'un coup et
//   remplit Prénom / Âge / Date / Lieu / RSVP / image principale.
// • Éditeur en millimètres : textes, images (médiathèque ou appareil),
//   formes ; déplacer, redimensionner, pivoter, ordre des calques,
//   annuler, repères (coupe noir, zone sûre bleue, pliage doré).
// • Export sans librairie : PNG 300 dpi, PDF au format exact, PDF A4
//   imposé avec traits de coupe, PDF du pack complet ; partage direct
//   (WhatsApp, mail… via la feuille de partage) ou téléchargement.
// Table : events_papeterie (migration 0102).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import EventsMediatheque from "./EventsMediatheque";
import { composerPieces, ageTexte, type BriefKit } from "./kitComposer";
import { patronPopcorn, patronGable } from "./patronsBoites";
import { SUPPORTS, THEMES, COULEURS, PRESTATIONS, proposerPack, supportDuPatron, supportDe, themeDe, nommerCouleur, type Proposition } from "./classement";
import {
  sbSelect, sbInsert, sbUpdate, sbDelete, uploadStorage, compresserImage, slug,
  chargerPolices, POLICES, rendreSurCanvas, mesurerTexte, TAILLE_MIN_LISIBLE, canvasVersPdf, pxParMmExport, rendreImpositionA4, partagerFichier, telecharger,
  type Calque, type ContenuPapeterie,
} from "./eventsAtelierLib";

const C = { card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", cream: "#e8e3d5", muted: "rgba(255,255,255,0.45)", gold: "#c9a84c", ok: "#4ade80", rouge: "#f87171", bleu: "#38bdf8", rose: "#b5838d" };
const SA = "Inter,system-ui,sans-serif";
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", color: C.cream, fontSize: 12, outline: "none", fontFamily: SA, width: "100%", boxSizing: "border-box" };
const bouton = (fort = false): React.CSSProperties => ({ padding: "7px 11px", borderRadius: 10, border: `1px solid ${fort ? C.gold : C.border}`, background: fort ? `${C.gold}22` : C.card, color: fort ? C.gold : C.cream, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: SA, whiteSpace: "nowrap" });
const lbl: React.CSSProperties = { fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" };

type Creation = { id: string; nom: string; type_support: string | null; largeur_mm: number; hauteur_mm: number; contenu: ContenuPapeterie; est_modele: boolean; modele_source_id: string | null; programme_id: string | null; collection: string | null; occasion: string | null; theme: string | null; client_nom: string | null; statut: string; updated_at: string };
const nouvelId = () => Math.random().toString(36).slice(2, 10);
const copie = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const r1 = (n: number) => Math.round(n * 10) / 10;
const nomCourt = (n: string) => n.replace(/^BELLA_EVENS \d+ — /, "");

// ── Rendu SVG d'un calque (aperçu + éditeur) ─────────────────
function CalqueSvg({ k, editeur }: { k: Calque; editeur: boolean }) {
  const idMasque = "m" + React.useId().replace(/:/g, "");
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  let el: React.ReactNode = null;
  if (k.type === "forme" && k.forme) {
    const f = k.forme;
    const p = { fill: f.forme === "ligne" ? "none" : f.remplissage || "none", stroke: f.contour || "none", strokeWidth: f.epaisseur || 0 };
    if (f.forme === "ellipse") el = <ellipse cx={cx} cy={cy} rx={k.w / 2} ry={k.h / 2} {...p} />;
    else if (f.forme === "triangle") el = <polygon points={`${cx},${k.y} ${k.x + k.w},${k.y + k.h} ${k.x},${k.y + k.h}`} {...p} />;
    else if (f.forme === "triangle_bas") el = <polygon points={`${k.x},${k.y} ${k.x + k.w},${k.y} ${cx},${k.y + k.h}`} {...p} />;
    else if (f.forme === "ligne") el = <line x1={k.x} y1={cy} x2={k.x + k.w} y2={cy} stroke={f.contour || f.remplissage} strokeWidth={f.epaisseur || 0.5} />;
    else el = <rect x={k.x} y={k.y} width={k.w} height={k.h} rx={f.rayon || 0} {...p} />;
  } else if (k.type === "image") {
    const masque = k.image?.masque && k.image.masque !== "rect" ? k.image.masque : null;
    el = k.image?.url
      ? <>
          {masque && <defs><clipPath id={idMasque}>{masque === "ellipse" ? <ellipse cx={cx} cy={cy} rx={k.w / 2} ry={k.h / 2} /> : <polygon points={masque === "triangle" ? `${cx},${k.y} ${k.x + k.w},${k.y + k.h} ${k.x},${k.y + k.h}` : `${k.x},${k.y} ${k.x + k.w},${k.y} ${cx},${k.y + k.h}`} />}</clipPath></defs>}
          <image href={k.image.url} x={k.x} y={k.y} width={k.w} height={k.h} clipPath={masque ? `url(#${idMasque})` : undefined} preserveAspectRatio={`xMidYMid ${(k.image.ajustement || "cover") === "cover" ? "slice" : "meet"}`} />
        </>
      : editeur ? <g><rect x={k.x} y={k.y} width={k.w} height={k.h} fill="rgba(181,131,141,0.15)" stroke="#b5838d" strokeWidth={0.4} strokeDasharray="1.5 1" /><text x={cx} y={cy} fontSize={Math.min(k.w, k.h) / 6} textAnchor="middle" dominantBaseline="central" fill="#b5838d" fontFamily="Inter">IMAGE</text></g> : null;
  } else if (k.type === "texte" && k.texte) {
    const t = k.texte;
    const m = mesurerTexte(t, k.w, k.h);
    const lh = m.taille * (t.interligne || 1.2);
    const x = t.align === "left" ? k.x : t.align === "right" ? k.x + k.w : cx;
    const contour = t.contour && (t.contourEpaisseur || 0) > 0 ? { stroke: t.contour, strokeWidth: t.contourEpaisseur! * 2, strokeLinejoin: "round" as const, paintOrder: "stroke" } : {};
    el = <>
      <text x={x} fontFamily={`'${t.police}', Georgia, serif`} fontSize={m.taille} fontWeight={t.gras ? 700 : 400} fontStyle={t.italique ? "italic" : "normal"} fill={t.couleur} {...contour} textAnchor={t.align === "left" ? "start" : t.align === "right" ? "end" : "middle"} dominantBaseline="central" style={{ whiteSpace: "pre" }}>
        {m.lignes.map((ln, i) => <tspan key={i} x={x} y={cy + (i - (m.lignes.length - 1) / 2) * lh}>{ln || " "}</tspan>)}
      </text>
      {editeur && (m.illisible || m.deborde) && <rect x={k.x} y={k.y} width={k.w} height={k.h} fill="none" stroke="#f87171" strokeWidth={0.6} strokeDasharray="1.2 0.8" />}
    </>;
  }
  return <g transform={k.rotation ? `rotate(${k.rotation} ${cx} ${cy})` : undefined} opacity={k.opacite ?? 1}>{el}</g>;
}

function Apercu({ c, largeurPx, zones = true }: { c: Creation; largeurPx: number; zones?: boolean }) {
  const L = Number(c.largeur_mm), H = Number(c.hauteur_mm);
  const k = Math.min(largeurPx / L, (largeurPx * 1.2) / H);
  return (
    <svg viewBox={`0 0 ${L} ${H}`} width={L * k} height={H * k} style={{ display: "block", background: c.contenu?.fond || "#fff", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
      {(c.contenu?.calques || []).map(x => <CalqueSvg key={x.id} k={x} editeur={zones} />)}
      {(c.contenu?.reperes?.traits || []).filter(t => t.type !== "collage").map((t, i) => <polyline key={i} points={(t.ferme ? [...t.points, t.points[0]] : t.points).map(p => p.join(",")).join(" ")} fill="none" stroke={t.type === "coupe" ? "#000" : "#999"} strokeWidth={t.type === "coupe" ? 0.6 : 0.4} strokeDasharray={t.type === "pli" ? "2 1.5" : undefined} />)}
    </svg>
  );
}

// ── Composant principal ──────────────────────────────────────
export default function EventsAtelierPapeterie() {
  const [liste, setListe] = useState<Creation[]>([]);
  const [onglet, setOnglet] = useState<"mes" | "patrons" | "packs">("patrons");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(true);
  const [ouverte, setOuverte] = useState<Creation | null>(null);
  const [pack, setPack] = useState<any>(null);
  const [nouveau, setNouveau] = useState<any>(null);
  const [assistant, setAssistant] = useState<any>(null);
  const [fSupport, setFSupport] = useState("__tous");
  const [fTheme, setFTheme] = useState("__tous");
  const [fCouleur, setFCouleur] = useState("__tous");
  const [occupe, setOccupe] = useState("");

  const charger = async () => {
    setCharge(true);
    try { setListe(await sbSelect<Creation>("events_papeterie", "select=*&statut=neq.archive&order=est_modele.desc,nom.asc&limit=1000")); setErreur(""); }
    catch (e: any) { setErreur(e.message); }
    setCharge(false);
  };
  const [, policesPretes] = useState(0);
  useEffect(() => { chargerPolices(); charger(); (document as any).fonts?.ready?.then(() => policesPretes(x => x + 1)); }, []);

  const supportDe_ = (c: Creation) => supportDuPatron(c.type_support) || "autre";
  const filtre = (c: Creation) => (fSupport === "__tous" || supportDe_(c) === fSupport) && (fTheme === "__tous" || (c.theme || "__aucun") === fTheme) && (fCouleur === "__tous" || ((c as any).couleurs || []).includes(fCouleur));
  const tousPatrons = liste.filter(x => x.est_modele), tousMes = liste.filter(x => !x.est_modele);
  const patrons = tousPatrons; // la création de kit voit toujours tous les patrons
  const mes = tousMes.filter(filtre);
  const base = onglet === "patrons" ? tousPatrons : tousMes;
  const supportsPresents = [...new Set(base.map(supportDe_))];
  const themesPresents = [...new Set(base.filter(c => fSupport === "__tous" || supportDe_(c) === fSupport).map(c => c.theme || "__aucun"))];
  const couleursPresentes = [...new Set(base.flatMap(c => (c as any).couleurs || []))] as string[];
  const collections = useMemo(() => [...new Set(patrons.map(p => p.collection || "Sans collection"))], [patrons]);
  const parClient = useMemo(() => {
    const m = new Map<string, Creation[]>();
    mes.forEach(c => { const k = c.client_nom || "Sans client"; m.set(k, [...(m.get(k) || []), c]); });
    return [...m.entries()];
  }, [mes]);

  const remplirZones = (contenu: ContenuPapeterie, v: any) => {
    const d = copie(contenu);
    const val: Record<string, string> = { PRENOM: v.prenom, AGE: ageTexte(v.age) || "", BADGE: v.age || "", DATE: v.date, LIEU: v.lieu, RSVP: v.rsvp, TITRE: v.titre, MESSAGE: v.message };
    d.calques.forEach(k => {
      if (k.type === "texte" && k.zone && val[k.zone]) k.texte!.contenu = val[k.zone];
      if (k.type === "image" && k.zone === "IMAGE" && v.image) k.image = { url: v.image, ajustement: k.image?.ajustement || "cover" };
    });
    return d;
  };

  const dupliquer = async (src: Creation, v: any = {}) => {
    const [row] = await sbInsert<Creation>("events_papeterie", {
      nom: `${nomCourt(src.nom)}${v.client ? " — " + v.client : " (copie)"}`, type_support: src.type_support, largeur_mm: src.largeur_mm, hauteur_mm: src.hauteur_mm,
      contenu: remplirZones(src.contenu, v), est_modele: false, modele_source_id: src.est_modele ? src.id : src.modele_source_id, programme_id: v.programme_id || src.programme_id || null,
      collection: src.collection, occasion: src.occasion, theme: v.theme || src.theme, client_nom: v.client || src.client_nom, statut: "brouillon",
    });
    return row;
  };

  // « Créer mon kit » : chaque support est recomposé selon sa forme avec
  // le même univers. Protégé contre les appuis multiples (un seul envoi,
  // bouton désactivé) — c'est ce qui avait créé 3 fois le pack « Vilosa ».
  const envoiKit = React.useRef(false);
  const creerPack = async () => {
    if (envoiKit.current) return;
    const choisis = patrons.filter(p => pack.ids.includes(p.id));
    const client = pack.client?.trim();
    if (!client || !choisis.length) return;
    if (mes.some(c => (c.client_nom || "").toLowerCase() === client.toLowerCase()) && !confirm(`Des créations existent déjà pour « ${client} ». Créer un nouveau kit en plus (variante) ?`)) return;
    envoiKit.current = true;
    const brief: BriefKit = { client, prenom: pack.prenom, age: pack.age, date: pack.date, lieu: pack.lieu, rsvp: pack.rsvp, titre: pack.titre || undefined, message: pack.message || undefined, theme: pack.theme,
      couleurs: pack.couleurs, police: pack.police, imageFond: pack.imageFond || null, personnage: pack.image || null, banderoleTexte: pack.banderoleTexte, banderoleMode: pack.banderoleMode, motif: pack.motif || null };
    const hexVersNom = (h: string) => { const n = parseInt((h || "#888888").slice(1, 7), 16); return nommerCouleur((n >> 16) & 255, (n >> 8) & 255, n & 255); };
    const couleursKit = Array.from(new Set([hexVersNom(pack.couleurs.principale), hexVersNom(pack.couleurs.accent)]));
    const lignes = choisis.flatMap(src => composerPieces(src, brief).map(pc => ({
      nom: pc.nom, type_support: src.type_support, largeur_mm: pc.largeur_mm, hauteur_mm: pc.hauteur_mm, contenu: pc.contenu, est_modele: false,
      modele_source_id: src.id, collection: src.collection, occasion: src.occasion, theme: pack.themeId || THEMES.find(t => t.mots.some(m => (pack.theme || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(m)))?.id || src.theme || null, couleurs: couleursKit, client_nom: client, statut: "brouillon",
    })));
    setOccupe(`Composition du kit : ${lignes.length} pièce(s)…`);
    try {
      await sbInsert("events_papeterie", lignes, "return=minimal"); // un seul envoi groupé
      setPack(null); await charger(); setOnglet("mes");
    } catch (e: any) { setErreur(e.message); }
    envoiKit.current = false;
    setOccupe("");
  };

  const exporterPack = async (client: string, items: Creation[]) => {
    setOccupe(`Préparation du PDF du pack (${items.length} pages)…`);
    try {
      const pages = [];
      for (const c of items) {
        const L = Number(c.largeur_mm), H = Number(c.hauteur_mm);
        const cv = (await rendreSurCanvas(c.contenu, L, H, pxParMmExport(L, H)))!;
        pages.push({ canvas: cv, largeurMm: L, hauteurMm: H });
      }
      const pdf = await canvasVersPdf(pages);
      await partagerFichier(pdf, `pack-${slug(client)}.pdf`, `Pack papeterie — ${client}`);
    } catch (e: any) { setErreur("Export impossible : " + (e.message || e)); }
    setOccupe("");
  };

  const creerLibre = async () => {
    const base = { est_modele: !!nouveau.modele, collection: nouveau.modele ? nouveau.collection || "Mes patrons" : null, client_nom: nouveau.client || null, statut: "brouillon" };
    let ligne: any;
    if (nouveau.type === "popcorn" || nouveau.type === "gable") {
      const prm = paramsBoite(nouveau);
      const g = nouveau.type === "popcorn" ? patronPopcorn(prm) : patronGable(prm);
      ligne = { ...base, nom: nouveau.nom?.trim() || g.nom, type_support: g.type_support, largeur_mm: g.largeur_mm, hauteur_mm: g.hauteur_mm, contenu: g.contenu };
    } else if (nouveau.type === "image") {
      if (!nouveau.imageUrl) return setErreur("Choisis d'abord l'image du patron (médiathèque).");
      const L = Number(nouveau.l) || 210, H = Math.round((L / (nouveau.ratio || 1)) * 10) / 10;
      // L'image du modèle est figée ; seules les zones ajoutées ensuite (textes, images) se modifient.
      ligne = { ...base, nom: nouveau.nom?.trim() || "Patron importé", type_support: "patron_importe", largeur_mm: L, hauteur_mm: H,
        contenu: { fond: "#ffffff", remplissage: false, reperes: { zone_sure_mm: 3, pliage: [] }, calques: [
          { id: nouvelId(), type: "image", zone: null, x: 0, y: 0, w: L, h: H, rotation: 0, verrou: true, image: { url: nouveau.imageUrl, ajustement: "cover" } },
          // Zones prêtes à placer : il suffit de les déplacer sur l'emplacement du modèle
          { id: nouvelId(), type: "texte", zone: "PRENOM", x: r1(L * 0.1), y: r1(H * 0.4), w: r1(L * 0.8), h: r1(H * 0.14), rotation: 0, texte: { contenu: "Prénom", taille: r1(Math.min(L, H) * 0.1), couleur: "#2d2424", police: "Playfair Display", gras: true, italique: false, align: "center" } },
          { id: nouvelId(), type: "texte", zone: "AGE", x: r1(L * 0.25), y: r1(H * 0.56), w: r1(L * 0.5), h: r1(H * 0.08), rotation: 0, texte: { contenu: "X ans", taille: r1(Math.min(L, H) * 0.06), couleur: "#c9a84c", police: "Inter", gras: true, italique: false, align: "center" } },
        ] } };
    } else {
      const L = Number(nouveau.l), H = Number(nouveau.h);
      if (!nouveau.nom?.trim() || !(L > 0) || !(H > 0)) return;
      ligne = { ...base, nom: nouveau.nom.trim(), type_support: "libre", largeur_mm: L, hauteur_mm: H, contenu: { fond: "#ffffff", calques: [], reperes: { zone_sure_mm: 3, pliage: [] } } };
    }
    const [row] = await sbInsert<Creation>("events_papeterie", ligne);
    setNouveau(null); await charger(); if (row) setOuverte(row);
  };

  if (ouverte) return <Editeur creation={ouverte} onFermer={() => { setOuverte(null); charger(); }} onDupliquer={async (c, v) => { const r = await dupliquer(c, v); await charger(); if (r) setOuverte(r); }} />;

  const petit: React.CSSProperties = { ...bouton(), padding: "7px 10px", fontSize: 14, minWidth: 40 };
  const Carte = ({ c }: { c: Creation }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ height: 160, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setOuverte(c)}><Apercu c={c} largeurPx={132} zones={c.est_modele} /></div>
      <div style={{ fontSize: 13, color: C.cream, fontWeight: 700, textAlign: "center", lineHeight: 1.3, cursor: "pointer" }} onClick={() => setOuverte(c)}>{nomCourt(c.nom)}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{Number(c.largeur_mm)} × {Number(c.hauteur_mm)} mm{!c.est_modele ? ` · ${c.statut}` : ""}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <button style={petit} title={c.est_modele ? "Modifier le patron" : "Modifier"} onClick={() => setOuverte(c)}>✏️</button>
        {c.est_modele && <button style={petit} title="Utiliser pour un client" onClick={async () => { const client = prompt("Nom du client pour cette copie :"); if (!client) return; await dupliquer(c, { client }); await charger(); setOnglet("mes"); }}>👤</button>}
        <button style={petit} title={c.est_modele ? "Dupliquer le patron (variante)" : "Dupliquer"} onClick={async () => { if (c.est_modele) { await copierEnPatron(c); return; } await dupliquer(c, { client: c.client_nom || undefined }); await charger(); }}>⧉</button>
        {!c.est_modele && <button style={petit} title="Enregistrer comme patron réutilisable" onClick={() => copierEnPatron(c)}>📐</button>}
        <button style={petit} title={c.est_modele ? "Retirer le patron" : "Supprimer"} onClick={async () => {
          if (c.est_modele) { if (!confirm(`Retirer le patron « ${nomCourt(c.nom)} » de la bibliothèque ?\n(Il est archivé, pas effacé : les créations déjà faites ne changent pas.)`)) return; await sbUpdate("events_papeterie", c.id, { statut: "archive", updated_at: new Date().toISOString() }); }
          else { if (!confirm(`Supprimer « ${c.nom} » ?`)) return; await sbDelete("events_papeterie", c.id); }
          charger();
        }}>🗑</button>
      </div>
    </div>
  );

  // Patron réutilisable à partir d'un patron ou d'une création : nouvelle
  // entrée de la bibliothèque, rangée dans le pack (collection) choisi.
  const copierEnPatron = async (c: Creation) => {
    const nom = prompt("Nom du nouveau patron :", c.est_modele ? `${nomCourt(c.nom)} (variante)` : nomCourt(c.nom).replace(/ — .*$/, ""));
    if (!nom) return;
    const collection = prompt(`Pack de patrons (collection) :\nexistants : ${collections.join(" · ")}`, c.collection || collections[0] || "Mes patrons");
    if (collection === null) return;
    try {
      await sbInsert("events_papeterie", { nom: nom.trim(), type_support: c.type_support, largeur_mm: c.largeur_mm, hauteur_mm: c.hauteur_mm, contenu: c.contenu, est_modele: true, modele_source_id: c.est_modele ? c.id : c.modele_source_id,
        collection: collection.trim() || "Mes patrons", occasion: c.occasion, theme: c.theme, couleurs: (c as any).couleurs || null, client_nom: null, statut: "brouillon" }, "return=minimal");
      await charger(); setOnglet("patrons");
    } catch (e: any) { setErreur(e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.cream }}>✂️ Atelier papeterie</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={bouton(onglet === "patrons")} onClick={() => setOnglet("patrons")}>📐 Patrons ({patrons.length})</button>
        <button style={bouton(onglet === "mes")} onClick={() => setOnglet("mes")}>🎨 Mes créations ({mes.length})</button>
        <button style={bouton(onglet === "packs")} onClick={() => setOnglet("packs")}>📚 Packs achetés</button>
        <div style={{ flex: 1 }} />
        <button style={bouton(true)} onClick={() => setAssistant({ demande: "", prenom: "", age: "", prestation: "", client: "" })} disabled={!patrons.length}>🪄 Proposer un pack</button>
        <button style={bouton()} onClick={() => setPack({ client: "", prenom: "", age: "", date: "", lieu: "", rsvp: "", titre: "Joyeux anniversaire", message: "", banderoleTexte: "", banderoleMode: "lettres", police: "Playfair Display", motif: "confettis", couleurs: { fond: "#fdf6f0", principale: "#b5838d", accent: "#c9a84c", texte: "#2d2424" }, ids: patrons.filter(p => p.collection === collections[0]).map(p => p.id) })} disabled={!patrons.length}>🎁 Créer mon kit</button>
        <button style={bouton()} onClick={() => setNouveau({ nom: "", l: 210, h: 297, type: "image", modele: true, collection: "Patrons achetés" })}>📥 Ajouter un patron acheté</button>
        <button style={bouton()} onClick={() => setNouveau({ nom: "", l: 210, h: 297, type: "libre" })}>+ Nouvelle création / patron</button>
      </div>
      {occupe && <div style={{ fontSize: 12, color: C.gold }}>⏳ {occupe}</div>}
      {erreur && <div style={{ fontSize: 12, color: C.rouge }}>⚠️ {erreur}</div>}
      {charge && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>Chargement…</div>}

      {!charge && onglet !== "packs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Filtre titre="1 · Support" valeur={fSupport} onChange={v => { setFSupport(v); setFTheme("__tous"); }} options={supportsPresents.map(k => [k, k === "autre" ? "Autres" : `${supportDe(k)?.ico || ""} ${supportDe(k)?.libelle || k}`])} />
          <Filtre titre="2 · Thème" valeur={fTheme} onChange={setFTheme} options={themesPresents.map(k => [k, k === "__aucun" ? "Sans thème" : themeDe(k)?.libelle || k])} />
          {couleursPresentes.length > 0 && <Filtre titre="3 · Couleur" valeur={fCouleur} onChange={setFCouleur} options={couleursPresentes.map(k => [k, COULEURS.find(c => c.id === k)?.libelle || k])} />}
        </div>
      )}
      {!charge && onglet === "patrons" && [...supportsPresents].sort((a, b) => SUPPORTS.findIndex(s => s.id === a) - SUPPORTS.findIndex(s => s.id === b)).filter(sp => fSupport === "__tous" || sp === fSupport).map(sp => {
        const items = tousPatrons.filter(p => supportDe_(p) === sp && filtre(p));
        if (!items.length) return null;
        return <div key={sp} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>{sp === "autre" ? "Autres supports" : `${supportDe(sp)?.ico} ${supportDe(sp)?.libelle}`} ({items.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(158px,1fr))", gap: 10 }}>{items.map(c => <Carte key={c.id} c={c} />)}</div>
        </div>;
      })}
      {!charge && onglet === "mes" && (mes.length === 0
        ? <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>Aucune création — duplique un patron (⧉) ou crée un pack client.</div>
        : parClient.map(([client, items]) => (
          <div key={client} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, flex: 1 }}>{client} ({items.length})</div>
              <button style={{ ...bouton(), fontSize: 11 }} onClick={() => exporterPack(client, items)}>📄 PDF du pack / partager</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(158px,1fr))", gap: 10 }}>{items.map(c => <Carte key={c.id} c={c} />)}</div>
          </div>
        )))}

      {onglet === "packs" && <PacksAchetes />}
      {assistant && <AssistantPack etat={assistant} setEtat={setAssistant} patrons={tousPatrons} onPreparer={(prop: Proposition, ids: string[]) => {
        setPack({ client: assistant.client || assistant.prenom || "", prenom: assistant.prenom, age: assistant.age, date: "", lieu: "", rsvp: "", titre: prop.titre, message: prop.message, theme: prop.theme?.libelle || "", themeId: prop.theme?.id || null,
          banderoleTexte: "", banderoleMode: "lettres", police: prop.police, couleurs: prop.couleurs, motif: prop.fond ? null : prop.motif, imageFond: prop.fond?.url || null, image: prop.personnage?.url || null,
          ids });
        setAssistant(null);
      }} />}

      {pack && (
        <Feuille titre="🎁 Créer mon kit" onFermer={() => setPack(null)}>
          <div style={{ fontSize: 11, color: C.muted }}>Chaque support est recomposé selon sa forme avec le même univers (couleurs, police, fond, personnage). Les patrons d'origine restent intacts. Tout reste modifiable ensuite.</div>
          <input style={champ} placeholder="Nom du client *" value={pack.client} onChange={e => setPack({ ...pack, client: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
            <input style={champ} placeholder="Prénom (enfant / fêté·e)" value={pack.prenom} onChange={e => setPack({ ...pack, prenom: e.target.value })} />
            <input style={champ} placeholder="Âge" value={pack.age} onChange={e => setPack({ ...pack, age: e.target.value })} />
          </div>
          <input style={champ} placeholder="Date et heure (ex. Samedi 12/12 · 15h)" value={pack.date} onChange={e => setPack({ ...pack, date: e.target.value })} />
          <input style={champ} placeholder="Lieu" value={pack.lieu} onChange={e => setPack({ ...pack, lieu: e.target.value })} />
          <input style={champ} placeholder="RSVP (ex. RSVP : 0694 …)" value={pack.rsvp} onChange={e => setPack({ ...pack, rsvp: e.target.value })} />
          <input style={champ} placeholder="Thème (ex. Pat'Patrouille, Bal masqué, Safari…)" value={pack.theme || ""} onChange={e => setPack({ ...pack, theme: e.target.value })} />
          <input style={champ} placeholder="Titre (ex. Joyeux anniversaire)" value={pack.titre || ""} onChange={e => setPack({ ...pack, titre: e.target.value })} />
          <input style={champ} placeholder="Message (cartes de remerciement, toppers sachets…)" value={pack.message || ""} onChange={e => setPack({ ...pack, message: e.target.value })} />
          <button style={bouton()} disabled={!(pack.theme || "").trim() || !!occupe} onClick={async () => {
            setOccupe("Recherche des visuels du thème…");
            try {
              const medias = await sbSelect("events_medias", "select=id,url,theme,type_support,couleurs,nature,largeur,hauteur&limit=5000");
              const p = proposerPack({ demande: `${pack.theme} ${pack.titre || ""}`, prenom: pack.prenom, age: pack.age }, medias);
              setPack((x: any) => ({ ...x, couleurs: p.couleurs, police: p.police, motif: p.motif || x.motif, themeId: p.theme?.id || x.themeId, imageFond: x.imageFond || p.fond?.url || null, image: x.image || p.personnage?.url || null }));
              setErreur(p.theme ? "" : "Thème non reconnu : palette par défaut. Choisis les couleurs et les images à la main.");
            } catch (e: any) { setErreur(e.message); }
            setOccupe("");
          }}>✨ Compléter d'après le thème (couleurs, police, images de ta médiathèque)</button>
          <div style={lbl}>Univers du kit</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {([["fond", "Fond"], ["principale", "Principale"], ["accent", "Accent"], ["texte", "Texte"]] as const).map(([k, l]) => (
              <label key={k} style={{ fontSize: 11, color: C.muted, display: "flex", flexDirection: "column", gap: 4 }}>{l}<input type="color" value={pack.couleurs[k]} onChange={e => setPack({ ...pack, couleurs: { ...pack.couleurs, [k]: e.target.value } })} style={{ width: "100%", height: 40, minHeight: 40, padding: 0, border: `1px solid ${C.border}`, borderRadius: 10, background: "none" }} /></label>
            ))}
          </div>
          <select style={champ} value={pack.police} onChange={e => setPack({ ...pack, police: e.target.value })}>{POLICES.map(p => <option key={p} value={p}>Police des titres : {p}</option>)}</select>
          <select style={champ} value={pack.motif || ""} onChange={e => setPack({ ...pack, motif: e.target.value || null })}><option value="">Décor (sans image de fond) : aucun</option>{([["confettis", "Confettis"], ["etoiles", "Étoiles"], ["pois", "Pois"], ["coeurs", "Cœurs"], ["vagues", "Vagues"], ["triangles", "Géométrique"]] as const).map(([v, l]) => <option key={v} value={v}>Décor (sans image de fond) : {l}</option>)}</select>
          <div style={{ fontSize: 11, color: C.muted }}>L'image de fond recouvre chaque pièce entière (sur les boîtes : toute la surface imprimée). Le personnage va dans les zones image des patrons ; sans personnage, ces zones sont retirées et les textes recentrés.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
            {([["imageFond", "choixFond", "🌄 Image de fond / motif"], ["image", "choixImage", "🧸 Personnage / photo"]] as const).map(([k, choix, l]) => (
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {pack[k] ? <img src={pack[k]} alt="" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6, background: "#fff" }} /> : null}
                <button style={{ ...bouton(), whiteSpace: "normal", textAlign: "left" }} onClick={() => setPack({ ...pack, [choix]: true })}>{pack[k] ? "Changer" : l}</button>
                {pack[k] && <button style={{ ...bouton(), padding: "4px 7px" }} onClick={() => setPack({ ...pack, [k]: null })}>✕</button>}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
            <input style={champ} placeholder="Texte de la banderole (par défaut : le prénom)" value={pack.banderoleTexte || ""} onChange={e => setPack({ ...pack, banderoleTexte: e.target.value })} />
            <select style={champ} value={pack.banderoleMode} onChange={e => setPack({ ...pack, banderoleMode: e.target.value })}><option value="lettres">1 fanion / lettre</option><option value="mots">1 fanion / mot</option></select>
          </div>
          <div style={lbl}>Patrons du kit ({pack.ids.length}) — tous tes packs de patrons, y compris les patrons achetés importés</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
            {collections.map(col => { const ps = patrons.filter(p => (p.collection || "Sans collection") === col); const tous = ps.every(p => pack.ids.includes(p.id)); return (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, flex: 1 }}>{col} ({ps.filter(p => pack.ids.includes(p.id)).length}/{ps.length})</div>
                  <button style={{ ...bouton(), padding: "5px 10px" }} onClick={() => setPack({ ...pack, ids: tous ? pack.ids.filter((x: string) => !ps.some(p => p.id === x)) : [...new Set([...pack.ids, ...ps.map(p => p.id)])] })}>{tous ? "Aucun" : "Tous"}</button>
                </div>
                {ps.map(p => (
                  <label key={p.id} style={{ fontSize: 14, color: C.cream, display: "flex", gap: 10, alignItems: "center", minHeight: 32 }}>
                    <input type="checkbox" style={{ width: 20, height: 20 }} checked={pack.ids.includes(p.id)} onChange={e => setPack({ ...pack, ids: e.target.checked ? [...pack.ids, p.id] : pack.ids.filter((x: string) => x !== p.id) })} />{nomCourt(p.nom)}
                  </label>
                ))}
              </div>); })}
          </div>
          <button style={{ ...bouton(true), opacity: occupe ? 0.5 : 1 }} onClick={creerPack} disabled={!pack.client?.trim() || !!occupe}>{occupe ? "⏳ Création en cours…" : "Créer le kit"}</button>
          {pack.choixImage && <Feuille titre="Choisir le personnage / la photo" onFermer={() => setPack({ ...pack, choixImage: false })}><EventsMediatheque mode="choisir" onChoisir={m => setPack({ ...pack, image: m.url, choixImage: false })} /></Feuille>}
          {pack.choixFond && <Feuille titre="Choisir l'image de fond" onFermer={() => setPack({ ...pack, choixFond: false })}><EventsMediatheque mode="choisir" onChoisir={m => setPack({ ...pack, imageFond: m.url, choixFond: false })} /></Feuille>}
        </Feuille>
      )}

      {nouveau && (
        <Feuille titre="Nouvelle création" onFermer={() => setNouveau(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 6 }}>
            {([["libre", "📄 Page vierge"], ["popcorn", "🍿 Patron boîte popcorn"], ["gable", "🎁 Patron gable box"], ["image", "🖼️ Patron depuis une image"]] as const).map(([t, l]) => <button key={t} style={bouton((nouveau.type || "libre") === t)} onClick={() => setNouveau({ ...nouveau, type: t })}>{l}</button>)}
          </div>
          <input style={champ} placeholder={nouveau.type === "popcorn" || nouveau.type === "gable" ? "Nom (facultatif, sinon généré)" : "Nom (ex. Menu de table)"} value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} />
          {(nouveau.type === "popcorn" || nouveau.type === "gable") && <>
            <div style={{ fontSize: 11, color: C.muted }}>Dimensions de la boîte MONTÉE, en mm : largeur de face × profondeur × hauteur{nouveau.type === "gable" ? " (+ hauteur du toit)" : ""}. Le patron (coupe, plis, rabats, collage) est calculé automatiquement. Fais un essai d'assemblage avant une production.</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${nouveau.type === "gable" ? 4 : 3},1fr)`, gap: 6 }}>
              <input style={champ} type="number" placeholder="Largeur" value={nouveau.bl ?? (nouveau.type === "gable" ? 80 : 65)} onChange={e => setNouveau({ ...nouveau, bl: e.target.value })} />
              <input style={champ} type="number" placeholder="Profondeur" value={nouveau.bp ?? (nouveau.type === "gable" ? 50 : 65)} onChange={e => setNouveau({ ...nouveau, bp: e.target.value })} />
              <input style={champ} type="number" placeholder="Hauteur" value={nouveau.bh ?? (nouveau.type === "gable" ? 80 : 110)} onChange={e => setNouveau({ ...nouveau, bh: e.target.value })} />
              {nouveau.type === "gable" && <input style={champ} type="number" placeholder="Toit" value={nouveau.bt ?? 45} onChange={e => setNouveau({ ...nouveau, bt: e.target.value })} />}
            </div>
            {(() => { const g = nouveau.type === "popcorn" ? patronPopcorn(paramsBoite(nouveau)) : patronGable(paramsBoite(nouveau)); const a4 = (g.largeur_mm <= 287 && g.hauteur_mm <= 200) || (g.largeur_mm <= 200 && g.hauteur_mm <= 287); const a3 = (g.largeur_mm <= 410 && g.hauteur_mm <= 287) || (g.largeur_mm <= 287 && g.hauteur_mm <= 410);
              return <div style={{ fontSize: 11, color: a4 ? C.ok : C.gold }}>Patron à plat : {g.largeur_mm} × {g.hauteur_mm} mm → {a4 ? "tient sur une feuille A4" : a3 ? "nécessite une feuille A3 (ou réduis les dimensions)" : "plus grand qu'un A3 : réduis les dimensions ou imprime chez un imprimeur"}.</div>; })()}
          </>}
          {nouveau.type === "image" && <>
            <div style={{ fontSize: 11, color: C.muted }}>Importe d'abord ton modèle (export PNG/JPG de Canva, scan…) dans la Médiathèque. Il devient le fond figé (jamais recouvert dans les kits). Deux zones « Prénom » et « Âge » sont déjà posées : glisse-les à leur place sur le modèle, ajoute si besoin d'autres zones (date, lieu, photo…), puis 💾 Enregistrer. Le patron apparaît ensuite dans « Créer mon kit ».</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {nouveau.imageUrl && <img src={nouveau.imageUrl} alt="" style={{ width: 56, height: 56, objectFit: "contain", background: "#fff", borderRadius: 6 }} />}
              <button style={bouton()} onClick={() => setNouveau({ ...nouveau, choixFond: true })}>{nouveau.imageUrl ? "Changer l'image" : "🖼️ Choisir l'image du modèle"}</button>
            </div>
            <input style={champ} type="number" placeholder="Largeur réelle imprimée (mm)" value={nouveau.l} onChange={e => setNouveau({ ...nouveau, l: e.target.value })} />
            {nouveau.imageUrl && <div style={{ fontSize: 11, color: C.muted }}>Hauteur calculée d'après l'image : {Math.round((Number(nouveau.l) || 210) / (nouveau.ratio || 1))} mm.</div>}
            {nouveau.choixFond && <Feuille titre="Image du modèle" onFermer={() => setNouveau({ ...nouveau, choixFond: false })}><EventsMediatheque mode="choisir" onChoisir={m => setNouveau({ ...nouveau, imageUrl: m.url, ratio: m.largeur && m.hauteur ? m.largeur / m.hauteur : 1, choixFond: false })} /></Feuille>}
          </>}
          {(!nouveau.type || nouveau.type === "libre") && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input style={champ} type="number" placeholder="Largeur mm" value={nouveau.l} onChange={e => setNouveau({ ...nouveau, l: e.target.value })} />
            <input style={champ} type="number" placeholder="Hauteur mm" value={nouveau.h} onChange={e => setNouveau({ ...nouveau, h: e.target.value })} />
          </div>}
          {(!nouveau.type || nouveau.type === "libre") && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{[["A4", 210, 297], ["A5", 148, 210], ["A6", 105, 148], ["Carré 10", 100, 100], ["Story", 108, 192]].map(([n, l, h]) => <button key={n as string} style={{ ...bouton(), padding: "3px 8px", fontSize: 11 }} onClick={() => setNouveau({ ...nouveau, l, h })}>{n}</button>)}</div>}
          <input style={champ} placeholder="Client (facultatif)" value={nouveau.client || ""} onChange={e => setNouveau({ ...nouveau, client: e.target.value })} />
          <label style={{ fontSize: 12, color: C.cream, display: "flex", gap: 6 }}><input type="checkbox" checked={!!nouveau.modele} onChange={e => setNouveau({ ...nouveau, modele: e.target.checked })} /> C'est un nouveau patron réutilisable</label>
          {nouveau.modele && <input style={champ} placeholder="Collection (ex. Pack Baptême)" value={nouveau.collection || ""} onChange={e => setNouveau({ ...nouveau, collection: e.target.value })} />}
          <button style={bouton(true)} onClick={creerLibre}>Créer et ouvrir</button>
        </Feuille>
      )}
    </div>
  );
}

const paramsBoite = (n: any) => n.type === "gable"
  ? { largeur: Number(n.bl) || 80, profondeur: Number(n.bp) || 50, hauteur: Number(n.bh) || 80, toit: Number(n.bt) || 45 }
  : { largeur: Number(n.bl) || 65, profondeur: Number(n.bp) || 65, hauteur: Number(n.bh) || 110 };

function Filtre({ titre, valeur, onChange, options }: { titre: string; valeur: string; onChange: (v: string) => void; options: string[][] }) {
  if (options.length < 2) return null;
  return <div style={{ display: "flex", gap: 5, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
    <span style={{ ...lbl, whiteSpace: "nowrap", minWidth: 74 }}>{titre}</span>
    <button style={{ ...bouton(valeur === "__tous"), padding: "4px 9px", fontSize: 11, flexShrink: 0 }} onClick={() => onChange("__tous")}>Tous</button>
    {options.map(([v, l]) => <button key={v} style={{ ...bouton(valeur === v), padding: "4px 9px", fontSize: 11, flexShrink: 0 }} onClick={() => onChange(v)}>{l}</button>)}
  </div>;
}

// ── 🪄 Assistant : demande client → pack complet proposé ─────
function AssistantPack({ etat, setEtat, patrons, onPreparer }: { etat: any; setEtat: (e: any) => void; patrons: Creation[]; onPreparer: (p: Proposition, ids: string[]) => void }) {
  const [medias, setMedias] = useState<any[] | null>(null);
  const [choix, setChoix] = useState<Set<string> | null>(null);
  useEffect(() => { sbSelect("events_medias", "select=id,url,theme,type_support,couleurs,nature,largeur,hauteur&limit=5000").then(setMedias).catch(() => setMedias([])); }, []);
  const prop = useMemo(() => etat.demande?.trim() && medias ? proposerPack(etat, medias) : null, [etat, medias]);
  const proposes = useMemo(() => prop ? patrons.filter(p => prop.supports.includes(supportDuPatron(p.type_support) || "")) : [], [prop, patrons]);
  useEffect(() => { setChoix(new Set(proposes.map(p => p.id))); }, [proposes.map(p => p.id).join()]);
  const maj = (p: any) => setEtat({ ...etat, ...p });
  return (
    <Feuille titre="🪄 Proposer un pack selon la demande" onFermer={() => setEtat(null)}>
      <div style={{ fontSize: 11, color: C.muted }}>Colle ou résume la demande du client. Bellaïa en déduit le thème, la palette, la police, les supports adaptés et cherche tes visuels correspondants — même sans image du thème, le pack est proposé avec un décor généré.</div>
      <textarea style={{ ...champ, minHeight: 70 }} placeholder="Ex. « Anniversaire licorne pour Léa, 6 ans, en rose et doré, 15 enfants »" value={etat.demande} onChange={e => maj({ demande: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
        <input style={champ} placeholder="Client" value={etat.client} onChange={e => maj({ client: e.target.value })} />
        <input style={champ} placeholder="Prénom (fêté·e)" value={etat.prenom} onChange={e => maj({ prenom: e.target.value })} />
        <input style={champ} placeholder="Âge" value={etat.age} onChange={e => maj({ age: e.target.value })} />
        <select style={champ} value={etat.prestation} onChange={e => maj({ prestation: e.target.value })}><option value="">Prestation : détectée</option>{PRESTATIONS.map(p => <option key={p.id} value={p.id}>{p.libelle}</option>)}</select>
      </div>
      {!medias && <div style={{ fontSize: 12, color: C.muted }}>Lecture de ta médiathèque…</div>}
      {prop && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: C.card, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div><div style={lbl}>Thème</div><div style={{ fontSize: 15, fontWeight: 800, color: C.cream }}>{prop.theme?.libelle || "Non reconnu"}</div></div>
            <div><div style={lbl}>Prestation</div><div style={{ fontSize: 13, color: C.cream }}>{prop.prestation.libelle}</div></div>
            <div><div style={lbl}>Palette</div><div style={{ display: "flex", gap: 4 }}>{Object.values(prop.couleurs).map((c, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.3)" }} />)}</div></div>
            <div><div style={lbl}>Police</div><div style={{ fontSize: 16, color: C.cream, fontFamily: prop.police }}>{prop.titre}</div></div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {([["Fond", prop.fond], ["Personnage / image", prop.personnage]] as const).map(([l, m]) => <div key={l} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {m ? <img src={m.url} alt="" style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", borderRadius: 6 }} /> : <span style={{ width: 48, height: 48, borderRadius: 6, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.muted }}>{l === "Fond" ? "décor" : "—"}</span>}
              <span style={{ fontSize: 11, color: C.muted }}>{l}{!m && l === "Fond" ? " : décor généré" : ""}</span>
            </div>)}
          </div>
          {prop.notes.map((n, i) => <div key={i} style={{ fontSize: 11, color: C.gold }}>• {n}</div>)}
          <div style={lbl}>Supports proposés ({choix?.size || 0}/{proposes.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {proposes.map(p => <label key={p.id} style={{ fontSize: 12, color: C.cream, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={!!choix?.has(p.id)} onChange={e => setChoix(sx => { const n = new Set(sx); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })} />{supportDe(supportDuPatron(p.type_support))?.ico} {nomCourt(p.nom)}
            </label>)}
          </div>
          <button style={bouton(true)} disabled={!choix?.size} onClick={() => onPreparer(prop, [...(choix || [])])}>Préparer ce pack → vérifier puis créer</button>
        </div>
      )}
    </Feuille>
  );
}

// ── Mode remplissage : la liste des zones à compléter ────────
function ZonesARemplir({ doc, majCalque, choisirImage }: { doc: ContenuPapeterie; majCalque: (id: string, p: any, memo?: boolean) => void; choisirImage: (id: string) => void }) {
  const zones = doc.calques.filter(k => k.zone && !["FOND", "DECOR", "CARTOUCHE", "FOND_COULEUR"].includes(k.zone));
  return (
    <div style={{ background: C.card, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>🔒 Mode remplissage — seules ces zones se modifient</div>
      {zones.length === 0 && <div style={{ fontSize: 11, color: C.muted }}>Aucune zone définie. Passe en « 🔓 Édition libre », ajoute un texte ou une image, choisis « Zone … » dans ses propriétés, puis reviens en mode remplissage.</div>}
      {zones.map(k => {
        if (k.type === "texte" && k.texte) {
          const m = mesurerTexte(k.texte, k.w, k.h);
          return <div key={k.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={lbl}>{k.zone}</span>
            <textarea style={{ ...champ, minHeight: 36 }} value={k.texte.contenu} onChange={e => majCalque(k.id, { texte: { contenu: e.target.value } }, false)} />
            {m.illisible ? <span style={{ fontSize: 10, color: C.rouge }}>⚠️ Trop long pour la zone ({m.taille.toFixed(1)} mm) : raccourcis le texte.</span> : m.reduit ? <span style={{ fontSize: 10, color: C.gold }}>Réduit à {m.taille.toFixed(1)} mm pour tenir.</span> : null}
          </div>;
        }
        if (k.type === "image") return <div key={k.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {k.image?.url ? <img src={k.image.url} alt="" style={{ width: 44, height: 44, objectFit: "contain", background: "#fff", borderRadius: 6 }} /> : <span style={{ width: 44, height: 44, borderRadius: 6, border: `1px dashed ${C.border}` }} />}
          <span style={{ ...lbl, flex: 1 }}>{k.zone}</span>
          <button style={bouton()} onClick={() => choisirImage(k.id)}>{k.image?.url ? "Changer l'image" : "Choisir l'image"}</button>
        </div>;
        return null;
      })}
    </div>
  );
}

// ── Registre des packs achetés (Canva / Google Drive) ────────
const ETATS_PACK: [string, string, string][] = [["a_ouvrir", "À ouvrir", C.muted], ["copie_canva", "Copié dans mon Canva", C.bleu], ["exporte", "Exporté (PDF/PNG)", C.gold], ["importe", "Importé dans la médiathèque", C.ok], ["inaccessible", "Inaccessible", C.rouge]];
/** Nature RÉELLE d'un lien acheté (audit du 24/11) : jamais « modifiable » si ce n'est qu'une consultation. */
export function natureLien(l: { source?: string; lien?: string; element?: string }): { libelle: string; detail: string; alerte?: string } {
  const u = String(l.lien || "");
  const marque = /^Logos\b/i.test(String(l.element || "")) ? "Marque déposée d'un tiers : ne pas l'utiliser sur des articles vendus sans autorisation de son titulaire." : undefined;
  if (/canva\.link\//.test(u) || /canva\.com\/design\/.*mode=preview/.test(u)) return { libelle: "Lien de modèle Canva", detail: "« Utiliser le modèle » crée TA copie modifiable dans Canva ; télécharge-la ensuite en PDF/PNG.", alerte: marque };
  if (/canva\.com\/design\/.*\/view/.test(u)) return { libelle: "Consultation seule (Canva)", detail: "S'ouvre dans la visionneuse Canva (les pages défilent : ce n'est pas une vidéo). Non modifiable ici ni exportable tant qu'aucune copie n'existe dans ton compte Canva : « Modifier une copie » / « Utiliser le modèle », puis Télécharger.", alerte: marque };
  if (/drive\.google\.com\/drive\/folders/.test(u)) return { libelle: "Dossier Google Drive", detail: "Fichiers statiques (images/PDF) : télécharger puis importer dans la Médiathèque.", alerte: marque };
  if (/drive\.google\.com\/file\//.test(u)) return { libelle: "Fichier Google Drive", detail: "Fichier statique : télécharger puis importer dans la Médiathèque.", alerte: marque };
  return { libelle: "Lien externe", detail: "Nature non vérifiée.", alerte: marque };
}

function PacksAchetes() {
  const [lignes, setLignes] = useState<any[]>([]);
  const [erreur, setErreur] = useState("");
  const charger = () => sbSelect("events_packs_registre", "select=*&order=pack.asc,ordre.asc").then(setLignes).catch(e => setErreur(e.message));
  useEffect(() => { charger(); }, []);
  const maj = async (l: any, patch: any) => { setLignes(xs => xs.map(x => x.id === l.id ? { ...x, ...patch } : x)); try { await sbUpdate("events_packs_registre", l.id, { ...patch, updated_at: new Date().toISOString() }); } catch (e: any) { setErreur(e.message); charger(); } };
  const packs = [...new Set(lignes.map(l => l.pack))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        Tes PDF d'achat ne contiennent que des liens : les modèles restent dans Canva et Google Drive. Pour chaque élément : <b style={{ color: C.cream }}>1.</b> « Ouvrir » (connecte-toi à ton compte) → <b style={{ color: C.cream }}>2.</b> Canva : « Utiliser le modèle » ; Drive : « Télécharger » → <b style={{ color: C.cream }}>3.</b> télécharge en PDF ou PNG → <b style={{ color: C.cream }}>4.</b> importe le fichier dans 🖼️ Médiathèque → il devient utilisable comme fond, image ou patron dans tes kits. Note l'avancement ici.
      </div>
      {erreur && <div style={{ fontSize: 12, color: C.rouge }}>⚠️ {erreur}</div>}
      {packs.map(p => (
        <div key={p} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p} <span style={{ color: C.muted, fontWeight: 400 }}>· {lignes.filter(l => l.pack === p && l.etat === "importe").length}/{lignes.filter(l => l.pack === p).length} importés</span></div>
          <div style={{ fontSize: 10, color: C.muted }}>Licence : {lignes.find(l => l.pack === p)?.licence}</div>
          {lignes.filter(l => l.pack === p).map(l => { const e = ETATS_PACK.find(x => x[0] === l.etat) || ETATS_PACK[0]; return (
            <div key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${e[2]}`, borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ flex: "1 1 180px", fontSize: 12, color: C.cream }}>{l.source === "canva" ? "🎨" : "📁"} {l.element}
                {(() => { const n = natureLien(l); return <div data-testid="nature-lien" style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}><b style={{ color: C.gold }}>{n.libelle}</b> — {n.detail}{n.alerte && <div style={{ color: C.rouge, marginTop: 2 }}>⚠️ {n.alerte}</div>}</div>; })()}</div>
              <a href={l.lien} target="_blank" rel="noopener noreferrer" style={{ ...bouton(), textDecoration: "none", fontSize: 11 }}>Ouvrir ↗</a>
              <select style={{ ...champ, width: "auto", fontSize: 11 }} value={l.etat} onChange={ev => maj(l, { etat: ev.target.value })}>{ETATS_PACK.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            </div>); })}
        </div>
      ))}
      {!lignes.length && !erreur && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>Aucun pack enregistré.</div>}
    </div>
  );
}

// Dans une colonne flex à hauteur limitée, les champs étaient COMPRIMÉS
// (sélecteurs coupés en deux, pastilles de couleur écrasées sur iPhone) :
// aucun enfant ne rétrécit, et les champs ont une taille tactile (16 px
// évite aussi le zoom automatique de Safari).
const STYLE_FEUILLE = `.bl-feuille>*{flex-shrink:0}
.bl-feuille input:not([type=checkbox]):not([type=color]):not([type=range]),.bl-feuille select{min-height:42px}
.bl-feuille textarea{min-height:64px}
@media (pointer:coarse){.bl-feuille input:not([type=checkbox]):not([type=color]):not([type=range]),.bl-feuille select,.bl-feuille textarea{font-size:16px!important}}`;
function Feuille({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div className="bl-feuille" onClick={e => e.stopPropagation()} style={{ background: "#16131c", border: `1px solid ${C.border}`, borderRadius: "16px 16px 0 0", padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 10, maxHeight: "90vh", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: SA, boxSizing: "border-box" }}>
        <style>{STYLE_FEUILLE}</style>
        <div style={{ display: "flex", alignItems: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: C.cream, flex: 1 }}>{titre}</div><button style={{ ...bouton(), padding: "3px 9px" }} onClick={onFermer}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

// ── Éditeur ─────────────────────────────────────────────────
function Editeur({ creation, onFermer, onDupliquer }: { creation: Creation; onFermer: () => void; onDupliquer: (c: Creation, v: any) => Promise<void> }) {
  const L = Number(creation.largeur_mm), H = Number(creation.hauteur_mm);
  const [doc, setDoc] = useState<ContenuPapeterie>(() => ({ fond: "#ffffff", calques: [], reperes: { zone_sure_mm: 3, pliage: [] }, ...copie(creation.contenu || {}) }));
  const [meta, setMeta] = useState({ nom: creation.nom, client_nom: creation.client_nom || "", statut: creation.statut, collection: creation.collection || "" });
  const [sel, setSel] = useState<string | null>(null);
  const [histo, setHisto] = useState<ContenuPapeterie[]>([]);
  const [futur, setFutur] = useState<ContenuPapeterie[]>([]);
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({});
  const [avecTraits, setAvecTraits] = useState(true);
  const [sauvegarde, setSauvegarde] = useState<"" | "en_cours" | "ok">("");
  const [modifie, setModifie] = useState(false);
  const [reperes, setReperes] = useState(true);
  const [choixImage, setChoixImage] = useState<null | "ajout" | "remplacer">(null);
  const [message, setMessage] = useState("");
  const [largeurDispo, setLargeurDispo] = useState(600);
  const boite = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const glisse = useRef<null | { mode: "deplacer" | "taille"; id: string; px: number; py: number; x: number; y: number; w: number; h: number }>(null);
  const refFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = boite.current; if (!el) return;
    const ro = new ResizeObserver(() => setLargeurDispo(el.clientWidth));
    ro.observe(el); setLargeurDispo(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const echelle = Math.min(largeurDispo / L, (typeof window !== "undefined" ? window.innerHeight * 0.6 : 500) / H) * zoom;
  const remplissage = !!doc.remplissage;
  const traits = doc.reperes?.traits || [];
  const calque = doc.calques.find(k => k.id === sel) || null;

  const memoriser = () => { setHisto(h => [...h.slice(-40), copie(doc)]); setFutur([]); setModifie(true); };
  const changerDoc = (f: (d: ContenuPapeterie) => void, memo = true) => { if (memo) memoriser(); setDoc(d => { const n = copie(d); f(n); return n; }); setModifie(true); };
  const majCalque = (id: string, patch: any, memo = true) => changerDoc(d => { const k = d.calques.find(x => x.id === id); if (!k) return; Object.keys(patch).forEach(cle => { (k as any)[cle] = typeof patch[cle] === "object" && patch[cle] && !Array.isArray(patch[cle]) ? { ...(k as any)[cle], ...patch[cle] } : patch[cle]; }); }, memo);
  const annuler = () => { if (!histo.length) return; setFutur(f => [...f, copie(doc)]); setDoc(histo[histo.length - 1]); setHisto(h => h.slice(0, -1)); setModifie(true); };
  const retablir = () => { if (!futur.length) return; setHisto(h => [...h, copie(doc)]); setDoc(futur[futur.length - 1]); setFutur(f => f.slice(0, -1)); setModifie(true); };
  // Alignement d'un élément sur la page (comme Canva)
  const aligner = (ou: "g" | "c" | "d" | "h" | "m" | "b") => { if (!calque) return; const p: any = {};
    if (ou === "g") p.x = 0; if (ou === "c") p.x = r1((L - calque.w) / 2); if (ou === "d") p.x = r1(L - calque.w);
    if (ou === "h") p.y = 0; if (ou === "m") p.y = r1((H - calque.h) / 2); if (ou === "b") p.y = r1(H - calque.h);
    majCalque(calque.id, p); };

  const pointMm = (e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current!; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse()); return { x: p.x, y: p.y };
  };
  const debut = (e: React.PointerEvent, k: Calque, mode: "deplacer" | "taille") => {
    e.stopPropagation();
    if (remplissage && !k.zone) return; // élément figé du patron
    setSel(k.id);
    if (k.verrou || remplissage) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    memoriser();
    const p = pointMm(e);
    glisse.current = { mode, id: k.id, px: p.x, py: p.y, x: k.x, y: k.y, w: k.w, h: k.h };
  };
  const bouge = (e: React.PointerEvent) => {
    const g = glisse.current; if (!g) return;
    const p = pointMm(e); const dx = p.x - g.px, dy = p.y - g.py;
    if (g.mode === "deplacer") {
      let x = g.x + dx, y = g.y + dy; const gd: { v?: number; h?: number } = {};
      if (Math.abs(x + g.w / 2 - L / 2) < 1.5) { x = (L - g.w) / 2; gd.v = L / 2; }
      if (Math.abs(y + g.h / 2 - H / 2) < 1.5) { y = (H - g.h) / 2; gd.h = H / 2; }
      setGuides(gd); majCalque(g.id, { x: r1(x), y: r1(y) }, false);
    }
    else majCalque(g.id, { w: r1(Math.max(2, g.w + dx)), h: r1(Math.max(2, g.h + dy)) }, false);
  };
  const fin = () => { glisse.current = null; setGuides({}); };

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? retablir() : annuler(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); retablir(); return; }
      if (!sel) return;
      const pas = e.shiftKey ? 5 : 0.5;
      const k = doc.calques.find(x => x.id === sel); if (!k) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); changerDoc(d => { d.calques = d.calques.filter(x => x.id !== sel); }); setSel(null); }
      else if (e.key.startsWith("Arrow")) { e.preventDefault(); majCalque(sel, { x: r1(k.x + (e.key === "ArrowLeft" ? -pas : e.key === "ArrowRight" ? pas : 0)), y: r1(k.y + (e.key === "ArrowUp" ? -pas : e.key === "ArrowDown" ? pas : 0)) }); }
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  });

  const ajouter = (type: Calque["type"], extra: any = {}) => {
    const k: Calque = { id: nouvelId(), type, x: r1(L * 0.2), y: r1(H * 0.35), w: r1(L * 0.6), h: r1(H * 0.3), rotation: 0, ...extra };
    if (type === "texte" && !k.texte) k.texte = { contenu: "Votre texte", taille: r1(Math.max(4, Math.min(H * 0.12, L * 0.08))), couleur: "#2d2424", police: "Georgia", gras: true, italique: false, align: "center" };
    if (type === "forme" && !k.forme) k.forme = { forme: "rect", remplissage: "#f5d6dc", contour: "", epaisseur: 0, rayon: 2 };
    changerDoc(d => { d.calques.push(k); }); setSel(k.id);
  };
  const ordre = (dir: number) => changerDoc(d => { const i = d.calques.findIndex(x => x.id === sel); const j = i + dir; if (i < 0 || j < 0 || j >= d.calques.length) return; const [k] = d.calques.splice(i, 1); d.calques.splice(j, 0, k); });

  const imageChoisie = (url: string, larg?: number, haut?: number) => {
    if (choixImage === "remplacer" && calque) majCalque(calque.id, { image: { url, ajustement: calque.image?.ajustement || "cover" } });
    else {
      let w = L * 0.6, h = H * 0.6;
      if (larg && haut) { const r = larg / haut; if (w / h > r) w = h * r; else h = w / r; }
      ajouter("image", { image: { url, ajustement: "contain" }, w: r1(w), h: r1(h), x: r1((L - w) / 2), y: r1((H - h) / 2) });
    }
    setChoixImage(null);
  };
  const imageAppareil = async (f?: File) => {
    if (!f) return;
    setMessage("Envoi de l'image…");
    try {
      const c = await compresserImage(f);
      const chemin = `atelier/${Date.now().toString(36)}-${slug(f.name.replace(/\.[^.]+$/, ""))}.${c.ext}`;
      const url = await uploadStorage(chemin, c.blob, c.type);
      await sbInsert("events_medias", { url, chemin_storage: chemin, nom_fichier: f.name, dossier: "Atelier", type_mime: c.type, taille_octets: f.size, taille_stockee: c.blob.size, largeur: c.largeur || null, hauteur: c.hauteur || null }, "return=minimal").catch(() => {});
      imageChoisie(url, c.largeur, c.hauteur); setMessage("");
    } catch (e: any) { setMessage("⚠️ " + (e.message || e)); }
  };

  const enregistrer = async () => {
    if (creation.est_modele && !confirm("C'est un patron d'origine. Enregistrer les modifications DANS LE PATRON lui-même ?\n(Pour un client, utilise plutôt « Dupliquer pour un client ».)")) return;
    try {
      await sbUpdate("events_papeterie", creation.id, { contenu: doc, nom: meta.nom, client_nom: meta.client_nom || null, statut: meta.statut, ...(creation.est_modele ? { collection: meta.collection.trim() || "Mes patrons" } : {}), updated_at: new Date().toISOString() });
      setModifie(false); setMessage("✅ Enregistré"); setTimeout(() => setMessage(""), 2000);
    } catch (e: any) { setMessage("⚠️ " + e.message); }
  };
  useEffect(() => {
    if (!modifie || creation.est_modele || glisse.current) return;
    const t = setTimeout(async () => {
      setSauvegarde("en_cours");
      try { await sbUpdate("events_papeterie", creation.id, { contenu: doc, nom: meta.nom, client_nom: meta.client_nom || null, statut: meta.statut, updated_at: new Date().toISOString() }); setModifie(false); setSauvegarde("ok"); }
      catch { setSauvegarde(""); }
    }, 2500);
    return () => clearTimeout(t);
  }, [doc, meta, modifie]);
  const fermer = () => { if (modifie && !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) return; onFermer(); };

  const exporter = async (format: "png" | "pdf" | "a4", action: "partager" | "telecharger") => {
    setMessage("⏳ Préparation du fichier…");
    try {
      const base = slug(meta.nom);
      let blob: Blob; let nom: string;
      if (format === "a4") {
        const imp = await rendreImpositionA4(doc, L, H, { traits: avecTraits });
        if (!imp) throw new Error("Ce format est plus grand qu'une feuille A4 : utilise « PDF taille réelle ».");
        blob = await canvasVersPdf([imp]); nom = `${base}-A4-x${imp.exemplaires}.pdf`;
      } else {
        const cv = (await rendreSurCanvas(doc, L, H, pxParMmExport(L, H), undefined, 0, 0, { traits: avecTraits && format !== "png" }))!;
        if (format === "png") { blob = await new Promise<Blob>((ok, ko) => cv.toBlob(b => b ? ok(b) : ko(new Error("PNG impossible")), "image/png")); nom = `${base}.png`; }
        else { blob = await canvasVersPdf([{ canvas: cv, largeurMm: L, hauteurMm: H }]); nom = `${base}.pdf`; }
      }
      if (action === "partager") { const r = await partagerFichier(blob, nom, meta.nom); setMessage(r === "partage" ? "✅ Partagé" : r === "telecharge" ? "✅ Téléchargé (partage direct non disponible sur cet appareil)" : ""); }
      else { telecharger(blob, nom); setMessage("✅ Téléchargé"); }
    } catch (e: any) {
      setMessage("⚠️ " + (/tainted|insecure|SecurityError/i.test(String(e?.message || e)) ? "Une image vient d'un site externe et bloque l'export : importe-la dans la médiathèque." : e.message || e));
    }
  };

  const zs = doc.reperes?.zone_sure_mm ?? 3;
  const poignee = Math.max(L, H) / 30;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: SA }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button style={bouton()} onClick={fermer}>← Retour</button>
        <div style={{ flex: 1, minWidth: 140 }}>
          <input style={{ ...champ, fontWeight: 800, fontSize: 13 }} value={meta.nom} onChange={e => { setMeta({ ...meta, nom: e.target.value }); setModifie(true); }} />
          {creation.est_modele && <input style={{ ...champ, marginTop: 4, fontSize: 12 }} placeholder="Pack de patrons (collection)" value={meta.collection} onChange={e => { setMeta({ ...meta, collection: e.target.value }); setModifie(true); }} />}
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{L} × {H} mm{creation.est_modele ? " · PATRON" : ""}{sauvegarde === "en_cours" ? " · enregistrement…" : modifie ? (creation.est_modele ? " · non enregistré" : " · modifications en attente") : sauvegarde === "ok" ? " · ✓ enregistré automatiquement" : ""}</div>
        </div>
        <button style={bouton()} onClick={annuler} disabled={!histo.length} title="Annuler">↶</button>
        <button style={bouton()} onClick={retablir} disabled={!futur.length} title="Rétablir">↷</button>
        <button style={bouton(remplissage)} title="Mode remplissage : seules les zones (textes et images nommés) se modifient" onClick={() => { changerDoc(d => { d.remplissage = !d.remplissage; }); setSel(null); }}>{remplissage ? "🔒 Remplissage" : "🔓 Édition libre"}</button>
        <button style={bouton(true)} onClick={enregistrer}>💾 Enregistrer</button>
        {creation.est_modele && <button style={bouton(true)} onClick={async () => { const client = prompt("Nom du client :"); if (!client) return; await onDupliquer({ ...creation, contenu: doc }, { client }); }}>👤 Utiliser pour un client</button>}
        <button style={bouton()} title="Enregistrer une copie comme nouveau patron réutilisable" onClick={async () => {
          const nom = prompt("Nom du nouveau patron :", nomCourt(meta.nom).replace(/ — .*$/, "") + (creation.est_modele ? " (variante)" : "")); if (!nom) return;
          const collection = prompt("Pack de patrons (collection) :", creation.collection || "Mes patrons"); if (collection === null) return;
          try { await sbInsert("events_papeterie", { nom: nom.trim(), type_support: creation.type_support, largeur_mm: L, hauteur_mm: H, contenu: doc, est_modele: true, modele_source_id: creation.est_modele ? creation.id : creation.modele_source_id, collection: collection.trim() || "Mes patrons", occasion: creation.occasion, theme: creation.theme, client_nom: null, statut: "brouillon" }, "return=minimal"); setMessage("✅ Nouveau patron enregistré dans « " + (collection.trim() || "Mes patrons") + " »"); }
          catch (e: any) { setMessage("⚠️ " + e.message); }
        }}>📐 Enregistrer comme patron</button>
      </div>
      {message && <div style={{ fontSize: 12, color: message.startsWith("⚠️") ? C.rouge : C.ok }}>{message}</div>}

      {remplissage && <ZonesARemplir doc={doc} majCalque={majCalque} choisirImage={(id) => { setSel(id); setChoixImage("remplacer"); }} />}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ ...bouton(), display: "flex", alignItems: "center", gap: 6 }}>🔍 <input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: 90 }} /> {Math.round(zoom * 100)} %</label>
        {!remplissage && <>
        <button style={bouton()} onClick={() => ajouter("texte")}>T Texte</button>
        <button style={bouton()} onClick={() => setChoixImage("ajout")}>🖼️ Médiathèque</button>
        <button style={bouton()} onClick={() => refFichier.current?.click()}>📷 Depuis l'appareil</button>
        <input ref={refFichier} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { imageAppareil(e.target.files?.[0]); e.target.value = ""; }} />
        <button style={bouton()} onClick={() => ajouter("forme")}>▭ Forme</button>
        <button style={bouton()} onClick={() => ajouter("forme", { forme: { forme: "ellipse", remplissage: "#f5d6dc", contour: "", epaisseur: 0 } })}>◯</button>
        <label style={{ ...bouton(), display: "flex", alignItems: "center", gap: 5 }}>Fond <input type="color" value={doc.fond || "#ffffff"} onChange={e => changerDoc(d => { d.fond = e.target.value; })} style={{ width: 24, height: 18, border: "none", background: "none", padding: 0 }} /></label>
        </>}
        <button style={bouton(reperes)} onClick={() => setReperes(!reperes)}>📏 Repères</button>
      </div>

      <div ref={boite} style={{ width: "100%", overflow: "auto", display: "flex", justifyContent: zoom > 1 ? "flex-start" : "center", background: "repeating-conic-gradient(#221f27 0% 25%, #1b1820 0% 50%) 50%/16px 16px", borderRadius: 12, padding: "14px 0", touchAction: "none" }}>
        <svg ref={svgRef} viewBox={`${-4} ${-4} ${L + 8} ${H + 8}`} width={(L + 8) * echelle * 0.94} height={(H + 8) * echelle * 0.94}
          onPointerMove={bouge} onPointerUp={fin} onPointerLeave={fin} onPointerDown={() => setSel(null)} style={{ display: "block", touchAction: "none", userSelect: "none" }}>
          <defs><clipPath id="clip-support"><rect x={0} y={0} width={L} height={H} /></clipPath></defs>
          <rect x={0} y={0} width={L} height={H} fill={doc.fond || "#fff"} />
          <g clipPath="url(#clip-support)">
            {doc.calques.map(k => (
              <g key={k.id} onPointerDown={e => debut(e, k, "deplacer")} onDoubleClick={() => { setSel(k.id); setTimeout(() => (document.getElementById("atelier-texte") as HTMLTextAreaElement)?.focus(), 50); }} style={{ cursor: k.verrou ? "default" : "move" }}>
                <CalqueSvg k={k} editeur />
                <rect x={k.x} y={k.y} width={k.w} height={k.h} fill="transparent" transform={k.rotation ? `rotate(${k.rotation} ${k.x + k.w / 2} ${k.y + k.h / 2})` : undefined} />
              </g>
            ))}
          </g>
          {reperes && <g pointerEvents="none">
            <rect x={0} y={0} width={L} height={H} fill="none" stroke="#000" strokeWidth={0.35} />
            <rect x={zs} y={zs} width={L - 2 * zs} height={H - 2 * zs} fill="none" stroke={C.bleu} strokeWidth={0.3} strokeDasharray="1.2 0.8" />
            {traits.map((t, i) => t.type === "collage"
              ? <polygon key={"t" + i} points={t.points.map(p => p.join(",")).join(" ")} fill="rgba(120,120,120,0.22)" stroke="#888" strokeWidth={0.25} strokeDasharray="1 1" />
              : <polyline key={"t" + i} points={(t.ferme ? [...t.points, t.points[0]] : t.points).map(p => p.join(",")).join(" ")} fill="none" stroke={t.type === "coupe" ? "#000" : C.gold} strokeWidth={t.type === "coupe" ? 0.35 : 0.3} strokeDasharray={t.type === "pli" ? "2 1.5" : undefined} />)}
            {(doc.reperes?.pliage || []).map((p, i) => p.orientation === "h"
              ? <line key={i} x1={0} x2={L} y1={p.position_mm} y2={p.position_mm} stroke={C.gold} strokeWidth={0.35} strokeDasharray="1.5 1" />
              : <line key={i} y1={0} y2={H} x1={p.position_mm} x2={p.position_mm} stroke={C.gold} strokeWidth={0.35} strokeDasharray="1.5 1" />)}
          </g>}
          {guides.v != null && <line x1={guides.v} x2={guides.v} y1={0} y2={H} stroke="#ec4899" strokeWidth={0.3} pointerEvents="none" />}
          {guides.h != null && <line y1={guides.h} y2={guides.h} x1={0} x2={L} stroke="#ec4899" strokeWidth={0.3} pointerEvents="none" />}
          {calque && (
            <g transform={calque.rotation ? `rotate(${calque.rotation} ${calque.x + calque.w / 2} ${calque.y + calque.h / 2})` : undefined}>
              <rect x={calque.x} y={calque.y} width={calque.w} height={calque.h} fill="none" stroke="#7c3aed" strokeWidth={0.4} strokeDasharray="1 0.6" pointerEvents="none" />
              {!calque.verrou && <rect x={calque.x + calque.w - poignee / 2} y={calque.y + calque.h - poignee / 2} width={poignee} height={poignee} fill="#7c3aed" stroke="#fff" strokeWidth={0.3} style={{ cursor: "nwse-resize" }} onPointerDown={e => debut(e, calque, "taille")} />}
            </g>
          )}
        </svg>
      </div>
      {reperes && <div style={{ fontSize: 10, color: C.muted }}>Repères : noir = coupe · bleu pointillé = zone sûre ({zs} mm) · doré pointillé = pliage{traits.length ? " · gris hachuré = collage" : ""}. Les traits de coupe et de pli d'un patron peuvent être inclus dans le PDF (case ci-dessous). Double-clic sur un texte pour le modifier ; flèches du clavier pour ajuster (Maj = 5 mm).</div>}

      {/* Propriétés du calque sélectionné */}
      {calque ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.cream, flex: 1 }}>{calque.type === "texte" ? "Texte" : calque.type === "image" ? "Image" : "Forme"}{calque.zone ? ` · zone ${calque.zone}` : ""}</div>
            {!remplissage && <select style={{ ...champ, width: "auto", fontSize: 11 }} title="Zone à remplir (mode remplissage, Créer mon kit)" value={calque.zone || ""} onChange={e => majCalque(calque.id, { zone: e.target.value || null })}>
              <option value="">Pas une zone</option>{(calque.type === "image" ? ["IMAGE", "FOND", "LOGO"] : ["PRENOM", "AGE", "TITRE", "DATE", "LIEU", "RSVP", "MESSAGE", "TEXTE_LIBRE"]).map(z => <option key={z} value={z}>Zone {z}</option>)}
            </select>}
            {!remplissage && <>
            <button style={bouton()} title="Mettre devant" onClick={() => ordre(1)}>⬆</button>
            <button style={bouton()} title="Mettre derrière" onClick={() => ordre(-1)}>⬇</button>
            <button style={bouton()} title="Dupliquer" onClick={() => { const n = { ...copie(calque), id: nouvelId(), x: r1(calque.x + 3), y: r1(calque.y + 3) }; changerDoc(d => { d.calques.push(n); }); setSel(n.id); }}>⧉</button>
            <button style={bouton(!!calque.verrou)} title="Verrouiller" onClick={() => majCalque(calque.id, { verrou: !calque.verrou })}>{calque.verrou ? "🔒" : "🔓"}</button>
            <button style={bouton()} title="Supprimer" onClick={() => { changerDoc(d => { d.calques = d.calques.filter(x => x.id !== calque.id); }); setSel(null); }}>🗑</button>
            </>}
          </div>
          {!remplissage && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ ...lbl, alignSelf: "center" }}>Aligner sur la page</span>
            {([["g", "⇤ Gauche"], ["c", "↔ Centre"], ["d", "Droite ⇥"], ["h", "⤒ Haut"], ["m", "↕ Milieu"], ["b", "Bas ⤓"]] as const).map(([k, l]) => <button key={k} style={{ ...bouton(), padding: "4px 8px", fontSize: 11 }} onClick={() => aligner(k)}>{l}</button>)}
          </div>}

          {calque.type === "texte" && calque.texte && (<>
            <textarea id="atelier-texte" style={{ ...champ, minHeight: 54, fontFamily: calque.texte.police }} value={calque.texte.contenu} onFocus={memoriser} onChange={e => majCalque(calque.id, { texte: { contenu: e.target.value } }, false)} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 6 }}>
              <select style={champ} value={calque.texte.police} onChange={e => majCalque(calque.id, { texte: { police: e.target.value } })}>{POLICES.map(p => <option key={p} value={p} style={{ fontFamily: p }}>{p}</option>)}</select>
              <input style={champ} type="number" step={0.5} title="Taille (mm)" value={calque.texte.taille} onFocus={memoriser} onChange={e => majCalque(calque.id, { texte: { taille: Number(e.target.value) || 1 } }, false)} />
              <input type="color" value={calque.texte.couleur} onChange={e => majCalque(calque.id, { texte: { couleur: e.target.value } })} style={{ width: "100%", height: 30, border: "none", background: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button style={bouton(!!calque.texte.gras)} onClick={() => majCalque(calque.id, { texte: { gras: !calque.texte!.gras } })}><b>G</b></button>
              <button style={bouton(!!calque.texte.italique)} onClick={() => majCalque(calque.id, { texte: { italique: !calque.texte!.italique } })}><i>I</i></button>
              {(["left", "center", "right"] as const).map(a => <button key={a} style={bouton(calque.texte!.align === a)} onClick={() => majCalque(calque.id, { texte: { align: a } })}>{a === "left" ? "⇤" : a === "center" ? "↔" : "⇥"}</button>)}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}>Contour <input type="color" value={calque.texte.contour || "#ffffff"} onChange={e => majCalque(calque.id, { texte: { contour: e.target.value, contourEpaisseur: calque.texte!.contourEpaisseur || Math.max(0.4, Math.round(calque.texte!.taille * 0.08 * 10) / 10) } })} /></label>
              <input style={{ ...champ, width: 70 }} type="number" step={0.1} min={0} title="Épaisseur du contour (mm)" value={calque.texte.contourEpaisseur ?? 0} onChange={e => majCalque(calque.id, { texte: { contourEpaisseur: Number(e.target.value), contour: calque.texte!.contour || "#ffffff" } })} />
              <label style={{ fontSize: 11, color: C.cream, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={calque.texte.ajuster !== false} onChange={e => majCalque(calque.id, { texte: { ajuster: e.target.checked } })} /> Ajuster à la zone</label>
            </div>
            {(() => { const m = mesurerTexte(calque.texte!, calque.w, calque.h); return m.deborde ? <div style={{ fontSize: 11, color: C.rouge }}>⚠️ Le texte dépasse de sa zone (taille fixe) : agrandis la zone, réduis la taille ou coche « Ajuster à la zone ».</div>
              : m.illisible ? <div style={{ fontSize: 11, color: C.rouge }}>⚠️ Texte trop long pour cette zone : il serait réduit à {m.taille.toFixed(1)} mm (illisible, minimum {TAILLE_MIN_LISIBLE} mm). Raccourcis-le ou agrandis la zone.</div>
              : m.reduit ? <div style={{ fontSize: 11, color: C.gold }}>Texte réduit automatiquement à {m.taille.toFixed(1)} mm{m.lignes.length > (calque.texte!.contenu || "").split("\n").length ? " et passé à la ligne" : ""} pour tenir dans sa zone.</div> : null; })()}
          </>)}

          {calque.type === "image" && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <button style={bouton(true)} onClick={() => setChoixImage("remplacer")}>{calque.image?.url ? "Changer l'image" : "Choisir l'image"}</button>
              <button style={bouton((calque.image?.ajustement || "cover") === "cover")} onClick={() => majCalque(calque.id, { image: { ajustement: "cover" } })}>Remplir</button>
              <button style={bouton(calque.image?.ajustement === "contain")} onClick={() => majCalque(calque.id, { image: { ajustement: "contain" } })}>Ajuster</button>
              <select style={{ ...champ, width: "auto" }} value={calque.image?.masque || "rect"} onChange={e => majCalque(calque.id, { image: { masque: e.target.value } })}>
                <option value="rect">Masque : aucun</option><option value="ellipse">Masque : rond</option><option value="triangle">Masque : triangle</option><option value="triangle_bas">Masque : fanion</option>
              </select>
            </div>
          )}

          {calque.type === "forme" && calque.forme && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 6 }}>
              <select style={champ} value={calque.forme.forme} onChange={e => majCalque(calque.id, { forme: { forme: e.target.value } })}>
                <option value="rect">Rectangle</option><option value="ellipse">Rond / ovale</option><option value="triangle">Triangle</option><option value="triangle_bas">Fanion</option><option value="ligne">Ligne</option>
              </select>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}>Fond <input type="color" value={calque.forme.remplissage || "#ffffff"} onChange={e => majCalque(calque.id, { forme: { remplissage: e.target.value } })} /></label>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}>Contour <input type="color" value={calque.forme.contour || "#000000"} onChange={e => majCalque(calque.id, { forme: { contour: e.target.value, epaisseur: calque.forme!.epaisseur || 0.5 } })} /></label>
              <input style={champ} type="number" step={0.1} title="Épaisseur contour (mm)" placeholder="Épaisseur" value={calque.forme.epaisseur ?? 0} onChange={e => majCalque(calque.id, { forme: { epaisseur: Number(e.target.value) } })} />
              {calque.forme.forme === "rect" && <input style={champ} type="number" step={0.5} title="Arrondi (mm)" placeholder="Arrondi" value={calque.forme.rayon ?? 0} onChange={e => majCalque(calque.id, { forme: { rayon: Number(e.target.value) } })} />}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
            {([["x", "X"], ["y", "Y"], ["w", "Larg."], ["h", "Haut."], ["rotation", "Rot.°"], ["opacite", "Opac."]] as const).map(([cle, l]) => (
              <div key={cle}><div style={lbl}>{l}</div><input style={{ ...champ, padding: "5px 4px" }} type="number" step={cle === "opacite" ? 0.1 : 0.5} value={(calque as any)[cle] ?? (cle === "opacite" ? 1 : 0)} onFocus={memoriser} onChange={e => majCalque(calque.id, { [cle]: Number(e.target.value) }, false)} /></div>
            ))}
          </div>
        </div>
      ) : <div style={{ fontSize: 11, color: C.muted }}>Touche un élément pour le modifier.</div>}

      {/* Réglages & export */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input style={champ} placeholder="Client" value={meta.client_nom} onChange={e => { setMeta({ ...meta, client_nom: e.target.value }); setModifie(true); }} />
          <select style={champ} value={meta.statut} onChange={e => { setMeta({ ...meta, statut: e.target.value }); setModifie(true); }}>
            <option value="brouillon">Brouillon</option><option value="pret">Prêt à imprimer</option><option value="imprime">Imprimé</option><option value="archive">Archivé</option>
          </select>
        </div>
        <div style={lbl}>Imprimer · télécharger · partager</div>
        {traits.length > 0 && <label style={{ fontSize: 12, color: C.cream, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={avecTraits} onChange={e => setAvecTraits(e.target.checked)} /> Inclure les traits de coupe, de pli et la zone de collage dans le PDF (pour découper à la main)</label>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6, alignItems: "center", fontSize: 12, color: C.cream }}>
          {([["pdf", "PDF taille réelle"], ["a4", "PDF sur A4 (plusieurs exemplaires + traits de coupe)"], ["png", "Image PNG 300 dpi"]] as const).map(([f, l]) => (
            <React.Fragment key={f}>
              <span>{l}</span>
              <button style={bouton()} onClick={() => exporter(f, "telecharger")}>⬇️</button>
              <button style={bouton(true)} onClick={() => exporter(f, "partager")}>📤</button>
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>⬇️ = je télécharge et j'envoie moi-même · 📤 = partage direct (WhatsApp, Mail, AirDrop… depuis le téléphone). Pour imprimer : ouvre le PDF puis Imprimer, échelle 100 %.</div>
      </div>

      {choixImage && <Feuille titre="Choisir une image" onFermer={() => setChoixImage(null)}><EventsMediatheque mode="choisir" onChoisir={m => imageChoisie(m.url, m.largeur, m.hauteur)} /></Feuille>}
    </div>
  );
}
