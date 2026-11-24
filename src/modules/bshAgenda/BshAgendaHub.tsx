"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda & Rewards — centre de gestion (espace
// Fondatrice > BSH). Charge toutes les données une fois, puis les
// rubriques travaillent dessus. Navigation latérale sur ordinateur,
// barre de rubriques sur tablette et téléphone ; toute la largeur
// disponible est utilisée (aucune largeur de téléphone imposée).
// ═══════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from "react";
import { K, FS, SA, bouton, Carte, Vide, Titre, Etiquette, sbSelect, libelleDate, cleJour, aujourdhui, type Hote } from "./bshAgendaLib";
import BshPublications, { EditeurPublication, type Publication } from "./BshPublications";
import BshCalendrier from "./BshCalendrier";
import BshSondages from "./BshSondages";
import BshAnimations, { LiensDiamondB } from "./BshAnimations";
import BshRewards from "./BshRewards";
import BshHotes from "./BshHotes";
import BshStatistiques, { BshTableauDeBord } from "./BshStats";
import BshContinuite from "./BshContinuite";
import BshStudio from "./BshStudio";
import BshMediatheque from "./BshMediatheque";
import BshAssistant, { type ContenuAssistant } from "./BshAssistant";

export type Campagne = { id: string; nom: string; saison: string; description?: string | null; date_debut: string | null; date_fin: string | null; date_cible: string | null; recurrence_annuelle: boolean; couleur_principale: string | null; couleur_secondaire: string | null; visuel_url?: string | null; statut: string; notes_internes?: string | null };
export type Sondage = { id: string; question: string; choix: { id: string; libelle: string }[]; choix_multiple: boolean; date_debut: string | null; date_fin: string | null; destination: string; source: string; statut: string; resultats_manuels: Record<string, number>; participants_manuels: number | null; hote_id: string | null; campagne_id: string | null; notes_internes: string | null };
export type Animation = { id: string; nom: string; categorie: string; regles: string | null; difficulte: string; duree_minutes: number | null; participants_min: number | null; participants_max: number | null; questions: any[]; points_actifs: boolean; jeu_id: string | null; hote_id: string | null; campagne_id: string | null; date_prevue: string | null; espace: string | null; statut: string; notes_internes: string | null };
export type Reward = { id: string; titre: string; description: string | null; reglement: string | null; conditions_eligibilite: string | null; date_debut: string | null; date_cloture: string | null; lots: any[]; quantite_disponible: number | null; budget: number | null; statut: string; validation_fondatrice: boolean; validation_juridique: boolean; validation_juridique_note: string | null; validation_plateforme: boolean; validation_plateforme_note: string | null; participation_ouverte: boolean; campagne_id: string | null; notes_internes: string | null };
export type Musique = { id: string; titre: string; artiste: string; lien_ecoute: string | null; ambiance: string | null; duree_secondes: number | null; autorisation_diffusion: "a_verifier" | "autorisee" | "refusee"; autorisation_note: string | null; notes: string | null };
export type Donnees = {
  pubs: Publication[]; sondages: Sondage[]; animations: Animation[]; campagnes: Campagne[]; rewards: Reward[]; hotes: Hote[];
  jours: { jour_semaine: number; thematique: string; en_pause: boolean; creneaux: string[]; creneaux_facultatifs: string[]; note: string | null }[];
  reglages: { pensee_actif: boolean; pensee_frequence_jours: number; pensee_heure: string; pensee_date_reference: string; continuite_active?: boolean; continuite_principal?: string | null; continuite_remplacant?: string | null; continuite_horizon_jours?: number; continuite_note?: string | null } | null;
  missions: Mission[];
  /** Migration 0141 appliquée (preuves, médiathèque, studio, missions déléguées) : détectée, jamais supposée. */
  v141: boolean;
  preuves: { id: string; communication_id: string; preuve: string; preuve_url: string | null; publie_le: string; source: string }[];
  ressources: Ressource[]; creations: Creation[]; versions: VersionCreation[];
  dispos: { id: string; hote_id: string; jour: string; type: string; note: string | null }[];
  medias: { id: string; url: string; nom_fichier: string; dossier: string }[];
  assistant: ContenuAssistant[];
  boudoir: { id: string; nom: string; date_evenement: string | null; lieu: string | null; statut: string; capacite: number | null; places_restantes: number | null; description: string | null; publie: boolean | null }[];
  jeux: { id: string; nom: string; icone: string; statut: string }[];
  musique: Musique[]; musiqueLiens: { id: string; musique_id: string; cible_type: string; cible_id: string }[];
};

export type Mission = { id: string; hote_id: string; remplacant_id?: string | null; titre: string; date_mission: string | null; lieu: string | null; statut: string; espace?: string | null; communication_id?: string | null; animation_id?: string | null; ressources?: string[]; statut_execution?: string; compte_rendu?: string | null; compte_rendu_le?: string | null; consignes?: string | null; heure_debut?: string | null; heure_fin?: string | null; reporte_au?: string | null; motif?: string | null; simulation?: boolean };
export type Ressource = { id: string; titre: string; univers: string; type: string; campagne_id: string | null; espace: string | null; date_ressource: string | null; url: string | null; chemin_storage?: string | null; source_media_id: string | null; empreinte: string | null; contenu_texte: string | null; jeu_id?: string | null; rewards_id?: string | null; auteur: string | null; statut_validation: string; valide_le: string | null; droits: string; droits_note: string | null; created_at: string };
export type Creation = { id: string; titre: string; format: string; ambiance: string; campagne_id: string | null; parent_id: string | null; personnage_id: string | null; communication_id: string | null; jeu_id: string | null; ressource_finale_id: string | null; statut: string; version_courante: number; created_at: string; updated_at?: string };
export type VersionCreation = { id: string; creation_id: string; numero: number; contenu: any; note_correction: string | null; created_at: string };

const RUBRIQUES: [string, string, string][] = [
  ["tableau", "◈", "Tableau de bord"], ["agenda", "🗓", "Secret Agenda"], ["publications", "📢", "Publications"], ["sondages", "📊", "Sondages"],
  ["jeux", "🎲", "Jeux et animations"], ["rewards", "🎁", "BSH Rewards"], ["hotes", "👤", "Hôtes et hôtesses"], ["continuite", "🛡", "Continuité BSH"], ["studio", "🎨", "Studio créatif"], ["mediatheque", "🗂", "Médiathèque"], ["assistant", "💬", "Assistant de communication"], ["stats", "📈", "Statistiques"], ["boudoir", "🕯", "Boudoir Sessions"],
];

async function charger(): Promise<Donnees> {
  const q = <T,>(t: string, s: string) => sbSelect<T>(t, s);
  const [pubs, sondages, animations, campagnes, rewards, hotes, jours, reglages, missions, boudoir, jeux, musique, musiqueLiens] = await Promise.all([
    q<Publication>("bsh_communications", "select=*&order=date_programmee.asc.nullslast&limit=5000"),
    q<Sondage>("bsh_sondages", "select=*&order=date_debut.desc.nullslast"),
    q<Animation>("bsh_animations", "select=*&order=date_prevue.asc.nullslast"),
    q<Campagne>("bsh_campagnes", "select=*&order=date_cible.asc.nullslast"),
    q<Reward>("bsh_rewards_campagnes", "select=*&order=created_at.desc"),
    q<Hote>("bsh_hotes", "select=id,nom,prenom,statut,profile_id&order=prenom.asc"),
    q<any>("bsh_programmation_jours", "select=*"),
    q<any>("bsh_agenda_reglages", "select=*&id=eq.1"),
    q<any>("bsh_missions", "select=*&order=date_mission.asc.nullslast"),
    q<any>("bsh_evenements", "select=id,nom,date_evenement,lieu,statut,capacite,places_restantes,description,publie&categorie=eq.boudoir_session&order=date_evenement.asc.nullslast"),
    q<any>("bsh_jeux", "select=id,nom,icone,statut&order=ordre.asc"),
    q<Musique>("bsh_musique", "select=*&order=titre.asc"),
    q<any>("bsh_musique_liens", "select=id,musique_id,cible_type,cible_id"),
  ]);
  // 0141 : présence vérifiée par une lecture réelle de la table des preuves (aucune supposition)
  const v141 = await sbSelect<any>("bsh_preuves_publication", "select=id,communication_id,preuve,preuve_url,publie_le,source&order=publie_le.desc").then(r => ({ ok: true, r })).catch(() => ({ ok: false, r: [] as any[] }));
  const opt = <T,>(t: string, s: string) => v141.ok ? sbSelect<T>(t, s).catch(() => [] as T[]) : Promise.resolve([] as T[]);
  const [ressources, creations, versions, dispos, medias, assistant] = await Promise.all([
    opt<Ressource>("bsh_ressources", "select=*&order=created_at.desc"), opt<Creation>("bsh_creations", "select=*&order=created_at.desc"),
    opt<VersionCreation>("bsh_creations_versions", "select=*&order=numero.asc"),
    sbSelect<any>("bsh_hotes_disponibilites", "select=id,hote_id,jour,type,note").catch(() => []),
    sbSelect<any>("events_medias", "select=id,url,nom_fichier,dossier&order=created_at.desc&limit=300").catch(() => []),
    opt<ContenuAssistant>("bsh_assistant_contenus", "select=*&order=updated_at.desc"),
  ]);
  return { pubs, sondages, animations, campagnes, rewards, hotes, jours, reglages: reglages[0] || null, missions, boudoir, jeux, musique, musiqueLiens, v141: v141.ok, preuves: v141.r, ressources, creations, versions, dispos, medias, assistant };
}

function Boudoir({ d, recharger, experiences }: { d: Donnees; recharger: () => void; experiences?: React.ReactNode }) {
  const [gerer, setGerer] = useState(false);
  const auj = aujourdhui();
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <Titre action={experiences ? <button style={bouton(gerer ? "or" : "ghost")} onClick={() => setGerer(!gerer)}>{gerer ? "← Vue agenda" : "💎 Créer / gérer (Experiences)"}</button> : undefined}>Boudoir Sessions</Titre>
    {gerer && experiences ? experiences : <>
      <div style={{ fontSize: 11, color: K.cremeD }}>Les Boudoir Sessions sont les expériences BSH de catégorie « Boudoir Session » (module 💎 Experiences existant : création, lieux, budget, checklists, invitations). Ici : vue agenda et musique Diamond B associée.</div>
      {d.boudoir.length === 0 ? <Vide>Aucune Boudoir Session enregistrée.</Vide> : d.boudoir.map(b => (
        <Carte key={b.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}><div style={{ fontFamily: FS, fontSize: 18, color: K.creme, fontWeight: 700 }}>🕯 {b.nom}</div><div style={{ fontSize: 11, color: K.cremeD }}>{b.date_evenement ? libelleDate(b.date_evenement) : "Date à définir"}{b.lieu ? ` · ${b.lieu}` : ""}{b.capacite ? ` · ${b.places_restantes ?? b.capacite}/${b.capacite} places` : ""}</div></div>
            <Etiquette couleur={b.date_evenement && b.date_evenement < auj ? K.cremeD : K.or}>{b.statut}{b.publie ? " · publiée" : ""}</Etiquette>
          </div>
          <LiensDiamondB d={d} cibleType="evenement" cibleId={b.id} recharger={recharger} />
        </Carte>
      ))}
    </>}
  </div>;
}

export default function BshAgendaHub({ experiences }: { experiences?: React.ReactNode }) {
  const [rub, setRub] = useState(() => { try { return localStorage.getItem("bsh-agenda-rubrique") || "tableau"; } catch { return "tableau"; } });
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Publication | null>(null);
  const recharger = useCallback(() => { charger().then(x => { setD(x); setErreur(""); }).catch(e => setErreur(e.message || String(e))); }, []);
  useEffect(() => { recharger(); }, [recharger]);
  const aller = (r: string) => { setRub(r); try { localStorage.setItem("bsh-agenda-rubrique", r); } catch {} };

  return (
    <div className="bsh-hub" style={{ fontFamily: SA, color: K.creme, background: `radial-gradient(120% 60% at 0% 0%,${K.bord}33,transparent 60%),${K.fond}`, borderRadius: 18, border: `1px solid ${K.ligne}`, padding: 12, minHeight: 420 }}>
      <style>{`
        .bsh-hub { display:grid; grid-template-columns: 1fr; gap: 12px; }
        .bsh-nav { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling: touch; }
        .bsh-nav button { flex: 0 0 auto; }
        .bsh-semaine { grid-template-columns: 1fr; }
        .bsh-marque { display: none; }
        .bsh-jour { min-height: 0; }
        .bsh-deux-colonnes { grid-template-columns: 1fr; }
        @media (min-width: 700px) {
          .bsh-nav { flex-wrap: wrap; overflow: visible; }
          .bsh-semaine { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (min-width: 1000px) {
          .bsh-semaine { grid-template-columns: repeat(7, minmax(0,1fr)); }
          .bsh-jour { min-height: 120px; }
          .bsh-deux-colonnes { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (min-width: 1180px) {
          .bsh-hub { grid-template-columns: 230px minmax(0,1fr); padding: 18px; gap: 20px; }
          .bsh-nav { flex-direction: column; flex-wrap: nowrap; position: sticky; top: 12px; align-self: start; }
          .bsh-marque { display: block; }
          .bsh-nav button { justify-content: flex-start; width: 100%; }
        }
        .bsh-hub input[type=date], .bsh-hub input[type=time], .bsh-hub input[type=datetime-local] { color-scheme: dark; }
        .bsh-hub select option { background: #160f13; color: #f1e7e2; }
      `}</style>
      <nav className="bsh-nav" aria-label="Rubriques BSH Secret Agenda">
        <div className="bsh-marque" style={{ fontFamily: FS, fontSize: 20, color: K.or, fontWeight: 700, padding: "4px 6px", flex: "0 0 auto", whiteSpace: "nowrap" }}>Secret Agenda</div>
        {RUBRIQUES.map(([id, ico, l]) => (
          <button key={id} onClick={() => aller(id)} aria-current={rub === id ? "page" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 11, cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: SA, whiteSpace: "nowrap",
              border: `1px solid ${rub === id ? K.or + "88" : "transparent"}`, background: rub === id ? `linear-gradient(135deg,${K.bord},${K.prune})` : K.verre, color: rub === id ? K.creme : K.cremeF, boxShadow: rub === id ? `0 0 18px ${K.bord}66` : "none" }}>
            <span style={{ width: 18, textAlign: "center" }}>{ico}</span>{l}
          </button>
        ))}
      </nav>
      <main style={{ minWidth: 0 }}>
        {erreur && <div style={{ color: K.erreur, fontSize: 12, marginBottom: 10 }}>⚠️ {erreur} <button style={bouton("ghost", true)} onClick={recharger}>Réessayer</button></div>}
        {!d ? <div style={{ color: K.cremeD, fontSize: 13, padding: 30, textAlign: "center" }}>{erreur ? "" : "Chargement du Secret Agenda…"}</div> : <>
          {rub === "tableau" && <BshTableauDeBord d={d} aller={aller} ouvrirPublication={setEdition} />}
          {rub === "agenda" && <BshCalendrier d={d} recharger={recharger} ouvrir={setEdition} />}
          {rub === "publications" && <BshPublications d={d} recharger={recharger} ouvrir={setEdition} />}
          {rub === "sondages" && <BshSondages d={d} recharger={recharger} />}
          {rub === "jeux" && <BshAnimations d={d} recharger={recharger} />}
          {rub === "rewards" && <BshRewards d={d} recharger={recharger} />}
          {rub === "hotes" && <BshHotes d={d} ouvrirPublication={setEdition} />}
          {rub === "continuite" && <BshContinuite d={d} recharger={recharger} ouvrir={setEdition} />}
          {rub === "studio" && <BshStudio d={d} recharger={recharger} />}
          {rub === "mediatheque" && <BshMediatheque d={d} recharger={recharger} />}
          {rub === "assistant" && <BshAssistant d={d} recharger={recharger} />}
          {rub === "stats" && <BshStatistiques d={d} />}
          {rub === "boudoir" && <Boudoir d={d} recharger={recharger} experiences={experiences} />}
          {edition && <EditeurPublication key={edition.id || "nouvelle"} initiale={edition} d={d} onFermer={() => setEdition(null)} onEnregistre={recharger} />}
        </>}
      </main>
    </div>
  );
}
