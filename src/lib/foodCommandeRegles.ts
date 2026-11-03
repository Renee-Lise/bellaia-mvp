// ═══════════════════════════════════════════════════════════
// Règles pures de validation — commandes Bella'Food
// src/lib/foodCommandeRegles.ts
//
// Aucune dépendance Supabase/Next ici volontairement : ce module est
// testable isolément (voir scripts de vérification), séparé de
// /api/food/commandes/create qui l'utilise pour appliquer ces règles
// contre la base réelle.
// ═══════════════════════════════════════════════════════════

export const MAX_QTE_LIGNE = 20;
export const MAX_LIGNES = 30;
export const BASES_FRITES_VALIDES = ["manioc", "patate_douce", "plantain", "pomme_terre"];
export const BASES_LABELS: Record<string, string> = {
  manioc: "Manioc", patate_douce: "Patate douce", plantain: "Plantain", pomme_terre: "Pomme de terre",
};

export function heureActuelleGuyane(maintenant: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Cayenne", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = fmt.formatToParts(maintenant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const joursMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { jour: joursMap[map.weekday] ?? 0, minutesDepuisMinuit: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10) };
}

export function minutesDepuisMinuit(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}

export function jourSemaine(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

export interface VerifHoraires {
  actif: boolean;
  jours_fermes?: number[];
  heure_ouverture?: string | null;
  heure_fermeture?: string | null;
}

// Renvoie un message d'erreur si la commande doit être refusée sur la
// seule base des horaires/jours fermés (quota traité séparément côté
// route, car il dépend d'un comptage en base).
export function verifierHorairesEtJour(horaires: VerifHoraires | null, dateLivraison: string | null | undefined, maintenant: Date = new Date()): string | null {
  if (!horaires || !horaires.actif) return null;
  if (dateLivraison && Array.isArray(horaires.jours_fermes) && horaires.jours_fermes.includes(jourSemaine(dateLivraison))) {
    return "Bella'Food est fermé ce jour-là. Choisissez une autre date de livraison.";
  }
  if (horaires.heure_ouverture && horaires.heure_fermeture) {
    const { minutesDepuisMinuit: mnt } = heureActuelleGuyane(maintenant);
    const ouverture = minutesDepuisMinuit(horaires.heure_ouverture);
    const fermeture = minutesDepuisMinuit(horaires.heure_fermeture);
    if (mnt < ouverture || mnt >= fermeture) {
      return `Les commandes ne sont prises qu'entre ${horaires.heure_ouverture.slice(0,5)} et ${horaires.heure_fermeture.slice(0,5)}. Réessayez pendant ces horaires.`;
    }
  }
  return null;
}

export function verifierQuantite(qte: unknown): number | null {
  const n = typeof qte === "number" ? qte : parseInt(String(qte), 10);
  if (!Number.isFinite(n) || n < 1 || n > MAX_QTE_LIGNE) return null;
  return n;
}

export function verifierBaseId(baseId: string | undefined): boolean {
  return !baseId || BASES_FRITES_VALIDES.includes(baseId);
}
