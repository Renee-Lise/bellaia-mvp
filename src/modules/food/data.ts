// ═══════════════════════════════════════════════════════════
// BELLA'FOOD — Données de référence
// ═══════════════════════════════════════════════════════════

export const CATEGORIES_MP = [
  "Féculents", "Légumineuses", "Fruits et légumes",
  "Épices et condiments", "Viandes et poissons",
  "Emballages", "Conditionnement boissons", "Fermeture",
  "Étiquetage", "Autre",
];

export const MP_INITIALES = [
  // Féculents
  { nom:"Riz blanc",       cat:"Féculents",              unite:"kg",  seuil:2,  rendement_portions:20 },
  { nom:"Riz parfumé",     cat:"Féculents",              unite:"kg",  seuil:2,  rendement_portions:20 },
  { nom:"Riz thaï",        cat:"Féculents",              unite:"kg",  seuil:1,  rendement_portions:20 },
  { nom:"Vermicelles",     cat:"Féculents",              unite:"kg",  seuil:1,  rendement_portions:15 },
  { nom:"Couac",           cat:"Féculents",              unite:"kg",  seuil:1,  rendement_portions:12 },
  { nom:"Farine",          cat:"Féculents",              unite:"kg",  seuil:1,  rendement_portions:0  },
  { nom:"Semoule",         cat:"Féculents",              unite:"kg",  seuil:1,  rendement_portions:15 },
  // Légumineuses
  { nom:"Lentilles",       cat:"Légumineuses",           unite:"kg",  seuil:1,  rendement_portions:14 },
  { nom:"Haricots rouges", cat:"Légumineuses",           unite:"kg",  seuil:1,  rendement_portions:12 },
  { nom:"Haricots verts",  cat:"Légumineuses",           unite:"kg",  seuil:1,  rendement_portions:10 },
  { nom:"Pois cassés",     cat:"Légumineuses",           unite:"kg",  seuil:1,  rendement_portions:14 },
  // Fruits & légumes
  { nom:"Mangues",         cat:"Fruits et légumes",      unite:"kg",  seuil:2,  rendement_portions:6  },
  { nom:"Citrons",         cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:0  },
  { nom:"Ananas",          cat:"Fruits et légumes",      unite:"u",   seuil:2,  rendement_portions:4  },
  { nom:"Maracudja",       cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:5  },
  { nom:"Corossol",        cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:4  },
  { nom:"Tomates",         cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:0  },
  { nom:"Concombres",      cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:0  },
  { nom:"Aubergines",      cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:6  },
  { nom:"Antoua",          cat:"Fruits et légumes",      unite:"kg",  seuil:1,  rendement_portions:8  },
  { nom:"Épinards calou",  cat:"Fruits et légumes",      unite:"kg",  seuil:0.5,rendement_portions:6  },
  // Épices
  { nom:"Sel",             cat:"Épices et condiments",   unite:"kg",  seuil:0.5,rendement_portions:0  },
  { nom:"Poivre",          cat:"Épices et condiments",   unite:"g",   seuil:50, rendement_portions:0  },
  { nom:"Ail",             cat:"Épices et condiments",   unite:"kg",  seuil:0.2,rendement_portions:0  },
  { nom:"Oignon",          cat:"Épices et condiments",   unite:"kg",  seuil:0.5,rendement_portions:0  },
  { nom:"Curcuma",         cat:"Épices et condiments",   unite:"g",   seuil:50, rendement_portions:0  },
  { nom:"Colombo",         cat:"Épices et condiments",   unite:"g",   seuil:50, rendement_portions:0  },
  { nom:"Cannelle",        cat:"Épices et condiments",   unite:"g",   seuil:30, rendement_portions:0  },
  { nom:"Muscade",         cat:"Épices et condiments",   unite:"g",   seuil:20, rendement_portions:0  },
  { nom:"Vanille",         cat:"Épices et condiments",   unite:"g",   seuil:10, rendement_portions:0  },
  // Viandes & poissons
  { nom:"Poulet",          cat:"Viandes et poissons",    unite:"kg",  seuil:2,  rendement_portions:4  },
  { nom:"Crevettes",       cat:"Viandes et poissons",    unite:"kg",  seuil:1,  rendement_portions:6  },
  { nom:"Poisson",         cat:"Viandes et poissons",    unite:"kg",  seuil:1,  rendement_portions:5  },
  { nom:"Bœuf",            cat:"Viandes et poissons",    unite:"kg",  seuil:1,  rendement_portions:5  },
  { nom:"Porc",            cat:"Viandes et poissons",    unite:"kg",  seuil:1,  rendement_portions:5  },
  // Emballages
  { nom:"Barquettes S",    cat:"Emballages",             unite:"u",   seuil:20, rendement_portions:1  },
  { nom:"Barquettes M",    cat:"Emballages",             unite:"u",   seuil:20, rendement_portions:1  },
  { nom:"Barquettes L",    cat:"Emballages",             unite:"u",   seuil:20, rendement_portions:1  },
  { nom:"Barquettes compartimentées", cat:"Emballages",  unite:"u",   seuil:20, rendement_portions:1  },
  { nom:"Bouteilles 33cl", cat:"Conditionnement boissons",unite:"u",  seuil:24, rendement_portions:1  },
  { nom:"Bouteilles 50cl", cat:"Conditionnement boissons",unite:"u",  seuil:12, rendement_portions:1  },
  { nom:"Bouteilles 1L",   cat:"Conditionnement boissons",unite:"u",  seuil:12, rendement_portions:1  },
  { nom:"Couvercles",      cat:"Fermeture",              unite:"u",   seuil:20, rendement_portions:0  },
  { nom:"Film alimentaire",cat:"Fermeture",              unite:"u",   seuil:2,  rendement_portions:0  },
  { nom:"Sacs kraft",      cat:"Fermeture",              unite:"u",   seuil:20, rendement_portions:0  },
  { nom:"Étiquettes",      cat:"Étiquetage",             unite:"u",   seuil:50, rendement_portions:0  },
];

// Allergènes reconnus (14 allergènes majeurs EU)
export const ALLERGENES = [
  { id:"gluten",     label:"Gluten",           ico:"🌾" },
  { id:"lait",       label:"Lait",             ico:"🥛" },
  { id:"oeufs",      label:"Œufs",             ico:"🥚" },
  { id:"arachides",  label:"Arachides",        ico:"🥜" },
  { id:"fruits_coque",label:"Fruits à coque",  ico:"🌰" },
  { id:"soja",       label:"Soja",             ico:"🫘" },
  { id:"poisson",    label:"Poisson",          ico:"🐟" },
  { id:"crustaces",  label:"Crustacés",        ico:"🦐" },
  { id:"mollusques", label:"Mollusques",       ico:"🦑" },
  { id:"celeri",     label:"Céleri",           ico:"🥦" },
  { id:"moutarde",   label:"Moutarde",         ico:"🟡" },
  { id:"sesame",     label:"Sésame",           ico:"⚪" },
  { id:"lupin",      label:"Lupin",            ico:"🟣" },
  { id:"sulfites",   label:"Sulfites",         ico:"⚗️" },
];

// Produits finis par catégorie
export const PRODUITS_FINIS = {
  jus: ["Jus de canne","Jus de mangue","Jus de groseille","Jus de gingembre","Jus de maracudja","Jus de corossol"],
  plats: ["Poulet boucané","Poulet coco","Colombo","Danbré","Soupe créole","Bami","Nassi","Gratin","Riz cantonnais"],
  accompagnements: ["Riz blanc","Riz coco","Haricots rouges","Lentilles","Antoua","Aubergines sautées","Calou"],
  salades: ["Salade de riz","Salade de couac","Salade verte","Salade composée","Salade de fruits","Salade de fruits au lait","Salade de fruits caramélisées","Salade de fruits flambées caramélisées"],
};

// Rendements de référence
export const RENDEMENTS: Record<string, { unite:string; portions:number; desc:string }> = {
  "riz":       { unite:"kg",    portions: 20, desc: "1 kg de riz = 20 portions" },
  "poulet":    { unite:"piece", portions: 4,  desc: "1 poulet entier = 4 portions" },
  "jus":       { unite:"litre", portions: 3,  desc: "1 litre de jus = 3 bouteilles 33cl" },
  "lentilles": { unite:"kg",    portions: 14, desc: "1 kg de lentilles = 14 portions" },
  "couac":     { unite:"kg",    portions: 12, desc: "1 kg de couac = 12 portions" },
};
