"use client";
// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi › Éditions pédagogiques › Ti-Colibri (fondatrice)
// • 16 fiches de tomes (histoires_tomes, collection ti-colibri) avec leur
//   VÉRITABLE état de production ; textes retrouvés conservés à l'identique.
// • Éditeur de pages : texte français, champ créole DISTINCT, traductions,
//   légende, illustration, statut, version — les champs avancés et
//   l'historique deviennent actifs avec la migration 0130 (préparée).
//   Tant que l'historique n'existe pas, un texte ATTESTÉ est en lecture seule.
// • Médiathèque « À identifier » (editions_ressources) : aucune attribution
//   automatique ; la fondatrice confirme tome, page, variante et statut
//   (à identifier / à corriger / en attente / validé / archivé), tracés.
// • Originaux à récupérer, matrice pédagogique (aucune fiche annoncée
//   comme produite tant qu'elle ne l'est pas).
// • Aucune publication depuis cet écran.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate, sbInsert, telecharger } from "../events/eventsAtelierLib";
import { urlSignee } from "../histoires/histoiresLib";
import { MARQUES } from "../../design/marques";
import { Surface, Titre, Puce, Bouton } from "../../design/composants";

const m = MARQUES.MOTIPY;
const COLLECTION = "ti-colibri";
const STATUTS_TRI: [string, string, "neutre" | "ok" | "alerte" | "accent"][] = [["a_identifier", "À identifier", "neutre"], ["a_corriger", "À corriger", "alerte"], ["en_attente", "En attente", "accent"], ["valide", "Validé", "ok"], ["archive", "Archivé", "neutre"]];
const STATUTS_PAGE: [string, string][] = [["a_ecrire", "À écrire"], ["brouillon", "Brouillon"], ["a_relire", "À relire"], ["valide", "Validée"]];
const FILTRES: [string, string, (n: string) => boolean][] = [
  ["tous", "Toutes", () => true], ["incruste", "Texte incrusté", n => /texte incrust/i.test(n)], ["doublon", "Doublons probables", n => /doublon visuel probable/i.test(n)],
  ["hors", "Titres hors registre", n => /HORS REGISTRE/.test(n)], ["couv", "Couvertures", n => /couverture/i.test(n)], ["sans", "Sans indice", n => !/Indices visuels/.test(n)],
];
const PEDAGOGIE: [string, string][] = [["enseignant_c1", "Enseignant · cycle 1"], ["eleve_c1", "Élève · cycle 1"], ["enseignant_c2", "Enseignant · cycle 2"], ["eleve_c2", "Élève · cycle 2"], ["evaluation", "Évaluations"], ["corrige", "Corrigés"], ["lexique", "Lexique bilingue"], ["prolongement", "Prolongements culturels"]];

const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${m.ligne}`, borderRadius: 12, padding: "10px 12px", fontSize: 16, fontFamily: m.sans, color: m.texte, background: "#fff", outline: "none" };
const etiq: React.CSSProperties = { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 800, color: m.principale, margin: "10px 0 4px" };
const etatDe = (notes?: string) => (notes || "").match(/État de production : ([^.]+)\./)?.[1] || "à documenter";
const statutRessource = (r: any): string => r.statut_tri || (Array.isArray(r.validation) && r.validation.length ? r.validation[r.validation.length - 1]?.statut : null) || "a_identifier";
const planchePos = (note: string) => { const x = note.match(/planche de contact (\d+), position (\d+)/); return x ? { planche: Number(x[1]), pos: Number(x[2]) } : null; };

export default function TiColibriEditions() {
  const [tomes, setTomes] = useState<any[] | null>(null);
  const [ressources, setRessources] = useState<any[]>([]);
  const [lexique, setLexique] = useState<number>(0);
  const [avance, setAvance] = useState(false);                 // migration 0130 appliquée ?
  const [onglet, setOnglet] = useState<"tomes" | "media" | "originaux" | "pedago">("tomes");
  const [tomeOuvert, setTomeOuvert] = useState<any>(null);
  const [planches, setPlanches] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const charger = async () => {
    const [t, r, l] = await Promise.all([
      sbSelect<any>("histoires_tomes", `collection=eq.${COLLECTION}&select=id,numero,identifiant,titre,etat_editorial,publie,notes_fondatrice,couverture_etat&order=numero.asc`).catch(() => []),
      sbSelect<any>("editions_ressources", `collection=eq.${COLLECTION}&select=*&order=identifiant.asc`).catch(() => []),
      sbSelect<any>("editions_lexique", `collection=eq.${COLLECTION}&select=id`).catch(() => []),
    ]);
    setTomes(t); setRessources(r); setLexique(l.length);
    try { await sbSelect("histoires_scenes", "select=texte_creole&limit=1"); setAvance(true); } catch { setAvance(false); }
    // Vignettes : planches de contact déposées dans le registre (bucket privé, liens temporaires)
    const p: Record<number, string> = {};
    for (const x of r.filter((x: any) => /^tic-planche-contact-0\d$/.test(x.identifiant) && x.stockage_chemin)) { const u = await urlSignee(x.stockage_chemin, 3600); if (u) p[Number(x.identifiant.slice(-2))] = u; }
    setPlanches(p);
  };
  useEffect(() => { charger(); }, []);

  const visuels = useMemo(() => ressources.filter(r => r.identifiant.startsWith("tic-visuel-")), [ressources]);
  const stats = useMemo(() => ({
    tomes: tomes?.length || 0,
    avecTexte: 0,
    aRetrouver: ressources.filter(r => r.preuve === "a_retrouver").length,
    identifies: visuels.filter(v => statutRessource(v) === "valide").length,
  }), [tomes, ressources, visuels]);

  if (!tomes) return <div style={{ padding: 30, color: m.doux, fontFamily: m.sans }}>Chargement de la collection Ti-Colibri…</div>;
  if (tomeOuvert) return <EditeurTome tome={tomeOuvert} avance={avance} ressources={visuels} onRetour={() => { setTomeOuvert(null); charger(); }} />;

  return (
    <div style={{ background: m.fond, color: m.texte, fontFamily: m.sans, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ background: m.degrade, color: "#fff", padding: "18px 16px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase", fontWeight: 800, opacity: 0.9 }}>Mo Ti-Péyi · Éditions pédagogiques</div>
        <div style={{ fontFamily: m.serif, fontSize: 30, fontWeight: 700, lineHeight: 1.05, marginTop: 2 }}>Ti-Colibri</div>
        <div style={{ fontSize: 13, opacity: 0.92, marginTop: 6, lineHeight: 1.4 }}>{stats.tomes} tomes au registre · aucun publié · {stats.aRetrouver} originaux à récupérer · logo officiel Mo Ti-Péyi : fichier source à déposer</div>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 12px 4px" }}>
        {([["tomes", "16 tomes"], ["media", `Médiathèque à identifier · ${visuels.length}`], ["originaux", "Originaux à récupérer"], ["pedago", "Pédagogie"]] as const).map(([k, l]) =>
          <button key={k} onClick={() => setOnglet(k)} style={{ flex: "none", minHeight: 38, padding: "7px 13px", borderRadius: 999, border: `1px solid ${onglet === k ? m.principale : m.ligne}`, background: onglet === k ? m.principale : "#fff", color: onglet === k ? "#fff" : m.texte, fontWeight: 700, fontSize: 13, fontFamily: m.sans }}>{l}</button>)}
      </div>
      {!avance && <div style={{ margin: "8px 12px 0", padding: "9px 12px", borderRadius: 12, border: `1px dashed ${m.principale}66`, fontSize: 12.5, color: m.principale, lineHeight: 1.4 }}>Créole, traductions, légendes, statuts de page, historique des versions et fiches pédagogiques s'activeront avec la migration 0130 (préparée, non appliquée). D'ici là, les textes attestés restent en lecture seule.</div>}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {onglet === "tomes" && tomes.map(t => <Surface key={t.id} m={m} onClick={() => setTomeOuvert(t)} style={{ padding: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: m.surface2, color: m.principale, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18, flex: "none" }}>{t.numero}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: m.serif, fontSize: 18, fontWeight: 700, lineHeight: 1.15 }}>{t.titre}</div>
              <div style={{ fontSize: 12, color: m.doux, marginTop: 3 }}>{etatDe(t.notes_fondatrice)}</div>
            </div>
            <Puce m={m} ton={t.publie ? "ok" : "neutre"}>{t.publie ? "Publié" : "Non publié"}</Puce>
          </div>
        </Surface>)}

        {onglet === "media" && <Mediatheque visuels={visuels} planches={planches} avance={avance} tomes={tomes} onEnregistre={async (r, patch) => {
          const trace = [...(Array.isArray(r.validation) ? r.validation : []), { statut: patch.statut, tome: patch.tome, scene: patch.scene, variante: patch.variante, le: new Date().toISOString(), par: "fondatrice" }];
          const maj: any = { tome: patch.tome || null, scene: patch.scene || null, validation: trace };
          if (avance) { maj.statut_tri = patch.statut; maj.variante = patch.variante || null; }
          try { await sbUpdate("editions_ressources", r.id, maj); flash("Attribution enregistrée (tracée)."); charger(); } catch (e: any) { flash("Refusé : " + e.message); }
        }} />}

        {onglet === "originaux" && <Originaux ressources={ressources} tomes={tomes} />}
        {onglet === "pedago" && <Pedagogie tomes={tomes} ressources={ressources} lexique={lexique} />}
      </div>
      {msg && <div style={{ position: "fixed", left: 16, right: 16, bottom: 90, background: m.principale, color: "#fff", borderRadius: 14, padding: 12, fontSize: 13.5, zIndex: 60 }}>{msg}</div>}
    </div>
  );
}

// ── Éditeur d'un tome ──────────────────────────────────────
function EditeurTome({ tome, avance, ressources, onRetour }: { tome: any; avance: boolean; ressources: any[]; onRetour: () => void }) {
  const [pages, setPages] = useState<any[] | null>(null);
  const [apercu, setApercu] = useState(false);
  const [info, setInfo] = useState("");
  const charger = () => sbSelect<any>("histoires_scenes", `tome_id=eq.${tome.id}&select=*&order=ordre.asc`).then(setPages).catch(() => setPages([]));
  useEffect(() => { charger(); }, []);
  const ajouter = async () => {
    const ordre = Math.max(0, ...(pages || []).filter(p => p.ordre < 99).map(p => p.ordre)) + 1;
    try { await sbInsert("histoires_scenes", { tome_id: tome.id, identifiant: `t${tome.numero}-p${String(ordre).padStart(2, "0")}-${Date.now().toString(36)}`, ordre, titre: `Page ${ordre}`, texte: "", mise_en_scene: "Page ajoutée par la fondatrice." }); charger(); } catch (e: any) { setInfo("Refusé : " + e.message); }
  };
  const dupliquer = async (p: any) => {
    try { await sbInsert("histoires_scenes", { tome_id: tome.id, identifiant: `${p.identifiant}-copie-${Date.now().toString(36)}`, ordre: p.ordre, titre: `${p.titre || "Page"} (copie)`, texte: p.texte, mise_en_scene: `Copie contrôlée de « ${p.identifiant} » — l'original est conservé.` }); charger(); } catch (e: any) { setInfo("Refusé : " + e.message); }
  };
  if (apercu && pages) return <div style={{ background: "#fbf5e8", minHeight: "100vh", padding: "18px 20px 60px", fontFamily: m.serif, color: "#2b2116" }}>
    <button onClick={() => setApercu(false)} style={{ background: "none", border: "none", color: m.principale, fontSize: 14, fontFamily: m.sans, padding: 0 }}>‹ Fermer l'aperçu</button>
    <div style={{ fontSize: 11, letterSpacing: 2, color: m.principale, fontFamily: m.sans, fontWeight: 800, marginTop: 12 }}>APERÇU INTERNE — NON PUBLIÉ</div>
    <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 18px" }}>{tome.titre}</div>
    {pages.map(p => <div key={p.id} style={{ marginBottom: 22 }}>
      <div style={{ aspectRatio: "4 / 3", borderRadius: 12, background: "#efe3c8", display: "grid", placeItems: "center", color: "#8a7350", fontFamily: m.sans, fontSize: 12.5, marginBottom: 10 }}>{p.illustration_ressource || "Illustration à attribuer (sans texte incrusté)"}</div>
      <div style={{ fontSize: 12, fontFamily: m.sans, color: "#8a7350" }}>{p.titre}</div>
      <div style={{ fontSize: 19, lineHeight: 1.55, marginTop: 4 }}>{p.texte || <span style={{ color: "#a89878", fontStyle: "italic" }}>Texte à écrire ou à retrouver</span>}</div>
      {p.texte_creole && <div style={{ fontSize: 17, lineHeight: 1.5, marginTop: 6, color: "#5b4a2c", fontStyle: "italic" }}>{p.texte_creole}</div>}
    </div>)}
  </div>;
  return <div style={{ background: m.fond, color: m.texte, fontFamily: m.sans, borderRadius: 18, padding: 12 }}>
    <button onClick={onRetour} style={{ background: "none", border: "none", color: m.principale, fontSize: 14, padding: 0, fontFamily: m.sans, minHeight: 36 }}>‹ Les 16 tomes</button>
    <Titre m={m} sur={`Tome ${tome.numero} · ${etatDe(tome.notes_fondatrice)}`}>{tome.titre}</Titre>
    <Surface m={m} style={{ padding: 12 }}><div style={etiq}>Sources et éléments retrouvés</div><div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.45, color: m.texte }}>{tome.notes_fondatrice || "—"}</div></Surface>
    <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
      <Bouton m={m} variante="contour" style={{ flex: 1 }} onClick={() => setApercu(true)}>Aperçu iPhone</Bouton>
      <Bouton m={m} style={{ flex: 1 }} onClick={ajouter}>＋ Page</Bouton>
    </div>
    {info && <div style={{ color: "#b4523f", fontSize: 13, marginBottom: 8 }}>{info}</div>}
    {pages === null ? <div style={{ color: m.doux }}>Chargement…</div> : pages.length === 0 ? <Surface m={m}><div style={{ color: m.doux, fontSize: 14, lineHeight: 1.45 }}>Aucune page n'a été retrouvée pour ce tome. Le manuscrit intégral reste à récupérer ou à écrire : aucun texte n'est inventé à sa place.</div></Surface>
      : pages.map(p => <Page key={p.id} p={p} avance={avance} ressources={ressources} onDupliquer={() => dupliquer(p)} onSauve={charger} />)}
  </div>;
}

function Page({ p, avance, ressources, onDupliquer, onSauve }: { p: any; avance: boolean; ressources: any[]; onDupliquer: () => void; onSauve: () => void }) {
  const atteste = /ATTESTÉ/.test(p.mise_en_scene || "");
  const verrou = atteste && !avance;                     // pas d'historique → le texte retrouvé ne peut pas être écrasé
  const [v, setV] = useState<any>({ titre: p.titre || "", texte: p.texte || "", texte_creole: p.texte_creole || "", legende: p.legende || "", statut: p.statut || "a_ecrire", trad_lang: "en", trad: (p.traductions || {}).en || "", illustration: p.illustration_ressource || "" });
  const [etat, setEtat] = useState("");
  const [historique, setHistorique] = useState<any[] | null>(null);
  const modifie = v.titre !== (p.titre || "") || v.texte !== (p.texte || "") || (avance && (v.texte_creole !== (p.texte_creole || "") || v.legende !== (p.legende || "") || v.statut !== (p.statut || "a_ecrire") || v.illustration !== (p.illustration_ressource || "") || v.trad !== ((p.traductions || {})[v.trad_lang] || "")));
  const sauver = async () => {
    const patch: any = { titre: v.titre }; if (!verrou) patch.texte = v.texte;
    if (avance) Object.assign(patch, { texte_creole: v.texte_creole || null, legende: v.legende || null, statut: v.statut, illustration_ressource: v.illustration || null, traductions: { ...(p.traductions || {}), ...(v.trad ? { [v.trad_lang]: v.trad } : {}) } });
    try { await sbUpdate("histoires_scenes", p.id, patch); setEtat(avance ? "Enregistré · version précédente archivée" : "Enregistré"); onSauve(); } catch (e: any) { setEtat("Refusé : " + e.message); }
  };
  const voirHistorique = async () => { try { setHistorique(await sbSelect<any>("histoires_scenes_versions", `scene_id=eq.${p.id}&select=*&order=version.desc`)); } catch { setHistorique([]); } };
  const restaurer = async (h: any) => { try { await sbUpdate("histoires_scenes", p.id, { titre: h.titre, texte: h.texte, texte_creole: h.texte_creole, traductions: h.traductions || {}, legende: h.legende }); setEtat(`Version ${h.version} restaurée (l'état actuel est archivé)`); onSauve(); } catch (e: any) { setEtat("Refusé : " + e.message); } };
  const off = !avance;
  return <Surface m={m} style={{ padding: 12, marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 11.5, color: m.doux }}>{p.identifiant} · ordre {p.ordre}{avance ? ` · v${p.version}` : ""}</div>
      {atteste ? <Puce m={m} ton="ok">Texte attesté</Puce> : <Puce m={m}>{(STATUTS_PAGE.find(s => s[0] === (p.statut || "a_ecrire")) || ["", "À écrire"])[1]}</Puce>}
    </div>
    <div style={etiq}>Titre de page</div><input style={champ} value={v.titre} onChange={e => setV({ ...v, titre: e.target.value })} />
    <div style={etiq}>Texte français {verrou && "— lecture seule (texte retrouvé, historique requis)"}</div>
    <textarea readOnly={verrou} style={{ ...champ, minHeight: 90, background: verrou ? m.surface2 : "#fff", fontFamily: m.serif, fontSize: 17, lineHeight: 1.5 }} value={v.texte} placeholder="Texte à écrire ou à retrouver — ne pas inventer de texte historique" onChange={e => setV({ ...v, texte: e.target.value })} />
    <div style={etiq}>Créole guyanais (champ distinct, à faire relire)</div>
    <textarea disabled={off} style={{ ...champ, minHeight: 60, opacity: off ? 0.55 : 1 }} value={v.texte_creole} placeholder={off ? "Disponible après la migration 0130" : "Texte créole guyanais — relecture par une personne compétente"} onChange={e => setV({ ...v, texte_creole: e.target.value })} />
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ width: 90 }}><div style={etiq}>Langue</div><select disabled={off} style={champ} value={v.trad_lang} onChange={e => setV({ ...v, trad_lang: e.target.value, trad: (p.traductions || {})[e.target.value] || "" })}><option value="en">EN</option><option value="es">ES</option><option value="pt-BR">PT-BR</option><option value="nl">NL</option></select></div>
      <div style={{ flex: 1 }}><div style={etiq}>Traduction</div><input disabled={off} style={{ ...champ, opacity: off ? 0.55 : 1 }} value={v.trad} placeholder={off ? "Après migration 0130" : "Traduction"} onChange={e => setV({ ...v, trad: e.target.value })} /></div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}><div style={etiq}>Illustration (sans texte incrusté)</div><select disabled={off} style={champ} value={v.illustration} onChange={e => setV({ ...v, illustration: e.target.value })}><option value="">— À attribuer —</option>{ressources.filter(r => statutRessource(r) === "valide").map(r => <option key={r.id} value={r.identifiant}>{r.identifiant.replace("tic-", "").toUpperCase()}</option>)}</select></div>
      <div style={{ width: 120 }}><div style={etiq}>Statut</div><select disabled={off} style={champ} value={v.statut} onChange={e => setV({ ...v, statut: e.target.value })}>{STATUTS_PAGE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    </div>
    <div style={etiq}>Légende (optionnelle)</div><input disabled={off} style={{ ...champ, opacity: off ? 0.55 : 1 }} value={v.legende} onChange={e => setV({ ...v, legende: e.target.value })} />
    <div style={{ fontSize: 11.5, color: m.doux, marginTop: 8, lineHeight: 1.4 }}>{p.mise_en_scene}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <Bouton m={m} disabled={!modifie} style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} onClick={sauver}>Enregistrer</Bouton>
      <Bouton m={m} variante="contour" style={{ padding: "8px 12px", fontSize: 13 }} onClick={onDupliquer}>Dupliquer</Bouton>
      <Bouton m={m} variante="contour" disabled={off} style={{ padding: "8px 12px", fontSize: 13 }} onClick={voirHistorique}>Historique</Bouton>
    </div>
    {etat && <div style={{ fontSize: 12.5, color: m.principale, marginTop: 6 }}>{etat}</div>}
    {historique && <div style={{ marginTop: 8, borderTop: `1px solid ${m.ligne}` }}>{historique.length ? historique.map(h => <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 12.5 }}><span>v{h.version} · {new Date(h.created_at).toLocaleString("fr-FR")}</span><Bouton m={m} variante="discret" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => restaurer(h)}>Restaurer</Bouton></div>) : <div style={{ fontSize: 12.5, color: m.doux, padding: "8px 0" }}>Aucune version antérieure.</div>}</div>}
  </Surface>;
}

// ── Médiathèque « À identifier » ───────────────────────────
function Mediatheque({ visuels, planches, avance, tomes, onEnregistre }: { visuels: any[]; planches: Record<number, string>; avance: boolean; tomes: any[]; onEnregistre: (r: any, p: any) => void }) {
  const [filtre, setFiltre] = useState("tous"); const [statut, setStatut] = useState("tous"); const [ouvert, setOuvert] = useState<string | null>(null);
  const liste = visuels.filter(v => (FILTRES.find(f => f[0] === filtre)?.[2] || (() => true))(v.note || "") && (statut === "tous" || statutRessource(v) === statut));
  const compte = (s: string) => visuels.filter(v => statutRessource(v) === s).length;
  return <>
    <Surface m={m} style={{ padding: 12 }}>
      <div style={{ fontSize: 13, lineHeight: 1.45 }}><b>{visuels.length} références</b> issues de l'inventaire, <b>aucun original individuel</b> dans l'archive reçue (seules 4 planches de contact). Aucune image n'est attribuée automatiquement : vous confirmez chaque correspondance.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{STATUTS_TRI.map(([k, l, ton]) => <Puce key={k} m={m} ton={ton}>{l} · {compte(k)}</Puce>)}</div>
    </Surface>
    <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{FILTRES.map(([k, l]) => <button key={k} onClick={() => setFiltre(k)} style={{ flex: "none", minHeight: 34, padding: "5px 11px", borderRadius: 999, border: `1px solid ${filtre === k ? m.principale : m.ligne}`, background: filtre === k ? `${m.principale}18` : "#fff", color: m.texte, fontSize: 12.5, fontWeight: 700, fontFamily: m.sans }}>{l}</button>)}</div>
    <select style={{ ...champ, fontSize: 14 }} value={statut} onChange={e => setStatut(e.target.value)}><option value="tous">Tous les statuts</option>{STATUTS_TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {liste.map(v => { const pp = planchePos(v.note || ""); const s = statutRessource(v); const ind = (v.note || "").split("Indices visuels à confirmer : ")[1]?.replace(/\.$/, "");
        const url = pp && planches[pp.planche]; const col = pp ? (pp.pos - 1) % 5 : 0, lig = pp ? Math.floor((pp.pos - 1) / 5) : 0;
        return <div key={v.id} onClick={() => setOuvert(ouvert === v.id ? null : v.id)} style={{ background: "#fff", border: `1px solid ${m.ligne}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", gridColumn: ouvert === v.id ? "1 / -1" : undefined }}>
          <div style={{ aspectRatio: "1", background: url ? `url(${url}) ${col * 25}% ${lig * 33.33}% / 500% 400% no-repeat` : m.surface2, display: "grid", placeItems: "center", color: m.doux, fontSize: 11.5, textAlign: "center", padding: url ? 0 : 8 }}>{!url && <>Vignette : planche {pp?.planche} · position {pp?.pos}<br />(planche à déposer dans le registre)</>}</div>
          <div style={{ padding: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}><b style={{ fontSize: 12.5 }}>{v.identifiant.replace("tic-visuel-", "VISUEL_")}</b><Puce m={m} ton={(STATUTS_TRI.find(x => x[0] === s) || STATUTS_TRI[0])[2]}>{(STATUTS_TRI.find(x => x[0] === s) || STATUTS_TRI[0])[1]}</Puce></div>
            {ind && <div style={{ fontSize: 11, color: m.doux, marginTop: 4, lineHeight: 1.35 }}>{ind}</div>}
            {v.tome && <div style={{ fontSize: 11.5, color: m.principale, marginTop: 4 }}>Tome {v.tome}{v.scene ? ` · ${v.scene}` : ""}</div>}
            {ouvert === v.id && <Attribution v={v} tomes={tomes} avance={avance} onEnregistre={p => onEnregistre(v, p)} />}
          </div>
        </div>; })}
    </div>
  </>;
}

function Attribution({ v, tomes, avance, onEnregistre }: { v: any; tomes: any[]; avance: boolean; onEnregistre: (p: any) => void }) {
  const [f, setF] = useState<any>({ tome: v.tome || "", scene: v.scene || "", variante: v.variante || "", statut: statutRessource(v) });
  return <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${m.ligne}`, marginTop: 8, paddingTop: 6 }}>
    <div style={etiq}>Tome</div><select style={champ} value={f.tome} onChange={e => setF({ ...f, tome: e.target.value ? Number(e.target.value) : "" })}><option value="">— Non attribuée —</option>{tomes.map(t => <option key={t.id} value={t.numero}>{t.numero}. {t.titre}</option>)}</select>
    <div style={etiq}>Page / scène</div><input style={champ} value={f.scene} placeholder="ex. t4-p03, couverture, double page" onChange={e => setF({ ...f, scene: e.target.value })} />
    <div style={etiq}>Variante</div><input style={champ} value={f.variante} placeholder={avance ? "ex. variante B" : "Après migration 0130"} disabled={!avance} onChange={e => setF({ ...f, variante: e.target.value })} />
    <div style={etiq}>Statut</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{STATUTS_TRI.map(([k, l]) => <button key={k} onClick={() => setF({ ...f, statut: k })} style={{ minHeight: 34, padding: "5px 10px", borderRadius: 999, border: `1px solid ${f.statut === k ? m.principale : m.ligne}`, background: f.statut === k ? m.principale : "#fff", color: f.statut === k ? "#fff" : m.texte, fontSize: 12, fontWeight: 700, fontFamily: m.sans }}>{l}</button>)}</div>
    <Bouton m={m} style={{ width: "100%", marginTop: 10 }} onClick={() => onEnregistre(f)}>Confirmer (tracé)</Bouton>
    <div style={{ fontSize: 11, color: m.doux, marginTop: 6 }}>{(v.validation || []).length} décision(s) enregistrée(s) pour cette image.</div>
  </div>;
}

// ── Originaux à récupérer ──────────────────────────────────
function Originaux({ ressources, tomes }: { ressources: any[]; tomes: any[] }) {
  const manquants = ressources.filter(r => r.preuve === "a_retrouver");
  const autres: [string, string][] = [
    ["Logo officiel Mo Ti-Péyi", "Fichier source original (toucan, carte de Guyane, « Mo Ti-Péyi — Éditions pédagogiques ») — à appliquer tel quel, jamais redessiné."],
    ["Manuscrits intégraux des tomes 1 à 3", "Textes page par page non retrouvés (seuls résumés, conclusions et morales sont attestés)."],
    ["Textes des tomes 4 à 16", "Tome 4 : plan validé, ouverture et morale attestées ; tome 8 : plan ; autres : titres et orientations."],
    ["Couverture du tome 4 corrigée", "Couverture candidate à reprendre avec le logo officiel exact."],
    ["Relecture du créole guyanais", "Par une personne compétente, avant toute publication."],
    ["Nom du personnage", "Maman Doudou / Maman Léontine : à harmoniser."],
    ["Droits et mentions légales", "À vérifier avant impression et diffusion."],
  ];
  const exporter = () => { const l = manquants.map(r => ({ identifiant: r.identifiant, nom_original: r.nom_original, fichier_attendu: (r.provenance || "").split("fichier attendu : ")[1] || "", note: r.note })); const cles = Object.keys(l[0] || { vide: "" });
    telecharger(new Blob(["﻿" + [cles.join(";"), ...l.map(x => cles.map(k => `"${String((x as any)[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n")], { type: "text/csv;charset=utf-8" }), "ti-colibri-originaux-a-recuperer.csv"); };
  return <>
    <Surface m={m}><Titre m={m} sur="À récupérer" niveau={3}>Fichiers et validations manquants</Titre>{autres.map(([t, d]) => <div key={t} style={{ padding: "9px 0", borderTop: `1px solid ${m.ligne}` }}><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12.5, color: m.doux, marginTop: 2 }}>{d}</div></div>)}</Surface>
    <Surface m={m}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><Titre m={m} sur="Illustrations" niveau={3}>{manquants.length} originaux absents</Titre><Bouton m={m} variante="discret" onClick={exporter}>Exporter CSV</Bouton></div>
      <div style={{ fontSize: 12.5, color: m.doux, lineHeight: 1.45 }}>Dossier attendu : <b>01_Illustrations_a_trier/</b> (fichiers VISUEL_001 à VISUEL_080 en haute résolution). Déposer chaque fichier depuis le Registre : son empreinte est contrôlée.</div>
      <div style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>{manquants.map(r => <div key={r.id} style={{ fontSize: 12, padding: "5px 0", borderTop: `1px solid ${m.ligne}` }}><b>{r.identifiant.replace("tic-visuel-", "VISUEL_")}</b> · {r.nom_original}</div>)}</div>
    </Surface>
  </>;
}

// ── Pédagogie ──────────────────────────────────────────────
function Pedagogie({ tomes, ressources, lexique }: { tomes: any[]; ressources: any[]; lexique: number }) {
  const [presentation, setPresentation] = useState<"classique" | "premium">("classique");
  const existants = ressources.filter(r => ["fiche_pedagogique", "cahier", "apercu_cahier", "corrige"].includes(r.type));
  return <>
    <Surface m={m} style={{ padding: 12 }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>Fiches finalisées : <b>0</b>. Les résumés pédagogiques des tomes 1 à 10 sont des orientations de travail, pas des fiches produites. Lexique créole : <b>{lexique}</b> entrées « candidates » à valider. Ressources existantes au registre : <b>{existants.length}</b> (cahier d'écriture GS et aperçus, à relire).</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>{(["classique", "premium"] as const).map(p => <button key={p} onClick={() => setPresentation(p)} style={{ minHeight: 34, padding: "5px 12px", borderRadius: 999, border: `1px solid ${presentation === p ? m.principale : m.ligne}`, background: presentation === p ? m.principale : "#fff", color: presentation === p ? "#fff" : m.texte, fontWeight: 700, fontSize: 12.5, fontFamily: m.sans }}>{p === "classique" ? "Classique académique" : "Premium Bella'Studio Kids"}</button>)}</div>
    </Surface>
    <div style={{ overflowX: "auto", background: "#fff", borderRadius: 14, border: `1px solid ${m.ligne}` }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11.5, minWidth: 720 }}>
        <thead><tr><th style={{ textAlign: "left", padding: 8, position: "sticky", left: 0, background: "#fff" }}>Tome</th>{PEDAGOGIE.map(([k, l]) => <th key={k} style={{ padding: 8, fontWeight: 700, color: m.doux }}>{l}</th>)}</tr></thead>
        <tbody>{tomes.map(t => <tr key={t.id} style={{ borderTop: `1px solid ${m.ligne}` }}><td style={{ padding: 8, fontWeight: 700, position: "sticky", left: 0, background: "#fff" }}>{t.numero}</td>{PEDAGOGIE.map(([k]) => <td key={k} style={{ padding: 8, textAlign: "center", color: m.doux }}>à produire</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div style={{ fontSize: 12, color: m.doux, lineHeight: 1.45 }}>Téléchargement PDF A4 uniquement après validation de chaque fiche (migration 0130). Contraintes : « curcuma » (jamais « koudkourou » hors archive), boudin blanc sans sang ni porc, pluralité des fêtes de Guyane, relecture créole.</div>
  </>;
}
