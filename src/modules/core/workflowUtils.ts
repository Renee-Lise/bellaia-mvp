// ═══════════════════════════════════════════════════════════
// workflowUtils.ts — Utilitaires Workflow Universel LOT VIII
// Génération références, messages, templates, formatage
// src/modules/core/workflowUtils.ts
// Aucune dépendance Supabase — fonctions pures
// ═══════════════════════════════════════════════════════════
import type { PrefixeRef, StatutWorkflow, BU, LivraisonUniverselle } from "./workflowTypes";
import { STATUT_LABELS } from "./workflowTypes";

// ══════════════════════════════════════════════════════════
// GÉNÉRATION DE RÉFÉRENCES
// ══════════════════════════════════════════════════════════

/** Génère une référence universelle : DEV-2026-123456 */
export function genRef(prefixe: PrefixeRef): string {
  const year  = new Date().getFullYear();
  const suite = Date.now().toString().slice(-6);
  return `${prefixe}-${year}-${suite}`;
}

export const genDevisRef    = () => genRef("DEV");
export const genCommandeRef = () => genRef("CMD");
export const genFactureRef  = () => genRef("FAC");
export const genPaiementRef = () => genRef("PAY");
export const genLivraisonRef= () => genRef("LIV");
export const genProductionRef=() => genRef("PROD");

// ══════════════════════════════════════════════════════════
// FORMATAGE
// ══════════════════════════════════════════════════════════

export function fmtPrix(n?: number | null): string {
  if (n == null) return "—";
  return n.toFixed(2).replace(".", ",") + "\u00a0€";
}

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR", {
      day:"2-digit", month:"short", year:"numeric",
    });
  } catch { return s; }
}

export function fmtDateHeure(s?: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("fr-FR", {
      day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit",
    });
  } catch { return s; }
}

export function fmtDuree(min?: number | null): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min/60)}h${String(min%60).padStart(2,"0")}`;
}

// ══════════════════════════════════════════════════════════
// MESSAGES WHATSAPP — TEMPLATES PAR STATUT
// ══════════════════════════════════════════════════════════

export interface ContexteNotif {
  clientNom: string;
  reference: string;
  montant?: number;
  acompte?: number;
  bu?: BU;
  details?: string;
}

export function buildMessageWhatsApp(
  statut: StatutWorkflow,
  ctx: ContexteNotif
): string {
  const prenom = ctx.clientNom.split(" ")[0];
  const ref    = ctx.reference;
  const bu     = ctx.bu || "EVENTS";

  const messages: Partial<Record<StatutWorkflow, string>> = {
    DEVIS_ENVOYE: [
      `Bonjour ${prenom} 🌿`,
      ``,
      `Votre devis *${ref}* est disponible.`,
      ctx.montant ? `Montant total : *${fmtPrix(ctx.montant)}*` : "",
      ``,
      `Vous pouvez le consulter et l'accepter directement sur le portail Bellaïa.`,
      ctx.details ? `\n${ctx.details}` : "",
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].filter(l => l !== undefined).join("\n"),

    DEVIS_ACCEPTE: [
      `Bonjour ${prenom} 🎉`,
      ``,
      `Merci d'avoir accepté votre devis *${ref}*.`,
      ctx.acompte ? `Un acompte de *${fmtPrix(ctx.acompte)}* est attendu pour confirmer votre commande.` : "",
      ``,
      `Nous vous contacterons sous peu pour les détails.`,
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].filter(l => l !== undefined).join("\n"),

    COMMANDE: [
      `Bonjour ${prenom} ✨`,
      ``,
      `Votre commande *${ref}* a bien été enregistrée.`,
      ctx.montant ? `Montant total : *${fmtPrix(ctx.montant)}*` : "",
      ctx.acompte ? `Acompte attendu : *${fmtPrix(ctx.acompte)}*` : "",
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].filter(l => l !== undefined).join("\n"),

    ACOMPTE_RECU: [
      `Bonjour ${prenom} 💚`,
      ``,
      `Nous avons bien reçu votre acompte pour la commande *${ref}*.`,
      `Votre dossier est confirmé.`,
      ``,
      `Nous vous tiendrons informé(e) de l'avancement.`,
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].join("\n"),

    PRET: [
      `Bonjour ${prenom} 🌟`,
      ``,
      `Votre commande *${ref}* est prête !`,
      ctx.details ? ctx.details : "",
      ``,
      `Merci de nous confirmer votre créneau de retrait.`,
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].filter(Boolean).join("\n"),

    LIVRE: [
      `Bonjour ${prenom} 🎊`,
      ``,
      `Votre commande *${ref}* a été livrée.`,
      ``,
      `Nous espérons que tout vous a plu ! N'hésitez pas à partager vos photos 📸`,
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].join("\n"),

    ANNULE: [
      `Bonjour ${prenom},`,
      ``,
      `Votre dossier *${ref}* a été annulé.`,
      ``,
      `Pour toute question, n'hésitez pas à nous contacter.`,
      ``,
      `_Bellaïa · Sinnamary, Guyane_`,
    ].join("\n"),
  };

  return messages[statut]
    || `Bonjour ${prenom}, votre dossier ${ref} est passé à l'état : ${STATUT_LABELS[statut]}.`;
}

/** Ouvre WhatsApp avec le message pré-rempli */
export function ouvrirWhatsApp(tel: string, message: string): void {
  const numero = tel.replace(/\D/g, "");
  const url    = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ══════════════════════════════════════════════════════════
// BON DE LIVRAISON HTML
// ══════════════════════════════════════════════════════════

export function buildBonLivraisonHTML(liv: LivraisonUniverselle): string {
  const mode = { retrait:"Retrait en magasin", livraison:"Livraison à domicile", sur_place:"Sur place" };
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bon de livraison ${liv.reference}</title>
<style>
body{font-family:'Helvetica Neue',Arial,sans-serif;padding:30px;max-width:700px;
  margin:0 auto;color:#1a1a1a;font-size:13px}
h1{color:#15803d;font-family:Georgia,serif;font-size:22px;
  border-bottom:3px solid #15803d;padding-bottom:8px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.label{font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;margin-bottom:2px}
.val{font-size:14px;color:#111;font-weight:600}
.badge{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;
  border-radius:4px;padding:2px 10px;font-size:11px;color:#15803d;font-weight:700}
.sign{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:30px}
.sign-box{border-top:2px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280}
@media print{button{display:none}}
</style></head><body>
<h1>🌿 Bon de livraison</h1>
<div class="grid">
  <div><div class="label">Référence</div><div class="val">${liv.reference}</div></div>
  <div><div class="label">Commande</div><div class="val">${liv.commandeRef}</div></div>
  <div><div class="label">Client</div><div class="val">${liv.clientNom}</div></div>
  <div><div class="label">Mode</div><div class="val">${mode[liv.mode] || liv.mode}</div></div>
  ${liv.datePrevue ? `<div><div class="label">Date prévue</div><div class="val">${fmtDate(liv.datePrevue)}</div></div>` : ""}
  ${liv.heurePrevue ? `<div><div class="label">Heure</div><div class="val">${liv.heurePrevue}</div></div>` : ""}
  ${liv.adresse ? `<div style="grid-column:1/-1"><div class="label">Adresse</div><div class="val">${liv.adresse}</div></div>` : ""}
</div>
${liv.notes ? `<p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px;font-size:12px">${liv.notes}</p>` : ""}
<div class="sign">
  <div class="sign-box">Signature client<br><br><br></div>
  <div class="sign-box">Cachet Bellaïa<br><br><br></div>
</div>
<p style="margin-top:30px;text-align:center;font-size:10px;color:#9ca3af">
  Bellaïa · Sinnamary, Guyane · Généré le ${new Date().toLocaleDateString("fr-FR")}
</p>
</body></html>`;
}

// ══════════════════════════════════════════════════════════
// VÉRIFICATIONS MÉTIER
// ══════════════════════════════════════════════════════════

export function calculerAcompte(total: number, pct: number = 30): number {
  return Math.round(total * (pct / 100) * 100) / 100;
}

export function calculerSolde(total: number, acompte: number): number {
  return Math.round((total - acompte) * 100) / 100;
}

/** Vérifie si un dossier est entièrement payé */
export function estEntierementPaye(acomptePaye: boolean, soldePaye: boolean): boolean {
  return acomptePaye && soldePaye;
}

/** Étapes restantes jusqu'à la clôture */
export function etapesRestantes(statut: StatutWorkflow): string[] {
  const tout: StatutWorkflow[] = [
    "COMMANDE","FACTURE","ACOMPTE_RECU","SOLDE_RECU","PRODUCTION","PRET","LIVRE","CLOTURE",
  ];
  const idx = tout.indexOf(statut);
  return idx < 0 ? tout.map(s => STATUT_LABELS[s]) : tout.slice(idx+1).map(s => STATUT_LABELS[s]);
}
