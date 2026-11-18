"use client";
// ═══════════════════════════════════════════════════════════
// Réductions — codes promo et remises (fondatrice / permission
// reductions.gerer). Pourcentage ou montant, par univers, période,
// minimum de commande, nombre d'utilisations, une par cliente.
// Les codes sont appliqués et comptés PAR LE SERVEUR à la commande ;
// une cliente ne peut jamais lister les codes ni s'appliquer une remise.
// Table : bellaia_reductions (migration 0118).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { sbSelect, sbInsert, sbUpdate } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, heure } from "../equipe/equipeLib";

const UNIVERS: [string, string][] = [["*", "Toutes les boutiques"], ["FOOD", "Bella'Food"], ["BSH", "Bella'Secret Home"], ["ODYSSEE", "Bella'Odyssée"], ["EVENTS", "Bella'Even's"], ["VILO", "Vilo'Assistance"], ["EDITIONS", "Bella'Éditions"]];
const vide = { code: "", libelle: "", type: "pourcentage", valeur: "", univers: "*", date_debut: "", date_fin: "", minimum_commande: "", utilisations_max: "", une_par_cliente: false, actif: true, notes: "" };

export default function ReductionsF() {
  const [liste, setListe] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [charge, setCharge] = useState(true);
  const charger = async () => { setCharge(true); try { setListe(await sbSelect("bellaia_reductions", "order=created_at.desc")); } catch (e: any) { setMsg("❌ " + e.message); } setCharge(false); };
  useEffect(() => { charger(); }, []);

  const enregistrer = async () => {
    const v = Number(String(edit.valeur).replace(",", "."));
    if (!edit.libelle.trim()) { setMsg("❌ Donnez un nom à la réduction"); return; }
    if (!Number.isFinite(v) || v <= 0 || (edit.type === "pourcentage" && v > 100)) { setMsg("❌ Valeur invalide (pourcentage entre 1 et 100, ou montant positif)"); return; }
    const code = edit.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code && !/^[A-Z0-9_-]{3,30}$/.test(code)) { setMsg("❌ Code : 3 à 30 lettres ou chiffres, sans espace"); return; }
    const ligne: any = {
      code: code || null, libelle: edit.libelle.trim(), type: edit.type, valeur: v, univers: edit.univers,
      date_debut: edit.date_debut || null, date_fin: edit.date_fin || null,
      minimum_commande: edit.minimum_commande === "" ? null : Number(String(edit.minimum_commande).replace(",", ".")),
      utilisations_max: edit.utilisations_max === "" ? null : parseInt(edit.utilisations_max, 10),
      une_par_cliente: !!edit.une_par_cliente, actif: !!edit.actif, notes: edit.notes || null, updated_at: new Date().toISOString(),
    };
    try {
      if (edit.id) await sbUpdate("bellaia_reductions", edit.id, ligne); else await sbInsert("bellaia_reductions", ligne);
      setMsg(`✅ Réduction enregistrée à ${heure()}`); setEdit(null); charger();
    } catch (e: any) { setMsg("❌ " + (/duplicate|unique/i.test(e.message) ? "Ce code existe déjà." : e.message)); }
  };

  if (edit) return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 10, maxWidth: 600, margin: "0 auto", paddingBottom: 80 }}>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => setEdit(null)}>← Retour</button>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{edit.id ? "Modifier la réduction" : "Nouvelle réduction"}</div>
      <div><div style={lbl}>Nom (affiché à la cliente)</div><input style={champ} value={edit.libelle} onChange={e => setEdit({ ...edit, libelle: e.target.value })} placeholder="Ex. Noël −10 %" /></div>
      <div><div style={lbl}>Code (facultatif)</div><input style={champ} value={edit.code} onChange={e => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="NOEL10" autoCapitalize="characters" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><div style={lbl}>Type</div><select style={champ} value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}><option value="pourcentage">Pourcentage (%)</option><option value="montant">Montant (€)</option></select></div>
        <div><div style={lbl}>Valeur</div><input inputMode="decimal" style={champ} value={edit.valeur} onChange={e => setEdit({ ...edit, valeur: e.target.value })} placeholder={edit.type === "pourcentage" ? "10" : "5"} /></div>
        <div><div style={lbl}>Boutique</div><select style={champ} value={edit.univers} onChange={e => setEdit({ ...edit, univers: e.target.value })}>{UNIVERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><div style={lbl}>Minimum de commande (€)</div><input inputMode="decimal" style={champ} value={edit.minimum_commande} onChange={e => setEdit({ ...edit, minimum_commande: e.target.value })} /></div>
        <div><div style={lbl}>Début</div><input type="date" style={champ} value={edit.date_debut} onChange={e => setEdit({ ...edit, date_debut: e.target.value })} /></div>
        <div><div style={lbl}>Fin</div><input type="date" style={champ} value={edit.date_fin} onChange={e => setEdit({ ...edit, date_fin: e.target.value })} /></div>
        <div><div style={lbl}>Utilisations max</div><input inputMode="numeric" style={champ} value={edit.utilisations_max} onChange={e => setEdit({ ...edit, utilisations_max: e.target.value })} placeholder="illimité" /></div>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={!!edit.une_par_cliente} onChange={e => setEdit({ ...edit, une_par_cliente: e.target.checked })} style={{ width: 20, height: 20 }} /> Une seule utilisation par cliente (compte requis)</label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={!!edit.actif} onChange={e => setEdit({ ...edit, actif: e.target.checked })} style={{ width: 20, height: 20 }} /> Active</label>
      <div><div style={lbl}>Notes internes</div><textarea style={{ ...champ, minHeight: 60 }} value={edit.notes || ""} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      <button style={btn(true)} onClick={enregistrer}>💾 Enregistrer</button>
    </div>
  );

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🎁 Réductions</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>Codes promo et remises. Le serveur vérifie et compte chaque utilisation à la commande ; une cliente ne peut ni voir la liste ni s'appliquer une remise. Pour une remise ponctuelle, ouvrez la commande concernée.</div>
      </div>
      <button style={{ ...btn(true), alignSelf: "flex-start" }} onClick={() => setEdit({ ...vide })}>＋ Nouvelle réduction</button>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {!charge && !liste.length && <div style={{ ...carte, color: C.doux, fontSize: 13 }}>Aucune réduction pour le moment.</div>}
      {liste.map(r => {
        const expire = r.date_fin && new Date(r.date_fin + "T23:59") < new Date();
        const epuise = r.utilisations_max != null && r.utilisations >= r.utilisations_max;
        const etat = !r.actif ? ["Inactive", C.doux] : expire ? ["Expirée", C.rouge] : epuise ? ["Épuisée", C.orange] : ["Active", C.ok];
        return (
          <button key={r.id} onClick={() => setEdit({ ...vide, ...r, valeur: String(r.valeur), minimum_commande: r.minimum_commande ?? "", utilisations_max: r.utilisations_max ?? "", date_debut: r.date_debut || "", date_fin: r.date_fin || "", code: r.code || "" })}
            style={{ ...carte, textAlign: "left", color: C.texte, fontFamily: SA, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <b>{r.libelle}{r.code ? ` · ${r.code}` : ""}</b><span style={{ fontSize: 12, fontWeight: 800, color: etat[1] as string }}>{etat[0]}</span>
            </div>
            <div style={{ fontSize: 13, color: C.doux }}>
              {r.type === "pourcentage" ? `−${Number(r.valeur)} %` : `−${Number(r.valeur).toFixed(2).replace(".", ",")} €`} · {UNIVERS.find(u => u[0] === r.univers)?.[1] || r.univers}
              {r.minimum_commande ? ` · dès ${Number(r.minimum_commande).toFixed(2).replace(".", ",")} €` : ""}
              {r.date_fin ? ` · jusqu'au ${new Date(r.date_fin + "T12:00").toLocaleDateString("fr-FR")}` : ""}
              {" · "}{r.utilisations}{r.utilisations_max != null ? `/${r.utilisations_max}` : ""} utilisation{r.utilisations > 1 ? "s" : ""}
            </div>
          </button>);
      })}
    </div>
  );
}
