"use client";
// ═══════════════════════════════════════════════════════════
// Boutique cliente refondue (moteur commun, identité par univers).
// Bannières, catégories illustrées, collections, nouveautés, recherche,
// filtres et tri, favoris, fiches produits, recommandations, panier.
// Données RÉELLES lues dans les vues publiques (jamais de prix d'achat
// ni d'information fournisseur). Règles conservées : un produit Food non
// conforme (allergènes) reste non commandable ; « Sur devis » n'a pas
// de prix inventé. Le paiement n'est pas branché dans l'aperçu.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { THEMES, type Theme } from "./boutiquesThemes";
import { Illustration } from "./illustrations";
import { sbSelect } from "../events/eventsAtelierLib";
import { useDonneesFood, OptionsFood, PanierFood, type LigneFood } from "./CommandeFood";

export type Produit = { commandableVue?: boolean; id: string; nom: string; categorie: string; prix: number | null; prixPromo?: number | null; description?: string | null; photo?: string | null; commandable: boolean; mention?: string | null; prixNote?: string | null; unite?: string | null; nouveau?: boolean };
const euros = (n: number) => n.toFixed(2).replace(".", ",") + " €";

export async function chargerProduits(code: string): Promise<Produit[]> {
  if (code === "BSH" || code === "ODYSSEE") {
    const r = await sbSelect<any>("v_catalogue_public", `univers=eq.${code}&select=id,nom,categorie,prix_vente,image_url,composition,usage_conseils,created_at&order=created_at.desc&limit=500`);
    const recents = r.slice(0, 24).map(x => x.id);
    return r.map(x => ({ id: x.id, nom: x.nom, categorie: x.categorie || "Autres", prix: x.prix_vente != null ? Number(x.prix_vente) : null, photo: x.image_url, description: x.usage_conseils || x.composition, commandable: x.prix_vente > 0, nouveau: recents.includes(x.id) }));
  }
  if (code === "FOOD") {
    const r = await sbSelect<any>("v_catalogue_food_public", "select=id,nom,categorie_slug,description_courte,prix,prix_promotion,galerie_photos,commandable,mention&order=ordre.asc.nullslast&limit=300");
    return r.map(x => ({ id: x.id, nom: x.nom, categorie: x.categorie_slug || "autre", prix: x.prix != null ? Number(x.prix) : null, prixPromo: x.prix_promotion, description: x.description_courte, photo: Array.isArray(x.galerie_photos) ? x.galerie_photos[0] : null, commandableVue: x.commandable !== false, commandable: x.commandable !== false && x.prix > 0, mention: x.mention }));
  }
  const r = await sbSelect<any>("events_catalogue", "statut=eq.actif&visible_client=eq.true&select=id,nom,categorie,description,prix_unitaire,unite,prix_note&order=ordre.asc.nullslast&limit=300");
  return r.map(x => ({ id: x.id, nom: x.nom, categorie: x.categorie, prix: x.prix_unitaire != null ? Number(x.prix_unitaire) : null, description: x.description, prixNote: x.prix_note, unite: x.unite, commandable: true }));
}

export default function BoutiqueVitrine({ univers, produits: initiaux, theme: themeForce, commandeReelle = false, onSuivi }: { univers: string; produits?: Produit[]; theme?: Theme; commandeReelle?: boolean; onSuivi?: () => void }) {
  const t = themeForce || THEMES[univers];
  const [produits, setProduits] = useState<Produit[]>(initiaux || []);
  const [charge, setCharge] = useState(!initiaux);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("tous"); const [tri, setTri] = useState("pertinence");
  const [favs, setFavs] = useState<string[]>([]); const [voirFavs, setVoirFavs] = useState(false);
  const [panier, setPanier] = useState<Record<string, number>>({}); const [fiche, setFiche] = useState<Produit | null>(null); const [ouvrirPanier, setOuvrirPanier] = useState(false);
  const refGrille = useRef<HTMLDivElement>(null);
  // Parcours de commande réel Bella'Food (prévisualisation) : tailles, base, allergènes, envoi serveur
  const food = commandeReelle && univers === "FOOD";
  const donneesFood = useDonneesFood(food ? produits : []);
  const [lignesFood, setLignesFood] = useState<LigneFood[]>([]);
  useEffect(() => { if (!food) return; setProduits(ps => ps.map(p => { const vs = (donneesFood.variantes[p.id] || []).filter(v => v.prix != null); const min = vs.length ? Math.min(...vs.map(v => Number(v.prix))) : null;
    return { ...p, commandable: p.commandableVue !== false && ((p.prix ?? 0) > 0 || vs.length > 0), prixNote: p.prix == null && min != null ? `dès ${euros(min)}` : p.prixNote }; })); }, [food, donneesFood.variantes]);
  const ajouterFood = (l: Omit<LigneFood, "qte">) => setLignesFood(ls => ls.some(x => x.cle === l.cle) ? ls.map(x => x.cle === l.cle ? { ...x, qte: Math.min(20, x.qte + 1) } : x) : [...ls, { ...l, qte: 1 }]);
  const cleFav = `bellaia_favoris_${univers}`;
  useEffect(() => { if (!initiaux) chargerProduits(univers).then(setProduits).catch(() => setProduits([])).finally(() => setCharge(false)); try { setFavs(JSON.parse(localStorage.getItem(cleFav) || "[]")); } catch {} }, [univers]);
  const basculerFav = (id: string) => setFavs(f => { const n = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; try { localStorage.setItem(cleFav, JSON.stringify(n)); } catch {} return n; });
  const ajouter = (p: Produit, n = 1) => { if (!p.commandable) return; setPanier(x => ({ ...x, [p.id]: (x[p.id] || 0) + n })); };
  const categories = useMemo(() => { const c: Record<string, number> = {}; produits.forEach(p => { c[p.categorie] = (c[p.categorie] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k); }, [produits]);
  const info = (c: string) => t.categories[c] || { libelle: c, motif: t.motifDefaut, palette: t.paletteDefaut };
  const filtrer = (f: any) => produits.filter(p => (!f.categorie || p.categorie === f.categorie) && (!f.prixMax || (p.prix != null && p.prix <= f.prixMax)) && (!f.nouveautes || p.nouveau) && (!f.mot || new RegExp(f.mot, "i").test(p.nom)));
  const visibles = useMemo(() => {
    let l = produits.filter(p => (cat === "tous" || p.categorie === cat) && (!voirFavs || favs.includes(p.id)) && (!q || p.nom.toLowerCase().includes(q.toLowerCase())));
    if (tri === "prix_asc") l = [...l].sort((a, b) => (a.prix ?? 1e9) - (b.prix ?? 1e9)); else if (tri === "prix_desc") l = [...l].sort((a, b) => (b.prix ?? -1) - (a.prix ?? -1)); else if (tri === "nouveautes") l = [...l].sort((a, b) => Number(!!b.nouveau) - Number(!!a.nouveau));
    else l = [...l].sort((a, b) => Number(b.commandable) - Number(a.commandable));
    return l;
  }, [produits, cat, voirFavs, favs, q, tri]);
  const nbPanier = food ? lignesFood.reduce((s, l) => s + l.qte, 0) : Object.values(panier).reduce((s, n) => s + n, 0);
  const total = food ? lignesFood.reduce((s, l) => s + l.prix * l.qte, 0) : Object.entries(panier).reduce((s, [id, n]) => { const p = produits.find(x => x.id === id); return s + (p?.prixPromo ?? p?.prix ?? 0) * n; }, 0);
  const sombre = t.code === "BSH";
  const aller = (f?: string) => { if (f && f !== "nouveautes" && categories.includes(f)) setCat(f); else if (f === "nouveautes") setTri("nouveautes"); else if (f) setQ(f); refGrille.current?.scrollIntoView({ behavior: "smooth" }); };

  const Visuel = ({ p, taille = "100%" as any, r = t.rayon }: { p: Produit; taille?: any; r?: number }) => p.photo
    ? <img src={p.photo} alt={p.nom} loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: r, display: "block", background: "#fff" }} />
    : <Illustration motif={info(p.categorie).motif} palette={info(p.categorie).palette} graine={p.id} taille={taille} rond={r} />;
  const Prix = ({ p, gros = false }: { p: Produit; gros?: boolean }) => {
    if (p.prix == null) return <span style={{ fontSize: gros ? 16 : 12.5, fontWeight: 800, color: t.prixCouleur }}>{p.prixNote || "Sur devis"}</span>;
    const promo = p.prixPromo != null && p.prixPromo < p.prix;
    return <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
      {t.code === "EVENTS" && p.prixNote && /partir/i.test(p.prixNote) && <span style={{ fontSize: 11, color: t.doux }}>dès</span>}
      <span style={{ fontSize: gros ? 22 : t.code === "FOOD" ? 17 : 15, fontWeight: 900, color: promo ? t.accent : t.prixCouleur, fontFamily: t.code === "ODYSSEE" ? t.corps : undefined }}>{euros(promo ? p.prixPromo! : p.prix)}</span>
      {promo && <s style={{ fontSize: 12, color: t.doux }}>{euros(p.prix)}</s>}</span>;
  };
  const Carte = ({ p, large = false }: { p: Produit; large?: boolean }) => (
    <div onClick={() => setFiche(p)} style={{ position: "relative", width: large ? 150 : "auto", flex: large ? "none" : undefined, background: t.surface, borderRadius: t.rayon, border: t.code === "ODYSSEE" ? "none" : `1px solid ${t.ligne}`, overflow: "hidden", cursor: "pointer", boxShadow: t.code === "FOOD" ? "0 6px 18px rgba(42,35,22,0.08)" : "none" }}>
      <div style={{ position: "relative" }}><Visuel p={p} r={0} />
        {p.nouveau && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", background: sombre ? t.accent : t.texte, color: sombre ? "#1a0a10" : t.fond, padding: "3px 7px", borderRadius: t.code === "ODYSSEE" ? 0 : 99 }}>Nouveau</span>}
        {p.prixPromo != null && p.prix != null && p.prixPromo < p.prix && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 900, background: t.accent, color: "#fff", padding: "3px 8px", borderRadius: 99 }}>-{Math.round((1 - p.prixPromo / p.prix) * 100)} %</span>}
        <button aria-label="Favori" onClick={e => { e.stopPropagation(); basculerFav(p.id); }} style={{ position: "absolute", top: 6, right: 6, width: 34, height: 34, borderRadius: 99, border: "none", background: sombre ? "rgba(11,7,9,0.6)" : "rgba(255,255,255,0.85)", color: favs.includes(p.id) ? t.accent : (sombre ? "#fff" : t.texte), fontSize: 17, cursor: "pointer" }}>{favs.includes(p.id) ? "♥" : "♡"}</button>
      </div>
      <div style={{ padding: t.densite === "dense" ? "8px 9px 10px" : "10px 12px 12px" }}>
        {t.code === "ODYSSEE" && <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: t.doux }}>{info(p.categorie).libelle}</div>}
        <div style={{ fontSize: t.code === "FOOD" ? 14.5 : 13, fontWeight: t.code === "FOOD" ? 800 : 600, color: t.texte, lineHeight: 1.25, height: 33, overflow: "hidden", fontFamily: t.code === "EVENTS" ? t.titres : t.corps }}>{p.nom}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 6 }}><Prix p={p} />
          {t.code === "BSH" || t.code === "FOOD" ? <button onClick={e => { e.stopPropagation(); if (food) setFiche(p); else ajouter(p); }} disabled={!p.commandable} style={{ minWidth: 34, height: 34, borderRadius: 99, border: "none", background: p.commandable ? t.accent : t.ligne, color: t.code === "BSH" ? "#1a0a10" : "#fff", fontWeight: 900, fontSize: t.code === "FOOD" ? 13 : 20, padding: t.code === "FOOD" ? "0 12px" : 0, cursor: p.commandable ? "pointer" : "default" }}>{t.code === "FOOD" ? (p.commandable ? "＋" : "—") : "+"}</button> : null}
        </div>
        {!p.commandable && p.mention && <div style={{ fontSize: 10.5, color: t.doux, marginTop: 4, fontStyle: "italic", lineHeight: 1.3 }}>{p.mention}</div>}
      </div>
    </div>);

  if (charge) return <div style={{ background: t.fond, minHeight: "100vh", color: t.doux, padding: 30, fontFamily: t.corps }}>Chargement de la boutique…</div>;
  return (
    <div style={{ background: t.fond, color: t.texte, fontFamily: t.corps, minHeight: "100vh", paddingBottom: nbPanier ? 92 : 30 }}>
      {/* En-tête */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: sombre ? "rgba(11,7,9,0.94)" : t.code === "FOOD" ? t.accent : "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", padding: "10px 14px", borderBottom: `1px solid ${t.ligne}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={t.logo} alt="" style={{ width: 36, height: 36, borderRadius: t.code === "ODYSSEE" ? 0 : 99, objectFit: "cover", border: `1px solid ${t.ligne}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.titres, fontSize: t.code === "ODYSSEE" ? 17 : 18, fontWeight: 600, letterSpacing: t.code === "ODYSSEE" ? 3 : 0.3, textTransform: t.code === "ODYSSEE" ? "uppercase" : "none", color: t.code === "FOOD" ? "#fff" : sombre ? t.accent2 : t.texte }}>{t.nom}</div>
            <div style={{ fontSize: 10.5, color: t.code === "FOOD" ? "rgba(255,255,255,0.85)" : t.doux }}>{t.accroche}</div>
          </div>
          <button onClick={() => { setVoirFavs(v => !v); aller(); }} style={{ background: "none", border: "none", fontSize: 21, color: t.code === "FOOD" ? "#fff" : voirFavs ? t.accent : t.texte }}>{voirFavs ? "♥" : "♡"}</button>
          <button onClick={() => setOuvrirPanier(true)} style={{ position: "relative", background: "none", border: "none", fontSize: 21, color: t.code === "FOOD" ? "#fff" : t.texte }}>{t.code === "EVENTS" ? "📝" : "🛍"}{nbPanier > 0 && <span style={{ position: "absolute", top: -4, right: -6, background: t.code === "FOOD" ? t.accent2 : t.accent, color: t.code === "BSH" ? "#1a0a10" : t.code === "FOOD" ? t.texte : "#fff", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "1px 5px" }}>{nbPanier}</span>}</button>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.code === "FOOD" ? "Une envie ? Burger, barquette, jus…" : t.code === "EVENTS" ? "Faire-part, urne, décoration…" : "Rechercher un produit"} style={{ marginTop: 9, width: "100%", boxSizing: "border-box", height: 40, borderRadius: t.code === "ODYSSEE" ? 0 : 99, border: `1px solid ${t.code === "FOOD" ? "transparent" : t.ligne}`, background: sombre ? "rgba(255,255,255,0.06)" : "#fff", color: t.texte, padding: "0 14px", fontSize: 16, fontFamily: t.corps }} />
      </div>
      {/* Bandeau réassurance */}
      <div style={{ display: "flex", gap: 18, justifyContent: "center", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, background: sombre ? "#1a0a10" : t.code === "FOOD" ? "#3f4a20" : t.code === "ODYSSEE" ? "#151014" : t.accent, color: sombre ? t.accent : t.code === "FOOD" ? "#efe2b8" : "#fff", overflowX: "auto", whiteSpace: "nowrap" }}>{t.bandeau.map(b => <span key={b}>✓ {b}</span>)}</div>

      {/* Bannières */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", padding: "12px 14px 4px", WebkitOverflowScrolling: "touch" }}>
        {t.bannieres.map(b => <div key={b.titre} onClick={() => aller(b.filtre)} style={{ flex: "none", width: "86%", scrollSnapAlign: "center", position: "relative", borderRadius: t.code === "ODYSSEE" ? 0 : t.rayon + 6, overflow: "hidden", minHeight: 170, cursor: "pointer", background: `linear-gradient(120deg, ${b.palette[0]}, ${b.palette[1]})` }}>
          <div style={{ position: "absolute", right: -18, bottom: -18, opacity: 0.95 }}><Illustration motif={b.motif} palette={[b.palette[1], b.palette[0], b.palette[2]]} graine={b.titre} taille={170} rond={999} /></div>
          <div style={{ position: "relative", padding: 16, maxWidth: "62%", color: t.code === "ODYSSEE" && b.palette[0] === "#f7d9e3" ? "#151014" : "#fff" }}>
            <div style={{ fontFamily: t.titres, fontSize: 23, fontWeight: 600, lineHeight: 1.1 }}>{b.titre}</div>
            <div style={{ fontSize: 12.5, marginTop: 6, opacity: 0.9 }}>{b.sous}</div>
            <span style={{ display: "inline-block", marginTop: 12, padding: "8px 14px", borderRadius: t.code === "ODYSSEE" ? 0 : 99, background: t.code === "FOOD" ? "#fff" : sombre ? t.accent : "rgba(255,255,255,0.92)", color: t.code === "FOOD" ? t.accent : sombre ? "#1a0a10" : "#151014", fontWeight: 900, fontSize: 12.5, textTransform: t.code === "ODYSSEE" ? "uppercase" : "none", letterSpacing: t.code === "ODYSSEE" ? 1.5 : 0 }}>{b.cta}</span>
          </div>
        </div>)}
      </div>

      {/* Catégories illustrées */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 14px 2px" }}>
        {categories.map(c => { const i = info(c); return <button key={c} onClick={() => { setCat(cat === c ? "tous" : c); aller(); }} style={{ flex: "none", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 72, cursor: "pointer", color: t.texte }}>
          <div style={{ width: 66, height: 66, borderRadius: t.code === "ODYSSEE" ? 0 : t.code === "EVENTS" ? 14 : 99, overflow: "hidden", outline: cat === c ? `2px solid ${t.accent}` : "none", outlineOffset: 2 }}><Illustration motif={i.motif} palette={i.palette} graine={c} taille={66} rond={0} /></div>
          <span style={{ fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{i.libelle}</span></button>; })}
      </div>

      {/* Collections */}
      {t.collections.map(col => { const l = filtrer(col.filtre).slice(0, 10); if (l.length < 2) return null; return <div key={col.titre} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 14px" }}><div style={{ fontFamily: t.titres, fontSize: t.code === "FOOD" ? 19 : 18, fontWeight: 600, textTransform: t.code === "ODYSSEE" ? "uppercase" : "none", letterSpacing: t.code === "ODYSSEE" ? 2 : 0 }}>{col.titre}</div><span style={{ fontSize: 12, color: t.accent, fontWeight: 700 }}>{filtrer(col.filtre).length} articles</span></div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "8px 14px 4px" }}>{l.map(p => <Carte key={p.id} p={p} large />)}</div></div>; })}

      {/* Tous les produits */}
      <div ref={refGrille} style={{ padding: "18px 14px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: t.titres, fontSize: 19, fontWeight: 600 }}>{voirFavs ? "Mes favoris" : cat === "tous" ? (t.code === "FOOD" ? "Toute la carte" : "Tous les produits") : info(cat).libelle} <span style={{ fontSize: 12, color: t.doux, fontWeight: 400 }}>({visibles.length})</span></div>
          <select value={tri} onChange={e => setTri(e.target.value)} style={{ height: 34, borderRadius: 99, border: `1px solid ${t.ligne}`, background: t.surface, color: t.texte, fontSize: 13, padding: "0 10px" }}>
            <option value="pertinence">Pertinence</option><option value="nouveautes">Nouveautés</option><option value="prix_asc">Prix croissant</option><option value="prix_desc">Prix décroissant</option></select>
        </div>
        {cat !== "tous" && <button onClick={() => setCat("tous")} style={{ marginTop: 8, border: `1px solid ${t.ligne}`, background: "none", color: t.texte, borderRadius: 99, padding: "5px 11px", fontSize: 12 }}>✕ {info(cat).libelle}</button>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${t.colonnes}, 1fr)`, gap: t.densite === "dense" ? 8 : 12, marginTop: 10 }}>{visibles.slice(0, 60).map(p => <Carte key={p.id} p={p} />)}</div>
        {!visibles.length && <div style={{ padding: 30, textAlign: "center", color: t.doux }}>{voirFavs ? "Aucun favori pour l'instant : touchez ♡ sur un produit." : "Aucun produit ne correspond."}</div>}
      </div>

      {/* Barre panier */}
      {nbPanier > 0 && !ouvrirPanier && <button onClick={() => setOuvrirPanier(true)} style={{ position: "fixed", left: 14, right: 14, bottom: "max(14px, env(safe-area-inset-bottom))", height: 56, borderRadius: t.code === "ODYSSEE" ? 0 : 99, border: "none", background: t.code === "FOOD" ? t.accent : sombre ? t.accent : t.texte, color: sombre ? "#1a0a10" : "#fff", fontWeight: 900, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 30 }}>
        <span>{nbPanier} article{nbPanier > 1 ? "s" : ""}</span><span>{t.code === "EVENTS" ? "Voir ma demande" : "Voir le panier"} · {euros(total)}</span></button>}

      {/* Fiche produit */}
      {fiche && <Feuille t={t} fermer={() => setFiche(null)}>
        <div style={{ borderRadius: t.rayon, overflow: "hidden" }}><Visuel p={fiche} /></div>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: t.doux, marginTop: 12 }}>{info(fiche.categorie).libelle}</div>
        <div style={{ fontFamily: t.titres, fontSize: 22, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{fiche.nom}</div>
        <div style={{ marginTop: 8 }}><Prix p={fiche} gros /></div>
        {fiche.description && <div style={{ fontSize: 14, color: t.doux, marginTop: 10, lineHeight: 1.5 }}>{fiche.description}</div>}
        {!fiche.commandable && fiche.mention && <div style={{ marginTop: 10, fontSize: 13, padding: 10, borderRadius: 10, background: t.ligne }}>{fiche.mention} — ce produit sera commandable dès que sa fiche sera complète.</div>}
        {food && <OptionsFood key={fiche.id} t={t} p={fiche} variantes={donneesFood.variantes[fiche.id] || []} allergenes={donneesFood.allergenes[fiche.id]} ajouter={l => { ajouterFood(l); setFiche(null); }} />}
        {!food && <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => basculerFav(fiche.id)} style={{ width: 52, height: 52, borderRadius: t.code === "ODYSSEE" ? 0 : 99, border: `1px solid ${t.ligne}`, background: "none", color: favs.includes(fiche.id) ? t.accent : t.texte, fontSize: 22 }}>{favs.includes(fiche.id) ? "♥" : "♡"}</button>
          <button disabled={!fiche.commandable} onClick={() => { ajouter(fiche); setFiche(null); }} style={{ flex: 1, height: 52, borderRadius: t.code === "ODYSSEE" ? 0 : 99, border: "none", background: fiche.commandable ? (sombre ? t.accent : t.code === "FOOD" ? t.accent : t.texte) : t.ligne, color: sombre ? "#1a0a10" : "#fff", fontWeight: 900, fontSize: 15, textTransform: t.code === "ODYSSEE" ? "uppercase" : "none", letterSpacing: t.code === "ODYSSEE" ? 1.5 : 0 }}>{fiche.prix == null && t.code === "EVENTS" ? "Ajouter à ma demande de devis" : t.ctaAjout === "+" ? "Ajouter au panier" : t.ctaAjout}</button>
        </div>}
        {(() => { const reco = produits.filter(p => p.categorie === fiche.categorie && p.id !== fiche.id).slice(0, 8); return reco.length ? <><div style={{ fontFamily: t.titres, fontSize: 17, marginTop: 18 }}>Vous aimerez aussi</div><div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 8 }}>{reco.map(p => <div key={p.id} onClick={() => setFiche(p)} style={{ width: 120, flex: "none", cursor: "pointer" }}><Visuel p={p} /><div style={{ fontSize: 12, marginTop: 4, height: 30, overflow: "hidden" }}>{p.nom}</div><Prix p={p} /></div>)}</div></> : null; })()}
      </Feuille>}

      {/* Panier */}
      {ouvrirPanier && food && <Feuille t={t} fermer={() => setOuvrirPanier(false)}><PanierFood t={t} lignes={lignesFood} setLignes={setLignesFood} onSuivi={onSuivi} /></Feuille>}
      {ouvrirPanier && !food && <Feuille t={t} fermer={() => setOuvrirPanier(false)}>
        <div style={{ fontFamily: t.titres, fontSize: 22, fontWeight: 600 }}>{t.code === "EVENTS" ? "Ma demande" : "Mon panier"}</div>
        {!nbPanier && <div style={{ color: t.doux, marginTop: 12 }}>Votre panier est vide.</div>}
        {Object.entries(panier).map(([id, n]) => { const p = produits.find(x => x.id === id); if (!p) return null; return <div key={id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.ligne}` }}>
          <div style={{ width: 56, flex: "none" }}><Visuel p={p} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nom}</div><Prix p={p} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => setPanier(x => { const y = { ...x }; y[id] = (y[id] || 0) - 1; if (y[id] <= 0) delete y[id]; return y; })} style={qte(t)}>−</button><b>{n}</b><button onClick={() => ajouter(p)} style={qte(t)}>+</button></div></div>; })}
        {nbPanier > 0 && <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 900, marginTop: 14 }}><span>Total</span><span>{euros(total)}{Object.keys(panier).some(id => produits.find(p => p.id === id)?.prix == null) ? " + devis" : ""}</span></div>
          <button disabled style={{ marginTop: 14, width: "100%", height: 54, borderRadius: t.code === "ODYSSEE" ? 0 : 99, border: "none", background: sombre ? t.accent : t.code === "FOOD" ? t.accent : t.texte, color: sombre ? "#1a0a10" : "#fff", fontWeight: 900, fontSize: 15, opacity: 0.55 }}>{t.ctaPanier}</button>
          <div style={{ fontSize: 12, color: t.doux, marginTop: 8, textAlign: "center" }}>Aperçu de la nouvelle boutique : la validation de commande reste celle de la boutique actuelle jusqu'à la mise en ligne.</div>
        </>}
      </Feuille>}
    </div>
  );
}
const qte = (t: Theme): React.CSSProperties => ({ width: 32, height: 32, borderRadius: 99, border: `1px solid ${t.ligne}`, background: "none", color: t.texte, fontSize: 16 });

function Feuille({ t, fermer, children }: { t: Theme; fermer: () => void; children: React.ReactNode }) {
  return <div onClick={fermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: t.code === "BSH" ? "#140910" : "#fff", color: t.texte, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: t.code === "ODYSSEE" ? 0 : "22px 22px 0 0", padding: "10px 16px max(24px, env(safe-area-inset-bottom))", fontFamily: t.corps }}>
      <div style={{ width: 42, height: 5, borderRadius: 99, background: t.ligne, margin: "0 auto 12px" }} />
      <button onClick={fermer} aria-label="Fermer" style={{ float: "right", background: "none", border: "none", fontSize: 22, color: t.doux, marginTop: -6, minWidth: 44, minHeight: 44 }}>✕</button>
      {children}
    </div></div>;
}
