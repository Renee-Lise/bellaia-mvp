"use client";
// ═══════════════════════════════════════════════════════════
// Validation des photos Concorde Pro — fondatrice uniquement.
// • Les propositions viennent du serveur (/api/bsh/concorde/diagnostic?propositions=1) :
//   correspondance EXACTE par référence, jamais approximative.
// • RIEN n'est écrit sans un clic de la fondatrice, après aperçu des modifications.
// • Seuls la photo principale (image_url) et, sur option, la description
//   (usage_conseils, uniquement si elle est vide) sont modifiés. Jamais le nom,
//   le prix, le stock ni le statut.
// • Chaque lot validé peut être annulé (valeurs précédentes conservées).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { jeton, sbUpdate } from "../events/eventsAtelierLib";
import { MARQUES } from "../../design/marques";
import type { Proposition } from "../../lib/concordeExport";

const M = MARQUES.BSH;
type Classe = Proposition["classe"] | "provisoires" | "tous";
const LIBELLES: Record<Classe, string> = { tous: "Tous", pret: "Prêts", attente: "À valider", incomplet: "Incomplets", introuvable: "Introuvables", provisoires: "Prix provisoires" };
const CLE_JOURNAL = "bellaia_bsh_validations_photos";
type Ecriture = { id: string; nom: string; avant: { image_url: string | null; usage_conseils?: string | null }; apres: { image_url: string; usage_conseils?: string } };
type Lot = { le: string; ecritures: Ecriture[] };

export default function ValidationPhotosBSH() {
  const [etat, setEtat] = useState<"charge" | "pret" | "erreur">("charge");
  const [message, setMessage] = useState("");
  const [props, setProps] = useState<Proposition[]>([]);
  const [filtre, setFiltre] = useState<Classe>("pret");
  const [q, setQ] = useState("");
  const [choix, setChoix] = useState<Record<string, boolean>>({});
  const [avecDescription, setAvecDescription] = useState(false);
  const [apercu, setApercu] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [journal, setJournal] = useState<Lot[]>([]);
  const [info, setInfo] = useState("");

  const charger = async () => {
    setEtat("charge"); setMessage("");
    try {
      const r = await fetch("/api/bsh/concorde/diagnostic?propositions=1", { headers: { Authorization: `Bearer ${await jeton()}` }, cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setEtat("erreur"); setMessage(d.error || d.message || `Réponse HTTP ${r.status}`); return; }
      setProps(d.propositions || []); setEtat("pret");
    } catch (e: any) { setEtat("erreur"); setMessage(String(e?.message || e)); }
  };
  useEffect(() => { charger(); try { setJournal(JSON.parse(localStorage.getItem(CLE_JOURNAL) || "[]")); } catch {} }, []);

  const selectionnable = (p: Proposition) => (p.classe === "pret" || p.classe === "attente") && !!p.fournisseur?.images.length && !p.prixProvisoire && !p.prixACompleter;
  const visibles = useMemo(() => props.filter(p =>
    (filtre === "tous" || (filtre === "provisoires" ? (p.prixProvisoire || p.prixACompleter) : p.classe === filtre))
    && (!q || `${p.nom} ${p.ref} ${p.fournisseur?.titre || ""}`.toLowerCase().includes(q.toLowerCase()))), [props, filtre, q]);
  const compte = (c: Classe) => c === "tous" ? props.length : c === "provisoires" ? props.filter(p => p.prixProvisoire || p.prixACompleter).length : props.filter(p => p.classe === c).length;
  const selection = props.filter(p => choix[p.id] && selectionnable(p));
  const ecrituresPrevues: Ecriture[] = selection.map(p => {
    const apres: Ecriture["apres"] = { image_url: p.fournisseur!.images[0] };
    if (avecDescription && !p.descriptionActuelle && (p.fournisseur!.description || "").length >= 40) apres.usage_conseils = p.fournisseur!.description;
    return { id: p.id, nom: p.nom, avant: { image_url: p.imageActuelle, ...(apres.usage_conseils ? { usage_conseils: null } : {}) }, apres };
  }).filter(e => e.apres.image_url !== e.avant.image_url || e.apres.usage_conseils);
  const enLigneDansSelection = selection.filter(p => p.enLigne).length;

  const memoriser = (j: Lot[]) => { setJournal(j); try { localStorage.setItem(CLE_JOURNAL, JSON.stringify(j.slice(-20))); } catch {} };
  const appliquer = async () => {
    setEnvoi(true); setInfo(""); const faites: Ecriture[] = []; const echecs: string[] = [];
    for (const e of ecrituresPrevues) {
      try { await sbUpdate("stocks", e.id, { ...e.apres, updated_at: new Date().toISOString() }); faites.push(e); }
      catch (err: any) { echecs.push(`${e.nom} : ${String(err?.message || err).slice(0, 80)}`); }
    }
    if (faites.length) memoriser([...journal, { le: new Date().toISOString(), ecritures: faites }]);
    setProps(ps => ps.map(p => { const f = faites.find(x => x.id === p.id); return f ? { ...p, imageActuelle: f.apres.image_url, descriptionActuelle: p.descriptionActuelle || !!f.apres.usage_conseils } : p; }));
    setChoix({}); setApercu(false); setEnvoi(false);
    setInfo(`✅ ${faites.length} fiche${faites.length > 1 ? "s" : ""} mise${faites.length > 1 ? "s" : ""} à jour${echecs.length ? ` · ❌ ${echecs.length} échec(s) : ${echecs.join(" ; ")}` : ""}.`);
  };
  const annulerDernier = async () => {
    const lot = journal[journal.length - 1]; if (!lot || !confirm(`Annuler le lot du ${new Date(lot.le).toLocaleString("fr-FR")} (${lot.ecritures.length} fiche(s)) ?`)) return;
    setEnvoi(true); let n = 0;
    for (const e of lot.ecritures) { try { await sbUpdate("stocks", e.id, { ...e.avant, updated_at: new Date().toISOString() }); n++; } catch {} }
    memoriser(journal.slice(0, -1)); setProps(ps => ps.map(p => { const e = lot.ecritures.find(x => x.id === p.id); return e ? { ...p, imageActuelle: e.avant.image_url } : p; }));
    setEnvoi(false); setInfo(`↩️ ${n} fiche(s) remise(s) dans leur état précédent.`);
  };

  const pastille = (actif: boolean): React.CSSProperties => ({ flex: "none", minHeight: 36, padding: "7px 13px", borderRadius: 999, border: `1px solid ${actif ? M.accent : M.ligne}`, background: actif ? M.accent : "transparent", color: actif ? M.accentTexte : M.texte, fontWeight: actif ? 800 : 500, fontSize: 13, fontFamily: M.sans, cursor: "pointer" });
  const bouton = (fort = false): React.CSSProperties => ({ minHeight: 44, padding: "10px 16px", borderRadius: 999, border: fort ? "none" : `1px solid ${M.ligne}`, background: fort ? M.secondaire : "rgba(255,255,255,0.04)", color: fort ? M.accentTexte : M.texte, fontWeight: 800, fontSize: 14, fontFamily: M.sans, cursor: "pointer" });
  const puce = (t: string, c = M.doux) => <span key={t} style={{ fontSize: 11, color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: "2px 8px" }}>{t}</span>;

  return (
    <div style={{ background: M.fond, color: M.texte, fontFamily: M.sans, borderRadius: 20, border: `1px solid ${M.ligne}`, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontFamily: M.serif, fontSize: 22, fontWeight: 700, color: M.accent }}>Photos Concorde Pro</div>
        <div style={{ fontSize: 13, color: M.doux, lineHeight: 1.5 }}>Correspondance exacte par référence. Rien n'est modifié sans votre validation ; seuls la photo principale et, si vous le choisissez, la description vide sont complétées. Prix, stock et statut ne sont jamais touchés.</div>
      </div>
      {etat === "charge" && <div style={{ color: M.doux }}>Lecture du catalogue fournisseur…</div>}
      {etat === "erreur" && <div style={{ color: "#f5a3a3", fontSize: 14 }}>{message} <button onClick={charger} style={{ ...bouton(), minHeight: 34, marginLeft: 6 }}>Réessayer</button></div>}
      {etat === "pret" && <>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {(["pret", "attente", "incomplet", "introuvable", "provisoires", "tous"] as Classe[]).map(c => <button key={c} onClick={() => setFiltre(c)} style={pastille(filtre === c)}>{LIBELLES[c]} ({compte(c)})</button>)}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un produit ou une référence" style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${M.ligne}`, background: M.surface, color: M.texte, padding: "10px 14px", fontSize: 16 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setChoix(x => ({ ...x, ...Object.fromEntries(visibles.filter(selectionnable).map(p => [p.id, true])) }))} style={bouton()}>Tout sélectionner ({visibles.filter(selectionnable).length})</button>
          <button onClick={() => setChoix({})} style={bouton()}>Vider la sélection</button>
          {journal.length > 0 && <button onClick={annulerDernier} disabled={envoi} style={bouton()}>↩️ Annuler le dernier lot</button>}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: M.doux }}>
          <input type="checkbox" checked={avecDescription} onChange={e => setAvecDescription(e.target.checked)} style={{ width: 20, height: 20 }} />
          Reprendre aussi la description du fournisseur quand la fiche n'en a pas (uniquement si Concorde Pro a confirmé les droits).
        </label>
        {info && <div style={{ fontSize: 13, color: "#9be7b4" }}>{info}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibles.slice(0, 200).map(p => {
            const ok = selectionnable(p); const img = p.fournisseur?.images[0];
            return (
              <label key={p.id} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 16, border: `1px solid ${choix[p.id] ? M.accent : M.ligne}`, background: M.surface, cursor: ok ? "pointer" : "default", opacity: ok || p.classe === "introuvable" ? 1 : 0.85 }}>
                <input type="checkbox" disabled={!ok} checked={!!choix[p.id]} onChange={e => setChoix(x => ({ ...x, [p.id]: e.target.checked }))} style={{ width: 22, height: 22, flex: "none", marginTop: 4 }} aria-label={`Sélectionner ${p.nom}`} />
                {img ? <img src={img} alt="" loading="lazy" width={72} height={72} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, background: "#fff", flex: "none" }} />
                  : <div style={{ width: 72, height: 72, borderRadius: 12, background: M.surface2, flex: "none", display: "grid", placeItems: "center", fontSize: 11, color: M.doux }}>sans photo</div>}
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{p.nom}</div>
                  <div style={{ fontSize: 12, color: M.doux }}>Réf. {p.ref || "—"} · {p.prixVente != null ? `${p.prixVente.toFixed(2).replace(".", ",")} €` : "sans prix"}{p.fournisseur ? ` · stock fournisseur : ${p.fournisseur.stock ?? "?"} · ${p.fournisseur.images.length} photo(s)` : ""}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.enLigne && puce("déjà en boutique", M.secondaire)}
                    {p.imageActuelle && puce("photo déjà rattachée", "#9be7b4")}
                    {p.prixProvisoire && puce("prix provisoire", "#f5b26b")}
                    {p.manques.map(m => puce(m, "#f5b26b"))}
                    {p.aValider.map(m => puce(m, M.accent))}
                  </div>
                </div>
              </label>
            );
          })}
          {visibles.length > 200 && <div style={{ fontSize: 12, color: M.doux }}>200 premiers affichés — affinez la recherche.</div>}
        </div>
        {selection.length > 0 && !apercu && (
          <button onClick={() => setApercu(true)} style={{ ...bouton(true), position: "sticky", bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 5 }}>Aperçu des modifications ({selection.length})</button>
        )}
        {apercu && (
          <div role="dialog" aria-label="Aperçu des modifications" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" }}>
            <div style={{ background: M.surface, width: "100%", maxHeight: "85vh", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "16px 16px calc(20px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: M.serif, fontSize: 21, fontWeight: 700 }}>Aperçu des modifications</div>
              <div style={{ fontSize: 13, color: M.doux }}>{ecrituresPrevues.length} fiche(s) seront modifiées. {enLigneDansSelection > 0 && <b style={{ color: M.secondaire }}>{enLigneDansSelection} produit(s) sont déjà en boutique : la photo y apparaîtra immédiatement.</b>} Les images secondaires ne sont pas encore enregistrées (aucun champ prévu pour elles).</div>
              {ecrituresPrevues.map(e => (
                <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: `1px solid ${M.ligne}`, paddingBottom: 8 }}>
                  <img src={e.apres.image_url} alt="" width={52} height={52} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, background: "#fff" }} />
                  <div style={{ fontSize: 13 }}><b>{e.nom}</b><div style={{ color: M.doux }}>Photo : {e.avant.image_url ? "remplacée" : "aucune → photo fournisseur"}{e.apres.usage_conseils ? " · description : vide → texte fournisseur" : ""}</div></div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setApercu(false)} style={{ ...bouton(), flex: 1 }}>Revenir</button>
                <button onClick={appliquer} disabled={envoi || !ecrituresPrevues.length} style={{ ...bouton(true), flex: 2, opacity: envoi ? 0.6 : 1 }}>{envoi ? "Enregistrement…" : `Valider ${ecrituresPrevues.length} fiche(s)`}</button>
              </div>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}
