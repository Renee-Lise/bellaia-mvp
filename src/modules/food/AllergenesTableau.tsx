"use client";
// ═══════════════════════════════════════════════════════════
// Allergènes — tableau de suivi (Bella'Food ; Vil'Dor Pâtisse ensuite)
// • Recettes complètes / incomplètes, allergènes renseignés / vérifiés,
//   informations inconnues, fiches fournisseurs manquantes.
// • Les 14 allergènes réglementaires : le texte saisi est RAPPROCHÉ des
//   catégories (« détecté — à vérifier »), jamais transformé en absence.
//   Les mentions conditionnelles (« si… », « selon… », « possible »)
//   sont classées en risque, pas en présence confirmée.
// • Ingrédients composés / sous-recettes : un ingrédient portant le nom
//   d'une autre recette transmet ses allergènes (affichés « hérités »).
// Lecture seule : aucune donnée modifiée ici.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbFoodGet } from "./foodApi";
import { ALLERGENES } from "../equipe/equipeLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", jaune: "#facc15" };
const MOTS: Record<string, RegExp> = {
  gluten: /gluten|bl[ée]|farine|seigle|orge|avoine|[ée]peautre|biscuit/i, crustaces: /crustac|crevette|homard|langouste|crabe/i, oeufs: /œuf|oeuf/i,
  poissons: /poisson|morue|thon|saumon|anchois/i, arachides: /arachide|cacahu/i, soja: /soja/i, lait: /lait|cr[èe]me|beurre|fromage|yaourt|lactose/i,
  fruits_a_coque: /fruits? [àa] coque|amande|noisette|noix|pistache|cajou|p[ée]can|macadamia/i, celeri: /c[ée]leri/i, moutarde: /moutarde/i,
  sesame: /s[ée]same/i, sulfites: /sulfite|anhydride sulfureux/i, lupin: /lupin/i, mollusques: /mollusque|moule|hu[îi]tre|calamar|poulpe|escargot/i,
};
const CONDITIONNEL = /\b(si|selon|possible|possibles|éventuel|eventuel|contamination|traces?|à déterminer|a determiner)\b/i;
type Etat = "present" | "risque" | "absent_non_documente";

function analyser(textes: string[]): { detectes: Record<string, Etat>; inconnu: boolean; brut: string[] } {
  const detectes: Record<string, Etat> = {};
  const brut = textes.map(t => String(t || "").trim()).filter(Boolean);
  for (const t of brut) for (const [k, re] of Object.entries(MOTS)) if (re.test(t)) {
    const etat: Etat = CONDITIONNEL.test(t) ? "risque" : "present";
    if (detectes[k] !== "present") detectes[k] = etat;
  }
  const inconnu = brut.length === 0 || brut.some(t => /à déterminer|a determiner|selon composition|selon fabrication/i.test(t));
  return { detectes, inconnu, brut };
}

export default function AllergenesTableau() {
  const [recettes, setRecettes] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [filtre, setFiltre] = useState("incompletes");
  const [recherche, setRecherche] = useState("");
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [r, p, f] = await Promise.all([
          sbFoodGet<any>("food_recettes", "select=id,nom,categorie,statut,allergenes,ingredients&order=nom.asc&limit=1000"),
          sbFoodGet<any>("catalogue_produits", "business_unit=eq.FOOD&select=id,nom,statut,visible_client,allergenes,recette_id&limit=1000"),
          sbFoodGet<any>("food_fournisseurs", "select=id,nom,actif&limit=500").catch(() => []),
        ]);
        setRecettes(r); setProduits(p); setFournisseurs(f);
      } catch (e: any) { setErreur(String(e?.message || e)); }
      setCharge(false);
    })();
  }, []);

  const lignes = useMemo(() => {
    const parNom = new Map(recettes.map(r => [String(r.nom || "").trim().toLowerCase(), r]));
    return recettes.map(r => {
      const ingr: any[] = Array.isArray(r.ingredients) ? r.ingredients : [];
      const sous = ingr.map(i => parNom.get(String(i?.nom || "").trim().toLowerCase())).filter((x: any) => x && x.id !== r.id);
      const herites = sous.flatMap((s: any) => Array.isArray(s.allergenes) ? s.allergenes : []);
      const propre = analyser(Array.isArray(r.allergenes) ? r.allergenes : []);
      const total = analyser([...(Array.isArray(r.allergenes) ? r.allergenes : []), ...herites]);
      const sansFournisseur = ingr.filter(i => i?.nom && !i?.fournisseur && !i?.stockId).length;
      const publies = produits.filter(p => p.recette_id === r.id && p.statut === "actif" && p.visible_client);
      return { r, propre, total, sous, ingrNb: ingr.length, sansFournisseur, publies, complete: !propre.inconnu && ingr.length > 0 };
    });
  }, [recettes, produits]);

  const filtres: [string, string, (l: any) => boolean][] = [
    ["incompletes", "Incomplètes", l => !l.complete],
    ["completes", "Complètes", l => l.complete],
    ["renseignes", "Allergènes renseignés", l => l.propre.brut.length > 0],
    ["inconnus", "Informations inconnues", l => l.propre.inconnu],
    ["verifies", "Vérifiés", () => false],
    ["publies_inconnus", "⚠️ En vente sans information", l => l.publies.length > 0 && l.total.inconnu],
    ["fournisseurs", "Fiches fournisseurs manquantes", l => l.sansFournisseur > 0],
  ];
  const f = filtres.find(x => x[0] === filtre) || filtres[0];
  const visibles = lignes.filter(f[2]).filter(l => !recherche || String(l.r.nom).toLowerCase().includes(recherche.toLowerCase()));
  const compte = (k: string) => lignes.filter((filtres.find(x => x[0] === k) as any)[2]).length;

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 860, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>⚠️ Allergènes — suivi des fiches</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          Rapprochement automatique avec les 14 allergènes réglementaires, à <b>valider humainement</b>. Une information manquante reste « inconnue » : elle n'est jamais une absence. Les mentions « si / selon / possible » sont classées en risque.
        </div>
      </div>
      {erreur && <div style={{ color: C.rouge }}>{erreur}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {filtres.map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} style={{ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${filtre === k ? C.or : C.ligne}`, background: filtre === k ? `${C.or}22` : C.card, color: filtre === k ? C.or : C.texte, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SA }}>
            {l} ({charge ? "…" : compte(k)})
          </button>))}
      </div>
      {filtre === "verifies" && <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12, fontSize: 13, color: C.doux }}>Aucune fiche recette n'est encore marquée « vérifiée » : la validation humaine (date, personne, source) sera ajoutée avec le module hygiène et traçabilité. La collection saisonnière a déjà sa validation par produit.</div>}
      <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une recette…" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", minHeight: 42 }} />
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {visibles.map(l => (
        <div key={l.r.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${l.complete ? C.ok : C.orange}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <b>{l.r.nom}</b>
            <span style={{ fontSize: 11, fontWeight: 800, color: l.publies.length ? (l.total.inconnu ? C.rouge : C.ok) : C.doux }}>{l.publies.length ? `En vente (${l.publies.length})` : "Non publiée"}</span>
          </div>
          <div style={{ fontSize: 12, color: C.doux }}>Saisi : {l.propre.brut.length ? l.propre.brut.join(" · ") : "rien — information inconnue"}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ALLERGENES.map(([k, nom]) => { const e = l.total.detectes[k]; if (!e) return null; return (
              <span key={k} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, border: `1px solid ${e === "present" ? C.rouge : C.jaune}88`, color: e === "present" ? C.rouge : C.jaune }}>{nom}{e === "risque" ? " (risque)" : ""}</span>); })}
          </div>
          {l.sous.length > 0 && <div style={{ fontSize: 12, color: C.doux }}>Sous-recettes : {l.sous.map((s: any) => s.nom).join(", ")} (allergènes hérités inclus)</div>}
          <div style={{ fontSize: 12, color: C.doux }}>{l.ingrNb} ingrédient(s){l.sansFournisseur ? ` · ${l.sansFournisseur} sans fiche fournisseur` : ""}</div>
          {l.publies.length > 0 && l.total.inconnu && <div style={{ fontSize: 12, color: C.rouge }}>⛔ Produit en vente sans information allergènes complète : à compléter ou retirer de la vente.</div>}
        </div>))}
      {!charge && !visibles.length && <div style={{ color: C.doux, textAlign: "center", padding: 20 }}>Aucune recette dans ce filtre.</div>}
      <div style={{ fontSize: 11, color: C.doux }}>{fournisseurs.length} fiche(s) fournisseur enregistrée(s). Rapprochement par mots-clés : indicatif, jamais une validation.</div>
    </div>
  );
}
