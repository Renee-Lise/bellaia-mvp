"use client";
// Inventaire physique BSH — fondatrice uniquement (règle d'accès « Fondatrice gère les stocks »).
// • Fiche d'inventaire imprimable (A4) pour un lot de références.
// • Saisie des quantités comptées, puis correction du stock en base après confirmation.
// • Chaque correction est tracée dans les notes de la fiche (avant → après, date) et peut être annulée.
// • Lot « absents du catalogue fournisseur » : si le comptage donne 0, la fiche peut être masquée (réversible),
//   uniquement sur action explicite. Lot « ruptures avec stock » : aucune désactivation proposée.
// Aucune suppression, aucun changement de prix.
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbUpdate } from "../events/eventsAtelierLib";

type Fiche = { id: string; nom: string | null; notes: string | null; quantite: number | null; statut: string | null; categorie: string | null };
type Ligne = Fiche & { ref: string };
type Lot = { id: string; titre: string; detail: string; refs: string[]; masquageSiZero: boolean };

// Lots validés par la fondatrice le 23/11/2026 (références fournisseur publiques).
export const LOTS_INVENTAIRE: Lot[] = [
  { id: "ruptures", titre: "Ruptures fournisseur avec stock en base (10)", detail: "Aucune désactivation : vérifier les quantités réelles.", masquageSiZero: false,
    refs: ["800400", "597430021020", "530533019420", "530552020120", "530531019420", "514085020120", "514071003020", "520182001020", "530638005020", "747578021400"] },
  { id: "absents", titre: "Absents du catalogue fournisseur (6)", detail: "Stock existant : vente jusqu'à épuisement. Stock inexistant : masquage (réversible).", masquageSiZero: true,
    refs: ["747522003010", "747678003000", "747677003000", "747679003000", "746241001004", "730003919421"] },
];

export const refDepuisNotes = (notes: string | null) => (notes || "").match(/Réf\.?\s+([0-9A-Za-z]+)/)?.[1] || "";
export const quantiteValide = (s: string) => /^\d{1,4}$/.test(s.trim());
const aujourdhui = () => new Date().toLocaleDateString("fr-FR");
const echap = (t: string) => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function ficheImprimable(lot: Lot, lignes: Ligne[]): string {
  const rangs = lignes.map((l, i) => `<tr><td>${i + 1}</td><td>${echap(l.ref)}</td><td>${echap(l.nom || "")}</td><td class="n">${l.quantite ?? 0}</td><td class="vide"></td><td class="vide large"></td></tr>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Inventaire BSH — ${echap(lot.titre)}</title><style>
@page{size:A4 portrait;margin:14mm}body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;font-size:11pt}
h1{font-size:16pt;margin:0 0 4px}p{margin:2px 0 10px;color:#444}table{width:100%;border-collapse:collapse}
th,td{border:1px solid #555;padding:7px 6px;vertical-align:top}th{background:#eee;text-align:left;font-size:10pt}
td.n{text-align:center}td.vide{height:28px;min-width:70px}td.large{min-width:160px}.sig{margin-top:18px;display:flex;gap:40px}
</style></head><body><h1>Inventaire physique BSH — ${echap(lot.titre)}</h1>
<p>${echap(lot.detail)} · Fiche éditée le ${aujourdhui()} · ${lignes.length} références</p>
<table><thead><tr><th>#</th><th>Réf.</th><th>Désignation</th><th>Stock en base</th><th>Quantité comptée</th><th>Observations (état, emplacement)</th></tr></thead><tbody>${rangs}</tbody></table>
<div class="sig"><div>Compté par : ____________________</div><div>Date : ____ / ____ / ______</div><div>Signature : ____________</div></div>
</body></html>`;
}

export default function InventaireBSH({ couleur = "#c9a96e", doux = "rgba(241,236,224,0.65)" }: { couleur?: string; doux?: string }) {
  const [lotId, setLotId] = useState(LOTS_INVENTAIRE[0].id);
  const [fiches, setFiches] = useState<Ligne[] | null>(null);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);
  const [dernier, setDernier] = useState<{ id: string; quantite: number | null; notes: string | null; statut: string | null }[]>([]);
  const [occupe, setOccupe] = useState(false);
  const lot = LOTS_INVENTAIRE.find(l => l.id === lotId)!;

  const charger = async () => {
    try {
      const rows = await sbSelect<Fiche>("stocks", "univers=eq.BSH&select=id,nom,notes,quantite,statut,categorie&order=nom.asc&limit=1000");
      setFiches(rows.map(r => ({ ...r, ref: refDepuisNotes(r.notes) })));
    } catch (e: any) { setMessage({ ok: false, t: "Lecture des stocks impossible : " + (e?.message || e) }); setFiches([]); }
  };
  useEffect(() => { charger(); }, []);

  const lignes = useMemo(() => (fiches || []).filter(f => lot.refs.includes(f.ref)).sort((a, b) => lot.refs.indexOf(a.ref) - lot.refs.indexOf(b.ref)), [fiches, lot]);
  const manquantes = lot.refs.filter(r => fiches && !fiches.some(f => f.ref === r));
  const changements = lignes.filter(l => (saisie[l.id] ?? "") !== "" && quantiteValide(saisie[l.id]) && Number(saisie[l.id]) !== (l.quantite ?? 0));
  const invalides = lignes.filter(l => (saisie[l.id] ?? "") !== "" && !quantiteValide(saisie[l.id]));

  const imprimer = () => {
    const html = ficheImprimable(lot, lignes);
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* l'utilisateur imprime depuis l'onglet */ } }, 300); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html" })); a.download = `Inventaire_BSH_${lot.id}_${new Date().toISOString().slice(0, 10)}.html`; a.click();
  };

  const enregistrer = async () => {
    if (!changements.length || invalides.length) return;
    const resume = changements.map(l => `• ${l.ref} : ${l.quantite ?? 0} → ${Number(saisie[l.id])}`).join("\n");
    if (!window.confirm(`Corriger le stock de ${changements.length} produit(s) ?\n\n${resume}\n\nLes prix ne sont pas modifiés.`)) return;
    setOccupe(true); const sauvegarde: typeof dernier = []; let n = 0; const echecs: string[] = [];
    for (const l of changements) {
      const q = Number(saisie[l.id]);
      try {
        await sbUpdate("stocks", l.id, { quantite: q, updated_at: new Date().toISOString(), notes: `${l.notes || ""} — Inventaire du ${aujourdhui()} : ${l.quantite ?? 0} → ${q} (comptage physique)` });
        sauvegarde.push({ id: l.id, quantite: l.quantite, notes: l.notes, statut: l.statut }); n++;
      } catch { echecs.push(l.ref); }
    }
    setDernier(sauvegarde); setSaisie({}); await charger(); setOccupe(false);
    setMessage(echecs.length ? { ok: false, t: `${n} stock(s) corrigé(s) ; échec pour ${echecs.join(", ")}.` } : { ok: true, t: `${n} stock(s) corrigé(s). Vous pouvez annuler cette correction.` });
  };

  const annuler = async () => {
    if (!dernier.length || !window.confirm(`Rétablir les ${dernier.length} valeur(s) d'avant la dernière correction ?`)) return;
    setOccupe(true); let n = 0;
    for (const d of dernier) { try { await sbUpdate("stocks", d.id, { quantite: d.quantite, notes: d.notes, statut: d.statut, updated_at: new Date().toISOString() }); n++; } catch { /* signalé ci-dessous */ } }
    setDernier([]); await charger(); setOccupe(false); setMessage({ ok: n > 0, t: `${n} fiche(s) rétablie(s).` });
  };

  const masquer = async (l: Ligne) => {
    if (!window.confirm(`Masquer « ${l.nom} » (${l.ref}) de la boutique ?\nStock compté : 0. Opération réversible, aucune suppression.`)) return;
    setOccupe(true);
    try {
      await sbUpdate("stocks", l.id, { statut: "inactif", updated_at: new Date().toISOString(), notes: `${l.notes || ""} — Masqué le ${aujourdhui()} : absent du catalogue fournisseur, stock compté 0` });
      setDernier([{ id: l.id, quantite: l.quantite, notes: l.notes, statut: l.statut }]); setMessage({ ok: true, t: `${l.ref} masqué. Vous pouvez annuler.` });
    } catch (e: any) { setMessage({ ok: false, t: "Masquage impossible : " + (e?.message || e) }); }
    await charger(); setOccupe(false);
  };

  const bouton = (actif = true): React.CSSProperties => ({ minHeight: 44, padding: "8px 14px", borderRadius: 10, border: `1px solid ${couleur}`, background: actif ? `${couleur}22` : "transparent", color: couleur, fontWeight: 700, fontSize: 14, opacity: actif ? 1 : 0.5 });
  return (
    <section aria-label="Inventaire physique BSH" style={{ marginTop: 10, fontSize: 14 }}>
      <h3 style={{ margin: "4px 0 8px", fontSize: 17 }}>📋 Inventaire physique</h3>
      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {LOTS_INVENTAIRE.map(l => <button key={l.id} role="tab" aria-selected={l.id === lotId} onClick={() => { setLotId(l.id); setSaisie({}); setMessage(null); }} style={bouton(l.id === lotId)}>{l.titre}</button>)}
      </div>
      <p style={{ color: doux, margin: "8px 0" }}>{lot.detail}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={imprimer} disabled={!lignes.length} style={bouton()}>🖨 Imprimer la fiche d'inventaire</button>
        <button onClick={enregistrer} disabled={occupe || !changements.length || invalides.length > 0} style={bouton(changements.length > 0 && !invalides.length)}>✓ Enregistrer le comptage ({changements.length})</button>
        {dernier.length > 0 && <button onClick={annuler} disabled={occupe} style={bouton()}>↶ Annuler la dernière correction</button>}
      </div>
      {message && <div role={message.ok ? "status" : "alert"} style={{ padding: 8, borderRadius: 8, marginBottom: 8, background: message.ok ? "rgba(34,197,94,0.12)" : "rgba(251,146,60,0.15)" }}>{message.t}</div>}
      {invalides.length > 0 && <div role="alert" style={{ color: "#fb923c", marginBottom: 8 }}>Quantité invalide pour {invalides.map(l => l.ref).join(", ")} : nombre entier de 0 à 9999.</div>}
      {fiches === null ? <div>Chargement des stocks…</div> : <>
        {manquantes.length > 0 && <div role="alert" style={{ color: "#fb923c", marginBottom: 8 }}>Référence(s) introuvable(s) en base : {manquantes.join(", ")}.</div>}
        <ul aria-label="Produits à compter" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {lignes.map(l => {
            const v = saisie[l.id] ?? ""; const compteZero = lot.masquageSiZero && (l.quantite ?? 0) === 0 && l.statut === "actif";
            return <li key={l.id} style={{ border: "1px solid rgba(201,169,110,0.25)", borderRadius: 12, padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{l.nom}</div>
              <div style={{ color: doux, fontSize: 12 }}>Réf. {l.ref} · {l.statut === "actif" ? "en boutique" : "masqué"} · stock en base : <strong>{l.quantite ?? 0}</strong></div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span>Quantité comptée</span>
                <input inputMode="numeric" pattern="[0-9]*" aria-label={`Quantité comptée pour ${l.ref}`} value={v} onChange={e => setSaisie(s => ({ ...s, [l.id]: e.target.value }))}
                  style={{ width: 90, minHeight: 44, fontSize: 16, borderRadius: 8, padding: "4px 8px", border: `1px solid ${couleur}` }} />
              </label>
              {compteZero && <button onClick={() => masquer(l)} disabled={occupe} style={{ ...bouton(), marginTop: 8 }}>Masquer (stock compté à 0)</button>}
              {!lot.masquageSiZero && (l.quantite ?? 0) === 0 && <div style={{ color: "#fb923c", fontSize: 12, marginTop: 6 }}>Stock à 0 et rupture fournisseur : décision à prendre (aucune désactivation automatique).</div>}
            </li>;
          })}
        </ul>
      </>}
    </section>
  );
}
