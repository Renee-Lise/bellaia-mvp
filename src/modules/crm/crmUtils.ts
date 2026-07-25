// ═══════════════════════════════════════════════════════════
// crmUtils.ts — Utilitaires CRM Central Bellaïa LOT VII
// Génération référence, formatage, recherche locale, RGPD
// src/modules/crm/crmUtils.ts
// ═══════════════════════════════════════════════════════════
import type { Client, ResultatRechercheClient } from "./crmTypes";

// ── Génération référence CLI- ──────────────────────────────
export function genRefClient(): string {
  const year  = new Date().getFullYear();
  const suite = Date.now().toString().slice(-6);
  return `CLI-${year}-${suite}`;
}

// ── Formatage nom complet ──────────────────────────────────
export function nomComplet(c: Pick<Client, "nom" | "prenom">): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ");
}

// ── Formatage date ─────────────────────────────────────────
export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Formatage prix ─────────────────────────────────────────
export function fmtPrix(n?: number | null): string {
  if (n == null) return "—";
  return n.toFixed(2).replace(".", ",") + "€";
}

// ── Anniversaire aujourd'hui ───────────────────────────────
export function estAnniversaire(dateNaissance?: string): boolean {
  if (!dateNaissance) return false;
  const today = new Date();
  const dn    = new Date(dateNaissance);
  return dn.getDate()  === today.getDate()
      && dn.getMonth() === today.getMonth();
}

// ── Âge ───────────────────────────────────────────────────
export function calculerAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const dn   = new Date(dateNaissance);
  const today= new Date();
  let age    = today.getFullYear() - dn.getFullYear();
  const mois = today.getMonth() - dn.getMonth();
  if (mois < 0 || (mois === 0 && today.getDate() < dn.getDate())) age--;
  return age;
}

// ── Recherche locale multi-critères ───────────────────────
export function rechercherClientsLocal(
  clients: Client[],
  texte: string
): ResultatRechercheClient[] {
  if (!texte.trim()) return clients.map(c => ({ client:c, score:100, matchField:"" }));
  const q = texte.toLowerCase().trim();

  return clients
    .map(c => {
      let score = 0;
      let matchField = "";

      if (c.nom.toLowerCase().includes(q)) {
        score = c.nom.toLowerCase() === q ? 100 : 80;
        matchField = "nom";
      } else if (c.prenom?.toLowerCase().includes(q)) {
        score = 75; matchField = "prenom";
      } else if (c.email?.toLowerCase().includes(q)) {
        score = 70; matchField = "email";
      } else if (c.telephone?.includes(q) || c.whatsapp?.includes(q)) {
        score = 70; matchField = "telephone";
      } else if (c.societe?.toLowerCase().includes(q)) {
        score = 65; matchField = "societe";
      } else if (c.reference?.toLowerCase().includes(q)) {
        score = 90; matchField = "reference";
      } else if (c.tags?.some(t => t.toLowerCase().includes(q))) {
        score = 50; matchField = "tag";
      } else if (c.notes?.toLowerCase().includes(q)) {
        score = 30; matchField = "notes";
      }

      return { client: c, score, matchField };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── Vérifier RGPD ─────────────────────────────────────────
export function rgpdValide(c: Client): boolean {
  return c.rgpdOk === true;
}

// ── Extraire initiales ────────────────────────────────────
export function initiales(c: Pick<Client, "nom" | "prenom">): string {
  const p = c.prenom?.[0]?.toUpperCase() || "";
  const n = c.nom[0]?.toUpperCase() || "";
  return p + n || "?";
}

// ── Couleur avatar par statut ─────────────────────────────
export const STATUT_COULEURS = {
  actif:    { bg:"rgba(21,128,61,0.2)",    txt:"#22c55e" },
  inactif:  { bg:"rgba(201,168,76,0.15)",  txt:"#c9a96e" },
  prospect: { bg:"rgba(96,165,250,0.15)",  txt:"#60a5fa" },
  vip:      { bg:"rgba(168,85,247,0.15)",  txt:"#a855f7" },
  archive:  { bg:"rgba(255,255,255,0.06)", txt:"rgba(255,255,255,0.35)" },
} as const;

// ── Libellés modules ──────────────────────────────────────
export const MODULE_LABELS: Record<string, string> = {
  FOOD:      "🍃 Food",
  EVENTS:    "✨ Events",
  BSH:       "💜 BSH",
  ODYSSEE:   "💆 Odyssée",
  STRUCTURE: "🏗 Structure",
  GENERAL:   "📦 Général",
};
