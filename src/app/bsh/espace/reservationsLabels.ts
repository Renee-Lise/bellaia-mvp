// ═══════════════════════════════════════════════════════════
// Libellés de statut — reservations_experiences (migration 0001)
// src/app/bsh/espace/reservationsLabels.ts
//
// Partagé entre le tableau de bord et la page réservations pour ne
// pas dupliquer la traduction des statuts bruts.
// ═══════════════════════════════════════════════════════════
export const LABEL_STATUT_RESA: Record<string, string> = {
  demande_recue: "Demande reçue",
  validee: "Validée",
  acompte_recu: "Acompte reçu",
  confirmee: "Confirmée",
  realisee: "Réalisée",
  annulee: "Annulée",
};

export const COULEUR_STATUT_RESA: Record<string, string> = {
  demande_recue: "#c6a15b",
  validee: "#c6a15b",
  acompte_recu: "#c6a15b",
  confirmee: "#6ee7a0",
  realisee: "#6ee7a0",
  annulee: "#f87171",
};
