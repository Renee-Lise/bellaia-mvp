// ═══════════════════════════════════════════════════════════
// DESIGN SYSTEM BELLAÏA — identités de marque (source unique).
// Chaque univers : palette, typographies, rayon, ambiance, logo.
// Les écrans (portails, boutiques, espaces pro) lisent ces jetons ;
// une marque absente du référentiel reçoit une identité générée.
// Contrastes : texte / fond ≥ 4,5:1 (vérifiés pour les paires principales).
// Univers jeunesse : identité ludique, et JAMAIS de contenu adulte associé.
// ═══════════════════════════════════════════════════════════

export type Marque = {
  code: string; nom: string; logo: string | null; monogramme?: string;
  fond: string; surface: string; surface2: string; texte: string; doux: string; ligne: string;
  principale: string; secondaire: string; accent: string; accentTexte: string;
  serif: string; sans: string; rayon: number; ombre: string;
  ambiance: "luxe_nuit" | "luxe_clair" | "gastronomie" | "delicat" | "professionnel" | "ludique";
  jeunesse?: boolean; adulte?: boolean; independant?: boolean;
  degrade: string;
};

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'SF Pro Text', system-ui, 'Helvetica Neue', sans-serif";
const ombreClaire = "0 1px 2px rgba(20,16,24,0.06), 0 8px 24px rgba(20,16,24,0.06)";
const ombreNuit = "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.35)";

export const MARQUES: Record<string, Marque> = {
  GENERAL: { code: "GENERAL", nom: "Bellaïa", logo: "/branding/bellaia-logo-officiel.png", fond: "#10142b", surface: "#171c3a", surface2: "#1f2548", texte: "#f8f3ea", doux: "rgba(248,243,234,0.66)", ligne: "rgba(215,192,143,0.2)",
    principale: "#1c2246", secondaire: "#e8c1c8", accent: "#d7c08f", accentTexte: "#10142b", serif: SERIF, sans: SANS, rayon: 18, ombre: ombreNuit, ambiance: "luxe_nuit",
    degrade: "radial-gradient(120% 90% at 100% 0%, rgba(232,193,200,0.18), transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(142,106,142,0.22), transparent 60%), linear-gradient(160deg, #1c2246, #10142b)" },
  STUDIO: { code: "STUDIO", nom: "Bella'Studio", logo: "/branding/bella-studio.jpg", fond: "#faf6ef", surface: "#ffffff", surface2: "#f4ede6", texte: "#1c2246", doux: "rgba(28,34,70,0.62)", ligne: "rgba(28,34,70,0.1)",
    principale: "#1c2246", secondaire: "#e8c1c8", accent: "#b89a5e", accentTexte: "#ffffff", serif: SERIF, sans: SANS, rayon: 16, ombre: ombreClaire, ambiance: "luxe_clair",
    degrade: "linear-gradient(135deg, #1c2246 0%, #4b3a62 55%, #8e6a8e 100%)" },
  BSH: { code: "BSH", nom: "Bella'Secret Home", logo: "/branding/bella-secret-home.jpg", fond: "#0b0709", surface: "#150a0f", surface2: "#1f0e16", texte: "#f6ece6", doux: "rgba(246,236,230,0.62)", ligne: "rgba(198,161,91,0.22)",
    principale: "#3a0f1c", secondaire: "#d39aa8", accent: "#c6a15b", accentTexte: "#0b0709", serif: SERIF, sans: SANS, rayon: 18, ombre: ombreNuit, ambiance: "luxe_nuit", adulte: true,
    degrade: "radial-gradient(110% 80% at 100% 0%, rgba(211,154,168,0.2), transparent 55%), linear-gradient(160deg, #3a0f1c, #0b0709 70%)" },
  ODYSSEE: { code: "ODYSSEE", nom: "Bella'Odyssée", logo: "/branding/bella-odyssee-logo.png", fond: "#fbf7f1", surface: "#ffffff", surface2: "#f6eef0", texte: "#2a1424", doux: "rgba(42,20,36,0.6)", ligne: "rgba(42,20,36,0.1)",
    principale: "#4a1f3d", secondaire: "#f2d0da", accent: "#c9ad78", accentTexte: "#2a1424", serif: SERIF, sans: SANS, rayon: 6, ombre: ombreClaire, ambiance: "luxe_clair",
    degrade: "linear-gradient(135deg, #4a1f3d 0%, #8a4a6e 60%, #e7b9c8 100%)" },
  FOOD: { code: "FOOD", nom: "Bella'Food", logo: "/branding/bellafood-logo.png", fond: "#f7f1e3", surface: "#fffdf8", surface2: "#efe6d0", texte: "#2b2a1c", doux: "rgba(43,42,28,0.62)", ligne: "rgba(85,99,45,0.14)",
    principale: "#55632d", secondaire: "#efe6d0", accent: "#c9a54e", accentTexte: "#2b2a1c", serif: SERIF, sans: SANS, rayon: 16, ombre: ombreClaire, ambiance: "gastronomie",
    degrade: "linear-gradient(135deg, #3f4a20 0%, #55632d 55%, #8a7a3c 100%)" },
  EVENTS: { code: "EVENTS", nom: "Bella'Even's", logo: "/branding/bella-evenes.jpg", fond: "#fbf7f3", surface: "#ffffff", surface2: "#f5ecec", texte: "#3a2a30", doux: "rgba(58,42,48,0.6)", ligne: "rgba(58,42,48,0.1)",
    principale: "#b77d8c", secondaire: "#9aaa8c", accent: "#c9a96e", accentTexte: "#ffffff", serif: SERIF, sans: SANS, rayon: 14, ombre: ombreClaire, ambiance: "delicat",
    degrade: "linear-gradient(135deg, #e9c6cf 0%, #d9b7c0 45%, #b9c6ab 100%)" },
  VILDOR: { code: "VILDOR", nom: "Vil'Dor Pâtisse", logo: "/branding/vildor-patisse.jpg", fond: "#f5ecd7", surface: "#fffaf0", surface2: "#efe2c4", texte: "#24170e", doux: "rgba(36,23,14,0.62)", ligne: "rgba(74,44,29,0.14)",
    principale: "#120d08", secondaire: "#4a2c1d", accent: "#d4af37", accentTexte: "#120d08", serif: SERIF, sans: SANS, rayon: 12, ombre: ombreClaire, ambiance: "luxe_clair", independant: true,
    degrade: "linear-gradient(135deg, #120d08 0%, #4a2c1d 60%, #8b5e3c 100%)" },
  VILO: { code: "VILO", nom: "Vilo'Assistance", logo: "/branding/vilo-assistance-logo.png", fond: "#f6f4ef", surface: "#ffffff", surface2: "#eef0f4", texte: "#14213d", doux: "rgba(20,33,61,0.62)", ligne: "rgba(20,33,61,0.1)",
    principale: "#14213d", secondaire: "#e9edf4", accent: "#b89b5e", accentTexte: "#ffffff", serif: SERIF, sans: SANS, rayon: 12, ombre: ombreClaire, ambiance: "professionnel",
    degrade: "linear-gradient(135deg, #14213d 0%, #2b3d63 70%, #4a5f8a 100%)" },
  STRUCTURE: { code: "STRUCTURE", nom: "Bella'Structure", logo: null, monogramme: "BS", fond: "#f4f7f7", surface: "#ffffff", surface2: "#e8f0f0", texte: "#0d2a2c", doux: "rgba(13,42,44,0.62)", ligne: "rgba(13,42,44,0.1)",
    principale: "#0f4c4f", secondaire: "#d6e7e6", accent: "#b89b5e", accentTexte: "#ffffff", serif: SERIF, sans: SANS, rayon: 10, ombre: ombreClaire, ambiance: "professionnel",
    degrade: "linear-gradient(135deg, #0d2a2c 0%, #0f4c4f 60%, #2f7c7a 100%)" },
  INVEST: { code: "INVEST", nom: "BellaInvest", logo: null, monogramme: "BI", fond: "#f6f4f9", surface: "#ffffff", surface2: "#ece8f4", texte: "#1d1533", doux: "rgba(29,21,51,0.62)", ligne: "rgba(29,21,51,0.1)",
    principale: "#2d1b4e", secondaire: "#e4dcf2", accent: "#c9ad78", accentTexte: "#1d1533", serif: SERIF, sans: SANS, rayon: 10, ombre: ombreClaire, ambiance: "professionnel",
    degrade: "linear-gradient(135deg, #1d1533 0%, #2d1b4e 55%, #5b3f8a 100%)" },
  EDITIONS: { code: "EDITIONS", nom: "Bella'Studio Éditions", logo: null, monogramme: "É", fond: "#faf5ef", surface: "#ffffff", surface2: "#f3e9e2", texte: "#3a1229", doux: "rgba(58,18,41,0.6)", ligne: "rgba(58,18,41,0.1)",
    principale: "#5b1a3f", secondaire: "#f1dde4", accent: "#c9a96e", accentTexte: "#ffffff", serif: SERIF, sans: SANS, rayon: 8, ombre: ombreClaire, ambiance: "luxe_clair",
    degrade: "linear-gradient(135deg, #3a1229 0%, #5b1a3f 60%, #9b4a6e 100%)" },
  DIAMONDB: { code: "DIAMONDB", nom: "Diamond B", logo: null, monogramme: "◆", fond: "#0e1422", surface: "#151d30", surface2: "#1c2740", texte: "#eef2f8", doux: "rgba(238,242,248,0.64)", ligne: "rgba(196,206,222,0.2)",
    principale: "#1b2a44", secondaire: "#c4cede", accent: "#d9dfe8", accentTexte: "#0e1422", serif: SERIF, sans: SANS, rayon: 14, ombre: ombreNuit, ambiance: "luxe_nuit",
    degrade: "linear-gradient(160deg, #1b2a44, #0e1422 70%)" },
  MOTIPY: { code: "MOTIPY", nom: "Mo Ti-Péyi", logo: null, monogramme: "🌿", fond: "#fbf8ea", surface: "#ffffff", surface2: "#eef5df", texte: "#1f3a1c", doux: "rgba(31,58,28,0.62)", ligne: "rgba(47,93,42,0.14)",
    principale: "#2f5d2a", secondaire: "#ffd66b", accent: "#ff8a5b", accentTexte: "#ffffff", serif: "'Baloo 2', 'Comic Neue', " + SANS, sans: SANS, rayon: 22, ombre: ombreClaire, ambiance: "ludique", jeunesse: true,
    degrade: "linear-gradient(135deg, #2f5d2a 0%, #5f9c4a 55%, #ffd66b 100%)" },
  TICODE: { code: "TICODE", nom: "Ti-Code Guyane", logo: null, monogramme: "</>", fond: "#f2fbfa", surface: "#ffffff", surface2: "#dff3f0", texte: "#0c3532", doux: "rgba(12,53,50,0.62)", ligne: "rgba(15,118,110,0.14)",
    principale: "#0f766e", secondaire: "#ffd166", accent: "#ef8354", accentTexte: "#ffffff", serif: "'Baloo 2', " + SANS, sans: SANS, rayon: 20, ombre: ombreClaire, ambiance: "ludique", jeunesse: true,
    degrade: "linear-gradient(135deg, #0f766e 0%, #2bb3a3 60%, #ffd166 100%)" },
  ODYSSEE_GUYANE: { code: "ODYSSEE_GUYANE", nom: "L'Odyssée Guyanaise", logo: null, monogramme: "OG", fond: "#f6f6fc", surface: "#ffffff", surface2: "#e9e8f8", texte: "#1c1a4a", doux: "rgba(28,26,74,0.62)", ligne: "rgba(55,48,163,0.12)",
    principale: "#3730a3", secondaire: "#d8d5f5", accent: "#e0a43a", accentTexte: "#1c1a4a", serif: SERIF, sans: SANS, rayon: 16, ombre: ombreClaire, ambiance: "delicat",
    degrade: "linear-gradient(135deg, #1c1a4a 0%, #3730a3 55%, #6b8f5a 100%)" },
};

/** Identité d'un univers ; génère une marque premium cohérente si l'univers est nouveau. */
export function marqueDe(code: string, unite?: { nom?: string; couleur?: string } | null): Marque {
  if (MARQUES[code]) return MARQUES[code];
  const p = unite?.couleur || "#1c2246";
  return { ...MARQUES.STUDIO, code, nom: unite?.nom || code, logo: null, monogramme: (unite?.nom || code).replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase(), principale: p, degrade: `linear-gradient(135deg, ${p} 0%, #1c2246 100%)` };
}

/** Bibliothèque graphique : VARIANTES de logos (le logo actif de chaque marque reste celui de MARQUES, inchangé).
 *  Une variante n'est utilisée que là où la fondatrice la choisit explicitement. */
export const LOGOS_VARIANTES: Record<string, { cle: string; nom: string; fichier: string | null; statut: "attendu" | "disponible"; usage: string }[]> = {
  ODYSSEE: [{ cle: "noir_or", nom: "Bella'Odyssée — noir et doré", fichier: null, statut: "attendu", usage: "Variante (fonds sombres, supports premium) — fichier à fournir par la fondatrice" }],
};
