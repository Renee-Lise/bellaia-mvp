// ═══════════════════════════════════════════════════════════
// UTILS — Module Bella'Food — Parties I & II
// Imports groupés en haut — aucun doublon
// ═══════════════════════════════════════════════════════════

// ── Imports types ──────────────────────────────────────────
import type {
  ResultatCalculateur, Recette, Ingredient,
  StockItem, LigneCourses, UniteMesure, ImportRecette,
  CriteresRecherche, TypeFiche, PlanningProduction, TacheProduction,
  LigneDevisFood, DevisFood,
  Achat, LigneAchat, Alerte, Lot,
} from "./foodTypes";

// ── Imports constantes (un seul bloc) ─────────────────────
import { FOOD_CATALOGUE, FOOD_RECETTES_INIT, FOOD_STOCK_INIT } from "./foodConsts";

// ═══════════════════════════════════════════════════════════
// PARTIE I — Calculs, formatage, liste de courses
// ═══════════════════════════════════════════════════════════

// ── Calculateur de coût et prix ────────────────────────────
export function calculerPrix(params: {
  coutMatiere: number;
  coutConsommables?: number;
  coutEmballage?: number;
  coutDecoration?: number;
  coutMainOeuvre?: number;
  coutLivraison?: number;
  coutCharges?: number;
  margeSouhaitee?: number;
  supplement?: number;
  remise?: number;
  acomptePct?: number;
}): ResultatCalculateur {
  const cm  = params.coutMatiere         || 0;
  const cc  = params.coutConsommables    || 0;
  const ce  = params.coutEmballage       || 0;
  const cd  = params.coutDecoration      || 0;
  const cmo = params.coutMainOeuvre      || 0;
  const cl  = params.coutLivraison       || 0;
  const cch = params.coutCharges         || 0;
  const mg  = params.margeSouhaitee ?? 40;
  const sup = params.supplement          || 0;
  const rem = params.remise              || 0;
  const apc = params.acomptePct         ?? 30;

  const coutTotal  = cm + cc + ce + cd + cmo + cl + cch;
  const prixMin    = coutTotal * (1 + mg / 100);
  const prixVente  = prixMin + sup - rem;
  const margeBrute = prixVente - coutTotal;
  const tauxMarge  = coutTotal > 0 ? Math.round((margeBrute / prixVente) * 100) : 0;
  const acompte    = Math.round(prixVente * (apc / 100) * 100) / 100;

  return {
    coutMatiere: cm, coutConsommables: cc, coutEmballage: ce,
    coutDecoration: cd, coutMainOeuvre: cmo, coutLivraison: cl, coutCharges: cch,
    coutTotal:          Math.round(coutTotal  * 100) / 100,
    margeSouhaitee: mg, supplement: sup, remise: rem,
    prixMinConseille:   Math.round(prixMin    * 100) / 100,
    prixVenteConseille: Math.round(prixVente  * 100) / 100,
    margeBrute:         Math.round(margeBrute * 100) / 100,
    tauxMarge,
    beneficeEstime:     Math.round(margeBrute * 100) / 100,
    acompte,
    solde: Math.round((prixVente - acompte) * 100) / 100,
  };
}

// ── Coût matière d'une recette ─────────────────────────────
export function calculerCoutRecette(ingredients: Ingredient[]): number {
  return Math.round(
    ingredients.reduce(
      (t, i) => t + (i.coutUnitaire ? i.quantite * i.coutUnitaire : 0), 0
    ) * 100
  ) / 100;
}

// ── Temps total d'une recette ──────────────────────────────
export function calculerTempsTotal(
  r: Pick<Recette, "tempsPrepa" | "tempsCuisson" | "tempsRepos">
): number {
  return (r.tempsPrepa || 0) + (r.tempsCuisson || 0) + (r.tempsRepos || 0);
}

// ── Recherche catalogue Food (liaison Events) ──────────────
export function rechercherProduitsFood(motsCles: string[]) {
  return FOOD_CATALOGUE.filter(p => {
    const t = [p.nom, p.sousCat || "", p.description || ""].join(" ").toLowerCase();
    return motsCles.some(m => t.includes(m.toLowerCase()));
  });
}

// ── Produits visibles côté Events ─────────────────────────
export function getProduitsVisiblesEvents() {
  return FOOD_CATALOGUE.filter(p => p.visibleEvents && p.disponible);
}

// ── Liste de courses intelligente ─────────────────────────
export function genererListeCourses(
  recettes: Recette[],
  stockActuel: Record<string, number>
): LigneCourses[] {
  const fusion: Record<string, LigneCourses> = {};

  for (const recette of recettes) {
    for (const ing of recette.ingredients) {
      const key = ing.id;
      if (!fusion[key]) {
        fusion[key] = {
          ingredientId:       ing.id,
          nom:                ing.nom,
          quantiteNecessaire: 0,
          quantiteEnStock:    stockActuel[ing.id] ?? 0,
          quantiteAacheter:   0,
          unite:              ing.unite,
          prixEstime:         ing.coutUnitaire,
          recettes:           [],
        };
      }
      fusion[key].quantiteNecessaire += ing.quantite;
      fusion[key].recettes!.push(recette.nom);
    }
  }

  return Object.values(fusion)
    .map(l => ({
      ...l,
      recettes:         [...new Set(l.recettes)],
      quantiteAacheter: Math.max(0, l.quantiteNecessaire - l.quantiteEnStock),
    }))
    .filter(l => l.quantiteAacheter > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

// ── Alertes stock ──────────────────────────────────────────
export function getAlerteStock<
  T extends { qteRestante?: number; qteDispo?: number; seuilAlerte: number; nom: string }
>(items: T[]): T[] {
  return items.filter(i => {
    const qte = i.qteRestante ?? i.qteDispo ?? 0;
    return qte <= i.seuilAlerte;
  });
}

// ── Budget estimatif liste de courses ──────────────────────
export function calculerBudgetCourses(lignes: LigneCourses[]): number {
  return Math.round(
    lignes.reduce(
      (t, l) => t + (l.prixEstime ? l.prixEstime * l.quantiteAacheter : 0), 0
    ) * 100
  ) / 100;
}

// ── Formatage prix ─────────────────────────────────────────
export function fmtPrix(n: number | null | undefined, suffix = "€"): string {
  if (n == null) return "Sur devis";
  return n.toFixed(2).replace(".", ",") + suffix;
}

// ── Formatage durée ────────────────────────────────────────
export function fmtDuree(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// ── OCR / Import texte (architecture pour IA future) ───────
export function analyserTexteRecette(texte: string): Partial<Recette> {
  const result: Partial<Recette> = { statut: "brouillon" };
  const lignes = texte.split("\n").map(l => l.trim()).filter(Boolean);

  const premiereLigne = lignes[0];
  if (premiereLigne && premiereLigne.length < 80) result.nom = premiereLigne;

  const matchTemps = texte.match(/(\d+)\s*(min(?:utes?)?|heure?s?)/gi);
  if (matchTemps?.length) {
    const mins = matchTemps.map(m => {
      const n = parseInt(m);
      return m.toLowerCase().includes("h") ? n * 60 : n;
    });
    if (mins[0]) result.tempsPrepa   = mins[0];
    if (mins[1]) result.tempsCuisson = mins[1];
  }

  const matchTemp = texte.match(/(\d{3})°?C/);
  if (matchTemp) result.temperature = parseInt(matchTemp[1]);

  const matchParts = texte.match(/(\d+)\s*(personnes?|portions?|parts?)/i);
  if (matchParts) result.nbParts = parseInt(matchParts[1]);

  const allergenes: string[] = [];
  const MOTS: Record<string, string> = {
    "farine":"gluten","blé":"gluten","seigle":"gluten",
    "lait":"lait","crème":"lait","beurre":"lait","fromage":"lait",
    "oeuf":"oeufs","oeuvre":"oeufs",
    "arachide":"arachides","cacahuète":"arachides",
    "noix":"fruits à coque","amande":"fruits à coque","noisette":"fruits à coque",
    "soja":"soja","céleri":"céleri","moutarde":"moutarde",
    "crevette":"crustacés","homard":"crustacés","crabe":"crustacés",
    "saumon":"poisson","thon":"poisson","cabillaud":"poisson",
  };
  for (const [mot, allergene] of Object.entries(MOTS)) {
    if (texte.toLowerCase().includes(mot) && !allergenes.includes(allergene)) {
      allergenes.push(allergene);
    }
  }
  if (allergenes.length) result.allergenes = allergenes;

  result.sourceType = "texte";
  result.dateImport = new Date().toISOString().split("T")[0];
  return result;
}

// ── Export liste de courses → WhatsApp ─────────────────────
export function exportCoursesWhatsApp(lignes: LigneCourses[], budget?: number): string {
  const lignesTexte = lignes.map(
    l => `□ ${l.nom} — ${l.quantiteAacheter} ${l.unite}`
      + (l.fournisseurSuggere ? ` (${l.fournisseurSuggere})` : "")
  );
  const header = "*🛒 Liste de courses Bella'Food*\n";
  const body   = lignesTexte.join("\n");
  const footer = budget ? `\n\n💰 Budget estimé : ${fmtPrix(budget)}` : "";
  return header + body + footer;
}

// ═══════════════════════════════════════════════════════════
// PARTIE II — Recherche recettes, planning, fiches, devis
// ═══════════════════════════════════════════════════════════

// ── Moteur de recherche recettes ───────────────────────────
export function rechercherRecettes(
  criteres: CriteresRecherche
): typeof FOOD_RECETTES_INIT {
  return FOOD_RECETTES_INIT.filter(r => {
    if (criteres.categorie && r.categorie !== criteres.categorie) return false;
    if (criteres.difficulteMax && r.difficulte > criteres.difficulteMax) return false;
    if (criteres.tempsMaxMin) {
      const total = (r.tempsPrepa || 0) + (r.tempsCuisson || 0) + (r.tempsRepos || 0);
      if (total > criteres.tempsMaxMin) return false;
    }
    if (criteres.nbParts && r.nbParts < criteres.nbParts) return false;
    if (criteres.saison && r.saison && r.saison !== criteres.saison && r.saison !== "toute_saison") return false;
    if (criteres.budgetMax && r.coutMatiere && r.coutMatiere > criteres.budgetMax) return false;
    if (criteres.allergenes?.length && r.allergenes?.length) {
      if (criteres.allergenes.some(a => r.allergenes!.includes(a))) return false;
    }
    if (criteres.texte) {
      const texte = criteres.texte.toLowerCase();
      const champ = [r.nom, r.sousCat || "", ...(r.tags || []), ...(r.etapes || [])].join(" ").toLowerCase();
      if (!champ.includes(texte)) return false;
    }
    if (criteres.motsCles?.length) {
      const champ = [r.nom, ...(r.tags || []), r.sousCat || ""].join(" ").toLowerCase();
      if (!criteres.motsCles.some(m => champ.includes(m.toLowerCase()))) return false;
    }
    return true;
  });
}

// ── Générateur de planning de production ───────────────────
export function genererPlanningProduction(
  commandeId: string,
  nomCommande: string,
  dateLivraison: string,
  recetteIds: string[]
): PlanningProduction {
  const taches: TacheProduction[] = [];
  let idxCounter = 0;
  const mkId = () => "t_" + (++idxCounter);

  // J-3
  taches.push({ id:mkId(), jour:"J-3", heure:"09:00", description:"Vérifier les stocks matières premières et passer les commandes manquantes", dureeMin:20, type:"preparation", faite:false });
  taches.push({ id:mkId(), jour:"J-3", heure:"10:00", description:"Vérifier le matériel (moules, poches, thermomètre, balance)",             dureeMin:15, type:"preparation", faite:false });
  taches.push({ id:mkId(), jour:"J-3", heure:"14:00", description:"Préparer les consommables (boîtes, rubans, étiquettes, cake boards)",      dureeMin:20, type:"preparation", faite:false });
  // J-2
  taches.push({ id:mkId(), jour:"J-2", heure:"08:00", description:"Réceptionner les commandes manquantes et ranger le stock",                  dureeMin:30, type:"preparation", faite:false });
  taches.push({ id:mkId(), jour:"J-2", heure:"10:00", description:"Peser et préparer tous les ingrédients (mise en place)",                    dureeMin:45, type:"preparation", faite:false });

  // Tâches par recette
  for (const rid of recetteIds) {
    const r = FOOD_RECETTES_INIT.find(x => x.id === rid);
    if (!r) continue;
    taches.push({
      id:mkId(), jour:"J-1", heure:"09:00",
      description:`Préparer la base — ${r.nom}`,
      dureeMin: r.tempsPrepa + r.tempsCuisson,
      type:"cuisson", recetteId:r.id,
      ingredients: r.ingredients.map(i => ({ nom:i.nom, quantite:i.quantite, unite:i.unite })),
      faite:false,
    });
    if ((r.tempsRepos || 0) > 0) {
      taches.push({
        id:mkId(), jour:"J-1",
        description:`Temps de repos — ${r.nom} (${fmtDuree(r.tempsRepos!)})`,
        dureeMin:r.tempsRepos!, type:"repos", faite:false,
      });
    }
  }

  // J-1 suite
  taches.push({ id:mkId(), jour:"J-1", heure:"14:00", description:"Montage des gâteaux / assemblage des préparations", dureeMin:60, type:"montage",          faite:false });
  taches.push({ id:mkId(), jour:"J-1", heure:"16:00", description:"Décoration et finitions",                          dureeMin:45, type:"decoration",        faite:false });
  taches.push({ id:mkId(), jour:"J-1", heure:"17:30", description:"Mise en boîte et conditionnement",                 dureeMin:20, type:"conditionnement",   faite:false });
  // Jour J
  taches.push({ id:mkId(), jour:"JourJ", heure:"08:00", description:"Vérification finale — qualité, température, présentation", dureeMin:15, type:"preparation", faite:false });
  taches.push({ id:mkId(), jour:"JourJ", heure:"08:30", description:"Chargement du véhicule — glacières si nécessaire",         dureeMin:15, type:"livraison",    faite:false });
  taches.push({ id:mkId(), jour:"JourJ", heure:"09:00", description:"Livraison / mise à disposition du client",                 dureeMin:30, type:"livraison",    faite:false });

  return {
    id: "plan_" + Date.now().toString().slice(-6),
    commandeId, nomCommande, dateLivraison,
    taches: taches.sort((a, b) => {
      const ordre: Record<string, number> = { "J-3":0, "J-2":1, "J-1":2, "JourJ":3 };
      return (ordre[a.jour] || 0) - (ordre[b.jour] || 0);
    }),
  };
}

// ── Générateur de fiche HTML imprimable ────────────────────
export function genererFicheHTML(recette: any, type: TypeFiche = "cuisine"): string {
  const esc = (s: any) =>
    String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const ingredientsHtml = (recette.ingredients || [])
    .map((i: any) => `<tr><td>${esc(i.nom)}</td><td>${i.quantite} ${i.unite}</td></tr>`)
    .join("");
  const etapesHtml = (recette.etapes || [])
    .map((e: any, idx: number) => `<li><strong>${idx+1}.</strong> ${esc(e)}</li>`)
    .join("");

  return [
    "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>",
    `<title>${esc(recette.nom)} — Bella'Food</title>`,
    "<style>",
    "body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:24px;color:#1a1a1a;font-size:13px;max-width:800px;margin:0 auto}",
    "h1{color:#15803d;font-family:Georgia,serif;font-size:22px;border-bottom:3px solid #15803d;padding-bottom:8px}",
    ".meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;background:#f0fdf4;border-radius:10px;padding:12px}",
    ".meta-item{text-align:center}.meta-item label{font-size:9px;color:#6b7280;display:block;text-transform:uppercase;letter-spacing:.05em}.meta-item span{font-size:14px;font-weight:700;color:#15803d}",
    "table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:6px 10px;border:1px solid #e5e7eb;font-size:12px}thead{background:#15803d;color:#fff}",
    "ol,ul{padding-left:20px}li{margin:6px 0;line-height:1.5}",
    ".allergenes{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px;margin:12px 0;font-size:11px}",
    ".cout{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;margin:12px 0}",
    ".footer{text-align:center;font-size:9px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px}",
    "@media print{body{padding:0}}",
    "</style></head><body>",
    `<h1>🍃 ${esc(recette.nom)}</h1>`,
    `<div style='font-size:11px;color:#6b7280;margin-bottom:12px'>${esc(recette.categorie || "")} ${recette.sousCat ? "· "+esc(recette.sousCat) : ""} ${recette.statut ? "· "+esc(recette.statut) : ""}</div>`,
    "<div class='meta'>",
    `<div class='meta-item'><label>Portions</label><span>${recette.nbParts || "—"}</span></div>`,
    `<div class='meta-item'><label>Prépa</label><span>${recette.tempsPrepa || "—"} min</span></div>`,
    `<div class='meta-item'><label>Cuisson</label><span>${recette.tempsCuisson || "—"} min</span></div>`,
    `<div class='meta-item'><label>Difficulté</label><span>${"★".repeat(recette.difficulte || 0)}</span></div>`,
    "</div>",
    `<h3>🥗 Ingrédients</h3><table><thead><tr><th>Ingrédient</th><th>Quantité</th></tr></thead><tbody>${ingredientsHtml}</tbody></table>`,
    `<h3>👩‍🍳 Préparation</h3><ol>${etapesHtml}</ol>`,
    (recette.astuces?.length ? `<h3>💡 Astuces</h3><ul>${recette.astuces.map((a:string) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""),
    (recette.allergenes?.length ? `<div class='allergenes'>⚠️ <strong>Allergènes :</strong> ${recette.allergenes.join(", ")}</div>` : ""),
    (recette.coutMatiere ? `<div class='cout'>💰 Coût matière estimé : <strong>${recette.coutMatiere}€</strong>${recette.prixConseille ? " · Prix conseillé : <strong>"+recette.prixConseille+"€</strong>" : ""}</div>` : ""),
    `<div class='footer'>Fiche générée par Bella'Food — Bellaïa · ${new Date().toLocaleDateString("fr-FR")}</div>`,
    "</body></html>",
  ].join("");
}

// ── Calcul totaux devis Food ───────────────────────────────
export function calculerTotauxDevis(lignes: LigneDevisFood[]): {
  sousTotal: number; acompte: number; solde: number;
} {
  const sousTotal = lignes.reduce((s, l) => s + (l.total || 0), 0);
  const acompte   = Math.round(sousTotal * 0.3 * 100) / 100;
  return { sousTotal, acompte, solde: Math.round((sousTotal - acompte) * 100) / 100 };
}

// ═══════════════════════════════════════════════════════════
// PARTIE III — Achats, Alertes, Lots, Production
// ═══════════════════════════════════════════════════════════

// ── Calcul totaux achat ───────────────────────────────────
export function calculerTotauxAchat(lignes: LigneAchat[]): {
  totalHT: number; totalTTC: number;
} {
  const totalHT  = Math.round(lignes.reduce((s,l) => s + l.totalHT,  0) * 100) / 100;
  const totalTTC = Math.round(lignes.reduce((s,l) => s + l.totalTTC, 0) * 100) / 100;
  return { totalHT, totalTTC };
}

// ── Ligne achat depuis quantite + prixUnitaire + tva ─────
export function construireLigneAchat(
  produit: string, quantite: number, prixUnitaire: number,
  tva: number, unite: string, stockItemId?: string
): LigneAchat {
  const totalHT  = Math.round(quantite * prixUnitaire * 100) / 100;
  const totalTTC = Math.round(totalHT * (1 + tva / 100) * 100) / 100;
  return {
    id: "la_" + Date.now().toString().slice(-6),
    produit, stockItemId, categorie: "", quantite, unite,
    prixUnitaire, tva, totalHT, totalTTC,
  };
}

// ── Générer alertes depuis stocks ─────────────────────────
export function genererAlertesStock(stocks: StockItem[]): Alerte[] {
  const alertes: Alerte[] = [];
  const now = new Date().toISOString();
  for (const s of stocks) {
    if (s.qteRestante === 0) {
      alertes.push({
        id: "alt_" + s.id, type: "rupture", niveau: "critique",
        titre: "Rupture — " + s.nom,
        message: s.nom + " est en rupture de stock.",
        date: now, lue: false, entiteId: s.id, entiteType: "stock",
      });
    } else if (s.seuilCritique && s.qteRestante <= s.seuilCritique) {
      alertes.push({
        id: "alt_c_" + s.id, type: "stock_faible", niveau: "critique",
        titre: "Stock critique — " + s.nom,
        message: `${s.nom} : ${s.qteRestante} ${s.unite} (seuil critique : ${s.seuilCritique}).`,
        date: now, lue: false, entiteId: s.id, entiteType: "stock",
      });
    } else if (s.qteRestante <= s.seuilAlerte) {
      alertes.push({
        id: "alt_a_" + s.id, type: "stock_faible", niveau: "attention",
        titre: "Stock faible — " + s.nom,
        message: `${s.nom} : ${s.qteRestante} ${s.unite} restant·e·s.`,
        date: now, lue: false, entiteId: s.id, entiteType: "stock",
      });
    }
  }
  return alertes;
}

// ── Générer alertes DLC/DDM depuis lots ──────────────────
export function genererAlertesDLC(lots: Lot[], joursAvantAlerte = 7): Alerte[] {
  const alertes: Alerte[] = [];
  const now  = new Date();
  const seuil = new Date(now.getTime() + joursAvantAlerte * 86400000);
  for (const l of lots) {
    const dateRef = l.dlc || l.ddm;
    if (!dateRef) continue;
    const date = new Date(dateRef);
    if (date <= now) {
      alertes.push({
        id: "alt_dlc_" + l.id, type: "dlc_proche", niveau: "critique",
        titre: "DLC dépassée — " + l.nomIngredient,
        message: `${l.nomIngredient} (lot ${l.numeroLot}) : DLC dépassée le ${dateRef}.`,
        date: now.toISOString(), lue: false, entiteId: l.id, entiteType: "lot",
      });
    } else if (date <= seuil) {
      alertes.push({
        id: "alt_dlc_p_" + l.id, type: "dlc_proche", niveau: "attention",
        titre: "DLC proche — " + l.nomIngredient,
        message: `${l.nomIngredient} (lot ${l.numeroLot}) expire le ${dateRef}.`,
        date: now.toISOString(), lue: false, entiteId: l.id, entiteType: "lot",
      });
    }
  }
  return alertes;
}

// ── Générer HTML bon de commande fournisseur ─────────────
export function genBonCommandeHTML(
  bon: { reference: string; fournisseurNom: string; date: string; notes?: string; lignes: LigneAchat[] }
): string {
  const esc  = (s: any) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const tot  = Math.round(bon.lignes.reduce((s,l) => s + l.totalHT, 0) * 100) / 100;
  const totTTC = Math.round(bon.lignes.reduce((s,l) => s + l.totalTTC, 0) * 100) / 100;
  const lignesHtml = bon.lignes.map(l =>
    `<tr><td>${esc(l.produit)}</td><td style='text-align:center'>${l.quantite} ${esc(l.unite)}</td>` +
    `<td style='text-align:right'>${l.prixUnitaire.toFixed(2)}€</td>` +
    `<td style='text-align:center'>${l.tva}%</td>` +
    `<td style='text-align:right;font-weight:700'>${l.totalHT.toFixed(2)}€</td></tr>`
  ).join("");
  return `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
<title>Bon de commande ${esc(bon.reference)}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;font-size:13px}
h1{color:#15803d;border-bottom:2px solid #15803d;padding-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
.block{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px}
.block label{font-size:9px;color:#6b7280;display:block;text-transform:uppercase;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin:12px 0}
thead th{background:#15803d;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
tbody td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
.total{text-align:right;font-weight:700;color:#15803d;font-size:14px;margin-top:8px}
@media print{body{padding:0}}</style></head><body>
<h1>🛒 Bon de commande — Bella'Food</h1>
<div class='grid'>
  <div class='block'><label>Référence</label>${esc(bon.reference)}</div>
  <div class='block'><label>Date</label>${new Date(bon.date).toLocaleDateString("fr-FR")}</div>
  <div class='block'><label>Fournisseur</label><strong>${esc(bon.fournisseurNom)}</strong></div>
</div>
<table><thead><tr><th>Produit</th><th style='text-align:center'>Qté</th><th style='text-align:right'>P.U. HT</th><th style='text-align:center'>TVA</th><th style='text-align:right'>Total HT</th></tr></thead>
<tbody>${lignesHtml}</tbody></table>
<div class='total'>Total HT : ${tot.toFixed(2)}€ &nbsp;|&nbsp; Total TTC : ${totTTC.toFixed(2)}€</div>
${bon.notes ? `<p style='margin-top:16px;font-size:11px;color:#6b7280'>Notes : ${esc(bon.notes)}</p>` : ""}
<div style='margin-top:32px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px'>
Document généré par Bella'Food — Bellaïa</div>
</body></html>`;
}
