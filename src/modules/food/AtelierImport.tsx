"use client";
// ═══════════════════════════════════════════════════════════
// Atelier d'import intelligent — moteur UNIQUE Bella'Food / Vil'Dor.
// Remplace les imports séparés (ancien « Import recette ») : tous les
// fichiers passent par la même file persistante (bibliotheque_fiches),
// la même analyse serveur (/api/food/import/traiter) et la même
// validation humaine dans la Bibliothèque.
//  • Sources : fichiers multiples, photos, appareil photo / scan,
//    dossier, ZIP, Word, PDF, texte collé, dictée, lien (site, Pinterest,
//    Instagram, TikTok, YouTube — dans la limite des contenus accessibles).
//  • Originaux dans le stockage PRIVÉ, empreinte anti-doublon.
//  • File persistante : reprise automatique des éléments en attente à
//    la réouverture (aucune dépendance à une session).
//  • Estimation du coût avant traitement, pause / reprise / annulation.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import { sbFoodGet, sbFoodPatch, sbFoodPost } from "./foodApi";
import { deposerPrive, nomFichierSur } from "../equipe/equipeLib";
import { ACCEPTES, RUBRIQUES_FOOD, rubriqueParNom, sha256, typeDe, lireZip, texteDocx, estimerCout } from "./importLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", bleu: "#60a5fa" };
const ETATS: Record<string, [string, string]> = {
  recu: ["Reçu", C.doux], en_attente: ["En attente", C.doux], analyse: ["Analyse en cours", C.bleu], extraite: ["Extraction terminée", C.bleu],
  doublon: ["Doublon potentiel", C.orange], a_classer: ["À classer", C.orange], a_completer: ["À compléter", C.orange], a_valider: ["À valider", C.or],
  valide: ["Validé", C.ok], erreur: ["Erreur", C.rouge], suspendu: ["IA nécessaire", C.doux],
};
const gros = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 56, padding: "12px 14px", borderRadius: 14, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 15, fontWeight: 800, fontFamily: SA, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" });
const petit = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 46 };
const carte: React.CSSProperties = { background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12 };

type Props = { espace?: "BELLAFOOD" | "VILDOR"; organisationId?: string | null; sourceId?: string | null };
type Prepare = { nom: string; dossier: string; blob: Blob; type: string; texte?: string };

async function jeton() { try { return localStorage.getItem("bellaia_token") || ""; } catch { return ""; } }

const IA_AUTORISEE = false; // décision fondatrice du 19/11 : analyse gratuite uniquement

function Extraction({ d }: { d: any }) {
  if (d.erreur) return <div style={{ fontSize: 12, color: C.rouge }}>{d.erreur}</div>;
  const r = d.recette; const L: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", marginTop: 8 };
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 10, fontSize: 13 }}>
      {d.storage_path && <div style={{ fontSize: 12, color: C.ok }}>📎 Original conservé dans le stockage privé</div>}
      {r ? <>
        {d.recetteNom && <div style={{ fontSize: 12, color: C.doux }}>{d.doublon ? "Recette existante (doublon) : " : "Recette créée (à valider) : "}<b>{d.recetteNom}</b></div>}
        <div style={L}>Rendement · durées</div>
        <div>{r.rendement || "—"} · préparation {r.temps_prepa ?? "—"} min · cuisson {r.temps_cuisson ?? "—"} min{r.temps_repos ? ` · repos ${r.temps_repos} min` : ""}{r.temperature ? ` · ${r.temperature} °C` : ""}</div>
        <div style={L}>Ingrédients ({(r.ingredients || []).length})</div>
        {(r.ingredients || []).map((i: any, k: number) => <div key={k}>• {i.quantite ?? ""} {i.unite || ""} {i.nom}{i.notes ? <span style={{ color: C.orange }}> ({i.notes})</span> : null}</div>)}
        <div style={L}>Étapes ({(r.etapes || []).length})</div>
        {(r.etapes || []).map((e: string, k: number) => <div key={k}>{k + 1}. {e}</div>)}
        {!!(r.materiel || []).length && <><div style={L}>Matériel</div><div>{r.materiel.join(" · ")}</div></>}
        {!!(r.astuces || []).length && <><div style={L}>Astuces</div><div>{r.astuces.join(" ")}</div></>}
      </> : <div style={{ color: C.doux }}>Aucune recette extraite.</div>}
      {!!(d.contradictions || []).length && <><div style={L}>Contradictions</div>{d.contradictions.map((c: any, k: number) => <div key={k} style={{ color: C.orange }}>⚠️ {c.sujet} : {(c.extraits || []).join(" / ")}</div>)}</>}
      {!!(d.informations_manquantes || []).length && <><div style={L}>Informations manquantes</div><div style={{ color: C.doux }}>{d.informations_manquantes.join(" · ")}</div></>}
      <div style={L}>Historique</div>
      {(d.historique || []).map((h: any, k: number) => <div key={k} style={{ fontSize: 12, color: C.doux }}>{new Date(h.le).toLocaleString("fr-FR")} — {h.action}{h.methode ? ` (${h.methode})` : ""}</div>)}
      {d.texte_extrait && <details style={{ marginTop: 8 }}><summary style={{ fontSize: 12, color: C.doux }}>Texte lu dans le PDF</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: C.doux }}>{String(d.texte_extrait).slice(0, 6000)}</pre></details>}
    </div>
  );
}

export default function AtelierImport({ espace = "BELLAFOOD", organisationId = null, sourceId = null }: Props) {
  const [file, setFile] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [prepares, setPrepares] = useState<Prepare[]>([]);
  const [lien, setLien] = useState("");
  const [colle, setColle] = useState("");
  const [msg, setMsg] = useState("");
  const [travail, setTravail] = useState<"repos" | "envoi" | "analyse" | "pause">("repos");
  const [prog, setProg] = useState({ fait: 0, total: 0 });
  const [dicte, setDicte] = useState(false);
  const [recettes, setRecettes] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"sans_ia" | "ia">("sans_ia");
  const [bilan, setBilan] = useState({ sansIA: 0, ia: 0, iaRequise: 0, erreurs: 0, doublons: 0, cout: 0 });
  const [filtre, setFiltre] = useState("tous");
  const cleLot = `bellaia_lot_import_${espace}_${organisationId || ""}`;
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const pauseRef = useRef(false);
  const refFichiers = useRef<HTMLInputElement>(null), refPhotos = useRef<HTMLInputElement>(null), refScan = useRef<HTMLInputElement>(null), refDossier = useRef<HTMLInputElement>(null);
  const filtreEspace = `espace=eq.${espace}${organisationId ? `&organisation_id=eq.${organisationId}` : ""}`;
  const prefixe = espace === "VILDOR" && organisationId ? `organisations/${organisationId}/import` : "bibliotheque/import";

  const charger = async () => {
    try {
      setFile(await sbFoodGet<any>("bibliotheque_fiches", `${filtreEspace}&select=id,titre,nom_fichier,etat,rubrique,rubrique_proposee,confiance,derniere_erreur,methode,cout_estime_eur,type_mime,recette_id,recette_proposee_id,doublon_recette_id,informations_manquantes,drive_id,source_url,storage_path,created_at,traite_le&order=created_at.desc&limit=1000`));
      setRecettes(Object.fromEntries((await sbFoodGet<any>("food_recettes", "select=id,nom&limit=3000").catch(() => [])).map((r: any) => [r.id, r.nom])));
      setLots(await sbFoodGet<any>("food_import_lots", `${filtreEspace}&select=*&order=created_at.desc&limit=20`).catch(() => []));
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  useEffect(() => { charger(); }, [espace, organisationId]);
  const enAttente = file.filter(f => ["recu", "en_attente", "erreur"].includes(f.etat) || (f.etat === "analyse"));

  // ── Préparation locale : ZIP ouverts, Word lus, formats contrôlés
  const preparer = async (liste: FileList | File[] | null, dossierBase = "") => {
    if (!liste) return;
    const out: Prepare[] = []; const refus: string[] = [];
    for (const f of Array.from(liste)) {
      const dossier = dossierBase || ((f as any).webkitRelativePath ? String((f as any).webkitRelativePath).split("/").slice(0, -1).join("/") : "");
      if (!ACCEPTES.test(f.name)) { refus.push(f.name); continue; }
      if (f.size > 50_000_000) { refus.push(`${f.name} (plus de 50 Mo)`); continue; }
      try {
        if (/\.zip$/i.test(f.name)) { for (const e of await lireZip(f)) out.push({ nom: e.nom, dossier: `${f.name}/${e.chemin.split("/").slice(0, -1).join("/")}`.replace(/\/$/, ""), blob: e.blob, type: e.blob.type }); continue; }
        const type = typeDe(f.name, f.type);
        const texte = /\.docx$/i.test(f.name) ? await texteDocx(f) : undefined;
        out.push({ nom: f.name, dossier, blob: f, type, texte });
      } catch (e: any) { refus.push(`${f.name} : ${String(e?.message || e)}`); }
    }
    setPrepares(p => [...p, ...out]);
    setMsg(`${out.length} fichier(s) prêt(s)${refus.length ? ` · refusés : ${refus.slice(0, 5).join(", ")}${refus.length > 5 ? "…" : ""}` : ""}`);
  };

  // ── Envoi : originaux privés + éléments de file
  const envoyer = async () => {
    if (!prepares.length) return;
    setTravail("envoi"); setProg({ fait: 0, total: prepares.length }); pauseRef.current = false;
    const lot = await sbFoodPost<any>("food_import_lots", { espace, organisation_id: organisationId, libelle: `Import du ${new Date().toLocaleString("fr-FR")}`, total: prepares.length, cout_estime_eur: estimerCout(prepares.map(p => ({ type: p.type, taille: p.blob.size, texte: p.texte?.length }))) });
    const lotId = Array.isArray(lot.data) ? lot.data[0]?.id : (lot.data as any)?.id;
    const existantes = new Set((await sbFoodGet<any>("bibliotheque_fiches", `${filtreEspace}&empreinte=not.is.null&select=empreinte&limit=5000`).catch(() => [])).map((x: any) => x.empreinte));
    let faits = 0, ignores = 0, erreurs = 0;
    for (const p of prepares) {
      if (pauseRef.current) break;
      try {
        const emp = await sha256(p.blob);
        if (existantes.has(emp)) { ignores++; } else {
          const chemin = `${prefixe}/${emp.slice(0, 16)}-${nomFichierSur(p.nom)}`;
          await deposerPrive(chemin, p.blob, p.type);
          const r = await sbFoodPost("bibliotheque_fiches", { espace, organisation_id: organisationId, source_id: sourceId, titre: p.nom.replace(/\.[^.]+$/, ""), nom_fichier: p.nom, dossier: p.dossier || null,
            origine: p.type === "application/pdf" ? "pdf" : p.type.startsWith("image/") ? "photo" : /word|msword/.test(p.type) ? "word" : p.dossier.includes(".zip") ? "zip" : "iphone",
            type_mime: p.type, taille_octets: p.blob.size, storage_path: chemin, empreinte: emp, texte_extrait: p.texte?.slice(0, 60000) || null,
            rubrique_proposee: rubriqueParNom(p.nom, p.dossier), etat: "en_attente", statut: "a_importer", import_lot_id: lotId || null });
          if (!r.ok) throw new Error(JSON.stringify(r.error).slice(0, 200));
          existantes.add(emp); faits++;
        }
      } catch (e: any) { erreurs++; setMsg("❌ " + p.nom + " : " + String(e?.message || e)); }
      setProg(x => ({ ...x, fait: x.fait + 1 }));
    }
    if (lotId) await sbFoodPatch("food_import_lots", lotId, { importes: faits, ignores, erreurs, statut: pauseRef.current ? "interrompu" : "en_cours" });
    setPrepares([]); setMsg(`✅ ${faits} fichier(s) enregistré(s) en privé${ignores ? ` · ${ignores} doublon(s) ignoré(s)` : ""}${erreurs ? ` · ${erreurs} erreur(s)` : ""}.`);
    setTravail("repos"); await charger();
  };

  const ajouterLien = async () => {
    const u = lien.trim(); if (!/^https?:\/\//i.test(u)) { setMsg("Collez un lien commençant par https://"); return; }
    const r = await sbFoodPost("bibliotheque_fiches", { espace, organisation_id: organisationId, source_id: sourceId, titre: u.slice(0, 120), source_url: u, origine: "texte", etat: "en_attente", statut: "a_importer", rubrique_proposee: "recette" });
    if (r.ok) { setLien(""); setMsg("✅ Lien ajouté à la file."); charger(); } else setMsg("❌ " + JSON.stringify(r.error).slice(0, 200));
  };
  const ajouterTexte = async () => {
    const t = colle.trim(); if (t.length < 20) { setMsg("Texte trop court."); return; }
    const r = await sbFoodPost("bibliotheque_fiches", { espace, organisation_id: organisationId, source_id: sourceId, titre: t.split("\n")[0].slice(0, 80), texte_extrait: t.slice(0, 60000), origine: "texte", etat: "en_attente", statut: "a_importer", rubrique_proposee: rubriqueParNom(t.slice(0, 300)) });
    if (r.ok) { setColle(""); setMsg("✅ Texte ajouté à la file."); charger(); } else setMsg("❌ " + JSON.stringify(r.error).slice(0, 200));
  };
  const dicter = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setMsg("Dictée intégrée indisponible sur ce navigateur : touchez le champ texte puis le micro du clavier iPhone."); return; }
    const rec = new SR(); rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e: any) => setColle(c => (c + " " + Array.from(e.results).slice(e.resultIndex).map((r: any) => r[0].transcript).join(" ")).trim());
    rec.onend = () => setDicte(false); rec.onerror = () => setDicte(false);
    setDicte(true); rec.start(); (window as any).__dictee = rec;
  };

  // ── Analyse par lots de TOUTE la file (reprend où elle s'est arrêtée)
  //    Mode « sans IA » : 0 €, les documents illisibles sans IA sont
  //    mis de côté (« IA nécessaire »). Mode « IA » : lecture sans IA
  //    d'abord, IA seulement si nécessaire, dans la limite du plafond.
  const aTraiter = (m: string, l = file) => l.filter(f => ["recu", "en_attente", "erreur"].includes(f.etat) || (m === "ia" && f.etat === "suspendu"));
  const analyser = async (auto = false, modeForce?: "sans_ia" | "ia", limite = 0) => {
    const m = IA_AUTORISEE ? (modeForce || mode) : "sans_ia";
    const toute = aTraiter(m); const liste = limite ? toute.slice(0, limite) : toute;
    if (!liste.length) { if (!auto) setMsg("Rien en attente."); try { localStorage.removeItem(cleLot); } catch {} return; }
    if (!auto) {
      const est = m === "ia" ? estimerCout(liste.map(f => ({ type: f.type_mime || (f.drive_id ? "application/pdf" : f.titre?.startsWith("http") ? "lien" : "text/plain"), taille: 300_000 }))) : 0;
      const txt = m === "ia"
        ? `Analyser ${liste.length} élément(s) ?\n\nLecture sans IA d'abord (gratuite). IA uniquement pour les documents illisibles sans IA.\nCoût IA maximal estimé : ${est.toFixed(2)} € — le traitement s'arrête automatiquement au plafond IA (non modifié).\nAucune recette n'est publiée : tout reste « à valider ».`
        : `Analyser ${liste.length} élément(s) SANS IA (0 €) ?\n\nLes documents que l'on ne peut pas lire sans IA seront mis de côté (« IA nécessaire »).\nAucune recette n'est publiée : tout reste « à valider ».`;
      if (!confirm(txt)) return;
    }
    if (!limite) try { localStorage.setItem(cleLot, JSON.stringify({ mode: m, depuis: new Date().toISOString() })); } catch {}
    setTravail("analyse"); pauseRef.current = false; setProg({ fait: 0, total: liste.length });
    const t = await jeton(); let arret = "";
    for (const f of liste) {
      if (pauseRef.current) break;
      try {
        const r = await fetch("/api/food/import/traiter", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ fiche_id: f.id, ia: m === "ia" }) });
        const d = await r.json().catch(() => ({}));
        if (r.status === 429) { arret = "⏸ " + (d.message || "Plafond IA atteint.") + " Le traitement reprendra automatiquement à la prochaine ouverture (plafond non modifié)."; break; }
        if (r.status === 401) { arret = "Session expirée : reconnectez-vous, le traitement reprendra."; break; }
        setBilan(b => ({ sansIA: b.sansIA + (/sans_ia/.test(d.methode || "") ? 1 : 0), ia: b.ia + (/^ia_/.test(d.methode || "") ? 1 : 0), iaRequise: b.iaRequise + (d.ia_requise ? 1 : 0),
          erreurs: b.erreurs + (r.ok ? 0 : 1), doublons: b.doublons + (d.etat === "doublon" ? 1 : 0), cout: b.cout + (Number(d.cout) || 0) }));
        setFile(l => l.map(x => x.id === f.id ? { ...x, etat: d.etat || (r.ok ? x.etat : "erreur"), methode: d.methode || x.methode, cout_estime_eur: d.cout ?? x.cout_estime_eur, derniere_erreur: r.ok ? (d.ia_requise ? d.message : null) : (d.error || x.derniere_erreur) } : x));
      } catch (e: any) { arret = "❌ Connexion interrompue : " + String(e?.message || e) + " — reprise automatique à la prochaine ouverture."; break; }
      setProg(x => ({ ...x, fait: x.fait + 1 }));
    }
    if (!arret && !pauseRef.current) try { localStorage.removeItem(cleLot); } catch {}
    setMsg(arret || (pauseRef.current ? "⏸ En pause." : limite ? `✅ Lot d'essai terminé (${liste.length} document(s)). Ouvrez chaque document ci-dessous (« Voir l'extraction ») pour contrôler la qualité avant de lancer le reste.` : "✅ Lot terminé."));
    setTravail(pauseRef.current || arret ? "pause" : "repos"); await charger();
  };
  // Reprise automatique d'un lot interrompu (fermeture, réseau, plafond du jour)
  const repris = useRef(false);
  useEffect(() => {
    if (repris.current || !file.length || travail !== "repos") return;
    let lot: any = null; try { lot = JSON.parse(localStorage.getItem(cleLot) || "null"); } catch {}
    if (lot && aTraiter(lot.mode).length) { repris.current = true; setMode(lot.mode); setMsg("▶️ Reprise automatique du lot en cours…"); analyser(true, lot.mode); }
  }, [file]);

  const voir = async (f: any) => {
    if (ouvert === f.id) { setOuvert(null); return; }
    setOuvert(f.id); setDetail(null);
    try {
      const [x] = await sbFoodGet<any>("bibliotheque_fiches", `id=eq.${f.id}&select=extraction,informations_manquantes,contradictions,historique,storage_path,methode,texte_extrait`);
      const rid = f.recette_id || f.doublon_recette_id;
      const r = rid ? (await sbFoodGet<any>("food_recettes", `id=eq.${rid}&select=nom,statut,rendement,temps_prepa,temps_cuisson,temps_repos,temperature,ingredients,etapes,materiel,astuces`))[0] : null;
      setDetail({ ...x, recette: x?.extraction || r, recetteNom: r?.nom, recetteStatut: r?.statut, doublon: !!f.doublon_recette_id });
    } catch (e: any) { setDetail({ erreur: String(e?.message || e) }); }
  };

  const reclasser = async (f: any, rubrique: string) => {
    const r = await sbFoodPatch("bibliotheque_fiches", f.id, { rubrique, etat: rubrique === "a_classer" ? "a_classer" : f.etat === "a_classer" ? "a_valider" : f.etat });
    if (r.ok) setFile(l => l.map(x => x.id === f.id ? { ...x, rubrique } : x)); else setMsg("❌ " + r.error);
  };

  const occupe = travail === "envoi" || travail === "analyse";
  const TRAITES = ["a_valider", "valide", "doublon", "a_classer", "a_completer", "extraite"];
  const PARTIEL = (f: any) => (f.informations_manquantes || []).some((x: string) => !/allerg|conservation/i.test(x)) || f.etat === "a_completer";
  const suivi = { traites: file.filter(f => TRAITES.includes(f.etat)).length, partiels: file.filter(f => TRAITES.includes(f.etat) && PARTIEL(f)).length,
    aValider: file.filter(f => f.etat === "a_valider").length, valides: file.filter(f => f.etat === "valide").length, attente: file.filter(f => ["recu", "en_attente", "analyse"].includes(f.etat)).length,
    iaRequise: file.filter(f => f.etat === "suspendu").length, erreurs: file.filter(f => f.etat === "erreur").length, doublons: file.filter(f => f.etat === "doublon").length,
    cout: file.reduce((s, f) => s + (Number(f.cout_estime_eur) || 0), 0) };
  const fileFiltree = file.filter(f => filtre === "tous" || (filtre === "attente" && ["recu", "en_attente", "analyse"].includes(f.etat)) || (filtre === "traites" && TRAITES.includes(f.etat))
    || (filtre === "ia" && f.etat === "suspendu") || (filtre === "erreur" && f.etat === "erreur") || (filtre === "doublon" && f.etat === "doublon"));
  const pct = prog.total ? Math.round(prog.fait / prog.total * 100) : 0;
  const coutPrepares = estimerCout(prepares.map(p => ({ type: p.type, taille: p.blob.size, texte: p.texte?.length })));

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>
        {espace === "VILDOR" ? "Atelier Vil'Dor Pâtisse — vos fichiers restent dans l'espace privé de votre entreprise." : "Tous vos fichiers passent par le même atelier : analyse, classement proposé, recette « à valider », jamais publiée automatiquement."}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={gros()} onClick={() => refFichiers.current?.click()} disabled={occupe}>📄 Fichiers<br /><span style={{ fontSize: 11, color: C.doux, fontWeight: 600 }}>PDF, Word, ZIP, audio…</span></button>
        <button style={gros()} onClick={() => refPhotos.current?.click()} disabled={occupe}>🖼 Photos<br /><span style={{ fontSize: 11, color: C.doux, fontWeight: 600 }}>sélection multiple</span></button>
        <button style={gros()} onClick={() => refScan.current?.click()} disabled={occupe}>📷 Scanner<br /><span style={{ fontSize: 11, color: C.doux, fontWeight: 600 }}>fiche papier</span></button>
        <button style={gros()} onClick={() => refDossier.current?.click()} disabled={occupe}>📁 Dossier<br /><span style={{ fontSize: 11, color: C.doux, fontWeight: 600 }}>ordinateur</span></button>
      </div>
      <input ref={refFichiers} type="file" multiple hidden accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv,.zip,image/*,audio/*,video/*" onChange={e => { preparer(e.target.files); e.target.value = ""; }} />
      <input ref={refPhotos} type="file" multiple hidden accept="image/*" onChange={e => { preparer(e.target.files); e.target.value = ""; }} />
      <input ref={refScan} type="file" hidden accept="image/*" capture="environment" onChange={e => { preparer(e.target.files); e.target.value = ""; }} />
      <input ref={refDossier} type="file" multiple hidden {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => { preparer(e.target.files); e.target.value = ""; }} />
      <div style={{ fontSize: 12, color: C.doux }}>Google Drive et iCloud : le bouton « Fichiers » ouvre l'app Fichiers de l'iPhone, où Drive apparaît comme emplacement.</div>

      {prepares.length > 0 && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{prepares.length} fichier(s) prêt(s) · coût IA estimé ≤ {coutPrepares.toFixed(2)} €</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 180, overflowY: "auto" }}>
            {prepares.slice(0, 60).map((p, i) => <span key={i} style={{ fontSize: 11, border: `1px solid ${C.ligne}`, borderRadius: 99, padding: "3px 8px" }}>{p.type.startsWith("image/") ? "🖼" : p.type === "application/pdf" ? "📄" : /audio/.test(p.type) ? "🎙" : /video/.test(p.type) ? "🎬" : "📃"} {p.nom.slice(0, 28)} · {RUBRIQUES_FOOD.find(r => r[0] === rubriqueParNom(p.nom, p.dossier))?.[1]}</span>)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={petit(true)} onClick={envoyer} disabled={occupe}>⬆️ Enregistrer en privé</button>
            <button style={petit()} onClick={() => setPrepares([])} disabled={occupe}>Annuler</button>
          </div>
        </div>)}

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <b>🔗 Lien (site de recettes, Pinterest, Instagram, TikTok, YouTube)</b>
        <input style={champ} value={lien} onChange={e => setLien(e.target.value)} placeholder="https://…" inputMode="url" />
        <button style={petit(true)} onClick={ajouterLien}>Ajouter à la file</button>
        <div style={{ fontSize: 11, color: C.doux }}>Recette structurée du site lue sans IA. Si la plateforme bloque l'accès : capture d'écran, description ou transcription.</div>
      </div>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <b>📝 Texte libre ou dictée</b>
        <textarea value={colle} onChange={e => setColle(e.target.value)} rows={5} style={{ ...champ, minHeight: 110 }} placeholder="Collez ou dictez une recette, une description, une transcription…" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={petit(true)} onClick={ajouterTexte}>Ajouter à la file</button>
          <button style={petit(dicte, C.rouge)} onClick={() => dicte ? (window as any).__dictee?.stop() : dicter()}>{dicte ? "⏹ Arrêter la dictée" : "🎙 Dicter"}</button>
        </div>
      </div>

      {msg && <div style={{ ...carte, fontSize: 13 }}>{msg}</div>}
      {occupe || travail === "pause" ? (
        <div style={{ ...carte }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{travail === "envoi" ? "Enregistrement" : travail === "analyse" ? "Analyse" : "En pause"} : {prog.fait} / {prog.total}</div>
          <div style={{ height: 8, background: C.ligne, borderRadius: 99 }}><div style={{ height: 8, width: `${pct}%`, background: C.or, borderRadius: 99 }} /></div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {occupe && <button style={petit()} onClick={() => { pauseRef.current = true; }}>⏸ Pause</button>}
            {travail === "pause" && <button style={petit(true)} onClick={() => analyser(true)}>▶️ Reprendre</button>}
          </div>
        </div>) : null}

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <b>📚 Traitement de toute la bibliothèque</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[["Répertoriés", file.length, C.texte], ["Analysés", suivi.traites, C.bleu], ["Partiels", suivi.partiels, C.orange], ["À valider", suivi.aValider, C.or], ["Validés", suivi.valides, C.ok], ["IA nécessaire", suivi.iaRequise, C.doux], ["En attente", suivi.attente, C.doux], ["Doublons", suivi.doublons, C.orange], ["Erreurs", suivi.erreurs, C.rouge]].map(([l, n, c]: any) =>
            <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "6px 8px" }}><div style={{ fontSize: 18, fontWeight: 800, color: c }}>{n}</div><div style={{ fontSize: 11, color: C.doux }}>{l}</div></div>)}
        </div>
        <div style={{ fontSize: 12, color: C.doux }}>Coût cumulé : {suivi.cout.toFixed(2)} €</div>
        <div style={{ height: 8, background: C.ligne, borderRadius: 99 }}><div style={{ height: 8, width: `${file.length ? Math.round(suivi.traites / file.length * 100) : 0}%`, background: C.ok, borderRadius: 99 }} /></div>
        {IA_AUTORISEE ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button style={petit(mode === "sans_ia", C.ok)} onClick={() => setMode("sans_ia")} disabled={occupe}>Sans IA (0 €)</button>
          <button style={petit(mode === "ia", C.bleu)} onClick={() => setMode("ia")} disabled={occupe}>Sans IA puis IA si besoin</button>
        </div> : <div style={{ fontSize: 12, color: C.ok }}>Mode « Sans IA » uniquement (0 €) — aucune analyse payante n'est déclenchée, même si la lecture gratuite échoue.</div>}
        <button style={petit(false, C.ok)} onClick={() => analyser(false, "sans_ia", 5)} disabled={occupe || !aTraiter("sans_ia").length}>🧪 Lot d'essai : 5 documents</button>
        <button style={petit(true, C.ok)} onClick={() => analyser()} disabled={occupe || !aTraiter(IA_AUTORISEE ? mode : "sans_ia").length}>✨ Analyser toutes les fiches en attente ({aTraiter(IA_AUTORISEE ? mode : "sans_ia").length})</button>
        {(bilan.sansIA + bilan.ia + bilan.iaRequise + bilan.erreurs) > 0 && <div style={{ fontSize: 12, color: C.doux }}>Ce lot : {bilan.sansIA} lue(s) sans IA · {bilan.ia} par IA · {bilan.iaRequise} IA nécessaire · {bilan.doublons} doublon(s) · {bilan.erreurs} erreur(s) · {bilan.cout.toFixed(3)} €</div>}
        <div style={{ fontSize: 11, color: C.doux }}>Le traitement continue fiche par fiche et reprend tout seul à la prochaine ouverture. Original PDF conservé en privé. Doublons détectés (aucune recette en double), recettes créées « à valider » : rien n'est publié. Validation dans Bibliothèque → recettes à valider.</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b>Suivi par document ({fileFiltree.length})</b>
        <select style={{ ...champ, width: "auto", minHeight: 38, fontSize: 14 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
          {[["tous", "Tous"], ["attente", "En attente"], ["traites", "Traités"], ["ia", "IA nécessaire"], ["erreur", "Erreurs"], ["doublon", "Doublons"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {fileFiltree.slice(0, 200).map(f => { const [l, c] = ETATS[f.etat] || [f.etat, C.doux]; return (
        <div key={f.id} style={{ ...carte, borderLeft: `4px solid ${c}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 14, wordBreak: "break-word" }}>{f.titre || f.nom_fichier}</b><span style={{ fontSize: 11, fontWeight: 800, color: c, whiteSpace: "nowrap" }}>{l}</span></div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select style={{ ...champ, width: "auto", minHeight: 38, fontSize: 14 }} value={f.rubrique || f.rubrique_proposee || "a_classer"} onChange={e => reclasser(f, e.target.value)}>
              {RUBRIQUES_FOOD.map(([k, n]) => <option key={k} value={k}>{n}{!f.rubrique && f.rubrique_proposee === k ? " (proposé)" : ""}</option>)}
            </select>
            {f.methode && <span style={{ fontSize: 11, color: C.doux }}>{/sans_ia/.test(f.methode) ? "lu sans IA" : f.methode === "ia_requise" ? "IA nécessaire" : f.methode}{` · ${Number(f.cout_estime_eur || 0).toFixed(3)} €`}</span>}
            {(f.recette_id || f.recette_proposee_id) && <span style={{ fontSize: 11, color: C.ok }}>🍽 {recettes[f.recette_id || f.recette_proposee_id] || "recette liée"}{!f.recette_id ? " (proposée)" : ""}</span>}
          </div>
          {f.derniere_erreur && <div style={{ fontSize: 12, color: f.etat === "erreur" ? C.rouge : C.orange }}>{f.derniere_erreur}</div>}
          {f.doublon_recette_id && <div style={{ fontSize: 12, color: C.orange }}>Doublon potentiel de « {recettes[f.doublon_recette_id] || "recette existante"} » : aucune recette créée.</div>}
          {(f.traite_le || f.storage_path) && <button style={{ ...petit(), alignSelf: "flex-start", minHeight: 34 }} onClick={() => voir(f)}>{ouvert === f.id ? "Masquer" : "🔎 Voir l'extraction et l'historique"}</button>}
          {ouvert === f.id && detail && <Extraction d={detail} />}
        </div>); })}
      {!!lots.length && <div style={{ ...carte }}>
        <b>Historique des imports</b>
        {lots.map(l => <div key={l.id} style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>{l.libelle} — {l.importes}/{l.total} enregistré(s){l.ignores ? `, ${l.ignores} doublon(s)` : ""}{l.erreurs ? `, ${l.erreurs} erreur(s)` : ""} · {l.statut}</div>)}
      </div>}
    </div>
  );
}
