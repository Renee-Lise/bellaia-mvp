// ═══════════════════════════════════════════════════════════
// coreDesign.ts — Design tokens Bellaïa (partagés)
// Couleurs et constantes visuelles communes à tous les modules
// src/modules/core/coreDesign.ts
// Aucune dépendance sur les modules métier
// ═══════════════════════════════════════════════════════════
import type { CSSProperties } from "react";

// ── Palette principale Bellaïa ─────────────────────────────
export const BELLAÏA_COLORS = {
  vert:   "#15803d",
  vertL:  "#22c55e",
  vertXL: "#34d399",
  or:     "#c9a96e",
  cream:  "#f5f0e8",
  creamD: "rgba(245,240,232,0.6)",
  night:  "#030a03",
  card:   "rgba(255,255,255,0.04)",
  line:   "rgba(255,255,255,0.1)",
  muted:  "rgba(255,255,255,0.5)",
  mutedL: "rgba(255,255,255,0.3)",
  danger: "#f87171",
  warn:   "#fb923c",
  info:   "#60a5fa",
  success:"#22c55e",
} as const;

// Alias court — lisibilité dans les composants
export const FC = BELLAÏA_COLORS;

// ── Typographies ───────────────────────────────────────────
export const BELLAÏA_FONTS = {
  sans:  "system-ui, -apple-system, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
} as const;

export const SA = BELLAÏA_FONTS.sans;
export const FS = BELLAÏA_FONTS.serif;

// ── Style commun input dark mode ───────────────────────────
export const INP_STYLE: CSSProperties = {
  background:   "rgba(255,255,255,0.07)",
  border:       "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding:      "7px 10px",
  color:        "#fff",
  fontSize:     12,
  fontFamily:   SA,
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box",
};
