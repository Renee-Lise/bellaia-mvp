// ═══════════════════════════════════════════════════════════
// Espace hôtes Bella'Secret Home — données et règles communes.
// Deux sources :
//  • « base » : tables de la migration 0128 (dès qu'elle est appliquée) ;
//  • « simulation » : jeu d'exemple local, clairement signalé, utilisé
//    tant que 0128 n'est pas appliquée. Rien n'est écrit en base.
// Règles (identiques aux garde-fous SQL de 0128) : une mission réelle ne
// peut être confirmée que pour un hôte autorisé (majorité, charte,
// autorisation fondatrice) ; une rémunération reste en simulation tant
// que statut juridique, conditions et autorisation ne sont pas validés ;
// aucun paiement n'est jamais déclenché par l'application.
// ═══════════════════════════════════════════════════════════
import { sbSelect, sbRpc, SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";

export const BSH = { noir: "#0b0709", noir2: "#16090d", bordeaux: "#3a0f1c", or: "#c6a15b", orClair: "#e6c98f", rose: "#d39aa8", roseDoux: "#f1d3da", texte: "#f6ece6", doux: "rgba(246,236,230,0.62)", ligne: "rgba(198,161,91,0.22)", ok: "#7fd6a4", alerte: "#f0a35e", rouge: "#f07b7b" };
export const SERIF = "Georgia, 'Times New Roman', serif";
export const SANS = "system-ui, -apple-system, sans-serif";

export const TYPES_MISSION: [string, string, string][] = [
  ["accueil", "Accueil des participants", "🥂"], ["presentation", "Présentation des produits", "💎"], ["animation", "Animation événementielle", "🎭"],
  ["organisation", "Assistance à l'organisation", "📋"], ["moderation", "Modération des espaces communautaires", "🛡"], ["communication", "Communication", "📣"],
  ["invitations", "Gestion des invitations", "✉️"], ["installation", "Installation et rangement", "🕯"], ["commercial", "Assistance commerciale", "🛍"],
];
export const STATUT_MISSION: Record<string, [string, string]> = {
  proposee: ["Proposée", BSH.or], acceptee: ["Acceptée", BSH.ok], refusee: ["Refusée", BSH.rouge], confirmee: ["Confirmée", BSH.ok], terminee: ["Terminée", BSH.doux], annulee: ["Annulée", BSH.doux],
};

// ── Parcours d'intégration (10 étapes) : candidature ≠ compte actif ≠ autorisation de travailler
export const ETAPES: { cle: string; titre: string; detail: string; qui: "hote" | "fondatrice" }[] = [
  { cle: "candidature", titre: "Candidature", detail: "Présentation, motivations, expérience, disponibilités.", qui: "hote" },
  { cle: "majorite", titre: "Vérification de la majorité", detail: "Déclaration sur l'honneur puis contrôle d'une pièce d'identité par la fondatrice.", qui: "fondatrice" },
  { cle: "presentation", titre: "Découvrir Bella'Secret Home", detail: "L'univers, les soirées privées, l'esprit de bienveillance et de discrétion.", qui: "hote" },
  { cle: "charte", titre: "Charte BSH", detail: "Lecture intégrale et acceptation signée.", qui: "hote" },
  { cle: "confidentialite", titre: "Confidentialité et données", detail: "Secret absolu sur l'identité des invités, aucune photo, données protégées (RGPD).", qui: "hote" },
  { cle: "consentement", titre: "Consentement et comportement", detail: "Respect du consentement, tenue, alcool, signalement de toute situation à risque.", qui: "hote" },
  { cle: "formation", titre: "Formation aux missions", detail: "Modules courts par type de mission, avec quiz de validation.", qui: "hote" },
  { cle: "statut", titre: "Statut juridique et documents", detail: "Statut (auto-entrepreneur, salarié…), justificatifs, contrat ou convention.", qui: "fondatrice" },
  { cle: "validation", titre: "Validation par la fondatrice", detail: "Entretien et décision. Un compte actif ne vaut pas autorisation de travailler.", qui: "fondatrice" },
  { cle: "permissions", titre: "Activation des permissions", detail: "Missions réelles, invités, pointage, rémunération : chaque droit est activé individuellement.", qui: "fondatrice" },
];

export const FORMATIONS: { cle: string; titre: string; duree: string; points: string[] }[] = [
  { cle: "accueil", titre: "Accueillir avec élégance", duree: "8 min", points: ["Vérifier l'invitation sans afficher de nom", "Rappeler les règles de la soirée", "Orienter vers le vestiaire et l'espace détente"] },
  { cle: "discretion", titre: "Discrétion et confidentialité", duree: "6 min", points: ["Aucune photo, aucun nom en dehors de l'événement", "Ne jamais confirmer la présence d'une personne", "Signaler toute fuite à la fondatrice"] },
  { cle: "consentement", titre: "Consentement et sécurité", duree: "10 min", points: ["Le consentement est explicite et révocable", "Intervenir calmement, isoler, alerter", "Rédiger un compte rendu d'incident"] },
  { cle: "produits", titre: "Présenter les produits BSH", duree: "7 min", points: ["Hygiène et démonstration sans contact", "Conseils d'entretien", "Orientation vers la boutique, sans pression"] },
];

export const CHARTE: string[] = [
  "Respect absolu du consentement de chaque personne, à tout moment.",
  "Discrétion totale : aucune information sur les invités ne sort de l'événement.",
  "Aucune photo, vidéo ni enregistrement sans accord écrit.",
  "Tenue et attitude professionnelles ; aucune consommation excessive pendant une mission.",
  "Signalement immédiat de toute situation à risque à la fondatrice.",
  "Les invitations et listes d'invités sont strictement confidentielles.",
  "Aucune mission réelle ni rémunération sans validation écrite de la fondatrice.",
];

// ── Jeu de simulation (exemples, aucune personne réelle)
const j = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
export function donneesSimulation() {
  const hotes = [
    { id: "h1", prenom: "Exemple A", pseudo_scene: "Velours", ville: "Cayenne", statut: "active", majeur_confirme: true, identite_verifiee: true, charte_signee_le: new Date().toISOString(), statut_juridique: "auto_entrepreneur", conditions_validees: false, autorise_missions: false, autorise_remuneration: false, competences: ["accueil", "animation"], langues: ["français", "créole"], permissions: { voir_invites: false, pointer_invites: false, voir_documents: true, messagerie: true }, etapes: ["candidature", "majorite", "presentation", "charte", "confidentialite", "consentement", "formation"] },
    { id: "h2", prenom: "Exemple B", pseudo_scene: "Saphir", ville: "Kourou", statut: "active", majeur_confirme: true, identite_verifiee: false, charte_signee_le: null, statut_juridique: "a_definir", conditions_validees: false, autorise_missions: false, autorise_remuneration: false, competences: ["presentation", "commercial"], langues: ["français", "portugais"], permissions: { voir_invites: false, pointer_invites: false, voir_documents: true, messagerie: true }, etapes: ["candidature", "majorite", "presentation"] },
    { id: "h3", prenom: "Exemple C", pseudo_scene: "Onyx", ville: "Sinnamary", statut: "active", majeur_confirme: false, identite_verifiee: false, charte_signee_le: null, statut_juridique: null, conditions_validees: false, autorise_missions: false, autorise_remuneration: false, competences: ["installation"], langues: ["français"], permissions: { voir_invites: false, pointer_invites: false, voir_documents: true, messagerie: true }, etapes: ["candidature"] },
  ];
  const evenements = [
    { id: "e1", nom: "Soirée Velours & Secrets", ico: "🕯", date_evenement: j(9), lieu: "Lieu privé — Cayenne", capacite: 24, statut: "actif" },
    { id: "e2", nom: "Atelier découverte boudoir", ico: "💎", date_evenement: j(16), lieu: "Salon partenaire — Kourou", capacite: 12, statut: "brouillon" },
  ];
  const missions = [
    { id: "m1", hote_id: "h1", evenement_id: "e1", titre: "Accueil des participants", role_mission: "accueil", date_mission: j(9), heure_debut: "19:30", heure_fin: "23:30", lieu: "Lieu privé — Cayenne", remuneration: 80, statut: "proposee", simulation: true, consignes: "Tenue noire élégante. Arrivée 30 min avant. Vérification discrète des invitations." },
    { id: "m2", hote_id: "h1", evenement_id: "e1", titre: "Installation et rangement", role_mission: "installation", date_mission: j(9), heure_debut: "17:30", heure_fin: "19:00", lieu: "Lieu privé — Cayenne", remuneration: 40, statut: "acceptee", simulation: true, consignes: "Bougies, voilages, coin vestiaire." },
    { id: "m3", hote_id: "h2", evenement_id: "e2", titre: "Présentation des produits", role_mission: "presentation", date_mission: j(16), heure_debut: "18:00", heure_fin: "21:00", lieu: "Salon partenaire — Kourou", remuneration: 60, statut: "proposee", simulation: true, consignes: "Démonstration sans contact, fiches produits fournies." },
  ];
  return {
    simulation: true,
    hotes, evenements, missions,
    candidatures: [
      { id: "c1", prenom: "Candidat·e D (exemple)", pseudo: "Ambre", ville: "Matoury", motivation: "Expérience en accueil événementiel, sens de la discrétion.", majeur_confirme: true, charte_acceptee: true, statut: "recue", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "c2", prenom: "Candidat·e E (exemple)", pseudo: "Opale", ville: "Cayenne", motivation: "Animatrice, souhaite rejoindre les soirées privées.", majeur_confirme: true, charte_acceptee: false, statut: "entretien", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
    disponibilites: [
      { id: "d1", hote_id: "h1", jour: j(9), debut: "17:00", fin: "23:59", type: "disponible" }, { id: "d2", hote_id: "h1", jour: j(16), debut: "18:00", fin: "22:00", type: "disponible" },
      { id: "d3", hote_id: "h2", jour: j(16), debut: "17:00", fin: "23:00", type: "disponible" }, { id: "d4", hote_id: "h2", jour: j(9), type: "indisponible" },
    ],
    presences: [] as any[],
    interventions: [{ id: "i1", hote_id: "h1", mission_id: null, type: "demande", contenu: "Peut-on prévoir un second vestiaire pour la soirée du mois prochain ?", traite: false, created_at: new Date().toISOString() }],
    documents: [
      { id: "doc1", hote_id: "h1", type: "charte", titre: "Charte Bella'Secret Home", statut: "signe" },
      { id: "doc2", hote_id: "h1", type: "confidentialite", titre: "Engagement de confidentialité", statut: "a_signer" },
      { id: "doc3", hote_id: "h1", type: "statut", titre: "Justificatif de statut (SIRET / URSSAF)", statut: "a_fournir" },
      { id: "doc4", hote_id: "h2", type: "identite", titre: "Pièce d'identité (contrôle de majorité)", statut: "a_fournir" },
    ],
    remunerations: [
      { id: "r1", hote_id: "h1", mission_id: "m2", libelle: "Installation — Soirée Velours & Secrets", montant: 40, statut: "prevue", simulation: true },
      { id: "r2", hote_id: "h1", mission_id: "m1", libelle: "Accueil — Soirée Velours & Secrets", montant: 80, statut: "prevue", simulation: true },
    ],
    messages: [
      { id: "ms1", hote_id: "h1", de_fondatrice: true, contenu: "Bienvenue dans l'équipe BSH ✨ Pensez à signer l'engagement de confidentialité avant la soirée.", lu: false, created_at: new Date(Date.now() - 3600_000).toISOString() },
      { id: "ms2", hote_id: "h1", de_fondatrice: false, contenu: "Merci ! Je le fais ce soir.", lu: true, created_at: new Date(Date.now() - 1800_000).toISOString() },
    ],
    invitations: [{ id: "inv1", evenement_id: "e1", nom_destinataire: "Invité·e n°1 (pseudonyme)", categorie: "VIP", code: "VLR-48K2", utilisee: false }, { id: "inv2", evenement_id: "e1", nom_destinataire: "Invité·e n°2 (pseudonyme)", categorie: "Standard", code: "VLR-77QD", utilisee: false }],
    historique: [{ le: new Date().toISOString(), action: "Mission « Installation et rangement » acceptée par Velours (simulation)" }],
  };
}
export type Donnees = ReturnType<typeof donneesSimulation>;

/** Contrôle d'une mission réelle (même règle que la base). */
export function peutConfirmerReelle(h: any): string | null {
  if (!h?.majeur_confirme) return "majorité non vérifiée";
  if (!h?.charte_signee_le) return "charte non signée";
  if (!h?.autorise_missions) return "autorisation de la fondatrice non accordée";
  return null;
}
export function peutValiderRemuneration(h: any, r: any, m?: any): string | null {
  if (r.simulation) return "rémunération en simulation";
  if (!h?.autorise_remuneration) return "rémunération non autorisée";
  if (!h?.conditions_validees) return "conditions non validées";
  if (!h?.statut_juridique || h.statut_juridique === "a_definir") return "statut juridique à définir";
  if (m && (m.simulation || m.statut !== "terminee")) return "mission non réelle ou non terminée";
  return null;
}

/** Charge la base si 0128 est appliquée, sinon le jeu de simulation. */
export async function chargerEspace(): Promise<Donnees> {
  try {
    const [cand] = await Promise.all([sbSelect("bsh_hotes_candidatures", "select=id&limit=1")]);
    if (!Array.isArray(cand)) throw new Error("absent");
  } catch { return donneesSimulation(); }
  const g = (t: string, q: string) => sbSelect<any>(t, q).catch(() => []);
  const [hotes, evenements, missions, candidatures, disponibilites, presences, interventions, documents, remunerations, messages, invitations] = await Promise.all([
    g("bsh_hotes", "select=*&order=prenom.asc"), g("bsh_evenements", "select=*&order=date_evenement.asc"), g("bsh_missions", "select=*&order=date_mission.asc"),
    g("bsh_hotes_candidatures", "select=*&order=created_at.desc"), g("bsh_hotes_disponibilites", "select=*&order=jour.asc"), g("bsh_missions_presences", "select=*"),
    g("bsh_interventions", "select=*&order=created_at.desc"), g("bsh_hotes_documents", "select=*&order=created_at.desc"), g("bsh_remunerations", "select=*&order=created_at.desc"),
    g("bsh_hotes_messages", "select=*&order=created_at.asc"), g("bsh_invitations", "select=id,evenement_id,nom_destinataire,categorie,code,utilisee,annulee"),
  ]);
  return { simulation: false, hotes: hotes.map((h: any) => ({ ...h, etapes: etapesDe(h) })), evenements, missions, candidatures, disponibilites, presences, interventions, documents, remunerations, messages, invitations, historique: [] } as any;
}
export function etapesDe(h: any): string[] {
  const e = ["candidature"];
  if (h.majeur_confirme) e.push("majorite");
  if (h.charte_signee_le) e.push("presentation", "charte", "confidentialite", "consentement");
  if (h.statut_juridique && h.statut_juridique !== "a_definir") e.push("statut");
  if (h.conditions_validees) e.push("formation", "validation");
  if (h.autorise_missions) e.push("permissions");
  return e;
}

/** Écritures (base uniquement ; en simulation, l'écran modifie son état local). */
export async function ecrire(table: string, id: string | null, patch: any) {
  const t = await jeton();
  const url = `${SB_URL}/rest/v1/${table}${id ? `?id=eq.${id}` : ""}`;
  const r = await fetch(url, { method: id ? "PATCH" : "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error((await r.text()).slice(0, 300));
  return (await r.json())[0];
}
export const rpc = sbRpc;
export const dateFr = (d?: string | null) => d ? new Date(d.length <= 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
