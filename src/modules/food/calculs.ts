// ═══════════════════════════════════════════════════════════
// BELLA'FOOD — Moteur de calcul de production
// Coûts, marges, rentabilité, listes d'achats
// ═══════════════════════════════════════════════════════════

export interface Ingredient {
  mp_id:      string;
  mp_nom:     string;
  quantite:   number;     // par portion de référence
  unite:      string;
  cout_unit:  number;     // coût unitaire de la MP
  allergenes?: string[];
}

export interface Recette {
  id:          string;
  nom:         string;
  categorie:   string;
  portions_ref: number;   // nombre de portions de référence
  ingredients: Ingredient[];
  consommables?: { nom:string; qte:number; cout:number }[];
  temps_prep_min:  number;
  temps_cuisson_min: number;
  description?: string;
  notes?: string;
  statut: "active" | "brouillon" | "archivée";
}

export interface ResultatCalculRecette {
  cout_mp_total:       number;  // coût matières premières
  cout_conso_total:    number;  // coût consommables
  cout_revient_total:  number;  // coût total
  cout_par_portion:    number;  // coût par portion
  prix_min:            number;  // prix minimum (coût × 1.3)
  prix_conseille:      number;  // prix avec marge 40%
  prix_premium:        number;  // prix premium
  benefice_par_portion:number;
  benefice_total:      number;
  taux_marge:          number;  // en %
  allergenes_presents: string[];
  allergenes_absents:  string[];
}

export function calculerRecette(
  recette: Recette,
  nb_portions: number = recette.portions_ref,
  marge_pct: number = 40
): ResultatCalculRecette {
  const ratio = nb_portions / recette.portions_ref;

  // Coût MP
  const cout_mp = recette.ingredients.reduce((s, ing) => {
    return s + (ing.quantite * ratio * ing.cout_unit);
  }, 0);

  // Coût consommables
  const cout_conso = (recette.consommables || []).reduce((s, c) => {
    return s + (c.qte * ratio * c.cout);
  }, 0);

  const cout_total  = cout_mp + cout_conso;
  const cout_portion = cout_total / nb_portions;
  const marge        = marge_pct / 100;
  const prix_ht      = marge > 0 ? cout_portion / (1 - marge) : cout_portion * 1.5;

  const prix_min       = parseFloat((cout_portion * 1.3).toFixed(2));
  const prix_conseille = parseFloat(prix_ht.toFixed(2));
  const prix_premium   = parseFloat((prix_ht * 1.25).toFixed(2));
  const benefice_portion = prix_conseille - cout_portion;
  const taux_marge = parseFloat(((benefice_portion / prix_conseille) * 100).toFixed(1));

  // Allergènes
  const allergenes_presents = new Set<string>();
  recette.ingredients.forEach(ing => {
    (ing.allergenes || []).forEach(a => allergenes_presents.add(a));
  });

  const TOUS_ALLERGENES = ["gluten","lait","oeufs","arachides","fruits_coque","soja","poisson","crustaces","mollusques","celeri","moutarde","sesame","lupin","sulfites"];
  const allergenes_absents = TOUS_ALLERGENES.filter(a => !allergenes_presents.has(a));

  return {
    cout_mp_total:       parseFloat(cout_mp.toFixed(2)),
    cout_conso_total:    parseFloat(cout_conso.toFixed(2)),
    cout_revient_total:  parseFloat(cout_total.toFixed(2)),
    cout_par_portion:    parseFloat(cout_portion.toFixed(2)),
    prix_min,
    prix_conseille,
    prix_premium,
    benefice_par_portion: parseFloat(benefice_portion.toFixed(2)),
    benefice_total:       parseFloat((benefice_portion * nb_portions).toFixed(2)),
    taux_marge,
    allergenes_presents:  Array.from(allergenes_presents),
    allergenes_absents,
  };
}

// ── Calcul liste d'achats pour une commande/événement
export interface BesoinProduction {
  recette:    Recette;
  nb_portions: number;
}

export interface LigneAchat {
  nom:         string;
  unite:       string;
  besoin:      number;   // quantité nécessaire
  stock_dispo: number;   // stock actuel
  a_acheter:   number;   // max(0, besoin - stock)
  cout_estime: number;
  categorie:   string;
  urgent:      boolean;
}

export function genererListeAchats(
  besoins: BesoinProduction[],
  stocks:  Record<string, { quantite:number; cout_unit:number; categorie:string }>
): LigneAchat[] {
  // Agréger tous les besoins
  const totaux: Record<string, {
    besoin:number; unite:string; cout_unit:number; categorie:string;
  }> = {};

  besoins.forEach(b => {
    const ratio = b.nb_portions / b.recette.portions_ref;
    b.recette.ingredients.forEach(ing => {
      const key = ing.mp_nom;
      if (!totaux[key]) {
        totaux[key] = { besoin:0, unite:ing.unite, cout_unit:ing.cout_unit, categorie:"MP" };
      }
      totaux[key].besoin += ing.quantite * ratio;
    });
    (b.recette.consommables||[]).forEach(c => {
      const key = c.nom;
      if (!totaux[key]) totaux[key] = { besoin:0, unite:"u", cout_unit:c.cout, categorie:"Emballage" };
      totaux[key].besoin += c.qte * ratio;
    });
  });

  return Object.entries(totaux).map(([nom, data]) => {
    const stock = stocks[nom];
    const stock_dispo = stock?.quantite || 0;
    const a_acheter  = Math.max(0, data.besoin - stock_dispo);
    const cout_unit  = stock?.cout_unit || data.cout_unit || 0;
    return {
      nom,
      unite:       data.unite,
      besoin:      parseFloat(data.besoin.toFixed(3)),
      stock_dispo: parseFloat(stock_dispo.toFixed(3)),
      a_acheter:   parseFloat(a_acheter.toFixed(3)),
      cout_estime: parseFloat((a_acheter * cout_unit).toFixed(2)),
      categorie:   stock?.categorie || data.categorie,
      urgent:      stock_dispo < data.besoin * 0.5,
    };
  }).sort((a,b) => (b.urgent?1:0)-(a.urgent?1:0));
}

// ── Calcul rapide pour un événement
export function calculerEvenementFood(
  nb_convives:  number,
  menu:         { plats: string[]; avec_jus: boolean; avec_dessert: boolean },
  prix_par_tete:number = 0
): {
  portions_plat:    number;
  bouteilles_jus:   number;
  portions_dessert: number;
  cout_estime:      number;
  ca_estime:        number;
  marge_estime:     number;
} {
  const portions_plat    = Math.ceil(nb_convives * 1.1);  // +10% sécurité
  const bouteilles_jus   = menu.avec_jus ? Math.ceil(nb_convives * 1.2) : 0;
  const portions_dessert = menu.avec_dessert ? Math.ceil(nb_convives * 1.05) : 0;

  // Coût moyen estimé par portion (à personnaliser via recettes réelles)
  const cout_mp_portion   = 2.5;
  const cout_conso_port   = 0.8;
  const cout_total        = (portions_plat + portions_dessert) * (cout_mp_portion + cout_conso_port)
                          + bouteilles_jus * 0.6;

  const ca_estime    = prix_par_tete > 0 ? nb_convives * prix_par_tete : 0;
  const marge_estime = ca_estime > 0 ? parseFloat(((ca_estime - cout_total) / ca_estime * 100).toFixed(1)) : 0;

  return {
    portions_plat, bouteilles_jus, portions_dessert,
    cout_estime:  parseFloat(cout_total.toFixed(2)),
    ca_estime:    parseFloat(ca_estime.toFixed(2)),
    marge_estime,
  };
}
