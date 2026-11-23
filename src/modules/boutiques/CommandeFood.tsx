"use client";
// ═══════════════════════════════════════════════════════════
// Parcours de commande Bella'Food pour la vitrine premium (PRÉVISUALISATION).
// Reprend exactement les règles de la boutique actuelle :
//  • tailles / portions (variantes réelles, prix de la variante) ;
//  • « Frites maison » : base obligatoire (manioc, patate douce, plantain, pomme de terre) ;
//  • allergènes vérifiés affichés ; produit non conforme = non commandable ;
//  • date souhaitée, code de réduction (aperçu, appliqué par le serveur) ;
//  • montants recalculés par le serveur (/api/food/commandes/create) — le navigateur
//    n'envoie que des identifiants et des quantités ; clé anti-double envoi ;
//  • confirmation avec la référence et les montants confirmés par le serveur.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import type { Theme } from "./boutiquesThemes";
import type { Produit } from "./BoutiqueVitrine";
import { getVariantesFoodPublic, getAllergenesFoodPublic, apercuReduction, type VariantePublicFood } from "../food/catalogueApi";
import { jeton } from "../events/eventsAtelierLib";

export const BASES_FRITES = [{ id: "manioc", l: "Manioc" }, { id: "patate_douce", l: "Patate douce" }, { id: "plantain", l: "Plantain" }, { id: "pomme_terre", l: "Pomme de terre" }];
export type LigneFood = { cle: string; produitId: string; libelle: string; prix: number; qte: number; photo?: string | null };
const euros = (n: number) => n.toFixed(2).replace(".", ",") + " €";

/** Données complémentaires (variantes, allergènes) chargées une fois pour la vitrine Food. */
export function useDonneesFood(produits: Produit[]) {
  const [variantes, setVariantes] = useState<Record<string, VariantePublicFood[]>>({});
  const [allergenes, setAllergenes] = useState<Record<string, string[]>>({});
  const ids = produits.map(p => p.id).join(",");
  useEffect(() => {
    if (!produits.length) return;
    getVariantesFoodPublic(produits.map(p => p.id)).then(vs => { const m: Record<string, VariantePublicFood[]> = {}; vs.forEach(v => { (m[v.produitId] ||= []).push(v); }); setVariantes(m); }).catch(() => {});
    getAllergenesFoodPublic(produits.map(p => p.id)).then(setAllergenes).catch(() => {});
  }, [ids]);
  return { variantes, allergenes };
}

/** Choix dans la fiche produit : taille, base des frites, puis ajout au panier.
 *  Identifiant de ligne au format attendu par le serveur : produit::variante::base. */
export function OptionsFood({ t, p, variantes, allergenes, ajouter }: { t: Theme; p: Produit; variantes: VariantePublicFood[]; allergenes?: string[]; ajouter: (l: Omit<LigneFood, "qte">) => void }) {
  const [v, setV] = useState<string>(""); const [base, setBase] = useState<string>("");
  const vsPrix = variantes.filter(x => x.prix != null);
  const avecTailles = vsPrix.length > 0; const frites = p.nom === "Frites maison" && avecTailles; // même règle que la boutique actuelle
  const choix = avecTailles ? vsPrix.find(x => x.id === v) : null;
  const prix = choix ? Number(choix.prix) : (p.prixPromo ?? p.prix);
  const pret = p.commandable && (!avecTailles || !!choix) && (!frites || !!base) && prix != null && prix > 0;
  const pastille = (actif: boolean): React.CSSProperties => ({ minHeight: 40, padding: "8px 14px", borderRadius: 99, border: `1.5px solid ${actif ? t.accent : t.ligne}`, background: actif ? t.accent : "transparent", color: actif ? "#fff" : t.texte, fontWeight: 700, fontSize: 14 });
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, padding: "8px 10px", borderRadius: 10, background: t.ligne }}>
        <b>Allergènes : </b>{allergenes === undefined ? "vérification…" : allergenes.length ? allergenes.join(", ") : "non renseignés — produit non commandable tant que la fiche n'est pas validée"}
      </div>
      {frites && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Base (obligatoire)</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{BASES_FRITES.map(b => <button key={b.id} onClick={() => setBase(b.id)} style={pastille(base === b.id)}>{b.l}</button>)}</div></div>}
      {avecTailles && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Taille / portion</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{vsPrix.map(x => <button key={x.id} onClick={() => setV(x.id)} style={pastille(v === x.id)}>{x.nom} · {euros(Number(x.prix))}</button>)}</div></div>}
      <button disabled={!pret} onClick={() => { const b = BASES_FRITES.find(x => x.id === base); ajouter({ cle: choix ? `${p.id}::${choix.id}${base ? `::${base}` : ""}` : p.id, produitId: p.id, libelle: `${p.nom}${b ? ` (${b.l})` : ""}${choix ? ` — ${choix.nom}` : ""}`, prix: Number(prix), photo: p.photo }); }}
        style={{ height: 52, borderRadius: 99, border: "none", background: pret ? t.accent : t.ligne, color: "#fff", fontWeight: 900, fontSize: 15 }}>
        {!p.commandable ? "Indisponible pour l'instant" : avecTailles && !choix ? "Choisissez une taille" : frites && !base ? "Choisissez une base" : `Ajouter au panier · ${euros(Number(prix))}`}
      </button>
    </div>
  );
}

/** Panier, informations, code de réduction, envoi sécurisé et confirmation. */
export function PanierFood({ t, lignes, setLignes, onSuivi }: { t: Theme; lignes: LigneFood[]; setLignes: (f: (l: LigneFood[]) => LigneFood[]) => void; onSuivi?: () => void }) {
  const [form, setForm] = useState({ nom: "", tel: "", date: "", message: "" });
  const [code, setCode] = useState(""); const [promo, setPromo] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false); const [erreur, setErreur] = useState(""); const [confirme, setConfirme] = useState<any>(null);
  const cleIdem = useRef<string | null>(null);
  const total = lignes.reduce((s, l) => s + l.prix * l.qte, 0);
  const aujourdhui = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 46, borderRadius: 12, border: `1px solid ${t.ligne}`, padding: "10px 12px", fontSize: 16, background: "transparent", color: t.texte };
  const verifierCode = async () => { if (!code.trim()) return; setPromo(await apercuReduction(code.trim(), "FOOD", Math.round(total * 100), await jeton().catch(() => undefined))); };
  const commander = async () => {
    setErreur(""); if (!form.nom.trim()) { setErreur("Indiquez votre nom."); return; }
    setEnvoi(true);
    cleIdem.current ||= (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `food-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const r = await fetch("/api/food/commandes/create", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ lignes: lignes.map(l => ({ id: l.cle, qte: l.qte })), clientNom: form.nom.trim(), clientTel: form.tel.trim(), dateLivraison: form.date || null, notes: form.message, idempotencyKey: cleIdem.current, codeReduction: promo?.valide ? code.trim() : null }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setErreur(d.error || `Commande refusée (HTTP ${r.status}).`); setEnvoi(false); return; }
      setConfirme(d); setLignes(() => []); cleIdem.current = null;
    } catch (e: any) { setErreur("Réseau indisponible : votre panier est conservé, réessayez. " + String(e?.message || "")); }
    setEnvoi(false);
  };
  if (confirme) return (
    <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: t.titres, fontSize: 22, fontWeight: 600 }}>Commande enregistrée ✓</div>
      <div style={{ fontSize: 15 }}>Référence <b>{confirme.reference}</b></div>
      {(confirme.lignes || []).map((l: any, i: number) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{l.libelle} × {l.qte}</span><span>{euros(Number(l.total))}</span></div>)}
      {confirme.remise ? <div style={{ fontSize: 14 }}>Réduction : −{euros(Number(confirme.remise))}</div> : null}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 17 }}><span>Total confirmé</span><span>{euros(Number(confirme.total))}</span></div>
      {confirme.allergenesAVerifier && <div style={{ fontSize: 13, color: t.doux }}>Certains allergènes restent à confirmer : précisez vos allergies si besoin.</div>}
      {onSuivi && <button onClick={onSuivi} style={{ height: 50, borderRadius: 99, border: `1px solid ${t.ligne}`, background: "none", color: t.texte, fontWeight: 800 }}>Suivre ma commande</button>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: t.titres, fontSize: 22, fontWeight: 600 }}>Mon panier</div>
      {!lignes.length && <div style={{ color: t.doux }}>Votre panier est vide.</div>}
      {lignes.map(l => <div key={l.cle} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.ligne}` }}>
        <div style={{ flex: 1, fontSize: 14 }}><b>{l.libelle}</b><div style={{ color: t.doux }}>{euros(l.prix)}</div></div>
        <button aria-label="Retirer un" onClick={() => setLignes(ls => ls.flatMap(x => x.cle !== l.cle ? [x] : x.qte > 1 ? [{ ...x, qte: x.qte - 1 }] : []))} style={{ width: 34, height: 34, borderRadius: 99, border: `1px solid ${t.ligne}`, background: "none", color: t.texte }}>−</button>
        <b>{l.qte}</b>
        <button aria-label="Ajouter un" onClick={() => setLignes(ls => ls.map(x => x.cle === l.cle ? { ...x, qte: Math.min(20, x.qte + 1) } : x))} style={{ width: 34, height: 34, borderRadius: 99, border: `1px solid ${t.ligne}`, background: "none", color: t.texte }}>+</button>
      </div>)}
      {lignes.length > 0 && <>
        <input placeholder="Votre nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={champ} />
        <input placeholder="Téléphone" inputMode="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} style={champ} />
        <label style={{ fontSize: 13, color: t.doux }}>Date souhaitée<input type="date" min={aujourdhui} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...champ, marginTop: 4 }} /></label>
        <textarea placeholder="Message (personnalisation, allergies…)" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={2} style={champ} />
        <div style={{ display: "flex", gap: 8 }}><input placeholder="Code de réduction" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setPromo(null); }} style={{ ...champ, flex: 1 }} /><button onClick={verifierCode} style={{ minWidth: 96, borderRadius: 12, border: `1px solid ${t.ligne}`, background: "none", color: t.texte, fontWeight: 800 }}>Vérifier</button></div>
        {promo && <div style={{ fontSize: 13, color: promo.valide ? "#15803d" : "#b91c1c" }}>{promo.valide ? `✓ ${promo.libelle || "Code valide"}${promo.remise_centimes ? ` : −${euros(promo.remise_centimes / 100)}` : ""} (appliqué à la commande)` : `✕ ${promo.message || "Code non valide"}`}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 900 }}><span>Total estimé</span><span>{euros(Math.max(0, total - (promo?.valide ? (promo.remise_centimes || 0) / 100 : 0)))}</span></div>
        <div style={{ fontSize: 12, color: t.doux }}>Le montant définitif est recalculé et confirmé par Bella'Food à l'envoi.</div>
        {erreur && <div role="alert" style={{ fontSize: 14, color: "#b91c1c" }}>{erreur}</div>}
        <button onClick={commander} disabled={envoi} style={{ height: 54, borderRadius: 99, border: "none", background: t.accent, color: "#fff", fontWeight: 900, fontSize: 16, opacity: envoi ? 0.6 : 1 }}>{envoi ? "Envoi…" : "Envoyer ma commande"}</button>
      </>}
    </div>
  );
}
