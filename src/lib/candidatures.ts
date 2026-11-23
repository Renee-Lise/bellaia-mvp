// ═══════════════════════════════════════════════════════════
// Classement des candidatures par RÈGLES OBJECTIVES (sans IA, sans coût).
// • L'agent PROPOSE un statut et l'explique ; il ne décide jamais (« accepte » / « refuse » impossibles).
// • Il ne reçoit que les champs utiles à l'instruction : nom, photo, âge, genre, origine… sont retirés
//   avant analyse (aucun classement sur des caractéristiques protégées).
// • L'IA (synthèse de la motivation) est facultative et DÉSACTIVÉE par défaut ; ce module ne l'appelle pas.
// La base (migration 0135) applique les mêmes garde-fous : la règle vaut même si ce code est contourné.
// ═══════════════════════════════════════════════════════════
export const IA_CANDIDATURES_ACTIVEE_PAR_DEFAUT = false;
export const VERSION_CRITERES = "v1-2026-11-23";

export type TypeCandidature = "hote" | "assistant" | "modele" | "membres" | "autre";
export type StatutPropose = "incomplet" | "a_analyser" | "a_contacter" | "entretien" | "preselectionne" | "en_attente";

// Champs jamais transmis à l'agent (et refusés par la base dans « donnees »)
export const CHAMPS_EXCLUS = ["nom", "nom_affiche", "photo", "date_naissance", "age", "genre", "sexe", "origine", "nationalite", "religion", "sante", "handicap",
  "orientation", "situation_familiale", "piece_identite", "numero_securite_sociale", "mensurations", "poids", "email", "telephone"] as const;

export type Candidature = {
  type: TypeCandidature; ville?: string | null; poles?: string[]; disponibilites?: string | null; experience?: string | null;
  motivation?: string | null; langues?: string[]; majeur_declare?: boolean; conditions_acceptees_le?: string | null; rgpd_accepte_le?: string | null;
  donnees?: Record<string, unknown>; [cle: string]: unknown;
};
export type Besoins = { poles?: string[]; zones?: string[]; langues?: string[]; joursRecherches?: string[]; missionsModele?: string[] };
export type Critere = { code: string; libelle: string; resultat: "favorable" | "neutre" | "defavorable" | "bloquant"; detail: string };
export type Proposition = { statut_propose: StatutPropose; criteres: Critere[]; manquants: string[]; explication: string; version_criteres: string; ia_utilisee: false };

/** Retire tout champ non nécessaire avant l'analyse (y compris dans « donnees »). */
export function preparerPourAgent(c: Candidature): Candidature {
  const exclus = new Set<string>(CHAMPS_EXCLUS);
  const propre: Candidature = { type: c.type };
  for (const [k, v] of Object.entries(c)) if (!exclus.has(k)) (propre as any)[k] = v;
  if (c.donnees) propre.donnees = Object.fromEntries(Object.entries(c.donnees).filter(([k]) => !exclus.has(k)));
  return propre;
}

const REQUIS: Record<TypeCandidature, (keyof Candidature)[]> = {
  hote: ["ville", "disponibilites", "motivation"],
  assistant: ["poles", "disponibilites", "experience"],
  modele: ["disponibilites"],
  membres: [],
  autre: ["motivation"],
};
const LIBELLES: Record<string, string> = { ville: "ville ou zone", disponibilites: "disponibilités", motivation: "motivation", poles: "pôle(s) souhaité(s)", experience: "expérience ou compétences", missions_acceptees: "types de missions acceptées", limites: "limites professionnelles" };
const vide = (v: unknown) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

export function verifierCompletude(c: Candidature): string[] {
  const m = REQUIS[c.type].filter(k => vide(c[k])).map(k => LIBELLES[k as string] || String(k));
  if (c.type === "modele") {
    if (vide(c.donnees?.missions_acceptees)) m.push(LIBELLES.missions_acceptees);
    if (vide(c.donnees?.limites)) m.push(LIBELLES.limites);
  }
  return m;
}

const MOTS_EXPERIENCE: Record<TypeCandidature, RegExp> = {
  hote: /accueil|h[ôo]te|[ée]v[ée]nement|animation|vente|service/i,
  assistant: /assist|restauration|cuisine|p[âa]tisserie|commande|logistique|secr[ée]tariat|vente|service|organisation/i,
  modele: /shooting|photo|d[ée]fil[ée]|tournage|vid[ée]o|mannequin|pose/i,
  membres: /./, autre: /./,
};

export function evaluer(brut: Candidature, besoins: Besoins = {}): Proposition {
  const c = preparerPourAgent(brut);
  const criteres: Critere[] = [];
  const manquants = verifierCompletude(c);
  // Bloquants (conformité) : consentements et majorité déclarée
  if (!c.rgpd_accepte_le) criteres.push({ code: "rgpd", libelle: "Information données personnelles", resultat: "bloquant", detail: "non acceptée" });
  if (["hote", "modele", "membres"].includes(c.type) && !c.majeur_declare) criteres.push({ code: "majorite", libelle: "Majorité déclarée", resultat: "bloquant", detail: "non déclarée" });
  if (["hote", "assistant", "modele"].includes(c.type) && !c.conditions_acceptees_le) criteres.push({ code: "conditions", libelle: "Conditions de collaboration", resultat: "bloquant", detail: "non acceptées" });
  criteres.push({ code: "completude", libelle: "Dossier complet", resultat: manquants.length ? "defavorable" : "favorable", detail: manquants.length ? `manque : ${manquants.join(", ")}` : "toutes les informations nécessaires sont présentes" });
  if (besoins.poles?.length && c.poles?.length) {
    const communs = c.poles.filter(p => besoins.poles!.includes(p));
    criteres.push({ code: "poles", libelle: "Pôles demandés ↔ besoins", resultat: communs.length ? "favorable" : "defavorable", detail: communs.length ? `besoin dans : ${communs.join(", ")}` : "aucun besoin actuel dans les pôles demandés" });
  }
  if (besoins.joursRecherches?.length && c.disponibilites) {
    const ok = besoins.joursRecherches.filter(j => new RegExp(j, "i").test(c.disponibilites!));
    criteres.push({ code: "disponibilites", libelle: "Disponibilités ↔ besoins", resultat: ok.length ? "favorable" : "neutre", detail: ok.length ? `compatibles (${ok.join(", ")})` : "à préciser lors d'un échange" });
  }
  if (c.experience != null && c.type !== "membres") criteres.push({ code: "experience", libelle: "Expérience liée au rôle", resultat: MOTS_EXPERIENCE[c.type].test(c.experience) ? "favorable" : "neutre", detail: MOTS_EXPERIENCE[c.type].test(c.experience) ? "expérience déclarée en lien avec le rôle" : "lien avec le rôle à vérifier" });
  if (besoins.langues?.length && c.langues?.length) {
    const l = c.langues.filter(x => besoins.langues!.includes(x));
    criteres.push({ code: "langues", libelle: "Langues utiles", resultat: l.length ? "favorable" : "neutre", detail: l.length ? l.join(", ") : "aucune langue recherchée déclarée" });
  }
  if (besoins.zones?.length && c.ville) {
    const z = besoins.zones.some(x => x.toLowerCase() === String(c.ville).toLowerCase());
    criteres.push({ code: "zone", libelle: "Zone d'intervention", resultat: z ? "favorable" : "neutre", detail: z ? `${c.ville} : zone couverte` : `${c.ville} : déplacements à discuter` });
  }
  if (c.type === "modele" && besoins.missionsModele?.length && Array.isArray(c.donnees?.missions_acceptees)) {
    const acceptees = c.donnees!.missions_acceptees as string[];
    const ok = besoins.missionsModele.filter(m => acceptees.includes(m));
    criteres.push({ code: "limites", libelle: "Missions proposées ↔ missions acceptées et limites", resultat: ok.length ? "favorable" : "defavorable", detail: ok.length ? `missions compatibles : ${ok.join(", ")} (limites déclarées respectées)` : "aucune mission actuelle n'entre dans ce que la personne accepte" });
  }
  const n = (r: Critere["resultat"]) => criteres.filter(x => x.resultat === r).length;
  let statut: StatutPropose;
  if (n("bloquant") || manquants.length) statut = "incomplet";
  else if (n("defavorable")) statut = "en_attente";
  else if (n("favorable") >= 4) statut = "preselectionne";
  else if (n("favorable") >= 2) statut = "a_contacter";
  else statut = "a_analyser";
  const LIB: Record<StatutPropose, string> = { incomplet: "Dossier incomplet", a_analyser: "À analyser", a_contacter: "À contacter", entretien: "Entretien à programmer", preselectionne: "Présélectionné", en_attente: "En attente" };
  const raisons = criteres.filter(x => x.resultat !== "neutre").map(x => `${x.libelle} : ${x.detail}`);
  const explication = `Proposition « ${LIB[statut]} » (non décisionnelle, critères ${VERSION_CRITERES}). ${raisons.length ? raisons.join(" ; ") + "." : "Aucun critère déterminant : examen humain."} La décision finale appartient à une personne habilitée.`;
  return { statut_propose: statut, criteres, manquants, explication, version_criteres: VERSION_CRITERES, ia_utilisee: false };
}
