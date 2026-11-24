// ═══════════════════════════════════════════════════════════
// BSH Private Club : moteur narratif réutilisable (règles pures, sans réseau).
//
// Le même moteur tourne sur l'appareil (mode local, un seul appareil) et, une fois
// la migration 0144 appliquée, il sert à valider les actions avant leur écriture.
// Le serveur garde le dernier mot : les permissions, les votes et l'accès des adultes
// sont aussi contrôlés en base (RLS et fonctions de 0144).
//
// Ce que le moteur permet :
//  • des scénarios en plusieurs actes, avec embranchements et fins alternatives ;
//  • des épreuves (choix d'un personnage, réponse libre sous contraintes, choix d'un
//    objet, décision, choix d'une réplique), individuelles ou collectives ;
//  • des cartes d'événement, des indices et un chronomètre facultatif ;
//  • des votes protégés (un seul vote par distinction, aucun vote pour soi-même,
//    votants et cibles uniquement parmi les participants admis) et des scores ;
//  • la sauvegarde (JSON versionné), la reprise après une déconnexion, la pause ;
//  • l'import de scénarios (JSON, Markdown, texte) et leur duplication.
// Le consentement est une règle du moteur : passer une épreuve ou refuser une
// proposition ne fait jamais perdre de points et n'est jamais bloquant.
// ═══════════════════════════════════════════════════════════

export type StatutPublication = "brouillon" | "en_revision" | "publie" | "archive";
export type Role = "fondatrice" | "hote" | "joueur";

export type Contraintes = {
  motsInterdits?: string[];
  maxPhrases?: number;
  minCaracteres?: number;
  maxCaracteres?: number;
};

export type Option = { id: string; libelle: string; description?: string };

export type Epreuve =
  | { type: "choix_personnage"; options: Option[]; presentation: Contraintes; personnagesUniques?: boolean }
  | { type: "reponse_libre"; consigne: string; contraintes: Contraintes }
  | { type: "choix_objet"; consigne: string; options: Option[]; contraintes: Contraintes }
  | { type: "decision"; consigne: string; options: Option[]; texteFacultatif?: Contraintes }
  | { type: "choix_replique"; consigne: string; options: Option[]; contraintes: Contraintes };

/** Embranchement : si la majorité (ou un joueur, en solo) a fait `choix` à l'acte `acte`, aller à `aller`. */
export type Embranchement = { si: { acte: string; choix: string }; aller: string };

export type CarteEvenement = { id: string; titre: string; texte: string };

export type Acte = {
  id: string;
  numero: number;
  titre: string;
  decor?: string;
  situation: string;
  replique?: string;
  epreuve: Epreuve;
  collectif?: boolean;
  chronoSecondes?: number;
  indices?: string[];
  evenements?: CarteEvenement[];
  suivant?: string;
  embranchements?: Embranchement[];
  fin?: boolean;
  /** Points de participation (identiques que l'on réponde, refuse ou décline une proposition). */
  points?: number;
};

export type Distinction = { id: string; nom: string; badge: string; description?: string };

export type Scenario = {
  id: string;
  version: number;
  titre: string;
  univers: string;
  illustration?: string;
  intensite: number;          // 1 à 6 piments
  dureeMinutes: [number, number];
  participants: { min: number; max: number };
  regles: string[];
  actes: Acte[];
  distinctions: Distinction[];
  statut: StatutPublication;
  origine?: "manuel" | "import" | "ia";
  validePar?: string | null;
};

export type Reponse = { choix?: string; texte?: string; personnage?: string; pseudo?: string; passe?: boolean; masquee?: boolean; quand: string };

export type Joueur = { id: string; pseudo: string; role: Role; personnage?: string; present: boolean; exclu?: boolean; derniereVue: string };

export type StatutSession = "attente" | "en_cours" | "pause" | "votes" | "terminee";

export type EtatSession = {
  format: "bsh-club-session";
  versionFormat: 1;
  scenarioId: string;
  scenarioVersion: number;
  statut: StatutSession;
  statutAvantPause?: StatutSession;
  pauseDepuis?: string;
  acteCourant: string | null;
  parcours: string[];
  debutActe: string | null;
  joueurs: Record<string, Joueur>;
  reponses: Record<string, Record<string, Reponse>>;
  votes: Record<string, Record<string, string>>;
  votesOuverts: boolean;
  indicesEnvoyes: Record<string, number>;
  evenementsTires: string[];
  titres: Record<string, string[]>;
  fin: string | null;
  journal: { quand: string; type: string; par?: string; detail?: string }[];
};

export type Action =
  | { type: "rejoindre"; joueur: { id: string; pseudo: string; role: Role } }
  | { type: "quitter"; par: string }
  | { type: "deconnexion"; par: string }
  | { type: "reconnexion"; par: string }
  | { type: "lancer"; par: string }
  | { type: "acte_suivant"; par: string }
  | { type: "pause"; par: string }
  | { type: "reprendre"; par: string }
  | { type: "indice"; par: string }
  | { type: "evenement"; par: string }
  | { type: "repondre"; par: string; reponse: Omit<Reponse, "quand"> }
  | { type: "passer"; par: string }
  | { type: "moderer"; par: string; joueur: string; acte: string }
  | { type: "exclure"; par: string; joueur: string; motif: string }
  | { type: "ouvrir_votes"; par: string }
  | { type: "voter"; par: string; distinction: string; cible: string }
  | { type: "fermer_votes"; par: string }
  | { type: "attribuer_titre"; par: string; distinction: string; joueur: string }
  | { type: "terminer"; par: string };

export type Resultat = { ok: true; etat: EtatSession } | { ok: false; erreur: string };

// ── Texte : normalisation, mots interdits, phrases ───────────────────────────
export function normaliser(t: string): string {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

/** Variantes au pluriel et au féminin d'un mot interdit (beau → beaux, belle → belles, attirant → attirants…). */
function variantes(mot: string): string[] {
  const m = normaliser(mot);
  const v = new Set([m, m + "s"]);
  if (m.endsWith("au")) v.add(m + "x");
  return [...v];
}

export function motsInterditsTrouves(texte: string, interdits: string[] = []): string[] {
  const mots = normaliser(texte).split(/[^a-z0-9]+/).filter(Boolean);
  const trouves: string[] = [];
  for (const i of interdits) if (variantes(i).some(v => mots.includes(v))) trouves.push(i);
  return trouves;
}

/** Nombre de phrases : séparées par . ! ? ou … (les points de suspension comptent une fois). */
export function nombrePhrases(texte: string): number {
  const t = String(texte || "").replace(/\.{2,}|…/g, "…").trim();
  if (!t) return 0;
  return t.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s)).length;
}

export function controlerTexte(texte: string, c: Contraintes = {}): string[] {
  const e: string[] = [];
  const t = String(texte || "").trim();
  if (c.minCaracteres && t.length < c.minCaracteres) e.push(`Au moins ${c.minCaracteres} caractères.`);
  if (c.maxCaracteres && t.length > c.maxCaracteres) e.push(`${c.maxCaracteres} caractères au maximum.`);
  if (c.maxPhrases && nombrePhrases(t) > c.maxPhrases) e.push(`${c.maxPhrases} phrase${c.maxPhrases > 1 ? "s" : ""} au maximum.`);
  const mi = motsInterditsTrouves(t, c.motsInterdits);
  if (mi.length) e.push(`Mot${mi.length > 1 ? "s" : ""} à éviter : ${mi.join(", ")}.`);
  return e;
}

/** Erreurs d'une réponse à une épreuve (liste vide = réponse recevable). */
export function controlerReponse(ep: Epreuve, r: Omit<Reponse, "quand">, dejaPris: string[] = []): string[] {
  if (r.passe) return [];
  const optionValide = (opts: Option[], id?: string) => !!id && opts.some(o => o.id === id);
  switch (ep.type) {
    case "choix_personnage": {
      const e: string[] = [];
      if (!r.pseudo || !r.pseudo.trim()) e.push("Choisissez un pseudonyme.");
      else if (r.pseudo.trim().length > 30) e.push("Pseudonyme : 30 caractères au maximum.");
      if (!optionValide(ep.options, r.personnage)) e.push("Choisissez un personnage.");
      else if (ep.personnagesUniques && dejaPris.includes(r.personnage!)) e.push("Ce personnage est déjà pris.");
      return e.concat(controlerTexte(r.texte || "", ep.presentation));
    }
    case "reponse_libre":
      return controlerTexte(r.texte || "", ep.contraintes);
    case "choix_objet":
    case "choix_replique": {
      const e = optionValide(ep.options, r.choix) ? [] : [ep.type === "choix_objet" ? "Choisissez un objet." : "Choisissez une réplique."];
      return e.concat(controlerTexte(r.texte || "", ep.contraintes));
    }
    case "decision": {
      const e = optionValide(ep.options, r.choix) ? [] : ["Choisissez votre décision."];
      return e.concat(r.texte ? controlerTexte(r.texte, ep.texteFacultatif) : []);
    }
  }
}

// ── Scénario : contrôle, import, duplication ─────────────────────────────────
export function controlerScenario(s: Scenario): string[] {
  const e: string[] = [];
  if (!s.titre?.trim()) e.push("Titre manquant.");
  if (!(s.intensite >= 1 && s.intensite <= 6)) e.push("Intensité : de 1 à 6 piments.");
  if (!s.actes?.length) e.push("Au moins un acte.");
  const ids = new Set<string>();
  for (const a of s.actes || []) { if (ids.has(a.id)) e.push(`Acte en double : ${a.id}.`); ids.add(a.id); }
  for (const a of s.actes || []) {
    for (const cible of [a.suivant, ...(a.embranchements || []).map(b => b.aller)]) if (cible && !ids.has(cible)) e.push(`L'acte ${a.id} renvoie vers un acte inconnu : ${cible}.`);
    for (const b of a.embranchements || []) if (!ids.has(b.si.acte)) e.push(`Embranchement de ${a.id} : acte de condition inconnu ${b.si.acte}.`);
    const ep = a.epreuve as Epreuve | undefined;
    if (!ep) e.push(`L'acte ${a.id} n'a pas d'épreuve.`);
    else if ("options" in ep && !ep.options?.length) e.push(`L'acte ${a.id} n'a aucune option.`);
  }
  if (s.participants && s.participants.min > s.participants.max) e.push("Participants : minimum supérieur au maximum.");
  const dist = new Set<string>();
  for (const d of s.distinctions || []) { if (dist.has(d.id)) e.push(`Distinction en double : ${d.id}.`); dist.add(d.id); }
  if (s.statut === "publie" && !s.validePar) e.push("Publication impossible sans validation humaine.");
  return e;
}

/** Copie modifiable : nouvel identifiant, version 1, retour au brouillon, validation effacée. */
export function dupliquer(s: Scenario, nouvelId: string): Scenario {
  const c: Scenario = JSON.parse(JSON.stringify(s));
  return { ...c, id: nouvelId, version: 1, titre: `${s.titre} (copie)`, statut: "brouillon", validePar: null, origine: "manuel" };
}

/** Passage en publication : seulement après validation par une personne (jamais automatiquement). */
export function publier(s: Scenario, validePar: string | null): { ok: true; scenario: Scenario } | { ok: false; erreurs: string[] } {
  if (!validePar) return { ok: false, erreurs: ["Une validation humaine est obligatoire avant publication."] };
  const p = { ...s, statut: "publie" as const, validePar };
  const e = controlerScenario(p);
  return e.length ? { ok: false, erreurs: e } : { ok: true, scenario: p };
}

const ROMAINS: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/**
 * Import d'un scénario. JSON : objet Scenario. Markdown ou texte :
 *   # Titre
 *   Univers : …  ·  Intensité : 4  ·  Durée : 60-90  ·  Participants : 2-12
 *   ## Acte I — Titre
 *   Situation : …        (ou un paragraphe libre)
 *   > « Réplique »
 *   Consigne : …
 *   - Option 1           (liste à puces : options de choix)
 *   Interdits : mot1, mot2   ·   Phrases max : 3
 * Le résultat est toujours un brouillon (origine « import ») à relire avant publication.
 */
export function importerScenario(texte: string, id: string): { ok: true; scenario: Scenario; avertissements: string[] } | { ok: false; erreurs: string[] } {
  const brut = String(texte || "").replace(/^﻿/, "").trim();
  if (!brut) return { ok: false, erreurs: ["Fichier vide."] };
  let s: Scenario;
  const avert: string[] = [];
  if (brut.startsWith("{")) {
    try { s = JSON.parse(brut); } catch { return { ok: false, erreurs: ["JSON illisible."] }; }
    s = { ...s, id, statut: "brouillon", validePar: null, origine: "import", version: s.version || 1, actes: s.actes || [], distinctions: s.distinctions || [], regles: s.regles || [] };
  } else {
    const lignes = brut.split(/\r?\n/);
    s = { id, version: 1, titre: "", univers: "the_red_room", intensite: 1, dureeMinutes: [30, 60], participants: { min: 1, max: 12 }, regles: [], actes: [], distinctions: [], statut: "brouillon", origine: "import", validePar: null };
    let acte: Acte | null = null; let opts: Option[] = []; let consigne = ""; let contraintes: Contraintes = {};
    const clore = () => {
      if (!acte) return;
      acte.epreuve = opts.length
        ? { type: "choix_replique", consigne: consigne || "Choisissez puis répondez.", options: opts, contraintes }
        : { type: "reponse_libre", consigne: consigne || "Répondez librement.", contraintes };
      s.actes.push(acte); acte = null; opts = []; consigne = ""; contraintes = {};
    };
    for (const l0 of lignes) {
      const l = l0.trim();
      if (!l) continue;
      let m: RegExpMatchArray | null;
      if ((m = l.match(/^#\s+(.+)/)) && !l.startsWith("##")) { s.titre = m[1].trim(); continue; }
      if ((m = l.match(/^##\s*(?:acte\s+)?([ivx]+|\d+)?\s*[—–:-]?\s*(.*)$/i))) {
        clore();
        const n = m[1] ? (ROMAINS[m[1].toLowerCase()] || parseInt(m[1], 10) || s.actes.length + 1) : s.actes.length + 1;
        acte = { id: `acte_${s.actes.length + 1}`, numero: n, titre: (m[2] || `Acte ${n}`).trim(), situation: "", epreuve: { type: "reponse_libre", consigne: "", contraintes: {} }, points: 10 };
        continue;
      }
      if (!acte) {
        if ((m = l.match(/univers\s*:\s*([^·|]+)/i))) s.univers = m[1].trim().toLowerCase().replace(/\s+/g, "_");
        if ((m = l.match(/intensit[ée]\s*:\s*(\d)/i))) s.intensite = Math.min(6, Math.max(1, parseInt(m[1], 10)));
        if ((m = l.match(/dur[ée]e\s*:\s*(\d+)\s*[-à]\s*(\d+)/i))) s.dureeMinutes = [parseInt(m[1], 10), parseInt(m[2], 10)];
        if ((m = l.match(/participants\s*:\s*(\d+)\s*[-à]\s*(\d+)/i))) s.participants = { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
        if ((m = l.match(/^[-*]\s+(.+)/))) s.regles.push(m[1].trim());
        continue;
      }
      if ((m = l.match(/^>\s*(.+)/))) { acte.replique = m[1].replace(/^[«"]\s*|\s*[»"]$/g, "").trim(); continue; }
      if ((m = l.match(/^situation\s*:\s*(.+)/i))) { acte.situation = m[1].trim(); continue; }
      if ((m = l.match(/^consigne\s*:\s*(.+)/i))) { consigne = m[1].trim(); continue; }
      if ((m = l.match(/^interdits?\s*:\s*(.+)/i))) { contraintes.motsInterdits = m[1].split(/[,;]/).map(x => x.trim()).filter(Boolean); continue; }
      if ((m = l.match(/^phrases?\s*max\w*\s*:\s*(\d+)/i))) { contraintes.maxPhrases = parseInt(m[1], 10); continue; }
      if ((m = l.match(/^[-*]\s+(.+)/))) { opts.push({ id: `o${opts.length + 1}`, libelle: m[1].replace(/^[«"]\s*|\s*[»"]$/g, "").trim() }); continue; }
      acte.situation = acte.situation ? `${acte.situation} ${l}` : l;
    }
    clore();
    for (let i = 0; i < s.actes.length - 1; i++) s.actes[i].suivant = s.actes[i + 1].id;
    if (s.actes.length) s.actes[s.actes.length - 1].fin = true;
    if (!s.titre) avert.push("Aucun titre (# Titre) : à compléter.");
  }
  const e = controlerScenario(s);
  return e.length ? { ok: false, erreurs: e } : { ok: true, scenario: s, avertissements: avert };
}

// ── Session : création, actions, sauvegarde ──────────────────────────────────
export function nouvelleSession(s: Scenario): EtatSession {
  return { format: "bsh-club-session", versionFormat: 1, scenarioId: s.id, scenarioVersion: s.version, statut: "attente", acteCourant: null, parcours: [], debutActe: null, joueurs: {}, reponses: {}, votes: {}, votesOuverts: false, indicesEnvoyes: {}, evenementsTires: [], titres: {}, fin: null, journal: [] };
}

const ACTIONS_ANIMATION = new Set(["lancer", "acte_suivant", "pause", "reprendre", "indice", "evenement", "moderer", "exclure", "ouvrir_votes", "fermer_votes", "attribuer_titre", "terminer"]);
export const peutAnimer = (r?: Role) => r === "fondatrice" || r === "hote";

function acteParId(s: Scenario, id: string | null) { return s.actes.find(a => a.id === id) || null; }

/** Choix majoritaire à un acte (en cas d'égalité : premier choix dans l'ordre des options). */
export function choixMajoritaire(s: Scenario, e: EtatSession, acteId: string): string | null {
  const a = acteParId(s, acteId); const rep = e.reponses[acteId] || {};
  const comptes: Record<string, number> = {};
  for (const r of Object.values(rep)) if (!r.passe && r.choix) comptes[r.choix] = (comptes[r.choix] || 0) + 1;
  const ordre = a && "options" in a.epreuve ? (a.epreuve as { options: Option[] }).options.map(o => o.id) : Object.keys(comptes);
  let best: string | null = null;
  for (const id of ordre) if ((comptes[id] || 0) > 0 && (best === null || comptes[id] > comptes[best])) best = id;
  return best;
}

/** Acte suivant selon les embranchements (le premier qui s'applique), sinon `suivant`. */
export function acteSuivant(s: Scenario, e: EtatSession): string | null {
  const a = acteParId(s, e.acteCourant);
  if (!a || a.fin) return null;
  for (const b of a.embranchements || []) if (choixMajoritaire(s, e, b.si.acte) === b.si.choix) return b.aller;
  return a.suivant || null;
}

const copie = (e: EtatSession): EtatSession => JSON.parse(JSON.stringify(e));
const refus = (erreur: string): Resultat => ({ ok: false, erreur });

export function appliquer(s: Scenario, e0: EtatSession, act: Action, maintenant: Date = new Date()): Resultat {
  const q = maintenant.toISOString();
  const e = copie(e0);
  const par = "par" in act ? act.par : act.joueur.id;
  const j = e.joueurs[par];
  if (act.type !== "rejoindre") {
    if (!j) return refus("Participant inconnu dans cette session.");
    if (j.exclu) return refus("Vous avez été exclu de cette session.");
  }
  if (ACTIONS_ANIMATION.has(act.type) && !peutAnimer(j?.role)) return refus("Action réservée à la fondatrice et aux hôtes de la salle.");
  if (e.statut === "terminee" && act.type !== "quitter") return refus("Session terminée.");
  const log = (type: string, detail?: string) => e.journal.push({ quand: q, type, par, detail });

  switch (act.type) {
    case "rejoindre": {
      const ex = e.joueurs[act.joueur.id];
      if (ex?.exclu) return refus("Vous avez été exclu de cette session.");
      if (ex) { ex.present = true; ex.derniereVue = q; log("retour"); return { ok: true, etat: e }; }
      const nbJoueurs = Object.values(e.joueurs).filter(x => x.role === "joueur" && !x.exclu).length;
      if (act.joueur.role === "joueur" && nbJoueurs >= s.participants.max) return refus("Session complète.");
      const pseudo = String(act.joueur.pseudo || "").trim().slice(0, 30);
      if (!pseudo) return refus("Pseudonyme obligatoire.");
      if (Object.values(e.joueurs).some(x => normaliser(x.pseudo) === normaliser(pseudo))) return refus("Ce pseudonyme est déjà utilisé dans la session.");
      e.joueurs[act.joueur.id] = { id: act.joueur.id, pseudo, role: act.joueur.role, present: true, derniereVue: q };
      log("arrivee", pseudo);
      return { ok: true, etat: e };
    }
    case "quitter": j.present = false; j.derniereVue = q; log("depart"); return { ok: true, etat: e };
    case "deconnexion": j.present = false; j.derniereVue = q; log("deconnexion"); return { ok: true, etat: e };
    case "reconnexion": j.present = true; j.derniereVue = q; log("reconnexion"); return { ok: true, etat: e };
    case "lancer": {
      if (e.statut !== "attente") return refus("Session déjà lancée.");
      const nb = Object.values(e.joueurs).filter(x => x.role === "joueur" && !x.exclu).length;
      if (nb < s.participants.min) return refus(`Il faut au moins ${s.participants.min} participant${s.participants.min > 1 ? "s" : ""}.`);
      const premier = s.actes[0]; if (!premier) return refus("Scénario sans acte.");
      e.statut = "en_cours"; e.acteCourant = premier.id; e.parcours = [premier.id]; e.debutActe = q; log("lancement", premier.id);
      return { ok: true, etat: e };
    }
    case "acte_suivant": {
      if (e.statut !== "en_cours") return refus("La session n'est pas en cours.");
      const suiv = acteSuivant(s, e);
      if (!suiv) { const a = acteParId(s, e.acteCourant); e.fin = a?.id || null; e.statut = "votes"; e.votesOuverts = false; log("fin_des_actes", e.fin || undefined); return { ok: true, etat: e }; }
      e.acteCourant = suiv; e.parcours.push(suiv); e.debutActe = q; log("acte", suiv);
      return { ok: true, etat: e };
    }
    case "pause":
      if (e.statut !== "en_cours" && e.statut !== "votes") return refus("Rien à mettre en pause.");
      e.statutAvantPause = e.statut; e.statut = "pause"; e.pauseDepuis = q; log("pause"); return { ok: true, etat: e };
    case "reprendre":
      if (e.statut !== "pause") return refus("La session n'est pas en pause.");
      e.statut = e.statutAvantPause || "en_cours"; delete e.statutAvantPause;
      if (e.debutActe && e.pauseDepuis) e.debutActe = new Date(new Date(e.debutActe).getTime() + (maintenant.getTime() - new Date(e.pauseDepuis).getTime())).toISOString();
      delete e.pauseDepuis; log("reprise"); return { ok: true, etat: e };
    case "indice": {
      const a = acteParId(s, e.acteCourant); if (!a?.indices?.length) return refus("Aucun indice pour cet acte.");
      const n = e.indicesEnvoyes[a.id] || 0; if (n >= a.indices.length) return refus("Tous les indices ont été envoyés.");
      e.indicesEnvoyes[a.id] = n + 1; log("indice", a.indices[n]); return { ok: true, etat: e };
    }
    case "evenement": {
      const a = acteParId(s, e.acteCourant); const restants = (a?.evenements || []).filter(c => !e.evenementsTires.includes(c.id));
      if (!restants.length) return refus("Aucune carte d'événement disponible.");
      e.evenementsTires.push(restants[0].id); log("evenement", restants[0].titre); return { ok: true, etat: e };
    }
    case "repondre":
    case "passer": {
      if (e.statut !== "en_cours") return refus(e.statut === "pause" ? "Session en pause." : "Aucun acte en cours.");
      const a = acteParId(s, e.acteCourant)!;
      const r: Omit<Reponse, "quand"> = act.type === "passer" ? { passe: true } : act.reponse;
      const pris = Object.entries(e.reponses[a.id] || {}).filter(([k]) => k !== par).map(([, v]) => v.personnage).filter((x): x is string => !!x);
      const err = controlerReponse(a.epreuve, r, pris);
      if (err.length) return refus(err.join(" "));
      if (a.chronoSecondes && e.debutActe && !r.passe && maintenant.getTime() - new Date(e.debutActe).getTime() > a.chronoSecondes * 1000 + 15000) return refus("Temps écoulé pour cet acte.");
      (e.reponses[a.id] ||= {})[par] = { ...r, texte: r.texte?.trim(), pseudo: r.pseudo?.trim(), quand: q };
      if (a.epreuve.type === "choix_personnage" && !r.passe) { j.personnage = r.personnage; if (r.pseudo) j.pseudo = r.pseudo.trim().slice(0, 30); }
      log(r.passe ? "passe" : "reponse", a.id);
      return { ok: true, etat: e };
    }
    case "moderer": {
      const r = e.reponses[act.acte]?.[act.joueur]; if (!r) return refus("Réponse introuvable.");
      r.masquee = true; log("moderation", `${act.acte}/${act.joueur}`); return { ok: true, etat: e };
    }
    case "exclure": {
      const cible = e.joueurs[act.joueur]; if (!cible) return refus("Participant introuvable.");
      if (cible.role === "fondatrice") return refus("La fondatrice ne peut pas être exclue.");
      if (cible.role === "hote" && j.role !== "fondatrice") return refus("Seule la fondatrice peut exclure un hôte.");
      if (!act.motif?.trim()) return refus("Motif obligatoire.");
      cible.exclu = true; cible.present = false;
      for (const d of Object.keys(e.votes)) { delete e.votes[d][act.joueur]; for (const [v, c] of Object.entries(e.votes[d])) if (c === act.joueur) delete e.votes[d][v]; }
      log("exclusion", act.motif.trim()); return { ok: true, etat: e };
    }
    case "ouvrir_votes":
      if (e.statut !== "votes" && e.statut !== "en_cours") return refus("Les votes s'ouvrent pendant ou à la fin de la session.");
      e.votesOuverts = true; log("votes_ouverts"); return { ok: true, etat: e };
    case "voter": {
      if (!e.votesOuverts || e.statut === "pause") return refus("Les votes sont fermés.");
      if (!s.distinctions.some(d => d.id === act.distinction)) return refus("Distinction inconnue.");
      if (j.role !== "joueur") return refus("Seuls les participants votent.");
      const cible = e.joueurs[act.cible];
      if (!cible || cible.exclu || cible.role !== "joueur") return refus("Vote possible seulement pour un participant de la session.");
      if (act.cible === par) return refus("Impossible de voter pour soi-même.");
      const urne = (e.votes[act.distinction] ||= {});
      if (urne[par]) return refus("Vous avez déjà voté pour cette distinction.");
      urne[par] = act.cible; log("vote", act.distinction);
      return { ok: true, etat: e };
    }
    case "fermer_votes":
      if (!e.votesOuverts) return refus("Les votes ne sont pas ouverts.");
      e.votesOuverts = false; log("votes_fermes"); return { ok: true, etat: e };
    case "attribuer_titre": {
      if (e.votesOuverts) return refus("Fermez d'abord les votes.");
      if (!s.distinctions.some(d => d.id === act.distinction)) return refus("Distinction inconnue.");
      const cible = e.joueurs[act.joueur]; if (!cible || cible.exclu || cible.role !== "joueur") return refus("Participant introuvable.");
      const l = (e.titres[act.distinction] ||= []); if (!l.includes(act.joueur)) l.push(act.joueur);
      log("titre", `${act.distinction} → ${cible.pseudo}`); return { ok: true, etat: e };
    }
    case "terminer":
      e.statut = "terminee"; e.votesOuverts = false; for (const x of Object.values(e.joueurs)) x.present = false; log("fin");
      return { ok: true, etat: e };
  }
}

/** Dépouillement : nombre de voix par joueur ; `gagnants` contient tous les ex æquo. */
export function depouiller(e: EtatSession, distinction: string): { voix: Record<string, number>; gagnants: string[] } {
  const voix: Record<string, number> = {};
  for (const [v, c] of Object.entries(e.votes[distinction] || {})) if (!e.joueurs[v]?.exclu && !e.joueurs[c]?.exclu) voix[c] = (voix[c] || 0) + 1;
  const max = Math.max(0, ...Object.values(voix));
  return { voix, gagnants: max > 0 ? Object.keys(voix).filter(k => voix[k] === max) : [] };
}

/** Scores : points de participation par acte (y compris décision de refuser), + 5 par voix reçue.
 *  Passer une épreuve donne 0 sans pénalité. Les réponses masquées par la modération ne rapportent rien. */
export function scores(s: Scenario, e: EtatSession): { joueur: string; pseudo: string; points: number }[] {
  const pts: Record<string, number> = {};
  for (const [acteId, rep] of Object.entries(e.reponses)) {
    const a = acteParId(s, acteId); const base = a?.points ?? 10;
    for (const [jid, r] of Object.entries(rep)) if (!r.passe && !r.masquee) pts[jid] = (pts[jid] || 0) + base;
  }
  for (const d of s.distinctions) for (const [c, n] of Object.entries(depouiller(e, d.id).voix)) pts[c] = (pts[c] || 0) + 5 * n;
  return Object.values(e.joueurs).filter(j => j.role === "joueur" && !j.exclu)
    .map(j => ({ joueur: j.id, pseudo: j.pseudo, points: pts[j.id] || 0 }))
    .sort((a, b) => b.points - a.points || a.pseudo.localeCompare(b.pseudo));
}

// ── Sauvegarde et reprise ────────────────────────────────────────────────────
export function sauvegarder(e: EtatSession): string { return JSON.stringify(e); }

export function restaurer(texte: string, s: Scenario): { ok: true; etat: EtatSession } | { ok: false; erreur: string } {
  let e: EtatSession;
  try { e = JSON.parse(texte); } catch { return { ok: false, erreur: "Sauvegarde illisible." }; }
  if (e?.format !== "bsh-club-session" || e.versionFormat !== 1) return { ok: false, erreur: "Format de sauvegarde inconnu." };
  if (e.scenarioId !== s.id) return { ok: false, erreur: "Cette sauvegarde appartient à un autre scénario." };
  if (e.acteCourant && !acteParId(s, e.acteCourant)) return { ok: false, erreur: "L'acte enregistré n'existe plus dans ce scénario." };
  // Après une coupure, personne n'est considéré présent tant qu'il ne s'est pas reconnecté.
  for (const j of Object.values(e.joueurs)) j.present = false;
  return { ok: true, etat: e };
}

/** Secondes restantes du chronomètre (null si l'acte n'en a pas). Le chronomètre s'arrête pendant la pause. */
export function secondesRestantes(s: Scenario, e: EtatSession, maintenant: Date = new Date()): number | null {
  const a = acteParId(s, e.acteCourant);
  if (!a?.chronoSecondes || !e.debutActe) return null;
  const reference = e.statut === "pause" && e.pauseDepuis ? new Date(e.pauseDepuis) : maintenant;
  return Math.max(0, Math.round(a.chronoSecondes - (reference.getTime() - new Date(e.debutActe).getTime()) / 1000));
}
