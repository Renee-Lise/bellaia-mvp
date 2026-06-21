// ═══════════════════════════════════════════════════════════
// MOTEUR CENTRAL DE GÉNÉRATION — Réutilisable par tous les pôles
// Génère : fiches produits, catalogues, flyers, devis, factures,
//          contrats, contenus RS, descriptions commerciales
// Toute génération = brouillon + validation fondatrice obligatoire
// ═══════════════════════════════════════════════════════════

export type TypeGeneration =
  | "fiche_produit"
  | "fiche_prestation"
  | "catalogue"
  | "flyer"
  | "affiche"
  | "devis"
  | "facture"
  | "contrat"
  | "fiche_fournisseur"
  | "post_facebook"
  | "post_instagram"
  | "story"
  | "statut_whatsapp"
  | "description_commerciale"
  | "script_video"
  | "storyboard";

export interface DemandeGeneration {
  type:         TypeGeneration;
  pole:         string;
  contexte:     Record<string, any>;  // données du produit/prestation
  style?:       "elegant" | "festif" | "professionnel" | "ludique";
  langue?:      "fr" | "en" | "cr";  // français, anglais, créole
}

export interface ResultatGeneration {
  type:         TypeGeneration;
  pole:         string;
  contenu:      string;
  statut:       "brouillon";  // toujours brouillon — validation fondatrice requise
  version:      number;
  cree_le:      string;
  prompt_utilise?: string;
}

// ── Prompts par type de génération
export function construirePrompt(demande: DemandeGeneration): string {
  const { type, pole, contexte, style = "professionnel", langue = "fr" } = demande;
  const langue_label = langue === "fr" ? "français" : langue === "cr" ? "créole guyanais" : "anglais";
  const style_label = { elegant:"élégant et raffiné", festif:"festif et dynamique", professionnel:"professionnel et sobre", ludique:"ludique et coloré" }[style];

  const BASE = `Tu es Bellaïa, l'assistante IA de Bella'Studio (${pole}), Sinnamary, Guyane française.
Génère le contenu suivant en ${langue_label}, style ${style_label}.
N'utilise PAS de hashtags génériques. Adapte au contexte guyanais.
Réponds UNIQUEMENT avec le contenu demandé, sans introduction ni explication.`;

  const ctx = JSON.stringify(contexte, null, 2);

  const PROMPTS: Record<TypeGeneration, string> = {
    fiche_produit: `${BASE}\n\nCrée une fiche produit complète pour :\n${ctx}\n\nInclure : nom commercial, description courte (1 ligne), description longue (3-4 lignes), bénéfices clés (3 bullet points), mots-clés SEO (5-7 mots).`,

    fiche_prestation: `${BASE}\n\nCrée une fiche prestation pour :\n${ctx}\n\nInclure : nom, description (2-3 lignes), ce qui est inclus, ce qui n'est pas inclus, durée estimée, résultat attendu.`,

    catalogue: `${BASE}\n\nCrée un texte de catalogue pour le produit/service :\n${ctx}\n\nFormat : titre accrocheur + description vendeuse (4-5 lignes) + prix + appel à l'action.`,

    flyer: `${BASE}\n\nCrée le texte d'un flyer pour :\n${ctx}\n\nFormat : titre principal (5 mots max), sous-titre (10 mots max), 3 arguments courts, prix/offre, contact/CTA.`,

    affiche: `${BASE}\n\nCrée le texte d'une affiche pour :\n${ctx}\n\nFormat : titre (3-5 mots), accroche (1 ligne), corps du message (2-3 lignes), informations pratiques.`,

    devis: `${BASE}\n\nRédige un texte d'introduction et des conditions pour un devis concernant :\n${ctx}\n\nInclure : formule de politesse, objet précis, conditions de validité (30 jours), modalités d'acompte (30%), conditions de livraison.`,

    facture: `${BASE}\n\nRédige les mentions légales et conditions de paiement pour une facture concernant :\n${ctx}\n\nInclure : délais de paiement, pénalités de retard, mentions légales requises en France.`,

    contrat: `${BASE}\n\nRédige les clauses principales d'un contrat de prestation pour :\n${ctx}\n\nInclure : objet, obligations de chaque partie, modalités de paiement, clause de résiliation, clause de confidentialité. Préciser que ce texte doit être validé par un professionnel du droit.`,

    fiche_fournisseur: `${BASE}\n\nCrée une fiche fournisseur pour :\n${ctx}\n\nInclure : évaluation (qualité, délais, prix), conditions de commande, contacts utiles, notes importantes.`,

    post_facebook: `${BASE}\n\nCrée un post Facebook engageant pour :\n${ctx}\n\nFormat : accroche (1 ligne), développement (3-4 lignes), appel à l'action, 3-5 émojis pertinents. Pas de hashtags génériques.`,

    post_instagram: `${BASE}\n\nCrée une légende Instagram pour :\n${ctx}\n\nFormat : phrase d'accroche percutante, description visuelle (2-3 lignes), storytelling court, appel à l'action. 5-8 émojis. 8-10 hashtags pertinents à la fin.`,

    story: `${BASE}\n\nCrée le texte d'une story pour :\n${ctx}\n\nFormat : texte court et percutant (max 15 mots), ton direct et enthousiaste. Inclure un sondage ou question engageante si pertinent.`,

    statut_whatsapp: `${BASE}\n\nCrée un statut WhatsApp pour :\n${ctx}\n\nFormat : message court (max 700 caractères), percutant, avec émojis, contact clair.`,

    description_commerciale: `${BASE}\n\nCrée une description commerciale complète pour :\n${ctx}\n\nInclure : accroche, bénéfices, public cible, différenciateur, appel à l'action.`,

    script_video: `${BASE}\n\nCrée un script vidéo pour :\n${ctx}\n\nInclure : durée estimée (30-60 secondes), intro (5 sec), présentation produit/service (20-30 sec), bénéfices clés (10-15 sec), CTA final (5 sec), texte voix-off complet.`,

    storyboard: `${BASE}\n\nCrée un storyboard textuel pour une vidéo concernant :\n${ctx}\n\nDécouper en 5-7 scènes avec : description visuelle, texte à l'écran, voix-off, durée de chaque scène.`,
  };

  return PROMPTS[type] || `${BASE}\n\nGénère un contenu de type ${type} pour :\n${ctx}`;
}

// ── Appel à l'API Bellaïa (chat route)
export async function generer(demande: DemandeGeneration): Promise<ResultatGeneration> {
  const prompt = construirePrompt(demande);

  const r = await fetch("/api/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    }),
  });

  if (!r.ok) throw new Error(`Génération échouée : ${r.status}`);
  const d = await r.json();
  const contenu = d.content?.[0]?.text || "Contenu non généré.";

  return {
    type:     demande.type,
    pole:     demande.pole,
    contenu,
    statut:   "brouillon",
    version:  1,
    cree_le:  new Date().toISOString(),
    prompt_utilise: prompt,
  };
}

// ── Labels lisibles pour l'UI
export const LABELS_GENERATION: Record<TypeGeneration, string> = {
  fiche_produit:           "📦 Fiche produit",
  fiche_prestation:        "💅 Fiche prestation",
  catalogue:               "📖 Catalogue",
  flyer:                   "📄 Flyer",
  affiche:                 "🖼 Affiche",
  devis:                   "📋 Devis",
  facture:                 "💰 Facture",
  contrat:                 "📝 Contrat",
  fiche_fournisseur:       "🏭 Fiche fournisseur",
  post_facebook:           "👍 Post Facebook",
  post_instagram:          "📸 Post Instagram",
  story:                   "⚡ Story",
  statut_whatsapp:         "💬 Statut WhatsApp",
  description_commerciale: "✍️ Description commerciale",
  script_video:            "🎬 Script vidéo",
  storyboard:              "🎞 Storyboard",
};
