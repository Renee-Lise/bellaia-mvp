// ═══════════════════════════════════════════════════════════
// SOCLE STRATÉGIQUE BELLAÏA — Exports centraux
// Importez depuis "@/modules/core" dans tous les pôles
// ═══════════════════════════════════════════════════════════

// Moteur de calcul
export { calculerPrix, prixPsychologique } from "./calculateur";
export type { EntreeCalcul, ResultatCalcul } from "./calculateur";

// Moteur de génération IA
export { generer, construirePrompt, LABELS_GENERATION } from "./generateur";
export type { TypeGeneration, DemandeGeneration } from "./generateur";

// Mémoire centrale
export { rechercher, relier, archiver, dupliquerPourPole, statsMemoire } from "./memoire";
export type { TypeElement } from "./memoire";

// Composants UI réutilisables
export { default as CalculateurUI }  from "./CalculateurUI";
export { default as StudioIAF }      from "./StudioIAF";
