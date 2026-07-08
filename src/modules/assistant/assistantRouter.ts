// ═══════════════════════════════════════════════════════════
// assistantRouter.ts — Routeur Bellaïa IA LOT IX-A
// Détection domaine + intention par règles lexicales
// Fallback local si l'API IA n'est pas disponible
// src/modules/assistant/assistantRouter.ts
// ═══════════════════════════════════════════════════════════
import type {
  DomaineIA, TypeIntention, IntentionDetectee,
} from "./assistantTypes";
import { requiertValidation } from "./assistantUtils";

// ══════════════════════════════════════════════════════════
// DICTIONNAIRE LEXICAL PAR DOMAINE
// Mots-clés → domaine (ordre = priorité)
// ══════════════════════════════════════════════════════════
const LEXIQUE_DOMAINES: Array<{ domaine: DomaineIA; mots: string[] }> = [
  {
    domaine: "FOOD",
    mots: [
      "recette","gâteau","cake","cupcake","layer","bento","number","glace","sorbet",
      "jus","boisson","buffet","menu","traiteur","pâtisserie","ingrédient",
      "farine","sucre","beurre","chocolat","vanille","cuisson","production",
      "haccp","allergène","stock food","matière première","cours","liste courses",
      "fourrage","ganache","décoration comestible","saveur","parts","étages",
      "four","congélateur","réfrigérateur","ustensile","consommable food",
    ],
  },
  {
    domaine: "EVENTS",
    mots: [
      "événement","décoration","arche","ballon","anniversaire","mariage","baptême",
      "baby shower","communion","gender reveal","papeterie","invitation","programme",
      "marque-place","fanion","kit invité","vaisselle","mobilier","location",
      "fond de table","backdrop","nappage","coordination","planning event",
      "devis events","dossier event","prestation event","installation","démontage",
    ],
  },
  {
    domaine: "BSH",
    mots: [
      "lingerie","soutien","culotte","déshabillé","nuisette","corset","bikini",
      "accessoire adulte","parfum bsh","cosmétique bsh","roman","chapitre",
      "personnage","histoire","romance","série","bibliothèque","manuscrit",
      "belle'secret","bsh","bella secret","boutique adulte","collection bsh",
    ],
  },
  {
    domaine: "ODYSSEE",
    mots: [
      "extension","cils","maquillage","soin","visage","peau","épilation",
      "ongles","gel","semi-permanent","beauté","soins odyssée","prestation beauté",
      "lifting","microblading","sourcil","massage beauté",
    ],
  },
  {
    domaine: "EDITIONS",
    mots: [
      "ebook","formation","guide","programme","module formation","cours en ligne",
      "édition","publication","chapitre formation","support pédagogique adulte",
      "bella studio édition","plan de formation",
    ],
  },
  {
    domaine: "MOTIPY",
    mots: [
      "mo ti-péyi","ticolibri","ti-colibri","awa","awara","carte pédagogique",
      "jeu cartes","enfant","ps","cp","maternelle","primaire","guyane enfant",
      "comptine","imagier","cahier","exercice enfant","histoire enfant",
      "pensée computationnelle","algorithme enfant","scratch enfant",
    ],
  },
  {
    domaine: "VILO",
    mots: [
      "vilo","assistance","aide à domicile","bénéficiaire","mission aide",
      "courrier administratif","dossier aide","auxiliaire","accompagnement",
    ],
  },
  {
    domaine: "COMM",
    mots: [
      "instagram","facebook","tiktok","post","story","carrousel","hashtag",
      "caption","légende","réseaux sociaux","marketing","campagne","flyer",
      "affiche","bannière","promotion","offre","calendrier éditorial",
      "contenu","publication","audience","engagement","like","follower",
    ],
  },
  {
    domaine: "ERP",
    mots: [
      "client","crm","facture","devis","commande","paiement","acompte","solde",
      "stock","catalogue","workflow","fac-","cmd-","dev-","pay-","liv-","cli-",
      "chiffre d'affaires","ca","marge","bénéfice","perte","dépense",
      "comptabilité","trésorerie","rapport mensuel","bilan","dashboard",
      "dossier","référence","n'a pas payé","en attente paiement",
    ],
  },
];

// ══════════════════════════════════════════════════════════
// DICTIONNAIRE LEXICAL PAR INTENTION
// ══════════════════════════════════════════════════════════
const LEXIQUE_INTENTIONS: Array<{ intention: TypeIntention; mots: string[] }> = [
  {
    intention: "RECHERCHE",
    mots: ["retrouve","cherche","trouve","où est","qui est","quel est","liste des","montre-moi"],
  },
  {
    intention: "ANALYSE",
    mots: ["analyse","analysé","performance","rentabilité","comparer","compare","statistique","tendance"],
  },
  {
    intention: "RESUME",
    mots: ["résume","résumé","récapitule","synthèse","vue d'ensemble","en bref","état de"],
  },
  {
    intention: "EXPLICATION",
    mots: ["explique","pourquoi","comment","c'est quoi","que signifie","aide-moi à comprendre"],
  },
  {
    intention: "CREER_POST_SOCIAL",
    mots: ["post","publication","story","reel","tiktok","instagram","facebook","caption","légende"],
  },
  {
    intention: "CREER_MESSAGE_WA",
    mots: ["message whatsapp","wa","whatsapp","sms client","message client","relance client"],
  },
  {
    intention: "CREER_DOCUMENT",
    mots: ["devis","facture","contrat","courrier","email professionnel","bon de commande","document"],
  },
  {
    intention: "CREER_PRODUIT",
    mots: ["fiche produit","description produit","titre produit","nouveau produit","créer un produit"],
  },
  {
    intention: "CREER_RECETTE",
    mots: ["nouvelle recette","créer une recette","recette pour","ajouter la recette"],
  },
  {
    intention: "CREER_CONTENU",
    mots: ["rédige","écris","génère","crée un texte","propose un contenu","aide-moi à écrire"],
  },
  {
    intention: "PREPARER_LISTE",
    mots: ["liste de courses","liste d'achats","acheter","commander (matière)","produits à acheter"],
  },
  {
    intention: "PREPARER_PLANNING",
    mots: ["planning","programme la semaine","organise","planifie","agenda","calendrier"],
  },
  {
    intention: "PREPARER_RAPPORT",
    mots: ["rapport","bilan","synthèse mensuelle","rapport mensuel","tableau de bord","résumé mensuel"],
  },
  {
    intention: "ACTION_ERP",
    mots: ["créer le client","modifier","supprimer","envoyer","archiver","payer","enregistrer"],
  },
  {
    intention: "VERIFIER_COHERENCE",
    mots: ["vérifie","doublons","incohérence","erreur","problème","anomalie","cohérent"],
  },
  {
    intention: "CORRIGER_TEXTE",
    mots: ["corrige","reformule","améliore","orthographe","grammaire","reformuler","harmonise"],
  },
];

// ══════════════════════════════════════════════════════════
// ROUTEUR LOCAL (sans appel IA)
// Utilisé comme fallback ou pour pré-filtrer
// ══════════════════════════════════════════════════════════
export function routerLocal(texte: string): IntentionDetectee {
  const q = texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Détection domaine
  let domaine:  DomaineIA    = "GENERAL";
  let scoreMax = 0;
  const motsClesDetectes: string[] = [];

  for (const { domaine: d, mots } of LEXIQUE_DOMAINES) {
    const matches = mots.filter(m => q.includes(m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    if (matches.length > scoreMax) {
      scoreMax = matches.length;
      domaine  = d;
      motsClesDetectes.push(...matches);
    }
  }

  // Détection intention
  let intention:   TypeIntention = "INCONNU";
  let scoreIntent  = 0;

  for (const { intention: i, mots } of LEXIQUE_INTENTIONS) {
    const matches = mots.filter(m => q.includes(m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    if (matches.length > scoreIntent) {
      scoreIntent = matches.length;
      intention   = i;
    }
  }

  // Si rien détecté sur l'intention, inférer depuis la structure
  if (intention === "INCONNU") {
    if (q.startsWith("?") || q.includes("?"))  intention = "RECHERCHE";
    else if (q.length < 30)                     intention = "RECHERCHE";
    else                                         intention = "CREER_CONTENU";
  }

  const confiance = Math.min(95, scoreMax * 25 + (scoreMax > 0 ? 30 : 10));

  return {
    type: intention,
    domaine,
    confiance,
    requiertValidation: requiertValidation(intention),
    motsClesDetectes: [...new Set(motsClesDetectes)].slice(0, 5),
  };
}

// ══════════════════════════════════════════════════════════
// PARSING DE LA RÉPONSE DU ROUTEUR IA
// L'IA renvoie du JSON — on parse proprement
// ══════════════════════════════════════════════════════════
export function parseReponseRouteur(
  json: string,
  fallback: IntentionDetectee
): IntentionDetectee {
  try {
    const clean  = json.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      type:               parsed.intention   || fallback.type,
      domaine:            parsed.domaine     || fallback.domaine,
      confiance:          typeof parsed.confiance === "number"
                          ? parsed.confiance : fallback.confiance,
      requiertValidation: parsed.requiertValidation ?? fallback.requiertValidation,
      motsClesDetectes:   fallback.motsClesDetectes,
    };
  } catch {
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════
// FUSION : combiner routeur local + réponse IA
// ══════════════════════════════════════════════════════════
export function fusionnerDetections(
  local:    IntentionDetectee,
  iaResult: IntentionDetectee | null
): IntentionDetectee {
  if (!iaResult) return local;

  // Si l'IA est confiante (> 80%), elle prime
  if (iaResult.confiance > 80) return {
    ...iaResult,
    motsClesDetectes: local.motsClesDetectes,
  };

  // Si confiances proches, prendre le domaine IA mais l'intention locale
  if (Math.abs(iaResult.confiance - local.confiance) < 20) return {
    type:              local.type,
    domaine:           iaResult.domaine,
    confiance:         Math.max(iaResult.confiance, local.confiance),
    requiertValidation: requiertValidation(local.type),
    motsClesDetectes:  local.motsClesDetectes,
  };

  return local;
}

// ══════════════════════════════════════════════════════════
// QUESTIONS SPÉCIALES — PARSING DIRECT
// Pour des requêtes très fréquentes, on répond directement
// ══════════════════════════════════════════════════════════
export interface QuestionRapide {
  pattern: RegExp;
  domaine:  DomaineIA;
  intention: TypeIntention;
  reponseDirecte?: (match: RegExpMatchArray) => string;
}

export const QUESTIONS_RAPIDES: QuestionRapide[] = [
  {
    pattern:  /chiffre d'affaires|ca du mois|ca ce mois/i,
    domaine:  "ERP",
    intention:"ANALYSE",
  },
  {
    pattern:  /n'(ont|a) pas payé|impayés|en attente paiement/i,
    domaine:  "ERP",
    intention:"RECHERCHE",
  },
  {
    pattern:  /bientôt en rupture|stock faible|alerte stock/i,
    domaine:  "ERP",
    intention:"ANALYSE",
  },
  {
    pattern:  /devis de (mme?|m\.|monsieur|madame)?\s*(\w+)/i,
    domaine:  "EVENTS",
    intention:"RECHERCHE",
  },
  {
    pattern:  /recettes.*mascarpone|utilise.*mascarpone|ingrédient.*recette/i,
    domaine:  "FOOD",
    intention:"RECHERCHE",
  },
  {
    pattern:  /événements cette semaine|planning cette semaine|agenda semaine/i,
    domaine:  "EVENTS",
    intention:"RECHERCHE",
  },
  {
    pattern:  /post (instagram|facebook|tiktok) pour/i,
    domaine:  "COMM",
    intention:"CREER_POST_SOCIAL",
  },
];

export function detecterQuestionRapide(texte: string): QuestionRapide | null {
  for (const q of QUESTIONS_RAPIDES) {
    if (q.pattern.test(texte)) return q;
  }
  return null;
}
