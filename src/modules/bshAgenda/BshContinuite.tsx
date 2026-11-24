"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Continuité BSH : la programmation tient même
// quand la fondatrice est absente.
//  • alertes : échéances sans responsable disponible (titulaire,
//    remplaçant de la mission, puis hôte principal / remplaçant du mode) ;
//  • missions déléguées : responsable, remplaçant facultatif, horaire,
//    espace, consignes, ressources autorisées, statut d'exécution,
//    compte rendu ; reports et annulations (fondatrice) ;
//  • préparation sur plusieurs semaines (brouillons, rien n'est publié) ;
//  • import d'un calendrier (ex. Christmas Secrets 2026) : dates passées
//    archivées en « programmation historique » ou replanifiées — jamais
//    marquées « publiées ».
// Les écritures nouvelles exigent la migration 0141 (détectée).
// ═══════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { K, FS, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, ChoixHote, nomHote, sbInsert, sbUpdate, versIso, cleJour, heureCayenne, libelleDate, libelleInstant, aujourdhui, plusJours, ESPACES } from "./bshAgendaLib";
import type { Donnees, Mission } from "./BshAgendaHub";
import type { Publication } from "./BshPublications";
import { alertesContinuite, creneauxPeriode, lireCalendrier, prochainCreneauLibre, STATUTS_EXECUTION, utilisable, type Echeance, CHRISTMAS, PERIODES_CHRISTMAS, periodeChristmas, csvCalendrierOfficiel, planFusion, programmationPermanente, GABARIT_JOURNEE } from "./continuite";
import { SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";
const NATURES = ["affiche", "publication", "animation", "sondage", "relance", "annonce", "pensee"];

const ONGLETS: [string, string][] = [["alertes", "Alertes"], ["missions", "Missions"], ["preparer", "Préparer plusieurs semaines"], ["importer", "Importer un calendrier"], ["reglages", "Mode Continuité"]];
const libExec = (s?: string) => STATUTS_EXECUTION.find(x => x[0] === (s || "a_faire"))?.[1] || s || "À faire";
const AVANT_0141 = "Disponible après la migration 0141 (préparée et testée, en attente de ton accord). Rien n'a été enregistré.";

export default function BshContinuite({ d, recharger, ouvrir }: { d: Donnees; recharger: () => void; ouvrir: (p: Publication) => void }) {
  const [onglet, setOnglet] = useState("alertes");
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <Titre>Continuité BSH</Titre>
    <div style={{ fontSize: 11, color: K.cremeD }}>Préparer, déléguer et suivre la programmation sur plusieurs semaines. Une programmation interne n'est jamais une publication : seule une publication confirmée avec preuve compte comme publiée.</div>
    {!d.v141 && <div role="note" style={{ fontSize: 12, color: K.alerte, border: `1px solid ${K.alerte}55`, borderRadius: 10, padding: "8px 10px" }}>Migration 0141 non appliquée : les alertes et l'aperçu fonctionnent ; la délégation (remplaçant, ressources, compte rendu), la confirmation avec preuve et le mode Continuité s'activeront après la migration.</div>}
    <div role="tablist" aria-label="Continuité" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
      {ONGLETS.map(([k, l]) => <button key={k} role="tab" aria-selected={onglet === k} style={bouton(onglet === k ? "or" : "ghost", true)} onClick={() => setOnglet(k)}>{l}</button>)}
    </div>
    {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
    {onglet === "alertes" && <Alertes d={d} ouvrir={ouvrir} />}
    {onglet === "missions" && <Missions d={d} recharger={recharger} flash={flash} />}
    {onglet === "preparer" && <Preparer d={d} recharger={recharger} flash={flash} />}
    {onglet === "importer" && <Importer d={d} recharger={recharger} flash={flash} />}
    {onglet === "reglages" && <Reglages d={d} recharger={recharger} flash={flash} />}
  </div>;
}

/** Échéances à couvrir : publications et animations à venir dans l'horizon (hors publiées, annulées, archivées). */
export function echeancesAVenir(d: Donnees, horizon: number): Echeance[] {
  const auj = aujourdhui(), fin = plusJours(auj, horizon);
  const pubs = d.pubs.filter(p => p.id && p.date_programmee && !["publie", "annule", "archive"].includes(p.statut)).map(p => ({ cle: p.id!, libelle: `📢 ${p.titre}`, date: cleJour(p.date_programmee!), heure: heureCayenne(p.date_programmee!), espace: p.espace, hote_id: p.hote_id }));
  const anims = d.animations.filter(a => a.date_prevue && !["realise", "archive"].includes(a.statut)).map(a => ({ cle: a.id, libelle: `🎲 ${a.nom}`, date: cleJour(a.date_prevue!), heure: heureCayenne(a.date_prevue!), espace: a.espace, hote_id: a.hote_id }));
  return [...pubs, ...anims].filter(e => e.date >= auj && e.date <= fin).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}

function Alertes({ d, ouvrir }: { d: Donnees; ouvrir: (p: Publication) => void }) {
  const r = d.reglages;
  const horizon = r?.continuite_horizon_jours || 21;
  const al = useMemo(() => alertesContinuite(echeancesAVenir(d, horizon), d.missions as any, d.hotes as any, d.dispos, r ? { active: !!r.continuite_active, principal: r.continuite_principal, remplacant: r.continuite_remplacant } : null), [d, horizon, r]);
  const crit = al.filter(a => a.niveau === "critique"), att = al.filter(a => a.niveau === "attention");
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={grille(150)}>
      {[["Échéances", al.length, K.creme], ["Sans responsable", crit.length, K.erreur], ["Assurées par un remplaçant", att.length, K.alerte], ["Couvertes", al.length - crit.length - att.length, K.ok]].map(([l, n, c]: any) =>
        <Carte key={l}><div style={{ fontFamily: FS, fontSize: 26, color: c }}>{n}</div><div style={{ fontSize: 11, color: K.cremeD }}>{l} · {horizon} jours</div></Carte>)}
    </div>
    {al.length === 0 ? <Vide>Aucune publication ni animation programmée dans les {horizon} prochains jours.</Vide> :
      [...crit, ...att, ...al.filter(a => a.niveau === "ok")].map(a => { const p = d.pubs.find(x => x.id === a.cle); const h = d.hotes.find(x => x.id === a.responsable);
        return <div key={a.cle} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", borderRadius: 10, border: `1px solid ${a.niveau === "critique" ? K.erreur : a.niveau === "attention" ? K.alerte : K.ligne}66`, background: K.verre }}>
          <Etiquette couleur={a.niveau === "critique" ? K.erreur : a.niveau === "attention" ? K.alerte : K.ok}>{a.niveau === "critique" ? "Aucun responsable" : a.niveau === "attention" ? "Remplaçant" : "Couverte"}</Etiquette>
          <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 13, color: K.creme }}>{a.libelle}</div><div style={{ fontSize: 11, color: K.cremeD }}>{libelleDate(a.date)} · {a.motif}{h ? ` · 👤 ${nomHote(h)}` : ""}</div></div>
          {p && <button style={bouton("ghost", true)} onClick={() => ouvrir(p)}>Ouvrir</button>}
        </div>; })}
    <div style={{ fontSize: 10, color: K.cremeD }}>Alertes affichées ici uniquement : aucune notification n'est envoyée sans ton accord.</div>
  </div>;
}

function Missions({ d, recharger, flash }: { d: Donnees; recharger: () => void; flash: (m: string) => void }) {
  const [edition, setEdition] = useState<Partial<Mission> | null>(null);
  const [action, setAction] = useState<{ m: Mission; type: "reporter" | "annuler" } | null>(null);
  const liees = d.missions.filter(m => m.communication_id || m.animation_id || m.espace);
  const faites = liees.filter(m => m.statut_execution === "realisee").length, nonFaites = liees.filter(m => m.statut_execution === "non_realisee").length;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, color: K.cremeD, flex: 1 }}>{liees.length} mission(s) d'animation · {faites} réalisée(s) · {nonFaites} non réalisée(s)</div>
      <button style={bouton("plein", true)} onClick={() => setEdition({ titre: "", statut: "proposee", simulation: true, ressources: [] })}>＋ Confier une mission</button>
    </div>
    {liees.length === 0 ? <Vide>Aucune mission d'animation déléguée.</Vide> : liees.map(m => { const t = d.hotes.find(h => h.id === m.hote_id), r = d.hotes.find(h => h.id === m.remplacant_id); const p = d.pubs.find(x => x.id === m.communication_id); const a = d.animations.find(x => x.id === m.animation_id);
      return <Carte key={m.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 14, fontWeight: 700, color: K.creme }}>{m.titre}</div>
            <div style={{ fontSize: 11, color: K.cremeD }}>{libelleInstant(m.date_mission)} · {ESPACES[m.espace || ""] || m.lieu || "—"} · 👤 {nomHote(t)}{r ? ` · remplaçant : ${nomHote(r)}` : " · sans remplaçant"}</div>
            {(p || a) && <div style={{ fontSize: 11, color: K.cremeF }}>{p ? `📢 ${p.titre}` : ""}{a ? ` 🎲 ${a.nom}` : ""}</div>}</div>
          <Etiquette couleur={m.statut_execution === "realisee" ? K.ok : m.statut_execution === "non_realisee" || m.statut_execution === "annulee" ? K.erreur : m.statut_execution === "reportee" ? K.alerte : K.or}>{libExec(m.statut_execution)}</Etiquette>
        </div>
        {m.consignes && <div style={{ fontSize: 12, color: K.cremeF, whiteSpace: "pre-wrap" }}>📝 {m.consignes}</div>}
        {(m.ressources || []).length > 0 && <div style={{ fontSize: 11, color: K.cremeD }}>Ressources autorisées : {(m.ressources || []).map(id => d.ressources.find(x => x.id === id)?.titre || "ressource").join(" · ")}</div>}
        {m.compte_rendu && <div style={{ fontSize: 12, color: K.creme, borderLeft: `2px solid ${K.or}`, paddingLeft: 8 }}>Compte rendu{m.compte_rendu_le ? ` (${libelleInstant(m.compte_rendu_le)})` : ""} : {m.compte_rendu}</div>}
        {m.motif && <div style={{ fontSize: 11, color: K.alerte }}>Motif : {m.motif}{m.reporte_au ? ` · reportée au ${libelleInstant(m.reporte_au)}` : ""}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={bouton("ghost", true)} onClick={() => setEdition(m)}>✏️ Modifier</button>
          {!["annulee", "realisee"].includes(m.statut_execution || "") && <button style={bouton("ghost", true)} onClick={() => setAction({ m, type: "reporter" })}>↷ Reporter</button>}
          {!["annulee", "realisee"].includes(m.statut_execution || "") && <button style={bouton("danger", true)} onClick={() => setAction({ m, type: "annuler" })}>Annuler</button>}
        </div>
      </Carte>; })}
    {edition && <EditeurMission d={d} initiale={edition} onFermer={() => setEdition(null)} onFait={(t) => { setEdition(null); flash(t); recharger(); }} />}
    {action && <ReportAnnulation d={d} m={action.m} type={action.type} onFermer={() => setAction(null)} onFait={(t) => { setAction(null); flash(t); recharger(); }} />}
  </div>;
}

function EditeurMission({ d, initiale, onFermer, onFait }: { d: Donnees; initiale: Partial<Mission>; onFermer: () => void; onFait: (t: string) => void }) {
  const [m, setM] = useState<Partial<Mission>>(initiale);
  const [date, setDate] = useState(initiale.date_mission ? cleJour(initiale.date_mission) : ""); const [heure, setHeure] = useState(initiale.date_mission ? heureCayenne(initiale.date_mission) : "08:00");
  const [err, setErr] = useState("");
  const maj = (x: Partial<Mission>) => setM(v => ({ ...v, ...x }));
  const pubs = d.pubs.filter(p => p.id && !["publie", "annule", "archive"].includes(p.statut));
  const ressources = d.ressources.filter(utilisable);
  const lier = (id: string) => { const p = d.pubs.find(x => x.id === id); if (!p) return maj({ communication_id: null }); maj({ communication_id: id, titre: m.titre || p.titre, espace: p.espace }); if (p.date_programmee) { setDate(cleJour(p.date_programmee)); setHeure(heureCayenne(p.date_programmee)); } };
  const enregistrer = async () => {
    if (!d.v141) return setErr(AVANT_0141);
    if (!(m.titre || "").trim() || !m.hote_id) return setErr("Titre et responsable sont obligatoires.");
    if (m.remplacant_id && m.remplacant_id === m.hote_id) return setErr("Le remplaçant doit être une autre personne que le responsable.");
    const ligne: any = { titre: m.titre, hote_id: m.hote_id, remplacant_id: m.remplacant_id || null, date_mission: date ? versIso(date, heure) : null, heure_debut: date ? heure : null, espace: m.espace || null, communication_id: m.communication_id || null, animation_id: m.animation_id || null, consignes: m.consignes || null, ressources: m.ressources || [], role_mission: "animation", lieu: ESPACES[m.espace || ""] || null, updated_at: new Date().toISOString() };
    try { if (m.id) await sbUpdate("bsh_missions", m.id, ligne); else await sbInsert("bsh_missions", { ...ligne, statut: "proposee", simulation: true, statut_execution: "a_faire" }, "return=minimal"); onFait(m.id ? "✅ Mission mise à jour" : "✅ Mission proposée à l'hôte (simulation tant que l'hôte n'est pas autorisé·e)"); }
    catch (e: any) { setErr(String(e?.message || e)); }
  };
  return <Feuille titre={m.id ? "Modifier la mission" : "Confier une mission"} onFermer={onFermer} large>
    <div style={grille(220)}>
      <Champ label="Publication liée"><select style={champ} value={m.communication_id || ""} onChange={e => lier(e.target.value)}><option value="">— Aucune —</option>{pubs.map(p => <option key={p.id} value={p.id}>{p.titre} · {libelleInstant(p.date_programmee)}</option>)}</select></Champ>
      <Champ label="Animation liée"><select style={champ} value={m.animation_id || ""} onChange={e => maj({ animation_id: e.target.value || null })}><option value="">— Aucune —</option>{d.animations.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></Champ>
      <Champ label="Intitulé *"><input style={champ} value={m.titre || ""} onChange={e => maj({ titre: e.target.value })} /></Champ>
      <Champ label="Responsable *"><ChoixHote hotes={d.hotes} valeur={m.hote_id} onChange={id => maj({ hote_id: id || undefined })} /></Champ>
      <Champ label="Remplaçant (facultatif)"><ChoixHote hotes={d.hotes.filter(h => h.id !== m.hote_id)} valeur={m.remplacant_id} onChange={id => maj({ remplacant_id: id })} /></Champ>
      <Champ label="Espace de destination"><select style={champ} value={m.espace || ""} onChange={e => maj({ espace: e.target.value || null })}><option value="">—</option>{["chaine", "cercle", "lounge", "evenement"].map(k => <option key={k} value={k}>{ESPACES[k]}</option>)}</select></Champ>
      <Champ label="Date (heure de Cayenne)"><input style={champ} type="date" value={date} onChange={e => setDate(e.target.value)} /></Champ>
      <Champ label="Heure"><input style={champ} type="time" value={heure} onChange={e => setHeure(e.target.value)} /></Champ>
    </div>
    <Champ label="Consignes d'animation"><textarea style={{ ...champ, minHeight: 80 }} value={m.consignes || ""} onChange={e => maj({ consignes: e.target.value })} /></Champ>
    <Champ label="Ressources autorisées" aide="Seules les ressources validées, aux droits établis, peuvent être confiées. L'hôte ne voit qu'elles.">
      {ressources.length === 0 ? <div style={{ fontSize: 12, color: K.cremeD }}>Aucune ressource validée dans la médiathèque.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{ressources.map(r => <label key={r.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: K.creme }}><input type="checkbox" checked={(m.ressources || []).includes(r.id)} onChange={e => maj({ ressources: e.target.checked ? [...(m.ressources || []), r.id] : (m.ressources || []).filter(x => x !== r.id) })} />{r.titre}</label>)}</div>}
    </Champ>
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button></div>
  </Feuille>;
}

function ReportAnnulation({ d, m, type, onFermer, onFait }: { d: Donnees; m: Mission; type: "reporter" | "annuler"; onFermer: () => void; onFait: (t: string) => void }) {
  const [motif, setMotif] = useState(""); const [date, setDate] = useState(""); const [heure, setHeure] = useState("08:00"); const [err, setErr] = useState("");
  const valider = async () => {
    if (!d.v141) return setErr(AVANT_0141);
    if (motif.trim().length < 3) return setErr("Indique un motif.");
    if (type === "reporter" && !date) return setErr("Choisis la nouvelle date.");
    const nouvelle = type === "reporter" ? versIso(date, heure) : null;
    try {
      await sbUpdate("bsh_missions", m.id, type === "reporter" ? { statut_execution: "reportee", reporte_au: nouvelle, motif, updated_at: new Date().toISOString() } : { statut_execution: "annulee", motif, updated_at: new Date().toISOString() });
      const p = d.pubs.find(x => x.id === m.communication_id);
      if (p && p.statut !== "publie") await sbUpdate("bsh_communications", p.id!, type === "reporter" ? { statut: "reporte", date_programmee: nouvelle, updated_at: new Date().toISOString() } : { statut: "annule", updated_at: new Date().toISOString() });
      onFait(type === "reporter" ? "↷ Mission et publication reportées" : "Mission et publication annulées (conservées dans l'historique)");
    } catch (e: any) { setErr(String(e?.message || e)); }
  };
  return <Feuille titre={type === "reporter" ? "Reporter la mission" : "Annuler la mission"} onFermer={onFermer}>
    <div style={{ fontSize: 12, color: K.cremeF }}>{m.titre} · {libelleInstant(m.date_mission)}</div>
    {type === "reporter" && <div style={grille(160)}><Champ label="Nouvelle date"><input style={champ} type="date" value={date} onChange={e => setDate(e.target.value)} /></Champ><Champ label="Heure"><input style={champ} type="time" value={heure} onChange={e => setHeure(e.target.value)} /></Champ></div>}
    <Champ label="Motif *"><input style={champ} value={motif} onChange={e => setMotif(e.target.value)} /></Champ>
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={bouton("ghost")} onClick={onFermer}>Retour</button><button style={bouton(type === "annuler" ? "danger" : "plein")} onClick={valider}>{type === "reporter" ? "↷ Reporter" : "Annuler la mission"}</button></div>
  </Feuille>;
}

function Preparer({ d, recharger, flash }: { d: Donnees; recharger: () => void; flash: (m: string) => void }) {
  const [debut, setDebut] = useState(plusJours(aujourdhui(), 1)); const [semaines, setSemaines] = useState(2); const [espace, setEspace] = useState("chaine"); const [campagne, setCampagne] = useState(""); const [modele, setModele] = useState("");
  const [gabarit, setGabarit] = useState(false); const [facultatifs, setFacultatifs] = useState(false);
  const textes = d.ressources.filter(r => utilisable(r) && ["texte", "scenario"].includes(r.type));
  const fin = plusJours(debut, semaines * 7 - 1);
  const occupes = useMemo(() => new Set(d.pubs.filter(p => p.date_programmee && p.espace === espace && !["annule", "archive"].includes(p.statut)).map(p => new Date(p.date_programmee!).toISOString())), [d.pubs, espace]);
  const libres = useMemo(() => creneauxPeriode(debut, fin, d.jours).filter(c => !occupes.has(versIso(c.date, c.heure)) && new Date(versIso(c.date, c.heure)).getTime() > Date.now()), [debut, fin, d.jours, occupes]);
  const jourParJour = useMemo(() => Array.from(new Set(creneauxPeriode(debut, fin, d.jours).map(c => c.date))), [debut, fin, d.jours]);
  const prevus = useMemo(() => { const deja = new Set(d.pubs.filter(p => p.date_programmee && !["annule", "archive"].includes(p.statut)).map(p => `${new Date(p.date_programmee!).toISOString()}|${p.espace}|${p.titre}`));
    return jourParJour.flatMap(date => GABARIT_JOURNEE.filter(g => facultatifs || !g.facultatif).map(g => ({ date, g, iso: versIso(date, g.heure), titre: `${g.libelle} — ${libelleDate(date, false)}` })))
      .filter(x => new Date(x.iso).getTime() > Date.now() && !deja.has(`${new Date(x.iso).toISOString()}|${x.g.espace}|${x.titre}`)); }, [jourParJour, facultatifs, d.pubs]);
  const creer = async () => {
    const m = textes.find(r => r.id === modele);
    if (gabarit) {
      if (!prevus.length) return flash("⚠️ Rien à préparer sur la période.");
      const lignes = prevus.map(x => ({ titre: x.titre, contenu: m?.contenu_texte || "", type: "publication", cible: "tous", statut: "brouillon", espace: x.g.espace === "evenement" ? null : x.g.espace, date_programmee: x.iso, creneau: x.g.heure, thematique: (campagne && /christmas secrets/i.test(d.campagnes.find(c => c.id === campagne)?.nom || "") ? periodeChristmas(x.date) : null) || d.jours.find(j => j.jour_semaine === new Date(x.date + "T12:00:00Z").getUTCDay())?.thematique || null, campagne_id: campagne || null, fuseau: "America/Cayenne", ...(d.v141 ? { nature: x.g.nature } : {}) }));
      try { await sbInsert("bsh_communications", lignes, "return=minimal"); flash(`✅ ${lignes.length} brouillon(s) créés selon le gabarit de journée. Rien n'est publié.`); recharger(); } catch (e: any) { flash("⚠️ " + (e?.message || e)); }
      return;
    }
    if (!libres.length) return flash("⚠️ Aucun créneau libre sur la période.");
    const lignes = libres.map(c => ({ titre: `${c.thematique} — ${libelleDate(c.date, false)} ${c.heure.replace(":00", " h")}`, contenu: m?.contenu_texte || "", type: "publication", cible: "tous", statut: "brouillon", espace, date_programmee: versIso(c.date, c.heure), creneau: c.heure, thematique: c.thematique, campagne_id: campagne || null, fuseau: "America/Cayenne" }));
    try { await sbInsert("bsh_communications", lignes, "return=minimal"); flash(`✅ ${lignes.length} brouillon(s) créés (à rédiger, valider puis programmer). Rien n'est publié.`); recharger(); } catch (e: any) { flash("⚠️ " + (e?.message || e)); }
  };
  return <Carte style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={grille(170)}>
      <Champ label="À partir du"><input style={champ} type="date" value={debut} onChange={e => setDebut(e.target.value)} /></Champ>
      <Champ label="Nombre de semaines"><select style={champ} value={semaines} onChange={e => setSemaines(+e.target.value)}>{[1, 2, 3, 4, 5, 6, 8].map(n => <option key={n} value={n}>{n}</option>)}</select></Champ>
      <Champ label="Espace"><select style={champ} value={espace} onChange={e => setEspace(e.target.value)}>{["chaine", "cercle", "lounge"].map(k => <option key={k} value={k}>{ESPACES[k]}</option>)}</select></Champ>
      <Champ label="Campagne"><select style={champ} value={campagne} onChange={e => setCampagne(e.target.value)}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      <Champ label="Texte de départ (validé)"><select style={champ} value={modele} onChange={e => setModele(e.target.value)}><option value="">— Vide —</option>{textes.map(r => <option key={r.id} value={r.id}>{r.titre}</option>)}</select></Champ>
    </div>
    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: K.creme }}><input type="checkbox" checked={gabarit} onChange={e => setGabarit(e.target.checked)} />Gabarit de journée complet (8 h : affiche + publication ; 21 h : affiche + publication + animation du Cercle)</label>
    {gabarit && <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: K.creme }}><input type="checkbox" checked={facultatifs} onChange={e => setFacultatifs(e.target.checked)} />Inclure les créneaux facultatifs (10 h sondage, 12 h 30 Cercle, 18 h annonce, 22 h 30 relance)</label>}
    <div style={{ fontSize: 12, color: K.cremeF }}>{gabarit ? `${prevus.length} brouillon(s) prévus du ${libelleDate(debut, false)} au ${libelleDate(fin, false)} (samedi fermé ; éléments passés ou déjà présents exclus).` : `${libres.length} créneau(x) libre(s) du ${libelleDate(debut, false)} au ${libelleDate(fin, false)} (8 h et 21 h, samedi en pause, créneaux déjà occupés et passés exclus).`}</div>
    <div><button style={bouton("plein")} onClick={creer}>Créer {gabarit ? prevus.length : libres.length} brouillon(s)</button></div>
  </Carte>;
}

function Importer({ d, recharger, flash }: { d: Donnees; recharger: () => void; flash: (m: string) => void }) {
  const [texte, setTexte] = useState(""); const [campagne, setCampagne] = useState(""); const [passees, setPassees] = useState<"historique" | "replanifier">("historique"); const [occupe, setOccupe] = useState(false);
  const lignes = useMemo(() => texte.trim() ? lireCalendrier(texte, { maintenant: new Date(), jours: d.jours, existants: d.pubs }) : [], [texte, d.jours, d.pubs]);
  const christmas = d.campagnes.find(c => /christmas secrets 2026/i.test(c.nom));
  const noel = d.campagnes.find(c => c.saison === "noel" && c !== christmas && c.statut !== "archivee");
  const plan = planFusion(d.campagnes as any);
  const [fac, setFac] = useState(false);
  const descr = "Campagne officielle (17 novembre au 25 décembre 2026). Temps forts : " + PERIODES_CHRISTMAS.map(([a, b, t]) => `${t} (${a.slice(8)}/${a.slice(5, 7)}–${b.slice(8)}/${b.slice(5, 7)})`).join(" ; ") + ".";
  const creerCampagne = async () => {
    try { const [c] = await sbInsert<any>("bsh_campagnes", { nom: CHRISTMAS.nom, saison: "noel", date_debut: CHRISTMAS.debut, date_fin: CHRISTMAS.fin, recurrence_annuelle: false, statut: "brouillon", description: descr }); setCampagne(c?.id || ""); flash(`✅ Campagne « ${CHRISTMAS.nom} » créée en brouillon`); recharger(); } catch (e: any) { flash("⚠️ " + (e?.message || e)); }
  };
  const fusionner = async () => {
    try {
      if (plan.action === "renommer") { await sbUpdate("bsh_campagnes", plan.id, { ...plan.patch, description: descr, updated_at: new Date().toISOString() }); setCampagne(plan.id); }
      else if (plan.action === "rattacher") {
        const t = await jeton();
        for (const table of plan.tables) { const r = await fetch(`${SB_URL}/rest/v1/${table}?campagne_id=eq.${plan.de}`, { method: "PATCH", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ campagne_id: plan.vers }) }); if (!r.ok && r.status !== 404) throw new Error(`${table} : ${await r.text()}`); }
        await sbUpdate("bsh_campagnes", plan.de, { ...plan.archive, updated_at: new Date().toISOString() }); setCampagne(plan.vers);
      } else return;
      flash("✅ Fusion effectuée : aucune donnée supprimée, ancien état noté dans la campagne."); recharger();
    } catch (e: any) { flash("⚠️ " + (e?.message || e)); }
  };
  const ok = lignes.filter(l => l.etat !== "erreur" && !l.doublon);
  const importer = async () => {
    if (!ok.length) return;
    if (passees === "historique" && !d.v141 && ok.some(l => l.etat === "historique")) return flash("⚠️ L'archivage en « programmation historique » demande la migration 0141. Choisis « replanifier » ou attends la migration.");
    setOccupe(true);
    const occupes = new Set(d.pubs.filter(p => p.date_programmee).map(p => new Date(p.date_programmee!).toISOString()));
    const estChristmas = /christmas secrets/i.test(d.campagnes.find(c => c.id === campagne)?.nom || "");
    const rows: any[] = [];
    for (const l of ok) {
      let date = l.date, heure = l.heure, historique = false, statut = "brouillon";
      if (l.etat === "historique") {
        if (passees === "historique") { historique = true; statut = "archive"; }
        else { const c = prochainCreneauLibre(new Date(), d.jours, occupes, heure); if (!c) continue; date = c.date; heure = c.heure; }
      }
      const iso = versIso(date, heure); occupes.add(iso);
      rows.push({ titre: l.titre, contenu: l.contenu || "", type: "publication", cible: "tous", statut, espace: l.espace, date_programmee: iso, creneau: heure, campagne_id: campagne || null, fuseau: "America/Cayenne", thematique: estChristmas ? periodeChristmas(l.date) : null, ...(d.v141 && NATURES.includes(l.type) ? { nature: l.type } : {}), notes_internes: l.etat === "historique" ? (passees === "historique" ? `Programmation historique importée (prévue le ${l.date} à ${l.heure}) : publication non prouvée.` : `Replanifiée depuis le ${l.date} à ${l.heure} (date passée lors de l'import).`) : null, ...(d.v141 ? { historique } : {}) });
    }
    try { await sbInsert("bsh_communications", rows, "return=minimal"); flash(`✅ ${rows.length} ligne(s) importée(s) : ${rows.filter(r => r.statut === "brouillon").length} brouillon(s) à valider, ${rows.filter(r => r.statut === "archive").length} en historique. Aucune n'est marquée publiée.`); setTexte(""); recharger(); }
    catch (e: any) { flash("⚠️ " + (e?.message || e)); }
    setOccupe(false);
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <Carte style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontFamily: FS, fontSize: 18, color: K.or }}>{CHRISTMAS.nom} · 17 novembre → 25 décembre</div>
      <div style={{ fontSize: 12, color: K.cremeF }}>Temps forts : {PERIODES_CHRISTMAS.map(p => p[2]).join(" · ")}. Rendez-vous 8 h et 21 h (America/Cayenne), samedi fermé.</div>
      {christmas && <div style={{ fontSize: 12, color: K.ok }}>Campagne présente : {christmas.nom} ({christmas.statut}).</div>}
      {noel && plan.action !== "rien" && <div role="note" style={{ fontSize: 12, color: K.alerte }}>Fusion proposée : {plan.motif} {noel ? `(« ${noel.nom} », ${noel.date_debut || "?"} → ${noel.date_fin || "?"})` : ""}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(plan.action === "renommer" || plan.action === "rattacher") && <button style={bouton("or", true)} onClick={fusionner}>Fusionner « Noël BSH » dans la campagne officielle</button>}
        {plan.action === "creer" && <button style={bouton("or", true)} onClick={creerCampagne}>Créer la campagne « {CHRISTMAS.nom} » (brouillon)</button>}
        <button style={bouton("ghost", true)} onClick={() => { setTexte(csvCalendrierOfficiel(fac)); if (christmas) setCampagne(christmas.id); }}>Charger le calendrier officiel</button>
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11, color: K.cremeD }}><input type="checkbox" checked={fac} onChange={e => setFac(e.target.checked)} />avec les créneaux facultatifs</label>
      </div>
    </Carte>
    <Champ label="Calendrier à importer" aide="Exemple : 2026-12-01 ; 08:00 ; chaine ; publication ; Le secret du 1er ; Texte…  (JJ/MM/AAAA et « 21h » acceptés)"><textarea aria-label="Calendrier à importer" style={{ ...champ, minHeight: 110, fontFamily: "ui-monospace,monospace" }} value={texte} onChange={e => setTexte(e.target.value)} /></Champ>
    <div style={grille(200)}>
      <Champ label="Campagne"><select style={champ} value={campagne} onChange={e => setCampagne(e.target.value)}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      <Champ label="Dates déjà passées"><select style={champ} value={passees} onChange={e => setPassees(e.target.value as any)}><option value="historique">Archiver en programmation historique</option><option value="replanifier">Replanifier sur le prochain créneau libre</option></select></Champ>
    </div>
    {lignes.length > 0 && <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr>{["#", "Date", "Heure", "Espace", "Titre", "État", "Remarques"].map(h => <th key={h} style={{ textAlign: "left", color: K.cremeD, padding: "4px 6px", borderBottom: `1px solid ${K.ligne}` }}>{h}</th>)}</tr></thead>
      <tbody>{lignes.map(l => <tr key={l.ligne}><td style={{ padding: "4px 6px" }}>{l.ligne}</td><td>{l.date}</td><td>{l.heure}</td><td>{ESPACES[l.espace] || l.espace}</td><td>{l.titre}</td>
        <td><Etiquette couleur={l.etat === "erreur" ? K.erreur : l.doublon ? K.alerte : l.etat === "historique" ? K.cremeD : K.ok}>{l.etat === "erreur" ? "Erreur" : l.doublon ? "Doublon ignoré" : l.etat === "historique" ? (passees === "historique" ? "Historique" : "À replanifier") : "À venir"}</Etiquette></td>
        <td style={{ color: K.cremeD }}>{l.alertes.join(" · ")}</td></tr>)}</tbody></table></div>}
    {lignes.length > 0 && <div><button style={bouton("plein")} disabled={occupe || !ok.length} onClick={importer}>Importer {ok.length} ligne(s) en brouillon</button></div>}
  </div>;
}

function Reglages({ d, recharger, flash }: { d: Donnees; recharger: () => void; flash: (m: string) => void }) {
  const r = d.reglages;
  const [actif, setActif] = useState(!!r?.continuite_active); const [principal, setPrincipal] = useState<string | null>(r?.continuite_principal || null); const [rempl, setRempl] = useState<string | null>(r?.continuite_remplacant || null); const [horizon, setHorizon] = useState(r?.continuite_horizon_jours || 21); const [note, setNote] = useState(r?.continuite_note || "");
  const [err, setErr] = useState("");
  const enregistrer = async () => {
    if (!d.v141) return setErr(AVANT_0141);
    if (actif && !principal) return setErr("Désigne un hôte principal pour activer le mode Continuité.");
    if (principal && rempl && principal === rempl) return setErr("Le remplaçant doit être une autre personne.");
    try { await sbUpdate("bsh_agenda_reglages", "1", { continuite_active: actif, continuite_principal: principal, continuite_remplacant: rempl, continuite_horizon_jours: horizon, continuite_note: note || null, updated_at: new Date().toISOString() }); flash("✅ Mode Continuité enregistré"); recharger(); } catch (e: any) { setErr(String(e?.message || e)); }
  };
  return <Carte style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: K.creme }}><input type="checkbox" checked={actif} onChange={e => setActif(e.target.checked)} />Activer le mode « Continuité BSH » (absence de la fondatrice)</label>
    <div style={grille(200)}>
      <Champ label="Hôte principal"><ChoixHote hotes={d.hotes} valeur={principal} onChange={setPrincipal} /></Champ>
      <Champ label="Remplaçant"><ChoixHote hotes={d.hotes.filter(h => h.id !== principal)} valeur={rempl} onChange={setRempl} /></Champ>
      <Champ label="Horizon de surveillance"><select style={champ} value={horizon} onChange={e => setHorizon(+e.target.value)}>{[7, 14, 21, 28, 42].map(n => <option key={n} value={n}>{n} jours</option>)}</select></Champ>
    </div>
    <Champ label="Consignes générales pendant l'absence"><textarea style={{ ...champ, minHeight: 60 }} value={note} onChange={e => setNote(e.target.value)} /></Champ>
    <div style={{ fontSize: 11, color: K.cremeD }}>Le mode Continuité désigne qui couvre les échéances sans responsable. Il ne publie rien et ne donne aucun droit supplémentaire : chaque hôte ne voit que les missions qui lui sont confiées.</div>
    <Erreur msg={err} />
    <div><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button></div>
    <ProgrammationPermanente d={d} recharger={recharger} flash={flash} />
  </Carte>;
}

/** Programmation permanente : 8 h / 21 h principaux ; 10 h, 12 h 30, 18 h, 22 h 30 facultatifs ; samedi fermé, réouverture facultative à 20 h. Thèmes du jour conservés. */
function ProgrammationPermanente({ d, recharger, flash }: { d: Donnees; recharger: () => void; flash: (m: string) => void }) {
  const cible = programmationPermanente(Object.fromEntries(d.jours.map(j => [j.jour_semaine, j.thematique])));
  const ecarts = cible.filter(c => { const j = d.jours.find(x => x.jour_semaine === c.jour_semaine); return !j || j.en_pause !== c.en_pause || j.creneaux.join() !== c.creneaux.join() || (j.creneaux_facultatifs || []).join() !== (c.creneaux_facultatifs || []).join(); });
  const appliquer = async () => {
    try { const t = await jeton();
      for (const c of ecarts) { const r = await fetch(`${SB_URL}/rest/v1/bsh_programmation_jours?jour_semaine=eq.${c.jour_semaine}`, { method: "PATCH", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ en_pause: c.en_pause, creneaux: c.creneaux, creneaux_facultatifs: c.creneaux_facultatifs, updated_at: new Date().toISOString() }) }); if (!r.ok) throw new Error(await r.text()); }
      flash(`✅ Programmation permanente appliquée (${ecarts.length} jour(s) mis à jour)`); recharger(); } catch (e: any) { flash("⚠️ " + (e?.message || e)); }
  };
  return <div style={{ borderTop: `1px solid ${K.ligne}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: K.or }}>Programmation permanente</div>
    <div style={{ fontSize: 12, color: K.cremeF }}>8 h affiche + publication de la chaîne · 10 h sondage (facultatif) · 12 h 30 animation du Cercle (facultatif) · 18 h annonce (facultatif) · 21 h affiche, publication et animation · 22 h 30 relance par un hôte (facultatif) · samedi fermé, réouverture facultative à 20 h · pensée du jour tous les {d.reglages?.pensee_frequence_jours || 2} jours (50 caractères conseillés).</div>
    {ecarts.length === 0 ? <div style={{ fontSize: 12, color: K.ok }}>✓ La programmation enregistrée correspond déjà.</div> : <div><button style={bouton("or", true)} onClick={appliquer}>Appliquer à {ecarts.length} jour(s)</button></div>}
  </div>;
}
