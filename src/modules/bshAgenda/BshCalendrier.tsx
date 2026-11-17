"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — calendrier éditorial (jour / semaine / mois /
// année), programmation par défaut, pensée du jour, campagnes
// saisonnières avec compte à rebours. Heure de Cayenne partout.
// ═══════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import {
  K, FS, SA, SERIES, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille,
  sbInsert, sbUpdate, sbDelete, uploadStorage, compresserImage, slug, BUCKET_BSH,
  cleJour, heureCayenne, aujourdhui, plusJours, jourSemaine, lundiDe, libelleDate, joursEntre, compteARebours, versIso,
  JOURS, JOURS_COURTS, MOIS, statutPub, ESPACES,
} from "./bshAgendaLib";
import { nouvellePublication, type Publication } from "./BshPublications";
import type { Donnees, Campagne } from "./BshAgendaHub";
import { SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";

type Vue = "jour" | "semaine" | "mois" | "annee";
type Element = { id: string; type: "publication" | "sondage" | "animation" | "boudoir" | "mission"; titre: string; iso: string; couleur: string; sous: string; ref: any };

const SAISONS: Record<string, string> = { noel: "🎄 Noël", saint_valentin: "💘 Saint-Valentin", paques: "🥚 Pâques", toussaint: "🕯 Toussaint", anniversaire_bsh: "🥂 Anniversaire BSH", autre: "✨ Autre" };

export default function BshCalendrier({ d, recharger, ouvrir }: { d: Donnees; recharger: () => void; ouvrir: (p: Publication) => void }) {
  const [vue, setVue] = useState<Vue>("semaine");
  const [ref, setRef] = useState(aujourdhui());
  const [panneau, setPanneau] = useState<null | "programmation" | "campagne">(null);
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [msg, setMsg] = useState("");
  const auj = aujourdhui();

  // Tous les éléments datés, indexés par jour (heure de Cayenne)
  const parJour = useMemo(() => {
    const m = new Map<string, Element[]>();
    const add = (e: Element) => { const k = cleJour(e.iso); m.set(k, [...(m.get(k) || []), e]); };
    d.pubs.filter(p => p.date_programmee && !["archive"].includes(p.statut)).forEach(p => add({ id: p.id!, type: "publication", titre: p.titre, iso: p.date_programmee!, couleur: SERIES[(p.espace || "chaine") as keyof typeof SERIES] || K.or, sous: `${statutPub(p.statut)[1]}${p.thematique ? " · " + p.thematique : ""}`, ref: p }));
    d.sondages.filter(s => s.date_debut && s.statut !== "archive").forEach(s => add({ id: s.id, type: "sondage", titre: "📊 " + s.question, iso: s.date_debut, couleur: K.rose, sous: "Sondage", ref: s }));
    d.animations.filter(a => a.date_prevue && a.statut !== "archive").forEach(a => add({ id: a.id, type: "animation", titre: "🎲 " + a.nom, iso: a.date_prevue, couleur: SERIES.evenement, sous: "Animation", ref: a }));
    d.boudoir.filter(b => b.date_evenement).forEach(b => add({ id: b.id, type: "boudoir", titre: "🕯 " + b.nom, iso: versIso(b.date_evenement, "20:00"), couleur: K.bord2, sous: "Boudoir Session", ref: b }));
    d.missions.filter(x => x.date_mission && x.statut !== "annulee").forEach(x => add({ id: x.id, type: "mission", titre: "👤 " + x.titre, iso: x.date_mission, couleur: K.cremeD, sous: "Mission hôte", ref: x }));
    m.forEach(l => l.sort((a, b) => a.iso.localeCompare(b.iso)));
    return m;
  }, [d]);

  const jourProg = (cle: string) => d.jours.find(j => j.jour_semaine === jourSemaine(cle));
  const estPensee = (cle: string) => d.reglages?.pensee_actif && ((joursEntre(d.reglages.pensee_date_reference, cle) % d.reglages.pensee_frequence_jours) + d.reglages.pensee_frequence_jours) % d.reglages.pensee_frequence_jours === 0;
  const campagnesDu = (cle: string) => d.campagnes.filter(c => c.date_debut && c.date_fin && cle >= c.date_debut && cle <= c.date_fin && c.statut !== "archivee");

  const deplacer = (sens: number) => {
    if (vue === "jour") setRef(plusJours(ref, sens));
    else if (vue === "semaine") setRef(plusJours(ref, 7 * sens));
    else if (vue === "mois") { const [a, m] = ref.split("-").map(Number); setRef(new Date(Date.UTC(a, m - 1 + sens, 1, 12)).toISOString().slice(0, 10)); }
    else { const [a, m, j] = ref.split("-"); setRef(`${Number(a) + sens}-${m}-${j}`); }
  };
  const titrePeriode = () => {
    const [a, m] = ref.split("-").map(Number);
    if (vue === "jour") return libelleDate(ref);
    if (vue === "semaine") { const l = lundiDe(ref); return `Semaine du ${libelleDate(l, false)} au ${libelleDate(plusJours(l, 6), false)} ${plusJours(l, 6).slice(0, 4)}`; }
    if (vue === "mois") return `${MOIS[m - 1]} ${a}`;
    return String(a);
  };

  // Création des brouillons de la semaine à partir de la programmation par défaut
  const genererSemaine = async () => {
    const lundi = lundiDe(ref);
    const existants = new Set(d.pubs.filter(p => p.date_programmee).map(p => p.date_programmee!.slice(0, 16)));
    const lignes: any[] = [];
    for (let i = 0; i < 7; i++) {
      const cle = plusJours(lundi, i); if (cle < auj) continue;
      const j = jourProg(cle); if (!j) continue;
      const maintenant = new Date().toISOString();
      if (!j.en_pause) j.creneaux.forEach(h => { const iso = versIso(cle, h); if (iso > maintenant && !existants.has(iso.slice(0, 16))) lignes.push({ ...nouvellePublication(cle, h, j.thematique), titre: `${j.thematique} — ${JOURS[jourSemaine(cle)]} ${h.replace(":00", " h")}`, date_programmee: iso, fuseau: "America/Cayenne" }); });
      if (estPensee(cle)) { const h = d.reglages?.pensee_heure || "08:00"; const iso = versIso(cle, h); if (iso > maintenant && !lignes.some(x => x.date_programmee === iso && x.thematique === "Pensée du jour") && !d.pubs.some(p => p.thematique === "Pensée du jour" && p.date_programmee && cleJour(p.date_programmee) === cle)) lignes.push({ ...nouvellePublication(cle, h, "Pensée du jour"), titre: `Pensée du jour — ${libelleDate(cle, false)}`, date_programmee: iso, fuseau: "America/Cayenne" }); }
    }
    if (!lignes.length) { setMsg("Rien à créer : la semaine est déjà préparée (ou passée)."); return; }
    if (!confirm(`Créer ${lignes.length} brouillon(s) pour cette semaine selon la programmation par défaut ? Les créneaux déjà occupés sont ignorés.`)) return;
    try { await sbInsert("bsh_communications", lignes, "return=minimal"); setMsg(`✅ ${lignes.length} brouillons créés — il reste à écrire les textes.`); recharger(); } catch (e: any) { setMsg("⚠️ " + e.message); }
  };

  const ouvrirElement = (e: Element) => { if (e.type === "publication") ouvrir(e.ref); };
  const nouveauLe = (cle: string, h = "08:00") => { const j = jourProg(cle); ouvrir(nouvellePublication(cle, h, j && !j.en_pause ? j.thematique : null)); };

  const Pastille = ({ e, detail }: { e: Element; detail?: boolean }) => (
    <div onClick={ev => { ev.stopPropagation(); ouvrirElement(e); }} title={`${heureCayenne(e.iso)} · ${e.titre} · ${e.sous}`}
      style={{ display: "flex", gap: 5, alignItems: "flex-start", fontSize: detail ? 12 : 10.5, padding: detail ? "7px 9px" : "3px 5px", borderRadius: 7, background: `${e.couleur}1c`, borderLeft: `3px solid ${e.couleur}`, cursor: e.type === "publication" ? "pointer" : "default", color: K.creme, overflow: "hidden" }}>
      <span style={{ color: K.cremeD, flexShrink: 0 }}>{heureCayenne(e.iso)}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: detail ? "normal" : "nowrap" }}>{e.titre}{detail && <span style={{ color: K.cremeD }}> · {e.sous}</span>}</span>
    </div>
  );
  const EnteteJour = ({ cle, compact }: { cle: string; compact?: boolean }) => {
    const j = jourProg(cle); const camp = campagnesDu(cle);
    return <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
        <span style={{ fontSize: compact ? 11 : 13, fontWeight: 800, color: cle === auj ? K.or : K.creme }}>{compact ? `${JOURS_COURTS[jourSemaine(cle)]} ${Number(cle.slice(8))}` : libelleDate(cle)}</span>
        {estPensee(cle) && <span title="Pensée du jour" style={{ fontSize: 11 }}>💭</span>}
      </div>
      {j && <span style={{ fontSize: 10, color: j.en_pause ? K.cremeD : K.rose, fontStyle: "italic" }}>{j.en_pause ? (j.note || "Pause") : j.thematique}</span>}
      {camp.map(c => <span key={c.id} style={{ fontSize: 9.5, color: c.couleur_secondaire || K.or }}>{SAISONS[c.saison]?.split(" ")[0]} {c.nom}</span>)}
    </div>;
  };

  const lundi = lundiDe(ref);
  const [an, mo] = ref.split("-").map(Number);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre action={<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={bouton("ghost")} onClick={() => setPanneau("programmation")}>⚙️ Programmation</button>
        <button style={bouton("ghost")} onClick={genererSemaine}>✨ Préparer la semaine</button>
        <button style={bouton("plein")} onClick={() => nouveauLe(vue === "jour" ? ref : auj)}>+ Publication</button>
      </div>}>Secret Agenda</Titre>
      {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}

      {/* Campagnes et comptes à rebours */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {d.campagnes.filter(c => c.statut !== "archivee").sort((a, b) => (a.date_cible || "9").localeCompare(b.date_cible || "9")).map(c => (
          <div key={c.id} onClick={() => { setCampagne(c); setPanneau("campagne"); }} style={{ flex: "0 0 auto", minWidth: 170, cursor: "pointer", borderRadius: 14, padding: "10px 12px", background: `linear-gradient(135deg,${c.couleur_principale || K.bord}cc,${K.fond})`, border: `1px solid ${c.couleur_secondaire || K.or}55` }}>
            <div style={{ fontSize: 11, color: c.couleur_secondaire || K.or, fontWeight: 700 }}>{SAISONS[c.saison]}</div>
            <div style={{ fontFamily: FS, fontSize: 16, color: K.creme, fontWeight: 700 }}>{c.nom}</div>
            <div style={{ fontSize: 11, color: K.cremeF }}>{c.date_cible ? compteARebours(c.date_cible) : "Date à confirmer"}</div>
          </div>
        ))}
        <button style={{ ...bouton("ghost"), flex: "0 0 auto" }} onClick={() => { setCampagne({ id: "", nom: "", saison: "autre", statut: "brouillon", recurrence_annuelle: true, couleur_principale: "#5c1522", couleur_secondaire: "#c6a15b" } as any); setPanneau("campagne"); }}>+ Campagne</button>
      </div>

      {/* Barre de navigation */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {(["jour", "semaine", "mois", "annee"] as Vue[]).map(v => <button key={v} style={bouton(vue === v ? "or" : "ghost", true)} onClick={() => setVue(v)}>{v === "annee" ? "Année" : v[0].toUpperCase() + v.slice(1)}</button>)}
        <div style={{ flex: 1 }} />
        <button style={bouton("ghost", true)} onClick={() => deplacer(-1)}>‹</button>
        <button style={bouton("ghost", true)} onClick={() => setRef(auj)}>Aujourd'hui</button>
        <button style={bouton("ghost", true)} onClick={() => deplacer(1)}>›</button>
      </div>
      <div style={{ fontFamily: FS, fontSize: 18, color: K.or }}>{(t => t.charAt(0).toUpperCase() + t.slice(1))(titrePeriode())}</div>

      {vue === "jour" && (() => {
        const els = parJour.get(ref) || []; const j = jourProg(ref);
        const creneaux = Array.from(new Set([...(j?.creneaux || []), ...(j?.creneaux_facultatifs || [])])).sort();
        return <Carte>
          <EnteteJour cle={ref} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {creneaux.map(h => {
              const pris = els.filter(e => heureCayenne(e.iso) === h);
              const facultatif = !(j?.creneaux || []).includes(h);
              return <div key={h} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 54, fontSize: 12, color: facultatif ? K.cremeD : K.or, fontWeight: 700, paddingTop: 6 }}>{h}{facultatif && <div style={{ fontSize: 9, fontWeight: 400 }}>facultatif</div>}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  {pris.map(e => <Pastille key={e.type + e.id} e={e} detail />)}
                  {!pris.length && <button style={{ ...bouton("ghost", true), textAlign: "left", borderStyle: "dashed" }} onClick={() => nouveauLe(ref, h)}>+ Préparer ce créneau</button>}
                </div>
              </div>;
            })}
            {els.filter(e => !creneaux.includes(heureCayenne(e.iso))).map(e => <div key={e.type + e.id} style={{ marginLeft: 64 }}><Pastille e={e} detail /></div>)}
            {!creneaux.length && !els.length && <Vide>Journée sans créneau prévu.</Vide>}
          </div>
        </Carte>;
      })()}

      {vue === "semaine" && (
        <div className="bsh-semaine" style={{ display: "grid", gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => plusJours(lundi, i)).map(cle => (
            <div key={cle} className="bsh-jour" onClick={() => { setRef(cle); setVue("jour"); }} style={{ background: cle === auj ? `${K.or}10` : K.verre, border: `1px solid ${cle === auj ? K.or + "66" : K.ligne}`, borderRadius: 12, padding: 9, display: "flex", flexDirection: "column", gap: 6, cursor: "pointer", minWidth: 0 }}>
              <EnteteJour cle={cle} compact />
              {(parJour.get(cle) || []).map(e => <Pastille key={e.type + e.id} e={e} />)}
            </div>
          ))}
        </div>
      )}

      {vue === "mois" && (() => {
        const premier = `${an}-${String(mo).padStart(2, "0")}-01`; const debut = lundiDe(premier);
        const cases = Array.from({ length: 42 }, (_, i) => plusJours(debut, i)).filter((c, i) => i < 35 || c.slice(0, 7) === premier.slice(0, 7));
        return <div style={{ overflowX: "auto" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(92px,1fr))", gap: 4, minWidth: 660 }}>
          {[1, 2, 3, 4, 5, 6, 0].map(j => <div key={j} style={{ fontSize: 10, color: K.cremeD, textAlign: "center", fontWeight: 700 }}>{JOURS_COURTS[j]}</div>)}
          {cases.map(cle => { const els = parJour.get(cle) || []; const dehors = cle.slice(0, 7) !== premier.slice(0, 7); const j = jourProg(cle); return (
            <div key={cle} onClick={() => { setRef(cle); setVue("jour"); }} style={{ minHeight: 84, padding: 5, borderRadius: 8, cursor: "pointer", background: cle === auj ? `${K.or}14` : K.verre, border: `1px solid ${cle === auj ? K.or + "66" : K.ligne}`, opacity: dehors ? 0.4 : 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: K.creme, fontWeight: 700 }}><span>{Number(cle.slice(8))}{estPensee(cle) ? " 💭" : ""}</span><span style={{ fontSize: 9, color: K.rose, fontWeight: 400, fontStyle: "italic" }}>{j?.en_pause ? "pause" : j?.thematique}</span></div>
              {campagnesDu(cle).map(c => <div key={c.id} style={{ height: 3, borderRadius: 2, background: c.couleur_secondaire || K.or }} title={c.nom} />)}
              {els.slice(0, 3).map(e => <Pastille key={e.type + e.id} e={e} />)}
              {els.length > 3 && <div style={{ fontSize: 10, color: K.cremeD }}>+{els.length - 3} autre(s)</div>}
            </div>); })}
        </div></div>;
      })()}

      {vue === "annee" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(220px,100%),1fr))", gap: 10 }}>
          {Array.from({ length: 12 }, (_, m) => {
            const premier = `${an}-${String(m + 1).padStart(2, "0")}-01`; const debut = lundiDe(premier);
            const cases = Array.from({ length: 42 }, (_, i) => plusJours(debut, i));
            const total = cases.filter(c => c.slice(0, 7) === premier.slice(0, 7)).reduce((s, c) => s + (parJour.get(c)?.length || 0), 0);
            return <Carte key={m} style={{ padding: 10 }}>
              <div onClick={() => { setRef(premier); setVue("mois"); }} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", marginBottom: 6 }}><span style={{ fontFamily: FS, fontSize: 15, color: K.or, textTransform: "capitalize" }}>{MOIS[m]}</span><span style={{ fontSize: 10, color: K.cremeD }}>{total} élément(s)</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                {cases.map(cle => { const n = parJour.get(cle)?.length || 0; const dans = cle.slice(0, 7) === premier.slice(0, 7); const camp = campagnesDu(cle)[0]; return (
                  <div key={cle} onClick={() => { if (dans) { setRef(cle); setVue("jour"); } }} title={dans ? `${libelleDate(cle)} — ${n} élément(s)` : ""}
                    style={{ aspectRatio: "1", borderRadius: 4, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", cursor: dans ? "pointer" : "default", visibility: dans ? "visible" : "hidden",
                      color: n ? K.fond : K.cremeD, fontWeight: n ? 800 : 400, background: n ? `rgba(201,133,0,${Math.min(1, 0.35 + n * 0.16)})` : "rgba(255,255,255,0.03)", outline: cle === auj ? `1px solid ${K.creme}` : camp ? `1px solid ${camp.couleur_secondaire || K.or}88` : "none" }}>{Number(cle.slice(8))}</div>); })}
              </div>
            </Carte>;
          })}
        </div>
      )}

      {/* Légende */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: K.cremeD }}>
        {Object.entries({ chaine: "Publication · Chaîne", cercle: "Publication · Cercle", lounge: "Publication · Lounge" }).map(([k, l]) => <Etiquette key={k} couleur={SERIES[k as keyof typeof SERIES]}>{l}</Etiquette>)}
        <Etiquette couleur={K.rose}>Sondage</Etiquette><Etiquette couleur={SERIES.evenement}>Animation</Etiquette><Etiquette couleur={K.bord2}>Boudoir Session</Etiquette><Etiquette couleur={K.cremeD}>Mission hôte</Etiquette>
        <span>💭 pensée du jour</span>
      </div>

      {panneau === "programmation" && <PanneauProgrammation d={d} recharger={recharger} onFermer={() => setPanneau(null)} />}
      {panneau === "campagne" && campagne && <EditeurCampagne c={campagne} d={d} recharger={recharger} onFermer={() => { setPanneau(null); setCampagne(null); }} />}
    </div>
  );
}

// ── Programmation par défaut ─────────────────────────────────
function PanneauProgrammation({ d, recharger, onFermer }: { d: Donnees; recharger: () => void; onFermer: () => void }) {
  const [jours, setJours] = useState(() => [1, 2, 3, 4, 5, 6, 0].map(n => ({ ...(d.jours.find(j => j.jour_semaine === n) || { jour_semaine: n, thematique: "", en_pause: false, creneaux: [], creneaux_facultatifs: [], note: "" }) })));
  const [reg, setReg] = useState({ ...(d.reglages || {}) } as any);
  const [erreur, setErreur] = useState("");
  const liste = (s: string) => s.split(/[,;\s]+/).map(x => x.trim()).filter(x => /^\d{1,2}:\d{2}$/.test(x)).map(x => x.padStart(5, "0"));
  const enregistrer = async () => {
    try {
      await Promise.all(jours.map(j => majJour(j)));
      await majReglages(reg);
      recharger(); onFermer();
    } catch (e: any) { setErreur(e.message || String(e)); }
  };
  return (
    <Feuille titre="⚙️ Programmation par défaut" onFermer={onFermer} large>
      <div style={{ fontSize: 11, color: K.cremeD }}>Ces réglages alimentent le calendrier et le bouton « Préparer la semaine ». Horaires en heure de Cayenne, séparés par des virgules.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {jours.map((j, i) => (
          <div key={j.jour_semaine} style={{ ...grille(150), alignItems: "end", background: K.verre, border: `1px solid ${K.ligne}`, borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 800, color: K.or, fontSize: 13, alignSelf: "center" }}>{JOURS[j.jour_semaine]}</div>
            <Champ label="Thématique"><input style={champ} value={j.thematique} onChange={e => setJours(js => js.map((x, k) => k === i ? { ...x, thematique: e.target.value } : x))} /></Champ>
            <Champ label="Créneaux principaux"><input style={champ} defaultValue={(j.creneaux || []).join(", ")} onBlur={e => setJours(js => js.map((x, k) => k === i ? { ...x, creneaux: liste(e.target.value) } : x))} /></Champ>
            <Champ label="Facultatifs (sondage, annonce…)"><input style={champ} defaultValue={(j.creneaux_facultatifs || []).join(", ")} onBlur={e => setJours(js => js.map((x, k) => k === i ? { ...x, creneaux_facultatifs: liste(e.target.value) } : x))} /></Champ>
            <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={j.en_pause} onChange={e => setJours(js => js.map((x, k) => k === i ? { ...x, en_pause: e.target.checked } : x))} /> Jour de pause</label>
          </div>
        ))}
      </div>
      <Carte style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>💭 Pensée du jour</div>
        <div style={grille(160)}>
          <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!reg.pensee_actif} onChange={e => setReg({ ...reg, pensee_actif: e.target.checked })} /> Activée</label>
          <Champ label="Tous les … jours"><input style={champ} type="number" min={1} max={14} value={reg.pensee_frequence_jours || 2} onChange={e => setReg({ ...reg, pensee_frequence_jours: Number(e.target.value) })} /></Champ>
          <Champ label="Heure"><input style={champ} type="time" value={reg.pensee_heure || "08:00"} onChange={e => setReg({ ...reg, pensee_heure: e.target.value })} /></Champ>
          <Champ label="À partir du"><input style={champ} type="date" value={reg.pensee_date_reference || ""} onChange={e => setReg({ ...reg, pensee_date_reference: e.target.value })} /></Champ>
        </div>
      </Carte>
      <Erreur msg={erreur} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button></div>
    </Feuille>
  );
}

// Mises à jour par clé primaire non-uuid (jour_semaine / id = 1)
async function patchPar(table: string, filtre: string, corps: any) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${filtre}`, { method: "PATCH", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(corps) });
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
}
const majJour = (j: any) => patchPar("bsh_programmation_jours", `jour_semaine=eq.${j.jour_semaine}`, { thematique: j.thematique, en_pause: j.en_pause, creneaux: j.creneaux, creneaux_facultatifs: j.creneaux_facultatifs, note: j.note || null, updated_at: new Date().toISOString() });
const majReglages = (r: any) => patchPar("bsh_agenda_reglages", "id=eq.1", { pensee_actif: !!r.pensee_actif, pensee_frequence_jours: r.pensee_frequence_jours || 2, pensee_heure: r.pensee_heure || "08:00", pensee_date_reference: r.pensee_date_reference, updated_at: new Date().toISOString() });

// ── Campagne saisonnière ─────────────────────────────────────
function EditeurCampagne({ c: init, d, recharger, onFermer }: { c: Campagne; d: Donnees; recharger: () => void; onFermer: () => void }) {
  const [c, setC] = useState<any>({ ...init, date_cible_jour: init.date_cible ? cleJour(init.date_cible) : "", date_cible_heure: init.date_cible ? heureCayenne(init.date_cible) : "00:00" });
  const [erreur, setErreur] = useState("");
  const maj = (p: any) => setC((x: any) => ({ ...x, ...p }));
  const pubs = d.pubs.filter(p => p.campagne_id === init.id);
  const enregistrer = async () => {
    if (!c.nom?.trim()) return setErreur("Nom obligatoire.");
    const corps = { nom: c.nom, saison: c.saison, description: c.description || null, date_debut: c.date_debut || null, date_fin: c.date_fin || null, date_cible: c.date_cible_jour ? versIso(c.date_cible_jour, c.date_cible_heure || "00:00") : null, recurrence_annuelle: !!c.recurrence_annuelle, couleur_principale: c.couleur_principale, couleur_secondaire: c.couleur_secondaire, visuel_url: c.visuel_url || null, statut: c.statut, notes_internes: c.notes_internes || null, updated_at: new Date().toISOString() };
    try { if (init.id) await sbUpdate("bsh_campagnes", init.id, corps); else await sbInsert("bsh_campagnes", corps, "return=minimal"); recharger(); onFermer(); } catch (e: any) { setErreur(e.message); }
  };
  const envoyer = async (f?: File) => { if (!f) return; try { const x = await compresserImage(f); maj({ visuel_url: await uploadStorage(`campagnes/${Date.now().toString(36)}-${slug(f.name)}.${x.ext}`, x.blob, x.type, BUCKET_BSH) }); } catch (e: any) { setErreur(e.message); } };
  return (
    <Feuille titre={init.id ? `Campagne — ${init.nom}` : "Nouvelle campagne"} onFermer={onFermer}>
      <div style={{ borderRadius: 14, padding: 16, background: `linear-gradient(135deg,${c.couleur_principale}dd,${K.fond})`, border: `1px solid ${c.couleur_secondaire}66`, display: "flex", gap: 12, alignItems: "center" }}>
        {c.visuel_url && <img src={c.visuel_url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10 }} />}
        <div><div style={{ color: c.couleur_secondaire, fontSize: 12, fontWeight: 700 }}>{SAISONS[c.saison]}</div><div style={{ fontFamily: FS, fontSize: 22, color: K.creme, fontWeight: 700 }}>{c.nom || "Nom de la campagne"}</div><div style={{ fontSize: 12, color: K.cremeF }}>{c.date_cible_jour ? compteARebours(versIso(c.date_cible_jour, c.date_cible_heure)) : "Compte à rebours : date à définir"}</div></div>
      </div>
      <div style={grille(200)}>
        <Champ label="Nom *"><input style={champ} value={c.nom || ""} onChange={e => maj({ nom: e.target.value })} /></Champ>
        <Champ label="Saison"><select style={champ} value={c.saison} onChange={e => maj({ saison: e.target.value })}>{Object.entries(SAISONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
        <Champ label="Début"><input style={champ} type="date" value={c.date_debut || ""} onChange={e => maj({ date_debut: e.target.value })} /></Champ>
        <Champ label="Fin"><input style={champ} type="date" value={c.date_fin || ""} onChange={e => maj({ date_fin: e.target.value })} /></Champ>
        <Champ label="Date du compte à rebours"><input style={champ} type="date" value={c.date_cible_jour} onChange={e => maj({ date_cible_jour: e.target.value })} /></Champ>
        <Champ label="Heure (Cayenne)"><input style={champ} type="time" value={c.date_cible_heure} onChange={e => maj({ date_cible_heure: e.target.value })} /></Champ>
        <Champ label="Couleur principale"><input type="color" value={c.couleur_principale || "#5c1522"} onChange={e => maj({ couleur_principale: e.target.value })} style={{ ...champ, padding: 2, height: 38 }} /></Champ>
        <Champ label="Couleur d'accent"><input type="color" value={c.couleur_secondaire || "#c6a15b"} onChange={e => maj({ couleur_secondaire: e.target.value })} style={{ ...champ, padding: 2, height: 38 }} /></Champ>
        <Champ label="Statut"><select style={champ} value={c.statut} onChange={e => maj({ statut: e.target.value })}>{["brouillon", "preparation", "active", "terminee", "archivee"].map(s => <option key={s}>{s}</option>)}</select></Champ>
        <Champ label="Visuel"><label style={bouton("ghost", true)}>📷 {c.visuel_url ? "Changer" : "Ajouter"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={e => envoyer(e.target.files?.[0])} /></label></Champ>
      </div>
      <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 6 }}><input type="checkbox" checked={!!c.recurrence_annuelle} onChange={e => maj({ recurrence_annuelle: e.target.checked })} /> Campagne récurrente chaque année</label>
      <Champ label="Description"><textarea style={{ ...champ, minHeight: 60 }} value={c.description || ""} onChange={e => maj({ description: e.target.value })} /></Champ>
      <Champ label="Notes internes"><textarea style={{ ...champ, minHeight: 50 }} value={c.notes_internes || ""} onChange={e => maj({ notes_internes: e.target.value })} /></Champ>
      {init.id && <div style={{ fontSize: 12, color: K.cremeF }}>Calendrier de la campagne : {pubs.length ? pubs.map(p => p.titre).join(" · ") : "aucune publication rattachée pour l'instant (choisis la campagne dans une publication)."}</div>}
      <Erreur msg={erreur} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {init.id && <button style={bouton("danger")} onClick={async () => { if (confirm("Supprimer cette campagne ? Les publications rattachées sont conservées.")) { await sbDelete("bsh_campagnes", init.id); recharger(); onFermer(); } }}>Supprimer</button>}
        <div style={{ flex: 1 }} /><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}
