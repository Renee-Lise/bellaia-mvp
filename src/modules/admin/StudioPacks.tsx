"use client";
// ═══════════════════════════════════════════════════════════
// Administration → Packs administratifs (studio de papeterie).
// • Univers : référentiel dynamique (business_units) ; packs dédiés pour
//   Studio, BSH, Food, Even's, Odyssée, Vilo'Assistance, Vil'Dor
//   (simulation) ; thème généré pour tout autre univers.
// • Documents : devis, facture, bon de commande, fiche de vente, bon de
//   livraison — à partir du catalogue réel de l'univers OU d'une de vos
//   pièces existantes (données réelles, sans ressaisie).
// • Personnalisation (couleurs, titres, ornement, slogan) enregistrée en
//   BROUILLON avec historique ; validation graphique par la fondatrice.
// • Les pièces déjà émises ne sont jamais modifiées.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { sbSelect, SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";
import { THEMES_PACKS, themeDe, miseEnPagePack, pdfPack, type ThemePack } from "./packsAdmin";
import { dessinerPage } from "./pdfPiece";
import { pieceExemple, lignesDepuisCatalogue, TYPES_PACK } from "./packsExemples";
import { normaliserLignes } from "./piecesTypes";

const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c" };
const SA = "system-ui, -apple-system, sans-serif";
const btn = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 42, padding: "9px 13px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
const STUDIO_LIGNES = { STUDIO: [{ d: "Création d'identité visuelle", pu: null, u: "forfait" }, { d: "Mise en page de document", pu: null, u: "forfait" }], VILO: [{ d: "Accompagnement aux démarches administratives", pu: null, u: "heure" }, { d: "Constitution et suivi de dossier", pu: null, u: "dossier" }] } as Record<string, any[]>;

async function lignesCatalogue(code: string) {
  try {
    if (code === "FOOD") return (await sbSelect("catalogue_produits", "business_unit=eq.FOOD&statut=eq.actif&prix=gt.0&select=nom,prix&order=ordre.asc.nullslast&limit=5")).map((r: any) => ({ d: r.nom, pu: Number(r.prix) }));
    if (code === "BSH" || code === "ODYSSEE") return (await sbSelect("stocks", `univers=eq.${code}&statut=eq.actif&prix_vente=gt.0&select=nom,prix_vente&limit=5`)).map((r: any) => ({ d: r.nom, pu: Number(r.prix_vente) }));
    if (code === "EVENTS") return (await sbSelect("events_catalogue", "statut=eq.actif&select=*&order=ordre.asc.nullslast&limit=5")).map((r: any) => ({ d: r.nom, pu: r.prix_unitaire ?? null, u: r.unite || "unité" }));
    if (code === "VILDOR") return (await sbSelect("food_revente_produits", "select=nom,prix_revente_centimes&order=ordre.asc.nullslast&limit=5")).map((r: any) => ({ d: r.nom, pu: r.prix_revente_centimes != null ? r.prix_revente_centimes / 100 : null }));
  } catch { /* catalogue indisponible */ }
  return STUDIO_LIGNES[code] || [{ d: "Prestation", pu: null, u: "forfait" }];
}

export default function StudioPacks() {
  const [unites, setUnites] = useState<any[]>([]);
  const [code, setCode] = useState("FOOD");
  const [type, setType] = useState("devis");
  const [source, setSource] = useState<string>("exemple");
  const [pieces, setPieces] = useState<any[]>([]);
  const [em, setEm] = useState<any>(null);
  const [perso, setPerso] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");
  const [essai, setEssai] = useState<Partial<ThemePack>>({});
  const [pages, setPages] = useState(0);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const largeur = typeof window !== "undefined" ? Math.min(window.innerWidth - 36, 560) : 390;

  useEffect(() => { (async () => {
    try {
      const [u, e, p, k] = await Promise.all([
        sbSelect("business_units", "select=code,nom,couleur&order=ordre.asc"),
        sbSelect("bellaia_emetteurs", "bu=eq.GENERAL&select=*").catch(() => []),
        sbSelect("bellaia_pieces", "select=id,type,numero,objet,date_document,date_echeance,destinataire,champs,lignes,remise_pct,acompte,conditions,mentions,bu,statut&order=created_at.desc&limit=200").catch(() => []),
        sbSelect("bellaia_packs_admin", "select=*").catch(() => []),
      ]);
      setUnites(u); setEm(e[0] || null); setPieces(p); setPerso(Object.fromEntries((k || []).map((x: any) => [x.univers, x])));
    } catch (er: any) { setMsg("❌ " + String(er?.message || er)); }
  })(); }, []);

  const base = useMemo(() => themeDe(code, unites.find(u => u.code === code)), [code, unites]);
  const theme: ThemePack = useMemo(() => ({ ...base, ...(perso[code]?.theme || {}), ...essai }), [base, perso, code, essai]);
  const piecesType = pieces.filter(p => p.type === type && (p.bu === code || code === "STUDIO" && (!p.bu || p.bu === "GENERAL")));

  const pieceCourante = async () => {
    if (source !== "exemple") { const p = pieces.find(x => x.id === source); if (p) return { ...p, univers: p.bu, lignes: normaliserLignes(p.lignes), _modele: false }; }
    return pieceExemple(type, lignesDepuisCatalogue(await lignesCatalogue(code)), code);
  };
  useEffect(() => { let vivant = true; (async () => {
    const m = await miseEnPagePack(await pieceCourante(), em, theme); if (!vivant) return;
    setPages(m.pages.length); setTimeout(() => m.pages.forEach((_, i) => { const cv = refs.current[i]; if (cv) dessinerPage(m, i, cv, largeur); }), 0);
  })().catch(e => setMsg("❌ " + String(e?.message || e))); return () => { vivant = false; }; }, [theme, type, source, em, code]);

  const telecharger = async () => {
    const blob = await pdfPack(await pieceCourante(), em, theme);
    const nom = `${theme.nom.replace(/[^A-Za-z0-9]+/g, "-")}-${type}${source === "exemple" ? "-modele" : ""}.pdf`;
    const f = new File([blob], nom, { type: "application/pdf" });
    if ((navigator as any).canShare?.({ files: [f] })) { try { await (navigator as any).share({ files: [f], title: nom }); return; } catch { /* annulé */ } }
    const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  };
  const enregistrer = async (patch: Partial<ThemePack> | null, statut?: "brouillon" | "valide") => {
    const actuel = perso[code]; const nouveau = patch === null ? {} : { ...(actuel?.theme || {}), ...patch };
    const versions = [...(actuel?.versions || []), ...(actuel ? [{ le: new Date().toISOString(), theme: actuel.theme, statut: actuel.statut }] : [])].slice(-20);
    const ligne = { univers: code, theme: nouveau, statut: statut || "brouillon", versions, valide_le: statut === "valide" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    try {
      const t = await jeton();
      const r = await fetch(`${SB_URL}/rest/v1/bellaia_packs_admin?on_conflict=univers`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(ligne) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPerso(x => ({ ...x, [code]: ligne })); setMsg(statut === "valide" ? "✅ Pack validé." : "✅ Variante enregistrée en brouillon.");
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const restaurer = () => { const v = perso[code]?.versions || []; if (!v.length) { setMsg("Aucune version précédente."); return; } const der = v[v.length - 1]; enregistrer(der.theme || null); };

  const listeUnivers = [...THEMES_PACKS.map(t => t.code), ...unites.map(u => u.code).filter(c => !THEMES_PACKS.some(t => t.code === c) && c !== "GENERAL")];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA, color: C.texte }}>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>Une collection graphique par univers, appliquée à vos vraies pièces (mêmes calculs, même numérotation, mêmes mentions). Les modèles restent en <b>brouillon</b> jusqu'à votre validation graphique ; les pièces déjà émises ne changent jamais.</div>
      {msg && <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12, color: C.doux }}>Univers<select style={champ} value={code} onChange={e => { setCode(e.target.value); setSource("exemple"); setEssai({}); }}>{listeUnivers.map(c => <option key={c} value={c}>{themeDe(c, unites.find(u => u.code === c)).nom}{perso[c]?.statut === "valide" ? " ✓" : ""}</option>)}</select></label>
        <label style={{ fontSize: 12, color: C.doux }}>Document<select style={champ} value={type} onChange={e => { setType(e.target.value); setSource("exemple"); }}>{TYPES_PACK.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <label style={{ fontSize: 12, color: C.doux }}>Données<select style={champ} value={source} onChange={e => setSource(e.target.value)}>
        <option value="exemple">Exemple tiré du catalogue réel</option>
        {piecesType.map(p => <option key={p.id} value={p.id}>{p.numero || "Brouillon"} — {p.destinataire?.nom || p.objet || "sans titre"}</option>)}
      </select></label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn(true)} onClick={telecharger}>⬇️ PDF / partager</button>
        <span style={{ fontSize: 12, color: perso[code]?.statut === "valide" ? C.ok : C.orange, alignSelf: "center" }}>{perso[code]?.statut === "valide" ? "Pack validé" : "Brouillon — en attente de votre validation graphique"}</span>
      </div>

      <details style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10 }}>
        <summary style={{ fontWeight: 800, cursor: "pointer" }}>🎨 Personnaliser ce pack</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {(["principale", "secondaire", "accent", "fond"] as const).map(k => <label key={k} style={{ fontSize: 12, color: C.doux }}>Couleur {k}<input type="color" value={theme[k]} onChange={e => setEssai(x => ({ ...x, [k]: e.target.value }))} style={{ ...champ, padding: 4 }} /></label>)}
          <label style={{ fontSize: 12, color: C.doux }}>Titres<select style={champ} value={theme.serif ? "serif" : "sans"} onChange={e => setEssai(x => ({ ...x, serif: e.target.value === "serif" }))}><option value="serif">Élégants (serif)</option><option value="sans">Modernes (sans serif)</option></select></label>
          <label style={{ fontSize: 12, color: C.doux }}>Ornement<select style={champ} value={theme.ornement} onChange={e => setEssai(x => ({ ...x, ornement: e.target.value as any }))}>{[["filets", "Filets"], ["losanges", "Losanges"], ["pois", "Pois"], ["feuilles", "Points"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
        <label style={{ fontSize: 12, color: C.doux, display: "block", marginTop: 8 }}>Signature (sous le nom)<input style={champ} defaultValue={theme.slogan} key={code} onChange={e => setEssai(x => ({ ...x, slogan: e.target.value }))} /></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button style={btn(true)} disabled={!Object.keys(essai).length} onClick={async () => { await enregistrer(essai); setEssai({}); }}>💾 Enregistrer le brouillon</button>
          <button style={btn()} onClick={restaurer}>↩️ Version précédente</button>
          <button style={btn()} onClick={() => { setEssai({}); enregistrer(null); }}>Thème d'origine</button>
          <button style={btn(true, C.ok)} onClick={() => confirm(`Valider la collection graphique ${theme.nom} ?`) && enregistrer(essai, "valide").then(() => setEssai({}))}>✓ Valider ce pack</button>
        </div>
      </details>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {Array.from({ length: pages }).map((_, i) => <canvas key={i} ref={el => { refs.current[i] = el; }} style={{ borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,0.4)", maxWidth: "100%" }} />)}
      </div>
    </div>
  );
}
