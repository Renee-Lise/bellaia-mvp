// ═══════════════════════════════════════════════════════════
// BSH Secret World : fonctions communautaires des hôtes (nominations) et masques signature.
// Règles pures, miroir exact des contrôles serveur de la migration 0144
// (bsh_hote_peut, bsh_nomination_repondre, déclencheur des apparences).
// Les fonctions BSH ne sont PAS des rôles administratifs Bellaïa : elles ne donnent
// accès à aucune donnée commerciale, à aucun paramètre ni aux conversations privées.
// ═══════════════════════════════════════════════════════════

export const FONCTIONS_HOTE = {
  hote_principal: { nom: "Hôte principal", badge: "💎", libelleBadge: "Diamant doré" },
  hote_titulaire: { nom: "Hôte titulaire", badge: "🔑", libelleBadge: "Clé dorée" },
  hote_remplacant: { nom: "Hôte remplaçant", badge: "🗝️", libelleBadge: "Clé argentée" },
  hote_evenementiel: { nom: "Hôte événementiel", badge: "🎭", libelleBadge: "Masque de bal" },
  moderateur: { nom: "Modérateur", badge: "🛡️", libelleBadge: "Bouclier" },
} as const;
export type FonctionHote = keyof typeof FONCTIONS_HOTE;

/** Permissions qu'une nomination PEUT accorder (catalogue fermé, identique à la contrainte SQL). */
export const PERMISSIONS_HOTE = {
  accueillir: "Accueillir les joueurs",
  animer: "Animer une salle",
  ouvrir_session: "Ouvrir une session de jeu",
  lancer_actes: "Lancer les actes de la Red Room",
  organiser_votes: "Organiser des votes",
  programmer: "Programmer des animations",
  recompenser: "Distribuer des récompenses autorisées",
  moderer_public: "Modérer les conversations publiques",
  signalements_mission: "Gérer les signalements de sa mission",
  fermer_session: "Fermer une session",
  compte_rendu: "Rédiger un compte rendu",
} as const;
export type PermissionHote = keyof typeof PERMISSIONS_HOTE;

/** Jamais attribuables à un hôte, quelle que soit la nomination. */
export const INTERDITS_HOTE = ["nommer_hotes", "etendre_permissions", "lire_conversations_privees", "donnees_commerciales", "parametres_sensibles", "fonctions_fondatrice", "accessoires_signature"] as const;

export const PERMISSIONS_PAR_FONCTION: Record<FonctionHote, PermissionHote[]> = {
  hote_principal: ["accueillir", "animer", "ouvrir_session", "lancer_actes", "organiser_votes", "programmer", "recompenser", "moderer_public", "signalements_mission", "fermer_session", "compte_rendu"],
  hote_titulaire: ["accueillir", "animer", "ouvrir_session", "lancer_actes", "organiser_votes", "moderer_public", "fermer_session", "compte_rendu"],
  hote_remplacant: ["accueillir", "animer", "ouvrir_session", "lancer_actes", "organiser_votes", "fermer_session", "compte_rendu"],
  hote_evenementiel: ["accueillir", "animer", "lancer_actes", "organiser_votes", "compte_rendu"],
  moderateur: ["moderer_public", "signalements_mission", "compte_rendu"],
};

export type Duree = { type: "session" | "evenement" | "24h" | "7j" | "30j" | "personnalisee" | "illimitee"; fin?: string };

export type StatutNomination = "proposee" | "acceptee" | "refusee" | "suspendue" | "revoquee" | "expiree";

export type Nomination = {
  id: string;
  userId: string;
  fonctions: FonctionHote[];
  permissions: PermissionHote[];
  salles: string[];             // ["*"] = tout BSH Secret World
  debut: string;
  fin: string | null;
  statut: StatutNomination;
  proposePar: string;
  sessionId?: string | null;
  evenementId?: string | null;
};

/** Date de fin d'un mandat. Session et événement : fin fournie par la session ou l'événement. */
export function finMandat(d: Duree, debut: Date): string | null {
  const plus = (h: number) => new Date(debut.getTime() + h * 3600e3).toISOString();
  switch (d.type) {
    case "24h": return plus(24);
    case "7j": return plus(24 * 7);
    case "30j": return plus(24 * 30);
    case "illimitee": return null;
    case "session": case "evenement": case "personnalisee":
      if (!d.fin || isNaN(Date.parse(d.fin))) throw new Error("Une date de fin est requise pour cette durée.");
      if (Date.parse(d.fin) <= debut.getTime()) throw new Error("La fin du mandat doit suivre son début.");
      return new Date(d.fin).toISOString();
  }
}

/** Contrôle d'une proposition avant envoi (la base refait le même contrôle). */
export function controlerProposition(n: Pick<Nomination, "fonctions" | "permissions" | "salles" | "userId" | "proposePar">, roleProposant: string): string[] {
  const e: string[] = [];
  if (roleProposant !== "fondatrice") e.push("Seule la fondatrice peut proposer une nomination.");
  if (n.userId === n.proposePar) e.push("On ne peut pas se nommer soi-même.");
  if (!n.fonctions.length) e.push("Choisissez au moins une fonction.");
  for (const f of n.fonctions) if (!(f in FONCTIONS_HOTE)) e.push(`Fonction inconnue : ${f}.`);
  for (const p of n.permissions as string[]) {
    if ((INTERDITS_HOTE as readonly string[]).includes(p)) e.push(`Permission interdite aux hôtes : ${p}.`);
    else if (!(p in PERMISSIONS_HOTE)) e.push(`Permission inconnue : ${p}.`);
  }
  if (!n.salles.length) e.push("Attribuez au moins une salle (ou tout le monde).");
  return e;
}

/** Statut effectif à un instant donné (l'expiration est automatique). */
export function statutEffectif(n: Nomination, maintenant: Date = new Date()): StatutNomination {
  if (n.statut === "acceptee" && n.fin && Date.parse(n.fin) <= maintenant.getTime()) return "expiree";
  return n.statut;
}

/** Réponse de la personne nommée : seule elle peut accepter ou refuser, une seule fois. */
export function repondre(n: Nomination, parUserId: string, accepte: boolean, maintenant: Date = new Date()): { ok: true; nomination: Nomination } | { ok: false; erreur: string } {
  if (parUserId !== n.userId) return { ok: false, erreur: "Seule la personne nommée peut répondre." };
  if (n.statut !== "proposee") return { ok: false, erreur: "Cette proposition n'est plus en attente." };
  if (n.fin && Date.parse(n.fin) <= maintenant.getTime()) return { ok: false, erreur: "Proposition expirée." };
  return { ok: true, nomination: { ...n, statut: accepte ? "acceptee" : "refusee" } };
}

/** L'hôte peut-il faire `permission` dans `salle` ? (miroir de public.bsh_hote_peut) */
export function hotePeut(nominations: Nomination[], userId: string, permission: string, salle: string, maintenant: Date = new Date()): boolean {
  if ((INTERDITS_HOTE as readonly string[]).includes(permission)) return false;
  return nominations.some(n => n.userId === userId && statutEffectif(n, maintenant) === "acceptee" && Date.parse(n.debut) <= maintenant.getTime()
    && (n.permissions as string[]).includes(permission) && (n.salles.includes("*") || n.salles.includes(salle)));
}

/** Badges visibles d'un joueur (ceux de ses nominations actives). Jamais le badge de la fondatrice. */
export function badgesActifs(nominations: Nomination[], userId: string, maintenant: Date = new Date()): { fonction: FonctionHote; badge: string; nom: string }[] {
  const f = new Set<FonctionHote>();
  for (const n of nominations) if (n.userId === userId && statutEffectif(n, maintenant) === "acceptee") n.fonctions.forEach(x => f.add(x));
  return [...f].map(x => ({ fonction: x, badge: FONCTIONS_HOTE[x].badge, nom: FONCTIONS_HOTE[x].nom }));
}

// ── Masques signature de la fondatrice ───────────────────────────────────────
export const MASQUES_SIGNATURE = [
  { id: "masque_black_secret", nom: "Black Secret", description: "Dentelle noire", couleurs: ["#0d0d0d", "#2b2b2b"] },
  { id: "masque_red_mystery", nom: "Red Mystery", description: "Dentelle rouge bordeaux", couleurs: ["#5a0f1c", "#8b1a2b"] },
  { id: "masque_golden_secret", nom: "Golden Secret", description: "Dentelle noire et dorée", couleurs: ["#0d0d0d", "#c9a84c"] },
] as const;

/** Un accessoire exclusif ne peut être porté que par la fondatrice. Le masque ne change ni le
 *  rôle, ni les permissions, ni le badge officiel : ceux-ci viennent du profil, jamais de l'apparence. */
export function apparenceAutorisee(apparence: { masque?: string | null; accessoires?: string[] }, estFondatrice: boolean, exclusifs: string[] = MASQUES_SIGNATURE.map(m => m.id)): string[] {
  const portes = [apparence.masque, ...(apparence.accessoires || [])].filter((x): x is string => !!x);
  const interdits = estFondatrice ? [] : portes.filter(p => exclusifs.includes(p) || p.startsWith("fondatrice_"));
  return interdits.map(p => `Accessoire réservé à la fondatrice : ${p}.`);
}
