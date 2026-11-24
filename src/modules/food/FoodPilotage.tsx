"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Food — Pilotage de la fondatrice (24/11/2026)
//  ☀️ Offre du jour : cases à cocher par grande catégorie, prix et quantité du jour, menus composés,
//     sélection collective, duplication, programmation, prévisualisation, validation, publication.
//  🗂 Catégories : 12 grandes catégories illustrées, sous-catégories, recherche, compteurs réels,
//     aperçu du reclassement AVANT application (recettes, identifiants et historiques intacts).
//  🥫 Sauces : sauces repas / desserts, association de plusieurs sauces compatibles par produit.
//  💶 Tarifs : grille de la fondatrice + estimations PROVISOIRES + calcul indicatif ; rien n'est
//     écrit sans cocher puis confirmer ; un prix confirmé n'est jamais écrasé.
//  🛡 Conformité : masquage RÉVERSIBLE (porc, alcool), variantes compatibles en brouillon.
// Tables existantes uniquement (catalogue_produits, catalogue_variantes, food_menu_jour) : aucune migration.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbFoodGet, sbFoodPatch, sbFoodPost } from "./foodApi";
import { CATEGORIES, classer, alertes, SAUCES, saucesCompatibles, type CategorieId } from "./hierarchieCatalogue";
import {
  dateCayenne, basculerPlat, basculerPlusieurs, dupliquerJournee, controlerOffre, cleMenu, estElementProduit,
  GRILLE_24_11, estimationProvisoire, tarifIndicatif, patchTarif, aMasquer, patchMasquage, patchRetablissement,
  VARIANTES_COMPATIBLES, ligneVariante, type ElementOffre, type PropositionTarif, type ProduitCatalogue,
} from "./offreFood";

type P = ProduitCatalogue & { sous_categorie?: string | null; recette_id?: string | null };
type V = { id: string; produit_id: string; nom: string; prix: number | null; disponible: boolean };
type Onglet = "offre" | "categories" | "sauces" | "tarifs" | "conformite";

const C = { fond: "#0f1a10", carte: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f5f0e8", doux: "rgba(245,240,232,0.65)", or: "#c9a96e", vert: "#4ade80", rouge: "#f87171", orange: "#fbbf24" };
const btn = (actif = false, couleur = C.or): React.CSSProperties => ({ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${actif ? couleur : C.ligne}`, background: actif ? couleur + "26" : "transparent", color: actif ? couleur : C.texte, fontWeight: 700, fontSize: 14, cursor: "pointer" });
const champ: React.CSSProperties = { minHeight: 44, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.ligne}`, background: "rgba(255,255,255,0.06)", color: C.texte, fontSize: 16, width: "100%", boxSizing: "border-box" };
const euros = (n: number | null | undefined) => n == null ? "—" : n.toFixed(2).replace(".", ",") + " €";
const categorieDe = (p: P): CategorieId => (p.metadata?.hierarchie?.categorie as CategorieId) || classer(p).categorie;
const sousCategorieDe = (p: P) => p.metadata?.hierarchie?.sous_categorie || classer(p).sous_categorie;

/** Grandes tuiles de catégories (lisibles sur iPhone : 2 colonnes, 96 px de haut, compteurs réels). */
function Tuiles({ produits, actif, onChoisir, compte }: { produits: P[]; actif: CategorieId | null; onChoisir: (c: CategorieId | null) => void; compte?: (c: CategorieId) => string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
    {CATEGORIES.map(c => { const n = produits.filter(p => categorieDe(p) === c.id).length; const on = actif === c.id;
      return <button key={c.id} data-testid={`tuile-${c.id}`} onClick={() => onChoisir(on ? null : c.id)} disabled={!n}
        style={{ minHeight: 96, borderRadius: 16, border: `2px solid ${on ? C.or : C.ligne}`, background: on ? C.or + "22" : C.carte, color: n ? C.texte : C.doux, opacity: n ? 1 : 0.45, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: n ? "pointer" : "default", padding: 8 }}>
        <span style={{ fontSize: 32 }}>{c.ico}</span><span style={{ fontSize: 15, fontWeight: 800, textAlign: "center" }}>{c.libelle}</span><span style={{ fontSize: 12, color: C.doux }}>{compte ? compte(c.id) : `${n} produit(s)`}</span>
      </button>; })}
  </div>;
}

export default function FoodPilotage() {
  const [onglet, setOnglet] = useState<Onglet>("offre");
  const [produits, setProduits] = useState<P[]>([]); const [variantes, setVariantes] = useState<V[]>([]);
  const [charge, setCharge] = useState(true); const [msg, setMsg] = useState("");
  const charger = async () => {
    setCharge(true);
    const [ps, vs] = await Promise.all([
      sbFoodGet<P>("catalogue_produits", "business_unit=eq.FOOD&select=id,nom,prix,statut,visible_client,disponible,categorie_slug,sous_categorie,allergenes,metadata,recette_id&order=nom.asc&limit=1000"),
      sbFoodGet<V>("catalogue_variantes", "select=id,produit_id,nom,prix,disponible&limit=2000"),
    ]);
    setProduits(ps.map(p => ({ ...p, prix: p.prix != null ? Number(p.prix) : null }))); setVariantes(vs.map(v => ({ ...v, prix: v.prix != null ? Number(v.prix) : null }))); setCharge(false);
  };
  useEffect(() => { charger(); }, []);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 6000); };
  const ONGLETS: [Onglet, string][] = [["offre", "☀️ Offre du jour"], ["categories", "🗂 Catégories"], ["sauces", "🥫 Sauces"], ["tarifs", "💶 Tarifs à valider"], ["conformite", "🛡 Conformité"]];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, color: C.texte, fontFamily: "system-ui,sans-serif" }}>
    <div role="tablist" aria-label="Pilotage Bella'Food" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {ONGLETS.map(([k, l]) => <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)} style={{ ...btn(onglet === k), flexShrink: 0 }}>{l}</button>)}
    </div>
    {msg && <div role="status" style={{ padding: 12, borderRadius: 12, background: C.carte, border: `1px solid ${C.or}`, fontSize: 14 }}>{msg}</div>}
    {charge ? <div style={{ color: C.doux }}>Chargement du catalogue…</div> : <>
      {onglet === "offre" && <OffreDuJour produits={produits} flash={flash} />}
      {onglet === "categories" && <Categories produits={produits} recharger={charger} flash={flash} />}
      {onglet === "sauces" && <Sauces produits={produits} recharger={charger} flash={flash} />}
      {onglet === "tarifs" && <Tarifs produits={produits} variantes={variantes} recharger={charger} flash={flash} />}
      {onglet === "conformite" && <Conformite produits={produits} recharger={charger} flash={flash} />}
    </>}
  </div>;
}

// ── ☀️ Offre du jour ────────────────────────────────────────
function OffreDuJour({ produits, flash }: { produits: P[]; flash: (m: string) => void }) {
  const [date, setDate] = useState(dateCayenne());
  const [ligne, setLigne] = useState<{ id?: string; statut: "brouillon" | "publie"; items: any[]; lieux?: any[] } | null>(null);
  const [cat, setCat] = useState<CategorieId | null>(null); const [q, setQ] = useState(""); const [seulsCoches, setSeulsCoches] = useState(false);
  const [apercu, setApercu] = useState(false); const [menuEdit, setMenuEdit] = useState<{ nom: string; prix: string; ids: string[] } | null>(null);
  const [cible, setCible] = useState(""); const [occupe, setOccupe] = useState(false);
  const charger = async () => { const r = await sbFoodGet<any>("food_menu_jour", `date=eq.${date}&order=created_at.desc&limit=1`); setLigne(r[0] ? { id: r[0].id, statut: r[0].statut, items: Array.isArray(r[0].items) ? r[0].items : [], lieux: r[0].lieux } : { statut: "brouillon", items: [] }); };
  useEffect(() => { setLigne(null); charger(); }, [date]);
  const items: ElementOffre[] = (ligne?.items || []).filter(estElementProduit);
  const libres = (ligne?.items || []).filter(i => !estElementProduit(i));      // anciens éléments en texte libre : conservés
  const setItems = (f: (x: ElementOffre[]) => ElementOffre[]) => setLigne(l => l ? { ...l, items: [...libres, ...f(items)] } : l);
  const coche = (id: string) => items.some(i => i.type === "plat" && i.produit_id === id);
  const proposables = produits.filter(p => p.statut === "actif");
  const visibles = proposables.filter(p => (!cat || categorieDe(p) === cat) && (!q || p.nom.toLowerCase().includes(q.toLowerCase())) && (!seulsCoches || coche(p.id)));
  const anomalies = controlerOffre(items, produits); const bloquantes = anomalies.filter(a => a.bloquant);
  const passee = date < dateCayenne();
  const enregistrer = async (statut: "brouillon" | "publie") => {
    if (!ligne) return; setOccupe(true);
    const corps = { date, items: [...libres, ...items], statut };
    const r = ligne.id ? await sbFoodPatch("food_menu_jour", ligne.id, corps) : await sbFoodPost<any>("food_menu_jour", { ...corps, lieux: [] });
    setOccupe(false);
    if (!r.ok) return flash("⚠️ Enregistrement impossible : " + ((r as any).error?.message || (r as any).error || "erreur"));
    flash(statut === "publie" ? `✅ Offre du ${date} publiée : ${items.length} élément(s). Les clientes ne voient que cette sélection.` : "✅ Brouillon enregistré (non visible des clientes).");
    charger();
  };
  const dupliquer = async () => {
    if (!cible || !ligne) return; const d = dupliquerJournee({ date, statut: ligne.statut, items: ligne.items }, cible);
    const ex = await sbFoodGet<any>("food_menu_jour", `date=eq.${cible}&limit=1`);
    if (ex[0] && !confirm(`Une journée existe déjà le ${cible}. La remplacer par cette sélection (en brouillon) ?`)) return;
    const r = ex[0] ? await sbFoodPatch("food_menu_jour", ex[0].id, { items: d.items, statut: "brouillon" }) : await sbFoodPost<any>("food_menu_jour", { date: cible, items: d.items, lieux: ligne.lieux || [], statut: "brouillon" });
    flash(r.ok ? `✅ Journée dupliquée vers le ${cible} (brouillon à valider).` : "⚠️ Duplication impossible.");
  };
  if (!ligne) return <div style={{ color: C.doux }}>Lecture de la journée…</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <label style={{ fontSize: 14 }}>Journée <input aria-label="Date de l'offre" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...champ, width: "auto" }} /></label>
      <span data-testid="statut-offre" style={{ padding: "6px 12px", borderRadius: 99, background: ligne.statut === "publie" ? C.vert + "33" : C.carte, color: ligne.statut === "publie" ? C.vert : C.doux, fontWeight: 800, fontSize: 13 }}>{ligne.statut === "publie" ? "Publiée" : "Brouillon"}</span>
      <span style={{ fontSize: 13, color: C.doux }}>{items.filter(i => i.type === "plat").length} plat(s) · {items.filter(i => i.type === "menu").length} menu(s)</span>
    </div>
    {passee && <div style={{ color: C.orange, fontSize: 13 }}>Date passée : cette offre n'est plus visible ni commandable (retrait automatique).</div>}
    <Tuiles produits={proposables} actif={cat} onChoisir={setCat} compte={c => { const l = proposables.filter(p => categorieDe(p) === c); return `${l.filter(p => coche(p.id)).length} / ${l.length} cochés`; }} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input aria-label="Rechercher un produit" placeholder="Rechercher un produit…" value={q} onChange={e => setQ(e.target.value)} style={{ ...champ, flex: "1 1 200px", width: "auto" }} />
      <button style={btn(seulsCoches)} onClick={() => setSeulsCoches(x => !x)}>☑️ Cochés seulement</button>
      <button style={btn()} onClick={() => setItems(x => basculerPlusieurs(x, visibles.filter(p => !alertes(p).length), true))}>Tout cocher ({visibles.length})</button>
      <button style={btn()} onClick={() => setItems(x => basculerPlusieurs(x, visibles, false))}>Tout décocher</button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {visibles.map(p => { const el = items.find(i => i.type === "plat" && i.produit_id === p.id); const al = alertes(p); const interdit = al.some(a => a.type === "alcool" || !/vérifier/.test(a.motif));
        return <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 10, borderRadius: 12, background: el ? C.vert + "14" : C.carte, border: `1px solid ${el ? C.vert + "66" : C.ligne}` }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", flex: "1 1 220px", fontSize: 15, cursor: interdit ? "not-allowed" : "pointer" }}>
            <input type="checkbox" aria-label={`Proposer ${p.nom}`} checked={!!el} disabled={interdit && !el} onChange={e => setItems(x => basculerPlat(x, p, e.target.checked))} style={{ width: 26, height: 26 }} />
            <span><b>{p.nom}</b><br /><span style={{ fontSize: 12, color: C.doux }}>{sousCategorieDe(p)} · catalogue {euros(p.prix)}{!p.allergenes?.length ? " · allergènes à renseigner" : ""}</span>{al.length > 0 && <span style={{ display: "block", fontSize: 12, color: interdit ? C.rouge : C.orange }}>⚠️ {al.map(a => a.motif).join(" ; ")}</span>}</span>
          </label>
          {el && <><label style={{ fontSize: 12 }}>Prix du jour<input aria-label={`Prix du jour ${p.nom}`} inputMode="decimal" style={{ ...champ, width: 96 }} value={el.prix ?? ""} placeholder={p.prix != null ? String(p.prix) : "—"} onChange={e => { const v = e.target.value.replace(",", "."); setItems(x => x.map(i => i.cle === el.cle ? { ...i, prix: v === "" ? null : Number(v) } : i)); }} /></label>
            <label style={{ fontSize: 12 }}>Quantité<input aria-label={`Quantité ${p.nom}`} inputMode="numeric" style={{ ...champ, width: 84 }} value={el.quantite ?? ""} placeholder="∞" onChange={e => setItems(x => x.map(i => i.cle === el.cle ? { ...i, quantite: e.target.value === "" ? null : parseInt(e.target.value, 10) } : i))} /></label></>}
        </div>; })}
      {!visibles.length && <div style={{ color: C.doux }}>Aucun produit pour ce filtre.</div>}
    </div>
    <div style={{ padding: 12, borderRadius: 14, border: `1px solid ${C.ligne}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>🍱 Menus de la journée</div>
      <div style={{ fontSize: 12, color: C.doux }}>Un produit placé dans un menu n'est pas proposé seul pour autant.</div>
      {items.filter(i => i.type === "menu").map(m => <div key={m.cle} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b>{m.nom}</b> — {euros(m.prix ?? null)} · {(m.composition || []).map(c => c.nom).join(" + ")}<button style={btn()} onClick={() => setItems(x => x.filter(i => i.cle !== m.cle))}>Retirer</button></div>)}
      {!menuEdit ? <button style={btn()} onClick={() => setMenuEdit({ nom: "", prix: "", ids: [] })}>+ Composer un menu</button> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input aria-label="Nom du menu" placeholder="Nom du menu (ex. Formule midi)" value={menuEdit.nom} onChange={e => setMenuEdit({ ...menuEdit, nom: e.target.value })} style={champ} />
          <input aria-label="Prix du menu" inputMode="decimal" placeholder="Prix du menu (€)" value={menuEdit.prix} onChange={e => setMenuEdit({ ...menuEdit, prix: e.target.value })} style={champ} />
          <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>{proposables.filter(p => !alertes(p).length).map(p => <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" style={{ width: 22, height: 22 }} checked={menuEdit.ids.includes(p.id)} onChange={e => setMenuEdit({ ...menuEdit, ids: e.target.checked ? [...menuEdit.ids, p.id] : menuEdit.ids.filter(x => x !== p.id) })} />{p.nom}</label>)}</div>
          <div style={{ display: "flex", gap: 8 }}><button style={btn(true)} disabled={!menuEdit.nom.trim() || menuEdit.ids.length < 2} onClick={() => { const prix = Number(menuEdit.prix.replace(",", ".")); setItems(x => [...x.filter(i => i.cle !== cleMenu(menuEdit.nom)), { cle: cleMenu(menuEdit.nom), type: "menu", nom: menuEdit.nom.trim(), prix: prix > 0 ? prix : null, quantite: null, composition: menuEdit.ids.map(id => ({ produit_id: id, nom: produits.find(p => p.id === id)?.nom || "" })) }]); setMenuEdit(null); }}>Ajouter le menu</button><button style={btn()} onClick={() => setMenuEdit(null)}>Annuler</button></div>
        </div>}
    </div>
    {anomalies.length > 0 && <div data-testid="anomalies-offre" style={{ padding: 12, borderRadius: 12, border: `1px solid ${bloquantes.length ? C.rouge : C.orange}`, fontSize: 13 }}>{anomalies.map((a, k) => <div key={k} style={{ color: a.bloquant ? C.rouge : C.orange }}>{a.bloquant ? "⛔" : "⚠️"} {a.message}</div>)}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={btn()} disabled={occupe} onClick={() => enregistrer("brouillon")}>💾 Enregistrer le brouillon</button>
      <button style={btn(apercu)} onClick={() => setApercu(x => !x)}>👁 Prévisualiser côté client</button>
      <button data-testid="publier-offre" style={btn(true, C.vert)} disabled={occupe || bloquantes.length > 0 || passee} onClick={() => confirm(`Publier l'offre du ${date} ? Les clientes verront uniquement ces ${items.length} élément(s).`) && enregistrer("publie")}>✅ Valider et publier</button>
      {ligne.statut === "publie" && <button style={btn(false, C.rouge)} onClick={() => enregistrer("brouillon")}>Retirer la publication</button>}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 13 }}>Dupliquer cette journée vers</span><input aria-label="Date cible" type="date" value={cible} onChange={e => setCible(e.target.value)} style={{ ...champ, width: "auto" }} /><button style={btn()} disabled={!cible} onClick={dupliquer}>Dupliquer</button></div>
    {apercu && <div data-testid="apercu-client" style={{ padding: 14, borderRadius: 16, background: "#f7f3ea", color: "#1c2246" }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Ce que verra la cliente le {date}</div>
      {!items.length ? <div>Aucun plat proposé.</div> : items.map(i => <div key={i.cle} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5dccb" }}><span>{i.type === "menu" ? "🍱 " : ""}{i.nom}{i.quantite != null ? ` (${i.quantite} portions)` : ""}</span><b>{euros(i.prix ?? produits.find(p => p.id === i.produit_id)?.prix ?? null)}</b></div>)}
    </div>}
  </div>;
}

// ── 🗂 Catégories (lot 3) ───────────────────────────────────
function Categories({ produits, recharger, flash }: { produits: P[]; recharger: () => void; flash: (m: string) => void }) {
  const [cat, setCat] = useState<CategorieId | null>(null); const [q, setQ] = useState(""); const [sc, setSc] = useState(""); const [apercu, setApercu] = useState(false); const [occupe, setOccupe] = useState(false);
  const liste = produits.filter(p => (!cat || categorieDe(p) === cat) && (!q || p.nom.toLowerCase().includes(q.toLowerCase())) && (!sc || sousCategorieDe(p) === sc));
  const sousCats = useMemo(() => [...new Set(produits.filter(p => !cat || categorieDe(p) === cat).map(sousCategorieDe))].sort(), [produits, cat]);
  const changements = produits.map(p => ({ p, c: classer(p) })).filter(({ p, c }) => p.metadata?.hierarchie?.categorie !== c.categorie || p.metadata?.hierarchie?.sous_categorie !== c.sous_categorie);
  const appliquer = async () => {
    if (!confirm(`Appliquer le classement à ${changements.length} produit(s) ? Seul le classement d'affichage change : recettes, identifiants et historiques restent intacts.`)) return;
    setOccupe(true); let ok = 0;
    for (const { p, c } of changements) { const r = await sbFoodPatch("catalogue_produits", p.id, { metadata: { ...(p.metadata || {}), hierarchie: { categorie: c.categorie, sous_categorie: c.sous_categorie, motif: c.motif, a_valider: c.a_valider, le: new Date().toISOString() } } }); if (r.ok) ok++; }
    setOccupe(false); flash(`✅ ${ok} / ${changements.length} produit(s) reclassé(s).`); recharger();
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <Tuiles produits={produits} actif={cat} onChoisir={c => { setCat(c); setSc(""); }} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input aria-label="Rechercher dans le catalogue" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} style={{ ...champ, flex: "1 1 200px", width: "auto" }} />
      <select aria-label="Sous-catégorie" value={sc} onChange={e => setSc(e.target.value)} style={{ ...champ, width: "auto" }}><option value="">Toutes les sous-catégories</option>{sousCats.map(s => <option key={s}>{s}</option>)}</select></div>
    <div data-testid="compteur-categorie" style={{ fontSize: 14, color: C.doux }}>{liste.length} produit(s){cat ? ` dans « ${CATEGORIES.find(c => c.id === cat)?.libelle} »` : ""}</div>
    {liste.slice(0, 200).map(p => <div key={p.id} style={{ padding: 10, borderRadius: 12, background: C.carte, fontSize: 14 }}><b>{p.nom}</b> <span style={{ color: C.doux }}>· {CATEGORIES.find(c => c.id === categorieDe(p))?.libelle} › {sousCategorieDe(p)} · {p.statut}</span></div>)}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={btn(apercu)} onClick={() => setApercu(x => !x)}>👁 Aperçu du reclassement ({changements.length})</button>
      {apercu && changements.length > 0 && <button data-testid="appliquer-classement" style={btn(true)} disabled={occupe} onClick={appliquer}>Appliquer le classement</button>}</div>
    {apercu && <div data-testid="apercu-classement" style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>{changements.map(({ p, c }) => <div key={p.id} style={{ color: c.a_valider ? C.orange : C.texte }}>{p.nom} : {p.categorie_slug || "—"} → <b>{CATEGORIES.find(x => x.id === c.categorie)?.libelle} › {c.sous_categorie}</b>{c.a_valider ? " (à valider)" : ""}</div>)}{!changements.length && <div style={{ color: C.vert }}>Tout est déjà classé.</div>}</div>}
  </div>;
}

// ── 🥫 Sauces (lot 4) ───────────────────────────────────────
function Sauces({ produits, recharger, flash }: { produits: P[]; recharger: () => void; flash: (m: string) => void }) {
  const [sel, setSel] = useState<string>(""); const [choix, setChoix] = useState<string[]>([]); const [occupe, setOccupe] = useState(false);
  const p = produits.find(x => x.id === sel); const permises = p ? saucesCompatibles(p) : [];
  useEffect(() => { setChoix(Array.isArray(p?.metadata?.sauces) ? p!.metadata.sauces : []); }, [sel]);
  const existantes = new Set(produits.filter(x => x.categorie_slug === "sauce" || /^sauce /i.test(x.nom)).map(x => x.nom.toLowerCase()));
  const manquantes = SAUCES.filter(s => !existantes.has(("sauce " + s.nom).toLowerCase()));
  const creerFiches = async () => {
    if (!confirm(`Créer ${manquantes.length} fiche(s) sauce en BROUILLON (non visibles, sans prix, composition et allergènes à compléter) ?`)) return;
    setOccupe(true); let ok = 0;
    for (const s of manquantes) { const r = await sbFoodPost<any>("catalogue_produits", { business_unit: "FOOD", nom: `Sauce ${s.nom}`, categorie_slug: "sauce", unite: "portion", prix: null, statut: "brouillon", visible_client: false, disponible: false, metadata: { famille_sauce: s.famille, hierarchie: { categorie: "sauces", sous_categorie: s.famille === "repas" ? "Sauces repas" : "Sauces desserts" }, a_renseigner: ["composition", "allergenes", "prix_pot_0_30", "bouteille_33cl_3"] } }); if (r.ok) ok++; }
    setOccupe(false); flash(`✅ ${ok} fiche(s) sauce créée(s) en brouillon.`); recharger();
  };
  const enregistrer = async () => { if (!p) return; const r = await sbFoodPatch("catalogue_produits", p.id, { metadata: { ...(p.metadata || {}), sauces: choix } }); flash(r.ok ? `✅ ${choix.length} sauce(s) associée(s) à « ${p.nom} ».` : "⚠️ Enregistrement impossible."); recharger(); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {(["repas", "dessert"] as const).map(f => <div key={f}><div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{f === "repas" ? "🍗 Sauces repas" : "🍰 Sauces desserts"}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SAUCES.filter(s => s.famille === f).map(s => <span key={s.nom} style={{ padding: "8px 12px", borderRadius: 99, background: C.carte, border: `1px solid ${C.ligne}`, fontSize: 13 }}>{s.nom}</span>)}</div></div>)}
    {manquantes.length > 0 && <button style={btn()} disabled={occupe} onClick={creerFiches}>Créer les {manquantes.length} fiches sauces manquantes en brouillon</button>}
    <div style={{ fontWeight: 800, fontSize: 15 }}>Associer des sauces à un produit</div>
    <select aria-label="Produit" value={sel} onChange={e => setSel(e.target.value)} style={champ}><option value="">Choisir un produit…</option>{produits.filter(x => saucesCompatibles(x).length).map(x => <option key={x.id} value={x.id}>{x.nom}</option>)}</select>
    {p && <><div style={{ fontSize: 13, color: C.doux }}>Seules les sauces adaptées à « {CATEGORIES.find(c => c.id === categorieDe(p))?.libelle} » sont proposées. Une sauce au choix est incluse avec un repas.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{permises.map(s => <button key={s} aria-pressed={choix.includes(s)} onClick={() => setChoix(c => c.includes(s) ? c.filter(x => x !== s) : [...c, s])} style={btn(choix.includes(s))}>{s}</button>)}</div>
      <button style={btn(true)} onClick={enregistrer}>Enregistrer les sauces ({choix.length})</button></>}
  </div>;
}

// ── 💶 Tarifs (point 2) ─────────────────────────────────────
function Tarifs({ produits, variantes, recharger, flash }: { produits: P[]; variantes: V[]; recharger: () => void; flash: (m: string) => void }) {
  const lignes = useMemo(() => {
    const parNom = new Map(produits.map(p => [p.nom, p]));
    const g = GRILLE_24_11.map(x => ({ ...x }));
    const estim = produits.filter(p => p.prix == null).map(p => estimationProvisoire(p)).filter(Boolean) as PropositionTarif[];
    return [...g, ...estim.filter(e => !g.some(x => x.nom === e.nom))].map((x, k) => {
      const prod = parNom.get(x.produit || x.nom); const vari = x.variante && prod ? variantes.find(v => v.produit_id === prod.id && v.nom === x.variante) : undefined;
      const actuel = x.cible === "variante" ? vari?.prix ?? x.actuel : x.cible === "produit" ? prod?.prix ?? x.actuel : null;
      const confirme = prod?.metadata?.prix?.statut === "confirme";
      const existe = x.cible === "creation" ? (x.variante ? !!(prod && variantes.some(v => v.produit_id === prod.id && v.nom === x.variante)) : parNom.has(x.nom)) : !!(x.cible === "variante" ? vari : prod);
      return { k, ...x, actuel, prod, vari, confirme, existe, inchange: actuel != null && actuel === x.propose };
    });
  }, [produits, variantes]);
  const [coches, setCoches] = useState<Record<number, boolean>>({}); const [valeurs, setValeurs] = useState<Record<number, string>>({}); const [occupe, setOccupe] = useState(false);
  const [calc, setCalc] = useState({ ingredients: "", conditionnement: "", minutes: "", tauxHoraire: "", marge: "40" });
  const res = tarifIndicatif({ ingredients: +calc.ingredients.replace(",", "."), conditionnement: +calc.conditionnement.replace(",", ".") || 0, minutes: +calc.minutes || 0, tauxHoraire: +calc.tauxHoraire.replace(",", ".") || 0, marge: (+calc.marge || 0) / 100 });
  const applicables = lignes.filter(l => coches[l.k] && !l.confirme && !l.inchange);
  const appliquer = async () => {
    if (!confirm(`Écrire ${applicables.length} tarif(s) dans le catalogue ? L'ancien prix est conservé dans l'historique de chaque fiche.`)) return;
    setOccupe(true); let ok = 0; const erreurs: string[] = [];
    for (const l of applicables) {
      const v = Number((valeurs[l.k] ?? String(l.propose ?? "")).replace(",", ".")); if (!(v > 0)) { erreurs.push(`${l.nom} : prix invalide`); continue; }
      if (l.cible === "variante" && l.vari) { const r = await sbFoodPatch("catalogue_variantes", l.vari.id, { prix: v }); r.ok ? ok++ : erreurs.push(l.nom); continue; }
      if (l.cible === "creation" && l.variante && l.prod) { const r = await sbFoodPost<any>("catalogue_variantes", { produit_id: l.prod.id, nom: l.variante, prix: v, disponible: true }); r.ok ? ok++ : erreurs.push(l.nom); continue; }
      if (l.cible === "creation") { const h = classer({ nom: l.nom }); const r = await sbFoodPost<any>("catalogue_produits", { business_unit: "FOOD", nom: l.nom, prix: v, unite: "portion", statut: "brouillon", visible_client: false, disponible: false, categorie_slug: /^bokit/i.test(l.nom) ? "bokit" : /^bake/i.test(l.nom) ? "bake" : /^jus/i.test(l.nom) ? "jus" : /riz/i.test(l.nom) ? "riz" : "street_food", metadata: { lot: "tarifs_24_11", hierarchie: { categorie: h.categorie, sous_categorie: h.sous_categorie }, a_renseigner: ["fiche technique", "composition", "allergenes", "photo (droits vérifiés)"], prix: { statut: l.source === "estimation_provisoire" ? "provisoire" : "valide_fondatrice", source: l.source, le: new Date().toISOString(), historique: [] } } }); r.ok ? ok++ : erreurs.push(l.nom); continue; }
      if (l.prod) { const pt = patchTarif({ prix: l.prod.prix ?? null, metadata: l.prod.metadata }, v, l.source); if ("raison" in pt) { erreurs.push(`${l.nom} : ${pt.raison}`); continue; } const r = await sbFoodPatch("catalogue_produits", l.prod.id, pt.patch); r.ok ? ok++ : erreurs.push(l.nom); }
    }
    setOccupe(false); setCoches({}); flash(`✅ ${ok} tarif(s) écrit(s).${erreurs.length ? " ⚠️ " + erreurs.join(" ; ") : ""}`); recharger();
  };
  const badge = (s: string) => s === "grille_fondatrice" ? ["Votre grille", C.vert] : s === "calcul_couts" ? ["Calcul coûts", C.or] : ["PROVISOIRE", C.orange];
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ fontSize: 13, color: C.doux }}>Rien n'est écrit tant que vous n'avez pas coché puis confirmé. Les estimations sont marquées <b style={{ color: C.orange }}>PROVISOIRE</b> : aucune source externe, aucun coût saisi (0 recette sur 306 n'a de coût d'ingrédient). Un prix « confirmé » n'est jamais écrasé.</div>
    {lignes.map(l => { const [lib, col] = badge(l.source); const bloque = l.confirme || l.inchange || l.propose == null || (l.cible === "creation" && l.existe);
      return <div key={l.k} data-testid="ligne-tarif" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 10, borderRadius: 12, background: C.carte, border: `1px solid ${C.ligne}` }}>
        <input type="checkbox" aria-label={`Appliquer ${l.nom}`} disabled={bloque} checked={!!coches[l.k]} onChange={e => setCoches(c => ({ ...c, [l.k]: e.target.checked }))} style={{ width: 26, height: 26 }} />
        <div style={{ flex: "1 1 220px", fontSize: 14 }}><b>{l.nom}</b> <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: col + "33", color: col, fontWeight: 800 }}>{lib}</span><br /><span style={{ fontSize: 12, color: C.doux }}>{l.justification}{l.a_confirmer ? ` — à confirmer : ${l.a_confirmer}` : ""}{l.confirme ? " — prix confirmé, non modifiable ici" : ""}{l.cible === "creation" && l.existe ? " — existe déjà (pas de doublon)" : ""}{l.cible === "creation" && !l.existe ? " — sera créé en brouillon" : ""}</span></div>
        <div style={{ fontSize: 13 }}>{euros(l.actuel)} → </div>
        <input aria-label={`Prix proposé ${l.nom}`} inputMode="decimal" disabled={bloque} value={valeurs[l.k] ?? (l.propose != null ? String(l.propose) : "")} onChange={e => setValeurs(v => ({ ...v, [l.k]: e.target.value }))} style={{ ...champ, width: 90 }} placeholder="—" />
      </div>; })}
    <button data-testid="appliquer-tarifs" style={btn(true)} disabled={occupe || !applicables.length} onClick={appliquer}>Appliquer les {applicables.length} tarif(s) cochés</button>
    <div style={{ padding: 12, borderRadius: 14, border: `1px solid ${C.ligne}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 800 }}>🧮 Tarif indicatif à partir des coûts</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
        {([["ingredients", "Ingrédients (€)"], ["conditionnement", "Conditionnement (€)"], ["minutes", "Main-d'œuvre (min)"], ["tauxHoraire", "Taux horaire (€)"], ["marge", "Marge visée (%)"]] as const).map(([k, l]) => <label key={k} style={{ fontSize: 12 }}>{l}<input aria-label={l} inputMode="decimal" value={(calc as any)[k]} onChange={e => setCalc(c => ({ ...c, [k]: e.target.value }))} style={champ} /></label>)}
      </div>
      <div data-testid="resultat-calcul" style={{ fontSize: 14 }}>{res ? <>Coût de revient {euros(res.cout)} → prix indicatif {euros(res.prix)} (arrondi {euros(res.prixArrondi)}). TVA non applicable en Guyane (art. 294 du CGI) — à confirmer par l'expert-comptable.</> : "Renseignez au moins le coût des ingrédients."}</div>
    </div>
  </div>;
}

// ── 🛡 Conformité (point 3) ─────────────────────────────────
function Conformite({ produits, recharger, flash }: { produits: P[]; recharger: () => void; flash: (m: string) => void }) {
  const candidats = aMasquer(produits); const masques = produits.filter(p => p.metadata?.masquage);
  const [coches, setCoches] = useState<Record<string, boolean>>({}); const [vCoches, setVCoches] = useState<Record<string, boolean>>({}); const [occupe, setOccupe] = useState(false);
  const noms = new Set(produits.map(p => p.nom));
  const masquer = async () => {
    const l = candidats.filter(c => coches[c.id]); if (!l.length || !confirm(`Masquer ${l.length} produit(s) aux clientes ? Rien n'est supprimé ; « Rétablir » remet l'état exact d'avant.`)) return;
    setOccupe(true); let ok = 0; for (const c of l) { const r = await sbFoodPatch("catalogue_produits", c.id, patchMasquage(c, c.motifs.join(" ; "))); if (r.ok) ok++; }
    setOccupe(false); setCoches({}); flash(`✅ ${ok} produit(s) masqué(s) (réversible).`); recharger();
  };
  const retablir = async (p: P) => { const pt = patchRetablissement(p); if (!pt) return; const r = await sbFoodPatch("catalogue_produits", p.id, pt); flash(r.ok ? `✅ « ${p.nom} » rétabli.` : "⚠️ Rétablissement impossible."); recharger(); };
  const creerVariantes = async () => {
    const l = VARIANTES_COMPATIBLES.filter(v => vCoches[v.nom] && !noms.has(v.nom)); if (!l.length || !confirm(`Créer ${l.length} variante(s) en BROUILLON (invisibles, composition et allergènes à vérifier avant toute publication) ?`)) return;
    setOccupe(true); let ok = 0; for (const v of l) { const r = await sbFoodPost<any>("catalogue_produits", ligneVariante(v)); if (r.ok) ok++; }
    setOccupe(false); setVCoches({}); flash(`✅ ${ok} variante(s) créée(s) en brouillon.`); recharger();
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ fontWeight: 800, fontSize: 15 }}>Produits contraires à la règle « ni porc ni alcool » ({candidats.length})</div>
    {candidats.map(c => <label key={c.id} data-testid="candidat-masquage" style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 12, background: C.carte, fontSize: 14 }}><input type="checkbox" style={{ width: 26, height: 26 }} checked={!!coches[c.id]} onChange={e => setCoches(x => ({ ...x, [c.id]: e.target.checked }))} /><span><b>{c.nom}</b>{c.visible_client ? "" : " (déjà invisible)"}<br /><span style={{ fontSize: 12, color: C.orange }}>{c.motifs.join(" ; ")}</span></span></label>)}
    <button data-testid="masquer" style={btn(true, C.rouge)} disabled={occupe || !Object.values(coches).some(Boolean)} onClick={masquer}>Masquer la sélection (réversible)</button>
    {masques.length > 0 && <><div style={{ fontWeight: 800, fontSize: 15 }}>Produits masqués ({masques.length})</div>{masques.map(p => <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}><b>{p.nom}</b><span style={{ color: C.doux }}>— {p.metadata.masquage.motif}</span><button style={btn()} onClick={() => retablir(p)}>Rétablir</button></div>)}</>}
    <div style={{ fontWeight: 800, fontSize: 15 }}>Variantes compatibles à préparer</div>
    {VARIANTES_COMPATIBLES.map(v => { const existe = noms.has(v.nom); return <label key={v.nom} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 12, background: C.carte, fontSize: 14, opacity: existe ? 0.6 : 1 }}><input type="checkbox" disabled={existe} style={{ width: 26, height: 26 }} checked={!!vCoches[v.nom]} onChange={e => setVCoches(x => ({ ...x, [v.nom]: e.target.checked }))} /><span><b>{v.nom}</b> · {v.prix != null ? euros(v.prix) : "prix à définir"}{existe ? " — déjà créée" : ""}<br /><span style={{ fontSize: 12, color: C.doux }}>À vérifier : {v.a_verifier.join(" ; ")}{v.remplace.length ? ` · remplace : ${v.remplace.join(", ")}` : ""}</span></span></label>; })}
    <button style={btn(true)} disabled={occupe || !Object.values(vCoches).some(Boolean)} onClick={creerVariantes}>Créer les variantes cochées en brouillon</button>
  </div>;
}
