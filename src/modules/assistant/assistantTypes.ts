// ═══════════════════════════════════════════════════════════
// assistantTypes.ts — Types Bellaïa IA LOT IX-A
// Types purs — aucune dépendance externe, pas de React
// src/modules/assistant/assistantTypes.ts
// ═══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// DOMAINES DE SPÉCIALISATION
// Un seul cerveau, plusieurs domaines de compétence
// ══════════════════════════════════════════════════════════
export type DomaineIA =
  | "FOOD"        // Bella'Food — recettes, stocks, production, HACCP
  | "EVENTS"      // Bella'Events — devis, décoration, planning
  | "BSH"         // Bella'Secret Home — lingerie, romance, bibliothèque
  | "ODYSSEE"     // Bella'Odyssée — soins, extensions, beauté
  | "EDITIONS"    // Bella'Studio Éditions — ebooks, formations
  | "MOTIPY"      // Mo Ti-Péyi — pédagogie, enfants, Guyane
  | "VILO"        // Vilo'Assistance — services à la personne
  | "ERP"         // Transversal — CRM, comptabilité, workflow, stocks
  | "COMM"        // Communication — réseaux sociaux, marketing
  | "GENERAL";    // Général — pas de domaine spécifique détecté

// ══════════════════════════════════════════════════════════
// FOURNISSEURS IA
// Architecture ouverte — brancher n'importe quel modèle
// ══════════════════════════════════════════════════════════
export type FournisseurIA =
  | "anthropic"   // Claude (Sonnet, Opus)
  | "openai"      // GPT-4, o1
  | "gemini"      // Google Gemini
  | "local"       // Modèle local (Ollama, LM Studio)
  | "mock";       // Mock pour tests / fallback sans API

export interface ConfigIA {
  fournisseur: FournisseurIA;
  modele: string;             // 'claude-sonnet-4-6', 'gpt-4o', etc.
  temperature?: number;       // 0.0 – 1.0
  maxTokens?: number;
  apiKeyEnvVar?: string;      // nom de la variable d'env (jamais la clé elle-même)
}

// ══════════════════════════════════════════════════════════
// MESSAGES ET CONVERSATION
// ══════════════════════════════════════════════════════════
export type RoleMessage = "user" | "assistant" | "system" | "action_result";

export interface Message {
  id: string;
  role: RoleMessage;
  contenu: string;
  domaine?: DomaineIA;
  timestamp: string;          // ISO
  // Métadonnées optionnelles
  actionId?: string;          // si lié à une action en attente
  confiance?: number;         // 0-100, confiance du routeur
  suggestions?: string[];     // questions de suivi suggérées
}

export interface Conversation {
  id: string;
  messages: Message[];
  domaine: DomaineIA;
  contexte?: ContexteConversation;
  creeLe: string;
  misAJourLe: string;
}

export interface ContexteConversation {
  clientId?: string;
  clientNom?: string;
  dossierId?: string;
  dossierRef?: string;
  moduleActif?: string;
  donneesCle?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════
// INTENTIONS (ce que l'utilisateur veut faire)
// ══════════════════════════════════════════════════════════
export type TypeIntention =
  // Recherche et information
  | "RECHERCHE"           // "retrouve le devis de..."
  | "ANALYSE"             // "analyse mes ventes"
  | "RESUME"              // "résume ce dossier"
  | "EXPLICATION"         // "explique l'état de..."
  // Création de contenu
  | "CREER_CONTENU"       // posts, fiches, descriptions
  | "CREER_DOCUMENT"      // devis, factures, courriers
  | "CREER_PRODUIT"       // fiche produit catalogue
  | "CREER_RECETTE"       // nouvelle recette Food
  // Automatisations (toutes nécessitent validation)
  | "PREPARER_LISTE"      // liste de courses, d'achats
  | "PREPARER_PLANNING"   // planning production/événements
  | "PREPARER_RAPPORT"    // rapport mensuel, bilan
  // Actions ERP (TOUJOURS validation obligatoire)
  | "ACTION_ERP"          // modifier, créer, envoyer dans l'ERP
  // Communication
  | "CREER_POST_SOCIAL"   // Facebook, Instagram, TikTok
  | "CREER_MESSAGE_WA"    // message WhatsApp client
  // Qualité
  | "VERIFIER_COHERENCE"  // détecter anomalies, doublons
  | "CORRIGER_TEXTE"      // orthographe, reformulation
  // Inconnu
  | "INCONNU";

export interface IntentionDetectee {
  type: TypeIntention;
  domaine: DomaineIA;
  confiance: number;          // 0-100
  parametres?: Record<string, string | number | boolean>;
  requiertValidation: boolean;
  motsClesDetectes: string[];
}

// ══════════════════════════════════════════════════════════
// ACTIONS (avec gouvernance stricte)
// Aucune action ne s'exécute sans validation fondatrice
// ══════════════════════════════════════════════════════════
export type StatutAction =
  | "en_attente_validation"   // Préparée, attend la fondatrice
  | "validee"                 // Validée → peut s'exécuter
  | "executee"                // Exécutée avec succès
  | "refusee"                 // Refusée par la fondatrice
  | "echouee"                 // Erreur d'exécution
  | "annulee";                // Annulée avant validation

export type TypeAction =
  | "creer_client"
  | "creer_devis"
  | "creer_commande"
  | "creer_facture"
  | "creer_produit_catalogue"
  | "enregistrer_paiement"
  | "envoyer_whatsapp"
  | "archiver_dossier"
  | "modifier_stock"
  | "creer_recette"
  | "exporter_document"
  | "classifier_document"
  | "lancer_production";

export interface ActionProposee {
  id: string;
  type: TypeAction;
  libelle: string;             // "Créer le client Marie Dupont"
  description: string;         // Description détaillée de ce qui sera fait
  payload: Record<string, unknown>;  // Données qui seront envoyées
  domaine: DomaineIA;
  risque: "faible" | "moyen" | "eleve";
  statut: StatutAction;
  creeLe: string;
  valideeLe?: string;
  executeeLE?: string;
  resultEt?: string;           // Résultat après exécution
}

// ══════════════════════════════════════════════════════════
// RÉSULTAT D'UNE RÉPONSE IA
// ══════════════════════════════════════════════════════════
export interface ReponseIA {
  texte: string;               // Réponse lisible pour la fondatrice
  domaine: DomaineIA;
  intention: TypeIntention;
  actions?: ActionProposee[];  // Actions proposées (attendent validation)
  suggestions?: string[];      // Questions de suivi suggérées
  classement?: ClassementSuggere;
  analyse?: AnalyseContenu;
  erreur?: string;
}

export interface ClassementSuggere {
  module: DomaineIA;
  categorie?: string;
  motsCles?: string[];
  clientsLies?: string[];
  dossiersLies?: string[];
  confiance: number;
}

export interface AnalyseContenu {
  coherent: boolean;
  problemes?: string[];
  suggestions?: string[];
  score?: number;              // 0-100
}

// ══════════════════════════════════════════════════════════
// MÉMOIRE
// ══════════════════════════════════════════════════════════
export interface MemoreTravail {
  // Éléments en cours (session active)
  tachesEnCours: TacheMemoire[];
  brouillons: BrouillonMemoire[];
  projetsOuverts: string[];   // IDs
  elementsARevoir: string[];
  derniereActivite: string;
}

export interface TacheMemoire {
  id: string;
  libelle: string;
  domaine: DomaineIA;
  priorite: "haute" | "moyenne" | "basse";
  creeLe: string;
  echeance?: string;
  faite: boolean;
}

export interface BrouillonMemoire {
  id: string;
  titre: string;
  contenu: string;
  domaine: DomaineIA;
  type: "texte" | "devis" | "fiche_produit" | "post_social" | "recette";
  creeLe: string;
  misAJourLe: string;
}

export interface MemoreProjet {
  projetId: string;
  historique: EntreeHistoriqueProjet[];
  versions: VersionProjet[];
  documentsLies: string[];
  validations: ValidationProjet[];
}

export interface EntreeHistoriqueProjet {
  id: string;
  action: string;
  auteur: "fondatrice" | "ia";
  date: string;
  contenu?: string;
}

export interface VersionProjet {
  numero: string;
  date: string;
  contenu: string;
  commentaire?: string;
}

export interface ValidationProjet {
  action: string;
  validee: boolean;
  date: string;
  commentaire?: string;
}

// ══════════════════════════════════════════════════════════
// AGENT SPÉCIALISÉ
// ══════════════════════════════════════════════════════════
export interface AgentSpec {
  id: string;
  nom: string;
  domaine: DomaineIA;
  description: string;
  competences: string[];
  outilsDisponibles: TypeAction[];
  configIA: ConfigIA;
  promptSysteme: string;      // Prompt de spécialisation
}

// ══════════════════════════════════════════════════════════
// CONTEXTE BELLAÏA STUDIO (injecté dans chaque prompt)
// ══════════════════════════════════════════════════════════
export interface ContexteBellaiaStudio {
  fondatrice: "Renée-Lise";
  localisation: "Sinnamary, Guyane";
  langue: "fr";
  modules: DomaineIA[];
  dateAujourdhui: string;
  heure?: string;
}
