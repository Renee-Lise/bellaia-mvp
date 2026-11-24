// ═══════════════════════════════════════════════════════════
// BSH Private Club : les huit univers et THE RED ROOM — Le club des tentations.
// Textes repris mot pour mot du cahier des charges de la fondatrice (24/11/2026).
// Contenu fictif, suggestif et non explicite. Aucune épreuve n'exige de confidence
// intime, de coordonnée ni de photographie ; chaque épreuve peut être passée.
// ═══════════════════════════════════════════════════════════
import type { Scenario } from "./moteurNarratif";

export type UniversClub = {
  id: string;
  nom: string;
  accroche: string;
  ambiance: string;
  couleurs: [string, string];
  acces: "membres_adultes" | "membres_autorises" | "duo_prive";
  statut: "jouable" | "existant" | "en_preparation";
  /** Univers déjà développé ailleurs dans BSH : on le relie, on ne le recrée pas. */
  lienExistant?: string;
};

export const UNIVERS_CLUB: UniversClub[] = [
  { id: "the_red_room", nom: "THE RED ROOM", accroche: "Le club des tentations", ambiance: "Velours rouge, lumières tamisées, portes mystérieuses", couleurs: ["#5a0f1c", "#c9a84c"], acces: "membres_adultes", statut: "jouable" },
  { id: "dark_romance", nom: "DARK ROMANCE", accroche: "Rivalités, secrets et bals masqués", ambiance: "Noir, roses fanées, chandelles", couleurs: ["#1a0a10", "#b76e79"], acces: "membres_adultes", statut: "en_preparation" },
  { id: "wild_saloon", nom: "WILD SALOON", accroche: "Western glamour et duels de répartie", ambiance: "Bois patiné, cuir, néons ambrés", couleurs: ["#3b1f12", "#d4a05a"], acces: "membres_adultes", statut: "en_preparation" },
  { id: "cabaret_rouge", nom: "CABARET ROUGE", accroche: "Sous les projecteurs", ambiance: "Rideaux pourpres, plumes, scène dorée", couleurs: ["#6b0f1a", "#e0b65a"], acces: "membres_adultes", statut: "en_preparation" },
  { id: "midnight_boutique", nom: "MIDNIGHT BOUTIQUE", accroche: "La boutique des secrets", ambiance: "Vitrines feutrées, dentelle, parfums", couleurs: ["#2a0d1e", "#c48b9f"], acces: "membres_adultes", statut: "en_preparation" },
  { id: "masquerade", nom: "MASQUERADE", accroche: "Personne ne sait qui vous êtes", ambiance: "Masques, miroirs, valse lente", couleurs: ["#120a14", "#c9a84c"], acces: "membres_adultes", statut: "en_preparation" },
  { id: "secret_duo", nom: "SECRET DUO", accroche: "L'univers des couples", ambiance: "Intimité, complicité, à deux", couleurs: ["#3d0b1b", "#d9a3ae"], acces: "duo_prive", statut: "existant", lienExistant: "/bsh/secret-duo" },
  { id: "golden_room", nom: "GOLDEN ROOM", accroche: "Le salon des membres autorisés", ambiance: "Or, marbre noir, champagne fictif", couleurs: ["#1a1408", "#f0c96a"], acces: "membres_autorises", statut: "en_preparation" },
];

export const PERSONNAGES_RED_ROOM = [
  "La Cowgirl insolente",
  "Le Gentleman aux intentions mystérieuses",
  "La Reine du pole dance",
  "Le Cowboy indomptable",
  "La Femme fatale",
  "Le Propriétaire énigmatique du club",
  "La Vendeuse du boudoir secret",
  "L’Inconnu au charme dangereux",
  "La Rebelle intouchable",
  "Le Séducteur imprévisible",
];

export const OBJETS_BOUTIQUE = [
  "Masque en dentelle noire",
  "Parfum mystérieux",
  "Enveloppe cachetée",
  "Menottes décoratives dorées",
  "Rose noire",
  "Clé sans serrure apparente",
];

export const REPLIQUES_ENCHERES = [
  "Tu parles beaucoup pour quelqu’un qui rougit aussi facilement.",
  "Ton assurance est intéressante… mais est-elle justifiée ?",
  "Je ne suis pas facilement impressionnable.",
  "Tu crois vraiment être mon genre ?",
  "Donne-moi une bonne raison de prolonger cette conversation.",
];

export const MOTS_INTERDITS_CABARET = ["sexy", "beau", "belle", "magnifique", "attirant", "attirante"];

export const DISTINCTIONS_RED_ROOM = [
  { id: "cowgirl_insolente", nom: "Cowgirl la plus insolente", badge: "🤠" },
  { id: "gentleman_mysterieux", nom: "Gentleman le plus mystérieux", badge: "🎩" },
  { id: "provocation", nom: "Reine ou Roi de la provocation", badge: "👑" },
  { id: "meilleure_repartie", nom: "Meilleure répartie", badge: "💬" },
  { id: "dark_romance", nom: "Personnage le plus Dark Romance", badge: "🥀" },
  { id: "charme_redoutable", nom: "Charme le plus redoutable", badge: "✨" },
  { id: "roi_reine_red_room", nom: "Roi ou Reine de la Red Room", badge: "🌹" },
];

const opt = (l: string[], prefixe: string) => l.map((libelle, i) => ({ id: `${prefixe}${i + 1}`, libelle }));

export const REGLES_CLUB = [
  "Réservé aux adultes autorisés. Pseudonymes uniquement.",
  "Contenus fictifs, suggestifs et non explicites. Aucun contenu sexuel explicite, aucune mise en scène impliquant des mineurs.",
  "Le consentement prime : refuser, passer une épreuve ou quitter la session est toujours possible, sans pénalité.",
  "Ne jamais demander ni divulguer de confidences intimes, de coordonnées personnelles ou de photographies privées.",
  "Aucune pression, aucun harcèlement, aucune glorification de la contrainte. Signalement et blocage à tout moment.",
];

export const RED_ROOM: Scenario = {
  id: "the_red_room_s1",
  version: 1,
  titre: "THE RED ROOM — Le club des tentations",
  univers: "the_red_room",
  intensite: 6,
  dureeMinutes: [60, 90],
  participants: { min: 2, max: 24 },
  regles: REGLES_CLUB,
  statut: "en_revision",
  origine: "manuel",
  validePar: null,
  distinctions: DISTINCTIONS_RED_ROOM,
  actes: [
    {
      id: "acte_1", numero: 1, titre: "Personne n’est innocent", decor: "Entrée du club",
      situation: "Les portes de la Red Room s’ouvrent. Chacun choisit un pseudonyme, un personnage et se présente.",
      epreuve: { type: "choix_personnage", options: opt(PERSONNAGES_RED_ROOM, "p"), presentation: { minCaracteres: 10, maxCaracteres: 400 } },
      indices: ["Présentez votre personnage, pas vous-même : rien de personnel n’est demandé.", "Une attitude, un secret fictif, une entrée remarquée."],
      suivant: "acte_2", points: 10,
    },
    {
      id: "acte_2", numero: 2, titre: "Le duel du saloon", decor: "Wild Saloon",
      situation: "Une personne s’approche du joueur et lui dit :",
      replique: "Tu as beaucoup d’assurance pour quelqu’un qui n’a pas encore réussi à m’impressionner.",
      epreuve: { type: "reponse_libre", consigne: "Inventez une réplique originale, avec charme, humour et insolence.", contraintes: { minCaracteres: 5, maxCaracteres: 280 } },
      indices: ["Retournez le compliment… ou le défi.", "L’humour désarme mieux que l’arrogance."],
      chronoSecondes: 300, suivant: "acte_3", points: 10,
    },
    {
      id: "acte_3", numero: 3, titre: "Sous les projecteurs", decor: "Cabaret Rouge",
      situation: "Dans un cabaret fictif, après une performance artistique, le personnage demande :",
      replique: "Alors, c’est la performance qui t’a impressionné ou la personne derrière ?",
      epreuve: { type: "reponse_libre", consigne: "Répondez sans utiliser les mots : sexy, beau, belle, magnifique, attirant ou attirante.", contraintes: { motsInterdits: MOTS_INTERDITS_CABARET, minCaracteres: 5, maxCaracteres: 280 } },
      indices: ["Parlez d’un détail : un geste, un regard, un silence.", "Les métaphores sont autorisées."],
      chronoSecondes: 300, suivant: "acte_4", points: 10,
    },
    {
      id: "acte_4", numero: 4, titre: "La boutique des secrets", decor: "Midnight Boutique",
      situation: "Six objets attendent sur le comptoir de velours.",
      epreuve: { type: "choix_objet", consigne: "Choisissez un objet et imaginez une invitation mystérieuse de trois phrases maximum, sans pression ni obligation.", options: opt(OBJETS_BOUTIQUE, "o"), contraintes: { maxPhrases: 3, minCaracteres: 10, maxCaracteres: 400 } },
      indices: ["Une invitation se refuse : laissez toujours une porte de sortie.", "Le mystère tient à ce que vous ne dites pas."],
      evenements: [{ id: "ev_vitrine", titre: "La vitrine s’éteint", texte: "Une lumière vacille : un objet a changé de place. Les joueurs peuvent changer d’objet." }],
      chronoSecondes: 300, suivant: "acte_5", points: 10,
    },
    {
      id: "acte_5", numero: 5, titre: "Le bal des rivaux", decor: "Masquerade",
      situation: "Deux rivaux se retrouvent dans un bal masqué. L’un propose une danse en lançant :",
      replique: "Une danse. Ensuite, tu pourras retourner faire semblant de ne pas m’apprécier.",
      epreuve: { type: "decision", consigne: "Acceptez, refusez ou répondez avec humour et provocation. Toutes les décisions sont respectées.", options: [{ id: "accepter", libelle: "Accepter la danse" }, { id: "refuser", libelle: "Refuser poliment" }, { id: "humour", libelle: "Répondre avec humour et provocation" }], texteFacultatif: { maxCaracteres: 280 } },
      // La décision majoritaire colore l'acte suivant, sans jamais pénaliser personne.
      embranchements: [{ si: { acte: "acte_5", choix: "refuser" }, aller: "acte_6_refus" }],
      suivant: "acte_6", points: 10,
    },
    {
      id: "acte_6", numero: 6, titre: "Les enchères de la répartie", decor: "The Red Room",
      situation: "La musique s’arrête. Le commissaire-priseur de la Red Room met aux enchères cinq répliques.",
      epreuve: { type: "choix_replique", consigne: "Choisissez une réplique et inventez votre réponse. Une phase de votes s’ouvre ensuite.", options: opt(REPLIQUES_ENCHERES, "r"), contraintes: { minCaracteres: 5, maxCaracteres: 280 } },
      chronoSecondes: 420, fin: true, points: 10,
    },
    {
      id: "acte_6_refus", numero: 6, titre: "Les enchères de la répartie", decor: "The Red Room — balcon",
      situation: "Le refus a été respecté : la salle applaudit l’élégance. Le commissaire-priseur ouvre les enchères depuis le balcon.",
      epreuve: { type: "choix_replique", consigne: "Choisissez une réplique et inventez votre réponse. Une phase de votes s’ouvre ensuite.", options: opt(REPLIQUES_ENCHERES, "r"), contraintes: { minCaracteres: 5, maxCaracteres: 280 } },
      chronoSecondes: 420, fin: true, points: 10,
    },
  ],
};

/** Programme de la première session (heure de Guyane, America/Cayenne = UTC−3, sans heure d'été). */
export const PROGRAMME_PREMIERE_SESSION = [
  { heure: "14:45", etape: "Annonce", acte: null },
  { heure: "15:00", etape: "Ouverture", acte: null },
  { heure: "15:05", etape: "Choix des personnages", acte: "acte_1" },
  { heure: "15:15", etape: "Duel du saloon", acte: "acte_2" },
  { heure: "15:30", etape: "Cabaret des regards", acte: "acte_3" },
  { heure: "15:45", etape: "Boutique des secrets", acte: "acte_4" },
  { heure: "16:00", etape: "Bal des rivaux", acte: "acte_5" },
  { heure: "16:15", etape: "Enchères de la répartie", acte: "acte_6" },
  { heure: "16:30", etape: "Votes et remise des titres", acte: null },
] as const;

export type EtapeProgramme = { heure: string; etape: string; acte: string | null; debut: string; passee: boolean };

/** Programme daté (horaires modifiables). Une date passée n'est jamais présentée comme à venir :
 *  `passee` = true ; on la garde en historique ou on la reprogramme, sans inventer de participation. */
export function programmeDate(dateCayenne: string, maintenant: Date = new Date(), horaires: readonly { heure: string; etape: string; acte: string | null }[] = PROGRAMME_PREMIERE_SESSION): EtapeProgramme[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCayenne)) throw new Error("Date attendue au format AAAA-MM-JJ.");
  return horaires.map(h => {
    if (!/^\d{2}:\d{2}$/.test(h.heure)) throw new Error(`Heure invalide : ${h.heure}`);
    const debut = new Date(`${dateCayenne}T${h.heure}:00-03:00`).toISOString();
    return { ...h, debut, passee: new Date(debut).getTime() < maintenant.getTime() };
  });
}

/** Décale tout le programme vers une nouvelle date (même enchaînement horaire). */
export function reprogrammer(nouvelleDate: string, maintenant: Date = new Date()): EtapeProgramme[] {
  const p = programmeDate(nouvelleDate, maintenant);
  if (p.some(x => x.passee)) throw new Error("La nouvelle date est (en partie) passée.");
  return p;
}

/** Texte d'annonce à copier dans WhatsApp (aucun envoi automatique). */
export function texteAnnonce(dateLisible: string, lien: string): string {
  return [
    "🌹 THE RED ROOM — Le club des tentations",
    `${dateLisible} · ouverture à 15 h 00 (heure de Guyane)`,
    "Six actes, dix personnages, des titres à remporter. Pseudonymes, jeu fictif et non explicite, réservé aux adultes membres.",
    "Vous pouvez passer une épreuve ou quitter la session à tout moment.",
    lien,
  ].join("\n");
}
