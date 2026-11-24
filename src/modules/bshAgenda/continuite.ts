// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — règles pures (sans accès réseau), testées dans tests/unit/t_bsh_continuite.js
//  • créneaux d'une campagne (8 h / 21 h, fuseau America/Cayenne, pause du samedi) ;
//  • publication en 4 étapes distinctes : génération → validation → programmation → publication CONFIRMÉE
//    (une programmation interne n'est jamais une publication : la confirmation exige une preuve) ;
//  • import d'un calendrier (dates passées : « historique » ou replanification, jamais « publié ») ;
//  • continuité : responsable, remplaçant, alertes quand personne n'est disponible ;
//  • duplication d'un contenu (toujours en brouillon, sans validation ni preuve) ; doublons de la médiathèque.
// Cayenne = UTC−3 toute l'année (pas d'heure d'été).
// ═══════════════════════════════════════════════════════════

export type JourProg = { jour_semaine: number; thematique: string; en_pause: boolean; creneaux: string[]; creneaux_facultatifs?: string[] };
export type Creneau = { date: string; heure: string; thematique: string };

const p2 = (n: number) => String(n).padStart(2, "0");
export const versIsoCayenne = (date: string, heure = "00:00") => new Date(`${date}T${heure}:00-03:00`).toISOString();
export function cleCayenne(iso: string | Date) { const d = new Date(new Date(iso).getTime() - 3 * 3600e3); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; }
export function heureCayenneDe(iso: string | Date) { const d = new Date(new Date(iso).getTime() - 3 * 3600e3); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; }
export const ajouterJours = (cle: string, n: number) => { const d = new Date(cle + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const jourDe = (cle: string) => new Date(cle + "T12:00:00Z").getUTCDay();
const dateValide = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T12:00:00Z")) && new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
const heureValide = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Créneaux principaux d'une période, selon la programmation par jour (le samedi en pause ne produit rien). */
export function creneauxPeriode(debut: string, fin: string, jours: JourProg[]): Creneau[] {
  const out: Creneau[] = [];
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) {
    const j = jours.find(x => x.jour_semaine === jourDe(d));
    if (!j || j.en_pause) continue;
    for (const h of j.creneaux || []) out.push({ date: d, heure: h, thematique: j.thematique });
  }
  return out;
}

// ── Publication en 4 étapes ─────────────────────────────────
export type Pub = { statut: string; titre?: string | null; contenu?: string | null; date_programmee?: string | null; valide_le?: string | null; valide_par?: string | null; preuve_publication?: string | null; confirme_le?: string | null; confirme_par?: string | null; hote_id?: string | null; espace?: string | null };
export const ETAPES_PUBLICATION = [
  ["generation", "1. Génération", "Contenu rédigé ou produit (brouillon)."],
  ["validation", "2. Validation", "Relu et validé par la fondatrice."],
  ["programmation", "3. Programmation", "Date et heure fixées en interne. Rien n'est envoyé."],
  ["publication", "4. Publication confirmée", "Publiée réellement, avec une preuve (lien, capture, confirmation)."],
] as const;

/** Étape atteinte, d'après les faits enregistrés (et non d'après le seul statut). */
export function etapePublication(p: Pub): "generation" | "validation" | "programmation" | "publication" {
  if (p.statut === "publie" && preuveSuffisante(p.preuve_publication) && p.confirme_le) return "publication";
  if (p.valide_le && p.date_programmee && ["programme", "pret", "publie"].includes(p.statut)) return "programmation";
  if (p.valide_le) return "validation";
  return "generation";
}
export const preuveSuffisante = (s?: string | null) => (s || "").trim().length >= 8;

/** Vérifie un changement de statut. Renvoie un message d'erreur, ou null si le changement est permis. */
export function controleTransition(p: Pub, vers: string, extra: { preuve?: string | null } = {}): string | null {
  if (vers === p.statut) return null;
  if (["valide", "programme", "pret"].includes(vers) && !((p.titre || "").trim() && (p.contenu || "").trim())) return "Titre et texte sont nécessaires avant la validation.";
  if (["programme", "pret"].includes(vers)) {
    if (!p.valide_le && vers !== "valide") return "Le contenu doit être validé avant d'être programmé.";
    if (!p.date_programmee) return "Une date et une heure sont nécessaires pour programmer.";
  }
  if (vers === "publie") {
    if (!p.valide_le) return "Un contenu non validé ne peut pas être déclaré publié.";
    if (!preuveSuffisante(extra.preuve ?? p.preuve_publication)) return "La publication n'est confirmée qu'avec une preuve (lien du message, description de la capture, confirmation de l'hôte).";
  }
  if (p.statut === "publie" && vers !== "archive") return "Une publication confirmée ne change plus de statut (seul l'archivage est possible).";
  return null;
}

/** Copie d'un contenu : toujours un brouillon, sans validation, sans preuve, sans date effective. */
export function dupliquer<T extends Record<string, any>>(p: T, nouvelleDateIso: string | null = null): T {
  const { id, created_at, updated_at, publiee_le, date_publication_effective, valide_le, valide_par, preuve_publication, preuve_url, confirme_le, confirme_par, serie_id, historique, ...reste } = p as any;
  return { ...reste, titre: `${p.titre || "Sans titre"} (copie)`, statut: "brouillon", date_programmee: nouvelleDateIso, valide_le: null, valide_par: null, preuve_publication: null, preuve_url: null, confirme_le: null, confirme_par: null, date_publication_effective: null, historique: false } as T;
}

// ── Import d'un calendrier (CSV « ; » ou tabulations) ───────
export type LigneImport = { ligne: number; date: string; heure: string; espace: string; type: string; titre: string; contenu: string; etat: "a_venir" | "historique" | "erreur"; alertes: string[]; doublon: boolean };
const ESPACES_OK = ["chaine", "cercle", "lounge"]; // contrainte bsh_communications_espace_check en production

/** Lit un calendrier. Colonnes : date ; heure ; espace ; type ; titre ; contenu. Date AAAA-MM-JJ ou JJ/MM/AAAA. */
export function lireCalendrier(texte: string, opts: { maintenant: Date; jours: JourProg[]; existants?: { date_programmee?: string | null; espace?: string | null; titre?: string | null }[] }): LigneImport[] {
  const lignes = (texte || "").replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean);
  if (lignes.length && /^date\b/i.test(lignes[0])) lignes.shift();
  const vus = new Set<string>();
  const cle = (iso: string, espace: string, titre: string) => `${iso}|${espace}|${titre.trim().toLowerCase()}`;
  const deja = new Set((opts.existants || []).filter(e => e.date_programmee).map(e => cle(new Date(e.date_programmee!).toISOString(), e.espace || "", e.titre || "")));
  return lignes.map((l, i) => {
    const c = l.split(/\t|;/).map(x => x.trim());
    let [date = "", heure = "", espace = "chaine", type = "publication", titre = "", ...cont] = c;
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date); if (m) date = `${m[3]}-${p2(+m[2])}-${p2(+m[1])}`;
    if (/^\d{1,2}h\d{0,2}$/i.test(heure)) { const [h, mi] = heure.toLowerCase().split("h"); heure = `${p2(+h)}:${p2(+(mi || 0))}`; }
    espace = (espace || "chaine").toLowerCase();
    const alertes: string[] = [];
    let etat: LigneImport["etat"] = "a_venir";
    if (!dateValide(date)) { alertes.push("date illisible"); etat = "erreur"; }
    if (!heureValide(heure)) { alertes.push("heure illisible"); etat = "erreur"; }
    if (!titre) { alertes.push("titre manquant"); etat = "erreur"; }
    if (!ESPACES_OK.includes(espace)) { alertes.push(`espace inconnu « ${espace} »`); etat = "erreur"; }
    let doublon = false;
    if (etat !== "erreur") {
      const iso = versIsoCayenne(date, heure);
      if (new Date(iso).getTime() < opts.maintenant.getTime()) etat = "historique";
      const j = opts.jours.find(x => x.jour_semaine === jourDe(date));
      if (j?.en_pause) alertes.push("tombe un samedi de pause");
      else if (j && !j.creneaux.includes(heure) && !(j.creneaux_facultatifs || []).includes(heure)) alertes.push(`hors des créneaux habituels (${j.creneaux.join(", ")})`);
      const k = cle(iso, espace, titre);
      if (vus.has(k) || deja.has(k)) { doublon = true; alertes.push("doublon"); }
      vus.add(k);
    }
    return { ligne: i + 1, date, heure, espace, type: type || "publication", titre, contenu: cont.join(" ; "), etat, alertes, doublon };
  });
}

/** Prochain créneau principal libre à partir d'aujourd'hui (pour replanifier une date passée). */
export function prochainCreneauLibre(apresIso: Date, jours: JourProg[], occupes: Set<string>, heureVoulue?: string, horizon = 60): Creneau | null {
  const depart = cleCayenne(apresIso);
  for (let k = 0; k <= horizon; k++) {
    const d = ajouterJours(depart, k);
    const j = jours.find(x => x.jour_semaine === jourDe(d));
    if (!j || j.en_pause) continue;
    const heures = heureVoulue && j.creneaux.includes(heureVoulue) ? [heureVoulue, ...j.creneaux.filter(h => h !== heureVoulue)] : j.creneaux;
    for (const h of heures) {
      const iso = versIsoCayenne(d, h);
      if (new Date(iso).getTime() <= apresIso.getTime() || occupes.has(iso)) continue;
      return { date: d, heure: h, thematique: j.thematique };
    }
  }
  return null;
}

// ── Continuité : qui est responsable, et alertes ────────────
export type HoteC = { id: string; statut: string; prenom?: string | null; nom?: string | null; autorise_missions?: boolean };
export type Indispo = { hote_id: string; jour: string; type: string };
export type MissionC = { id?: string; hote_id: string | null; remplacant_id?: string | null; date_mission: string | null; communication_id?: string | null; animation_id?: string | null; statut?: string; statut_execution?: string | null };
export type Echeance = { cle: string; libelle: string; date: string; heure?: string | null; espace?: string | null; hote_id?: string | null };
export type Alerte = { cle: string; libelle: string; date: string; niveau: "critique" | "attention" | "ok"; motif: string; responsable: string | null };

export function disponible(hoteId: string | null | undefined, date: string, hotes: HoteC[], indispos: Indispo[]): boolean {
  if (!hoteId) return false;
  const h = hotes.find(x => x.id === hoteId);
  if (!h || h.statut !== "active") return false;
  return !indispos.some(i => i.hote_id === hoteId && i.jour === date && i.type === "indisponible");
}

/**
 * Pour chaque échéance (publication ou animation à venir), détermine le responsable effectif :
 * titulaire de la mission (ou hôte attribué), sinon remplaçant de la mission, sinon hôte principal / remplaçant
 * du mode Continuité. « critique » : personne n'est disponible.
 */
export function alertesContinuite(echeances: Echeance[], missions: MissionC[], hotes: HoteC[], indispos: Indispo[], continuite?: { active: boolean; principal?: string | null; remplacant?: string | null } | null): Alerte[] {
  return echeances.map(e => {
    const m = missions.find(x => x.statut !== "annulee" && ((x.communication_id && x.communication_id === e.cle) || (x.animation_id && x.animation_id === e.cle)));
    const titulaire = m?.hote_id || e.hote_id || null;
    const candidats: [string | null | undefined, string][] = [[titulaire, "titulaire"], [m?.remplacant_id, "remplaçant de la mission"]];
    if (continuite?.active) candidats.push([continuite.principal, "hôte principal (Continuité)"], [continuite.remplacant, "remplaçant (Continuité)"]);
    const choisi = candidats.find(([id]) => disponible(id, e.date, hotes, indispos));
    if (!choisi) {
      const motif = !titulaire && !m?.remplacant_id && !continuite?.active ? "aucun responsable désigné" : "aucun responsable disponible ce jour-là";
      return { cle: e.cle, libelle: e.libelle, date: e.date, niveau: "critique", motif, responsable: null };
    }
    const [id, role] = choisi;
    return { cle: e.cle, libelle: e.libelle, date: e.date, niveau: role === "titulaire" ? "ok" : "attention", motif: role === "titulaire" ? "titulaire disponible" : `assurée par le ${role}`, responsable: id || null };
  });
}

export const STATUTS_EXECUTION: [string, string][] = [["a_faire", "À faire"], ["en_cours", "En cours"], ["realisee", "Réalisée"], ["non_realisee", "Non réalisée"], ["reportee", "Reportée"], ["annulee", "Annulée"]];
/** Ce qu'un hôte peut déclarer lui-même (le report et l'annulation restent à la fondatrice). */
export const EXECUTION_HOTE = ["en_cours", "realisee", "non_realisee"];
export function controleExecution(statut: string, compteRendu: string | null | undefined): string | null {
  if (!EXECUTION_HOTE.includes(statut)) return "Ce statut est réservé à la fondatrice.";
  if (["realisee", "non_realisee"].includes(statut) && (compteRendu || "").trim().length < 10) return "Un compte rendu d'au moins 10 caractères est demandé.";
  return null;
}

// ── Médiathèque éditoriale : classement et doublons ─────────
export const UNIVERS_RESSOURCE: [string, string][] = [["secret_agenda", "Secret Agenda"], ["secret_games", "Secret Games"], ["rewards", "Rewards"], ["commun", "Commun BSH"]];
export const TYPES_RESSOURCE: [string, string][] = [["affiche", "Affiche quotidienne"], ["story", "Story verticale"], ["sondage", "Visuel de sondage"], ["carte_jeu", "Carte de jeu"], ["invitation", "Invitation privée"], ["evenement", "Visuel événementiel"], ["campagne", "Campagne saisonnière"], ["scenographie", "Scénographie"], ["personnage_reference", "Personnage principal (référence)"], ["scenario", "Scénario"], ["texte", "Texte"], ["autre", "Autre"]];
export const DROITS: [string, string][] = [["a_verifier", "À vérifier"], ["proprietaire", "Création Bellaïa"], ["licence", "Sous licence"], ["autorise_ecrit", "Autorisation écrite"], ["interdit", "Interdit"]];
export const utilisable = (r: { statut_validation: string; droits: string }) => r.statut_validation === "valide" && !["a_verifier", "interdit"].includes(r.droits);
/** Clé de doublon : empreinte du fichier si connue, sinon média source, sinon titre + type + univers. */
export function cleDoublon(r: { empreinte?: string | null; source_media_id?: string | null; titre?: string | null; type?: string | null; univers?: string | null }) {
  if (r.empreinte) return "h:" + r.empreinte.toLowerCase();
  if (r.source_media_id) return "m:" + r.source_media_id;
  return `t:${(r.titre || "").trim().toLowerCase()}|${r.type || ""}|${r.univers || ""}`;
}

// ── Studio : formats de sortie ──────────────────────────────
export const FORMATS_STUDIO: Record<string, { libelle: string; l: number; h: number }> = {
  affiche: { libelle: "Affiche quotidienne", l: 1080, h: 1350 }, story: { libelle: "Story verticale", l: 1080, h: 1920 }, sondage: { libelle: "Visuel de sondage", l: 1080, h: 1350 },
  carte_jeu: { libelle: "Carte de jeu", l: 750, h: 1050 }, invitation: { libelle: "Invitation privée", l: 1080, h: 1350 }, evenement: { libelle: "Visuel événementiel", l: 1080, h: 1350 },
  campagne: { libelle: "Campagne saisonnière", l: 1080, h: 1350 }, scenographie: { libelle: "Scénographie (planche)", l: 1600, h: 1000 },
};
export const AMBIANCES: [string, string, string, string][] = [["glamour", "Glamour", "#c6a15b", "#2e1a2e"], ["sensuelle", "Sensuelle", "#e3b9bd", "#5c1522"], ["dark_romance", "Dark romance", "#7a2030", "#0b0709"]];
