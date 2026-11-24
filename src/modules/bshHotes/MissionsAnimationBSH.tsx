"use client";
// Missions d'animation Bella'Secret Home dans l'espace professionnel commun (chemin réel d'une hôte connectée).
// S'affiche seulement si la base reconnaît la personne comme hôte BSH active (bsh_mon_hote). Les données renvoyées
// sont déjà filtrées par la base (titulaire ou remplaçant·e) ; les déclarations passent par les fonctions de 0141.
import React, { useEffect, useState } from "react";
import { sbSelect, sbRpc } from "../events/eventsAtelierLib";
import { BSH, SERIF, SANS, dateFr } from "./bshHotesLib";
import { SuiviAnimation } from "./EspaceHoteBSH";

export default function MissionsAnimationBSH() {
  const [moi, setMoi] = useState<string | null | undefined>(undefined);
  const [d, setD] = useState<any>(null); const [msg, setMsg] = useState("");
  useEffect(() => { (async () => {
    let id: string | null = null; try { const r: unknown = await sbRpc("bsh_mon_hote", {}); id = typeof r === "string" && r ? r : null; } catch { id = null; }
    setMoi(id); if (!id) return;
    const g = (t: string, q: string) => sbSelect<any>(t, q).catch(() => []);
    const [missions, publications, ressources] = await Promise.all([g("bsh_missions", "select=*&order=date_mission.asc.nullslast"), g("bsh_communications", "select=id,titre,contenu,espace,date_programmee,statut,visuel_url"), g("bsh_ressources", "select=id,titre,type,url,contenu_texte")]);
    setD({ missions: missions.filter((m: any) => m.communication_id || m.animation_id || m.espace), publications, ressources });
  })(); }, []);
  if (!moi || !d) return null;
  const avertir = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };
  const majMission = (id: string, patch: any) => setD((x: any) => ({ ...x, missions: x.missions.map((m: any) => m.id === id ? { ...m, ...patch } : m) }));
  const majPublication = (id: string, patch: any) => setD((x: any) => ({ ...x, publications: x.publications.map((p: any) => p.id === id ? { ...p, ...patch } : p) }));
  return <section aria-label="Missions Bella'Secret Home" style={{ background: `linear-gradient(160deg, ${BSH.bordeaux}, ${BSH.noir})`, color: BSH.texte, borderRadius: 18, padding: 14, fontFamily: SANS, display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
    <div style={{ fontFamily: SERIF, fontSize: 20, color: BSH.orClair }}>Missions Bella'Secret Home</div>
    {msg && <div role="status" style={{ fontSize: 14 }}>{msg}</div>}
    {d.missions.length === 0 ? <div style={{ color: BSH.doux, fontSize: 14 }}>Aucune mission d'animation confiée pour le moment.</div> : d.missions.map((m: any) =>
      <div key={m.id} style={{ border: `1px solid ${BSH.ligne}`, borderRadius: 14, padding: 12 }}>
        <div style={{ fontFamily: SERIF, fontSize: 17, color: BSH.orClair }}>{m.titre}</div>
        <div style={{ fontSize: 13, color: BSH.doux }}>📅 {dateFr(m.date_mission)}{m.heure_debut ? ` · ${String(m.heure_debut).slice(0, 5)}` : ""}</div>
        {m.consignes && <div style={{ fontSize: 14, marginTop: 6, whiteSpace: "pre-wrap" }}>📝 {m.consignes}</div>}
        <SuiviAnimation m={m} d={d} moi={moi} majMission={majMission} majPublication={majPublication} avertir={avertir} />
      </div>)}
  </section>;
}
