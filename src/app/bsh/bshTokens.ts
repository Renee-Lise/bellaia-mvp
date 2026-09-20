// ═══════════════════════════════════════════════════════════
// Jetons partagés pour les pages publiques Bella'Secret Home
// src/app/bsh/bshTokens.ts
//
// Ce ne sont PAS de nouvelles couleurs : ce sont exactement les
// valeurs déjà utilisées dans l'accueil et BSH Members existants
// (src/components/BellaiaApp.tsx, fonctions ClientBSH et
// BSHMembersPage). Elles sont dupliquées ici plutôt qu'importées
// parce que BellaiaApp.tsx est un composant 'use client' entier :
// l'importer depuis une route serveur forcerait tout le rendu
// public en client-side et casserait le bénéfice SEO recherché.
// ═══════════════════════════════════════════════════════════

export const BSH_PALETTE = {
  night:   "#0b0709",  // fond le plus sombre
  plumD:   "#17101a",  // fond intermédiaire
  plum:    "#2e1a2e",  // fond hero / blocs communauté
  gold:    "#c6a15b",  // or — accents, boutons, labels
  goldL:   "#e0c17e",  // or clair — italique, emphase
  cream:   "#f1e7e2",  // texte principal clair
  muted:   "#cbb9b9",  // texte secondaire
  roseD:   "#e3b9bd",  // rose discret (citations Cercle)
  borderL: "rgba(198,161,91,0.12)",
  border:  "rgba(198,161,91,0.15)",
  borderM: "rgba(198,161,91,0.18)",
  halo:    "rgba(92,21,34,0.35)",
  haloGold:"rgba(198,161,91,0.15)",
};

// Empilement typographique déjà utilisé dans le code existant
// (accueil, BSH Members) mais jamais réellement chargé jusqu'ici —
// voir layout.tsx qui charge ces polices via next/font/google.
export const BSH_FONT_DISPLAY = "var(--font-bsh-display), 'Cormorant Garamond', Georgia, serif";
export const BSH_FONT_BODY    = "var(--font-bsh-body), 'Jost', system-ui, sans-serif";
