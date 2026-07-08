// ═══════════════════════════════════════════════════════════
// WorkflowEngine.ts — Moteur Workflow Universel Bellaïa
// Transitions validées, audit log, notifications, stock
// src/modules/core/WorkflowEngine.ts
// LOT VIII — partagé par tous les modules
// ═══════════════════════════════════════════════════════════
import type {
  StatutWorkflow, BU, TransitionWorkflow,
  CommandeUniverselle, LivraisonUniverselle,
  NotificationWorkflow, TacheProduction,
} from "./workflowTypes";
import {
  transitionAutorisee, STATUT_LABELS,
} from "./workflowTypes";
import {
  genCommandeRef, genFactureRef, genLivraisonRef,
  genRef, buildMessageWhatsApp, buildBonLivraisonHTML,
  calculerAcompte, calculerSolde,
} from "./workflowUtils";

// ── Config Supabase ────────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function token(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
}

async function sbPost(table: string, body: object): Promise<any | null> {
  if (!SB_URL()) return null;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY(), Authorization: "Bearer " + await token(),
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  } catch { return null; }
}

async function sbPatch(table: string, id: string, body: object): Promise<boolean> {
  if (!SB_URL()) return false;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SB_KEY(), Authorization: "Bearer " + await token(),
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch { return false; }
}

async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers: { apikey: SB_KEY(), Authorization: "Bearer " + await token() },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════
// RÉSULTAT DE TRANSITION
// ══════════════════════════════════════════════════════════
export interface ResultatTransition {
  ok: boolean;
  raison?: string;
  nouveauStatut?: StatutWorkflow;
  actionsLancees?: string[];
}

// ══════════════════════════════════════════════════════════
// MOTEUR PRINCIPAL
// ══════════════════════════════════════════════════════════
export const WorkflowEngine = {

  /**
   * Appliquer une transition d'état.
   * Valide la transition, enregistre le journal, déclenche les actions.
   */
  async transitionner(params: {
    entiteTable: string;
    entiteId: string;
    bu: BU;
    statutActuel: StatutWorkflow;
    nouveauStatut: StatutWorkflow;
    commentaire?: string;
    operateur?: string;
    clientTel?: string;
    clientNom?: string;
    reference?: string;
    montant?: number;
  }): Promise<ResultatTransition> {
    const { statutActuel, nouveauStatut } = params;

    // 1. Valider la transition
    const check = transitionAutorisee(statutActuel, nouveauStatut);
    if (!check.ok) {
      return { ok: false, raison: check.raison };
    }

    const actionsLancees: string[] = [];

    // 2. Enregistrer dans le journal d'audit
    const entreeAudit = await sbPost("workflow_transitions", {
      entite_table:  params.entiteTable,
      entite_id:     params.entiteId,
      bu:            params.bu,
      statut_avant:  statutActuel,
      statut_apres:  nouveauStatut,
      commentaire:   params.commentaire,
      operateur:     params.operateur || "system",
      date_action:   new Date().toISOString(),
    });
    if (entreeAudit) actionsLancees.push("audit_log");

    // 3. Actions automatiques selon le statut cible
    const contexte = {
      clientNom:  params.clientNom || "Client",
      reference:  params.reference || params.entiteId,
      montant:    params.montant,
      acompte:    params.montant ? calculerAcompte(params.montant) : undefined,
      bu:         params.bu,
    };

    switch (nouveauStatut) {

      case "COMMANDE": {
        // Créer la commande dans bellaia_commandes
        const ref = genCommandeRef();
        await sbPost("bellaia_commandes", {
          reference:       ref,
          bu:              params.bu,
          source_table:    params.entiteTable,
          source_id:       params.entiteId,
          client_nom:      params.clientNom,
          statut:          "COMMANDE",
          total:           params.montant || 0,
          date_commande:   new Date().toISOString().split("T")[0],
        });
        actionsLancees.push("commande_creee:" + ref);
        break;
      }

      case "FACTURE": {
        // Créer la facture FAC-
        const facRef = genFactureRef();
        const total  = params.montant || 0;
        const acompte= calculerAcompte(total);
        await sbPost("bellaia_factures", {
          reference:       facRef,
          business_unit:   params.bu,
          commande_id:     params.entiteId,
          source_table:    params.entiteTable,
          client_nom:      params.clientNom || "",
          sous_total:      total,
          total_ttc:       total,
          acompte,
          solde:           calculerSolde(total, acompte),
          statut:          "emise",
          date_emission:   new Date().toISOString().split("T")[0],
        });
        // Mettre à jour la liaison_comptable sur l'entité source
        await sbPatch(params.entiteTable, params.entiteId, { liaison_comptable: facRef });
        actionsLancees.push("facture_creee:" + facRef);
        break;
      }

      case "ACOMPTE_RECU": {
        // Créer le paiement PAY- pour l'acompte
        const payRef = genRef("PAY");
        const acompte = params.montant ? calculerAcompte(params.montant) : 0;
        await sbPost("bellaia_paiements", {
          reference:      payRef,
          business_unit:  params.bu,
          source_table:   params.entiteTable,
          source_id:      params.entiteId,
          montant:        acompte,
          statut:         "confirme",
          date_paiement:  new Date().toISOString(),
          notes:          "Acompte — " + (params.reference || ""),
        });
        await sbPatch(params.entiteTable, params.entiteId, { acompte_paye: true });
        actionsLancees.push("paiement_acompte:" + payRef);
        break;
      }

      case "SOLDE_RECU": {
        const payRef = genRef("PAY");
        const solde  = params.montant
          ? calculerSolde(params.montant, calculerAcompte(params.montant)) : 0;
        await sbPost("bellaia_paiements", {
          reference:      payRef,
          business_unit:  params.bu,
          source_table:   params.entiteTable,
          source_id:      params.entiteId,
          montant:        solde,
          statut:         "confirme",
          date_paiement:  new Date().toISOString(),
          notes:          "Solde — " + (params.reference || ""),
        });
        await sbPatch(params.entiteTable, params.entiteId, { statut_paiement: "solde_paye" });
        actionsLancees.push("paiement_solde:" + payRef);
        break;
      }

      case "PRODUCTION": {
        // Créer les tâches de base dans bellaia_taches_production
        const taches: TacheProduction[] = [
          { id:"t1", commandeRef:params.reference||"", bu:params.bu, libelle:"Préparer les ingrédients / matériaux", ordre:1, faite:false },
          { id:"t2", commandeRef:params.reference||"", bu:params.bu, libelle:"Production principale", ordre:2, faite:false },
          { id:"t3", commandeRef:params.reference||"", bu:params.bu, libelle:"Contrôle qualité", ordre:3, faite:false },
          { id:"t4", commandeRef:params.reference||"", bu:params.bu, libelle:"Conditionnement / emballage", ordre:4, faite:false },
        ];
        for (const t of taches) {
          await sbPost("bellaia_taches_production", {
            commande_ref: t.commandeRef,
            bu:           t.bu,
            libelle:      t.libelle,
            ordre:        t.ordre,
            faite:        false,
            source_table: params.entiteTable,
            source_id:    params.entiteId,
          });
        }
        actionsLancees.push("taches_production_creees");
        break;
      }

      case "PRET":
      case "LIVRE": {
        // Créer la livraison LIV-
        const livRef = genLivraisonRef();
        const livPayload: Partial<LivraisonUniverselle> = {
          reference:   livRef,
          commandeRef: params.reference || params.entiteId,
          bu:          params.bu,
          clientNom:   params.clientNom || "",
          mode:        "retrait",
          statut:      nouveauStatut === "PRET" ? "prete" : "livree",
        };
        await sbPost("bellaia_livraisons", {
          reference:      livRef,
          commande_ref:   livPayload.commandeRef,
          business_unit:  params.bu,
          client_nom:     livPayload.clientNom,
          mode:           "retrait",
          statut:         livPayload.statut,
        });
        actionsLancees.push("livraison:" + livRef);
        break;
      }

      case "CLOTURE": {
        // Archiver proprement
        await sbPatch(params.entiteTable, params.entiteId, {
          statut:    "CLOTURE",
          cloture_le:new Date().toISOString(),
        });
        actionsLancees.push("dossier_cloture");
        break;
      }
    }

    // 4. Créer la notification (silencieux, branché plus tard sur WhatsApp/email)
    if (params.clientTel || params.clientNom) {
      const message = buildMessageWhatsApp(nouveauStatut, contexte);
      await sbPost("bellaia_notifications", {
        entite_table:  params.entiteTable,
        entite_id:     params.entiteId,
        bu:            params.bu,
        destinataire:  "client",
        type_statut:   nouveauStatut,
        canal:         "whatsapp",
        message,
        envoyee:       false,
        date_creation: new Date().toISOString(),
      });
      actionsLancees.push("notification_preparee");
    }

    return {
      ok: true,
      nouveauStatut,
      actionsLancees,
    };
  },

  // ── Récupérer le journal d'audit d'un dossier ──────────
  async getJournal(entiteTable: string, entiteId: string): Promise<TransitionWorkflow[]> {
    const rows = await sbGet(
      "workflow_transitions",
      `entite_table=eq.${entiteTable}&entite_id=eq.${entiteId}&order=date_action.desc&limit=50`
    );
    return rows.map((r: any): TransitionWorkflow => ({
      id:           r.id,
      entiteTable:  r.entite_table,
      entiteId:     r.entite_id,
      bu:           r.bu,
      statutAvant:  r.statut_avant,
      statutApres:  r.statut_apres,
      commentaire:  r.commentaire,
      operateur:    r.operateur,
      dateAction:   r.date_action,
    }));
  },

  // ── Récupérer les notifications non envoyées ───────────
  async getNotificationsEnAttente(bu?: BU): Promise<NotificationWorkflow[]> {
    const params = (bu ? `bu=eq.${bu}&` : "") + "envoyee=eq.false&order=date_creation.asc&limit=20";
    const rows   = await sbGet("bellaia_notifications", params);
    return rows.map((r: any): NotificationWorkflow => ({
      id:             r.id,
      entiteId:       r.entite_id,
      bu:             r.bu,
      destinataire:   r.destinataire,
      type:           r.type_statut,
      canal:          r.canal,
      message:        r.message,
      envoyee:        r.envoyee,
      dateCreation:   r.date_creation,
    }));
  },

  // ── Marquer notification comme envoyée ─────────────────
  async marquerEnvoyee(notifId: string): Promise<void> {
    await sbPatch("bellaia_notifications", notifId, { envoyee: true, date_envoi: new Date().toISOString() });
  },

  // ── Générer et imprimer un bon de livraison ────────────
  imprimerBonLivraison(liv: LivraisonUniverselle): void {
    const html = buildBonLivraisonHTML(liv);
    const win  = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  },
};

// Export nommé pour usage direct
export const {
  transitionner,
  getJournal,
  getNotificationsEnAttente,
  marquerEnvoyee,
  imprimerBonLivraison,
} = WorkflowEngine;
