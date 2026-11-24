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
  story_snapchat: { libelle: "Story Snapchat", l: 1080, h: 1920 }, story_tiktok: { libelle: "Story TikTok", l: 1080, h: 1920 },
};
/** Exports réels proposés par format (PDF : formats destinés à l'impression). */
export const EXPORTS_STUDIO: Record<string, ("png" | "jpeg" | "pdf")[]> = {
  affiche: ["png", "jpeg"], story: ["png", "jpeg"], story_snapchat: ["png", "jpeg"], story_tiktok: ["png", "jpeg"], sondage: ["png", "jpeg"],
  carte_jeu: ["png", "pdf"], invitation: ["png", "jpeg", "pdf"], evenement: ["png", "jpeg", "pdf"], campagne: ["png", "jpeg"], scenographie: ["png", "pdf"],
};
/** Zones à laisser libres (part de la hauteur) : interface des applications par-dessus la Story. */
export const ZONES_SURES: Record<string, { haut: number; bas: number }> = { story_tiktok: { haut: 0.13, bas: 0.2 }, story_snapchat: { haut: 0.1, bas: 0.15 } };
export const AMBIANCES: [string, string, string, string][] = [["glamour", "Glamour", "#c6a15b", "#2e1a2e"], ["sensuelle", "Sensuelle", "#e3b9bd", "#5c1522"], ["dark_romance", "Dark romance", "#7a2030", "#0b0709"], ["romantique", "Romantique", "#e8a0b4", "#4a1c2c"], ["mysterieuse", "Mystérieuse", "#9085e9", "#120c1e"], ["festive", "Festive", "#d4af37", "#5a0f14"]];
/** Description du personnage officiel BSH (repère pour la validation ; ne remplace jamais le visuel officiel). */
export const PERSONNAGE_OFFICIEL = "Femme adulte noire, glamour, de morphologie généreuse, aux longs cheveux très bouclés bordeaux, au maquillage sophistiqué et au regard cat-eyes.";

// ═══ Campagne officielle « BSH Christmas Secrets 2026 » (données fournies par la fondatrice le 24/11/2026) ═══
export const CHRISTMAS = { nom: "BSH Christmas Secrets 2026", debut: "2026-11-17", fin: "2026-12-25" } as const;
export const PERIODES_CHRISTMAS: [string, string, string][] = [
  ["2026-11-17", "2026-11-22", "Le réveil des fêtes"], ["2026-11-23", "2026-11-29", "Les secrets de Noël"], ["2026-11-30", "2026-12-06", "Les lettres secrètes"],
  ["2026-12-07", "2026-12-13", "Le bal des mystères"], ["2026-12-14", "2026-12-20", "La semaine des surprises"], ["2026-12-21", "2026-12-25", "La magie finale"],
];
export const periodeChristmas = (date: string) => PERIODES_CHRISTMAS.find(([d, f]) => date >= d && date <= f)?.[2] || null;
/** Programmation quotidienne proposée (null = pause du samedi). */
export const QUOTIDIEN_CHRISTMAS: [string, string | null][] = [
  ["2026-11-23", "Le cadeau mystère"], ["2026-11-24", "Le code secret"], ["2026-11-25", "Le dilemme de Noël"], ["2026-11-26", "Le duel des compliments"], ["2026-11-27", "Le mystère du boudoir"], ["2026-11-28", null], ["2026-11-29", "Les confidences de Noël"],
  ["2026-11-30", "La lettre anonyme fictive"], ["2026-12-01", "Le message codé"], ["2026-12-02", "Vérité ou mystère"], ["2026-12-03", "Le compliment inattendu"], ["2026-12-04", "Silence, on tourne !"], ["2026-12-05", null], ["2026-12-06", "Une lettre à mon futur moi"],
  ["2026-12-07", "Qui suis-je ?"], ["2026-12-08", "Diamond B Challenge"], ["2026-12-09", "L'enquête du bal masqué"], ["2026-12-10", "Le duo complice"], ["2026-12-11", "Le grand quiz BSH"], ["2026-12-12", null], ["2026-12-13", "Les confidences du bal"],
  ["2026-12-14", "L'intrus BSH"], ["2026-12-15", "Les trois portes secrètes"], ["2026-12-16", "Le Noël improbable"], ["2026-12-17", "La boîte à compliments"], ["2026-12-18", "La coupe des hôtes"], ["2026-12-19", null], ["2026-12-20", "Le cadeau idéal"],
  ["2026-12-21", "Les cinq secrets de Noël"], ["2026-12-22", "Le dernier code secret"], ["2026-12-23", "Les vœux mystérieux"], ["2026-12-24", "Le réveillon des Sweeties"], ["2026-12-25", "Message de Noël et clôture festive"],
];

// ═══ Programmation permanente (America/Cayenne) ═══
export type CreneauGabarit = { heure: string; espace: string; nature: "affiche" | "publication" | "animation" | "sondage" | "relance" | "annonce"; libelle: string; facultatif: boolean };
export const GABARIT_JOURNEE: CreneauGabarit[] = [
  { heure: "08:00", espace: "chaine", nature: "affiche", libelle: "Affiche du matin", facultatif: false },
  { heure: "08:00", espace: "chaine", nature: "publication", libelle: "Publication éditoriale du matin", facultatif: false },
  { heure: "10:00", espace: "chaine", nature: "sondage", libelle: "Sondage", facultatif: true },
  { heure: "12:30", espace: "cercle", nature: "animation", libelle: "Animation du Cercle", facultatif: true },
  { heure: "18:00", espace: "chaine", nature: "annonce", libelle: "Actualité ou annonce", facultatif: true },
  { heure: "21:00", espace: "chaine", nature: "affiche", libelle: "Affiche du soir", facultatif: false },
  { heure: "21:00", espace: "chaine", nature: "publication", libelle: "Publication du soir", facultatif: false },
  { heure: "21:00", espace: "cercle", nature: "animation", libelle: "Animation communautaire", facultatif: false },
  { heure: "22:30", espace: "cercle", nature: "relance", libelle: "Relance par un hôte", facultatif: true },
];
export const SAMEDI = { ferme: true, reouverture: "20:00" } as const;
export const PENSEE_MAX = 50;
/** Programmation par jour attendue (bsh_programmation_jours) : principaux 8 h / 21 h, facultatifs 10 h, 12 h 30, 18 h, 22 h 30 ; samedi fermé, réouverture facultative à 20 h. */
export function programmationPermanente(themes: Record<number, string>): JourProg[] {
  return [0, 1, 2, 3, 4, 5, 6].map(j => j === 6
    ? { jour_semaine: 6, thematique: themes[6] || "Pause", en_pause: true, creneaux: [], creneaux_facultatifs: [SAMEDI.reouverture] }
    : { jour_semaine: j, thematique: themes[j] || "", en_pause: false, creneaux: ["08:00", "21:00"], creneaux_facultatifs: ["10:00", "12:30", "18:00", "22:30"] });
}

/** Lignes du calendrier officiel (titre du jour décliné selon le gabarit ; samedis de pause exclus). */
export function lignesCalendrierOfficiel(avecFacultatifs = false) {
  const out: { date: string; heure: string; espace: string; nature: string; titre: string; thematique: string | null }[] = [];
  for (const [date, titre] of QUOTIDIEN_CHRISTMAS) {
    if (!titre) continue;
    for (const g of GABARIT_JOURNEE) {
      if (g.facultatif && !avecFacultatifs) continue;
      out.push({ date, heure: g.heure, espace: g.espace, nature: g.nature, titre: `${titre} — ${g.libelle.toLowerCase()}`, thematique: periodeChristmas(date) });
    }
  }
  return out;
}
/** Même contenu au format texte de l'import (date ; heure ; espace ; nature ; titre ; texte). */
export const csvCalendrierOfficiel = (avecFacultatifs = false) => ["date;heure;espace;type;titre;contenu", ...lignesCalendrierOfficiel(avecFacultatifs).map(l => `${l.date};${l.heure};${l.espace};${l.nature};${l.titre};`)].join("\n");

/** Plan de fusion « Noël BSH » → « BSH Christmas Secrets 2026 », sans perte : renommage si seule « Noël BSH » existe,
 *  sinon rattachement des éléments puis archivage de « Noël BSH » (jamais supprimée). */
export type CampagneF = { id: string; nom: string; saison: string; date_debut: string | null; date_fin: string | null; recurrence_annuelle?: boolean; statut: string; notes_internes?: string | null };
export function planFusion(campagnes: CampagneF[]) {
  const cible = campagnes.find(c => /christmas secrets 2026/i.test(c.nom));
  const noel = campagnes.find(c => c !== cible && c.saison === "noel" && /no[eë]l bsh/i.test(c.nom) && c.statut !== "archivee");
  const trace = (c: CampagneF) => `Fusion dans « ${CHRISTMAS.nom} » le ${new Date().toISOString().slice(0, 10)} — avant : « ${c.nom} », ${c.date_debut || "?"} → ${c.date_fin || "?"}, récurrence annuelle ${c.recurrence_annuelle ? "oui" : "non"}.`;
  if (!noel) return cible ? { action: "rien" as const, motif: "Fusion déjà faite ou « Noël BSH » absente." } : { action: "creer" as const, motif: "Aucune des deux campagnes : création de la campagne officielle." };
  if (!cible) return { action: "renommer" as const, id: noel.id, patch: { nom: CHRISTMAS.nom, date_debut: CHRISTMAS.debut, date_fin: CHRISTMAS.fin, recurrence_annuelle: false, notes_internes: [noel.notes_internes, trace(noel)].filter(Boolean).join("\n") }, motif: "« Noël BSH » devient la campagne officielle (même identifiant : tous ses éléments suivent)." };
  return { action: "rattacher" as const, de: noel.id, vers: cible.id, archive: { statut: "archivee", notes_internes: [noel.notes_internes, trace(noel)].filter(Boolean).join("\n") }, tables: ["bsh_communications", "bsh_animations", "bsh_sondages", "bsh_rewards_campagnes", "bsh_ressources", "bsh_creations"], motif: "Les éléments de « Noël BSH » sont rattachés à la campagne officielle ; « Noël BSH » est archivée, jamais supprimée." };
}

// ═══ Réserve de sondages (brouillons) ═══
export const RESERVE_SONDAGES: [string, string[]][] = [
  ["Quelle ambiance préférez-vous pour Noël chez BSH ?", ["Romantique", "Mystérieuse", "Festive", "Glamour"]],
  ["Quelle animation préférez-vous ?", ["Quiz", "Énigmes", "Débats", "Défis collectifs"]],
  ["Quel univers graphique préférez-vous ?", ["Noir et or", "Bordeaux", "Vieux rose", "Rouge festif"]],
  ["À quelle heure êtes-vous le plus disponible ?", ["Matin", "Midi", "Soir", "Fin de soirée"]],
  ["Quelle ambiance pour une Boudoir Session ?", ["Élégante", "Musicale", "Mystérieuse", "Conviviale"]],
  ["Quel jeu souhaitez-vous découvrir ?", ["Enquête", "Jeu musical", "Jeu de cartes", "Quiz"]],
  ["Quelle qualité appréciez-vous le plus ?", ["Confiance", "Humour", "Respect", "Attention"]],
  ["Quel rendez-vous aimeriez-vous retrouver chaque semaine ?", ["Débat", "Quiz", "Confidences", "Soirée musicale"]],
  ["Quelle récompense autorisée vous intéresse ?", ["Coffret gourmand", "Invitation", "Cadeau de marque", "Privilège membre"]],
  ["Quel thème souhaitez-vous pour janvier ?", ["Nouveau départ", "Mystère", "Élégance", "Complicité"]],
];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/** Sondages de la réserve absents (comparaison sans accents ni casse) → lignes brouillon prêtes à insérer. */
export function sondagesAManquer(existants: { question: string }[]) {
  const deja = new Set(existants.map(e => norm(e.question)));
  return RESERVE_SONDAGES.filter(([q]) => !deja.has(norm(q))).map(([question, rep]) => ({ question, choix: rep.map((libelle, i) => ({ id: String.fromCharCode(97 + i), libelle })), choix_multiple: false, destination: "chaine", source: "whatsapp", statut: "brouillon" }));
}

// ═══ Catégories BSH Rewards et plateformes ═══
export const CATEGORIES_REWARDS: [string, string][] = [["sweet_rewards", "BSH Sweet Rewards"], ["golden_ticket", "BSH Golden Ticket"], ["secret_gift", "BSH Secret Gift"], ["members_rewards", "BSH Members Rewards"]];
export const PLATEFORMES: [string, string][] = [["whatsapp", "WhatsApp"], ["snapchat", "Snapchat"], ["tiktok", "TikTok"]];

// ── Personnage officiel : référence principale + références secondaires (24/11) ──
export type RefPersonnage = { id: string; type: string; url?: string | null; statut_validation: string; droits: string; role_reference?: string | null; created_at?: string };
/** Classe les visuels du personnage : la principale (une seule), les secondaires, ceux en attente. */
export function referencesPersonnage<T extends RefPersonnage>(ressources: T[]): { principale: T | null; secondaires: T[]; enAttente: T[]; toutes: T[] } {
  const toutes = ressources.filter(r => r.type === "personnage_reference" && r.statut_validation !== "archive");
  const valides = toutes.filter(r => utilisable(r as any));
  const principale = valides.find(r => r.role_reference === "principale") || null;
  return { principale, secondaires: valides.filter(r => r !== principale), enAttente: toutes.filter(r => r.statut_validation === "a_valider" || r.statut_validation === "brouillon"), toutes };
}
/** Écritures pour désigner une nouvelle principale (ordre imposé : l'ancienne d'abord, contrainte d'unicité en base). */
export function patchsPrincipale<T extends RefPersonnage>(toutes: T[], nouvelleId: string): { id: string; role_reference: "principale" | "secondaire" }[] {
  const anciennes = toutes.filter(r => r.role_reference === "principale" && r.id !== nouvelleId).map(r => ({ id: r.id, role_reference: "secondaire" as const }));
  return [...anciennes, { id: nouvelleId, role_reference: "principale" as const }];
}
/** Personnage à utiliser dans une création : celui choisi, sinon la référence principale ; jamais un visuel non validé. */
export function personnageCreation<T extends RefPersonnage>(ressources: T[], choisiId?: string | null): T | null {
  const { principale, secondaires } = referencesPersonnage(ressources);
  return [principale, ...secondaires].find(r => r && r.id === choisiId) || principale || null;
}
