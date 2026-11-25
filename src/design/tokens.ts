// Design System Bellaïa — jetons du THÈME CLAIR (pages clientes : boutique…), complémentaires de premium.ts
// (coque sombre fondatrice) et de marques.ts (identité de chaque pôle). Mêmes teintes de référence.
// Règles : sections ouvertes et séparateurs discrets plutôt que cartes imbriquées ; une seule bordure fine
// par regroupement ; icônes vectorielles (pas d'émojis) ; cibles tactiles ≥ 44 px ; zones de sécurité iOS.
export const couleurs = {
  nuit: "#10142b",        // bleu nuit — identique à COQUE_PREMIUM.fond (premium.ts)
  nuitDouce: "#2a3352",
  or: "#a8823a",          // or — accent, actions principales (contraste AA sur ivoire)
  orClair: "#d9bf86",
  prune: "#5b2a4a",
  rosePoudre: "#ecd3d8",
  ivoire: "#faf7f1",      // fond
  blanc: "#ffffff",
  trait: "#e7e1d6",       // séparateurs
  texte2: "#5f6475",      // texte secondaire (contraste AA)
  succes: "#2f6b4f",
  alerte: "#9a3b2f",
} as const;

/** Identités propres aux univers (BSH reste noir, bordeaux, or, vieux rose ; jeunesse isolée). */
export const univers = {
  BELLAIA: { fond: couleurs.ivoire, accent: couleurs.or, texte: couleurs.nuit },
  BSH: { fond: "#0d0b10", accent: "#b8954a", texte: "#f3e9e4", secondaire: "#6e1f2f", vieuxRose: "#c08a8f" },
  JEUNESSE: { fond: "#fffaf0", accent: "#2f7d6d", texte: "#1f2a2a" },
} as const;

export const police = {
  titre: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  texte: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export const taille = { xs: 12, s: 14, m: 16, l: 19, xl: 24, xxl: 32 } as const;
export const espace = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;
export const rayon = { s: 8, m: 12, l: 16, pilule: 999 } as const;
export const ombre = { douce: "0 1px 2px rgba(18,26,47,.06), 0 8px 24px rgba(18,26,47,.06)" } as const;

export function prixFr(cts: number): string {
  return cts === 0 ? "Gratuit" : (cts / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
