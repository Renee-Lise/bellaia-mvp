"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Stories — BIBLIOTHÈQUE CLIENTE (prévisualisation)
// Adultes vérifiées uniquement : le serveur ne renvoie RIEN sinon
// (ni catalogue, ni extrait, ni chapitre, ni fichier).
// Trois niveaux : découverte gratuite (couverture, synopsis, personnages,
// extraits, avertissements), achat individuel par format, abonnement.
// • Lecteur : clair / sombre / sépia, taille du texte, sommaire,
//   marque-pages, surlignages et notes privées, progression, reprise.
// • Audio : lecture, chapitres, ±15/30 s, vitesse, minuterie de sommeil,
//   reprise, écoute en arrière-plan (Media Session) si l'iPhone le permet.
// • Habitudes de lecture privées : enregistrées pour la cliente seule.
// • Aucun paiement : un achat crée une DEMANDE, confirmée par la fondatrice.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MARQUES } from "../../design/marques";
import { Surface, Titre, Puce, Bouton } from "../../design/composants";
import { lecture, urlSigneeSS, lireProgressionSS, ecrireProgressionSS } from "./secretStoriesLib";

const m = MARQUES.BSH; const ROSE = m.secondaire;
const euros = (c?: number | null) => c == null ? null : (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const duree = (s?: number | null) => !s ? "" : s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round(s % 3600 / 60)).padStart(2, "0")}` : `${Math.round(s / 60)} min`;
const TYPES: Record<string, string> = { roman: "Roman", nouvelle: "Nouvelle", tome_saga: "Saga", recueil: "Recueil" };
const OFFRES: Record<string, string> = { ebook: "Livre numérique", audio: "Livre audio", pack: "Pack numérique + audio", nouvelle: "Nouvelle", saga: "Saga complète", coffret: "Coffret numérique" };

type Sources = { adulte?: boolean; catalogue?: any[]; extraits?: Record<string, any>; chapitres?: Record<string, any>; audio?: Record<string, string> };

/** Couverture : fichier validé (URL signée) sinon composition typographique, signalée comme provisoire. */
function Couverture({ o, large = 120, src }: { o: any; large?: number; src?: string | null }) {
  const h = large * 1.5;
  if (src) return <img src={src} alt={o.titre} style={{ width: large, height: h, objectFit: "cover", borderRadius: 6, boxShadow: "0 10px 26px rgba(0,0,0,0.55)", flex: "none" }} />;
  return <div style={{ width: large, height: h, borderRadius: 6, flex: "none", position: "relative", overflow: "hidden", boxShadow: "0 10px 26px rgba(0,0,0,0.55)", background: `radial-gradient(90% 60% at 70% 20%, ${ROSE}55, transparent 60%), linear-gradient(170deg, ${m.principale}, #050304 85%)`, border: `1px solid ${m.accent}55` }}>
    <div style={{ position: "absolute", inset: 8, border: `1px solid ${m.accent}66`, borderRadius: 3 }} />
    <div style={{ position: "absolute", left: 12, right: 12, top: h * 0.28, textAlign: "center", fontFamily: m.serif, color: "#f6e7d2", fontSize: large / 7.5, lineHeight: 1.1, fontWeight: 600 }}>{o.titre}</div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontSize: Math.max(7, large / 16), letterSpacing: 2, color: m.accent }}>SECRET STORIES</div>
    <div style={{ position: "absolute", top: 6, right: 6, fontSize: 7.5, padding: "2px 5px", borderRadius: 4, background: "rgba(0,0,0,0.55)", color: m.doux }}>visuel provisoire</div>
  </div>;
}

export default function BibliothequeSecretStories({ sources }: { sources?: Sources }) {
  const [cat, setCat] = useState<any[] | null>(sources?.catalogue || null);
  const [vue, setVue] = useState<{ e: "accueil" } | { e: "fiche"; id: string } | { e: "lire"; id: string; extrait?: any } | { e: "ecouter"; id: string; extrait?: boolean }>({ e: "accueil" });
  const [onglet, setOnglet] = useState<"decouvrir" | "mes_livres">("decouvrir");
  const [demande, setDemande] = useState("");
  const [adulte, setAdulte] = useState<boolean | null>(sources ? sources.adulte !== false : null);
  useEffect(() => { if (!sources) Promise.all([lecture.estAdulte(), lecture.catalogue()]).then(([a, c]) => { setAdulte(a); setCat(c); }); }, []);
  const page = (c: React.ReactNode) => <div style={{ background: m.fond, minHeight: "100vh", color: m.texte, fontFamily: m.sans, paddingBottom: 50 }}>{c}</div>;
  if (!cat) return page(<div style={{ padding: 30, color: m.doux }}>Ouverture de la bibliothèque…</div>);
  if (adulte && !cat.length) return page(<div style={{ padding: "60px 26px", textAlign: "center" }}>
    <div style={{ fontSize: 11, letterSpacing: 3, color: m.accent, fontWeight: 700 }}>BSH SECRET STORIES</div>
    <div style={{ fontFamily: m.serif, fontSize: 28, margin: "10px 0" }}>Les premières histoires arrivent</div>
    <div style={{ color: m.doux, fontSize: 14, lineHeight: 1.5 }}>La bibliothèque ouvrira avec ses premières parutions.</div></div>);
  if (!adulte) return page(<div style={{ padding: "60px 26px", textAlign: "center" }}>
    <div style={{ fontSize: 11, letterSpacing: 3, color: m.accent, fontWeight: 700 }}>BSH SECRET STORIES</div>
    <div style={{ fontFamily: m.serif, fontSize: 28, margin: "10px 0" }}>Bibliothèque réservée aux adultes</div>
    <div style={{ color: m.doux, fontSize: 14, lineHeight: 1.5 }}>L'accès est ouvert aux membres majeures dont l'âge a été vérifié. Aucun contenu n'est accessible sans cette vérification.</div>
  </div>);

  const o = "id" in vue ? cat.find(x => x.id === vue.id) : null;
  if (vue.e === "lire" && o) return <Lecteur o={o} extrait={vue.extrait} source={sources?.chapitres?.[o.id]} onFermer={() => setVue({ e: "fiche", id: o.id })} />;
  if (vue.e === "ecouter" && o) return <LecteurAudio o={o} extrait={vue.extrait} src={sources?.audio?.[o.id]} onFermer={() => setVue({ e: "fiche", id: o.id })} />;

  if (vue.e === "fiche" && o) { const possede = (f: string) => (o.mes_formats || []).includes(f); const exT = (o.extraits || []).find((e: any) => e.type === "texte"); const exA = (o.extraits || []).find((e: any) => e.type === "audio"); return page(<>
    <div style={{ background: `radial-gradient(120% 70% at 50% 0%, ${ROSE}33, transparent 60%), ${m.degrade}`, padding: "16px 16px 26px", textAlign: "center" }}>
      <button onClick={() => setVue({ e: "accueil" })} style={{ display: "block", background: "none", border: "none", color: m.accent, fontSize: 14, padding: 0, marginBottom: 12, fontFamily: m.sans }}>‹ Bibliothèque</button>
      <div style={{ display: "flex", justifyContent: "center" }}><Couverture o={o} large={150} /></div>
      <div style={{ fontFamily: m.serif, fontSize: 30, fontWeight: 600, marginTop: 16, lineHeight: 1.05 }}>{o.titre}</div>
      {o.collection && <div style={{ fontSize: 12.5, color: m.accent, marginTop: 6, letterSpacing: 0.5 }}>{o.collection.titre}{o.numero ? ` · tome ${o.numero}` : ""}</div>}
      <div style={{ fontSize: 12.5, color: m.doux, marginTop: 6 }}>{TYPES[o.type]} · {o.nb_chapitres} chapitres{o.nb_mots ? ` · ${Math.round(o.nb_mots / 250)} pages` : ""}{o.duree_audio_s ? ` · 🎧 ${duree(o.duree_audio_s)}` : ""}</div>
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {possede("ebook") ? <Bouton m={m} style={{ flex: 1 }} onClick={() => setVue({ e: "lire", id: o.id })}>📖 Lire</Bouton> : exT && <Bouton m={m} variante="contour" style={{ flex: 1 }} onClick={async () => setVue({ e: "lire", id: o.id, extrait: sources?.extraits?.[exT.id] || await lecture.extrait(exT.id) })}>📖 Lire l'extrait</Bouton>}
        {possede("audio") ? <Bouton m={m} style={{ flex: 1 }} onClick={() => setVue({ e: "ecouter", id: o.id })}>🎧 Écouter</Bouton> : exA && <Bouton m={m} variante="contour" style={{ flex: 1 }} onClick={() => setVue({ e: "ecouter", id: o.id, extrait: true })}>🎧 Extrait audio</Bouton>}
      </div>
      {!!o.avertissements?.length && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{o.avertissements.map((a: string) => <Puce key={a} m={m} ton="alerte">{a}</Puce>)}</div>}
      <Surface m={m}><Titre m={m} sur="Synopsis" niveau={3}>L'histoire</Titre><div style={{ fontFamily: m.serif, fontSize: 16.5, lineHeight: 1.55, color: "#eadfd6" }}>{o.synopsis}</div></Surface>
      {!!o.personnages?.length && <Surface m={m}><Titre m={m} sur="Personnages" niveau={3}>Ils se rencontrent</Titre>{o.personnages.map((p: any) => <div key={p.nom} style={{ padding: "10px 0", borderTop: `1px solid ${m.ligne}` }}><div style={{ fontFamily: m.serif, fontSize: 18, color: m.accent }}>{p.nom}</div><div style={{ fontSize: 13.5, color: m.doux, marginTop: 2, lineHeight: 1.45 }}>{p.presentation}</div></div>)}</Surface>}
      {o.collection?.description && <Surface m={m}><Titre m={m} sur={o.collection.type === "saga" ? "La saga" : "La collection"} niveau={3}>{o.collection.titre}</Titre><div style={{ fontSize: 13.5, color: m.doux, lineHeight: 1.5 }}>{o.collection.description}</div></Surface>}
      <Surface m={m}>
        <Titre m={m} sur="Acquérir" niveau={3}>Formats disponibles</Titre>
        {(o.offres || []).length ? o.offres.map((f: any) => { const deja = f.formats.every((x: string) => possede(x)); return (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: `1px solid ${m.ligne}` }}>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 650, fontSize: 14.5 }}>{f.libelle || OFFRES[f.type]}</div><div style={{ fontSize: 12, color: m.doux }}>{f.formats.map((x: string) => x === "ebook" ? "Lecture" : "Écoute").join(" + ")} · accès conservé après achat</div></div>
            {deja ? <Puce m={m} ton="ok">Dans ma bibliothèque</Puce> : <Bouton m={m} variante="contour" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setDemande(f.id)}>{euros(f.prix_promo_centimes ?? f.prix_centimes) || "Tarif à venir"}</Bouton>}
          </div>); }) : <div style={{ color: m.doux, fontSize: 13.5 }}>Les formats seront proposés à la parution.</div>}
        {demande && <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: m.surface2, fontSize: 13, lineHeight: 1.45 }}>Paiement en ligne pas encore ouvert. Votre demande sera transmise et confirmée par Bella'Secret Home ; aucun montant n'est prélevé ici.</div>}
      </Surface>
    </div>
  </>); }

  // ── Accueil ──
  const miens = cat.filter(x => (x.mes_formats || []).length);
  const collections = Array.from(new Map(cat.filter(x => x.collection).map(x => [x.collection.id, x.collection])).values());
  return page(<>
    <div style={{ background: `radial-gradient(110% 80% at 100% 0%, ${ROSE}33, transparent 55%), ${m.degrade}`, padding: "22px 16px 22px" }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: m.accent, fontWeight: 700 }}>BELLA'SECRET HOME</div>
      <div style={{ fontFamily: m.serif, fontSize: 34, fontWeight: 600, lineHeight: 1.02, marginTop: 4 }}>Secret Stories</div>
      <div style={{ fontSize: 13.5, color: m.doux, marginTop: 8, lineHeight: 1.4 }}>Romances originales, sensuelles et élégantes. À lire, à écouter.</div>
      <div style={{ display: "flex", gap: 6, marginTop: 16 }}>{([["decouvrir", "Découvrir"], ["mes_livres", `Ma bibliothèque${miens.length ? ` · ${miens.length}` : ""}`]] as const).map(([k, l]) =>
        <button key={k} onClick={() => setOnglet(k)} style={{ minHeight: 36, padding: "7px 14px", borderRadius: 999, border: `1px solid ${onglet === k ? m.accent : m.ligne}`, background: onglet === k ? m.accent : "rgba(0,0,0,0.25)", color: onglet === k ? m.accentTexte : m.texte, fontWeight: 700, fontSize: 13, fontFamily: m.sans }}>{l}</button>)}</div>
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
      {onglet === "decouvrir" ? <>
        <div><Titre m={m} sur="Nouveautés" niveau={3}>À découvrir</Titre>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>{cat.map(x => <div key={x.id} onClick={() => setVue({ e: "fiche", id: x.id })} style={{ width: 124, flex: "none", cursor: "pointer" }}>
            <Couverture o={x} large={124} /><div style={{ fontFamily: m.serif, fontSize: 15.5, marginTop: 8, lineHeight: 1.15 }}>{x.titre}</div>
            <div style={{ fontSize: 11.5, color: m.doux, marginTop: 2 }}>{TYPES[x.type]}{x.duree_audio_s ? " · 🎧" : ""}{x.acces_anticipe ? " · avant-première" : ""}</div></div>)}</div></div>
        {collections.map((c: any) => <Surface key={c.id} m={m} style={{ background: `linear-gradient(135deg, ${m.surface2}, ${m.surface})` }}>
          <Titre m={m} sur={c.type === "saga" ? "Saga" : "Collection"} niveau={3}>{c.titre}</Titre>
          <div style={{ fontSize: 13, color: m.doux, lineHeight: 1.45 }}>{c.description}</div>
          {c.exclusive && <div style={{ marginTop: 8 }}><Puce m={m} ton="accent">Réservée aux abonnées</Puce></div>}
        </Surface>)}
        <Surface m={m} style={{ border: `1px solid ${m.accent}55` }}>
          <Titre m={m} sur="Abonnement" niveau={3}>Secret Stories illimité</Titre>
          <div style={{ fontSize: 13.5, color: m.doux, lineHeight: 1.5 }}>Formules mensuelle et annuelle en préparation. Les ouvrages achetés restent toujours à vous, même sans abonnement.</div>
        </Surface>
      </> : miens.length ? miens.map(x => <div key={x.id} onClick={() => setVue({ e: "fiche", id: x.id })} style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
          <Couverture o={x} large={64} />
          <div style={{ flex: 1 }}><div style={{ fontFamily: m.serif, fontSize: 18 }}>{x.titre}</div><div style={{ display: "flex", gap: 6, marginTop: 6 }}>{x.mes_formats.map((f: string) => <Puce key={f} m={m} ton="ok">{f === "ebook" ? "📖 Lecture" : "🎧 Écoute"}</Puce>)}</div></div>
        </div>) : <div style={{ color: m.doux, fontSize: 14 }}>Vos livres achetés ou inclus dans votre abonnement apparaîtront ici.</div>}
      <div style={{ fontSize: 11.5, color: m.doux, lineHeight: 1.45 }}>Espace réservé aux adultes. Vos lectures, notes et marque-pages sont privés : personne d'autre que vous n'y a accès.</div>
    </div>
  </>);
}

// ═══ Lecteur numérique ═══════════════════════════════════════
const THEMES = { sombre: { fond: "#0b0709", texte: "#eee2d6", doux: "rgba(238,226,214,0.55)", barre: "#150a0f" }, clair: { fond: "#fbf7f2", texte: "#2a1a1f", doux: "rgba(42,26,31,0.55)", barre: "#f1e8df" }, sepia: { fond: "#f3e7cf", texte: "#3d2a17", doux: "rgba(61,42,23,0.55)", barre: "#e9dabb" } };
function Lecteur({ o, extrait, source, onFermer }: { o: any; extrait?: any; source?: any; onFermer: () => void }) {
  const [theme, setTheme] = useState<keyof typeof THEMES>("sombre"); const [taille, setTaille] = useState(19);
  const [ordre, setOrdre] = useState(1); const [chap, setChap] = useState<any>(null); const [panneau, setPanneau] = useState<"" | "sommaire" | "reglages" | "notes">("");
  const [etat, setEtat] = useState<any>({ marque_pages: [], surlignages: [], notes: [] }); const [pct, setPct] = useState(0);
  const zone = useRef<HTMLDivElement>(null); const t = THEMES[theme];
  useEffect(() => { if (extrait) return; lireProgressionSS(o.id, "ebook").then(p => { if (p) { setEtat({ marque_pages: p.marque_pages || [], surlignages: p.surlignages || [], notes: p.notes || [] }); if (p.position?.chapitre) setOrdre(p.position.chapitre); if (p.preferences?.theme) setTheme(p.preferences.theme); if (p.preferences?.taille) setTaille(p.preferences.taille); } }); }, []);
  useEffect(() => { if (extrait) { setChap({ titre: "Extrait offert", texte: extrait.texte, sommaire: [] }); return; }
    (source ? Promise.resolve(source[ordre] ? { ...source[ordre], sommaire: source.sommaire } : null) : lecture.chapitre(o.id, ordre)).then(setChap); zone.current?.scrollTo(0, 0); }, [ordre]);
  const sauver = (n: any = etat) => !extrait && ecrireProgressionSS(o.id, "ebook", { position: { chapitre: ordre, pourcentage: pct }, ...n, preferences: { theme, taille } });
  useEffect(() => { const x = setTimeout(() => sauver(), 800); return () => clearTimeout(x); }, [ordre, theme, taille, pct]);
  const surligner = () => { const s = window.getSelection()?.toString().trim(); if (!s) return; const n = { ...etat, surlignages: [...etat.surlignages, { chapitre: ordre, texte: s.slice(0, 400), le: new Date().toISOString() }] }; setEtat(n); sauver(n); };
  const marquer = () => { const n = { ...etat, marque_pages: [...etat.marque_pages, { chapitre: ordre, pourcentage: pct, le: new Date().toISOString() }] }; setEtat(n); sauver(n); };
  const noter = () => { const txt = prompt("Note privée"); if (!txt) return; const n = { ...etat, notes: [...etat.notes, { chapitre: ordre, texte: txt, le: new Date().toISOString() }] }; setEtat(n); sauver(n); };
  const sommaire: any[] = chap?.sommaire || [];
  const btn: React.CSSProperties = { background: "none", border: "none", color: t.texte, fontSize: 13, fontWeight: 600, fontFamily: m.sans, minHeight: 40, padding: "0 8px" };
  return <div style={{ position: "fixed", inset: 0, background: t.fond, color: t.texte, display: "flex", flexDirection: "column", fontFamily: m.sans }}>
    <div style={{ display: "flex", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + 6px) 8px 6px", background: t.barre, borderBottom: `1px solid ${t.doux}22` }}>
      <button style={btn} onClick={() => { sauver(); onFermer(); }}>‹ Fermer</button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: t.doux, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.titre}</div>
      {!extrait && <button style={btn} onClick={() => setPanneau(panneau === "sommaire" ? "" : "sommaire")}>☰</button>}
      <button style={btn} onClick={() => setPanneau(panneau === "reglages" ? "" : "reglages")}>Aa</button>
    </div>
    {panneau === "reglages" && <div style={{ background: t.barre, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>{(Object.keys(THEMES) as (keyof typeof THEMES)[]).map(k => <button key={k} onClick={() => setTheme(k)} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: `2px solid ${theme === k ? m.accent : "transparent"}`, background: THEMES[k].fond, color: THEMES[k].texte, fontWeight: 700, fontFamily: m.sans }}>{k === "sombre" ? "Sombre" : k === "clair" ? "Clair" : "Sépia"}</button>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><button style={{ ...btn, fontSize: 15 }} onClick={() => setTaille(Math.max(14, taille - 1))}>A−</button><input type="range" min={14} max={30} value={taille} onChange={e => setTaille(Number(e.target.value))} style={{ flex: 1, accentColor: m.accent }} /><button style={{ ...btn, fontSize: 20 }} onClick={() => setTaille(Math.min(30, taille + 1))}>A+</button></div>
    </div>}
    {panneau === "sommaire" && <div style={{ background: t.barre, padding: "6px 16px 12px", maxHeight: "45vh", overflow: "auto" }}>
      {sommaire.map(s => <div key={s.ordre} onClick={() => { setOrdre(s.ordre); setPanneau(""); }} style={{ padding: "11px 0", borderBottom: `1px solid ${t.doux}22`, fontWeight: s.ordre === ordre ? 700 : 400, color: s.ordre === ordre ? m.accent : t.texte }}>{s.ordre}. {s.titre}</div>)}
      {!!etat.marque_pages.length && <div style={{ fontSize: 11, letterSpacing: 1.5, color: m.accent, margin: "12px 0 4px", fontWeight: 700 }}>MARQUE-PAGES</div>}
      {etat.marque_pages.map((b: any, i: number) => <div key={i} onClick={() => { setOrdre(b.chapitre); setPanneau(""); }} style={{ padding: "8px 0", fontSize: 13.5 }}>🔖 Chapitre {b.chapitre} · {b.pourcentage}%</div>)}
    </div>}
    <div ref={zone} lang="fr" onScroll={e => { const el = e.currentTarget; setPct(Math.round(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight) * 100)); }} style={{ flex: 1, overflowY: "auto", padding: "24px 22px 40px", WebkitOverflowScrolling: "touch" as any }}>
      {extrait && <div style={{ fontSize: 11, letterSpacing: 2, color: m.accent, fontWeight: 700, marginBottom: 6 }}>EXTRAIT GRATUIT</div>}
      <div style={{ fontFamily: m.serif, fontSize: taille + 7, fontWeight: 600, marginBottom: 18, lineHeight: 1.15 }}>{chap?.titre || ""}</div>
      {(chap?.texte || (chap === null ? "Ce chapitre n'est pas disponible." : "")).split(/\n{2,}/).map((p: string, i: number) => <p key={i} style={{ fontFamily: m.serif, fontSize: taille, lineHeight: 1.62, margin: "0 0 1em", textAlign: "justify", hyphens: "auto" }}>{p}</p>)}
      {extrait && <div style={{ marginTop: 24, padding: 16, borderRadius: 14, border: `1px solid ${m.accent}55`, textAlign: "center", fontSize: 14, lineHeight: 1.45 }}>La suite vous attend dans le livre complet.</div>}
      {!extrait && sommaire.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
        <button style={btn} disabled={ordre <= 1} onClick={() => setOrdre(ordre - 1)}>‹ Précédent</button><button style={btn} disabled={ordre >= sommaire.length} onClick={() => setOrdre(ordre + 1)}>Suivant ›</button></div>}
    </div>
    {!extrait && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 8px calc(env(safe-area-inset-bottom, 0px) + 6px)", background: t.barre, borderTop: `1px solid ${t.doux}22` }}>
      <button style={btn} onClick={marquer}>🔖</button><button style={btn} onClick={surligner}>🖍 Surligner</button><button style={btn} onClick={noter}>✎ Note</button>
      <div style={{ fontSize: 12, color: t.doux }}>Ch. {ordre}/{sommaire.length || "—"} · {pct}%</div>
    </div>}
  </div>;
}

// ═══ Lecteur audio ═══════════════════════════════════════════
function LecteurAudio({ o, extrait, src: srcDemo, onFermer }: { o: any; extrait?: boolean; src?: string; onFermer: () => void }) {
  const a = useRef<HTMLAudioElement>(null);
  const [pistes, setPistes] = useState<{ titre: string; chemin?: string; url?: string }[]>(srcDemo ? (o.pistes_demo || [{ titre: "Narration", url: srcDemo }]) : []);
  const [n, setN] = useState(0); const [src, setSrc] = useState<string | null>(null); const [charge, setCharge] = useState(!srcDemo);
  const [lecture_, setLecture] = useState(false); const [t, setT] = useState(0); const [d, setD] = useState(0); const reprise = useRef<number>(0);
  const [vitesse, setVitesse] = useState(1); const [minuterie, setMinuterie] = useState<number | null>(null); const [reste, setReste] = useState<number | null>(null);
  useEffect(() => { if (srcDemo) return; (async () => {
    if (extrait) { const e = (o.extraits || []).find((x: any) => x.type === "audio"); const x = e && await lecture.extrait(e.id); if (x?.audio_chemin) setPistes([{ titre: "Extrait", chemin: x.audio_chemin }]); }
    else { const f = (await lecture.fichiers(o.id)).filter((x: any) => x.format === "audio"); const complet = f.find((x: any) => x.type === "audio_complet");
      setPistes(complet && !f.some((x: any) => x.type === "audio_chapitre") ? [{ titre: "Livre complet", chemin: complet.chemin }] : f.filter((x: any) => x.type === "audio_chapitre").map((x: any) => ({ titre: `${x.chapitre}. ${x.titre || "Chapitre"}`, chemin: x.chemin }))); }
    setCharge(false);
  })(); }, []);
  useEffect(() => { if (extrait || !pistes.length) return; lireProgressionSS(o.id, "audio").then(p => { if (p?.position?.piste != null && p.position.piste < pistes.length) setN(p.position.piste); reprise.current = p?.position?.seconde || 0; if (p?.preferences?.vitesse) setVitesse(p.preferences.vitesse); }); }, [pistes.length]);
  useEffect(() => { const p = pistes[n]; if (!p) return; (p.url ? Promise.resolve(p.url) : urlSigneeSS(p.chemin!)).then(setSrc); }, [n, pistes]);  // URL signée de 10 min, renouvelée à chaque piste
  useEffect(() => { if (a.current) a.current.playbackRate = vitesse; }, [vitesse, src]);
  useEffect(() => { const ms = (navigator as any).mediaSession; if (!ms || !src) return;   // écran verrouillé / arrière-plan iOS
    try { ms.metadata = new (window as any).MediaMetadata({ title: o.titre, artist: "BSH Secret Stories", album: pistes[n]?.titre });
      ms.setActionHandler("play", () => a.current?.play()); ms.setActionHandler("pause", () => a.current?.pause());
      ms.setActionHandler("seekbackward", () => sauter(-15)); ms.setActionHandler("seekforward", () => sauter(30));
      ms.setActionHandler("previoustrack", () => setN(x => Math.max(0, x - 1))); ms.setActionHandler("nexttrack", () => setN(x => Math.min(pistes.length - 1, x + 1))); } catch {}
  }, [src]);
  useEffect(() => { if (reste == null) return; if (reste <= 0) { a.current?.pause(); setReste(null); setMinuterie(null); return; } const x = setTimeout(() => setReste(reste - 1), 1000); return () => clearTimeout(x); }, [reste]);
  const memoriser = () => !extrait && ecrireProgressionSS(o.id, "audio", { position: { piste: n, seconde: Math.floor(a.current?.currentTime || 0) }, preferences: { vitesse } });
  useEffect(() => { if (extrait || !lecture_) return; const x = setInterval(memoriser, 10000); return () => clearInterval(x); }, [lecture_, vitesse, n]);
  const sauter = (s: number) => { if (a.current) a.current.currentTime = Math.max(0, Math.min((a.current.duration || 0), a.current.currentTime + s)); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const rond: React.CSSProperties = { width: 52, height: 52, borderRadius: 99, border: `1px solid ${m.ligne}`, background: "transparent", color: m.texte, fontSize: 13, fontWeight: 700, fontFamily: m.sans };
  return <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: `radial-gradient(90% 60% at 50% 25%, ${ROSE}33, transparent 60%), ${m.fond}`, color: m.texte, fontFamily: m.sans, display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px calc(env(safe-area-inset-bottom, 0px) + 18px)" }}>
    <button onClick={() => { memoriser(); a.current?.pause(); onFermer(); }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: m.accent, fontSize: 14, padding: "8px 0", fontFamily: m.sans }}>⌄ Fermer</button>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}><Couverture o={o} large={180} /></div>
    <div style={{ textAlign: "center", marginTop: 18 }}>
      {extrait && <div style={{ fontSize: 11, letterSpacing: 2, color: m.accent, fontWeight: 700 }}>EXTRAIT AUDIO GRATUIT</div>}
      <div style={{ fontFamily: m.serif, fontSize: 26, fontWeight: 600, marginTop: 4 }}>{o.titre}</div>
      <div style={{ fontSize: 12.5, color: m.doux, marginTop: 4 }}>{pistes[n]?.titre || ""}</div>
    </div>
    {src && <audio ref={a} src={src} preload="metadata" playsInline onPlay={() => setLecture(true)} onPause={() => { setLecture(false); memoriser(); }} onEnded={() => n < pistes.length - 1 && setN(n + 1)}
      onTimeUpdate={e => setT(e.currentTarget.currentTime)} onLoadedMetadata={e => { setD(e.currentTarget.duration); if (reprise.current) { e.currentTarget.currentTime = reprise.current; reprise.current = 0; } }} />}
    <div style={{ marginTop: 20 }}>
      <input type="range" min={0} max={d || 1} step={1} value={t} onChange={e => { if (a.current) a.current.currentTime = Number(e.target.value); }} style={{ width: "100%", accentColor: m.accent }} aria-label="Position" />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: m.doux }}><span>{fmt(t)}</span><span>−{fmt(Math.max(0, d - t))}</span></div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 12 }}>
      <button style={{ ...rond, width: 40, height: 40, border: "none", fontSize: 16 }} aria-label="Chapitre précédent" disabled={n === 0} onClick={() => setN(n - 1)}>⏮</button>
      <button style={rond} aria-label="Reculer de 15 secondes" onClick={() => sauter(-15)}>−15</button>
      <button aria-label={lecture_ ? "Pause" : "Lecture"} disabled={!src} onClick={() => lecture_ ? a.current?.pause() : a.current?.play()} style={{ width: 76, height: 76, borderRadius: 99, border: "none", background: `linear-gradient(135deg, ${m.accent}, #a8823f)`, color: m.accentTexte, fontSize: 26, opacity: src ? 1 : 0.4 }}>{lecture_ ? "❚❚" : "▶"}</button>
      <button style={rond} aria-label="Avancer de 30 secondes" onClick={() => sauter(30)}>+30</button>
      <button style={{ ...rond, width: 40, height: 40, border: "none", fontSize: 16 }} aria-label="Chapitre suivant" disabled={n >= pistes.length - 1} onClick={() => setN(n + 1)}>⏭</button>
    </div>
    {!charge && !pistes.length && <div style={{ textAlign: "center", fontSize: 12.5, color: m.doux, marginTop: 12 }}>Aucun fichier audio disponible pour vous sur cet ouvrage.</div>}
    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
      <button style={{ ...rond, width: "auto", padding: "0 14px", borderRadius: 999, height: 40 }} onClick={() => setVitesse(v => { const l = [0.8, 1, 1.25, 1.5, 2]; return l[(l.indexOf(v) + 1) % l.length]; })}>Vitesse × {vitesse}</button>
      <button style={{ ...rond, width: "auto", padding: "0 14px", borderRadius: 999, height: 40, borderColor: minuterie ? m.accent : m.ligne, color: minuterie ? m.accent : m.texte }} onClick={() => { const l = [null, 15, 30, 45, 60]; const x = l[(l.indexOf(minuterie) + 1) % l.length]; setMinuterie(x); setReste(x ? x * 60 : null); }}>☾ {minuterie ? `${reste != null ? Math.ceil(reste / 60) : minuterie} min` : "Minuterie"}</button>
    </div>
    {pistes.length > 1 && <div style={{ marginTop: 16 }}>{pistes.map((p, i) => <div key={i} onClick={() => setN(i)} style={{ padding: "11px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 14, color: i === n ? m.accent : m.texte, fontWeight: i === n ? 700 : 400 }}>{i === n && lecture_ ? "♪ " : ""}{p.titre}</div>)}</div>}
  </div>;
}
