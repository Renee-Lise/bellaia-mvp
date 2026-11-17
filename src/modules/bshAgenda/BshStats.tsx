"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Tableau de bord & Statistiques
// Tous les chiffres sont calculés à partir des données réelles
// chargées depuis Supabase. Aucun chiffre inventé : état vide quand
// il n'y a pas de données.
// Couleurs : palette validée (dark, surface #160f13) — doré #c98500
// (série 1), vieux rose #d55181 (série 2).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { K, FS, SA, Carte, Vide, Titre, bouton, aujourdhui, cleJour, plusJours, lundiDe, libelleDate, libelleInstant, compteARebours, jourSemaine, nomHote, sbRpc, ESPACES, statutPub } from "./bshAgendaLib";
import type { Donnees } from "./BshAgendaHub";

const S1 = "#c98500", S2 = "#d55181";
const TERMINES = ["publie"], EXCLUS = ["annule", "archive"];

// ── Calculs ──────────────────────────────────────────────────
export function useIndicateurs(d: Donnees) {
  const [participationNatifs, setPN] = useState<number | null>(null);
  useEffect(() => {
    const natifs = d.sondages.filter(s => s.source === "natif" && ["actif", "clos"].includes(s.statut));
    if (!natifs.length) { setPN(0); return; }
    Promise.all(natifs.map(s => sbRpc<any[]>("bsh_sondage_resultats", { p_sondage: s.id }).then(r => Number(r?.[0]?.participants || 0)).catch(() => 0))).then(v => setPN(v.reduce((a, b) => a + b, 0)));
  }, [d.sondages]);
  return useMemo(() => {
    const auj = aujourdhui();
    const pubs = d.pubs.filter(p => !EXCLUS.includes(p.statut));
    const prevues = pubs.filter(p => p.statut !== "publie" && p.date_programmee && cleJour(p.date_programmee) >= auj).length;
    const realisees = pubs.filter(p => TERMINES.includes(p.statut)).length;
    const echues = pubs.filter(p => p.date_programmee && cleJour(p.date_programmee) < auj);
    const echuesFaites = echues.filter(p => p.statut === "publie").length;
    const taux = echues.length ? echuesFaites / echues.length : null;
    const animAvenir = d.animations.filter(a => a.date_prevue && cleJour(a.date_prevue) >= auj && !["archive", "realise"].includes(a.statut)).length;
    const sondagesActifs = d.sondages.filter(s => s.statut === "actif").length;
    const participationManuelle = d.sondages.filter(s => s.source === "whatsapp").reduce((a, s) => a + (Number(s.participants_manuels) || 0), 0);
    const participation = participationNatifs == null ? null : participationManuelle + participationNatifs;
    const sondagesAvecResultats = d.sondages.filter(s => s.source === "natif" ? ["actif", "clos"].includes(s.statut) : s.participants_manuels != null).length;
    return { auj, prevues, realisees, echues: echues.length, echuesFaites, taux, animAvenir, sondagesActifs, participation, sondagesAvecResultats };
  }, [d, participationNatifs]);
}

// ── Petits composants graphiques ─────────────────────────────
function Tuile({ valeur, libelle, detail }: { valeur: React.ReactNode; libelle: string; detail?: string }) {
  return <div style={{ background: K.verre, border: `1px solid ${K.ligne}`, borderRadius: 14, padding: "12px 14px", minWidth: 0 }}>
    <div style={{ fontSize: 26, fontWeight: 700, color: K.creme, fontFamily: FS, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{valeur}</div>
    <div style={{ fontSize: 11, color: K.cremeF, marginTop: 3 }}>{libelle}</div>
    {detail && <div style={{ fontSize: 10, color: K.cremeD, marginTop: 2 }}>{detail}</div>}
  </div>;
}

export function Anneau({ part, libelle, sous }: { part: number | null; libelle: string; sous?: string }) {
  const r = 42, c = 2 * Math.PI * r;
  return <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <svg width={104} height={104} viewBox="0 0 104 104" role="img" aria-label={`${libelle} : ${part == null ? "pas de données" : Math.round(part * 100) + " %"}`}>
      <circle cx={52} cy={52} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
      {part != null && <circle cx={52} cy={52} r={r} fill="none" stroke={S1} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${c * part} ${c}`} transform="rotate(-90 52 52)" />}
      <text x={52} y={52} textAnchor="middle" dominantBaseline="central" fill={K.creme} fontSize={20} fontWeight={700} fontFamily={SA}>{part == null ? "—" : `${Math.round(part * 100)} %`}</text>
    </svg>
    <div><div style={{ fontSize: 13, color: K.creme, fontWeight: 700 }}>{libelle}</div>{sous && <div style={{ fontSize: 11, color: K.cremeD, marginTop: 2 }}>{sous}</div>}</div>
  </div>;
}

export function BarresH({ donnees, format = (n: number) => String(n), titre }: { donnees: { libelle: string; valeur: number; detail?: string }[]; format?: (n: number) => string; titre: string }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(...donnees.map(x => x.valeur), 0);
  if (!donnees.length || max === 0) return <Vide>Pas encore de données.</Vide>;
  return <div role="table" aria-label={titre} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
    {donnees.map((x, i) => <div key={x.libelle + i} role="row" onMouseEnter={() => setSurvol(i)} onMouseLeave={() => setSurvol(null)} title={`${x.libelle} : ${format(x.valeur)}${x.detail ? " — " + x.detail : ""}`} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "2px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span role="cell" style={{ color: K.creme }}>{x.libelle}</span><span role="cell" style={{ color: K.cremeF, fontVariantNumeric: "tabular-nums" }}>{format(x.valeur)}</span></div>
      <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}><div style={{ width: `${(x.valeur / max) * 100}%`, height: "100%", background: S1, borderRadius: 4, opacity: survol != null && survol !== i ? 0.45 : 1, transition: "opacity .15s" }} /></div>
    </div>)}
  </div>;
}

/** Courbes d'évolution hebdomadaire (2 séries, même axe). */
function Courbes({ semaines, series }: { semaines: string[]; series: { nom: string; couleur: string; valeurs: number[] }[] }) {
  const [i, setI] = useState<number | null>(null);
  const [L, setL] = useState(640);
  const boite = React.useRef<HTMLDivElement>(null);
  useEffect(() => { const el = boite.current; if (!el) return; const ro = new ResizeObserver(() => setL(Math.max(280, el.clientWidth))); ro.observe(el); setL(Math.max(280, el.clientWidth)); return () => ro.disconnect(); }, []);
  const max = Math.max(1, ...series.flatMap(s => s.valeurs));
  if (series.every(s => s.valeurs.every(v => v === 0))) return <Vide>Pas encore de publications datées sur cette période.</Vide>;
  const H = 220, g = 34, dr = 64, ht = 16, bas = 26;
  const pas = Math.max(1, Math.ceil(semaines.length / Math.max(2, Math.floor((L - g - dr) / 92))));
  // étiquettes directes en fin de courbe, écartées si elles se chevauchent
  const fins = series.map(s => ({ nom: s.nom, y: ht + (H - ht - bas) * (1 - s.valeurs[s.valeurs.length - 1] / max) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < fins.length; k++) if (fins[k].y - fins[k - 1].y < 13) fins[k].y = fins[k - 1].y + 13;
  const x = (k: number) => g + (k * (L - g - dr)) / Math.max(1, semaines.length - 1);
  const y = (v: number) => ht + (H - ht - bas) * (1 - v / max);
  const graduations = Array.from(new Set([0, Math.ceil(max / 2), max]));
  const auj = lundiDe(aujourdhui());
  return <div ref={boite} style={{ position: "relative" }}>
    <svg viewBox={`0 0 ${L} ${H}`} width={L} height={H} style={{ display: "block", maxWidth: "100%" }} role="img" aria-label="Publications par semaine" onMouseLeave={() => setI(null)}
      onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * L; setI(Math.max(0, Math.min(semaines.length - 1, Math.round(((px - g) / (L - g - dr)) * (semaines.length - 1))))); }}>
      {graduations.map(v => <g key={v}><line x1={g} x2={L - dr} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" /><text x={g - 6} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize={10} fill={K.cremeD}>{v}</text></g>)}
      {semaines.map((s, k) => k % pas === 0 && <text key={s} x={x(k)} y={H - 8} textAnchor="middle" fontSize={9.5} fill={s === auj ? K.creme : K.cremeD}>{libelleDate(s, false).replace(/ \d{4}$/, "")}</text>)}
      {semaines.includes(auj) && <line x1={x(semaines.indexOf(auj))} x2={x(semaines.indexOf(auj))} y1={ht} y2={H - bas} stroke={K.cremeD} strokeDasharray="3 3" />}
      {series.map(s => <polyline key={s.nom} fill="none" stroke={s.couleur} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.valeurs.map((v, k) => `${x(k)},${y(v)}`).join(" ")} />)}
      {i != null && <line x1={x(i)} x2={x(i)} y1={ht} y2={H - bas} stroke="rgba(241,231,226,0.35)" />}
      {i != null && series.map(s => <circle key={s.nom} cx={x(i)} cy={y(s.valeurs[i])} r={4.5} fill={s.couleur} stroke={K.surface} strokeWidth={2} />)}
      {/* étiquettes directes en fin de courbe */}
      {fins.map(f => <text key={f.nom + "l"} x={x(semaines.length - 1) + 6} y={f.y} dominantBaseline="central" fontSize={10.5} fill={K.cremeF}>{f.nom}</text>)}
    </svg>
    {i != null && <div style={{ position: "absolute", top: 0, left: Math.min(L - 190, Math.max(0, x(i) + 10)), background: K.prune, border: `1px solid ${K.ligne}`, borderRadius: 8, padding: "6px 9px", fontSize: 11, color: K.creme, pointerEvents: "none", whiteSpace: "nowrap" }}>
      <div style={{ color: K.cremeD, marginBottom: 2 }}>Semaine du {libelleDate(semaines[i], false)}</div>
      {series.map(s => <div key={s.nom} style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 2, background: s.couleur }} />{s.nom} : <b>{s.valeurs[i]}</b></div>)}
    </div>}
    <div style={{ display: "flex", gap: 12, fontSize: 11, color: K.cremeF, marginTop: 4 }}>{series.map(s => <span key={s.nom} style={{ display: "flex", gap: 5, alignItems: "center" }}><span style={{ width: 12, height: 2, background: s.couleur }} />{s.nom}</span>)}</div>
  </div>;
}

// ── Tableau de bord ──────────────────────────────────────────
export function BshTableauDeBord({ d, aller, ouvrirPublication }: { d: Donnees; aller: (r: string) => void; ouvrirPublication: (p: any) => void }) {
  const ind = useIndicateurs(d);
  const auj = ind.auj;
  const jour = d.jours.find(j => j.jour_semaine === jourSemaine(auj));
  const prochaines = d.pubs.filter(p => p.date_programmee && p.date_programmee >= new Date().toISOString() && !["publie", ...EXCLUS].includes(p.statut)).sort((a, b) => a.date_programmee!.localeCompare(b.date_programmee!)).slice(0, 6);
  const aValider = d.pubs.filter(p => p.statut === "en_attente").length + d.animations.filter(a => a.statut === "a_valider").length;
  const campagnes = d.campagnes.filter(c => c.date_cible && c.date_cible > new Date().toISOString() && c.statut !== "archivee").sort((a, b) => a.date_cible!.localeCompare(b.date_cible!)).slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Titre>Tableau de bord</Titre>
      <div style={{ borderRadius: 16, padding: "14px 16px", background: `linear-gradient(135deg,${K.bord}cc,${K.prune})`, border: `1px solid ${K.or}44` }}>
        <div style={{ fontSize: 11, color: K.or, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Aujourd'hui · {libelleDate(auj)}</div>
        <div style={{ fontFamily: FS, fontSize: 26, color: K.creme, fontWeight: 700 }}>{jour ? (jour.en_pause ? `Pause${jour.note ? " — " + jour.note : ""}` : jour.thematique) : "—"}</div>
        <div style={{ fontSize: 12, color: K.cremeF }}>{jour && !jour.en_pause ? `Créneaux : ${jour.creneaux.join(" · ")}` : ""}{aValider ? ` · ${aValider} élément(s) à valider` : ""}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 10 }}>
        <Tuile valeur={ind.prevues} libelle="Publications prévues" detail="à venir, non publiées" />
        <Tuile valeur={ind.realisees} libelle="Publications réalisées" detail="marquées publiées" />
        <Tuile valeur={ind.animAvenir} libelle="Animations à venir" />
        <Tuile valeur={ind.sondagesActifs} libelle="Sondages actifs" />
        <Tuile valeur={ind.participation == null ? "…" : ind.participation} libelle="Participation aux sondages" detail={ind.sondagesAvecResultats ? `${ind.sondagesAvecResultats} sondage(s) avec résultats` : "aucun résultat saisi"} />
      </div>
      <div className="bsh-deux-colonnes" style={{ display: "grid", gap: 12 }}>
        <Carte>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}><div style={{ fontFamily: FS, fontSize: 18, color: K.or, flex: 1 }}>Prochaines publications</div><button style={bouton("ghost", true)} onClick={() => aller("agenda")}>Agenda →</button></div>
          {prochaines.length === 0 ? <Vide>Rien de programmé. Utilise « ✨ Préparer la semaine » dans le Secret Agenda.</Vide> : prochaines.map(p => <div key={p.id} onClick={() => ouvrirPublication(p)} style={{ display: "flex", gap: 8, padding: "7px 0", borderTop: `1px solid ${K.ligne}`, cursor: "pointer", fontSize: 12 }}>
            <span style={{ color: K.cremeD, width: 112, flexShrink: 0 }}>{libelleInstant(p.date_programmee)}</span><span style={{ color: K.creme, flex: 1 }}>{p.titre}</span><span style={{ color: statutPub(p.statut)[2] }}>{statutPub(p.statut)[1]}</span>
          </div>)}
        </Carte>
        <Carte>
          <div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Taux de réalisation</div>
          <Anneau part={ind.taux} libelle="Publications échues effectivement publiées" sous={ind.echues ? `${ind.echuesFaites} sur ${ind.echues} (hors annulées)` : "Aucune publication échue pour l'instant"} />
          {campagnes.length > 0 && <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>{campagnes.map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: K.creme }}><span>{c.nom}</span><span style={{ color: K.or, fontWeight: 700 }}>{compteARebours(c.date_cible)}</span></div>)}</div>}
        </Carte>
      </div>
    </div>
  );
}

// ── Statistiques ─────────────────────────────────────────────
export default function BshStatistiques({ d }: { d: Donnees }) {
  const ind = useIndicateurs(d);
  const semaines = useMemo(() => { const l0 = lundiDe(aujourdhui()); return Array.from({ length: 16 }, (_, k) => plusJours(l0, (k - 11) * 7)); }, []);
  const parSemaine = useMemo(() => {
    const idx = (iso: string) => semaines.indexOf(lundiDe(cleJour(iso)));
    const prev = semaines.map(() => 0), pub = semaines.map(() => 0);
    d.pubs.filter(p => !EXCLUS.includes(p.statut)).forEach(p => {
      if (p.date_programmee) { const k = idx(p.date_programmee); if (k >= 0) prev[k]++; }
      const eff = p.date_publication_effective || (p.statut === "publie" ? p.date_programmee : null);
      if (p.statut === "publie" && eff) { const k = idx(eff); if (k >= 0) pub[k]++; }
    });
    return [{ nom: "Prévues", couleur: S1, valeurs: prev }, { nom: "Publiées", couleur: S2, valeurs: pub }];
  }, [d.pubs, semaines]);
  const parEspace = ["chaine", "cercle", "lounge", "evenement"].map(e => {
    const p = d.pubs.filter(x => x.espace === e && !EXCLUS.includes(x.statut)).length, a = d.animations.filter(x => x.espace === e && x.statut !== "archive").length, s = d.sondages.filter(x => x.destination === e && x.statut !== "archive").length;
    return { libelle: ESPACES[e], valeur: p + a + s, detail: `${p} publication(s), ${a} animation(s), ${s} sondage(s)` };
  }).concat([{ libelle: "Bellaïa (sondages natifs)", valeur: d.sondages.filter(x => x.destination === "bellaia" && x.statut !== "archive").length, detail: "" }]).filter(x => x.valeur > 0);
  const auj = aujourdhui();
  const missions = d.hotes.map(h => {
    const n = d.pubs.filter(p => p.hote_id === h.id && !EXCLUS.includes(p.statut)).length + d.animations.filter(a => a.hote_id === h.id && a.statut !== "archive").length + d.missions.filter(m => m.hote_id === h.id && m.statut !== "annulee").length + d.sondages.filter(s => s.hote_id === h.id && s.statut !== "archive").length;
    const avenir = d.missions.filter(m => m.hote_id === h.id && m.date_mission && cleJour(m.date_mission) >= auj).length;
    return { libelle: nomHote(h), valeur: n, detail: `${avenir} mission(s) à venir` };
  }).filter(x => x.valeur > 0);
  const budgets = d.rewards.filter(r => r.statut !== "annulee" && Number(r.budget) > 0).map(r => ({ libelle: r.titre, valeur: Number(r.budget), detail: r.statut }));
  const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Titre>Statistiques</Titre>
      <div style={{ fontSize: 11, color: K.cremeD }}>Calculées en direct à partir des données enregistrées dans Bellaïa — aucune estimation.</div>
      <Carte><div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 8 }}>Évolution hebdomadaire des publications</div><Courbes semaines={semaines} series={parSemaine} /></Carte>
      <div className="bsh-deux-colonnes" style={{ display: "grid", gap: 12 }}>
        <Carte><div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Réalisation</div><Anneau part={ind.taux} libelle="Publications échues publiées" sous={ind.echues ? `${ind.echuesFaites} / ${ind.echues}` : "Aucune donnée"} /></Carte>
        <Carte><div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Activités par espace</div><BarresH titre="Activités par espace" donnees={parEspace} /></Carte>
        <Carte><div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Missions des hôtes</div><BarresH titre="Éléments attribués par hôte" donnees={missions} /></Carte>
        <Carte><div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Budget des campagnes Rewards</div><BarresH titre="Budget par campagne" donnees={budgets} format={eur} /></Carte>
      </div>
      <Carte>
        <div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 8 }}>Participation aux sondages</div>
        {d.sondages.length === 0 ? <Vide>Aucun sondage.</Vide> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: K.creme, minWidth: 460 }}>
          <thead><tr style={{ color: K.cremeD, fontSize: 10, textAlign: "left", textTransform: "uppercase" }}><th style={{ padding: 5 }}>Sondage</th><th style={{ padding: 5 }}>Lieu</th><th style={{ padding: 5 }}>Statut</th><th style={{ padding: 5, textAlign: "right" }}>Participants</th></tr></thead>
          <tbody>{d.sondages.map(s => <tr key={s.id} style={{ borderTop: `1px solid ${K.ligne}` }}><td style={{ padding: 5 }}>{s.question}</td><td style={{ padding: 5 }}>{s.source === "natif" ? "Bellaïa" : "WhatsApp"}</td><td style={{ padding: 5 }}>{s.statut}</td><td style={{ padding: 5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s.source === "natif" ? "voir le sondage" : s.participants_manuels ?? "—"}</td></tr>)}</tbody>
        </table></div>}
      </Carte>
    </div>
  );
}
