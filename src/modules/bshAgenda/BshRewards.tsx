"use client";
// ═══════════════════════════════════════════════════════════
// BSH Rewards — fidélisation et concours autorisés (gestion
// administrative). Rien n'est publié ni ouvert automatiquement :
// la participation ne peut être ouverte qu'après les 3 validations
// (fondatrice, juridique, plateforme) — règle aussi imposée par une
// contrainte SQL. Participants = données personnelles, fondatrice seule.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { K, FS, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, sbSelect, sbInsert, sbUpdate, sbDelete, versIso, cleJour, heureCayenne, libelleInstant } from "./bshAgendaLib";
import type { Donnees, Reward } from "./BshAgendaHub";

const STATUTS: [string, string, string][] = [["brouillon", "Brouillon", K.cremeD], ["en_verification", "En vérification", K.alerte], ["validee", "Validée", K.or], ["active", "Active", K.ok], ["cloturee", "Clôturée", "#9085e9"], ["annulee", "Annulée", K.erreur]];
const REMISES: Record<string, string> = { non_concerne: "—", a_remettre: "À remettre", remis: "Remis", refuse: "Refusé" };
const eur = (n: any) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const toutValide = (r: any) => r.validation_fondatrice && r.validation_juridique && r.validation_plateforme;

function Participants({ r }: { r: Reward }) {
  const [liste, setListe] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [erreur, setErreur] = useState("");
  const charger = () => sbSelect("bsh_rewards_participants", `select=*&campagne_id=eq.${r.id}&order=date_participation.asc`).then(setListe).catch(e => setErreur(e.message));
  useEffect(() => { charger(); }, [r.id]);
  const maj = async (p: any, patch: any) => { try { await sbUpdate("bsh_rewards_participants", p.id, patch); charger(); } catch (e: any) { setErreur(e.message); } };
  const ajouter = async () => { if (!form?.pseudo?.trim()) return; try { await sbInsert("bsh_rewards_participants", { campagne_id: r.id, pseudo: form.pseudo.trim(), contact: form.contact || null, notes: form.notes || null }, "return=minimal"); setForm(null); charger(); } catch (e: any) { setErreur(e.message); } };
  const gagnants = liste.filter(p => p.gagnant);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontSize: 12, fontWeight: 700, color: K.or, flex: 1 }}>Participants ({liste.length}) · gagnants {gagnants.length} · remis {gagnants.filter(p => p.statut_remise === "remis").length}</div><button style={bouton("ghost", true)} onClick={() => setForm({})}>+ Participant</button></div>
      <div style={{ fontSize: 10, color: K.cremeD }}>Données personnelles : visibles par la fondatrice uniquement. N'enregistre que le nécessaire (pseudo + moyen de contact pour la remise).</div>
      {form && <div style={{ ...grille(160), alignItems: "end" }}>
        <input style={champ} placeholder="Pseudo *" value={form.pseudo || ""} onChange={e => setForm({ ...form, pseudo: e.target.value })} />
        <input style={champ} placeholder="Contact (pour la remise)" value={form.contact || ""} onChange={e => setForm({ ...form, contact: e.target.value })} />
        <div style={{ display: "flex", gap: 5 }}><button style={bouton("or", true)} onClick={ajouter}>Ajouter</button><button style={bouton("ghost", true)} onClick={() => setForm(null)}>✕</button></div>
      </div>}
      {liste.length === 0 ? <Vide>Aucun participant.</Vide> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: K.creme, minWidth: 620 }}>
            <thead><tr style={{ color: K.cremeD, fontSize: 10, textTransform: "uppercase", textAlign: "left" }}>{["Pseudo", "Contact", "Éligible", "Gagnant", "Lot", "Remise", ""].map(h => <th key={h} style={{ padding: "6px 5px", borderBottom: `1px solid ${K.ligne}` }}>{h}</th>)}</tr></thead>
            <tbody>{liste.map(p => <tr key={p.id} style={{ borderBottom: `1px solid ${K.ligne}` }}>
              <td style={{ padding: 5 }}>{p.pseudo}</td>
              <td style={{ padding: 5, color: K.cremeF }}>{p.contact || "—"}</td>
              <td style={{ padding: 5 }}><select style={{ ...champ, padding: 4 }} value={p.eligible == null ? "" : p.eligible ? "o" : "n"} onChange={e => maj(p, { eligible: e.target.value === "" ? null : e.target.value === "o" })}><option value="">?</option><option value="o">Oui</option><option value="n">Non</option></select></td>
              <td style={{ padding: 5 }}><input type="checkbox" checked={p.gagnant} onChange={e => maj(p, { gagnant: e.target.checked, statut_remise: e.target.checked ? (p.statut_remise === "non_concerne" ? "a_remettre" : p.statut_remise) : "non_concerne" })} /></td>
              <td style={{ padding: 5 }}>{p.gagnant ? <select style={{ ...champ, padding: 4 }} value={p.lot || ""} onChange={e => maj(p, { lot: e.target.value || null })}><option value="">—</option>{(r.lots || []).map((l: any, i: number) => <option key={i} value={l.libelle}>{l.libelle}</option>)}</select> : "—"}</td>
              <td style={{ padding: 5 }}>{p.gagnant ? <select style={{ ...champ, padding: 4 }} value={p.statut_remise} onChange={e => maj(p, { statut_remise: e.target.value, date_remise: e.target.value === "remis" ? new Date().toISOString() : null })}>{["a_remettre", "remis", "refuse"].map(s => <option key={s} value={s}>{REMISES[s]}</option>)}</select> : "—"}{p.date_remise && <div style={{ fontSize: 9, color: K.cremeD }}>{libelleInstant(p.date_remise)}</div>}</td>
              <td style={{ padding: 5 }}><button style={bouton("ghost", true)} onClick={async () => { if (confirm(`Supprimer ${p.pseudo} ?`)) { await sbDelete("bsh_rewards_participants", p.id); charger(); } }}>✕</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <Erreur msg={erreur} />
    </div>
  );
}

function EditeurReward({ r: init, d, onFermer, recharger }: { r: Reward; d: Donnees; onFermer: () => void; recharger: () => void }) {
  const [r, setR] = useState<any>({ ...init, lots: init.lots || [] });
  const [deb, setDeb] = useState({ j: init.date_debut ? cleJour(init.date_debut) : "", h: init.date_debut ? heureCayenne(init.date_debut) : "08:00" });
  const [fin, setFin] = useState({ j: init.date_cloture ? cleJour(init.date_cloture) : "", h: init.date_cloture ? heureCayenne(init.date_cloture) : "21:00" });
  const [erreur, setErreur] = useState("");
  const maj = (p: any) => setR((x: any) => ({ ...x, ...p }));
  const valide = toutValide(r);
  const valeurLots = r.lots.reduce((s: number, l: any) => s + (Number(l.valeur) || 0) * (Number(l.quantite) || 0), 0);
  const enregistrer = async (patch: any = {}) => {
    const x = { ...r, ...patch };
    if (!x.titre?.trim()) return setErreur("Titre obligatoire.");
    if (x.participation_ouverte && !toutValide(x)) return setErreur("Impossible d'ouvrir la participation : les 3 validations sont nécessaires.");
    const corps = { titre: x.titre.trim(), description: x.description || null, reglement: x.reglement || null, conditions_eligibilite: x.conditions_eligibilite || null, date_debut: deb.j ? versIso(deb.j, deb.h) : null, date_cloture: fin.j ? versIso(fin.j, fin.h) : null, lots: x.lots.filter((l: any) => l.libelle?.trim()), quantite_disponible: x.quantite_disponible === "" || x.quantite_disponible == null ? null : Number(x.quantite_disponible), budget: x.budget === "" || x.budget == null ? null : Number(x.budget), statut: x.statut, validation_fondatrice: !!x.validation_fondatrice, validation_juridique: !!x.validation_juridique, validation_juridique_note: x.validation_juridique_note || null, validation_plateforme: !!x.validation_plateforme, validation_plateforme_note: x.validation_plateforme_note || null, participation_ouverte: !!x.participation_ouverte, campagne_id: x.campagne_id || null, notes_internes: x.notes_internes || null, updated_at: new Date().toISOString() };
    try { if (init.id) await sbUpdate("bsh_rewards_campagnes", init.id, corps); else await sbInsert("bsh_rewards_campagnes", corps, "return=minimal"); recharger(); onFermer(); } catch (e: any) { setErreur(/bsh_rewards_ouverture_validee/.test(e.message) ? "Refusé par la base : une campagne active ou ouverte doit avoir les 3 validations." : e.message); }
  };
  return (
    <Feuille titre={init.id ? `Rewards — ${init.titre}` : "Nouvelle campagne Rewards"} onFermer={onFermer} large>
      <div style={{ background: `${K.alerte}12`, border: `1px solid ${K.alerte}55`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: K.creme, lineHeight: 1.5 }}>
        ⚖️ Aucune campagne n'est publiée ni ouverte automatiquement. Avant d'ouvrir la participation : ta validation, la vérification juridique (règlement des jeux-concours, éventuel dépôt, conditions d'âge et de lots) et le respect des règles de la plateforme utilisée (ex. politiques WhatsApp / Meta sur les concours).
      </div>
      <div style={grille(200)}>
        <Champ label="Titre *"><input style={champ} value={r.titre || ""} onChange={e => maj({ titre: e.target.value })} /></Champ>
        <Champ label="Statut"><select style={champ} value={r.statut} onChange={e => maj({ statut: e.target.value })}>{STATUTS.map(([v, l]) => <option key={v} value={v} disabled={v === "active" && !valide}>{l}{v === "active" && !valide ? " (3 validations requises)" : ""}</option>)}</select></Champ>
        <Champ label="Début (Cayenne)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="date" value={deb.j} onChange={e => setDeb({ ...deb, j: e.target.value })} /><input style={{ ...champ, width: 96 }} type="time" value={deb.h} onChange={e => setDeb({ ...deb, h: e.target.value })} /></div></Champ>
        <Champ label="Clôture (Cayenne)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="date" value={fin.j} onChange={e => setFin({ ...fin, j: e.target.value })} /><input style={{ ...champ, width: 96 }} type="time" value={fin.h} onChange={e => setFin({ ...fin, h: e.target.value })} /></div></Champ>
        <Champ label="Budget (€)"><input style={champ} type="number" min={0} value={r.budget ?? ""} onChange={e => maj({ budget: e.target.value })} /></Champ>
        <Champ label="Quantité disponible"><input style={champ} type="number" min={0} value={r.quantite_disponible ?? ""} onChange={e => maj({ quantite_disponible: e.target.value })} /></Champ>
        <Champ label="Campagne saisonnière"><select style={champ} value={r.campagne_id || ""} onChange={e => maj({ campagne_id: e.target.value || null })}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      </div>
      <Champ label="Description"><textarea style={{ ...champ, minHeight: 60 }} value={r.description || ""} onChange={e => maj({ description: e.target.value })} /></Champ>
      <Champ label="Règlement"><textarea style={{ ...champ, minHeight: 110 }} value={r.reglement || ""} onChange={e => maj({ reglement: e.target.value })} /></Champ>
      <Champ label="Conditions d'éligibilité"><textarea style={{ ...champ, minHeight: 60 }} value={r.conditions_eligibilite || ""} onChange={e => maj({ conditions_eligibilite: e.target.value })} placeholder="Ex. majeur·e, membre du Cercle depuis…, une participation par personne" /></Champ>
      <Carte style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>Lots autorisés · valeur totale {eur(valeurLots)}{r.budget ? ` / budget ${eur(r.budget)}` : ""}</div>
        {r.lots.map((l: any, i: number) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px auto", gap: 5, marginBottom: 5 }}>
          <input style={champ} placeholder="Lot" value={l.libelle} onChange={e => maj({ lots: r.lots.map((x: any, k: number) => k === i ? { ...x, libelle: e.target.value } : x) })} />
          <input style={champ} type="number" min={0} title="Quantité" value={l.quantite ?? 1} onChange={e => maj({ lots: r.lots.map((x: any, k: number) => k === i ? { ...x, quantite: Number(e.target.value) } : x) })} />
          <input style={champ} type="number" min={0} title="Valeur unitaire €" value={l.valeur ?? 0} onChange={e => maj({ lots: r.lots.map((x: any, k: number) => k === i ? { ...x, valeur: Number(e.target.value) } : x) })} />
          <button style={bouton("ghost", true)} onClick={() => maj({ lots: r.lots.filter((_: any, k: number) => k !== i) })}>✕</button>
        </div>)}
        <button style={bouton("ghost", true)} onClick={() => maj({ lots: [...r.lots, { libelle: "", quantite: 1, valeur: 0 }] })}>+ Lot</button>
      </Carte>
      <Carte style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.or }}>Validations</div>
        <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6 }}><input type="checkbox" checked={!!r.validation_fondatrice} onChange={e => maj({ validation_fondatrice: e.target.checked })} /> Validée par la fondatrice</label>
        <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6 }}><input type="checkbox" checked={!!r.validation_juridique} onChange={e => maj({ validation_juridique: e.target.checked })} /> Vérification juridique faite</label>
        <input style={champ} placeholder="Note juridique (qui, quand, références)" value={r.validation_juridique_note || ""} onChange={e => maj({ validation_juridique_note: e.target.value })} />
        <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6 }}><input type="checkbox" checked={!!r.validation_plateforme} onChange={e => maj({ validation_plateforme: e.target.checked })} /> Conforme aux règles de la plateforme</label>
        <input style={champ} placeholder="Note plateforme (règles vérifiées)" value={r.validation_plateforme_note || ""} onChange={e => maj({ validation_plateforme_note: e.target.value })} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Etiquette couleur={r.participation_ouverte ? K.ok : K.cremeD}>{r.participation_ouverte ? "Participation ouverte" : "Participation fermée"}</Etiquette>
          {!r.participation_ouverte ? <button style={bouton("or", true)} disabled={!valide} title={valide ? "" : "Les 3 validations sont nécessaires"} onClick={() => { if (confirm("Ouvrir la participation ? (aucune publication n'est faite automatiquement)")) enregistrer({ participation_ouverte: true, statut: "active" }); }}>Ouvrir la participation</button>
            : <button style={bouton("ghost", true)} onClick={() => enregistrer({ participation_ouverte: false, statut: "cloturee" })}>Clôturer</button>}
          {!valide && <span style={{ fontSize: 11, color: K.cremeD }}>Ouverture impossible tant que les 3 cases ne sont pas cochées.</span>}
        </div>
      </Carte>
      {init.id && <Carte style={{ padding: 12 }}><Participants r={init} /></Carte>}
      <Champ label="Notes internes"><textarea style={{ ...champ, minHeight: 50 }} value={r.notes_internes || ""} onChange={e => maj({ notes_internes: e.target.value })} /></Champ>
      <Erreur msg={erreur} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {init.id && <button style={bouton("danger")} onClick={async () => { if (confirm("Supprimer cette campagne et ses participants ?")) { await sbDelete("bsh_rewards_campagnes", init.id); recharger(); onFermer(); } }}>Supprimer</button>}
        <div style={{ flex: 1 }} /><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={() => enregistrer()}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}

export default function BshRewards({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [ouvert, setOuvert] = useState<Reward | null>(null);
  const budget = d.rewards.filter(r => r.statut !== "annulee").reduce((s, r) => s + (Number(r.budget) || 0), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre action={<button style={bouton("plein")} onClick={() => setOuvert({ titre: "", statut: "brouillon", lots: [] } as any)}>+ Campagne Rewards</button>}>BSH Rewards</Titre>
      <div style={{ fontSize: 11, color: K.cremeD }}>Fidélisation et concours autorisés. Budget total prévu (hors annulées) : <b style={{ color: K.or }}>{eur(budget)}</b>.</div>
      {d.rewards.length === 0 ? <Vide>Aucune campagne Rewards.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))", gap: 10 }}>
        {d.rewards.map(r => { const st = STATUTS.find(x => x[0] === r.statut) || STATUTS[0]; const nbVal = [r.validation_fondatrice, r.validation_juridique, r.validation_plateforme].filter(Boolean).length; return (
          <Carte key={r.id} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
            <div onClick={() => setOuvert(r)} style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><div style={{ fontFamily: FS, fontSize: 17, fontWeight: 700, color: K.creme }}>{r.titre}</div><div style={{ fontSize: 11, color: K.cremeD }}>{libelleInstant(r.date_debut)} → {libelleInstant(r.date_cloture)}</div></div>
              <Etiquette couleur={st[2]}>{st[1]}</Etiquette>
            </div>
            <div style={{ fontSize: 11, color: K.cremeF }}>Validations {nbVal}/3 · {(r.lots || []).length} lot(s) · budget {eur(r.budget)} · {r.participation_ouverte ? "participation ouverte" : "participation fermée"}</div>
          </Carte>); })}
      </div>}
      {ouvert && <EditeurReward r={ouvert} d={d} recharger={recharger} onFermer={() => setOuvert(null)} />}
    </div>
  );
}
