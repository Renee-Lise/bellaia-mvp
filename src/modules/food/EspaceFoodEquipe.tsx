"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Food — espace de l'équipe (assistante). Accès par permissions
// accordées par la fondatrice (jamais automatiques) :
//  • Découvrir  (food.consulter)        : plats et recettes, SANS coûts
//  • Commander  (food.commandes)        : commande pour une cliente
//    (même boutique et mêmes contrôles serveur que le site client)
//  • Proposer   (food.recettes.proposer): fiche au statut « proposée »
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbRpc } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, mesAcces, aPerm, type Acces } from "../equipe/equipeLib";

export default function EspaceFoodEquipe({ boutique }: { boutique?: React.ReactNode }) {
  const [acces, setAcces] = useState<Acces | null>(null);
  const [onglet, setOnglet] = useState<"decouvrir" | "commander" | "proposer">("decouvrir");
  const [recettes, setRecettes] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState<any>({ nom: "", categorie: "", nb_parts: "", temps_prepa: "", temps_cuisson: "", ingredients: "", etapes: "", conservation: "" });

  useEffect(() => { mesAcces().then(setAcces); }, []);
  const peut = (p: string) => aPerm(acces, p, "FOOD") || aPerm(acces, p);
  useEffect(() => { if (acces && peut("food.consulter")) sbRpc<any[]>("food_recettes_equipe", {}).then(r => setRecettes(r || [])).catch(e => setMsg("❌ " + e.message)); }, [acces]);
  const visibles = useMemo(() => recettes.filter(r => !q || `${r.nom} ${r.categorie} ${(r.ingredients || []).map((i: any) => i.nom).join(" ")}`.toLowerCase().includes(q.toLowerCase())), [recettes, q]);

  const proposer = async () => {
    try {
      const ingredients = f.ingredients.split("\n").map((l: string) => l.trim()).filter(Boolean).map((l: string) => { const m = l.match(/^([\d.,]+)\s*([a-zA-Zéèûô]*)\s+(.+)$/); return m ? { quantite: Number(m[1].replace(",", ".")), unite: m[2] || null, nom: m[3] } : { nom: l, quantite: null, unite: null }; });
      const etapes = f.etapes.split("\n").map((l: string) => l.trim()).filter(Boolean);
      await sbRpc("food_proposer_recette", { j: { ...f, ingredients, etapes } });
      setF({ nom: "", categorie: "", nb_parts: "", temps_prepa: "", temps_cuisson: "", ingredients: "", etapes: "", conservation: "" });
      setMsg("✅ Fiche envoyée à la fondatrice pour validation.");
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  if (!acces) return <div style={{ color: C.doux, padding: 20, fontFamily: SA }}>Chargement…</div>;
  const aucun = !peut("food.consulter") && !peut("food.commandes") && !peut("food.recettes.proposer");
  return (
    <div style={{ fontFamily: SA, color: C.texte, maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>🍽 Bella'Food</div>
      {aucun ? <div style={{ ...carte, fontSize: 14, color: C.doux, lineHeight: 1.6 }}>Votre accès à Bella'Food n'est pas encore ouvert. La fondatrice peut vous l'accorder dans Accès & permissions (découvrir les recettes, prendre des commandes, proposer des fiches).</div> : <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {peut("food.consulter") && <button style={btn(onglet === "decouvrir")} onClick={() => setOnglet("decouvrir")}>📖 Découvrir</button>}
          {peut("food.commandes") && <button style={btn(onglet === "commander")} onClick={() => setOnglet("commander")}>🛒 Prendre une commande</button>}
          {peut("food.recettes.proposer") && <button style={btn(onglet === "proposer")} onClick={() => setOnglet("proposer")}>✍️ Proposer une fiche</button>}
        </div>
        {msg && <div style={{ ...carte, fontSize: 13 }}>{msg}</div>}
        {onglet === "decouvrir" && peut("food.consulter") && <>
          <input style={champ} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un plat, un ingrédient…" />
          <div style={{ fontSize: 12, color: C.doux }}>{visibles.length} recette(s) validée(s). Les coûts et marges ne sont pas affichés.</div>
          {visibles.map(r => (
            <div key={r.id} style={{ ...carte }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{r.nom}</b><button style={btn()} onClick={() => setOuverte(ouverte === r.id ? null : r.id)}>{ouverte === r.id ? "Fermer" : "Voir"}</button></div>
              <div style={{ fontSize: 12, color: C.doux }}>{[r.categorie, r.rendement || (r.nb_parts && `${r.nb_parts} parts`), r.temps_prepa && `${r.temps_prepa} min de préparation`].filter(Boolean).join(" · ")}</div>
              {ouverte === r.id && <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>
                <b>Ingrédients</b><ul style={{ margin: "4px 0", paddingLeft: 18 }}>{(r.ingredients || []).map((i: any, k: number) => <li key={k}>{i.quantite ?? ""} {i.unite || ""} {i.nom}</li>)}</ul>
                <b>Étapes</b><ol style={{ margin: "4px 0", paddingLeft: 18 }}>{(r.etapes || []).map((e: string, k: number) => <li key={k}>{e}</li>)}</ol>
                <div style={{ color: C.orange }}>Allergènes : {(r.allergenes || []).length ? r.allergenes.join(", ") : "non renseignés — ne rien affirmer à une cliente"}</div>
              </div>}
            </div>))}
        </>}
        {onglet === "commander" && peut("food.commandes") && (boutique || <div style={{ color: C.doux }}>Boutique indisponible.</div>)}
        {onglet === "proposer" && peut("food.recettes.proposer") && <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, color: C.doux }}>La fiche est envoyée à la fondatrice : elle n'est ni active, ni visible des clientes avant validation.</div>
          {([["nom", "Nom de la recette"], ["categorie", "Catégorie (plat, dessert, pâtisserie…)"], ["nb_parts", "Nombre de parts"], ["temps_prepa", "Préparation (minutes)"], ["temps_cuisson", "Cuisson (minutes)"], ["conservation", "Conservation"]] as const).map(([k, l]) =>
            <label key={k}><div style={lbl}>{l}</div><input style={champ} value={f[k]} inputMode={/parts|temps/.test(k) ? "numeric" : undefined} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
          <label><div style={lbl}>Ingrédients (un par ligne, ex. « 250 g farine »)</div><textarea style={{ ...champ, minHeight: 110 }} value={f.ingredients} onChange={e => setF({ ...f, ingredients: e.target.value })} /></label>
          <label><div style={lbl}>Étapes (une par ligne)</div><textarea style={{ ...champ, minHeight: 110 }} value={f.etapes} onChange={e => setF({ ...f, etapes: e.target.value })} /></label>
          <button style={btn(true)} onClick={proposer}>Envoyer pour validation</button>
        </div>}
      </>}
    </div>
  );
}
