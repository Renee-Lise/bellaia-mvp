"use client";
// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi › Atelier pédagogique (espace fondatrice)
//   • Bibliothèque de références : 12 fiches GS privées, import par empreinte
//     (aucun doublon), stockage equipe-prive/motipy/… (fondatrice uniquement),
//     index filtrable par niveau, domaine et compétence.
//   • Créer une fiche : 6 modèles GS paramétrables, aperçu, brouillon, duplication,
//     nouvelle variante, export PDF de la fiche et du corrigé.
//   • Mes fiches : brouillons et validation explicite (rien n'est publié).
// Données : table editions_ressources (RLS : fondatrice uniquement), collection
// « mo-ti-peyi-gs ». Aucune migration. Le prénom d'un enfant n'est enregistré
// dans un brouillon que si la fondatrice le demande.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, partagerFichier } from "../../events/eventsAtelierLib";
import { deposerPrive, lienPrive, sha256 } from "../../equipe/equipeLib";
import { MODELES, MOTIFS, FORMES, STRUCTURES, generer, parDefaut, type Modele, type Params } from "./modeles";
import { pageEnSvg, pdfDePages, chargerPoliceScript } from "./rendu";
import { COLLECTION_GS, REFERENCES_GS, PDF_REFERENCES, referenceParEmpreinte } from "./references";

const SA = "system-ui, -apple-system, sans-serif";
const C = { carte: "rgba(34,197,94,0.07)", ligne: "rgba(34,197,94,0.22)", acc: "#22c55e", texte: "#f5f0e8", doux: "rgba(245,240,232,0.62)", rouge: "#f87171", or: "#f59e0b" };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 44 };
const btn = (fort = false, c = C.acc): React.CSSProperties => ({ minHeight: 44, padding: "9px 14px", borderRadius: 12, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}26` : "rgba(255,255,255,0.05)", color: fort ? c : C.texte, fontSize: 14, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const etiquette = (t: string) => <div style={{ fontSize: 12, fontWeight: 800, color: C.doux, margin: "6px 0 4px" }}>{t}</div>;
const STATUTS: Record<string, string> = { brouillon: "Brouillon", a_relire: "À valider", approuve: "Validée pour les familles (non publiée)", publie: "Publiée" };
const uid = () => (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const nouvelleGraine = () => Math.floor(Math.random() * 2 ** 31);

export default function AtelierGS() {
  const [vue, setVue] = useState<"biblio" | "creer" | "fiches">("biblio");
  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 900 }}>✏️ Atelier pédagogique — Grande Section</div>
        <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>Références privées et création de fiches originales Mo Ti-Péyi. Rien n'est publié vers les familles sans votre validation.</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="tablist">
        {([["biblio", "📚 Bibliothèque de références"], ["creer", "✏️ Créer une fiche"], ["fiches", "🗂 Mes fiches"]] as const).map(([k, l]) =>
          <button key={k} role="tab" aria-selected={vue === k} onClick={() => setVue(k)} style={btn(vue === k)}>{l}</button>)}
      </div>
      {vue === "biblio" && <Bibliotheque />}
      {vue !== "biblio" && <Editeur vue={vue} setVue={setVue} />}
    </div>
  );
}

// ═══ Bibliothèque de références ═════════════════════════════
function Bibliotheque() {
  const [refs, setRefs] = useState<any[]>([]); const [charge, setCharge] = useState(true); const [msg, setMsg] = useState(""); const [rapport, setRapport] = useState<string[]>([]);
  const [domaine, setDomaine] = useState(""); const [q, setQ] = useState(""); const [niveau, setNiveau] = useState("GS"); const [apercu, setApercu] = useState<{ titre: string; url: string; pdf?: boolean } | null>(null); const [envoi, setEnvoi] = useState(false);
  const charger = async () => { setCharge(true); try { setRefs(await sbSelect("editions_ressources", `collection=eq.${COLLECTION_GS}&type=in.(reference_gs,reference_gs_pdf)&select=*&order=tome.asc.nullslast`)); } catch (e: any) { setMsg("Lecture impossible : " + String(e?.message || e)); } setCharge(false); };
  useEffect(() => { charger(); }, []);
  const importer = async (files: FileList | null) => {
    if (!files?.length) return; setEnvoi(true); const lignes: string[] = [];
    let existantes: any[] = []; try { existantes = await sbSelect("editions_ressources", `collection=eq.${COLLECTION_GS}&select=id,sha256,identifiant`); } catch {}
    for (const f of Array.from(files)) {
      try {
        const sha = await sha256(f); const ref = referenceParEmpreinte(sha); const estPdf = sha === PDF_REFERENCES.sha256;
        if (!ref && !estPdf) { lignes.push(`⚠️ ${f.name} : fichier non répertorié (empreinte inconnue) — ignoré.`); continue; }
        if (existantes.some(x => x.sha256 === sha)) { lignes.push(`= ${f.name} : déjà importé (page ${ref ? ref.page : "PDF"}) — aucun doublon créé.`); continue; }
        const ext = estPdf ? "pdf" : (f.type === "image/png" ? "png" : "jpg"); const chemin = `motipy/references/gs/${sha}.${ext}`;
        try { await deposerPrive(chemin, f, f.type || (estPdf ? "application/pdf" : "image/jpeg")); } catch (e: any) { if (!/existe déjà/.test(String(e?.message))) throw e; }
        const ligne = estPdf
          ? { collection: COLLECTION_GS, identifiant: "gs-ref-pdf", type: "reference_gs_pdf", niveau: "GS", nom_original: PDF_REFERENCES.nom, sha256: sha, octets: f.size, stockage_chemin: chemin, preuve: "fichier_joint", publication: "brouillon", validation: { pages: PDF_REFERENCES.pages, prive: true }, note: "PDF A4 des 12 fiches de référence (privé)" }
          : { collection: COLLECTION_GS, identifiant: `gs-ref-${String(ref!.page).padStart(2, "0")}`, type: "reference_gs", niveau: "GS", tome: ref!.page, scene: ref!.domaine, nom_original: ref!.titre, provenance: ref!.source || null, sha256: sha, octets: f.size, stockage_chemin: chemin, preuve: "fichier_joint", publication: "brouillon", validation: { competence: ref!.competence, consigne: ref!.consigne, remarques: ref!.remarques, page: ref!.page, prive: true }, note: ref!.competence };
        const [n] = await sbInsert("editions_ressources", ligne); existantes.push(n);
        lignes.push(`✅ ${f.name} → ${estPdf ? "PDF des références" : `page ${ref!.page} — ${ref!.titre}`}`);
      } catch (e: any) { lignes.push(`❌ ${f.name} : ${String(e?.message || e).slice(0, 120)}`); }
    }
    setRapport(lignes); setEnvoi(false); charger();
  };
  const pdf = refs.find(r => r.type === "reference_gs_pdf");
  const pages = refs.filter(r => r.type === "reference_gs");
  const domaines = Array.from(new Set(REFERENCES_GS.map(r => r.domaine)));
  const visibles = pages.filter(r => (!niveau || r.niveau === niveau) && (!domaine || r.scene === domaine) && (!q || `${r.nom_original} ${r.note} ${r.validation?.consigne || ""}`.toLowerCase().includes(q.toLowerCase())));
  const ouvrir = async (r: any, versPdf = false) => {
    const chemin = versPdf ? pdf?.stockage_chemin : r.stockage_chemin; const url = chemin ? await lienPrive(chemin, 900) : null;
    if (!url) { setMsg("Lien indisponible (droits ou fichier manquant)."); return; }
    setApercu({ titre: versPdf ? `${PDF_REFERENCES.nom} — page ${r.tome}` : `Page ${String(r.tome).padStart(2, "0")} — ${r.nom_original}`, url: versPdf ? `${url}#page=${r.tome}` : url, pdf: versPdf });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: C.carte, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
        <b>{pages.length}/12 pages importées</b>{pdf ? " · PDF des références présent" : " · PDF des références non importé"} — fichiers privés (accès fondatrice uniquement, liens temporaires de 15 min).
        <div style={{ marginTop: 8 }}>
          <label style={{ ...btn(true), display: "inline-flex", alignItems: "center" }}>{envoi ? "Import en cours…" : "＋ Importer les photos et le PDF"}
            <input type="file" multiple accept="image/jpeg,image/png,application/pdf" style={{ display: "none" }} disabled={envoi} onChange={e => { importer(e.target.files); e.currentTarget.value = ""; }} aria-label="Importer les références" />
          </label>
        </div>
        <div style={{ fontSize: 12, color: C.doux, marginTop: 6 }}>Chaque fichier est reconnu par son empreinte : réimporter le même fichier ne crée pas de doublon.</div>
      </div>
      {rapport.length > 0 && <div role="status" style={{ fontSize: 13, lineHeight: 1.6 }}>{rapport.map((l, i) => <div key={i}>{l}</div>)}</div>}
      {msg && <div style={{ color: C.rouge, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select style={{ ...champ, width: "auto" }} value={niveau} onChange={e => setNiveau(e.target.value)} aria-label="Niveau"><option value="">Tous niveaux</option><option value="GS">Grande Section</option></select>
        <select style={{ ...champ, width: "auto" }} value={domaine} onChange={e => setDomaine(e.target.value)} aria-label="Domaine"><option value="">Tous les domaines</option>{domaines.map(d => <option key={d} value={d}>{d}</option>)}</select>
        <input style={{ ...champ, flex: "1 1 180px" }} placeholder="Rechercher une compétence…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {charge ? <div style={{ color: C.doux }}>Chargement…</div> : visibles.length === 0 ? <div style={{ color: C.doux }}>Aucune fiche{pages.length ? " pour ce filtre" : " importée pour le moment"}.</div> :
        visibles.map(r => (
          <div key={r.id} style={{ background: C.carte, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: C.doux, fontWeight: 800 }}>Page {String(r.tome).padStart(2, "0")} · {r.niveau} · {r.scene} · 🔒 privé</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{r.nom_original}</div>
            <div style={{ fontSize: 13 }}>Compétence : {r.validation?.competence}</div>
            <div style={{ fontSize: 13, color: C.doux }}>Consigne : « {r.validation?.consigne} »</div>
            {r.provenance && <div style={{ fontSize: 12, color: C.doux }}>Source visible : {r.provenance}</div>}
            {r.validation?.remarques && <div style={{ fontSize: 12, color: C.or }}>Remarques : {r.validation.remarques}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={btn(true)} onClick={() => ouvrir(r)}>Ouvrir la page</button>
              {pdf && <button style={btn()} onClick={() => ouvrir(r, true)}>Ouvrir dans le PDF</button>}
            </div>
          </div>))}
      {apercu && (
        <div role="dialog" aria-label={apercu.titre} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button style={btn(true)} onClick={() => setApercu(null)}>← Retour</button>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{apercu.titre}</div>
            <a href={apercu.url} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: "none" }}>Plein écran</a>
          </div>
          {apercu.pdf ? <iframe title={apercu.titre} src={apercu.url} style={{ flex: 1, border: 0, background: "#fff", borderRadius: 8 }} /> : <div style={{ flex: 1, overflow: "auto", background: "#fff", borderRadius: 8 }}><img src={apercu.url} alt={apercu.titre} style={{ width: "100%", display: "block" }} /></div>}
        </div>)}
    </div>
  );
}

// ═══ Éditeur : créer, enregistrer, dupliquer, exporter ═════
function Editeur({ vue, setVue }: { vue: "creer" | "fiches"; setVue: (v: "creer" | "fiches") => void }) {
  const [params, setParams] = useState<Params>(() => parDefaut("graphisme", nouvelleGraine()));
  const [ficheId, setFicheId] = useState<string | null>(null); const [statut, setStatut] = useState("brouillon");
  const [garderPrenom, setGarderPrenom] = useState(false); const [voirCorrige, setVoirCorrige] = useState(false);
  const [fiches, setFiches] = useState<any[]>([]); const [msg, setMsg] = useState(""); const [occupe, setOccupe] = useState(false); const [police, setPolice] = useState<boolean | null>(null);
  const res = useMemo(() => generer(params), [params]);
  const set = (patch: Partial<Params>) => setParams(p => ({ ...p, ...patch }));
  const chargerFiches = async () => { try { setFiches(await sbSelect("editions_ressources", `collection=eq.${COLLECTION_GS}&type=eq.fiche_atelier_gs&select=*&order=updated_at.desc`)); } catch (e: any) { setMsg("Lecture impossible : " + String(e?.message || e)); } };
  useEffect(() => { chargerFiches(); chargerPoliceScript().then(setPolice); }, []);
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(m => (m === t ? "" : m)), 6000); };
  const donnees = () => { const { prenom, ...reste } = params; return garderPrenom && prenom ? params : reste; };
  const enregistrer = async (copie = false) => {
    if (res.erreurs.length) { flash("Corrigez d'abord : " + res.erreurs.join(" ")); return; }
    setOccupe(true);
    try {
      const modele = MODELES.find(m => m.id === params.modele)!; const maintenant = new Date().toISOString();
      if (ficheId && !copie) {
        const actuelle = fiches.find(f => f.id === ficheId); const hist = [...(actuelle?.validation?.historique || []), { le: maintenant, action: "modification" }];
        const [n] = await sbUpdate("editions_ressources", ficheId, { nom_original: params.titre || modele.nom, scene: params.modele, note: modele.competence, validation: { parametres: donnees(), historique: hist }, updated_at: maintenant });
        setFiches(fs => fs.map(f => (f.id === ficheId ? n : f))); flash("✅ Brouillon mis à jour.");
      } else {
        const [n] = await sbInsert("editions_ressources", { collection: COLLECTION_GS, identifiant: `gs-fiche-${uid()}`, type: "fiche_atelier_gs", niveau: "GS", nom_original: (params.titre || modele.nom) + (copie ? " (copie)" : ""), scene: params.modele, note: modele.competence, preuve: "trace_historique", publication: "brouillon", validation: { parametres: donnees(), historique: [{ le: maintenant, action: copie ? `duplication de ${ficheId || "fiche"}` : "création" }] } });
        setFiches(fs => [n, ...fs]); setFicheId(n.id); setStatut("brouillon"); if (copie) set({ titre: n.nom_original }); flash(copie ? "✅ Copie enregistrée (vous modifiez maintenant la copie)." : "✅ Brouillon enregistré.");
      }
    } catch (e: any) { flash("❌ " + String(e?.message || e)); }
    setOccupe(false);
  };
  const changerStatut = async (s: string) => {
    if (!ficheId) { flash("Enregistrez d'abord le brouillon."); return; }
    if (s === "approuve" && !confirm("Valider cette fiche pour les familles ? Elle ne sera pas publiée automatiquement : la diffusion reste une action séparée.")) return;
    try { const [n] = await sbUpdate("editions_ressources", ficheId, { publication: s, updated_at: new Date().toISOString() }); setFiches(fs => fs.map(f => (f.id === ficheId ? n : f))); setStatut(s); flash(`Statut : ${STATUTS[s]}.`); } catch (e: any) { flash("❌ " + String(e?.message || e)); }
  };
  const ouvrir = (f: any) => { const p = f.validation?.parametres; if (!p) { flash("Fiche illisible."); return; } setParams({ ...parDefaut(p.modele), ...p }); setFicheId(f.id); setStatut(f.publication); setGarderPrenom(!!p.prenom); setVue("creer"); };
  const exporter = async (corrige: boolean) => {
    const page = corrige ? res.corrige : res.eleve; if (!page || res.erreurs.length) return; setOccupe(true);
    try { const blob = await pdfDePages([page]); const base = (params.titre || params.modele).normalize("NFD").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "fiche"; const nom = `MoTiPeyi_GS_${base}${corrige ? "_corrige" : ""}.pdf`; await partagerFichier(blob, nom, nom); flash(`📄 ${nom} prêt.`); }
    catch (e: any) { flash("❌ " + String(e?.message || e)); }
    setOccupe(false);
  };
  const choisirModele = (m: Modele) => { setParams(parDefaut(m, nouvelleGraine())); setFicheId(null); setStatut("brouillon"); setVoirCorrige(false); setGarderPrenom(false); };
  const appliquerDifficulte = (d: 1 | 2 | 3) => {
    const p: Partial<Params> = { difficulte: d };
    if (params.modele === "graphisme") Object.assign(p, { taille: d === 1 ? "grande" : "moyenne", repetitions: d === 1 ? 6 : d === 2 ? 8 : 11, motifs: d === 1 ? ["ponts", "zigzag", "vagues"] : d === 2 ? ["vagues", "ponts", "zigzag", "boucles", "creneaux"] : ["boucles", "creneaux", "coupes", "spirales", "vagues", "zigzag"] });
    if (params.modele === "suites") Object.assign(p, { structures: d === 1 ? ["AB"] : d === 2 ? ["AB", "AAB", "ABB"] : ["AAB", "ABB", "ABC", "AABB"], aCompleter: d === 1 ? 2 : 3 });
    if (params.modele === "denombrement") Object.assign(p, { quantites: d === 1 ? [1, 2, 3] : d === 2 ? [3, 1, 5, 2, 4] : [6, 3, 5, 1, 4, 2], ronds: d === 3 ? 6 : 5 });
    if (params.modele === "numeration") Object.assign(p, { fin: d === 3 ? 10 : 5, trous: d === 1 ? 1 : d === 2 ? 2 : 4 });
    set(p);
  };

  if (vue === "fiches") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {msg && <div role="status" style={{ fontSize: 13 }}>{msg}</div>}
      {fiches.length === 0 ? <div style={{ color: C.doux }}>Aucune fiche enregistrée.</div> : fiches.map(f => (
        <div key={f.id} style={{ background: C.carte, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}><div style={{ fontWeight: 800 }}>{f.nom_original}</div><div style={{ fontSize: 12, color: C.doux }}>{MODELES.find(m => m.id === f.scene)?.nom} · {STATUTS[f.publication] || f.publication} · modifiée le {new Date(f.updated_at).toLocaleString("fr-FR")}</div></div>
          <button style={btn(true)} onClick={() => ouvrir(f)}>Ouvrir</button>
        </div>))}
    </div>);

  const ch = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set({ [k]: e.target.value });
  const coche = (k: string, v: string) => { const l: string[] = params[k] || []; set({ [k]: l.includes(v) ? l.filter(x => x !== v) : [...l, v] }); };
  const cases = (k: string, options: Record<string, string>) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(options).map(([v, l]) => <label key={v} style={{ ...btn((params[k] || []).includes(v)), display: "inline-flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={(params[k] || []).includes(v)} onChange={() => coche(k, v)} />{l}</label>)}</div>;
  const nombre = (k: string, min: number, max: number) => <input type="number" inputMode="numeric" min={min} max={max} style={champ} value={params[k] ?? ""} onChange={e => set({ [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) })} aria-label={k} />;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {etiquette("1. Modèle (Grande Section)")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
          {MODELES.map(m => <button key={m.id} onClick={() => choisirModele(m.id)} style={{ ...btn(params.modele === m.id), textAlign: "left" }} aria-pressed={params.modele === m.id}>{m.nom}<div style={{ fontSize: 11, fontWeight: 500, color: C.doux }}>{m.domaine}</div></button>)}
        </div>
        {etiquette("2. Difficulté")}
        <div style={{ display: "flex", gap: 6 }}>{([1, 2, 3] as const).map(d => <button key={d} style={btn(params.difficulte === d)} onClick={() => appliquerDifficulte(d)} aria-pressed={params.difficulte === d}>{["Facile", "Moyen", "Plus difficile"][d - 1]}</button>)}</div>
        {etiquette("3. Titre et consigne")}
        <input style={champ} value={params.titre} onChange={ch("titre")} aria-label="Titre" placeholder="Titre" />
        <textarea style={{ ...champ, minHeight: 64 }} value={params.consigne} onChange={ch("consigne")} aria-label="Consigne" placeholder="Consigne courte" />
        {etiquette("4. Réglages de l'exercice")}
        {params.modele === "graphisme" && <>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={!!params.dessin} onChange={e => set({ dessin: e.target.checked })} /> Dessin à repasser (pirogue et soleil) au lieu de motifs</label>
          {!params.dessin && <>{cases("motifs", MOTIFS)}<div style={{ display: "flex", gap: 6 }}><div style={{ flex: 1 }}>{etiquette("Répétitions")}{nombre("repetitions", 4, 14)}</div><div style={{ flex: 1 }}>{etiquette("Taille")}<select style={champ} value={params.taille} onChange={ch("taille")}><option value="grande">Grande</option><option value="moyenne">Moyenne</option></select></div></div></>}
        </>}
        {params.modele === "suites" && <>{etiquette("Formes")}{cases("formes", FORMES)}{etiquette("Structures")}{cases("structures", Object.fromEntries(Object.keys(STRUCTURES).map(s => [s, s])))}
          <div style={{ display: "flex", gap: 6 }}><div style={{ flex: 1 }}>{etiquette("Lignes")}{nombre("lignes", 1, 5)}</div><div style={{ flex: 1 }}>{etiquette("Formes visibles")}{nombre("visibles", 2, 8)}</div><div style={{ flex: 1 }}>{etiquette("À compléter")}{nombre("aCompleter", 1, 4)}</div></div></>}
        {params.modele === "lettres" && <><select style={champ} value={params.mode} onChange={ch("mode")} aria-label="Type d'exercice"><option value="relier">Relier capitales et minuscules script</option><option value="entourer">Entourer une lettre parmi d'autres</option></select>
          {params.mode === "entourer" ? <input style={champ} value={params.cible} maxLength={1} onChange={e => set({ cible: e.target.value.toUpperCase() })} aria-label="Lettre à entourer" placeholder="Lettre à entourer" /> : <input style={champ} value={params.lettres} onChange={e => set({ lettres: e.target.value.toUpperCase() })} aria-label="Lettres" placeholder="Lettres (ex. AEIOUY)" />}</>}
        {params.modele === "mots" && <><textarea style={{ ...champ, minHeight: 64 }} value={params.mots} onChange={ch("mots")} aria-label="Mots" placeholder="Mots séparés par des virgules (prénom, mots courts)" />
          <div style={{ display: "flex", gap: 6 }}><select style={champ} value={params.mode} onChange={ch("mode")} aria-label="Type d'exercice"><option value="repasser">Lettres à repasser</option><option value="recopier">Modèle à recopier</option><option value="retrouver">Lettres à retrouver</option><option value="reordonner">Lettres à remettre en ordre</option></select>
            <select style={champ} value={params.ecriture} onChange={ch("ecriture")} aria-label="Écriture"><option value="capitales">Capitales d'imprimerie</option><option value="script">Minuscules script</option><option value="cursive" disabled>Cursive (non activée)</option></select></div>
          <div style={{ fontSize: 12, color: C.doux }}>La cursive scolaire attachée n'est pas activée : ses tracés et liaisons n'ont pas encore été vérifiés.</div></>}
        {params.modele === "denombrement" && <><input style={champ} value={Array.isArray(params.quantites) ? params.quantites.join(", ") : params.quantites} onChange={e => set({ quantites: e.target.value })} aria-label="Quantités" placeholder="Quantités de 1 à 6, ex. 3, 1, 5" />{etiquette("Ronds par ligne")}{nombre("ronds", 5, 6)}</>}
        {params.modele === "numeration" && <><select style={champ} value={params.mode} onChange={ch("mode")} aria-label="Type d'exercice"><option value="bande">Bande numérique à compléter</option><option value="repasser">Chiffres à repasser</option></select>
          <div style={{ display: "flex", gap: 6 }}><div style={{ flex: 1 }}>{etiquette("Jusqu'à")}<select style={champ} value={params.fin} onChange={e => set({ fin: Number(e.target.value) })}><option value={5}>5</option><option value={10}>10</option></select></div>{params.mode === "bande" && <><div style={{ flex: 1 }}>{etiquette("Bandes")}{nombre("lignes", 1, 6)}</div><div style={{ flex: 1 }}>{etiquette("Trous")}{nombre("trous", 1, 9)}</div></>}</div></>}
        {etiquette("5. En-tête")}
        <input style={champ} value={params.prenom || ""} onChange={ch("prenom")} aria-label="Prénom (facultatif)" placeholder="Prénom de l'enfant (facultatif)" />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.doux }}><input type="checkbox" checked={garderPrenom} onChange={e => setGarderPrenom(e.target.checked)} /> Conserver le prénom dans le brouillon (sinon il n'est jamais enregistré)</label>
        <div style={{ display: "flex", gap: 12, fontSize: 14 }}><label><input type="checkbox" checked={params.avecDate} onChange={e => set({ avecDate: e.target.checked })} /> Date</label><label><input type="checkbox" checked={params.avecLogo} onChange={e => set({ avecLogo: e.target.checked })} /> Mention Mo Ti-Péyi</label></div>
      </div>

      <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: C.doux, flex: 1 }}>{ficheId ? `Brouillon enregistré · ${STATUTS[statut] || statut}` : "Nouvelle fiche (non enregistrée)"}</div>
          {res.corrige ? <button style={btn(voirCorrige)} onClick={() => setVoirCorrige(v => !v)} aria-pressed={voirCorrige}>{voirCorrige ? "Voir la fiche élève" : "Voir le corrigé"}</button> : <span style={{ fontSize: 12, color: C.doux }}>Corrigé non nécessaire</span>}
        </div>
        <div aria-label="Aperçu de la fiche" style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }} dangerouslySetInnerHTML={{ __html: pageEnSvg(voirCorrige && res.corrige ? res.corrige : res.eleve).replace("<svg ", '<svg width="100%" ') }} />
        {res.erreurs.length > 0 && <div role="alert" style={{ color: C.rouge, fontSize: 13 }}>{res.erreurs.map((e, i) => <div key={i}>⚠️ {e}</div>)}</div>}
        <details open><summary style={{ fontSize: 12, color: C.doux, cursor: "pointer" }}>Vérifications automatiques ({res.verifications.length})</summary>{res.verifications.map((v, i) => <div key={i} style={{ fontSize: 12, color: C.doux }}>✓ {v}</div>)}</details>
        {police === false && <div style={{ color: C.or, fontSize: 12 }}>Police script non chargée : l'aperçu peut différer et l'export PDF sera refusé tant qu'elle n'est pas disponible.</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn(true)} disabled={occupe} onClick={() => enregistrer(false)}>💾 {ficheId ? "Enregistrer les modifications" : "Enregistrer le brouillon"}</button>
          <button style={btn()} disabled={occupe || !ficheId} onClick={() => enregistrer(true)}>⧉ Dupliquer</button>
          <button style={btn()} onClick={() => set({ graine: nouvelleGraine() })}>🎲 Nouvelle variante</button>
          <button style={btn(true)} disabled={occupe || res.erreurs.length > 0} onClick={() => exporter(false)}>📄 Exporter la fiche (PDF)</button>
          {res.corrige && <button style={btn()} disabled={occupe || res.erreurs.length > 0} onClick={() => exporter(true)}>📄 Exporter le corrigé (PDF)</button>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn(statut === "a_relire", C.or)} disabled={!ficheId} onClick={() => changerStatut("a_relire")}>Soumettre à validation</button>
          <button style={btn(statut === "approuve")} disabled={!ficheId} onClick={() => changerStatut("approuve")}>Valider pour les familles</button>
        </div>
        {msg && <div role="status" style={{ fontSize: 13 }}>{msg}</div>}
      </div>
    </div>
  );
}
