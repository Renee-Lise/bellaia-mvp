// ═══════════════════════════════════════════════════════════
// Interrupteur des nouveaux visuels premium.
// • Prévisualisation (branches Vercel) et développement local : ACTIFS.
// • Production : INACTIFS tant que la fondatrice n'a pas donné son GO
//   (passer PREMIUM_PRODUCTION à true après validation).
// Les corrections de sécurité (rôles, aperçus réservés) ne dépendent PAS
// de cet interrupteur.
// ═══════════════════════════════════════════════════════════
export const PREMIUM_PRODUCTION = false;
export const PREMIUM_ACTIF = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" || PREMIUM_PRODUCTION;

/** Palette de la coque fondatrice premium (identité Bellaïa : nuit, or champagne, rose poudré). */
export const COQUE_PREMIUM = { fond: "#10142b", barre: "#171c3a", ligne: "rgba(215,192,143,0.2)", or: "#d7c08f", doux: "rgba(248,243,234,0.62)", texte: "#f8f3ea", serif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" };
