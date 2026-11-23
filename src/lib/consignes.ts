// ═══════════════════════════════════════════════════════════
// Bibliothèque interne de modèles de consignes (prompts), classée par métier.
// • Modèles éditables et versionnés : la version 1 est livrée ici ; chaque modification enregistre une
//   NOUVELLE version (bellaia_documents, module CONSIGNES) sans écraser l'ancienne.
// • Une consigne n'exécute rien : elle produit un texte à copier. Aucun appel IA, donc aucun coût, n'est
//   déclenché par la bibliothèque.
// • Les expressions vues sur des captures ou des vidéos (« /commande », « ultrathink », « mode expert »…)
//   ne sont PAS des commandes garanties : elles sont signalées et traitées comme du texte ordinaire.
// • Règles communes ajoutées à chaque consigne : sources tracées, coûts annoncés, aucune publication,
//   dépense, suppression ou décision sensible sans autorisation.
// Code pur, testé par tests/unit/t_consignes.js.
// ═══════════════════════════════════════════════════════════

export const METIERS = [
  ["recherche", "Recherche et veille"],
  ["developpement", "Développement et correction"],
  ["administratif", "Gestion administrative"],
  ["contenus", "Création de contenus"],
  ["communication", "Communication et marketing"],
  ["donnees", "Analyse de données"],
  ["formation", "Formation et pédagogie"],
  ["securite", "Sécurité et conformité"],
] as const;
export type Metier = typeof METIERS[number][0];
export type Risque = "lecture" | "brouillon" | "action_sensible";
export type Variable = { nom: string; libelle: string; exemple?: string; facultatif?: boolean };
export type Consigne = { cle: string; metier: Metier; titre: string; objectif: string; variables: Variable[]; texte: string; sortie: string; risque: Risque; version: number };

export const RISQUES: Record<Risque, { libelle: string; autorisation: string }> = {
  lecture: { libelle: "Lecture et analyse", autorisation: "Aucune autorisation : rien n'est modifié ni publié." },
  brouillon: { libelle: "Production d'un brouillon", autorisation: "Relecture par la fondatrice avant toute utilisation ou diffusion." },
  action_sensible: { libelle: "Action sensible", autorisation: "Accord écrit de la fondatrice avant toute publication, dépense, suppression, envoi ou décision ; l'action est journalisée." },
};

export const REGLES_COMMUNES = [
  "Cite chaque source utilisée (titre, lien ou document, date de consultation) ; sépare les faits vérifiés, les estimations et les hypothèses.",
  "N'invente aucun chiffre, nom, prix, avis, citation ou référence juridique ; écris « non vérifié » quand c'est le cas.",
  "Annonce avant de l'utiliser tout service payant et son coût estimé ; n'en déclenche aucun sans accord.",
  "Ne publie, n'envoie, n'achète, ne supprime et ne décide rien : propose, puis attends l'accord de la fondatrice.",
  "N'utilise que les données personnelles strictement nécessaires ; jamais de données de santé, de mineurs ou d'identité sans nécessité.",
  "Termine par : sources, actions proposées (avec leur niveau d'autorisation), points à vérifier.",
];

const V = (nom: string, libelle: string, exemple?: string, facultatif?: boolean): Variable => ({ nom, libelle, exemple, facultatif });

export const CONSIGNES_V1: Consigne[] = [
  // Recherche et veille
  { cle: "recherche.veille_concurrence", metier: "recherche", titre: "Veille concurrentielle", objectif: "Comparer des offres concurrentes à partir de sources publiques.", risque: "lecture", version: 1,
    variables: [V("univers", "Univers concerné", "Bella'Food"), V("zone", "Zone géographique", "Cayenne et Kourou"), V("concurrents", "Concurrents connus", "", true)],
    texte: "Réalise une veille sur les offres comparables à {{univers}} dans la zone {{zone}}. Concurrents déjà connus : {{concurrents}}. Pour chacun : offre, prix publics constatés, canaux, points forts et faibles.",
    sortie: "Tableau comparatif + 3 enseignements actionnables + liste des sources datées." },
  { cle: "recherche.verifier_source", metier: "recherche", titre: "Vérifier une information ou une vidéo", objectif: "Établir si une affirmation vue en ligne est fiable avant de l'appliquer.", risque: "lecture", version: 1,
    variables: [V("affirmation", "Affirmation ou conseil à vérifier"), V("origine", "Où elle a été vue", "Reel Instagram")],
    texte: "Vérifie l'affirmation suivante, vue sur {{origine}} : « {{affirmation}} ». Recherche la documentation officielle de l'outil ou de l'autorité concernés. Indique si elle est exacte, partiellement exacte, obsolète ou fausse.",
    sortie: "Verdict, preuve (documentation officielle), risques si on l'applique, recommandation." },
  { cle: "recherche.reglementation", metier: "recherche", titre: "Point réglementaire", objectif: "Identifier les règles applicables à une activité.", risque: "lecture", version: 1,
    variables: [V("activite", "Activité", "vente de pâtisseries faites maison"), V("territoire", "Territoire", "Guyane (France)")],
    texte: "Liste les obligations applicables à « {{activite}} » en {{territoire}}. Distingue obligations légales, recommandations et bonnes pratiques. Cite les articles (Légifrance, EUR-Lex, sites des administrations).",
    sortie: "Tableau obligation / texte / source officielle / applicabilité ; points à faire valider par un professionnel." },
  // Développement et correction
  { cle: "dev.corriger_anomalie", metier: "developpement", titre: "Corriger une anomalie", objectif: "Diagnostiquer et corriger un défaut sans régression.", risque: "brouillon", version: 1,
    variables: [V("symptome", "Ce qui se passe", "le bouton Commander ne réagit pas sur iPhone"), V("attendu", "Ce qui devrait se passer"), V("ecran", "Écran ou parcours concerné")],
    texte: "Anomalie : {{symptome}} (écran : {{ecran}}). Comportement attendu : {{attendu}}. Reproduis d'abord le défaut par un test, trouve la cause, corrige au plus petit, puis relance le test et les tests voisins.",
    sortie: "Cause, correctif, preuve (test avant/après), risques de régression ; aucune mise en production sans GO." },
  { cle: "dev.revue_securite", metier: "developpement", titre: "Revue de sécurité d'une modification", objectif: "Relire une modification comme un attaquant.", risque: "lecture", version: 1,
    variables: [V("modification", "Modification à relire (fichiers, commit)")],
    texte: "Relis {{modification}} en cherchant : contournement des droits par URL ou API, données d'un autre compte, injection, fuite de clé, écriture non autorisée, absence de limite. Propose un test pour chaque risque trouvé.",
    sortie: "Liste des risques (gravité, preuve), tests proposés ; aucun détail de faille non corrigée dans un dépôt public." },
  { cle: "dev.specification", metier: "developpement", titre: "Spécifier une fonctionnalité", objectif: "Transformer une demande en cahier des charges testable.", risque: "brouillon", version: 1,
    variables: [V("demande", "Demande en langage courant"), V("roles", "Rôles concernés", "cliente, assistante, fondatrice")],
    texte: "À partir de cette demande : « {{demande}} », rédige une spécification pour les rôles {{roles}} : parcours, règles d'accès, données, cas limites, critères d'acceptation, tests (dont accès direct par URL).",
    sortie: "Spécification + liste de tests + ce qui exige une migration ou une décision." },
  // Gestion administrative
  { cle: "admin.relance_facture", metier: "administratif", titre: "Relance de facture impayée", objectif: "Rédiger une relance courtoise et exacte.", risque: "action_sensible", version: 1,
    variables: [V("client", "Nom du client"), V("facture", "Numéro et date de la facture"), V("montant", "Montant dû"), V("echeance", "Échéance dépassée")],
    texte: "Rédige une relance pour {{client}} concernant la facture {{facture}} de {{montant}}, échue le {{echeance}}. Ton cordial, rappel des moyens de paiement, aucune menace ni pénalité non prévue au contrat.",
    sortie: "Projet de message (non envoyé) + rappel : l'envoi se fait par la fondatrice." },
  { cle: "admin.devis", metier: "administratif", titre: "Préparer un devis", objectif: "Établir un devis cohérent avec la grille tarifaire validée.", risque: "brouillon", version: 1,
    variables: [V("prestation", "Prestation demandée"), V("date", "Date souhaitée"), V("budget", "Budget indiqué", "", true)],
    texte: "Prépare un devis pour « {{prestation}} » le {{date}} (budget indiqué : {{budget}}). Utilise uniquement les prix validés ; signale tout prix manquant au lieu de l'inventer. Indique acompte ou arrhes, conditions d'annulation et validité.",
    sortie: "Lignes du devis, totaux, conditions, prix manquants à valider." },
  { cle: "admin.courrier", metier: "administratif", titre: "Courrier à une administration ou un fournisseur", objectif: "Rédiger un courrier formel.", risque: "action_sensible", version: 1,
    variables: [V("destinataire", "Destinataire"), V("objet", "Objet"), V("elements", "Faits et pièces à mentionner")],
    texte: "Rédige un courrier à {{destinataire}}, objet : {{objet}}. Éléments : {{elements}}. Ton professionnel, demandes précises, pièces jointes listées.",
    sortie: "Projet de courrier (non envoyé) ; l'envoi appartient à la fondatrice." },
  // Création de contenus
  { cle: "contenus.fiche_produit", metier: "contenus", titre: "Fiche produit", objectif: "Décrire un produit sans promesse non vérifiée.", risque: "brouillon", version: 1,
    variables: [V("produit", "Produit"), V("caracteristiques", "Caractéristiques vérifiées"), V("univers", "Univers", "Bella'Secret Home")],
    texte: "Rédige la fiche de « {{produit}} » pour {{univers}} à partir de ces caractéristiques vérifiées : {{caracteristiques}}. Aucune allégation de santé, aucun superlatif invérifiable, aucun prix non validé.",
    sortie: "Titre, description courte, description longue, texte alternatif de l'image, points à vérifier." },
  { cle: "contenus.histoire_jeunesse", metier: "contenus", titre: "Texte jeunesse", objectif: "Écrire ou réviser un texte pour enfants.", risque: "brouillon", version: 1,
    variables: [V("age", "Âge des lecteurs", "3-6 ans"), V("theme", "Thème"), V("personnages", "Personnages", "P'tit Lion, P'tite Liane")],
    texte: "Écris (ou révise) une histoire pour les {{age}} sur le thème « {{theme}} », avec {{personnages}}. Phrases courtes, vocabulaire adapté, aucune peur excessive, valeurs bienveillantes. Propose une mise en scène par page.",
    sortie: "Texte découpé en pages + mise en scène + texte alternatif par illustration ; à valider avant publication." },
  { cle: "contenus.texte_alternatif", metier: "contenus", titre: "Textes alternatifs d'images", objectif: "Rendre les images compréhensibles aux lecteurs d'écran.", risque: "brouillon", version: 1,
    variables: [V("images", "Liste des images et leur contexte")],
    texte: "Pour chaque image : {{images}}, rédige un texte alternatif de 125 caractères au plus, qui dit ce que l'image apporte dans son contexte ; « décorative » si elle n'apporte rien.",
    sortie: "Tableau image / texte alternatif / décorative oui-non." },
  // Communication et marketing
  { cle: "com.publication_reseaux", metier: "communication", titre: "Publication pour les réseaux sociaux", objectif: "Préparer une publication conforme.", risque: "action_sensible", version: 1,
    variables: [V("sujet", "Sujet"), V("reseau", "Réseau", "Instagram"), V("offre", "Offre éventuelle", "", true)],
    texte: "Prépare une publication {{reseau}} sur « {{sujet}} » (offre : {{offre}}). Indique clairement toute promotion et ses conditions ; aucun faux témoignage, aucune urgence artificielle ; mention « publicité » si partenariat.",
    sortie: "Texte, idée de visuel, hashtags ; non publié : la publication appartient à la fondatrice." },
  { cle: "com.newsletter", metier: "communication", titre: "Lettre d'information", objectif: "Rédiger un message aux clientes ayant donné leur accord.", risque: "action_sensible", version: 1,
    variables: [V("theme", "Thème du mois"), V("univers", "Univers concernés")],
    texte: "Rédige une lettre d'information sur « {{theme}} » pour {{univers}}, destinée uniquement aux personnes ayant accepté de la recevoir. Inclure le lien de désinscription et l'identité de l'expéditeur.",
    sortie: "Objet, texte, appel à l'action ; envoi interdit sans liste de consentements vérifiée et accord." },
  { cle: "com.reponse_cliente", metier: "communication", titre: "Réponse à une cliente", objectif: "Répondre à un message ou une réclamation.", risque: "brouillon", version: 1,
    variables: [V("message", "Message reçu"), V("contexte", "Commande ou contexte", "", true)],
    texte: "Propose une réponse au message suivant : « {{message}} » (contexte : {{contexte}}). Ton chaleureux, solution concrète, aucun engagement de remboursement ou de geste commercial sans accord.",
    sortie: "Projet de réponse + engagements à faire valider." },
  // Analyse de données
  { cle: "donnees.ventes", metier: "donnees", titre: "Analyse des ventes", objectif: "Comprendre les ventes d'une période.", risque: "lecture", version: 1,
    variables: [V("periode", "Période"), V("univers", "Univers"), V("donnees", "Export ou chiffres fournis")],
    texte: "Analyse les ventes de {{univers}} sur {{periode}} à partir de : {{donnees}}. Calcule chiffre d'affaires, panier moyen, produits phares, évolution ; signale les données manquantes au lieu de les estimer.",
    sortie: "Indicateurs, graphiques proposés, 3 décisions possibles, limites des données." },
  { cle: "donnees.marge", metier: "donnees", titre: "Calcul de marge", objectif: "Vérifier la rentabilité d'un produit.", risque: "lecture", version: 1,
    variables: [V("produit", "Produit"), V("couts", "Coûts réels (factures, quantités)"), V("prix", "Prix de vente")],
    texte: "Calcule la marge de « {{produit}} » vendu {{prix}} avec ces coûts réels : {{couts}}. Détaille matière, emballage, transport vers la Guyane, temps, frais de paiement. Indique ce qui est estimé.",
    sortie: "Coût de revient, marge brute, prix minimal conseillé, hypothèses." },
  { cle: "donnees.stocks", metier: "donnees", titre: "Alerte de stocks", objectif: "Anticiper les ruptures et les péremptions.", risque: "lecture", version: 1,
    variables: [V("inventaire", "Inventaire ou export des stocks"), V("delai", "Délai de réapprovisionnement", "3 semaines")],
    texte: "À partir de {{inventaire}} et d'un délai de réapprovisionnement de {{delai}}, liste les articles à commander, les ruptures probables et les dates limites proches.",
    sortie: "Liste priorisée ; aucune commande passée." },
  // Formation et pédagogie
  { cle: "formation.fiche_exercice", metier: "formation", titre: "Fiche d'exercices maternelle", objectif: "Créer une fiche originale à partir d'une compétence.", risque: "brouillon", version: 1,
    variables: [V("niveau", "Niveau", "GS"), V("competence", "Compétence visée"), V("theme", "Thème guyanais", "la pirogue")],
    texte: "Crée une fiche originale de niveau {{niveau}} pour travailler « {{competence}} », sur le thème {{theme}}. Consigne courte lue par l'adulte, 1 exemple, difficulté progressive, corrigé. Ne reproduis aucune fiche existante.",
    sortie: "Consigne, contenu, corrigé, compétence du programme, adaptation possible." },
  { cle: "formation.tutoriel_equipe", metier: "formation", titre: "Tutoriel pour l'équipe", objectif: "Expliquer une tâche à une assistante.", risque: "brouillon", version: 1,
    variables: [V("tache", "Tâche"), V("outil", "Écran Bellaïa concerné")],
    texte: "Rédige un tutoriel pas à pas pour réaliser « {{tache}} » dans {{outil}}, pour une personne qui découvre l'application sur iPhone. Une action par étape, erreurs fréquentes, à qui demander de l'aide.",
    sortie: "Étapes numérotées, captures à prévoir, vérification finale." },
  { cle: "formation.quiz", metier: "formation", titre: "Questionnaire de vérification", objectif: "Vérifier qu'une règle est comprise.", risque: "brouillon", version: 1,
    variables: [V("regle", "Règle ou procédure"), V("public", "Public", "assistantes")],
    texte: "Crée 8 questions à choix multiple pour vérifier que les {{public}} ont compris : {{regle}}. Une seule bonne réponse, explication pour chaque réponse.",
    sortie: "Questions, réponses, explications." },
  // Sécurité et conformité
  { cle: "securite.incident", metier: "securite", titre: "Qualifier un incident de sécurité", objectif: "Établir les faits et les obligations après un incident.", risque: "action_sensible", version: 1,
    variables: [V("faits", "Faits constatés"), V("decouverte", "Date et heure de découverte")],
    texte: "Incident découvert le {{decouverte}} : {{faits}}. Établis la chronologie, les données et personnes concernées sans minimiser les incertitudes, le risque, les mesures prises et à prendre, et les obligations (RGPD art. 33 et 34, registre interne).",
    sortie: "Fiche d'incident, projet de registre, projet de notification (jamais transmis sans accord)." },
  { cle: "securite.audit_acces", metier: "securite", titre: "Audit des accès", objectif: "Vérifier que chacun n'accède qu'à ce qui le concerne.", risque: "lecture", version: 1,
    variables: [V("perimetre", "Périmètre", "portails assistante et hôte")],
    texte: "Audite les accès de {{perimetre}} : rôles, permissions, accès direct par URL, appels API, fichiers privés, comptes suspendus. Pour chaque écart : preuve, gravité, correction, test.",
    sortie: "Tableau des écarts ; détails des failles non corrigées réservés aux documents privés." },
  { cle: "securite.conformite_page", metier: "securite", titre: "Contrôle de conformité d'une page", objectif: "Vérifier une page avant publication.", risque: "lecture", version: 1,
    variables: [V("page", "Page ou parcours"), V("activite", "Activité concernée")],
    texte: "Contrôle {{page}} ({{activite}}) : informations précontractuelles, prix et frais, rétractation, allergènes ou contre-indications, mentions légales, données collectées, accessibilité (contraste, clavier, textes alternatifs).",
    sortie: "Liste conforme / non conforme / à vérifier, avec la règle et la correction." },
];

/** Expressions vues en ligne qui ressemblent à des commandes mais n'en sont pas garanties. */
export function expressionsNonNatives(texte: string): string[] {
  const t = texte || ""; const r = new Set<string>();
  for (const m of t.matchAll(/(^|\s)(\/[a-z][a-z0-9_-]{1,30})\b/gi)) r.add(m[2]);
  for (const m of t.matchAll(/\b(ultrathink|think harder|deep ?think|mode (?:expert|dieu|god)|god ?mode|jailbreak|dan mode)\b/gi)) r.add(m[1]);
  return [...r];
}

/** Remplace les {{variables}} ; renvoie les variables obligatoires manquantes. */
export function remplir(c: Pick<Consigne, "texte" | "variables" | "sortie" | "risque">, valeurs: Record<string, string>) {
  const manquantes = c.variables.filter(v => !v.facultatif && !(valeurs[v.nom] || "").trim()).map(v => v.libelle);
  const corps = c.texte.replace(/\{\{(\w+)\}\}/g, (_, n) => (valeurs[n] || "").trim() || (c.variables.find(v => v.nom === n)?.facultatif ? "non précisé" : `[${n}]`));
  const texte = `${corps}\n\nRésultat attendu : ${c.sortie}\n\nRègles :\n${REGLES_COMMUNES.map(r => "- " + r).join("\n")}\nNiveau d'autorisation : ${RISQUES[c.risque].libelle} — ${RISQUES[c.risque].autorisation}`;
  return { texte, manquantes, alertes: expressionsNonNatives(corps) };
}

/** Variables déclarées dans le texte ({{nom}}), pour contrôler un modèle modifié. */
export function variablesDuTexte(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
}

/** Contrôle d'un modèle avant enregistrement d'une nouvelle version. */
export function controlerModele(c: Pick<Consigne, "titre" | "texte" | "variables" | "sortie">): string[] {
  const e: string[] = [];
  if ((c.titre || "").trim().length < 3) e.push("Titre trop court.");
  if ((c.texte || "").trim().length < 20) e.push("Consigne trop courte.");
  if ((c.sortie || "").trim().length < 5) e.push("Résultat attendu manquant.");
  const declarees = new Set(c.variables.map(v => v.nom));
  for (const n of variablesDuTexte(c.texte)) if (!declarees.has(n)) e.push(`Variable {{${n}}} utilisée mais non déclarée.`);
  if ((c.texte || "").length > 8000) e.push("Consigne trop longue (8 000 caractères au maximum).");
  return e;
}
