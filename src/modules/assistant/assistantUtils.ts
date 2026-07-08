// ═══════════════════════════════════════════════════════════
// assistantUtils.ts — Utilitaires Bellaïa IA LOT IX-A
// Helpers purs : formatage, IDs, classification, résumés
// src/modules/assistant/assistantUtils.ts
// Aucune dépendance React ni Supabase
// ═══════════════════════════════════════════════════════════
import type {
  DomaineIA, TypeIntention, ActionProposee,
  TacheMemoire, BrouillonMemoire, Message,
} from "./assistantTypes";

// ══════════════════════════════════════════════════════════
// GÉNÉRATION D'IDs
// ══════════════════════════════════════════════════════════
export function genMsgId(): string {
  return "msg_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

export function genActionId(): string {
  return "act_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

export function genConvId(): string {
  return "conv_" + Date.now().toString(36);
}

// ══════════════════════════════════════════════════════════
// FORMATAGE
// ══════════════════════════════════════════════════════════
export function now(): string {
  return new Date().toISOString();
}

export function fmtDateHeure(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function tronquer(texte: string, max = 200): string {
  if (texte.length <= max) return texte;
  return texte.slice(0, max - 1) + "…";
}

// ══════════════════════════════════════════════════════════
// LIBELLÉS DOMAINES
// ══════════════════════════════════════════════════════════
export const DOMAINE_LABELS: Record<DomaineIA, string> = {
  FOOD:     "🍃 Bella'Food",
  EVENTS:   "✨ Bella'Events",
  BSH:      "💜 Bella'Secret Home",
  ODYSSEE:  "💆 Bella'Odyssée",
  EDITIONS: "📚 Bella'Studio Éditions",
  MOTIPY:   "🌿 Mo Ti-Péyi",
  VILO:     "🤝 Vilo'Assistance",
  ERP:      "⚙ ERP Bellaïa",
  COMM:     "📣 Communication",
  GENERAL:  "🌐 Général",
};

export const INTENTION_LABELS: Record<TypeIntention, string> = {
  RECHERCHE:         "🔍 Recherche",
  ANALYSE:           "📊 Analyse",
  RESUME:            "📝 Résumé",
  EXPLICATION:       "💡 Explication",
  CREER_CONTENU:     "✍ Création de contenu",
  CREER_DOCUMENT:    "📄 Création de document",
  CREER_PRODUIT:     "🛍 Fiche produit",
  CREER_RECETTE:     "🍰 Nouvelle recette",
  PREPARER_LISTE:    "📋 Liste",
  PREPARER_PLANNING: "📅 Planning",
  PREPARER_RAPPORT:  "📈 Rapport",
  ACTION_ERP:        "⚙ Action ERP",
  CREER_POST_SOCIAL: "📱 Post réseaux sociaux",
  CREER_MESSAGE_WA:  "💬 Message WhatsApp",
  VERIFIER_COHERENCE:"✅ Vérification qualité",
  CORRIGER_TEXTE:    "✏ Correction",
  INCONNU:           "❓ Non identifié",
};

// ══════════════════════════════════════════════════════════
// CONSTRUCTION DE MESSAGES
// ══════════════════════════════════════════════════════════
export function msgUser(contenu: string, domaine: DomaineIA = "GENERAL"): Message {
  return { id: genMsgId(), role:"user", contenu, domaine, timestamp: now() };
}

export function msgAssistant(
  contenu: string,
  domaine: DomaineIA = "GENERAL",
  suggestions?: string[]
): Message {
  return { id: genMsgId(), role:"assistant", contenu, domaine, timestamp: now(), suggestions };
}

export function msgSysteme(contenu: string): Message {
  return { id: genMsgId(), role:"system", contenu, timestamp: now() };
}

// ══════════════════════════════════════════════════════════
// RÉSUMÉ DE CONVERSATION
// ══════════════════════════════════════════════════════════
export function resumerConversation(messages: Message[], maxMessages = 10): string {
  const derniers = messages.slice(-maxMessages);
  return derniers.map(m => {
    const role = m.role === "user" ? "Fondatrice" : "Bellaïa";
    return `${role}: ${tronquer(m.contenu, 120)}`;
  }).join("\n");
}

// ══════════════════════════════════════════════════════════
// RÉSUMÉ D'ACTION
// ══════════════════════════════════════════════════════════
export function resumerAction(a: ActionProposee): string {
  const risqueEmoji = { faible:"🟢", moyen:"🟡", eleve:"🔴" };
  return `${risqueEmoji[a.risque]} ${a.libelle}\n${a.description}`;
}

export function actionsEnAttente(actions: ActionProposee[]): ActionProposee[] {
  return actions.filter(a => a.statut === "en_attente_validation");
}

// ══════════════════════════════════════════════════════════
// TÂCHES MÉMOIRE
// ══════════════════════════════════════════════════════════
export function creerTache(
  libelle: string,
  domaine: DomaineIA,
  priorite: TacheMemoire["priorite"] = "moyenne",
  echeance?: string
): TacheMemoire {
  return {
    id:       "tache_" + Date.now().toString(36),
    libelle,
    domaine,
    priorite,
    creeLe:   now(),
    echeance,
    faite:    false,
  };
}

export function creerBrouillon(
  titre: string,
  contenu: string,
  domaine: DomaineIA,
  type: BrouillonMemoire["type"] = "texte"
): BrouillonMemoire {
  const ts = now();
  return {
    id:          "brouillon_" + Date.now().toString(36),
    titre,
    contenu,
    domaine,
    type,
    creeLe:      ts,
    misAJourLe:  ts,
  };
}

// ══════════════════════════════════════════════════════════
// SUGGESTIONS DE SUIVI
// Génère des questions de suivi contextuelles par domaine
// ══════════════════════════════════════════════════════════
export const SUGGESTIONS_PAR_DOMAINE: Record<DomaineIA, string[]> = {
  FOOD: [
    "Quelle est ma recette la plus rentable ?",
    "Quels stocks arrivent à péremption ?",
    "Prépare une liste de courses pour cette semaine.",
    "Quelles productions dois-je lancer en priorité ?",
  ],
  EVENTS: [
    "Quels devis sont en attente de réponse ?",
    "Quels événements sont prévus ce mois ?",
    "Prépare un devis pour une décoration anniversaire.",
    "Quels clients n'ont pas encore payé leur acompte ?",
  ],
  BSH: [
    "Quels produits BSH sont en rupture ?",
    "Rédige une description pour un nouveau produit.",
    "Crée un post Instagram pour la collection actuelle.",
    "Aide-moi à développer le chapitre suivant.",
  ],
  ODYSSEE: [
    "Quelles prestations proposer pour la semaine ?",
    "Rédige une fiche service pour les extensions de cils.",
    "Crée un post de présentation des soins du visage.",
  ],
  EDITIONS: [
    "Aide-moi à structurer cet ebook.",
    "Génère une description de formation.",
    "Crée un plan de formation sur ce thème.",
  ],
  MOTIPY: [
    "Crée une histoire pour les enfants de PS.",
    "Génère un exercice de calcul adapté au CP.",
    "Aide-moi à décrire un personnage de Mo Ti-Péyi.",
    "Propose une comptine sur la nature guyanaise.",
  ],
  VILO: [
    "Quelles missions Vilo sont planifiées ?",
    "Rédige un courrier pour un client Vilo.",
  ],
  ERP: [
    "Quel est mon chiffre d'affaires ce mois ?",
    "Quels clients n'ont pas payé ?",
    "Résume l'état de tous mes modules.",
    "Quelles sont les alertes stock en cours ?",
  ],
  COMM: [
    "Crée un post Facebook pour cette prestation.",
    "Génère un calendrier éditorial pour ce mois.",
    "Propose des hashtags pour Bella'Food.",
    "Rédige un message WhatsApp de relance client.",
  ],
  GENERAL: [
    "Que puis-je faire pour toi aujourd'hui ?",
    "Sur quel module veux-tu travailler ?",
    "Résume l'état de Bella'Studio.",
  ],
};

export function getSuggestions(domaine: DomaineIA, nb = 3): string[] {
  const liste = SUGGESTIONS_PAR_DOMAINE[domaine] || SUGGESTIONS_PAR_DOMAINE.GENERAL;
  // Prendre 3 suggestions aléatoires
  const melange = [...liste].sort(() => Math.random() - 0.5);
  return melange.slice(0, nb);
}

// ══════════════════════════════════════════════════════════
// VÉRIFICATION GOUVERNANCE
// ══════════════════════════════════════════════════════════

/** Les intentions qui nécessitent TOUJOURS une validation explicite */
const INTENTIONS_A_VALIDER: TypeIntention[] = [
  "ACTION_ERP", "CREER_DOCUMENT", "CREER_PRODUIT",
  "CREER_RECETTE", "CREER_MESSAGE_WA",
];

export function requiertValidation(intention: TypeIntention): boolean {
  return INTENTIONS_A_VALIDER.includes(intention);
}

/** Message de confirmation de gouvernance à afficher avant toute action */
export function messageValidation(libelle: string): string {
  return `⚠️ **Validation requise**\n\nBellaïa va : *${libelle}*\n\nCette action modifie les données. Confirmes-tu ?`;
}
