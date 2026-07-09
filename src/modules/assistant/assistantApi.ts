// ═══════════════════════════════════════════════════════════
// assistantApi.ts — Connexion IA Bellaïa LOT IX-B/C
// Utilise /api/chat (route Next.js existante) → Anthropic
// Fallback mock si indisponible
// src/modules/assistant/assistantApi.ts
// ═══════════════════════════════════════════════════════════
import type {
  DomaineIA, Message, ReponseIA, TypeIntention,
  ActionProposee, ConfigurationProduit,
} from "./assistantTypes";
import {
  genMsgId, genActionId, now, getSuggestions,
  requiertValidation, tronquer,
} from "./assistantUtils";
import { getPromptSysteme } from "./assistantPrompts";
import { routerLocal, parseReponseRouteur, fusionnerDetections } from "./assistantRouter";

// ── Config ─────────────────────────────────────────────────
const API_ROUTE = "/api/chat";           // Route Next.js existante
const TIMEOUT_MS = 15000;

// ── Contexte Supabase (pour enrichir les réponses) ─────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers: { apikey:SB_KEY(),
        Authorization:"Bearer " + ((await (window as any).getTokenAsync?.()) ?? SB_KEY()) },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════
// CONTEXTE EN DIRECT — injecté dans chaque message
// Données réelles depuis Supabase pour enrichir les réponses
// ══════════════════════════════════════════════════════════
async function chargerContexteLive(domaine: DomaineIA): Promise<string> {
  const lignes: string[] = [];

  try {
    if (domaine === "ERP" || domaine === "GENERAL") {
      // Clients actifs
      const clients = await sbGet("bellaia_clients",
        "statut=eq.actif&limit=5&select=nom,prenom,telephone");
      if (clients.length) {
        lignes.push(`Clients actifs récents : ${clients.map(c =>
          [c.prenom, c.nom].filter(Boolean).join(" ")).join(", ")}`);
      }
      // Factures en attente
      const factures = await sbGet("bellaia_factures",
        "statut=in.(emise,envoyee,partiellement_payee)&limit=5&select=reference,client_nom,total_ttc");
      if (factures.length) {
        const total = factures.reduce((s, f) => s + (f.total_ttc || 0), 0);
        lignes.push(`${factures.length} facture(s) en attente — total : ${total.toFixed(2)}€`);
      }
      // Alertes stock
      const alertes = await sbGet("v_stock_alertes",
        "niveau_alerte=neq.ok&limit=5&select=nom,business_unit,niveau_alerte");
      if (alertes.length) {
        lignes.push(`Alertes stock : ${alertes.map(a => a.nom).join(", ")}`);
      }
    }

    if (domaine === "FOOD" || domaine === "ERP") {
      const recettes = await sbGet("food_recettes",
        "statut=eq.validee&limit=5&select=nom,prix_conseille");
      if (recettes.length) {
        lignes.push(`Recettes validées : ${recettes.map(r => r.nom).join(", ")}`);
      }
    }

    if (domaine === "EVENTS" || domaine === "ERP") {
      const devis = await sbGet("events_demandes",
        "statut=in.(en_attente,devis_envoye)&limit=5&select=reference,client_nom,montant_estime");
      if (devis.length) {
        lignes.push(`Devis en attente : ${devis.map(d =>
          `${d.client_nom} (${d.montant_estime ? d.montant_estime + "€" : "devis à établir"})`
        ).join(", ")}`);
      }
    }

    // ── Contexte CRM (tous domaines) ──────────────────────
    if (domaine === "ERP" || domaine === "GENERAL") {
      const annivs = await sbGet("bellaia_clients",
        "statut=eq.actif&limit=100&select=nom,prenom,date_naissance");
      const aujourdhui = new Date();
      const auj = annivs.filter(c => {
        if (!c.date_naissance) return false;
        const d = new Date(c.date_naissance);
        return d.getDate() === aujourdhui.getDate()
          && d.getMonth() === aujourdhui.getMonth();
      });
      if (auj.length) {
        lignes.push(`🎂 Anniversaire(s) aujourd'hui : ${auj.map(c =>
          [c.prenom, c.nom].filter(Boolean).join(" ")).join(", ")}`);
      }
    }

    // ── Messages non lus ──────────────────────────────────
    const nonLus = await sbGet("bellaia_messages",
      "lu=eq.false&limit=5&select=expediteur_nom,contenu,created_at");
    if (nonLus.length) {
      lignes.push(`💬 ${nonLus.length} message(s) non lu(s) en attente`);
    }

    // ── Documents récents ─────────────────────────────────
    const docs = await sbGet("bellaia_documents",
      `module=eq.${domaine}&order=created_at.desc&limit=3&select=titre,categorie,statut`);
    if (docs.length) {
      lignes.push(`📁 Documents récents (${domaine}) : ${docs.map(d => d.titre).join(", ")}`);
    }

  } catch { /* silencieux */ }

  if (!lignes.length) return "";
  return "\n\nDonnées temps réel Bellaïa :\n" + lignes.map(l => "• " + l).join("\n");
}

// ══════════════════════════════════════════════════════════
// APPEL API PRINCIPAL
// ══════════════════════════════════════════════════════════
export interface ParamsEnvoi {
  messages:     Message[];
  domaine:      DomaineIA;
  texteUser:    string;
  avecContexte?: boolean;
}

export async function envoyerMessage(params: ParamsEnvoi): Promise<ReponseIA> {
  const { messages, domaine, texteUser, avecContexte = true } = params;

  // 1. Routage local (instantané, sans API)
  const intentionLocale = routerLocal(texteUser);

  // 2. Contexte live Supabase
  const ctxLive = avecContexte ? await chargerContexteLive(domaine) : "";

  // 3. Construire le prompt système
  const systemPrompt = getPromptSysteme(domaine) + ctxLive;

  // 4. Construire l'historique pour l'API
  const historique = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-10)   // 10 derniers messages max
    .map(m => ({ role: m.role as "user"|"assistant", content: m.contenu }));

  historique.push({ role:"user", content: texteUser });

  // 5. Appel API avec timeout
  let texteReponse = "";
  let apiOk = false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const resp = await fetch(API_ROUTE, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        system:   systemPrompt,
        messages: historique,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      texteReponse = data?.content?.[0]?.text
        || data?.text
        || data?.message
        || "";
      apiOk = !!texteReponse;
    }
  } catch { /* timeout ou réseau — fallback mock */ }

  // 6. Fallback mock si API indisponible
  if (!apiOk) {
    texteReponse = genererReponseMock(texteUser, domaine, intentionLocale.type);
  }

  // 7. Détecter les actions proposées dans la réponse
  const actions = extraireActionsDeLaReponse(texteReponse, domaine);

  // 8. Suggestions de suivi
  const suggestions = getSuggestions(domaine, 3);

  return {
    texte:      texteReponse,
    domaine,
    intention:  intentionLocale.type,
    actions:    actions.length > 0 ? actions : undefined,
    suggestions,
  };
}

// ══════════════════════════════════════════════════════════
// MOCK — réponses locales si l'API est indisponible
// ══════════════════════════════════════════════════════════
function genererReponseMock(
  texte: string, domaine: DomaineIA, intention: TypeIntention
): string {
  const q = texte.toLowerCase();

  // Réponses spécifiques par domaine
  if (domaine === "ERP") {
    if (q.includes("chiffre") || q.includes("ca ")) {
      return "Je ne peux pas accéder aux données financières en ce moment (connexion IA indisponible). Consultez l'onglet **Factures** pour voir le CA en temps réel.";
    }
    if (q.includes("client") && (q.includes("trouve") || q.includes("cherche"))) {
      return "Pour retrouver un client, utilisez l'onglet **🔍 Recherche** du hub — il cherche dans tous les modules simultanément.";
    }
  }

  if (domaine === "FOOD") {
    if (q.includes("recette")) {
      return "Pour consulter ou modifier vos recettes, rendez-vous dans l'onglet **📖 Recettes** de Bella'Food. Vous pouvez y filtrer par catégorie, modifier les statuts, et voir les coûts.";
    }
    if (q.includes("stock") || q.includes("ingrédient")) {
      return "Les stocks Bella'Food sont visibles dans **Stock ERP** (stock central) et dans l'onglet **Stocks** de Bella'Food. Les alertes y sont signalées automatiquement.";
    }
  }

  if (domaine === "EVENTS") {
    if (q.includes("devis")) {
      return "Pour créer ou consulter un devis, allez dans **Bella'Events → Devis**. Vous pouvez y générer un devis, l'envoyer par WhatsApp, et suivre l'acceptation client.";
    }
  }

  if (domaine === "COMM") {
    return "Je peux vous aider à rédiger du contenu pour vos réseaux sociaux. Précisez le pôle (Food, Events, BSH…) et le type de publication (post, story, légende photo).";
  }

  // Réponse générique selon l'intention
  const reponsesGeneriques: Partial<Record<TypeIntention, string>> = {
    RECHERCHE:         "Utilisez l'onglet **🔍 Recherche** du hub pour trouver rapidement clients, devis, factures et produits.",
    ANALYSE:           "La connexion à l'IA est temporairement indisponible. Consultez le **Dashboard** pour les métriques en temps réel.",
    CREER_POST_SOCIAL: "Donnez-moi le pôle et le sujet, et je rédigerai votre post dès la reconnexion. En attendant, décrivez votre contenu et je le formaterai.",
    CREER_DOCUMENT:    "Pour créer un devis, utilisez le module Events ou Food. Pour une facture, le workflow ERP génère les FAC- automatiquement.",
    PREPARER_LISTE:    "Je prépare votre liste dès la reconnexion. En attendant, consultez les **Alertes stock** dans Bella'Food.",
  };

  return reponsesGeneriques[intention]
    || "Je suis Bellaïa, votre assistante Bella'Studio. La connexion IA est temporairement indisponible — je fonctionne en mode local. Reformulez votre question et je ferai de mon mieux pour vous aider.";
}

// ══════════════════════════════════════════════════════════
// EXTRACTION D'ACTIONS DEPUIS LA RÉPONSE
// Détecte les propositions d'action dans le texte IA
// ══════════════════════════════════════════════════════════
function extraireActionsDeLaReponse(
  texte: string, domaine: DomaineIA
): ActionProposee[] {
  const actions: ActionProposee[] = [];

  // Patterns indiquant une action proposée
  const patternsAction = [
    { pattern:/je peux créer (?:le |un |la )?(?:client|fiche) (.+)/i,    type:"creer_client" as const },
    { pattern:/je peux (?:préparer|générer) (?:le |un )?devis pour (.+)/i, type:"creer_devis" as const },
    { pattern:/je peux créer (?:la |une )?facture pour (.+)/i,           type:"creer_facture" as const },
    { pattern:/je peux (?:rédiger|créer) (?:ce |ce post|un post) (.+)/i, type:"creer_produit_catalogue" as const },
  ];

  for (const { pattern, type } of patternsAction) {
    const match = texte.match(pattern);
    if (match) {
      actions.push({
        id:          genActionId(),
        type,
        libelle:     `Créer : ${tronquer(match[1] || "", 60)}`,
        description: `Action proposée par Bellaïa IA — en attente de validation`,
        payload:     { source: match[1] || "", domaine },
        domaine,
        risque:      "moyen",
        statut:      "en_attente_validation",
        creeLe:      now(),
      });
    }
  }

  return actions;
}

// ══════════════════════════════════════════════════════════
// CLASSIFICATION DE CONTENU
// ══════════════════════════════════════════════════════════
export async function classifierContenu(contenu: string): Promise<{
  module: DomaineIA; categorie: string; confiance: number;
}> {
  try {
    const resp = await fetch(API_ROUTE, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        system:   "Tu es un classificateur. Réponds uniquement en JSON : {\"module\":\"FOOD|EVENTS|BSH|ODYSSEE|EDITIONS|MOTIPY|VILO|ERP|COMM|GENERAL\",\"categorie\":\"string\",\"confiance\":0-100}",
        messages: [{ role:"user", content: tronquer(contenu, 300) }],
        max_tokens: 100,
      }),
    });
    if (resp.ok) {
      const data  = await resp.json();
      const texte = data?.content?.[0]?.text || "{}";
      const clean = texte.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }
  } catch {}
  // Fallback : routeur local
  const local = routerLocal(contenu);
  return { module: local.domaine, categorie: "general", confiance: local.confiance };
}
