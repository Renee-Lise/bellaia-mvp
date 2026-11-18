"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Food — Collection saisonnière de REVENTE
// « Bûches de Noël & Galettes des Rois » (produits achetés à
// Vil'Dor Pâtisse pour la revente — non fabriqués par Bella'Studio).
// • Prix fournisseur, prix de revente (brouillon jusqu'à confirmation),
//   frais, cotisations — CONFIDENTIELS (fondatrice / autorisés).
// • Marge brute, taux de marge, taux de marque, gain estimé : calculés
//   par le SERVEUR, en centimes (fonction revente_calcul).
// • Calculateur de prix conseillé (taux de marque visé).
// • 14 allergènes : jamais d'absence déduite d'une donnée manquante.
// • Récapitulatif des commandes à transmettre au prestataire (part
//   fournisseur figée par le serveur).
// Publication : jamais automatique, bloquée en base tant que prix,
// allergènes, parfums et situation du fournisseur ne sont pas validés.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate, sbRpc } from "../events/eventsAtelierLib";
import { ALLERGENES, STATUTS_ALLERGENE, C, SA, btn, champ, lbl, carte, euros, versCentimes, enEuros, heure } from "../equipe/equipeLib";

const COLLECTION = "Bûches de Noël & Galettes des Rois";
const pourcent = (x: any) => x == null ? "—" : `${String(x).replace(".", ",")} %`;

export default function ReventeCollection() {
  const [produits, setProduits] = useState<any[]>([]);
  const [conditions, setConditions] = useState<Record<string, any>>({});
  const [calculs, setCalculs] = useState<Record<string, any>>({});
  const [propositions, setPropositions] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [vue, setVue] = useState<"produits" | "simulation" | "recap">("produits");
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    setCharge(true); setErreur("");
    try {
      const p = await sbSelect("food_revente_produits", `collection=eq.${encodeURIComponent(COLLECTION)}&order=ordre.asc`);
      setProduits(p);
      const c = await sbSelect("food_revente_conditions", "select=*");
      setConditions(Object.fromEntries(c.map((x: any) => [x.produit_id, x])));
      setPropositions(await sbSelect("food_revente_propositions", "statut=eq.proposee&order=created_at.desc").catch(() => []));
      setCommandes(await sbSelect("food_revente_commandes_fournisseur", `collection=eq.${encodeURIComponent(COLLECTION)}&order=created_at.desc`).catch(() => []));
      const o = await sbSelect("bellaia_organisations", "nom_commercial=eq.Vil'Dor%20P%C3%A2tisse&select=id,nom_commercial,statut_admin,ventes_actives").catch(() => []);
      setOrg(o[0] || null);
      const res: Record<string, any> = {};
      await Promise.all(p.filter((x: any) => x.prix_revente_centimes != null).map(async (x: any) => { try { res[x.id] = await sbRpc("revente_calcul", { p_produit: x.id, p_quantite: 1 }); } catch {} }));
      setCalculs(res);
    } catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const familles = useMemo(() => Array.from(new Set(produits.map(p => p.famille))), [produits]);
  const nbConfirmes = produits.filter(p => p.prix_revente_confirme).length;
  const allergenesConnus = (p: any) => ALLERGENES.filter(([k]) => (p.allergenes?.[k]?.statut || "inconnu") !== "inconnu").length;

  if (edit) return <EditeurProduit p={edit} cond={conditions[edit.id]} onRetour={() => setEdit(null)} onEnregistre={async () => { setEdit(null); setMsg(`✅ Enregistré à ${heure()}`); await charger(); }} />;

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 820, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🎄 {COLLECTION}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          Produits achetés à {org?.nom_commercial || "Vil'Dor Pâtisse"} pour la revente. Prix d'achat et marges confidentiels. Rien n'est publié automatiquement.
        </div>
      </div>
      <div style={{ ...carte, borderColor: `${C.orange}66`, fontSize: 13, lineHeight: 1.5 }}>
        🔒 <b>Mode préparation.</b> Fournisseur : <b>{libStatut(org?.statut_admin)}</b> — ventes {org?.ventes_actives ? "actives" : "désactivées"}.
        {" "}{nbConfirmes}/{produits.length} prix de revente confirmés. Les commandes fournisseur restent des <b>simulations</b> tant que le fournisseur n'est pas validé.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["produits", "Produits & prix"], ["simulation", "Simulation"], ["recap", `Récap fournisseur (${commandes.length})`]] as const).map(([k, l]) =>
          <button key={k} style={btn(vue === k)} onClick={() => setVue(k)}>{l}</button>)}
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {erreur && <div style={{ color: C.rouge }}>{erreur}</div>}

      {vue === "produits" && !charge && (
        <>
          {propositions.length > 0 && (
            <div style={{ ...carte, borderColor: `${C.bleu}66` }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>💬 Propositions de tarif du fournisseur</div>
              {propositions.map(pr => { const p = produits.find(x => x.id === pr.produit_id); return (
                <div key={pr.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: `1px solid ${C.ligne}` }}>
                  <div style={{ flex: 1, minWidth: 180 }}>{p?.nom || "Produit"} : {euros(conditions[pr.produit_id]?.prix_fournisseur_centimes)} → <b>{euros(pr.prix_fournisseur_centimes)}</b>{pr.commentaire ? <div style={{ fontSize: 12, color: C.doux }}>{pr.commentaire}</div> : null}</div>
                  <button style={btn(true, C.ok)} onClick={async () => { try { await sbRpc("fondatrice_decider_tarif", { p_id: pr.id, p_accepter: true }); setMsg("✅ Nouveau tarif appliqué aux futures commandes"); charger(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Accepter</button>
                  <button style={btn()} onClick={async () => { try { await sbRpc("fondatrice_decider_tarif", { p_id: pr.id, p_accepter: false }); setMsg("Proposition refusée"); charger(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Refuser</button>
                </div>); })}
            </div>)}
          {familles.map(f => (
            <div key={f} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.or, marginTop: 6 }}>{f}</div>
              {produits.filter(p => p.famille === f).map(p => {
                const c = conditions[p.id]; const k = calculs[p.id];
                return (
                  <button key={p.id} onClick={() => setEdit(p)} style={{ ...carte, textAlign: "left", color: C.texte, fontFamily: SA, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{p.nom}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: p.prix_revente_confirme ? C.ok : C.orange }}>{p.prix_revente_confirme ? "Prix confirmé" : "Prix à confirmer"} · {p.statut}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, fontSize: 13 }}>
                      <Info t="Prix fournisseur" v={euros(c?.prix_fournisseur_centimes)} />
                      <Info t="Prix de revente" v={euros(p.prix_revente_centimes)} />
                      <Info t="Marge brute" v={euros(k?.marge_brute_centimes)} />
                      <Info t="Taux de marque" v={pourcent(k?.taux_marque_pct)} />
                      <Info t="Taux de marge" v={pourcent(k?.taux_marge_pct)} />
                      <Info t="Gain après charges" v={k ? euros(k.gain_estime_centimes) + (k.cotisations_a_renseigner ? " *" : "") : "—"} />
                    </div>
                    <div style={{ fontSize: 12, color: C.doux }}>
                      {p.nb_parts} parts · Parfums : {p.parfums?.length ? p.parfums.join(", ") : "à renseigner"} · Allergènes renseignés : {allergenesConnus(p)}/14
                    </div>
                  </button>);
              })}
            </div>))}
          <div style={{ fontSize: 12, color: C.doux }}>* Cotisations à renseigner : le gain affiché ne les déduit pas encore.</div>
        </>)}

      {vue === "simulation" && !charge && <Simulation produits={produits} />}
      {vue === "recap" && !charge && <Recap produits={produits} commandes={commandes} conditions={conditions} onMaj={charger} setMsg={setMsg} />}
    </div>
  );
}

const libStatut = (s?: string) => ({ en_creation: "Entreprise en création", immatriculation_en_cours: "Immatriculation en cours", immatriculee: "Entreprise immatriculée", documents_a_verifier: "Documents à vérifier", partenaire_valide: "Partenaire validé", suspendu: "Partenaire suspendu" } as any)[s || ""] || "—";
function Info({ t, v }: { t: string; v: string }) { return <div><div style={{ fontSize: 10, color: C.doux, textTransform: "uppercase", fontWeight: 800 }}>{t}</div><div style={{ fontWeight: 700 }}>{v}</div></div>; }

function EditeurProduit({ p, cond, onRetour, onEnregistre }: any) {
  const [f, setF] = useState<any>({
    prix_revente: enEuros(p.prix_revente_centimes), confirme: p.prix_revente_confirme, prix_fournisseur: enEuros(cond?.prix_fournisseur_centimes),
    frais: enEuros(cond?.frais_centimes ?? 0), cotisations: cond?.cotisations_pct ?? "", parfums: (p.parfums || []).join(", "), conservation: p.conservation || "",
    date_limite_precommande: p.date_limite_precommande || "", date_retrait: p.date_retrait || "", allergenes: { ...p.allergenes }, allergenes_source: p.allergenes_source || "",
    allergenes_verifies_le: p.allergenes_verifies_le || "",
  });
  const [taux, setTaux] = useState("30");
  const [conseil, setConseil] = useState<number | null>(null);
  const [apercu, setApercu] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  const calculer = async () => {
    const pv = versCentimes(f.prix_revente);
    if (pv == null || Number.isNaN(pv)) { setMsg("❌ Prix de revente invalide"); return; }
    try { setApercu(await sbRpc("revente_calcul", { p_produit: p.id, p_quantite: 1, p_prix_revente_centimes: pv })); setMsg(""); } catch (e: any) { setMsg("❌ " + e.message); }
  };
  useEffect(() => { calculer(); /* eslint-disable-next-line */ }, []);

  const enregistrer = async () => {
    const pv = versCentimes(f.prix_revente), pa = versCentimes(f.prix_fournisseur), fr = versCentimes(f.frais);
    if ([pv, pa, fr].some(x => Number.isNaN(x as number))) { setMsg("❌ Montant invalide (ex. 55 ou 55,50)"); return; }
    const cot = String(f.cotisations).trim() === "" ? null : Number(String(f.cotisations).replace(",", "."));
    if (cot != null && (!Number.isFinite(cot) || cot < 0 || cot > 100)) { setMsg("❌ Taux de cotisations entre 0 et 100"); return; }
    setEnvoi(true);
    try {
      await sbUpdate("food_revente_produits", p.id, {
        prix_revente_centimes: pv, prix_revente_confirme: !!f.confirme && pv != null,
        parfums: f.parfums.split(",").map((s: string) => s.trim()).filter(Boolean), conservation: f.conservation || null,
        date_limite_precommande: f.date_limite_precommande || null, date_retrait: f.date_retrait || null,
        allergenes: f.allergenes, allergenes_source: f.allergenes_source || null, allergenes_verifies_le: f.allergenes_verifies_le || null,
      });
      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/food_revente_conditions?produit_id=eq.${p.id}`, {
        method: "PATCH", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", Authorization: `Bearer ${await (window as any).getTokenAsync?.()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prix_fournisseur_centimes: pa ?? cond?.prix_fournisseur_centimes, frais_centimes: fr ?? 0, cotisations_pct: cot }),
      });
      if (!r.ok) throw new Error(await r.text());
      onEnregistre();
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setEnvoi(false);
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 680, margin: "0 auto", paddingBottom: 90 }}>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={onRetour}>← Retour</button>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{p.nom} <span style={{ fontSize: 13, color: C.doux }}>· {p.nb_parts} parts · {p.famille}</span></div>

      <div style={{ ...carte, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><div style={lbl}>Prix fournisseur (€) 🔒</div><input inputMode="decimal" style={champ} value={f.prix_fournisseur} onChange={e => set("prix_fournisseur", e.target.value)} /></div>
        <div><div style={lbl}>Prix de revente (€)</div><input inputMode="decimal" style={champ} value={f.prix_revente} onChange={e => set("prix_revente", e.target.value)} onBlur={calculer} /></div>
        <div><div style={lbl}>Frais par produit (€)</div><input inputMode="decimal" style={champ} value={f.frais} onChange={e => set("frais", e.target.value)} placeholder="emballage, transport…" /></div>
        <div><div style={lbl}>Cotisations (%)</div><input inputMode="decimal" style={champ} value={f.cotisations} onChange={e => set("cotisations", e.target.value)} placeholder="selon votre régime" /></div>
        <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={!!f.confirme} onChange={e => set("confirme", e.target.checked)} style={{ width: 22, height: 22 }} /> Je confirme ce prix de revente
        </label>
      </div>

      <div style={{ ...carte }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🧮 Calculs (serveur, pour 1 produit)</div>
        {apercu ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, fontSize: 13 }}>
            <Info t="Marge brute" v={euros(apercu.marge_brute_centimes)} />
            <Info t="Taux de marque" v={pourcent(apercu.taux_marque_pct)} />
            <Info t="Taux de marge" v={pourcent(apercu.taux_marge_pct)} />
            <Info t="Frais" v={euros(apercu.frais_centimes)} />
            <Info t="Cotisations" v={apercu.cotisations_centimes == null ? "à renseigner" : euros(apercu.cotisations_centimes)} />
            <Info t="Gain estimé" v={euros(apercu.gain_estime_centimes)} />
          </div>) : <div style={{ color: C.doux, fontSize: 13 }}>Saisissez un prix de revente.</div>}
        <div style={{ fontSize: 11, color: C.doux, marginTop: 6 }}>Calcul basé sur les frais et cotisations enregistrés — enregistrez pour mettre à jour.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ width: 150 }}><div style={lbl}>Taux de marque visé (%)</div><input inputMode="decimal" style={champ} value={taux} onChange={e => setTaux(e.target.value)} /></div>
          <button style={btn()} onClick={async () => { try { setConseil(await sbRpc<number>("revente_prix_conseille", { p_produit: p.id, p_taux_marque: Number(taux.replace(",", ".")) })); } catch (e: any) { setMsg("❌ " + e.message); } }}>Prix conseillé</button>
          {conseil != null && <button style={btn(true)} onClick={() => { set("prix_revente", enEuros(conseil)); set("confirme", false); }}>{euros(conseil)} → utiliser (à confirmer)</button>}
        </div>
      </div>

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 10 }}>
        <div><div style={lbl}>Parfums disponibles (séparés par des virgules)</div><input style={champ} value={f.parfums} onChange={e => set("parfums", e.target.value)} placeholder="À renseigner d'après la fiche du fournisseur" /></div>
        <div><div style={lbl}>Conservation</div><input style={champ} value={f.conservation} onChange={e => set("conservation", e.target.value)} placeholder="D'après la fiche du fournisseur" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div style={lbl}>Date limite de précommande</div><input type="date" style={champ} value={f.date_limite_precommande} onChange={e => set("date_limite_precommande", e.target.value)} /></div>
          <div><div style={lbl}>Date de retrait</div><input type="date" style={champ} value={f.date_retrait} onChange={e => set("date_retrait", e.target.value)} /></div>
        </div>
      </div>

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>⚠️ Allergènes (14 catégories réglementaires)</div>
        <div style={{ fontSize: 12, color: C.doux }}>Une information manquante reste « inconnue » : elle n'est jamais considérée comme une absence. La publication est bloquée tant qu'une catégorie est inconnue.</div>
        {ALLERGENES.map(([k, l]) => { const st = f.allergenes?.[k]?.statut || "inconnu"; const coul = STATUTS_ALLERGENE.find(s => s[0] === st)?.[2]; return (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px", fontSize: 14 }}>{l}</div>
            <select style={{ ...champ, width: "auto", flex: "1 1 200px", color: coul }} value={st} onChange={e => set("allergenes", { ...f.allergenes, [k]: { ...(f.allergenes?.[k] || {}), statut: e.target.value } })}>
              {STATUTS_ALLERGENE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>); })}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div style={lbl}>Source (fiche technique…)</div><input style={champ} value={f.allergenes_source} onChange={e => set("allergenes_source", e.target.value)} /></div>
          <div><div style={lbl}>Vérifiés le</div><input type="date" style={champ} value={f.allergenes_verifies_le} onChange={e => set("allergenes_verifies_le", e.target.value)} /></div>
        </div>
      </div>
      <div style={{ ...carte, fontSize: 13, color: C.doux }}>📷 Photo : à déposer d'après les vraies photos du fournisseur (aucune image inventée).</div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      <div style={{ position: "sticky", bottom: 70, display: "flex", gap: 8, background: "rgba(20,12,16,0.92)", padding: 8, borderRadius: 12, border: `1px solid ${C.ligne}` }}>
        <button style={{ ...btn(true), flex: 1 }} disabled={envoi} onClick={enregistrer}>{envoi ? "…" : "💾 Enregistrer (reste en brouillon)"}</button>
      </div>
    </div>
  );
}

function Simulation({ produits }: { produits: any[] }) {
  const [pid, setPid] = useState(produits.find(p => p.nom === "Bûche 6 parts")?.id || produits[0]?.id || "");
  const [qte, setQte] = useState("10");
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const lancer = async () => {
    const q = parseInt(qte, 10);
    if (!Number.isInteger(q) || q < 1) { setErr("Quantité invalide"); return; }
    try { setRes(await sbRpc("revente_calcul", { p_produit: pid, p_quantite: q })); setErr(""); } catch (e: any) { setErr(String(e?.message || e)); setRes(null); }
  };
  useEffect(() => { if (pid) lancer(); /* eslint-disable-next-line */ }, []);
  return (
    <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>🧪 Simulation d'une commande client (aucun paiement réel)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "2 1 200px" }}><div style={lbl}>Produit</div><select style={champ} value={pid} onChange={e => setPid(e.target.value)}>{produits.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
        <div style={{ flex: "1 1 90px" }}><div style={lbl}>Quantité</div><input inputMode="numeric" style={champ} value={qte} onChange={e => setQte(e.target.value)} /></div>
        <button style={btn(true)} onClick={lancer}>Calculer</button>
      </div>
      {err && <div style={{ color: C.rouge, fontSize: 13 }}>{err}</div>}
      {res && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 15 }}>
          <Ligne t="Le client paie (un seul paiement)" v={euros(res.total_client_centimes)} fort />
          <Ligne t="Part fournisseur (seul montant visible par Vil'Dor Pâtisse)" v={euros(res.part_fournisseur_centimes)} />
          <Ligne t="Part Bella'Studio avant frais et charges" v={euros(res.marge_brute_centimes)} />
          <Ligne t="Frais" v={"− " + euros(res.frais_centimes)} />
          <Ligne t="Cotisations" v={res.cotisations_centimes == null ? "à renseigner" : "− " + euros(res.cotisations_centimes)} />
          <Ligne t="Gain estimé après charges" v={euros(res.gain_estime_centimes)} fort />
          <div style={{ fontSize: 12, color: C.doux }}>Montants calculés par le serveur en centimes, à partir des conditions enregistrées.</div>
        </div>)}
    </div>
  );
}
function Ligne({ t, v, fort }: { t: string; v: string; fort?: boolean }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${C.ligne}`, paddingTop: 6, fontWeight: fort ? 900 : 500 }}><span>{t}</span><span style={{ whiteSpace: "nowrap" }}>{v}</span></div>;
}

function Recap({ produits, commandes, conditions, onMaj, setMsg }: any) {
  const [lignes, setLignes] = useState<any[]>([{ produit_id: produits[0]?.id || "", parfum: "", quantite: "1" }]);
  const [retrait, setRetrait] = useState("");
  const [notes, setNotes] = useState("");
  const total = lignes.reduce((s, l) => s + (conditions[l.produit_id]?.prix_fournisseur_centimes || 0) * (parseInt(l.quantite, 10) || 0), 0);
  const preparer = async () => {
    const propres = lignes.map(l => ({ produit_id: l.produit_id, parfum: l.parfum || null, quantite: parseInt(l.quantite, 10) }));
    if (propres.some(l => !l.produit_id || !Number.isInteger(l.quantite) || l.quantite < 1)) { setMsg("❌ Vérifiez les quantités"); return; }
    try { await sbRpc("revente_preparer_commande_fournisseur", { p_collection: COLLECTION, p_lignes: propres, p_date_retrait: retrait || null, p_notes: notes || null }); setMsg(`✅ Récapitulatif préparé à ${heure()}`); setLignes([{ produit_id: produits[0]?.id || "", parfum: "", quantite: "1" }]); onMaj(); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const csv = (c: any) => {
    const l = [["Référence", "Produit", "Parts", "Parfum", "Quantité", "Prix fournisseur", "Total fournisseur"].join(";"),
      ...c.lignes.map((x: any) => [c.reference, x.nom, x.nb_parts, x.parfum || "à préciser", x.quantite, (x.prix_fournisseur_centimes / 100).toFixed(2).replace(".", ","), (x.prix_fournisseur_centimes * x.quantite / 100).toFixed(2).replace(".", ",")].join(";"))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + l.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `${c.reference}.csv`; a.click();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>📋 Préparer une commande pour le prestataire</div>
        {lignes.map((l, i) => { const p = produits.find((x: any) => x.id === l.produit_id); return (
          <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select style={{ ...champ, flex: "2 1 180px" }} value={l.produit_id} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, produit_id: e.target.value, parfum: "" } : x))}>{produits.map((p: any) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            <select style={{ ...champ, flex: "1 1 130px" }} value={l.parfum} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, parfum: e.target.value } : x))}>
              <option value="">{p?.parfums?.length ? "Parfum…" : "Parfum à préciser"}</option>{(p?.parfums || []).map((pf: string) => <option key={pf} value={pf}>{pf}</option>)}
            </select>
            <input inputMode="numeric" style={{ ...champ, flex: "0 1 80px" }} value={l.quantite} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, quantite: e.target.value } : x))} />
            {lignes.length > 1 && <button style={btn()} onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}>✕</button>}
          </div>); })}
        <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => setLignes(ls => [...ls, { produit_id: produits[0]?.id || "", parfum: "", quantite: "1" }])}>＋ Ligne</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><div style={lbl}>Date de retrait</div><input type="date" style={champ} value={retrait} onChange={e => setRetrait(e.target.value)} /></div>
          <div><div style={lbl}>Notes</div><input style={champ} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div style={{ fontSize: 14 }}>Part fournisseur estimée : <b>{euros(total)}</b> <span style={{ color: C.doux, fontSize: 12 }}>(montant définitif figé par le serveur)</span></div>
        <button style={btn(true)} onClick={preparer}>Préparer le récapitulatif</button>
      </div>
      {commandes.map((c: any) => (
        <div key={c.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <b>{c.reference}</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: c.simulation ? C.orange : C.ok }}>{c.simulation ? "SIMULATION" : "Réelle"} · {c.statut}</span>
          </div>
          {c.lignes.map((x: any, i: number) => <div key={i} style={{ fontSize: 13 }}>{x.quantite} × {x.nom} — {x.parfum || "parfum à préciser"}</div>)}
          <div style={{ fontSize: 13 }}>Part fournisseur : <b>{euros(c.part_fournisseur_centimes)}</b>{c.date_retrait ? ` · retrait ${new Date(c.date_retrait + "T12:00").toLocaleDateString("fr-FR")}` : ""}</div>
          {c.reponse_partenaire && <div style={{ fontSize: 13, color: C.or }}>💬 {c.reponse_partenaire}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {c.statut === "brouillon" && <button style={btn(true)} onClick={async () => { try { await sbUpdate("food_revente_commandes_fournisseur", c.id, { statut: "envoyee", updated_at: new Date().toISOString() }); setMsg("✅ Transmis à l'espace du prestataire"); onMaj(); } catch (e: any) { setMsg("❌ " + e.message); } }}>📤 Transmettre au prestataire</button>}
            {["brouillon", "envoyee"].includes(c.statut) && <button style={btn()} onClick={async () => { try { await sbUpdate("food_revente_commandes_fournisseur", c.id, { statut: "annulee", updated_at: new Date().toISOString() }); onMaj(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Annuler</button>}
            <button style={btn()} onClick={() => csv(c)}>⬇️ CSV</button>
          </div>
        </div>))}
    </div>
  );
}
