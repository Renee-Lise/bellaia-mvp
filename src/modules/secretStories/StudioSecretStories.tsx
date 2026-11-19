"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Stories — STUDIO ÉDITORIAL PRIVÉ (prévisualisation)
// Fondatrice > Bella'Secret Home. Réservé à la fondatrice et aux
// collaboratrices expressément autorisées (permission accordée à la main).
// • Ouvrages : création depuis une idée, un synopsis, un import ou un
//   manuscrit ; paramètres (genre, ambiance, public adulte, point de vue,
//   longueur, chapitres, style) ; privé par défaut.
// • Chapitres : édition, sauvegarde automatique, versions conservées,
//   validation chapitre par chapitre.
// • Personnages, chronologie, mémoire narrative, extraits gratuits,
//   narration audio, commercialisation (tarifs en brouillon).
// • IA et voix : AUCUN appel ici. Une demande entre dans la file avec un
//   coût estimé et attend l'approbation de la fondatrice (contrôle en base).
// • Romances adultes sensuelles et NON graphiques : ligne éditoriale
//   rappelée dans l'atelier (conditions des fournisseurs IA et voix).
// Sans migration 0129 : mode SIMULATION, rien n'est enregistré.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MARQUES } from "../../design/marques";
import { Surface, Titre, Puce, Bouton, Indicateur } from "../../design/composants";
import { ssDisponible, studio, coutTexte, coutVoix, eur, motsDe, IA_AUTORISEE, type Oeuvre, type Chapitre } from "./secretStoriesLib";

const m = MARQUES.BSH;
const ROSE = m.secondaire;
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const STATUTS: Record<string, [string, "neutre" | "ok" | "alerte" | "accent"]> = {
  brouillon: ["Brouillon", "neutre"], ecriture: ["En écriture", "accent"], relecture: ["Relecture", "alerte"], pret: ["Prêt", "ok"], publie: ["Publié", "ok"], archive: ["Archivé", "neutre"],
  a_relire: ["À relire", "alerte"], valide: ["Validé", "ok"],
};
const OPTIONS = {
  type: [["roman", "Roman"], ["nouvelle", "Nouvelle"], ["tome_saga", "Tome de saga"], ["recueil", "Recueil"]],
  origine: [["idee", "Une idée"], ["synopsis", "Un synopsis"], ["import", "Un document importé"], ["manuscrit", "Un manuscrit existant"]],
  genre: ["Romance contemporaine", "Romance historique", "Romance suspense", "Romance fantastique", "Romance exotique"],
  ambiance: ["Glamour", "Mystérieuse", "Passionnée", "Tendre", "Sombre et élégante"],
  pov: ["Première personne", "Troisième personne", "Points de vue alternés"],
  longueur: [["nouvelle", "Nouvelle (≈ 15 000 mots)"], ["court", "Roman court (≈ 40 000 mots)"], ["roman", "Roman (≈ 70 000 mots)"]],
  style: ["Lyrique", "Moderne et vif", "Classique", "Poétique et sensoriel"],
};
const AVERTISSEMENTS = ["Public adulte", "Scènes sensuelles suggérées", "Thèmes émotionnels intenses", "Langage", "Relations complexes"];
const MOTS_LONGUEUR: Record<string, number> = { nouvelle: 15000, court: 40000, roman: 70000 };

const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: m.surface2, border: `1px solid ${m.ligne}`, borderRadius: 12, color: m.texte, padding: "11px 12px", fontSize: 16, fontFamily: m.sans, outline: "none" };
const etiquette: React.CSSProperties = { fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: m.accent, fontWeight: 700, margin: "12px 0 5px" };

function Choix({ valeur, options, onChange }: { valeur: string; options: (string | string[])[]; onChange: (v: string) => void }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; const on = v === valeur; return (
    <button key={v} onClick={() => onChange(v)} style={{ minHeight: 36, padding: "7px 12px", borderRadius: 999, border: `1px solid ${on ? m.accent : m.ligne}`, background: on ? `${m.accent}22` : "transparent", color: on ? m.accent : m.texte, fontSize: 13, fontWeight: 600, fontFamily: m.sans }}>{l}</button>); })}</div>;
}

export default function StudioSecretStories({ initial }: { initial?: { oeuvres: Oeuvre[]; chapitres: Chapitre[]; personnages?: any[]; chronologie?: any[] } }) {
  const [base, setBase] = useState<boolean | null>(initial ? false : null);
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>(initial?.oeuvres || []);
  const [chapitres, setChapitres] = useState<Chapitre[]>(initial?.chapitres || []);
  const [annexes, setAnnexes] = useState<Record<string, any[]>>({ ss_personnages: initial?.personnages || [], ss_chronologie: initial?.chronologie || [], ss_extraits: [], ss_generations: [] });
  const [vue, setVue] = useState<{ e: "accueil" } | { e: "nouveau" } | { e: "oeuvre"; id: string; onglet: string } | { e: "chapitre"; id: string }>({ e: "accueil" });
  const [message, setMessage] = useState("");
  const [autorise, setAutorise] = useState<boolean>(true);
  useEffect(() => { if (initial) return; ssDisponible().then(async ok => { setBase(ok); if (ok) { const a = await studio.autorise(); setAutorise(a); if (a) setOeuvres(await studio.oeuvres().catch(() => [])); } }); }, []);
  const simul = base === false;
  const flash = (t: string) => { setMessage(t); setTimeout(() => setMessage(""), 3200); };

  const oeuvre = vue.e === "oeuvre" ? oeuvres.find(o => o.id === vue.id) : vue.e === "chapitre" ? oeuvres.find(o => o.id === chapitres.find(c => c.id === vue.id)?.oeuvre_id) : undefined;
  const chapsDe = (id: string) => chapitres.filter(c => c.oeuvre_id === id).sort((a, b) => a.ordre - b.ordre);
  const ouvrir = async (id: string, onglet = "chapitres") => {
    setVue({ e: "oeuvre", id, onglet });
    if (!simul && base) {
      const [c, p, t, x] = await Promise.all([studio.chapitres(id), studio.liste("ss_personnages", id), studio.liste("ss_chronologie", id), studio.liste("ss_extraits", id)].map(pr => pr.catch(() => [])));
      setChapitres(l => [...l.filter(z => z.oeuvre_id !== id), ...(c as Chapitre[])]);
      setAnnexes(a => ({ ...a, ss_personnages: [...a.ss_personnages.filter(z => z.oeuvre_id !== id), ...p], ss_chronologie: [...a.ss_chronologie.filter(z => z.oeuvre_id !== id), ...t], ss_extraits: [...a.ss_extraits.filter(z => z.oeuvre_id !== id), ...x] }));
    }
  };
  const ajouterAnnexe = async (table: string, ligne: any) => {
    const l = simul ? { id: uid(), created_at: new Date().toISOString(), ...ligne } : await studio.ajouter(table, ligne).catch((e: any) => { flash("Refusé : " + e.message); return null; });
    if (l) setAnnexes(a => ({ ...a, [table]: [...(a[table] || []), l] }));
  };

  const stats = useMemo(() => ({
    nb: oeuvres.length, ecriture: oeuvres.filter(o => ["ecriture", "relecture"].includes(o.statut)).length,
    mots: chapitres.reduce((s, c) => s + motsDe(c.texte), 0), valides: chapitres.filter(c => c.statut === "valide").length,
  }), [oeuvres, chapitres]);

  const entete = (titre: string, retour?: () => void, sur = "BSH Secret Stories") => (
    <div style={{ background: m.degrade, padding: "18px 16px 20px", borderBottom: `1px solid ${m.ligne}` }}>
      {retour && <button onClick={retour} style={{ background: "none", border: "none", color: m.accent, fontSize: 14, padding: 0, marginBottom: 8, fontFamily: m.sans }}>‹ Retour</button>}
      <div style={{ fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: m.accent, fontWeight: 700 }}>{sur}</div>
      <div style={{ fontFamily: m.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.08, marginTop: 2 }}>{titre}</div>
    </div>);
  const bandeauSimul = simul && <div style={{ margin: "12px 16px 0", padding: "10px 12px", borderRadius: 12, border: `1px dashed ${m.accent}88`, color: m.accent, fontSize: 12.5, lineHeight: 1.4 }}>
    Aperçu en simulation : la migration 0129 n'est pas encore appliquée, rien n'est enregistré. Les exemples affichés sont fictifs et identifiés comme tels.</div>;
  const toast = message && <div style={{ position: "fixed", left: 16, right: 16, bottom: 22, background: m.surface2, border: `1px solid ${m.accent}`, borderRadius: 14, padding: 12, fontSize: 13.5, zIndex: 50 }}>{message}</div>;
  const page = (contenu: React.ReactNode) => <div style={{ background: m.fond, minHeight: "100vh", color: m.texte, fontFamily: m.sans, paddingBottom: 60 }}>{contenu}{toast}</div>;

  if (!autorise) return page(<>{entete("Studio éditorial")}<div style={{ padding: 20, color: m.doux, fontSize: 14, lineHeight: 1.5 }}>Studio réservé à la fondatrice et aux collaboratrices qu'elle a expressément autorisées. Aucun manuscrit n'est accessible sans cette autorisation.</div></>);

  // ── Accueil ──
  if (vue.e === "accueil") return page(<>
    {entete("Studio éditorial")}
    {bandeauSimul}
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Indicateur m={m} libelle="Ouvrages" valeur={String(stats.nb)} detail={`${stats.ecriture} en cours d'écriture`} />
        <Indicateur m={m} libelle="Mots écrits" valeur={stats.mots.toLocaleString("fr-FR")} detail={`${stats.valides} chapitre(s) validé(s)`} />
      </div>
      <Bouton m={m} onClick={() => setVue({ e: "nouveau" })}>＋ Nouvel ouvrage</Bouton>
      <Surface m={m}>
        <Titre m={m} sur="Manuscrits privés" niveau={3}>Mes ouvrages</Titre>
        {oeuvres.length ? oeuvres.map(o => { const [l, ton] = STATUTS[o.statut] || [o.statut, "neutre"]; const ch = chapsDe(o.id); return (
          <div key={o.id} onClick={() => ouvrir(o.id)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer" }}>
            <div style={{ width: 46, height: 64, borderRadius: 6, background: `linear-gradient(160deg, ${m.principale}, #000)`, border: `1px solid ${m.accent}55`, display: "grid", placeItems: "center", color: m.accent, fontFamily: m.serif, fontSize: 18, flex: "none" }}>{o.titre.slice(0, 1)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: m.serif, fontSize: 19, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.titre}</div>
              <div style={{ fontSize: 12, color: m.doux, marginTop: 2 }}>{OPTIONS.type.find(t => t[0] === o.type)?.[1]} · {ch.length} chapitre(s) · {o.prive ? "🔒 privé" : "visible"}</div>
            </div>
            <Puce m={m} ton={ton}>{l}</Puce>
          </div>); }) : <div style={{ color: m.doux, fontSize: 13.5 }}>Aucun ouvrage. Commencez par une idée, un synopsis ou un manuscrit.</div>}
      </Surface>
      <Surface m={m}>
        <Titre m={m} sur="Modules" niveau={3}>Votre atelier</Titre>
        {[["✍︎", "Atelier d'écriture assistée", "Idée, synopsis, import ou manuscrit"], ["📖", "Manuscrits et chapitres", "Versions et sauvegarde automatique"], ["👥", "Personnages et relations", "Fiches, liens, voix"], ["🕰", "Intrigues et chronologies", "Événements, lieux, cohérence"], ["📚", "Sagas et collections", "Tomes, coffrets"], ["🎙", "Studio de narration audio", "Voix synthétiques, émotions, rythme"], ["🖼", "Couvertures", "Visuels validés par vous"], ["🔐", "Droits et autorisations", "Collaboratrices, voix, contrats"], ["💎", "Commercialisation", "Formats, prix et formules en brouillon"]].map(([i, t, d]) =>
          <div key={t} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${m.ligne}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: m.surface2, color: m.accent }}>{i}</div>
            <div><div style={{ fontWeight: 650, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12, color: m.doux }}>{d}</div></div>
          </div>)}
      </Surface>
    </div>
  </>);

  // ── Nouvel ouvrage ──
  if (vue.e === "nouveau") return page(<NouvelOuvrage onAnnuler={() => setVue({ e: "accueil" })} onCreer={async (o, nbChap) => {
    let cree: Oeuvre | null = simul ? { ...o, id: uid(), statut: "brouillon", prive: true, updated_at: new Date().toISOString() } as Oeuvre : await studio.creerOeuvre(o).catch((e: any) => { flash("Refusé : " + e.message); return null; });
    if (!cree) return;
    const ch = Array.from({ length: nbChap }, (_, i) => ({ oeuvre_id: cree!.id, ordre: i + 1, titre: `Chapitre ${i + 1}`, texte: "", statut: "brouillon" }));
    const crees = simul ? ch.map(c => ({ ...c, id: uid(), version: 1 } as Chapitre)) : await Promise.all(ch.map(c => studio.creerChapitre(c))).catch(() => []);
    setOeuvres(l => [cree!, ...l]); setChapitres(l => [...l, ...crees]); flash("Ouvrage créé, privé par défaut."); setVue({ e: "oeuvre", id: cree.id, onglet: "chapitres" });
  }} entete={entete} bandeau={bandeauSimul} />);

  // ── Éditeur de chapitre ──
  if (vue.e === "chapitre") { const c = chapitres.find(x => x.id === vue.id)!; return page(<EditeurChapitre c={c} oeuvre={oeuvre!} simul={simul} entete={entete}
    onRetour={() => setVue({ e: "oeuvre", id: c.oeuvre_id, onglet: "chapitres" })}
    onSauver={async (p) => { const n = simul ? { ...c, ...p, version: p.texte !== undefined && p.texte !== c.texte ? c.version + 1 : c.version } : await studio.majChapitre(c.id, p).catch(() => null); if (n) setChapitres(l => l.map(x => x.id === c.id ? n : x)); return !!n; }}
    onDemandeIA={async (g) => { const r = simul ? { id: uid(), ...g, statut: "en_attente" } : await studio.demanderGeneration(g).catch((e: any) => { flash("Refusé : " + e.message); return null; }); if (r) { setAnnexes(a => ({ ...a, ss_generations: [r, ...a.ss_generations] })); flash(`Demande ajoutée à la file (coût estimé ${eur(g.cout_estime_centimes / 100)}). Elle attend votre approbation.`); } }} />); }

  // ── Ouvrage ──
  if (!oeuvre) return page(<div style={{ padding: 20 }}>Ouvrage introuvable.</div>);
  const onglet = (vue as any).onglet as string;
  const ch = chapsDe(oeuvre.id); const motsTotal = ch.reduce((s, c) => s + motsDe(c.texte), 0);
  const cible = MOTS_LONGUEUR[oeuvre.parametres?.longueur] || 40000;
  const pers = annexes.ss_personnages.filter(p => p.oeuvre_id === oeuvre.id); const chrono = annexes.ss_chronologie.filter(p => p.oeuvre_id === oeuvre.id); const extraits = annexes.ss_extraits.filter(p => p.oeuvre_id === oeuvre.id);
  const ONGLETS = [["chapitres", "Chapitres"], ["personnages", "Personnages"], ["chronologie", "Chronologie"], ["memoire", "Mémoire"], ["extraits", "Extraits"], ["audio", "Audio"], ["commerce", "Vente"]];
  return page(<>
    {entete(oeuvre.titre, () => setVue({ e: "accueil" }), `${OPTIONS.type.find(t => t[0] === oeuvre.type)?.[1]} · ${oeuvre.prive ? "🔒 Privé" : "Visible"}`)}
    {bandeauSimul}
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 16px 4px", scrollbarWidth: "none" }}>
      {ONGLETS.map(([k, l]) => <button key={k} onClick={() => setVue({ e: "oeuvre", id: oeuvre.id, onglet: k })} style={{ flex: "none", minHeight: 36, padding: "7px 13px", borderRadius: 999, border: `1px solid ${onglet === k ? m.accent : m.ligne}`, background: onglet === k ? m.accent : "transparent", color: onglet === k ? m.accentTexte : m.texte, fontWeight: 700, fontSize: 13, fontFamily: m.sans }}>{l}</button>)}
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {onglet === "chapitres" && <>
        <Surface m={m}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: m.doux }}><span>{motsTotal.toLocaleString("fr-FR")} / {cible.toLocaleString("fr-FR")} mots</span><span>{ch.filter(c => c.statut === "valide").length}/{ch.length} validés</span></div>
          <div style={{ height: 6, borderRadius: 9, background: m.surface2, marginTop: 8, overflow: "hidden" }}><div style={{ width: `${Math.min(100, motsTotal / cible * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${ROSE}, ${m.accent})` }} /></div>
        </Surface>
        <Surface m={m} style={{ padding: "6px 16px" }}>
          {ch.map(c => { const [l, ton] = STATUTS[c.statut] || [c.statut, "neutre"]; return (
            <div key={c.id} onClick={() => setVue({ e: "chapitre", id: c.id })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderTop: c.ordre > 1 ? `1px solid ${m.ligne}` : "none", cursor: "pointer" }}>
              <div style={{ fontFamily: m.serif, fontSize: 20, color: m.accent, width: 26 }}>{c.ordre}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 650, fontSize: 14.5 }}>{c.titre || `Chapitre ${c.ordre}`}</div><div style={{ fontSize: 12, color: m.doux }}>{motsDe(c.texte).toLocaleString("fr-FR")} mots · version {c.version}</div></div>
              <Puce m={m} ton={ton}>{l}</Puce>
            </div>); })}
        </Surface>
        <Bouton m={m} variante="contour" onClick={async () => { const n = { oeuvre_id: oeuvre.id, ordre: (ch.at(-1)?.ordre || 0) + 1, titre: `Chapitre ${(ch.at(-1)?.ordre || 0) + 1}`, texte: "", statut: "brouillon" }; const c = simul ? { ...n, id: uid(), version: 1 } as Chapitre : await studio.creerChapitre(n).catch(() => null); if (c) setChapitres(l => [...l, c]); }}>＋ Ajouter un chapitre</Bouton>
      </>}

      {onglet === "personnages" && <ListeAnnexe titre="Personnages et relations" lignes={pers} vide="Aucun personnage."
        rendu={p => <><div style={{ fontFamily: m.serif, fontSize: 18, fontWeight: 600 }}>{p.nom} <span style={{ fontFamily: m.sans, fontSize: 12, color: m.accent }}>{p.role}</span></div><div style={{ fontSize: 13, color: m.doux, marginTop: 3 }}>{p.description}</div>{p.presentation_publique && <div style={{ fontSize: 11.5, color: ROSE, marginTop: 4 }}>Présentation publique prête</div>}</>}
        champs={[["nom", "Nom"], ["role", "Rôle (héroïne, héros, rival…)"], ["description", "Description privée", true], ["presentation_publique", "Présentation publique (découverte gratuite)", true]]}
        onAjouter={v => ajouterAnnexe("ss_personnages", { oeuvre_id: oeuvre.id, ...v, ordre: pers.length })} />}

      {onglet === "chronologie" && <ListeAnnexe titre="Intrigue et chronologie" lignes={chrono} vide="Aucun événement."
        rendu={e => <><div style={{ fontSize: 12, color: m.accent, fontWeight: 700 }}>{e.moment || "—"}{e.lieu ? ` · ${e.lieu}` : ""}</div><div style={{ fontSize: 14, marginTop: 2 }}>{e.evenement}</div></>}
        champs={[["moment", "Moment (ex. Chapitre 3, été 1998)"], ["evenement", "Événement", true], ["lieu", "Lieu"]]}
        onAjouter={v => ajouterAnnexe("ss_chronologie", { oeuvre_id: oeuvre.id, ...v, ordre: chrono.length })} />}

      {onglet === "memoire" && <Memoire oeuvre={oeuvre} pers={pers} chrono={chrono} onSauver={async memoire => { const n = simul ? { ...oeuvre, memoire } : await studio.majOeuvre(oeuvre.id, { memoire } as any).catch(() => null); if (n) { setOeuvres(l => l.map(o => o.id === oeuvre.id ? { ...o, ...n } : o)); flash("Mémoire narrative enregistrée."); } }} />}

      {onglet === "extraits" && <Extraits ch={ch} extraits={extraits} onAjouter={v => ajouterAnnexe("ss_extraits", { oeuvre_id: oeuvre.id, ...v })} />}

      {onglet === "audio" && <Audio ch={ch} pers={pers} onDemande={async g => { const r = simul ? { id: uid(), ...g, statut: "en_attente" } : await studio.demanderGeneration({ ...g, oeuvre_id: oeuvre.id }).catch((e: any) => { flash("Refusé : " + e.message); return null; }); if (r) flash(`Narration ajoutée à la file : ${eur(g.cout_estime_centimes / 100)} estimés, en attente de votre approbation.`); }} />}

      {onglet === "commerce" && <Commerce oeuvre={oeuvre} />}
    </div>
  </>);
}

// ── Création d'un ouvrage ──────────────────────────────────
function NouvelOuvrage({ onAnnuler, onCreer, entete, bandeau }: { onAnnuler: () => void; onCreer: (o: Partial<Oeuvre>, nbChap: number) => void; entete: any; bandeau: any }) {
  const [f, setF] = useState<any>({ titre: "", type: "roman", origine: "idee", genre: OPTIONS.genre[0], ambiance: "Glamour", pov: "Points de vue alternés", longueur: "court", style: "Poétique et sensoriel", nb: 12, depart: "", avert: ["Public adulte", "Scènes sensuelles suggérées"] });
  const s = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const libDepart = { idee: "Votre idée en quelques lignes", synopsis: "Synopsis", import: "Document importé (texte collé ou fichier)", manuscrit: "Manuscrit existant (texte collé)" }[f.origine as string];
  return <>
    {entete("Nouvel ouvrage", onAnnuler)}
    {bandeau}
    <div style={{ padding: 16 }}>
      <div style={etiquette}>Titre provisoire</div><input style={champ} value={f.titre} onChange={e => s("titre")(e.target.value)} placeholder="Titre de travail" />
      <div style={etiquette}>Format</div><Choix valeur={f.type} options={OPTIONS.type} onChange={s("type")} />
      <div style={etiquette}>Je pars de</div><Choix valeur={f.origine} options={OPTIONS.origine} onChange={s("origine")} />
      <div style={etiquette}>{libDepart}</div><textarea style={{ ...champ, minHeight: 92 }} value={f.depart} onChange={e => s("depart")(e.target.value)} />
      <div style={etiquette}>Genre</div><Choix valeur={f.genre} options={OPTIONS.genre} onChange={s("genre")} />
      <div style={etiquette}>Ambiance</div><Choix valeur={f.ambiance} options={OPTIONS.ambiance} onChange={s("ambiance")} />
      <div style={etiquette}>Point de vue</div><Choix valeur={f.pov} options={OPTIONS.pov} onChange={s("pov")} />
      <div style={etiquette}>Longueur</div><Choix valeur={f.longueur} options={OPTIONS.longueur} onChange={s("longueur")} />
      <div style={etiquette}>Nombre de chapitres : {f.nb}</div><input type="range" min={1} max={40} value={f.nb} onChange={e => s("nb")(Number(e.target.value))} style={{ width: "100%", accentColor: m.accent }} />
      <div style={etiquette}>Style littéraire</div><Choix valeur={f.style} options={OPTIONS.style} onChange={s("style")} />
      <div style={etiquette}>Avertissements de contenu</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{AVERTISSEMENTS.map(a => { const on = f.avert.includes(a); return <button key={a} onClick={() => s("avert")(on ? f.avert.filter((x: string) => x !== a) : [...f.avert, a])} style={{ minHeight: 34, padding: "6px 11px", borderRadius: 999, border: `1px solid ${on ? ROSE : m.ligne}`, background: on ? `${ROSE}22` : "transparent", color: on ? ROSE : m.doux, fontSize: 12.5, fontFamily: m.sans }}>{on ? "✓ " : ""}{a}</button>; })}</div>
      <div style={{ margin: "16px 0", padding: 12, borderRadius: 12, background: m.surface2, fontSize: 12.5, color: m.doux, lineHeight: 1.45 }}>
        Public adulte uniquement. Ligne éditoriale : romance sensuelle et glamour, <b style={{ color: m.texte }}>non graphique</b> (scènes intimes suggérées), conforme aux conditions des fournisseurs IA et voix. L'ouvrage reste privé jusqu'à votre publication.
      </div>
      <Bouton m={m} disabled={!f.titre.trim()} style={{ width: "100%" }} onClick={() => onCreer({ titre: f.titre.trim(), type: f.type, origine: f.origine, synopsis: f.origine === "synopsis" ? f.depart : null, avertissements: f.avert,
        parametres: { genre: f.genre, ambiance: f.ambiance, point_de_vue: f.pov, longueur: f.longueur, nb_chapitres: f.nb, style: f.style, depart: f.origine === "synopsis" ? undefined : f.depart || undefined } }, f.nb)}>Créer l'ouvrage (privé)</Bouton>
    </div>
  </>;
}

// ── Éditeur de chapitre : sauvegarde automatique + versions ──
function EditeurChapitre({ c, oeuvre, simul, entete, onRetour, onSauver, onDemandeIA }: { c: Chapitre; oeuvre: Oeuvre; simul: boolean; entete: any; onRetour: () => void; onSauver: (p: Partial<Chapitre>) => Promise<boolean>; onDemandeIA: (g: any) => void }) {
  const [texte, setTexte] = useState(c.texte); const [titre, setTitre] = useState(c.titre || "");
  const [etat, setEtat] = useState<"" | "enregistrement" | "enregistre" | "erreur">("");
  const [consigne, setConsigne] = useState(""); const [modele, setModele] = useState<"sonnet" | "opus">("sonnet");
  const t = useRef<any>(null);
  useEffect(() => { if (texte === c.texte && titre === (c.titre || "")) return; clearTimeout(t.current); setEtat("enregistrement");
    t.current = setTimeout(async () => setEtat((await onSauver({ texte, titre })) ? "enregistre" : "erreur"), 1500); return () => clearTimeout(t.current); }, [texte, titre]);
  const mots = motsDe(texte); const motsCible = Math.round((({ nouvelle: 15000, court: 40000, roman: 70000 } as any)[oeuvre.parametres?.longueur] || 40000) / (oeuvre.parametres?.nb_chapitres || 12));
  const est = coutTexte(Math.max(mots, motsCible), 6000 + mots, modele);
  return <>
    {entete(`Chapitre ${c.ordre}`, onRetour, oeuvre.titre)}
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <input style={{ ...champ, fontFamily: m.serif, fontSize: 20 }} value={titre} onChange={e => setTitre(e.target.value)} />
      <textarea style={{ ...champ, minHeight: 300, fontFamily: m.serif, fontSize: 17, lineHeight: 1.6 }} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Écrivez ou collez votre texte. Sauvegarde automatique." />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: m.doux }}>
        <span>{mots.toLocaleString("fr-FR")} mots · objectif ≈ {motsCible.toLocaleString("fr-FR")}</span>
        <span style={{ color: etat === "erreur" ? "#e58" : m.doux }}>{etat === "enregistrement" ? "Enregistrement…" : etat === "enregistre" ? `✓ Enregistré${simul ? " (simulation)" : ""} · v${c.version}` : etat === "erreur" ? "Non enregistré" : `Version ${c.version}`}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {(["brouillon", "a_relire", "valide"] as const).map(s => <Bouton key={s} m={m} variante={c.statut === s ? "plein" : "contour"} style={{ flex: 1, padding: "8px 6px", fontSize: 13 }} onClick={() => onSauver({ statut: s })}>{STATUTS[s][0]}</Bouton>)}
      </div>
      <Surface m={m}>
        <Titre m={m} sur="Atelier IA" niveau={3}>Réécrire, enrichir, corriger</Titre>
        <textarea style={{ ...champ, minHeight: 70 }} value={consigne} onChange={e => setConsigne(e.target.value)} placeholder="Ex. : renforcer la tension, harmoniser avec le chapitre 2, corriger la ponctuation…" />
        <div style={{ marginTop: 8 }}><Choix valeur={modele} options={[["sonnet", "Sonnet 5.5 (économique)"], ["opus", "Opus 5.5 (soigné)"]]} onChange={v => setModele(v as any)} /></div>
        <div style={{ fontSize: 12.5, color: m.doux, margin: "10px 0", lineHeight: 1.45 }}>Coût estimé : <b style={{ color: m.accent }}>{eur(est.eur)}</b> (mémoire de l'ouvrage + chapitre). Le texte actuel est conservé en version ; la proposition de l'IA n'écrase jamais votre texte sans votre validation.</div>
        <Bouton m={m} variante="contour" style={{ width: "100%" }} disabled={!consigne.trim()} onClick={() => onDemandeIA({ type: "reecriture", chapitre_id: c.id, oeuvre_id: c.oeuvre_id, fournisseur: "anthropic", payante: true, cout_estime_centimes: Math.max(1, Math.round(est.eur * 100)), parametres: { consigne, modele } })}>Ajouter à la file (approbation requise)</Bouton>
        {!IA_AUTORISEE && <div style={{ fontSize: 11.5, color: m.doux, marginTop: 8 }}>IA non activée : aucune dépense possible tant que vous ne l'avez pas autorisée et fixé un quota mensuel.</div>}
      </Surface>
    </div>
  </>;
}

// ── Listes annexes (personnages, chronologie) ──────────────
function ListeAnnexe({ titre, lignes, vide, rendu, champs, onAjouter }: { titre: string; lignes: any[]; vide: string; rendu: (l: any) => React.ReactNode; champs: [string, string, boolean?][]; onAjouter: (v: any) => void }) {
  const [v, setV] = useState<any>({}); const [ouvert, setOuvert] = useState(false);
  return <>
    <Surface m={m}>
      <Titre m={m} niveau={3}>{titre}</Titre>
      {lignes.length ? lignes.map(l => <div key={l.id} style={{ padding: "11px 0", borderTop: `1px solid ${m.ligne}` }}>{rendu(l)}</div>) : <div style={{ color: m.doux, fontSize: 13.5 }}>{vide}</div>}
    </Surface>
    {ouvert ? <Surface m={m}>
      {champs.map(([k, l, long]) => <div key={k}><div style={etiquette}>{l}</div>{long ? <textarea style={{ ...champ, minHeight: 70 }} value={v[k] || ""} onChange={e => setV({ ...v, [k]: e.target.value })} /> : <input style={champ} value={v[k] || ""} onChange={e => setV({ ...v, [k]: e.target.value })} />}</div>)}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Bouton m={m} variante="contour" style={{ flex: 1 }} onClick={() => setOuvert(false)}>Annuler</Bouton><Bouton m={m} style={{ flex: 1 }} disabled={!v[champs[0][0]]?.trim() && !v[champs[1][0]]?.trim()} onClick={() => { onAjouter(v); setV({}); setOuvert(false); }}>Ajouter</Bouton></div>
    </Surface> : <Bouton m={m} variante="contour" onClick={() => setOuvert(true)}>＋ Ajouter</Bouton>}
  </>;
}

// ── Mémoire narrative ──────────────────────────────────────
function Memoire({ oeuvre, pers, chrono, onSauver }: { oeuvre: any; pers: any[]; chrono: any[]; onSauver: (m: any) => void }) {
  const [regles, setRegles] = useState<string>(oeuvre.memoire?.regles || ""); const [lieux, setLieux] = useState<string>(oeuvre.memoire?.lieux || "");
  return <Surface m={m}>
    <Titre m={m} sur="Cohérence" niveau={3}>Mémoire de l'ouvrage</Titre>
    <div style={{ fontSize: 12.5, color: m.doux, lineHeight: 1.45 }}>Transmise à chaque demande d'écriture pour garder la cohérence : {pers.length} personnage(s), {chrono.length} événement(s), plus les éléments ci-dessous.</div>
    <div style={etiquette}>Lieux</div><textarea style={{ ...champ, minHeight: 70 }} value={lieux} onChange={e => setLieux(e.target.value)} />
    <div style={etiquette}>Faits établis et règles de l'univers</div><textarea style={{ ...champ, minHeight: 90 }} value={regles} onChange={e => setRegles(e.target.value)} />
    <Bouton m={m} style={{ width: "100%", marginTop: 12 }} onClick={() => onSauver({ ...(oeuvre.memoire || {}), lieux, regles })}>Enregistrer la mémoire</Bouton>
  </Surface>;
}

// ── Extraits gratuits ──────────────────────────────────────
function Extraits({ ch, extraits, onAjouter }: { ch: Chapitre[]; extraits: any[]; onAjouter: (v: any) => void }) {
  const [mode, setMode] = useState("pages"); const [pages, setPages] = useState(5); const [chap, setChap] = useState(ch[0]?.id || ""); const [texte, setTexte] = useState(""); const [duree, setDuree] = useState(180);
  const MOTS_PAGE = 250;
  const apercu = mode === "pages" ? ch.map(c => c.texte).join("\n\n").split(/\s+/).slice(0, pages * MOTS_PAGE).join(" ") : mode === "chapitre" ? ch.find(c => c.id === chap)?.texte || "" : texte;
  return <>
    <Surface m={m}>
      <Titre m={m} sur="Découverte gratuite" niveau={3}>Passages offerts</Titre>
      <div style={{ fontSize: 12.5, color: m.doux, lineHeight: 1.45, marginBottom: 6 }}>Chaque extrait est une <b style={{ color: m.texte }}>copie séparée</b> du passage choisi : il ne donne jamais accès au fichier intégral. L'extrait audio est un fichier distinct.</div>
      <Choix valeur={mode} options={[["pages", "Nombre de pages"], ["chapitre", "Chapitre choisi"], ["duree_audio", "Durée audio"], ["personnalise", "Passage personnalisé"]]} onChange={setMode} />
      {mode === "pages" && <><div style={etiquette}>{pages} page(s) ≈ {pages * MOTS_PAGE} mots</div><input type="range" min={1} max={30} value={pages} onChange={e => setPages(Number(e.target.value))} style={{ width: "100%", accentColor: m.accent }} /></>}
      {mode === "chapitre" && <><div style={etiquette}>Chapitre</div><select style={champ} value={chap} onChange={e => setChap(e.target.value)}>{ch.map(c => <option key={c.id} value={c.id}>{c.ordre}. {c.titre}</option>)}</select></>}
      {mode === "duree_audio" && <><div style={etiquette}>Durée : {Math.floor(duree / 60)} min {duree % 60 ? `${duree % 60} s` : ""}</div><input type="range" min={30} max={900} step={30} value={duree} onChange={e => setDuree(Number(e.target.value))} style={{ width: "100%", accentColor: m.accent }} /><div style={{ fontSize: 12, color: m.doux, marginTop: 6 }}>Le fichier d'extrait sera découpé et enregistré à part lors de la production audio.</div></>}
      {mode === "personnalise" && <><div style={etiquette}>Passage</div><textarea style={{ ...champ, minHeight: 110 }} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Collez précisément le passage à offrir" /></>}
      {mode !== "duree_audio" && <div style={{ marginTop: 10, maxHeight: 120, overflow: "hidden", fontFamily: m.serif, fontSize: 14, color: m.doux, borderLeft: `2px solid ${ROSE}`, paddingLeft: 10 }}>{apercu.slice(0, 400) || "Aperçu de l'extrait"}{apercu.length > 400 ? "…" : ""}</div>}
      <Bouton m={m} style={{ width: "100%", marginTop: 12 }} disabled={mode !== "duree_audio" && !apercu.trim()} onClick={() => onAjouter(mode === "duree_audio" ? { type: "audio", mode, reglage: { duree_s: duree }, audio_chemin: `extraits/a-produire-${Date.now()}.mp3` } : { type: "texte", mode, reglage: mode === "pages" ? { pages } : mode === "chapitre" ? { chapitre_id: chap } : {}, texte: apercu })}>Enregistrer l'extrait (brouillon)</Bouton>
    </Surface>
    {!!extraits.length && <Surface m={m}><Titre m={m} niveau={3}>Extraits enregistrés</Titre>{extraits.map(e => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 13.5 }}><span>{e.type === "audio" ? "🎧 Audio" : "📖 Texte"} · {e.mode}</span><Puce m={m} ton={e.statut === "publie" ? "ok" : "neutre"}>{e.statut === "publie" ? "Publié" : "Brouillon"}</Puce></div>)}</Surface>}
  </>;
}

// ── Studio audio ───────────────────────────────────────────
function Audio({ ch, pers, onDemande }: { ch: Chapitre[]; pers: any[]; onDemande: (g: any) => void }) {
  const [narration, setNarration] = useState("alternee"); const [emotion, setEmotion] = useState("Intime"); const [rythme, setRythme] = useState(1); const [modele, setModele] = useState<"multilingue" | "flash">("multilingue");
  const [ambiance, setAmbiance] = useState("Aucune"); const [pron, setPron] = useState(""); const [choix, setChoix] = useState<string[]>(ch.slice(0, 1).map(c => c.id));
  const car = ch.filter(c => choix.includes(c.id)).reduce((s, c) => s + c.texte.length, 0); const carTotal = ch.reduce((s, c) => s + c.texte.length, 0);
  const est = coutVoix(car, modele); const estTotal = coutVoix(carTotal, modele); const minutes = Math.round(motsDe(ch.filter(c => choix.includes(c.id)).map(c => c.texte).join(" ")) / 150);
  return <>
    <Surface m={m}>
      <Titre m={m} sur="Narration" niveau={3}>Studio audio</Titre>
      <div style={etiquette}>Voix de narration</div><Choix valeur={narration} options={[["feminine", "Féminine"], ["masculine", "Masculine"], ["alternee", "Alternée (selon le point de vue)"]]} onChange={setNarration} />
      <div style={etiquette}>Émotion dominante</div><Choix valeur={emotion} options={["Intime", "Passionnée", "Mystérieuse", "Tendre", "Tendue"]} onChange={setEmotion} />
      <div style={etiquette}>Rythme : × {rythme.toFixed(2)}</div><input type="range" min={0.8} max={1.2} step={0.05} value={rythme} onChange={e => setRythme(Number(e.target.value))} style={{ width: "100%", accentColor: m.accent }} />
      <div style={etiquette}>Ambiance sonore (bibliothèque autorisée)</div><Choix valeur={ambiance} options={["Aucune", "Pluie douce", "Soirée feutrée", "Bord de mer", "Piano lointain"]} onChange={setAmbiance} />
      <div style={etiquette}>Prononciations et pauses</div><textarea style={{ ...champ, minHeight: 60 }} value={pron} onChange={e => setPron(e.target.value)} placeholder="Ex. : Hélios = é-li-oss ; pause longue après chaque scène" />
      <div style={etiquette}>Voix des personnages</div>
      {pers.length ? pers.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 13.5 }}><span>{p.nom}</span><span style={{ color: m.doux, fontSize: 12 }}>{p.voix?.nom || "Voix synthétique à choisir"}</span></div>) : <div style={{ fontSize: 12.5, color: m.doux }}>Ajoutez des personnages pour leur attribuer une voix.</div>}
      <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: m.surface2, fontSize: 12, color: m.doux, lineHeight: 1.45 }}>Uniquement des voix synthétiques de bibliothèque ou conçues pour Bellaïa. Aucune voix réelle n'est clonée sans autorisation écrite enregistrée (refusé par la base sinon).</div>
    </Surface>
    <Surface m={m}>
      <Titre m={m} sur="Production" niveau={3}>Génération par chapitre</Titre>
      {ch.map(c => { const on = choix.includes(c.id); return <div key={c.id} onClick={() => setChoix(on ? choix.filter(x => x !== c.id) : [...choix, c.id])} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer", fontSize: 13.5 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${on ? m.accent : m.ligne}`, background: on ? m.accent : "transparent", color: m.accentTexte, display: "grid", placeItems: "center", fontSize: 13 }}>{on ? "✓" : ""}</span>
        <span style={{ flex: 1 }}>{c.ordre}. {c.titre}</span><span style={{ color: m.doux, fontSize: 12 }}>{c.texte.length.toLocaleString("fr-FR")} car.</span></div>; })}
      <div style={{ marginTop: 10 }}><Choix valeur={modele} options={[["multilingue", "Qualité (multilingue)"], ["flash", "Rapide (Flash)"]]} onChange={v => setModele(v as any)} /></div>
      <div style={{ fontSize: 13, margin: "12px 0", lineHeight: 1.5 }}>Sélection : <b style={{ color: m.accent }}>{eur(est.eur)}</b> estimés · ≈ {minutes} min d'écoute<br /><span style={{ color: m.doux, fontSize: 12 }}>Livre audio complet : {eur(estTotal.eur)} estimés ({carTotal.toLocaleString("fr-FR")} caractères). Préécoute obligatoire avant validation.</span></div>
      <Bouton m={m} style={{ width: "100%" }} disabled={!car} onClick={() => onDemande({ type: "audio", fournisseur: "elevenlabs", payante: true, cout_estime_centimes: Math.max(1, Math.round(est.eur * 100)), parametres: { narration, emotion, rythme, ambiance, prononciations: pron, chapitres: choix, modele } })}>Ajouter à la file (approbation requise)</Bouton>
      <div style={{ fontSize: 11.5, color: m.doux, marginTop: 8 }}>Assemblage du livre complet et export par chapitre après validation de chaque préécoute.</div>
    </Surface>
  </>;
}

// ── Commercialisation (brouillons) ─────────────────────────
function Commerce({ oeuvre }: { oeuvre: Oeuvre }) {
  const [prix, setPrix] = useState<Record<string, string>>({ ebook: "", audio: "", pack: "" });
  return <Surface m={m}>
    <Titre m={m} sur="Brouillon" niveau={3}>Formats et prix</Titre>
    <div style={{ fontSize: 12.5, color: m.doux, lineHeight: 1.45, marginBottom: 8 }}>Toutes les propositions restent en brouillon. Aucun paiement ni abonnement n'est actif tant que vous ne les avez pas validés et qu'un prestataire acceptant cette activité n'est pas confirmé.</div>
    {[["ebook", "Livre numérique"], ["audio", "Livre audio"], ["pack", "Pack numérique + audio"]].map(([k, l]) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${m.ligne}` }}>
      <span style={{ flex: 1, fontSize: 14 }}>{l}</span>
      <input inputMode="decimal" placeholder="Prix proposé" value={prix[k]} onChange={e => setPrix({ ...prix, [k]: e.target.value })} style={{ ...champ, width: 120, textAlign: "right" }} /><span style={{ color: m.doux }}>€</span>
    </div>)}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><Puce m={m}>Inclus dans l'abonnement : à décider</Puce><Puce m={m}>Accès anticipé abonnés : non</Puce><Puce m={m} ton="alerte">Publication : par vous uniquement</Puce></div>
  </Surface>;
}
