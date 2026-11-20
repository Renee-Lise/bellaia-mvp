"use client";
// ═══════════════════════════════════════════════════════════
// Calendrier permanent Bellaïa (fondatrice, assistante, cliente).
// • Vues jour / semaine / mois : la grille s'affiche TOUJOURS, même vide.
// • Éléments réels uniquement (aucune réservation inventée) :
//   événements du calendrier, réservations, livraisons de commandes,
//   dossiers Bella'Even's, missions — selon les droits de chaque rôle.
// • Disponibilités hebdomadaires + indisponibilités → créneaux libres
//   calculés ; enregistrées sur l'appareil tant que la migration 0131
//   (préparée) n'est pas appliquée, mention visible.
// • Filtres par univers, rappels (alertes du calendrier), création d'un
//   rendez-vous (fondatrice) dans calendar_events.
// Heure locale de l'appareil (Guyane : UTC−3).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbRpc } from "../events/eventsAtelierLib";
import { MARQUES, marqueDe, type Marque } from "../../design/marques";
import { Surface, Puce, Bouton } from "../../design/composants";

export type ElementAgenda = { id: string; titre: string; debut: Date; fin?: Date | null; journee?: boolean; univers?: string | null; type: "rdv" | "evenement" | "reservation" | "livraison" | "event_client" | "mission" | "tache" | "rappel" | "indisponible"; detail?: string; statut?: string | null };
type Vue = "jour" | "semaine" | "mois";
type Regle = { jour: number; debut: string; fin: string };            // jour 1 = lundi … 7 = dimanche
type Indispo = { date: string; debut?: string; fin?: string; motif?: string };

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const cle = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lundi = (d: Date) => { const x = new Date(d); const j = (x.getDay() + 6) % 7; x.setDate(x.getDate() - j); x.setHours(0, 0, 0, 0); return x; };
const plus = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const enMin = (s: string) => { const [h, mi] = s.split(":").map(Number); return h * 60 + (mi || 0); };
const COULEUR_TYPE: Record<string, string> = { rdv: "#7a5af8", evenement: "#c9a54e", reservation: "#3f8f5f", livraison: "#55632d", event_client: "#b77d8c", mission: "#2b6cb0", tache: "#64748b", rappel: "#c0703a", indisponible: "#9ca3af" };
const LIBELLE_TYPE: Record<string, string> = { rdv: "Rendez-vous", evenement: "Événement", reservation: "Réservation", livraison: "Livraison / retrait", event_client: "Événement client", mission: "Mission", tache: "Tâche", rappel: "Rappel", indisponible: "Indisponible" };

/** Chargement des éléments RÉELS selon le rôle (les règles d'accès en base s'appliquent en plus). */
export async function chargerAgenda(role: "fondatrice" | "assistante" | "cliente", ctx: { userId?: string | null } = {}): Promise<ElementAgenda[]> {
  const g = (t: string, q: string) => sbSelect<any>(t, q).catch(() => []);
  const out: ElementAgenda[] = [];
  if (role === "fondatrice") {
    const [ev, res, cmd, dem] = await Promise.all([
      g("calendar_events", "select=id,titre,description,type_event,pole,date_debut,date_fin,toute_journee,statut,lieu&order=date_debut.asc&limit=500"),
      g("reservations", "select=id,univers,prestation,client_nom,date_rdv,duree_min,statut,lieu&order=date_rdv.asc&limit=500"),
      g("bellaia_commandes", "select=id,reference,bu,date_livraison,statut,client_nom&date_livraison=not.is.null&order=date_livraison.asc&limit=500"),
      g("events_demandes", "select=id,reference,type_evenement,prestation,date_souhaitee,heure_souhaitee,statut,client_prenom&date_souhaitee=not.is.null&limit=500"),
    ]);
    ev.forEach((e: any) => out.push({ id: "ev-" + e.id, titre: e.titre, debut: new Date(e.date_debut), fin: e.date_fin ? new Date(e.date_fin) : null, journee: !!e.toute_journee, univers: e.pole, type: e.type_event === "rdv" ? "rdv" : e.type_event === "tache" ? "tache" : e.type_event === "rappel" ? "rappel" : "evenement", detail: e.lieu || e.description, statut: e.statut }));
    res.forEach((r: any) => r.date_rdv && out.push({ id: "re-" + r.id, titre: r.prestation || "Réservation", debut: new Date(r.date_rdv), fin: r.duree_min ? new Date(new Date(r.date_rdv).getTime() + r.duree_min * 60000) : null, univers: r.univers, type: "reservation", detail: r.client_nom, statut: r.statut }));
    cmd.forEach((c: any) => out.push({ id: "co-" + c.id, titre: `Commande ${c.reference || ""}`.trim(), debut: new Date(c.date_livraison + "T09:00:00"), journee: true, univers: c.bu, type: "livraison", detail: c.client_nom, statut: c.statut }));
    dem.forEach((d: any) => out.push({ id: "de-" + d.id, titre: d.type_evenement || d.prestation || "Demande Bella'Even's", debut: new Date(`${d.date_souhaitee}T${(d.heure_souhaitee || "09:00").slice(0, 5)}:00`), journee: !d.heure_souhaitee, univers: "EVENTS", type: "event_client", detail: d.reference, statut: d.statut }));
  } else if (role === "assistante" && ctx.userId) {
    const mi = await g("bellaia_missions", `assigne_a=eq.${ctx.userId}&select=id,titre,univers,pole,date_prevue,heure,echeance,statut&order=date_prevue.asc&limit=300`);
    mi.forEach((x: any) => { const d = x.date_prevue || x.echeance; if (d) out.push({ id: "mi-" + x.id, titre: x.titre || "Mission", debut: new Date(`${String(d).slice(0, 10)}T${(x.heure || "09:00").slice(0, 5)}:00`), journee: !x.heure, univers: x.univers || x.pole, type: "mission", statut: x.statut }); });
  } else if (role === "cliente" && ctx.userId) {
    const [cmd, dos, res] = await Promise.all([
      g("bellaia_commandes", `created_by=eq.${ctx.userId}&date_livraison=not.is.null&select=id,reference,bu,date_livraison,statut`),
      sbRpc<any[]>("client_mes_dossiers_events", {}).catch(() => []),
      g("reservations", "select=id,univers,prestation,date_rdv,duree_min,statut,lieu&order=date_rdv.asc&limit=200"),   // la base ne renvoie que les siennes
    ]);
    res.forEach((r: any) => r.date_rdv && out.push({ id: "re-" + r.id, titre: r.prestation || "Mon rendez-vous", debut: new Date(r.date_rdv), fin: r.duree_min ? new Date(new Date(r.date_rdv).getTime() + r.duree_min * 60000) : null, univers: r.univers, type: "reservation", detail: r.lieu, statut: r.statut }));
    cmd.forEach((c: any) => out.push({ id: "co-" + c.id, titre: `Commande ${c.reference || ""}`.trim(), debut: new Date(c.date_livraison + "T09:00:00"), journee: true, univers: c.bu, type: "livraison", statut: c.statut }));
    (Array.isArray(dos) ? dos : []).forEach((d: any) => d.date_souhaitee && out.push({ id: "de-" + d.id, titre: d.type_evenement || "Mon événement", debut: new Date(`${d.date_souhaitee}T${(d.heure_souhaitee || "09:00").slice(0, 5)}:00`), journee: !d.heure_souhaitee, univers: "EVENTS", type: "event_client", detail: d.reference }));
  }
  return out.filter(e => !isNaN(e.debut.getTime()));
}

const CLE_DISPO = "bellaia_agenda_disponibilites";
const lireDispo = (): { regles: Regle[]; indispos: Indispo[]; duree: number } => { try { return JSON.parse(localStorage.getItem(CLE_DISPO) || "") } catch { return { regles: [], indispos: [], duree: 60 }; } };

export default function CalendrierPremium({ m = MARQUES.GENERAL, role = "fondatrice", userId, titre = "Calendrier", charger, creation = false, disponibilites = false, sombre }: {
  m?: Marque; role?: "fondatrice" | "assistante" | "cliente"; userId?: string | null; titre?: string; charger?: () => Promise<ElementAgenda[]>; creation?: boolean; disponibilites?: boolean; sombre?: boolean;
}) {
  const [vue, setVue] = useState<Vue>("semaine");
  const [ref, setRef] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [elements, setElements] = useState<ElementAgenda[] | null>(null);
  const [filtre, setFiltre] = useState<string>("tous");
  const [dispo, setDispo] = useState<{ regles: Regle[]; indispos: Indispo[]; duree: number }>({ regles: [], indispos: [], duree: 60 });
  const [panneau, setPanneau] = useState<"" | "dispo" | "rdv">("");
  const [jourChoisi, setJourChoisi] = useState<Date | null>(null);
  const [msg, setMsg] = useState("");
  const recharger = () => (charger ? charger() : chargerAgenda(role, { userId })).then(setElements).catch(() => setElements([]));
  useEffect(() => { recharger(); setDispo(lireDispo()); }, []);
  const sauverDispo = (d: typeof dispo) => { setDispo(d); try { localStorage.setItem(CLE_DISPO, JSON.stringify(d)); } catch {} };

  const fond = sombre ? m.fond : m.surface; const texte = m.texte; const doux = m.doux; const ligne = m.ligne; const accent = m.accent;
  const univers = useMemo(() => Array.from(new Set((elements || []).map(e => e.univers).filter(Boolean))) as string[], [elements]);
  const visibles = (elements || []).filter(e => filtre === "tous" || e.univers === filtre);
  const duJour = (d: Date) => visibles.filter(e => cle(e.debut) === cle(d)).sort((a, b) => a.debut.getTime() - b.debut.getTime());
  const indisposDu = (d: Date) => dispo.indispos.filter(i => i.date === cle(d));
  const creneaux = (d: Date): string[] => {
    if (!disponibilites) return [];
    const j = ((d.getDay() + 6) % 7) + 1; const regles = dispo.regles.filter(r => r.jour === j); if (!regles.length) return [];
    const occupes = duJour(d).filter(e => !e.journee).map(e => [e.debut.getHours() * 60 + e.debut.getMinutes(), e.fin ? e.fin.getHours() * 60 + e.fin.getMinutes() : e.debut.getHours() * 60 + e.debut.getMinutes() + dispo.duree]);
    const ind = indisposDu(d); if (ind.some(i => !i.debut)) return [];
    ind.forEach(i => occupes.push([enMin(i.debut!), enMin(i.fin || "23:59")]));
    const res: string[] = []; const maintenant = new Date();
    regles.forEach(r => { for (let t = enMin(r.debut); t + dispo.duree <= enMin(r.fin); t += dispo.duree) {
      const passe = cle(d) === cle(maintenant) && t <= maintenant.getHours() * 60 + maintenant.getMinutes();
      if (!passe && cle(d) >= cle(maintenant) && !occupes.some(([a, b]) => t < b && t + dispo.duree > a)) res.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`); } });
    return res;
  };
  const decaler = (n: number) => setRef(r => vue === "jour" ? plus(r, n) : vue === "semaine" ? plus(r, 7 * n) : new Date(r.getFullYear(), r.getMonth() + n, 1));
  const libellePeriode = vue === "jour" ? ref.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : vue === "semaine" ? `Semaine du ${lundi(ref).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const aujourd = cle(new Date());
  const pill = (on: boolean): React.CSSProperties => ({ minHeight: 34, padding: "5px 12px", borderRadius: 999, border: `1px solid ${on ? accent : ligne}`, background: on ? accent : "transparent", color: on ? m.accentTexte : texte, fontSize: 12.5, fontWeight: 700, fontFamily: m.sans, flex: "none" });

  const Pastille = ({ e, compact }: { e: ElementAgenda; compact?: boolean }) => <div style={{ borderLeft: `3px solid ${COULEUR_TYPE[e.type]}`, background: `${COULEUR_TYPE[e.type]}14`, borderRadius: 8, padding: compact ? "2px 5px" : "7px 9px", fontSize: compact ? 10.5 : 13, lineHeight: 1.25, overflow: "hidden", whiteSpace: compact ? "nowrap" : "normal", textOverflow: "ellipsis", color: texte }}>
    {!compact && <div style={{ fontSize: 11, color: doux }}>{e.journee ? "Journée" : hm(e.debut)}{e.fin && !e.journee ? `–${hm(e.fin)}` : ""} · {LIBELLE_TYPE[e.type]}{e.univers ? ` · ${marqueDe(e.univers).nom}` : ""}</div>}
    <div style={{ fontWeight: 650 }}>{compact && !e.journee ? hm(e.debut) + " " : ""}{e.titre}</div>
    {!compact && e.detail && <div style={{ fontSize: 11.5, color: doux }}>{e.detail}</div>}
  </div>;

  const Jour = ({ d }: { d: Date }) => { const l = duJour(d); const c = creneaux(d); const ind = indisposDu(d); return <div>
    {ind.map((i, k) => <div key={k} style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", borderRadius: 8, padding: "6px 9px", marginBottom: 6 }}>Indisponible {i.debut ? `${i.debut}–${i.fin || ""}` : "toute la journée"}{i.motif ? ` · ${i.motif}` : ""}</div>)}
    {l.length ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{l.map(e => <Pastille key={e.id} e={e} />)}</div> : <div style={{ fontSize: 13, color: doux, padding: "6px 0" }}>Aucun élément ce jour-là.</div>}
    {disponibilites && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 800, color: doux, marginBottom: 5 }}>Créneaux disponibles</div>
      {c.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{c.map(h => <span key={h} style={{ fontSize: 12.5, padding: "5px 9px", borderRadius: 999, border: `1px dashed ${accent}`, color: texte }}>{h}</span>)}</div> : <div style={{ fontSize: 12.5, color: doux }}>{dispo.regles.length ? "Aucun créneau libre." : "Définissez vos disponibilités pour afficher les créneaux."}</div>}</div>}
  </div>; };

  return <div style={{ background: fond, color: texte, fontFamily: m.sans, borderRadius: 18, border: `1px solid ${ligne}`, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div style={{ fontFamily: m.serif, fontSize: 24, fontWeight: 600 }}>{titre}</div>
      <div style={{ display: "flex", gap: 4 }}><button aria-label="Période précédente" onClick={() => decaler(-1)} style={{ ...pill(false), padding: "5px 10px" }}>‹</button><button onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setRef(d); }} style={pill(false)}>Aujourd'hui</button><button aria-label="Période suivante" onClick={() => decaler(1)} style={{ ...pill(false), padding: "5px 10px" }}>›</button></div>
    </div>
    <div style={{ fontSize: 13.5, color: doux, margin: "4px 0 10px" }}>{libellePeriode.charAt(0).toUpperCase() + libellePeriode.slice(1)}</div>
    <div style={{ display: "flex", gap: 6 }}>
      {(["jour", "semaine", "mois"] as Vue[]).map(v => <button key={v} onClick={() => setVue(v)} style={{ ...pill(vue === v), flex: 1 }}>{v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}</button>)}
    </div>
    {/* Filtres par univers : ligne défilante séparée (aucune pastille coupée sous les vues) */}
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 4px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
      <button onClick={() => setFiltre("tous")} style={pill(filtre === "tous")}>Tous les univers</button>
      {univers.map(u => <button key={u} onClick={() => setFiltre(u)} style={pill(filtre === u)}>{marqueDe(u).nom}</button>)}
    </div>
    {elements === null && <div style={{ fontSize: 12.5, color: doux, padding: "6px 0" }}>Chargement des éléments…</div>}

    {vue === "mois" && (() => { const debut = lundi(new Date(ref.getFullYear(), ref.getMonth(), 1)); const jours = Array.from({ length: 42 }, (_, i) => plus(debut, i)); return <div style={{ marginTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11, color: doux, textAlign: "center", marginBottom: 4 }}>{JOURS.map(j => <div key={j}>{j}</div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>{jours.map(d => { const l = duJour(d); const hors = d.getMonth() !== ref.getMonth(); const c = disponibilites ? creneaux(d).length : 0; return <button key={cle(d)} onClick={() => { setJourChoisi(d); }} style={{ minHeight: 58, padding: 3, borderRadius: 9, border: `1px solid ${cle(d) === aujourd ? accent : ligne}`, background: jourChoisi && cle(jourChoisi) === cle(d) ? `${accent}22` : "transparent", opacity: hors ? 0.4 : 1, textAlign: "left", display: "flex", flexDirection: "column", gap: 2, fontFamily: m.sans, color: texte, overflow: "hidden" }}>
        <span style={{ fontSize: 12, fontWeight: cle(d) === aujourd ? 900 : 600 }}>{d.getDate()}</span>
        <span style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{l.slice(0, 4).map(e => <span key={e.id} style={{ width: 6, height: 6, borderRadius: 9, background: COULEUR_TYPE[e.type] }} />)}</span>
        {c > 0 && <span style={{ fontSize: 9.5, color: doux }}>{c} libre{c > 1 ? "s" : ""}</span>}
        {indisposDu(d).length > 0 && <span style={{ fontSize: 9.5, color: "#6b7280" }}>indispo.</span>}
      </button>; })}</div>
      {jourChoisi && <Surface m={m} style={{ marginTop: 10, padding: 12, background: fond }}><div style={{ fontWeight: 700, marginBottom: 6, textTransform: "capitalize" }}>{jourChoisi.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div><Jour d={jourChoisi} /></Surface>}
    </div>; })()}

    {vue === "semaine" && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>{Array.from({ length: 7 }, (_, i) => plus(lundi(ref), i)).map(d => <div key={cle(d)} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: `1px solid ${ligne}` }}>
      <div style={{ width: 46, flex: "none", textAlign: "center" }}><div style={{ fontSize: 11, color: doux }}>{JOURS[(d.getDay() + 6) % 7]}</div><div style={{ fontSize: 20, fontWeight: 800, color: cle(d) === aujourd ? accent : texte }}>{d.getDate()}</div></div>
      <div style={{ flex: 1, minWidth: 0 }}><Jour d={d} /></div></div>)}</div>}

    {vue === "jour" && <div style={{ marginTop: 8 }}>
      <div style={{ position: "relative" }}>{Array.from({ length: 15 }, (_, i) => 7 + i).map(h => { const l = duJour(ref).filter(e => !e.journee && e.debut.getHours() === h); return <div key={h} style={{ display: "flex", gap: 8, minHeight: 44, borderTop: `1px solid ${ligne}`, padding: "4px 0" }}><div style={{ width: 42, fontSize: 11, color: doux, flex: "none" }}>{String(h).padStart(2, "0")}:00</div><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>{l.map(e => <Pastille key={e.id} e={e} />)}{disponibilites && creneaux(ref).filter(c => Number(c.slice(0, 2)) === h).map(c => <span key={c} style={{ fontSize: 12, color: doux, border: `1px dashed ${accent}`, borderRadius: 8, padding: "3px 8px", alignSelf: "flex-start" }}>Libre · {c}</span>)}</div></div>; })}</div>
      {duJour(ref).filter(e => e.journee).length > 0 && <div style={{ marginTop: 8 }}><div style={{ fontSize: 11, color: doux, marginBottom: 4 }}>Toute la journée</div>{duJour(ref).filter(e => e.journee).map(e => <Pastille key={e.id} e={e} />)}</div>}
    </div>}

    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{Object.entries(LIBELLE_TYPE).filter(([k]) => visibles.some(e => e.type === k)).map(([k, l]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: doux }}><span style={{ width: 8, height: 8, borderRadius: 9, background: COULEUR_TYPE[k] }} />{l}</span>)}{elements && !visibles.length && <span style={{ fontSize: 12, color: doux }}>Aucun rendez-vous, commande ou événement enregistré : le calendrier reste prêt à l'emploi.</span>}</div>

    {(disponibilites || creation) && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      {disponibilites && <Bouton m={m} variante="contour" style={{ flex: 1, fontSize: 13 }} onClick={() => setPanneau(panneau === "dispo" ? "" : "dispo")}>Mes disponibilités</Bouton>}
      {creation && <Bouton m={m} style={{ flex: 1, fontSize: 13 }} onClick={() => setPanneau(panneau === "rdv" ? "" : "rdv")}>＋ Rendez-vous</Bouton>}
    </div>}
    {panneau === "dispo" && <PanneauDispo m={m} dispo={dispo} onChange={sauverDispo} />}
    {panneau === "rdv" && <NouveauRdv m={m} onCree={async (f) => { try { await sbInsert("calendar_events", { ...f, fondatrice_id: userId || null }, "return=minimal"); setMsg("Rendez-vous enregistré."); setPanneau(""); recharger(); } catch (e: any) { setMsg("Refusé : " + e.message); } }} />}
    {msg && <div style={{ fontSize: 12.5, color: accent, marginTop: 8 }}>{msg}</div>}
  </div>;
}

function PanneauDispo({ m, dispo, onChange }: { m: Marque; dispo: { regles: Regle[]; indispos: Indispo[]; duree: number }; onChange: (d: any) => void }) {
  const [r, setR] = useState<Regle>({ jour: 1, debut: "09:00", fin: "17:00" }); const [i, setI] = useState<Indispo>({ date: cle(new Date()), motif: "" });
  const ch: React.CSSProperties = { border: `1px solid ${m.ligne}`, borderRadius: 10, padding: "8px 9px", fontSize: 15, fontFamily: m.sans, background: "#fff", color: "#1f2937", minHeight: 40 };
  return <Surface m={m} style={{ marginTop: 10, padding: 12 }}>
    <div style={{ fontSize: 12, color: m.doux, lineHeight: 1.4, marginBottom: 8 }}>Enregistré sur cet appareil (simulation) tant que la migration 0131 n'est pas appliquée. Les clientes ne voient encore aucun créneau.</div>
    <div style={{ fontWeight: 700, fontSize: 14 }}>Horaires hebdomadaires</div>
    {dispo.regles.map((x, k) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: `1px solid ${m.ligne}` }}><span>{JOURS[x.jour - 1]} {x.debut}–{x.fin}</span><button onClick={() => onChange({ ...dispo, regles: dispo.regles.filter((_, j) => j !== k) })} style={{ background: "none", border: "none", color: "#b4523f", fontSize: 13 }}>Retirer</button></div>)}
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}><select style={ch} value={r.jour} onChange={e => setR({ ...r, jour: Number(e.target.value) })}>{JOURS.map((j, k) => <option key={j} value={k + 1}>{j}</option>)}</select><input type="time" style={ch} value={r.debut} onChange={e => setR({ ...r, debut: e.target.value })} /><input type="time" style={ch} value={r.fin} onChange={e => setR({ ...r, fin: e.target.value })} /><Bouton m={m} variante="contour" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => r.debut < r.fin && onChange({ ...dispo, regles: [...dispo.regles, r] })}>Ajouter</Bouton></div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>Durée d'un créneau <select style={ch} value={dispo.duree} onChange={e => onChange({ ...dispo, duree: Number(e.target.value) })}>{[15, 30, 45, 60, 90, 120].map(x => <option key={x} value={x}>{x} min</option>)}</select></div>
    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 12 }}>Indisponibilités</div>
    {dispo.indispos.map((x, k) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: `1px solid ${m.ligne}` }}><span>{x.date} {x.debut ? `${x.debut}–${x.fin}` : "journée"} {x.motif}</span><button onClick={() => onChange({ ...dispo, indispos: dispo.indispos.filter((_, j) => j !== k) })} style={{ background: "none", border: "none", color: "#b4523f", fontSize: 13 }}>Retirer</button></div>)}
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}><input type="date" style={ch} value={i.date} onChange={e => setI({ ...i, date: e.target.value })} /><input type="time" style={ch} value={i.debut || ""} onChange={e => setI({ ...i, debut: e.target.value || undefined })} /><input type="time" style={ch} value={i.fin || ""} onChange={e => setI({ ...i, fin: e.target.value || undefined })} /><input style={{ ...ch, flex: 1, minWidth: 120 }} placeholder="Motif (facultatif)" value={i.motif} onChange={e => setI({ ...i, motif: e.target.value })} /><Bouton m={m} variante="contour" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onChange({ ...dispo, indispos: [...dispo.indispos, i] })}>Ajouter</Bouton></div>
  </Surface>;
}

function NouveauRdv({ m, onCree }: { m: Marque; onCree: (f: any) => void }) {
  const [f, setF] = useState<any>({ titre: "", date: cle(new Date()), heure: "10:00", duree: 60, pole: "GENERAL", lieu: "", alerte: true });
  const ch: React.CSSProperties = { border: `1px solid ${m.ligne}`, borderRadius: 10, padding: "9px 10px", fontSize: 15, fontFamily: m.sans, background: "#fff", color: "#1f2937", minHeight: 42, width: "100%", boxSizing: "border-box" };
  return <Surface m={m} style={{ marginTop: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
    <input style={ch} placeholder="Objet du rendez-vous" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} />
    <div style={{ display: "flex", gap: 6 }}><input type="date" style={ch} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /><input type="time" style={ch} value={f.heure} onChange={e => setF({ ...f, heure: e.target.value })} /></div>
    <div style={{ display: "flex", gap: 6 }}><select style={ch} value={f.duree} onChange={e => setF({ ...f, duree: Number(e.target.value) })}>{[15, 30, 45, 60, 90, 120, 180].map(x => <option key={x} value={x}>{x} min</option>)}</select><select style={ch} value={f.pole} onChange={e => setF({ ...f, pole: e.target.value })}>{["GENERAL", "BSH", "ODYSSEE", "EVENTS", "FOOD", "VILO", "STUDIO", "EDITIONS", "MOTIPY"].map(u => <option key={u} value={u}>{marqueDe(u).nom}</option>)}</select></div>
    <input style={ch} placeholder="Lieu (facultatif)" value={f.lieu} onChange={e => setF({ ...f, lieu: e.target.value })} />
    <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.alerte} onChange={e => setF({ ...f, alerte: e.target.checked })} /> Rappels la veille et le jour même</label>
    <Bouton m={m} disabled={!f.titre.trim()} onClick={() => { const d = new Date(`${f.date}T${f.heure}:00`); onCree({ titre: f.titre.trim(), type_event: "rdv", pole: f.pole, date_debut: d.toISOString(), date_fin: new Date(d.getTime() + f.duree * 60000).toISOString(), toute_journee: false, lieu: f.lieu || null, statut: "planifié", alertes_jours: f.alerte ? [1, 0] : [], compte_rebours: false }); }}>Enregistrer le rendez-vous</Bouton>
  </Surface>;
}
