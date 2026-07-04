// ═══════════════════════════════════════════════════════════
// CONSTANTES — Module Bella'Food
// Catalogue, recettes, stocks, matériel, consommables
// Données préremplies — modifiables en base (Supabase) ultérieurement
// ═══════════════════════════════════════════════════════════
import type {
  Produit, Recette, StockItem, Materiel, Consommable, Ingredient
} from "./foodTypes";

// ── Palette couleurs Food ──────────────────────────────────
export const FOOD_COLORS = {
  or:     "#c9a96e",
  vert:   "#15803d",
  vertL:  "#22c55e",
  cream:  "#fef9f0",
  creamD: "#d4b896",
  surface:"rgba(21,128,61,0.08)",
  line:   "rgba(21,128,61,0.2)",
  card:   "rgba(255,255,255,0.04)",
  night:  "#0a0f0a",
};

// ── Catégories du catalogue ────────────────────────────────
export const FOOD_CATEGORIES = [
  {id:"patisserie",     nom:"Pâtisserie",       ico:"🎂"},
  {id:"boisson",        nom:"Boissons & Jus",    ico:"🧃"},
  {id:"glace",          nom:"Glacerie",           ico:"🍦"},
  {id:"plat",           nom:"Cuisine salée",      ico:"🍽"},
  {id:"dessert",        nom:"Desserts",           ico:"🍮"},
  {id:"buffet",         nom:"Buffets & Traiteur", ico:"🍱"},
  {id:"sauce",          nom:"Sauces",             ico:"🥣"},
  {id:"accompagnement", nom:"Accompagnements",    ico:"🥗"},
];

// ── Catalogue produits prérempli ───────────────────────────
export const FOOD_CATALOGUE: Produit[] = [
  // Pâtisserie
  {id:"f_layer_cake",   nom:"Layer Cake personnalisé",       categorie:"patisserie", sousCat:"cakes",       prix:45,  unite:"part de base", disponible:true, visibleEvents:true, description:"Gâteau à étages décoré selon thème"},
  {id:"f_bento_cake",   nom:"Bento Cake",                    categorie:"patisserie", sousCat:"cakes",       prix:25,  unite:"pièce",        disponible:true, visibleEvents:true},
  {id:"f_heart_cake",   nom:"Heart Cake",                    categorie:"patisserie", sousCat:"cakes",       prix:35,  unite:"pièce",        disponible:true, visibleEvents:true},
  {id:"f_number_cake",  nom:"Number Cake",                   categorie:"patisserie", sousCat:"cakes",       prix:null,unite:"pièce",        disponible:true, visibleEvents:true, description:"Sur devis selon le chiffre"},
  {id:"f_gateau_ps",    nom:"Gâteau pâte à sucre",           categorie:"patisserie", sousCat:"cakes",       prix:45,  unite:"prestation",   disponible:true, visibleEvents:true},
  {id:"f_cupcakes",     nom:"Cupcakes décorés",              categorie:"patisserie", sousCat:"cupcakes",    prix:28,  unite:"douzaine",     disponible:true, visibleEvents:true},
  {id:"f_cookies",      nom:"Cookies",                       categorie:"patisserie", sousCat:"biscuits",    prix:12,  unite:"6 pièces",     disponible:true},
  {id:"f_brownies",     nom:"Brownies",                      categorie:"patisserie", sousCat:"biscuits",    prix:15,  unite:"plaque",       disponible:true},
  {id:"f_donuts",       nom:"Donuts glacés",                 categorie:"patisserie", sousCat:"viennoiserie",prix:18,  unite:"6 pièces",     disponible:true},
  {id:"f_cake_pops",    nom:"Cake Pops",                     categorie:"patisserie", sousCat:"mignardises", prix:20,  unite:"10 pièces",    disponible:true, visibleEvents:true},
  {id:"f_entremets",    nom:"Entremets",                     categorie:"patisserie", sousCat:"cakes",       prix:null,unite:"pièce",        disponible:true, description:"Sur devis selon la composition"},
  {id:"f_tartes",       nom:"Tarte personnalisée",           categorie:"patisserie", sousCat:"tartes",      prix:null,unite:"pièce",        disponible:true},
  {id:"f_mignardises",  nom:"Plateau de mignardises",        categorie:"patisserie", sousCat:"mignardises", prix:null,unite:"plateau",      disponible:true, visibleEvents:true},
  {id:"f_box_patisserie",nom:"Box pâtisserie",               categorie:"patisserie", sousCat:"box",         prix:null,unite:"box",          disponible:true},
  // Boissons & Jus
  {id:"f_jus_canne",    nom:"Jus de canne",                  categorie:"boisson",    sousCat:"jus",         prix:3,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_jus_mangue",   nom:"Jus de mangue",                 categorie:"boisson",    sousCat:"jus",         prix:3,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_jus_groseille",nom:"Jus de groseille",              categorie:"boisson",    sousCat:"jus",         prix:3,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_jus_coco",     nom:"Eau de coco",                   categorie:"boisson",    sousCat:"jus",         prix:4,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_jus_ananas",   nom:"Jus d'ananas",                  categorie:"boisson",    sousCat:"jus",         prix:3,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_jus_cerise",   nom:"Jus de cerises",                categorie:"boisson",    sousCat:"jus",         prix:3.5, unite:"verre",        disponible:true},
  {id:"f_jus_cupuacu",  nom:"Jus de cupuaçu",                categorie:"boisson",    sousCat:"jus",         prix:4,   unite:"verre",        disponible:true},
  {id:"f_jus_pommarosa",nom:"Jus de pomme rosa",             categorie:"boisson",    sousCat:"jus",         prix:3.5, unite:"verre",        disponible:true},
  {id:"f_jus_pommamour",nom:"Jus de pomme d'amour",          categorie:"boisson",    sousCat:"jus",         prix:3.5, unite:"verre",        disponible:true},
  {id:"f_jus_citron",   nom:"Jus de citron",                 categorie:"boisson",    sousCat:"jus",         prix:2.5, unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_the_citronelle",nom:"Thé glacé citronnelle",        categorie:"boisson",    sousCat:"the_glace",   prix:3,   unite:"verre",        disponible:true, visibleEvents:true},
  {id:"f_the_cannelle", nom:"Thé glacé cannelle",            categorie:"boisson",    sousCat:"the_glace",   prix:3,   unite:"verre",        disponible:true},
  {id:"f_the_citron",   nom:"Thé glacé citron",              categorie:"boisson",    sousCat:"the_glace",   prix:3,   unite:"verre",        disponible:true},
  {id:"f_smoothie",     nom:"Smoothie fruits frais",         categorie:"boisson",    sousCat:"smoothie",    prix:null,unite:"verre",        disponible:true},
  {id:"f_milkshake",    nom:"Milkshake",                     categorie:"boisson",    sousCat:"milkshake",   prix:null,unite:"verre",        disponible:true},
  // Glacerie
  {id:"f_glace_coco",   nom:"Glace coco",                    categorie:"glace",      sousCat:"glaces",      prix:3,   unite:"boule",        disponible:true, visibleEvents:true},
  {id:"f_sorbet_cacah", nom:"Sorbet cacahuète",              categorie:"glace",      sousCat:"glaces",      prix:3,   unite:"boule",        disponible:true},
  {id:"f_glace_awara",  nom:"Glace awara",                   categorie:"glace",      sousCat:"glaces",      prix:3.5, unite:"boule",        disponible:true},
  {id:"f_glace_acai",   nom:"Glace açaï",                    categorie:"glace",      sousCat:"glaces",      prix:3.5, unite:"boule",        disponible:true},
  {id:"f_glace_rhumraisin",nom:"Glace rhum-raisin",          categorie:"glace",      sousCat:"glaces",      prix:3,   unite:"boule",        disponible:true},
  {id:"f_glace_mangue", nom:"Glace mangue",                  categorie:"glace",      sousCat:"glaces",      prix:3,   unite:"boule",        disponible:true, visibleEvents:true},
  // Cuisine salée
  {id:"f_colombo",      nom:"Colombo de poulet",             categorie:"plat",       sousCat:"plats_guya",  prix:null,unite:"portion",      disponible:true, visibleEvents:true},
  {id:"f_dombres",      nom:"Dombrés aux crevettes",         categorie:"plat",       sousCat:"plats_guya",  prix:null,unite:"portion",      disponible:true, visibleEvents:true},
  {id:"f_crevettes_curry",nom:"Crevettes curry coco",        categorie:"plat",       sousCat:"plats_guya",  prix:null,unite:"portion",      disponible:true, visibleEvents:true},
  {id:"f_riz_djon",     nom:"Riz djon djon",                 categorie:"accompagnement",sousCat:"riz",       prix:null,unite:"portion",      disponible:true},
  {id:"f_riz_canton",   nom:"Riz cantonais",                 categorie:"accompagnement",sousCat:"riz",       prix:null,unite:"portion",      disponible:true},
  {id:"f_lentilles",    nom:"Lentilles mijotées aux légumes",categorie:"plat",       sousCat:"veggie",      prix:null,unite:"portion",      disponible:true},
  {id:"f_saumon",       nom:"Saumon au four, légumes rôtis", categorie:"plat",       sousCat:"poisson",     prix:null,unite:"portion",      disponible:true},
  {id:"f_poulet_grill", nom:"Poulet grillé, riz complet",    categorie:"plat",       sousCat:"viandes",     prix:null,unite:"portion",      disponible:true},
  {id:"f_feuillete",    nom:"Feuilletés au poulet",          categorie:"plat",       sousCat:"entrées",     prix:null,unite:"pièce",        disponible:true, visibleEvents:true},
  // Sauces
  {id:"f_sauce_burger", nom:"Sauce burger",                  categorie:"sauce",      sousCat:"sauces",      prix:null,unite:"portion",      disponible:true},
  {id:"f_sauce_roquefort",nom:"Sauce roquefort",             categorie:"sauce",      sousCat:"sauces",      prix:null,unite:"portion",      disponible:true},
  // Buffets traiteur
  {id:"f_buffet_sucre", nom:"Buffet sucré",                  categorie:"buffet",     sousCat:"buffet",      prix:8,   unite:"par personne", disponible:true, visibleEvents:true},
  {id:"f_buffet_cocktail",nom:"Buffet cocktail",             categorie:"buffet",     sousCat:"buffet",      prix:15,  unite:"par personne", disponible:true, visibleEvents:true},
  {id:"f_repas_servi",  nom:"Repas servi (plat + dessert)",  categorie:"buffet",     sousCat:"traiteur",    prix:22,  unite:"par personne", disponible:true, visibleEvents:true},
  {id:"f_option_saveur",nom:"Option saveur spéciale",        categorie:"patisserie", sousCat:"option",      prix:5,   unite:"option",       disponible:true, visibleEvents:true, description:"Caramel, pralinée, chocolat noir..."},
];

// ── Recettes de base ───────────────────────────────────────
export const FOOD_RECETTES_INIT: Recette[] = [
  {
    id:"r_layer_cake", nom:"Layer Cake 3 étages", categorie:"patisserie",
    sousCat:"cakes", difficulte:4, nbParts:12,
    ingredients:[
      {id:"ing_farine",nom:"Farine T55",quantite:400,unite:"g",coutUnitaire:0.002},
      {id:"ing_sucre", nom:"Sucre",quantite:300,unite:"g",coutUnitaire:0.003},
      {id:"ing_oeufs", nom:"Œufs",quantite:6,unite:"piece",coutUnitaire:0.3},
      {id:"ing_beurre",nom:"Beurre",quantite:200,unite:"g",coutUnitaire:0.012},
      {id:"ing_lait",  nom:"Lait",quantite:200,unite:"ml",coutUnitaire:0.001},
      {id:"ing_levure",nom:"Levure chimique",quantite:10,unite:"g",coutUnitaire:0.01},
    ],
    tempsPrepa:45, tempsCuisson:35, tempsRepos:120,
    etapes:[
      "Préchauffer le four à 180°C.",
      "Mélanger farine, sucre et levure.",
      "Incorporer les œufs battus, le beurre fondu et le lait.",
      "Répartir en 3 moules beurrés et cuire 30-35 min.",
      "Laisser refroidir complètement avant de garnir.",
      "Alterner couches de gâteau et de ganache/crème.",
      "Couvrir de crème et décorer selon le thème.",
    ],
    coutMatiere:8, coutConsommables:3, prixConseille:45,
    margeEstimee:34, statut:"validee",
    conservation:"3 jours au réfrigérateur",
  },
  {
    id:"r_bento_cake", nom:"Bento Cake individuel", categorie:"patisserie",
    sousCat:"cakes", difficulte:3, nbParts:1,
    ingredients:[
      {id:"ing_farine",nom:"Farine T55",quantite:80,unite:"g"},
      {id:"ing_sucre", nom:"Sucre",quantite:60,unite:"g"},
      {id:"ing_oeufs", nom:"Œufs",quantite:1,unite:"piece"},
      {id:"ing_beurre",nom:"Beurre",quantite:40,unite:"g"},
    ],
    tempsPrepa:20, tempsCuisson:20, tempsRepos:30,
    etapes:[
      "Mélanger les ingrédients secs.",
      "Incorporer les ingrédients humides.",
      "Cuire dans un moule individuel à 175°C pendant 18-20 min.",
      "Refroidir, garnir et décorer selon commande.",
    ],
    coutMatiere:2, coutConsommables:4, prixConseille:25,
    margeEstimee:19, statut:"validee",
    conservation:"2 jours au réfrigérateur",
  },
  {
    id:"r_jus_canne", nom:"Jus de canne frais", categorie:"boisson",
    sousCat:"jus", difficulte:1, nbParts:1,
    ingredients:[{id:"ing_canne",nom:"Canne à sucre",quantite:200,unite:"g"}],
    tempsPrepa:5, tempsCuisson:0,
    etapes:["Éplucher et presser la canne.", "Filtrer et servir frais."],
    coutMatiere:0.5, coutConsommables:0.5, prixConseille:3,
    margeEstimee:2, statut:"validee", conservation:"Consommer immédiatement",
  },
  {
    id:"r_colombo", nom:"Colombo de poulet", categorie:"plat",
    sousCat:"plats_guya", difficulte:3, nbParts:4,
    ingredients:[
      {id:"ing_poulet",  nom:"Poulet",quantite:1,unite:"kg",coutUnitaire:8},
      {id:"ing_colombo", nom:"Poudre à colombo",quantite:30,unite:"g",coutUnitaire:0.08},
      {id:"ing_coco",    nom:"Lait de coco",quantite:400,unite:"ml",coutUnitaire:0.003},
      {id:"ing_ail",     nom:"Ail",quantite:4,unite:"piece",coutUnitaire:0.2},
      {id:"ing_oignon",  nom:"Oignon",quantite:2,unite:"piece",coutUnitaire:0.3},
      {id:"ing_tomate",  nom:"Tomates",quantite:2,unite:"piece",coutUnitaire:0.4},
    ],
    epices:["Colombo","Cumin","Curcuma","Piment antillais"],
    proteines:["Poulet"],
    tempsPrepa:20, tempsCuisson:45,
    etapes:[
      "Mariner le poulet avec le colombo, l'ail et le jus de citron.",
      "Faire revenir l'oignon dans l'huile.",
      "Ajouter le poulet et faire dorer.",
      "Incorporer les tomates, le lait de coco et les épices.",
      "Laisser mijoter 35-40 min à feu doux.",
      "Ajuster l'assaisonnement et servir avec le riz.",
    ],
    coutMatiere:12, coutConsommables:1, prixConseille:null,
    statut:"validee", conservation:"2 jours au réfrigérateur",
  },
];

// ── Stocks matières premières initiaux ────────────────────
export const FOOD_STOCK_INIT: StockItem[] = [
  {id:"s_farine",   nom:"Farine T55",        categorie:"sec",          unite:"kg", qteRestante:5,   seuilAlerte:2,  prixAchat:1.2},
  {id:"s_sucre",    nom:"Sucre blanc",        categorie:"sec",          unite:"kg", qteRestante:3,   seuilAlerte:1,  prixAchat:0.9},
  {id:"s_beurre",   nom:"Beurre doux",        categorie:"frais",        unite:"kg", qteRestante:1,   seuilAlerte:0.5,prixAchat:8},
  {id:"s_oeufs",    nom:"Œufs (lot 12)",     categorie:"frais",        unite:"boite",qteRestante:2,  seuilAlerte:1,  prixAchat:3.5},
  {id:"s_lait",     nom:"Lait entier",        categorie:"frais",        unite:"L",  qteRestante:2,   seuilAlerte:1,  prixAchat:1.2},
  {id:"s_creme",    nom:"Crème liquide 30%",  categorie:"frais",        unite:"L",  qteRestante:1,   seuilAlerte:0.5,prixAchat:2.5},
  {id:"s_chocolat_n",nom:"Chocolat noir 70%", categorie:"sec",          unite:"kg", qteRestante:0.5, seuilAlerte:0.2,prixAchat:12},
  {id:"s_chocolat_b",nom:"Chocolat blanc",    categorie:"sec",          unite:"kg", qteRestante:0.5, seuilAlerte:0.2,prixAchat:10},
  {id:"s_levure",   nom:"Levure chimique",    categorie:"sec",          unite:"sachet",qteRestante:5, seuilAlerte:2,  prixAchat:0.5},
  {id:"s_vanille",  nom:"Extrait de vanille", categorie:"arômes",       unite:"ml", qteRestante:100, seuilAlerte:20, prixAchat:0.05},
  {id:"s_colombo",  nom:"Poudre à colombo",   categorie:"epices",       unite:"g",  qteRestante:200, seuilAlerte:50, prixAchat:0.04},
  {id:"s_lait_coco",nom:"Lait de coco",       categorie:"conserves",    unite:"L",  qteRestante:3,   seuilAlerte:1,  prixAchat:1.8},
  {id:"s_caramel",  nom:"Caramel beurre salé",categorie:"garnitures",   unite:"kg", qteRestante:0.3, seuilAlerte:0.1,prixAchat:15},
  {id:"s_colorant", nom:"Colorants alimentaires",categorie:"colorants",  unite:"boite",qteRestante:1,  seuilAlerte:0,  prixAchat:8},
];

// ── Matériel ───────────────────────────────────────────────
export const FOOD_MATERIEL_INIT: Materiel[] = [
  {id:"m_moule_layer",  nom:"Moules layer cake (3 pcs)",    categorie:"patisserie", qteDispo:1, etat:"bon",    prixAchat:35,  priorite:"utile"},
  {id:"m_moule_bento",  nom:"Moules bento cake",            categorie:"patisserie", qteDispo:4, etat:"bon",    prixAchat:8,   priorite:"utile"},
  {id:"m_moule_cup",    nom:"Moules cupcakes (12 alvéoles)",categorie:"patisserie", qteDispo:2, etat:"bon",    prixAchat:12,  priorite:"utile"},
  {id:"m_douilles",     nom:"Jeu de douilles",               categorie:"decoration", qteDispo:1, etat:"bon",    prixAchat:25,  priorite:"utile"},
  {id:"m_poches",       nom:"Poches à douille (50 pcs)",    categorie:"patisserie", qteDispo:1, etat:"bon",    prixAchat:8,   priorite:"urgent"},
  {id:"m_spatule",      nom:"Spatule coudée",                categorie:"patisserie", qteDispo:2, etat:"bon",    prixAchat:6,   priorite:"utile"},
  {id:"m_maryse",       nom:"Maryse",                        categorie:"patisserie", qteDispo:3, etat:"bon",    prixAchat:3,   priorite:"utile"},
  {id:"m_balance",      nom:"Balance de précision",          categorie:"cuisson",    qteDispo:1, etat:"bon",    prixAchat:30,  priorite:"urgent"},
  {id:"m_robot",        nom:"Robot pâtissier",               categorie:"cuisson",    qteDispo:0, etat:"manquant",prixAchat:400,priorite:"urgent"},
  {id:"m_mixeur",       nom:"Mixeur plongeant",              categorie:"cuisson",    qteDispo:1, etat:"bon",    prixAchat:45,  priorite:"utile"},
  {id:"m_plaques",      nom:"Plaques de cuisson",            categorie:"cuisson",    qteDispo:3, etat:"bon",    prixAchat:15,  priorite:"utile"},
  {id:"m_cercles",      nom:"Cercles à entremets",           categorie:"patisserie", qteDispo:2, etat:"bon",    prixAchat:12,  priorite:"utile"},
  {id:"m_thermometre",  nom:"Thermomètre de cuisson",        categorie:"cuisson",    qteDispo:1, etat:"bon",    prixAchat:20,  priorite:"urgent"},
  {id:"m_grilles",      nom:"Grilles de refroidissement",    categorie:"cuisson",    qteDispo:2, etat:"bon",    prixAchat:10,  priorite:"utile"},
  {id:"m_boites_transport",nom:"Boîtes de transport gâteaux",categorie:"livraison",  qteDispo:5, etat:"bon",    prixAchat:3,   priorite:"utile"},
  {id:"m_glacieres",    nom:"Glacières",                     categorie:"livraison",  qteDispo:2, etat:"bon",    prixAchat:25,  priorite:"utile"},
];

// ── Consommables ───────────────────────────────────────────
export const FOOD_CONSOMMABLES_INIT: Consommable[] = [
  {id:"c_boites_bento",    nom:"Boîtes bento cake",         categorie:"emballage",  qteDispo:20, qteParProduit:1, prixAchat:1.2,  seuilAlerte:5,  statut:"disponible"},
  {id:"c_boites_layer",    nom:"Boîtes layer cake",         categorie:"emballage",  qteDispo:10, qteParProduit:1, prixAchat:2.5,  seuilAlerte:3,  statut:"disponible"},
  {id:"c_boites_cup",      nom:"Boîtes cupcakes",           categorie:"emballage",  qteDispo:30, qteParProduit:1, prixAchat:0.8,  seuilAlerte:10, statut:"disponible"},
  {id:"c_pots_glace",      nom:"Pots à glace",              categorie:"emballage",  qteDispo:50, qteParProduit:1, prixAchat:0.3,  seuilAlerte:10, statut:"disponible"},
  {id:"c_bouteilles_jus",  nom:"Bouteilles jus (25cl)",     categorie:"emballage",  qteDispo:24, qteParProduit:1, prixAchat:0.4,  seuilAlerte:6,  statut:"disponible"},
  {id:"c_etiquettes",      nom:"Étiquettes personnalisées", categorie:"decoration", qteDispo:100,qteParProduit:1, prixAchat:0.1,  seuilAlerte:20, statut:"disponible"},
  {id:"c_stickers",        nom:"Stickers Bella'Food",       categorie:"decoration", qteDispo:50, qteParProduit:1, prixAchat:0.15, seuilAlerte:10, statut:"disponible"},
  {id:"c_rubans",          nom:"Rubans décoratifs",         categorie:"decoration", qteDispo:10, qteParProduit:1, prixAchat:1.5,  seuilAlerte:2,  statut:"disponible"},
  {id:"c_bougies",         nom:"Bougies anniversaire",      categorie:"decoration", qteDispo:30, qteParProduit:1, prixAchat:0.5,  seuilAlerte:5,  statut:"disponible"},
  {id:"c_toppers",         nom:"Toppers gâteaux",           categorie:"decoration", qteDispo:15, qteParProduit:1, prixAchat:1.0,  seuilAlerte:3,  statut:"disponible"},
  {id:"c_sacs_kraft",      nom:"Sacs kraft",                categorie:"emballage",  qteDispo:40, qteParProduit:1, prixAchat:0.3,  seuilAlerte:10, statut:"disponible"},
  {id:"c_film_alim",       nom:"Film alimentaire",          categorie:"hygiène",    qteDispo:2,  qteParProduit:0, prixAchat:3.5,  seuilAlerte:1,  statut:"disponible"},
  {id:"c_papier_cuisson",  nom:"Papier cuisson",            categorie:"cuisson",    qteDispo:3,  qteParProduit:0, prixAchat:2.0,  seuilAlerte:1,  statut:"disponible"},
  {id:"c_gants",           nom:"Gants jetables (boîte 50)", categorie:"hygiène",    qteDispo:2,  qteParProduit:0, prixAchat:4.5,  seuilAlerte:1,  statut:"disponible"},
  {id:"c_charlottes",      nom:"Charlottes (boîte 50)",     categorie:"hygiène",    qteDispo:1,  qteParProduit:0, prixAchat:3.0,  seuilAlerte:1,  statut:"faible"},
  {id:"c_serviettes",      nom:"Serviettes jetables",       categorie:"service",    qteDispo:200,qteParProduit:0, prixAchat:0.05, seuilAlerte:50, statut:"disponible"},
  {id:"c_couverts",        nom:"Couverts jetables (lot 50)",categorie:"service",    qteDispo:100,qteParProduit:0, prixAchat:0.08, seuilAlerte:20, statut:"disponible"},
];
