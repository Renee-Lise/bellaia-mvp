// ═══════════════════════════════════════════════════════════
// BELLAÏA — CONSTANTES GLOBALES PARTAGÉES
// Utilisées par tous les modules pôles
// ═══════════════════════════════════════════════════════════

export const POLES = [
  { id: "ODYSSEE",   nom: "Bella'Odyssée",      ico: "💅", couleur: "#7c3aed" },
  { id: "BSH",       nom: "Bella'Secret Home",  ico: "✦",  couleur: "#be185d" },
  { id: "EVENTS",    nom: "Bella'Even's",        ico: "✨", couleur: "#0d9488" },
  { id: "FOOD",      nom: "Bella'Food",          ico: "🍃", couleur: "#16a34a" },
  { id: "VILO",      nom: "Vilo'Assistance",     ico: "📋", couleur: "#0369a1" },
  { id: "STRUCTURE", nom: "Bella'Structure",     ico: "🗂",  couleur: "#d97706" },
  { id: "MTP",       nom: "Mo Ti-Péyi",          ico: "🌺", couleur: "#b45309" },
  { id: "INVEST",    nom: "BellaInvest",         ico: "📈", couleur: "#059669" },
  { id: "GENERAL",   nom: "Général",             ico: "◈",  couleur: "#6b7280" },
];

export const STATUTS_PRODUIT = [
  "disponible", "sur_reservation", "complet", "en_pause",
  "maintenance", "bientot_disponible", "temporairement_indisponible",
  "reserve_vip", "saison_terminee", "ferme_definitivement",
  "visible", "masque", "rupture_stock",
];

export const MODES_PAIEMENT = [
  "SumUp", "Virement", "Espèces", "PayPal", "Revolut", "WhatsApp",
];

export const STATUTS_COMMANDE_EVENTS = [
  "Demande reçue", "Devis envoyé", "Acompte reçu",
  "En préparation", "Livraison / Installation", "Réalisé", "Archivé", "Annulé",
];

// Couleurs UI
export const B = {
  deep:    "#0d0b12",
  dark:    "#13111a",
  card:    "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.08)",
  cream:   "#e8e3d5",
  muted:   "rgba(255,255,255,0.4)",
  gold:    "#c9a84c",
  violet:  "#7c3aed",
  violetL: "#a78bfa",
  success: "#4ade80",
  danger:  "#ef4444",
  warning: "#f59e0b",
};

export const FS = "'Cormorant Garamond',Georgia,serif";
export const SA = "Inter,system-ui,sans-serif";
