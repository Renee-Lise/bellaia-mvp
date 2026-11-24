// ═══════════════════════════════════════════════════════════
// Bella'Food — règles PURES du 24/11/2026 (aucune écriture ici) :
//  • offre du jour (lot 5) : sélection par cases à cocher, menus composés, programmation,
//    duplication, expiration, contrôle côté serveur (un produit non sélectionné n'est ni
//    proposé ni commandable) ;
//  • tarifs (grille de la fondatrice + estimations PROVISOIRES clairement signalées + calcul
//    indicatif depuis les coûts quand ils existent) — jamais d'écrasement d'un prix confirmé ;
//  • conformité « ni porc ni alcool » : masquage RÉVERSIBLE (aucune suppression) et variantes
//    compatibles préparées en brouillon.
// S'appuie sur la table existante food_menu_jour (0060) : les éléments de `items` portent
// désormais une référence produit (`produit_id`) — les anciens éléments en texte libre restent
// affichés mais ne sont pas commandables.
// ═══════════════════════════════════════════════════════════
import { alertes, classer, type Produit as ProduitH } from "./hierarchieCatalogue";

// ── Dates (Guyane : America/Cayenne, UTC−3, sans heure d'été) ──
export function dateCayenne(d: Date = new Date()): string {
  return new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10);
}

// ── Offre du jour ───────────────────────────────────────────
export type TypeElement = "plat" | "menu";
export type ElementOffre = {
  cle: string;                 // identifiant stable dans la journée (ex. "p:<produit_id>" ou "m:<slug>")
  type: TypeElement;
  produit_id?: string;         // plat du jour : produit du catalogue
  nom: string;
  description?: string;
  prix?: number | null;        // prix du jour (sinon prix du catalogue)
  quantite?: number | null;    // portions disponibles (null = sans limite)
  composition?: { produit_id: string; nom: string }[];   // menu : éléments inclus (non publiés seuls)
  sauces?: string[];           // sauces adaptées proposées (une incluse avec un repas)
};
export type JourneeOffre = { id?: string; date: string; statut: "brouillon" | "publie"; items: (ElementOffre | { nom: string; prix?: number; description?: string })[] };

export const estElementProduit = (x: any): x is ElementOffre => !!x && typeof x === "object" && (x.type === "plat" || x.type === "menu") && typeof x.cle === "string";
export const cleProduit = (produitId: string) => `p:${produitId}`;
export const cleMenu = (nom: string) => "m:" + nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Coche / décoche un produit comme plat du jour. Décocher retire le plat, jamais les menus qui l'incluent. */
export function basculerPlat(items: ElementOffre[], p: { id: string; nom: string; prix?: number | null; metadata?: any }, coche: boolean): ElementOffre[] {
  const cle = cleProduit(p.id); const sans = items.filter(i => i.cle !== cle);
  const sauces = Array.isArray(p.metadata?.sauces) && p.metadata.sauces.length ? p.metadata.sauces : undefined;
  return coche ? [...sans, { cle, type: "plat", produit_id: p.id, nom: p.nom, prix: p.prix ?? null, quantite: null, ...(sauces ? { sauces } : {}) }] : sans;
}
/** Sélection / désélection collective (ex. toute une catégorie). */
export function basculerPlusieurs(items: ElementOffre[], produits: { id: string; nom: string; prix?: number | null }[], coche: boolean): ElementOffre[] {
  return produits.reduce((acc, p) => basculerPlat(acc, p, coche), items);
}
/** Duplique une journée vers une autre date : brouillon, mêmes éléments, quantités remises à zéro de consommation. */
export function dupliquerJournee(source: JourneeOffre, date: string): JourneeOffre {
  return { date, statut: "brouillon", items: source.items.map(i => ({ ...i })) };
}

export type ProduitCatalogue = { id: string; nom: string; prix?: number | null; statut?: string | null; visible_client?: boolean | null; disponible?: boolean | null; categorie_slug?: string | null; allergenes?: string[] | null; metadata?: any };
export type Anomalie = { cle: string; message: string; bloquant: boolean };

/** Contrôles avant publication. Bloquant = la journée ne peut pas être publiée. */
export function controlerOffre(items: ElementOffre[], produits: ProduitCatalogue[]): Anomalie[] {
  const parId = new Map(produits.map(p => [p.id, p])); const out: Anomalie[] = [];
  if (!items.some(i => i.type === "plat" || i.type === "menu")) out.push({ cle: "*", message: "Aucun plat ni menu sélectionné.", bloquant: true });
  for (const i of items) {
    const refs = i.type === "plat" ? [i.produit_id!] : (i.composition || []).map(c => c.produit_id);
    if (i.type === "menu" && refs.length < 2) out.push({ cle: i.cle, message: `Menu « ${i.nom} » : au moins 2 éléments.`, bloquant: true });
    if (i.type === "menu" && !(typeof i.prix === "number" && i.prix > 0)) out.push({ cle: i.cle, message: `Menu « ${i.nom} » : prix obligatoire.`, bloquant: true });
    for (const id of refs) {
      const p = parId.get(id);
      if (!p) { out.push({ cle: i.cle, message: `« ${i.nom} » : produit introuvable dans le catalogue.`, bloquant: true }); continue; }
      if (p.statut !== "actif") out.push({ cle: i.cle, message: `« ${p.nom} » n'est pas actif (${p.statut || "statut inconnu"}).`, bloquant: true });
      if (p.metadata?.masquage) out.push({ cle: i.cle, message: `« ${p.nom} » est masqué (${p.metadata.masquage.motif}).`, bloquant: true });
      const al = alertes(p as ProduitH);
      if (al.length) out.push({ cle: i.cle, message: `« ${p.nom} » : ${al.map(a => a.type === "porc" ? "porc" : "alcool").join(", ")} — ${al[0].motif}.`, bloquant: al.some(a => a.type === "alcool" || !/vérifier/.test(a.motif)) });
      if (!p.allergenes?.length) out.push({ cle: i.cle, message: `« ${p.nom} » : allergènes non renseignés — le serveur refusera la commande.`, bloquant: false });
    }
    if (i.type === "plat") { const p = parId.get(i.produit_id!); const prix = i.prix ?? p?.prix; if (!(typeof prix === "number" && prix > 0)) out.push({ cle: i.cle, message: `« ${i.nom} » : aucun prix (ni du jour, ni du catalogue).`, bloquant: true }); }
    if (i.quantite != null && (!Number.isInteger(i.quantite) || i.quantite < 0)) out.push({ cle: i.cle, message: `« ${i.nom} » : quantité invalide.`, bloquant: true });
  }
  return out;
}

/** Ce que voit une cliente : uniquement la journée publiée de la date demandée (jamais un brouillon, jamais une date passée). */
export function offreVisible(journees: JourneeOffre[], date: string = dateCayenne()): ElementOffre[] {
  return journees.filter(j => j.statut === "publie" && j.date === date).flatMap(j => j.items.filter(estElementProduit));
}

export type DecisionLigne = { ok: true; prix: number | null; element: ElementOffre } | { ok: false; erreur: string };
/** Contrôle SERVEUR d'une ligne de panier. `produitId` = produit ; `cleMenuDemande` = menu (ligne "menu::<cle>"). */
export function controlerLigne(offre: ElementOffre[], ligne: { produitId?: string; cleMenu?: string; qte: number }, dejaCommande: number = 0): DecisionLigne {
  const el = ligne.cleMenu ? offre.find(i => i.type === "menu" && i.cle === ligne.cleMenu) : offre.find(i => i.type === "plat" && i.produit_id === ligne.produitId);
  if (!el) return { ok: false, erreur: ligne.cleMenu ? "Ce menu n'est pas proposé à cette date." : "Ce produit n'est pas proposé à cette date (hors offre du jour)." };
  if (el.quantite != null && dejaCommande + ligne.qte > el.quantite) return { ok: false, erreur: `« ${el.nom} » : plus que ${Math.max(0, el.quantite - dejaCommande)} portion(s) disponible(s).` };
  return { ok: true, prix: typeof el.prix === "number" ? el.prix : null, element: el };
}

// ── Sauces (lot 4) ──────────────────────────────────────────
/** Une sauce au choix incluse avec un repas ; la sauce doit figurer dans les sauces associées au produit. */
export function controlerSauce(produit: { metadata?: any }, sauce?: string | null): { ok: boolean; erreur?: string } {
  if (!sauce) return { ok: true };
  const permises: string[] = Array.isArray(produit.metadata?.sauces) ? produit.metadata.sauces : [];
  return permises.includes(sauce) ? { ok: true } : { ok: false, erreur: `Sauce « ${sauce} » non proposée pour ce produit.` };
}

// ── Tarifs ──────────────────────────────────────────────────
export type SourceTarif = "grille_fondatrice" | "calcul_couts" | "estimation_provisoire";
export type PropositionTarif = { cible: "produit" | "variante" | "creation"; nom: string; produit?: string; variante?: string; actuel: number | null; propose: number | null; source: SourceTarif; justification: string; a_confirmer?: string };

/** Calcul indicatif. TVA : non applicable en Guyane (art. 294 du CGI) — à confirmer par l'expert-comptable. */
export function tarifIndicatif(c: { ingredients: number; conditionnement: number; minutes: number; tauxHoraire: number; marge: number }): { cout: number; prix: number; prixArrondi: number } | null {
  if (![c.ingredients, c.conditionnement, c.minutes, c.tauxHoraire].every(x => Number.isFinite(x) && x >= 0) || !(c.marge >= 0 && c.marge < 0.95)) return null;
  const cout = c.ingredients + c.conditionnement + (c.minutes / 60) * c.tauxHoraire;
  if (cout <= 0) return null;
  const prix = cout / (1 - c.marge);
  return { cout: +cout.toFixed(2), prix: +prix.toFixed(2), prixArrondi: Math.ceil(prix * 2) / 2 };
}

const G = (nom: string, actuel: number | null, propose: number | null, justification: string, o: Partial<PropositionTarif> = {}): PropositionTarif => ({ cible: "produit", nom, actuel, propose, source: "grille_fondatrice", justification, ...o });
/** Grille communiquée par la fondatrice (24/11, deux messages). `actuel` = prix relevé en base le 24/11. */
export const GRILLE_24_11: PropositionTarif[] = [
  G("Barquette poulet boucané (frites nature)", 8, 6.5, "Poulet boucané avec frites classiques : 6,50 €"),
  G("Barquette de frites nature + merguez", 7, 6, "Frites-merguez : 6 €"),
  { cible: "variante", nom: "Frites nature — + Merguez", produit: "Frites nature", variante: "+ Merguez", actuel: 7, propose: 6, source: "grille_fondatrice", justification: "Frites-merguez : 6 € (même offre vendue via la variante)" },
  G("Brochette de poulet", 3.5, 2.5, "Brochette de poulet : 2,50 €"),
  { cible: "variante", nom: "Frites nature — Sans supplément (petite portion)", produit: "Frites nature", variante: "Sans supplément", actuel: 3, propose: 3, source: "grille_fondatrice", justification: "Petite portion : 3 € (inchangé)" },
  { cible: "creation", nom: "Frites nature — Moyenne portion", produit: "Frites nature", variante: "Moyenne portion", actuel: null, propose: 4, source: "grille_fondatrice", justification: "Moyenne portion : 4 € (variante à créer)" },
  { cible: "creation", nom: "Frites nature — Grande portion", produit: "Frites nature", variante: "Grande portion", actuel: null, propose: 5, source: "grille_fondatrice", justification: "Grande portion : 5 € (variante à créer)" },
  G("Barquette poulet boucané (frites maison)", 9, 9, "Frites maison = variante distincte : prix actuel conservé"),
  G("Soupe créole", 13, 13, "Soupes : 13 € (inchangé)"), G("Soupe z'habitants", 13, 13, "Soupes : 13 € (inchangé)"),
  G("Bananes plantains frites", 5, 10, "Accompagnement seul, portion standard : 10 €", { a_confirmer: "Hausse de 5 € à 10 € : confirmer qu'il s'agit d'une portion standard d'accompagnement seul" }),
  G("Supplément sauce maison", 0.5, 0.3, "Petit pot de sauce : 0,30 €", { a_confirmer: "Confirmer que ce supplément correspond au petit pot" }),
  { cible: "creation", nom: "Riz nature (barquette)", actuel: null, propose: 2.5, source: "grille_fondatrice", justification: "Riz nature : 2,50 € la barquette (le tarif de 10 € ne s'applique pas)" },
  // Affiches (lot 2) — produits à créer en brouillon
  ...([["Bokit jambon de volaille-fromage", 6], ["Bokit complet", 7], ["Bokit poulet boucané", 8], ["Bokit morue", 9], ["Supplément viande (bokit)", 2], ["Bake poulet", 3], ["Bake steak de bœuf", 3], ["Bake morue", 4], ["Bake thon", 3.5], ["Saucisse fumée de volaille", 3], ["Saucisse fumée de bœuf", 3], ["Cuisse de poulet grillée", 3], ["Jus de prune de Cythère", 3], ["Jus de maracuja", 3]] as [string, number][])
    .map(([nom, prix]) => ({ cible: "creation" as const, nom, actuel: null, propose: prix, source: "grille_fondatrice" as const, justification: "Prix de l'affiche" + (/volaille|bœuf/.test(nom) ? " — variante compatible (ni porc)" : "") })),
  { cible: "creation", nom: "Box mini-bokits", actuel: null, propose: null, source: "estimation_provisoire", justification: "Composition non définie : aucun prix proposé" },
];

/** Estimations commerciales PROVISOIRES pour les produits sans prix — par analogie avec la carte existante, sans source externe. */
export function estimationProvisoire(p: { nom: string; categorie_slug?: string | null }): PropositionTarif | null {
  const n = p.nom.toLowerCase(); const s = p.categorie_slug || "";
  const e = (propose: number, analogie: string): PropositionTarif => ({ cible: "produit", nom: p.nom, actuel: null, propose, source: "estimation_provisoire", justification: `ESTIMATION PROVISOIRE par analogie : ${analogie}. Aucune source externe ; coûts non saisis.` });
  if (s === "jus") return e(3, "jus maison de la carte (gingembre, groseille, timbale de canne) à 3 €");
  if (s === "milkshake" || /^milkshake/.test(n)) return e(5, "milkshakes de la carte à 5 €");
  if (s === "smoothie") return e(5, "milkshakes de la carte à 5 € (préparation comparable)");
  if (s === "the_glace") return e(2.5, "thé glacé au gingembre à 2,50 €");
  return null;   // plats à variantes (prix portés par les tailles), marinade (préparation technique non vendue) : rien à proposer
}

export type MetaPrix = { statut: "confirme" | "valide_fondatrice" | "provisoire"; source: SourceTarif; le: string; historique?: { prix: number | null; le: string; source?: string }[] };
/** Patch à écrire si la fondatrice coche la ligne — refusé si le prix actuel est CONFIRMÉ. */
export function patchTarif(actuel: { prix: number | null; metadata?: any }, propose: number, source: SourceTarif, maintenant = new Date().toISOString()): { ok: true; patch: { prix: number; metadata: any } } | { ok: false; raison: string } {
  const mp: MetaPrix | undefined = actuel.metadata?.prix;
  if (mp?.statut === "confirme") return { ok: false, raison: "Prix confirmé : jamais écrasé automatiquement." };
  if (!(propose > 0)) return { ok: false, raison: "Prix proposé invalide." };
  const historique = [...(mp?.historique || []), { prix: actuel.prix, le: maintenant, source: mp?.source }];
  return { ok: true, patch: { prix: propose, metadata: { ...(actuel.metadata || {}), prix: { statut: source === "estimation_provisoire" ? "provisoire" : "valide_fondatrice", source, le: maintenant, historique } } } };
}

// ── Conformité : masquage réversible et variantes ───────────
export type ProduitConformite = { id: string; nom: string; statut?: string | null; visible_client?: boolean | null; disponible?: boolean | null; metadata?: any };
export function aMasquer(produits: ProduitConformite[]): (ProduitConformite & { motifs: string[] })[] {
  return produits.map(p => ({ ...p, motifs: alertes(p as ProduitH).map(a => `${a.type} : ${a.motif}`) })).filter(p => p.motifs.length && !p.metadata?.masquage);
}
export function patchMasquage(p: ProduitConformite, motif: string, maintenant = new Date().toISOString()) {
  return { visible_client: false, metadata: { ...(p.metadata || {}), masquage: { motif, le: maintenant, avant: { visible_client: p.visible_client ?? null, disponible: p.disponible ?? null, statut: p.statut ?? null } } } };
}
export function patchRetablissement(p: ProduitConformite): { visible_client: boolean | null; metadata: any } | null {
  const m = p.metadata?.masquage; if (!m) return null;
  const { masquage, ...reste } = p.metadata;
  return { visible_client: m.avant?.visible_client ?? null, metadata: { ...reste, masquages_passes: [...(p.metadata.masquages_passes || []), { ...m, retabli_le: new Date().toISOString() }] } };
}

export type VarianteCompatible = { nom: string; remplace: string[]; categorie_slug: string; prix: number | null; a_verifier: string[] };
/** Variantes « ni porc ni alcool » préparées en BROUILLON (jamais publiées sans composition et allergènes vérifiés). */
export const VARIANTES_COMPATIBLES: VarianteCompatible[] = [
  { nom: "Crêpe Jambon de volaille + Fromage", remplace: ["Crêpe Jambon + Fromage"], categorie_slug: "crepe", prix: 3, a_verifier: ["composition du jambon de volaille (fiche fournisseur)", "allergènes : gluten, œufs, lait (+ fournisseur)"] },
  { nom: "Crêpe Jambon de volaille + Fromage + Béchamel", remplace: ["Crêpe Jambon + Fromage + Béchamel"], categorie_slug: "crepe", prix: 3.5, a_verifier: ["composition", "allergènes : gluten, œufs, lait"] },
  { nom: "Crêpe Lardons de volaille + Fromage + Béchamel", remplace: ["Crêpe Lardon + Fromage + Béchamel"], categorie_slug: "crepe", prix: 4, a_verifier: ["composition des lardons de volaille", "allergènes : gluten, œufs, lait"] },
  { nom: "Lot de 4 crêpes Jambon de volaille + Fromage", remplace: ["Lot de 4 crêpes Jambon + Fromage"], categorie_slug: "crepe", prix: 7.5, a_verifier: ["composition", "allergènes"] },
  { nom: "Lot de 4 crêpes Jambon de volaille + Fromage + Béchamel", remplace: ["Lot de 4 crêpes Jambon + Fromage + Béchamel"], categorie_slug: "crepe", prix: 8.5, a_verifier: ["composition", "allergènes"] },
  { nom: "Lot de 4 crêpes Lardons de volaille + Fromage + Béchamel", remplace: ["Lot de 4 crêpes Lardon + Fromage + Béchamel"], categorie_slug: "crepe", prix: 9.5, a_verifier: ["composition", "allergènes"] },
  { nom: "Saucisse de volaille grillée", remplace: [], categorie_slug: "street_food", prix: 3, a_verifier: ["composition et boyau (sans porc)", "allergènes"] },
  { nom: "Saucisse de bœuf grillée", remplace: [], categorie_slug: "street_food", prix: 3, a_verifier: ["composition et boyau (sans porc)", "allergènes"] },
  { nom: "Merguez de bœuf grillée", remplace: [], categorie_slug: "street_food", prix: null, a_verifier: ["étiquette fournisseur : bœuf, boyau naturel de mouton (pas de porc)", "allergènes"] },
  { nom: "Punch coco sans alcool", remplace: ["Punch Coco"], categorie_slug: "boisson", prix: null, a_verifier: ["recette sans rhum", "allergènes : lait (selon recette), fruits à coque si muscade/amande"] },
  { nom: "Cocktail ananas sans alcool", remplace: ["Liqueur d'Ananas"], categorie_slug: "boisson", prix: null, a_verifier: ["recette", "contenance", "allergènes"] },
  { nom: "Cocktail cerise sans alcool", remplace: ["Liqueur de Cerise"], categorie_slug: "boisson", prix: null, a_verifier: ["recette", "contenance", "allergènes"] },
  { nom: "Cocktail maracuja sans alcool", remplace: ["Liqueur de Maracudja"], categorie_slug: "boisson", prix: null, a_verifier: ["recette", "contenance", "allergènes"] },
];
/** Ligne d'insertion BROUILLON d'une variante (invisible, non disponible, données à vérifier). */
export function ligneVariante(v: VarianteCompatible) {
  const h = classer({ nom: v.nom, categorie_slug: v.categorie_slug });
  return { business_unit: "FOOD", nom: v.nom, categorie_slug: v.categorie_slug, prix: v.prix, unite: "portion", statut: "brouillon", visible_client: false, disponible: false,
    metadata: { lot: "conformite_24_11", remplace: v.remplace, a_verifier: v.a_verifier, hierarchie: { categorie: h.categorie, sous_categorie: h.sous_categorie }, prix: v.prix != null ? { statut: "provisoire", source: "grille_fondatrice", le: new Date().toISOString() } : undefined } };
}
