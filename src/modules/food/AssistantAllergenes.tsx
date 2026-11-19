"use client";
// ═══════════════════════════════════════════════════════════
// Assistant de régularisation des allergènes — Bella'Food (fondatrice).
// • Pour chaque produit bloqué : allergènes PROPOSÉS à partir des sources
//   disponibles (fiche produit, recette, sous-recettes, ingrédients,
//   documents de la bibliothèque : photos d'emballage, fiches techniques,
//   documents fournisseurs), informations INCONNUES et CONTRADICTIONS.
// • Rien n'est déduit d'une absence : une proposition ne coche jamais
//   « absent ». Chaque allergène doit être choisi explicitement
//   (présent / traces / absent) avant la validation.
// • Validation individuelle par la fondatrice (RPC sécurisée) ; tant que
//   la fiche n'est pas validée, le produit reste non commandable.
// Aucune donnée existante n'est modifiée : les fiches sont stockées à part
// (food_allergenes_fiches) avec historique.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbFoodGet } from "./foodApi";
import { sbRpc } from "../events/eventsAtelierLib";
import { ALLERGENES } from "../equipe/equipeLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", jaune: "#facc15", bleu: "#60a5fa" };
const btn = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };

export const MOTS: Record<string, RegExp> = {
  gluten: /gluten|\bbl[ée]s?\b|farine|seigle|orge|avoine|[ée]peautre|kamut|biscuit|chapelure|p[âa]te (feuillet|bris|sabl)|semoule|pain\b|brioche|cr[êe]pe|b[ée]chamel/i,
  crustaces: /crustac|crevette|homard|langouste|crabe|ouassou/i, oeufs: /œuf|oeuf|meringue|mayonnaise/i,
  poissons: /poisson|morue|thon|saumon|anchois|sardine|hareng|acoupa|machoiran/i, arachides: /arachide|cacahu/i, soja: /soja|tofu|edamame/i,
  lait: /\blait(?! de coco| de soja| d['’]amande| d['’]avoine| de riz)|cr[èe]me(?! de coco)|beurre(?! de cacahu)|fromage|yaourt|lactose|mascarpone|mozzarella|emmental|chantilly|ghee|b[ée]chamel/i,
  fruits_a_coque: /fruits? [àa] coque|amande|noisette|\bnoix\b|pistache|cajou|p[ée]can|macadamia|praliné|frangipane/i, celeri: /c[ée]leri/i, moutarde: /moutarde/i,
  sesame: /s[ée]same|tahin/i, sulfites: /sulfite|anhydride sulfureux|\bvin\b|vinaigre de vin|champagne|brut\b/i, lupin: /lupin/i, mollusques: /mollusque|moule|hu[îi]tre|calamar|encornet|poulpe|escargot|lambi|chatrou/i,
};
const CONDITIONNEL = /\b(si|selon|possible|possibles|éventuel|eventuel|contamination|traces?|peut contenir)\b/i;
const NEGATION = /\b(sans|aucun|aucune|pas de|exempt)\b/i;
const COMPOSE = /\b(b[ée]chamel|jambon|lardons?|saucisses?|chorizo|poudre|pâte à tartiner|nutella|sauce|pâte|pate|préparation|preparation|mix|chocolat|biscuit|nappage|glaçage|glacage|arôme|arome|épices|epices|bouillon|colorant|garniture|du commerce|industriel|sirop|liqueur|vin|bière|biere|jus)\b/i;
const NON_INDIQUE = /non indiqu|à déterminer|a determiner|inconnu/i;
type Etat = "present" | "traces" | "absent" | "inconnu";
const ETATS: [Etat, string, string][] = [["present", "Présent", C.rouge], ["traces", "Traces", C.jaune], ["absent", "Absent", C.ok], ["inconnu", "Inconnu", C.orange]];
const TYPES_SOURCES: [string, string][] = [["recette", "Recette"], ["sous_recette", "Sous-recettes"], ["ingredients", "Liste d'ingrédients"], ["emballage", "Photo d'emballage / étiquette"], ["fiche_technique", "Fiche technique"], ["fournisseur", "Document fournisseur"]];
const LEGACY_AMBIGU = /(à déterminer|a determiner|inconnu|à vérifier|a verifier|selon (composition|fabrication))/i;

type Indice = { cle: string; etat: "present" | "traces"; source: string; extrait: string };
function detecter(texte: string, source: string): Indice[] {
  const t = String(texte || "").trim(); if (!t || NON_INDIQUE.test(t)) return [];
  const out: Indice[] = [];
  for (const seg of t.split(/[.;\n]+/).map(x => x.trim()).filter(Boolean)) for (const [k, re] of Object.entries(MOTS)) if (re.test(seg)) {
    if (NEGATION.test(seg) && new RegExp(`(sans|aucun|pas de)[^,.;]*${re.source}`, "i").test(seg)) continue;
    const etat = CONDITIONNEL.test(seg) ? "traces" : "present";
    const deja = out.find(x => x.cle === k); if (deja) { if (etat === "present") deja.etat = "present"; continue; }
    out.push({ cle: k, etat, source, extrait: seg.slice(0, 90) });
  }
  return out;
}
function nie(texte: string, cle: string) { const re = MOTS[cle]; return re && new RegExp(`(sans|aucun|pas de)[^,.;]*${re.source}`, "i").test(String(texte || "")); }

export function analyserProduit(p: any, recettes: any[], parNom: Map<string, any>, docs: any[]) {
  const indices: Indice[] = []; const inconnus: string[] = []; const contradictions: string[] = [];
  const r = recettes.find(x => x.id === p.recette_id);
  for (const a of (p.allergenes || [])) indices.push(...detecter(a, "Fiche produit"));
  if (!r) inconnus.push("Aucune recette liée : composition inconnue (photo d'emballage ou fiche fournisseur nécessaire si produit acheté).");
  else {
    const ingr: any[] = Array.isArray(r.ingredients) ? r.ingredients : [];
    const ra: string[] = Array.isArray(r.allergenes) ? r.allergenes : [];
    for (const a of ra) indices.push(...detecter(a, "Recette — allergènes indiqués"));
    if (!ra.length || ra.every(a => NON_INDIQUE.test(a))) inconnus.push("La recette n'indique pas ses allergènes.");
    if (!ingr.length) inconnus.push("La recette ne contient aucun ingrédient : liste d'ingrédients, emballage ou fiche fournisseur à fournir.");
    for (const i of ingr) {
      const nom = String(i?.nom || "").trim(); if (!nom) continue;
      const sous = parNom.get(nom.toLowerCase());
      if (sous && sous.id !== r.id) {
        for (const a of (sous.allergenes || [])) indices.push(...detecter(a, `Sous-recette « ${sous.nom} »`));
        for (const si of (sous.ingredients || [])) { indices.push(...detecter(si?.nom, `Sous-recette « ${sous.nom} » — ingrédient`)); if (COMPOSE.test(String(si?.nom || ""))) inconnus.push(`« ${si.nom} » (sous-recette « ${sous.nom} ») : ingrédient composé — composition à vérifier.`); }
        if (!(sous.ingredients || []).length) inconnus.push(`Sous-recette « ${sous.nom} » sans ingrédients.`);
      } else {
        indices.push(...detecter(`${nom} ${i?.notes || ""}`, "Ingrédient"));
        if (COMPOSE.test(nom)) inconnus.push(`« ${nom} » : ingrédient composé — composition à vérifier (emballage ou fiche fournisseur).`);
      }
    }
    for (const k of Object.keys(MOTS)) if (ra.some(a => nie(a, k)) && indices.some(x => x.cle === k && x.source !== "Recette — allergènes indiqués")) contradictions.push(`La recette indique « sans ${libelle(k)} » mais un ingrédient en contient.`);
  }
  const lies = docs.filter(d => (r && (d.recette_id === r.id || d.recette_proposee_id === r.id)));
  for (const d of lies) {
    const txt = String(d.allergenes_fiche || "");
    if (!txt || NON_INDIQUE.test(txt)) { inconnus.push(`Document « ${d.titre} » : allergènes non indiqués.`); continue; }
    const det = detecter(txt, `Document « ${d.titre} »`); indices.push(...det);
    const recDet = new Set(indices.filter(x => !x.source.startsWith("Document")).map(x => x.cle));
    for (const x of det) if (r && !recDet.has(x.cle) && (r.ingredients || []).length) contradictions.push(`« ${d.titre} » mentionne ${libelle(x.cle)}, absent de la recette.`);
    for (const k of Object.keys(MOTS)) if (nie(txt, k) && recDet.has(k)) contradictions.push(`« ${d.titre} » indique « sans ${libelle(k)} » mais la recette en contient.`);
  }
  const fp: string[] = (p.allergenes || []).filter(Boolean);
  const rp: string[] = (r?.allergenes || []).filter(Boolean);
  if (fp.length && rp.length) {
    const a = new Set(fp.flatMap(t => detecter(t, "").map(x => x.cle))), b = new Set(rp.flatMap(t => detecter(t, "").map(x => x.cle)));
    const diff = [...a].filter(k => !b.has(k)).concat([...b].filter(k => !a.has(k)));
    if (diff.length) contradictions.push(`Fiche produit et recette ne déclarent pas les mêmes allergènes (${diff.map(libelle).join(", ")}).`);
  }
  const propose: Record<string, "present" | "traces"> = {};
  for (const x of indices) if (propose[x.cle] !== "present") propose[x.cle] = x.etat;
  return { recette: r, indices, propose, inconnus: Array.from(new Set(inconnus)), contradictions: Array.from(new Set(contradictions)), docs: lies };
}
const libelle = (k: string) => (ALLERGENES.find(([c]) => c === k)?.[1] || k);
const legacyOk = (p: any, r: any) => { const t = [...(p.allergenes || []), ...(r?.allergenes || [])].map((x: any) => String(x || "").trim()).filter(Boolean); return t.length > 0 && !t.some(x => LEGACY_AMBIGU.test(x)); };

export default function AssistantAllergenes() {
  const [produits, setProduits] = useState<any[]>([]);
  const [recettes, setRecettes] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [fiches, setFiches] = useState<Record<string, any>>({});
  const [filtre, setFiltre] = useState("a_traiter");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);
  const [msg, setMsg] = useState("");

  const charger = async () => {
    try {
      const [p, r, d, f] = await Promise.all([
        sbFoodGet<any>("catalogue_produits", "business_unit=eq.FOOD&statut=eq.actif&select=id,nom,allergenes,recette_id,categorie_slug,visible_client&order=nom.asc&limit=1000"),
        sbFoodGet<any>("food_recettes", "select=id,nom,allergenes,ingredients&limit=2000"),
        sbFoodGet<any>("bibliotheque_fiches", "espace=eq.BELLAFOOD&select=id,titre,recette_id,recette_proposee_id,allergenes_fiche,rubrique,etat&limit=2000").catch(() => []),
        sbFoodGet<any>("food_allergenes_fiches", "select=*&limit=2000").catch(() => []),
      ]);
      setProduits(p); setRecettes(r); setDocs(d); setFiches(Object.fromEntries(f.map((x: any) => [x.produit_id, x])));
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const parNom = useMemo(() => new Map(recettes.map(r => [String(r.nom || "").trim().toLowerCase(), r])), [recettes]);
  const lignes = useMemo(() => produits.map(p => {
    const a = analyserProduit(p, recettes, parNom, docs); const f = fiches[p.id];
    const valide = f?.statut === "valide"; const commandable = valide || legacyOk(p, a.recette);
    return { p, a, f, valide, commandable };
  }), [produits, recettes, parNom, docs, fiches]);
  const compte = (k: string) => lignes.filter(l => filtrer(l, k)).length;
  function filtrer(l: any, k: string) {
    if (k === "a_traiter") return !l.commandable;
    if (k === "brouillon") return l.f?.statut === "brouillon";
    if (k === "contradictions") return l.a.contradictions.length > 0 && !l.valide;
    if (k === "valides") return l.valide;
    return true;
  }
  const visibles = lignes.filter(l => filtrer(l, filtre) && (!q || l.p.nom.toLowerCase().includes(q.toLowerCase())));
  const courant = lignes.find(l => l.p.id === sel);

  if (charge) return <div style={{ color: C.doux, fontFamily: SA }}>Chargement…</div>;
  if (courant) return <Fiche l={courant} retour={() => setSel(null)} apres={async (m) => { setMsg(m); await charger(); }} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: SA, color: C.texte }}>
      <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>Complétez chaque produit à partir de ses sources. Les propositions ne sont que des <b>indices</b> : rien n'est déduit d'une absence d'information. Un produit reste <b>non commandable</b> tant que sa fiche n'est pas validée.</div>
      {msg && <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["a_traiter", "🔒 Bloqués"], ["contradictions", "⚠️ Contradictions"], ["brouillon", "📝 Brouillons"], ["valides", "✅ Validés"], ["tous", "Tous"]].map(([k, l]) =>
          <button key={k} style={btn(filtre === k)} onClick={() => setFiltre(k)}>{l} ({compte(k)})</button>)}
      </div>
      <input style={champ} placeholder="Rechercher un produit" value={q} onChange={e => setQ(e.target.value)} />
      {visibles.map(({ p, a, f, valide, commandable }) => (
        <button key={p.id} onClick={() => setSel(p.id)} style={{ textAlign: "left", background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12, color: C.texte, fontFamily: SA, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14 }}>{p.nom}</b>
            <span style={{ fontSize: 11, fontWeight: 800, color: valide ? C.ok : commandable ? C.bleu : f ? C.jaune : C.orange, whiteSpace: "nowrap" }}>{valide ? "Validé" : commandable ? "Commandable (ancienne règle)" : f ? "Brouillon" : "Bloqué"}</span>
          </div>
          <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>
            {Object.keys(a.propose).length ? `Proposés : ${Object.entries(a.propose).map(([k, e]) => libelle(k) + (e === "traces" ? " (traces ?)" : "")).join(", ")}` : "Aucun indice trouvé"}
            {a.inconnus.length ? ` · ${a.inconnus.length} inconnu(s)` : ""}{a.contradictions.length ? ` · ⚠️ ${a.contradictions.length} contradiction(s)` : ""}
          </div>
        </button>
      ))}
      {!visibles.length && <div style={{ color: C.doux, fontSize: 13 }}>Aucun produit dans cette liste.</div>}
    </div>
  );
}

function Fiche({ l, retour, apres }: { l: any; retour: () => void; apres: (m: string) => Promise<void> }) {
  const { p, a, f } = l;
  const [etats, setEtats] = useState<Record<string, Etat>>(() => Object.fromEntries(ALLERGENES.map(([k]) => [k, (f?.etats?.[k] as Etat) || "inconnu"])));
  const [sources, setSources] = useState<any[]>(() => Array.isArray(f?.sources) ? f.sources : []);
  const [commentaire, setCommentaire] = useState(f?.commentaire || "");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const inconnus = ALLERGENES.filter(([k]) => etats[k] === "inconnu").length;
  const aSource = (t: string) => sources.some(s => s.type === t);
  const basculer = (t: string, lib: string) => setSources(s => aSource(t) ? s.filter(x => x.type !== t) : [...s, { type: t, libelle: lib, le: new Date().toISOString() }]);
  const appliquer = () => setEtats(e => { const n = { ...e }; for (const [k, v] of Object.entries(a.propose)) if (n[k] === "inconnu") n[k] = v as Etat; return n; });
  const enregistrer = async (valider: boolean) => {
    if (valider) {
      const pres = ALLERGENES.filter(([k]) => etats[k] === "present").map(([, l]) => l), tr = ALLERGENES.filter(([k]) => etats[k] === "traces").map(([, l]) => l);
      if (!confirm(`Valider la fiche allergènes de « ${p.nom} » ?\n\nPrésents : ${pres.join(", ") || "aucun"}\nTraces possibles : ${tr.join(", ") || "aucune"}\nAbsents : ${14 - pres.length - tr.length}\n\nCes informations seront affichées aux clients et le produit deviendra commandable.`)) return;
    }
    setOccupe(true); setErreur("");
    try {
      const r: any = await sbRpc("food_allergenes_enregistrer", { p_produit: p.id, p_etats: etats, p_sources: sources, p_commentaire: commentaire || null, p_valider: valider });
      if (r?.ok === false) { setErreur(r.message); setOccupe(false); return; }
      await apres(valider ? `✅ « ${p.nom} » validé — commandable.` : `📝 Brouillon enregistré pour « ${p.nom} » (toujours bloqué).`); retour();
    } catch (e: any) { setErreur(String(e?.message || e)); }
    setOccupe(false);
  };
  const carte: React.CSSProperties = { background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: SA, color: C.texte }}>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={retour}>← Liste</button>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{p.nom}</div>
      <div style={{ fontSize: 12, color: C.doux }}>{a.recette ? `Recette liée : ${a.recette.nom} (${(a.recette.ingredients || []).length} ingrédients)` : "Aucune recette liée"}{a.docs.length ? ` · ${a.docs.length} document(s) bibliothèque` : ""}{f?.statut === "valide" ? ` · validée le ${new Date(f.valide_le).toLocaleDateString("fr-FR")}` : ""}</div>

      {a.contradictions.length > 0 && <div style={{ ...carte, borderColor: C.rouge }}><b style={{ color: C.rouge }}>⚠️ Contradictions</b>{a.contradictions.map((c: string, i: number) => <div key={i} style={{ fontSize: 13, marginTop: 4 }}>• {c}</div>)}</div>}
      {a.inconnus.length > 0 && <div style={{ ...carte, borderColor: C.orange }}><b style={{ color: C.orange }}>❓ Informations inconnues</b>{a.inconnus.map((c: string, i: number) => <div key={i} style={{ fontSize: 13, marginTop: 4 }}>• {c}</div>)}
        <div style={{ fontSize: 12, color: C.doux, marginTop: 6 }}>Ajoutez une photo d'emballage, une fiche technique ou un document fournisseur dans Bibliothèque → Atelier d'import, en le rattachant à la recette : il apparaîtra ici.</div></div>}

      <div style={carte}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <b>Indices trouvés ({a.indices.length})</b>
          {Object.keys(a.propose).length > 0 && <button style={btn(true)} onClick={appliquer}>Reprendre les propositions</button>}
        </div>
        {a.indices.slice(0, 40).map((x: Indice, i: number) => <div key={i} style={{ fontSize: 12, marginTop: 5 }}><b style={{ color: x.etat === "present" ? C.rouge : C.jaune }}>{libelle(x.cle)}</b> — {x.source} : <span style={{ color: C.doux }}>« {x.extrait} »</span></div>)}
        {!a.indices.length && <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>Aucun indice. Cela ne signifie PAS l'absence d'allergènes.</div>}
        <div style={{ fontSize: 11, color: C.doux, marginTop: 6 }}>« Reprendre » ne remplit que Présent / Traces ; jamais Absent.</div>
      </div>

      <div style={carte}>
        <b>Les 14 allergènes réglementaires</b> <span style={{ fontSize: 12, color: inconnus ? C.orange : C.ok }}>— {inconnus ? `${inconnus} encore inconnu(s)` : "tous renseignés"}</span>
        {ALLERGENES.map(([k, lib]) => (
          <div key={k} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{lib}{a.propose[k] ? <span style={{ fontSize: 11, color: a.propose[k] === "present" ? C.rouge : C.jaune }}> · proposé : {a.propose[k] === "present" ? "présent" : "traces"}</span> : null}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 3 }}>
              {ETATS.map(([e, l2, c]) => <button key={e} onClick={() => setEtats(x => ({ ...x, [k]: e }))} style={{ ...btn(etats[k] === e, c), minHeight: 34, padding: "4px 2px", fontSize: 12 }}>{l2}</button>)}
            </div>
          </div>
        ))}
      </div>

      <div style={carte}>
        <b>Sources consultées</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
          {TYPES_SOURCES.map(([t, lib]) => <button key={t} style={btn(aSource(t), C.bleu)} onClick={() => basculer(t, lib)}>{aSource(t) ? "✓ " : ""}{lib}</button>)}
          {a.docs.map((d: any) => <button key={d.id} style={btn(aSource("doc:" + d.id), C.bleu)} onClick={() => basculer("doc:" + d.id, d.titre)}>{aSource("doc:" + d.id) ? "✓ " : ""}📄 {d.titre}</button>)}
        </div>
        <textarea style={{ ...champ, marginTop: 8, minHeight: 70 }} placeholder="Commentaire (fournisseur, lot, référence de l'étiquette…)" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
      </div>

      {erreur && <div style={{ color: C.rouge, fontSize: 13 }}>❌ {erreur}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn()} disabled={occupe} onClick={() => enregistrer(false)}>💾 Enregistrer le brouillon</button>
        <button style={{ ...btn(true, C.ok), opacity: inconnus || !sources.length ? 0.5 : 1 }} disabled={occupe || inconnus > 0 || !sources.length} onClick={() => enregistrer(true)}>✓ Valider cette fiche</button>
      </div>
      {(inconnus > 0 || !sources.length) && <div style={{ fontSize: 12, color: C.doux }}>Validation possible quand les 14 allergènes sont renseignés et qu'au moins une source est cochée.</div>}
    </div>
  );
}
