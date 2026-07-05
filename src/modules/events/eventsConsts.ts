// ═══════════════════════════════════════════════════════════
// CONSTANTES — Module Bella'Events
// Catalogue, catégories, couleurs, statuts, marges
// ═══════════════════════════════════════════════════════════
import type { EventsPrestation, FoodItem, EtapeSuivi } from "./eventsTypes";

const EVENTS_CONDITIONS = {
  acompte_evenement: 30,   // % acompte prestations événementielles
  acompte_gateau: 50,      // % acompte gâteaux
  kit_min: 10,             // minimum kits anniversaire
  livraison_km: 4,         // €/km
  livraison_forfait: 50,   // forfait au-delà de 150km
  livraison_seuil: 150,    // km
  delai_sucre: "1 mois",   // pâte à sucre
  delai_autre: "7 à 15 jours",
};

// Catégories (toutes pré-créées, certaines "sur devis")
const EVENTS_CATEGORIES = [
  {id:"anniv",   nom:"Anniversaires",          ico:"🎂", desc:"Décoration, papeterie et gâteaux pour anniversaires inoubliables."},
  {id:"baby",    nom:"Baby Shower",            ico:"🍼", desc:"Mise en scène tendre pour célébrer l'arrivée de bébé."},
  {id:"bapteme", nom:"Baptême",                ico:"🕊", desc:"Décoration et papeterie pour baptêmes."},
  {id:"commu",   nom:"Communion",              ico:"✝", desc:"Prestations pour communions."},
  {id:"gender",  nom:"Gender Reveal",          ico:"🎈", desc:"Révélation de genre festive et personnalisée."},
  {id:"mariage", nom:"Mariage",                ico:"💍", desc:"Prestations mariage — sur devis personnalisé."},
  {id:"papeterie",nom:"Papeterie personnalisée",ico:"✉️", desc:"Invitations, menus, étiquettes, kits personnalisés."},
  {id:"deco",    nom:"Décoration",             ico:"🎀", desc:"Décoration complète et mise en scène."},
  {id:"location",nom:"Location de matériel",   ico:"🔑", desc:"Arches, mobilier, accessoires à louer."},
  {id:"gateaux", nom:"Gâteaux personnalisés",  ico:"🧁", desc:"Créations sucrées sur mesure, pâte à sucre."},
  {id:"ballons", nom:"Ballons et arches",      ico:"🎈", desc:"Arches de ballons et compositions."},
  {id:"cadeaux", nom:"Cadeaux invités",        ico:"🎁", desc:"Petites attentions personnalisées pour vos invités."},
  {id:"formules",nom:"Formules combinées / Offres",ico:"⭐", desc:"Combinaisons gâteau, décoration et kits — offres complètes."},
  {id:"unite",   nom:"À l'unité",              ico:"🛒", desc:"Commandez certains articles seuls, sans pack complet."},
];

// Sous-familles de la catégorie "À l'unité"
const EVENTS_UNITE_FAMILLES = [
  {id:"gourmandises", nom:"Gourmandises personnalisées", ico:"🍬"},
  {id:"boissons",     nom:"Boissons personnalisées",     ico:"🧃"},
  {id:"contenants",   nom:"Contenants",                  ico:"📦"},
  {id:"goodies",      nom:"Goodies",                     ico:"🎈"},
  {id:"papeterie_s",  nom:"Papeterie simple",            ico:"🏷"},
  {id:"options_deco", nom:"Options décoratives",         ico:"🎀"},
];

// Sous-familles de la catégorie "Anniversaires" — packs non remplis / remplis
const EVENTS_ANNIV_FAMILLES = [
  {id:"anniv_non_rempli", nom:"Packs non remplis", ico:"📦"},
  {id:"anniv_rempli",     nom:"Packs remplis",     ico:"🎁"},
];

// Prestations (prix validés ou null = "Sur devis")
const EVENTS_PRESTATIONS = [
  {id:"ev_kit_anniv", categorie:"papeterie", sous:"anniv", nom:"Kit anniversaire personnalisé", desc:"Papeterie complète (invitations, étiquettes, déco de table).", prix:22, unite:"kit", min_qte:10, acompte_pct:30, sur_devis:false, cout_revient:null, fournisseur:null, stock_lie:null, note:"Minimum 10 kits."},
  {id:"ev_gateau",    categorie:"gateaux",   sous:"gateaux", nom:"Gâteau personnalisé", desc:"Création sucrée sur mesure, pâte à sucre possible.", prix:45, unite:"pièce", min_qte:1, acompte_pct:50, sur_devis:false, prix_des:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"À partir de 45€ · acompte 50% · délai 1 mois si pâte à sucre."},
  {id:"ev_deco_std",  categorie:"deco",      sous:"deco", nom:"Décoration complète", desc:"Mise en scène complète de votre événement.", prix:80, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, prix_des:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"À partir de 80€.", categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"ev_deco_prem", categorie:"deco",      sous:"deco", nom:"Décoration premium", desc:"Décoration haut de gamme selon l'ampleur du projet.", prix:200, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, prix_jusqua:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"Jusqu'à 200€ selon le projet.", categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Sur devis (prix non validés)
  {id:"ev_baby",      categorie:"baby",      sous:"baby", nom:"Pack Baby Shower", desc:"Décoration et papeterie pour baby shower.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_bapteme",   categorie:"bapteme",   sous:"bapteme", nom:"Pack Baptême", desc:"Décoration et papeterie pour baptême.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_commu",     categorie:"commu",     sous:"commu", nom:"Pack Communion", desc:"Prestations pour communion.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_gender",    categorie:"gender",    sous:"gender", nom:"Pack Gender Reveal", desc:"Mise en scène révélation de genre.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_mariage",   categorie:"mariage",   sous:"mariage", nom:"Prestations Mariage", desc:"Décoration, papeterie et coordination mariage.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_location",  categorie:"location",  sous:"location", nom:"Location de matériel", desc:"Arches, mobilier, accessoires événementiels.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_ballons",   categorie:"ballons",   sous:"ballons", nom:"Arche de ballons", desc:"Compositions et arches de ballons sur mesure.", prix:null, acompte_pct:30, sur_devis:true, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"ev_cadeaux",   categorie:"cadeaux",   sous:"cadeaux", nom:"Cadeaux invités", desc:"Petites attentions personnalisées.", prix:null, acompte_pct:30, sur_devis:true, categories:["anniv","baby","bapteme","commu","gender","mariage"]},

  // ── ARTICLES À L'UNITÉ (commandables seuls) ──
  // Gourmandises personnalisées
  {id:"u_chips",     categorie:"unite", sous:"gourmandises", type:"unite", nom:"Chips personnalisés", desc:"Sachet de chips personnalisé.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_popcorn",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Popcorn personnalisé", desc:"Popcorn en contenant personnalisé.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_bonbons",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini bonbons", desc:"Sachets de mini bonbons personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_haribo",    categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini Haribo", desc:"Mini sachets Haribo personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_nutella",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini Nutella", desc:"Mini pots Nutella personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_kinder",    categorie:"unite", sous:"gourmandises", type:"unite", nom:"Kinder Bueno", desc:"Kinder Bueno personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_choco",     categorie:"unite", sous:"gourmandises", type:"unite", nom:"Chocolats", desc:"Chocolats personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_pringles",  categorie:"unite", sous:"gourmandises", type:"unite", nom:"Pringles", desc:"Pringles personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Boissons personnalisées
  {id:"u_eau",       categorie:"unite", sous:"boissons", type:"unite", nom:"Bouteille d'eau personnalisée", desc:"Étiquette personnalisée sur bouteille d'eau.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_caprisun",  categorie:"unite", sous:"boissons", type:"unite", nom:"Capri-Sun personnalisé", desc:"Capri-Sun avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender"]},
  {id:"u_fruitshoot",categorie:"unite", sous:"boissons", type:"unite", nom:"Fruit Shoot personnalisé", desc:"Fruit Shoot personnalisé.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender"]},
  {id:"u_champomy",  categorie:"unite", sous:"boissons", type:"unite", nom:"Champomy personnalisé", desc:"Champomy avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","mariage"]},
  {id:"u_jus",       categorie:"unite", sous:"boissons", type:"unite", nom:"Jus personnalisé", desc:"Jus avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_minibouteille",categorie:"unite", sous:"boissons", type:"unite", nom:"Mini bouteilles", desc:"Mini bouteilles personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Contenants
  {id:"u_boitepop",  categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes popcorn", desc:"Boîtes à popcorn personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_boitecad",  categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes cadeaux", desc:"Boîtes cadeaux personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_gablebox",  categorie:"unite", sous:"contenants", type:"unite", nom:"Gable box", desc:"Boîtes gable box personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_sacs",      categorie:"unite", sous:"contenants", type:"unite", nom:"Sacs cadeaux", desc:"Sacs cadeaux personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_pyramides", categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes pyramides", desc:"Boîtes pyramides personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_sachets",   categorie:"unite", sous:"contenants", type:"unite", nom:"Sachets personnalisés", desc:"Sachets personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Goodies
  {id:"u_bulles",    categorie:"unite", sous:"goodies", type:"unite", nom:"Bulles de savon", desc:"Tubes à bulles personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_crayons",   categorie:"unite", sous:"goodies", type:"unite", nom:"Crayons", desc:"Crayons personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_coloriages",categorie:"unite", sous:"goodies", type:"unite", nom:"Coloriages", desc:"Livrets de coloriage personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_jeux",      categorie:"unite", sous:"goodies", type:"unite", nom:"Petits jeux", desc:"Petits jeux pour invités.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_cadeauxinv",categorie:"unite", sous:"goodies", type:"unite", nom:"Cadeaux invités", desc:"Cadeaux pour les invités.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Papeterie simple
  {id:"u_stickers",  categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Stickers", desc:"Stickers personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_etiquettes",categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Étiquettes", desc:"Étiquettes personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_toppers",   categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Toppers", desc:"Toppers personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  // Options décoratives
  {id:"u_minidecor", categorie:"unite", sous:"options_deco", type:"option", nom:"Mini décor", desc:"Petits éléments décoratifs.", prix:null, sur_devis:true, acompte_pct:30},

  // ── DÉTAIL DES CATÉGORIES (prestations spécifiques) ──
  // Anniversaires (détail)
  {id:"an_kit",      categorie:"anniv", sous:"anniv", type:"pack", nom:"Kit invité personnalisé", desc:"Kit complet pour chaque invité.", prix:22, unite:"kit", min_qte:10, acompte_pct:30, sur_devis:false, note:"Minimum 10 kits.", categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"an_formule",  categorie:"anniv", sous:"anniv", type:"prestation", nom:"Formule complète anniversaire", desc:"Organisation complète sur devis.", prix:null, sur_devis:true, acompte_pct:30},
  // Papeterie (détail)
  {id:"pa_invit_num",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitations numériques", desc:"Invitations au format numérique.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"pa_invit_imp",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitations imprimées", desc:"Invitations imprimées personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"pa_remerc",   categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Cartes de remerciement", desc:"Cartes de remerciement personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"pa_menus",    categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Menus buffet", desc:"Menus de buffet personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","bapteme","commu","mariage"]},
  {id:"pa_affiches", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Affiches", desc:"Affiches personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender"]},
  {id:"pa_fanions",  categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Fanions", desc:"Guirlandes de fanions personnalisées.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender"]},
  {id:"pa_marqueplace",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Marque-place", desc:"Marque-places personnalisés.", prix:null, sur_devis:true, acompte_pct:30, categories:["bapteme","commu","mariage"]},
  // Décoration (détail)
  {id:"de_minidecor",categorie:"deco", sous:"deco", type:"prestation", nom:"Mini décor", desc:"Décoration légère.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"de_table",    categorie:"deco", sous:"deco", type:"prestation", nom:"Décoration de table", desc:"Mise en scène de table.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"de_backdrop", categorie:"deco", sous:"deco", type:"prestation", nom:"Backdrop", desc:"Toile de fond décorative.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"de_sweettable",categorie:"deco", sous:"deco", type:"prestation", nom:"Sweet table", desc:"Table sucrée décorée.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"de_sceno",    categorie:"deco", sous:"deco", type:"prestation", nom:"Scénographie complète", desc:"Mise en scène complète de l'événement.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Gâteaux (détail)
  {id:"ga_classique",categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Gâteau classique", desc:"Gâteau personnalisé classique.", prix:45, prix_des:true, sur_devis:false, acompte_pct:50, note:"À partir de 45€ · acompte 50%."},
  {id:"ga_cakedesign",categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Cake design thème", desc:"Gâteau cake design sur thème.", prix:null, sur_devis:true, acompte_pct:50, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"ga_sculpte",  categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Gâteau sculpté", desc:"Gâteau sculpté sur mesure.", prix:null, sur_devis:true, acompte_pct:50},
  {id:"ga_cupcakes", categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Cupcakes", desc:"Cupcakes personnalisés.", prix:null, sur_devis:true, acompte_pct:50, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"ga_toppers",  categorie:"gateaux", sous:"gateaux", type:"option", nom:"Toppers gâteau", desc:"Toppers décoratifs pour gâteau.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  // Location (détail)
  {id:"lo_supports", categorie:"location", sous:"location", type:"prestation", nom:"Supports", desc:"Location de supports.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"lo_presentoirs",categorie:"location", sous:"location", type:"prestation", nom:"Présentoirs", desc:"Location de présentoirs.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"lo_arches",   categorie:"location", sous:"location", type:"prestation", nom:"Arches", desc:"Location d'arches.", prix:null, sur_devis:true, acompte_pct:30, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"lo_table",    categorie:"location", sous:"location", type:"prestation", nom:"Matériel de table", desc:"Location de matériel de table.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"lo_deco",     categorie:"location", sous:"location", type:"prestation", nom:"Éléments décoratifs", desc:"Location d'éléments décoratifs.", prix:null, sur_devis:true, acompte_pct:30},

  // ── PACKS ANNIVERSAIRE — Non remplis (10 paliers, prix validés) ──
  {id:"an_nr_1",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 1", desc:"Kit anniversaire non rempli, palier 1.", prix:25,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_2",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 2", desc:"Kit anniversaire non rempli, palier 2.", prix:45,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_3",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 3", desc:"Kit anniversaire non rempli, palier 3.", prix:65,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_4",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 4", desc:"Kit anniversaire non rempli, palier 4.", prix:85,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_5",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 5", desc:"Kit anniversaire non rempli, palier 5.", prix:105, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_6",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 6", desc:"Kit anniversaire non rempli, palier 6.", prix:125, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_7",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 7", desc:"Kit anniversaire non rempli, palier 7.", prix:145, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_8",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 8", desc:"Kit anniversaire non rempli, palier 8.", prix:165, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_9",  categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 9", desc:"Kit anniversaire non rempli, palier 9.", prix:185, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_nr_10", categorie:"anniv", sous:"anniv_non_rempli", type:"pack", nom:"Pack anniversaire non rempli 10",desc:"Kit anniversaire non rempli, palier 10.",prix:205, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},

  // ── PACKS ANNIVERSAIRE — Remplis (10 paliers, prix validés) ──
  {id:"an_r_1",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 1", desc:"Kit anniversaire rempli, palier 1.", prix:40,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_2",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 2", desc:"Kit anniversaire rempli, palier 2.", prix:75,  unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_3",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 3", desc:"Kit anniversaire rempli, palier 3.", prix:110, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_4",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 4", desc:"Kit anniversaire rempli, palier 4.", prix:145, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_5",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 5", desc:"Kit anniversaire rempli, palier 5.", prix:180, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_6",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 6", desc:"Kit anniversaire rempli, palier 6.", prix:215, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_7",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 7", desc:"Kit anniversaire rempli, palier 7.", prix:250, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_8",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 8", desc:"Kit anniversaire rempli, palier 8.", prix:285, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_9",  categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 9", desc:"Kit anniversaire rempli, palier 9.", prix:320, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"an_r_10", categorie:"anniv", sous:"anniv_rempli", type:"pack", nom:"Pack anniversaire rempli 10",desc:"Kit anniversaire rempli, palier 10.",prix:355, unite:"pack", min_qte:1, acompte_pct:30, sur_devis:false},

  // ── PAPETERIE — Invitations, faire-part, suite coordonnée ──
  {id:"pa_invit_num_classique",   categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitation numérique classique", desc:"Invitation digitale au design classique.", prix:15, unite:"design", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_num_animee",      categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitation numérique animée", desc:"Invitation digitale avec animation.", prix:25, unite:"design", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_num_interactive", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitation numérique interactive", desc:"Invitation digitale interactive (RSVP intégré).", prix:35, unite:"design", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_imp_s10", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"10 cartes simples imprimées", desc:"Invitations imprimées simples, lot de 10.", prix:25, unite:"lot de 10", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_imp_s20", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"20 cartes simples imprimées", desc:"Invitations imprimées simples, lot de 20.", prix:40, unite:"lot de 20", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_imp_p10", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"10 cartes premium imprimées", desc:"Invitations imprimées premium, lot de 10.", prix:35, unite:"lot de 10", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_invit_imp_p20", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"20 cartes premium imprimées", desc:"Invitations imprimées premium, lot de 20.", prix:55, unite:"lot de 20", min_qte:1, acompte_pct:30, sur_devis:false},
  {id:"pa_fp_digital",  categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Faire-part digital", desc:"Faire-part au format numérique.", prix:30, prix_des:true, unite:"design", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 30€."},
  {id:"pa_fp_imprime",  categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Faire-part imprimé", desc:"Faire-part imprimé classique.", prix:50, prix_des:true, unite:"lot", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 50€."},
  {id:"pa_fp_luxe",     categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Faire-part collection luxe", desc:"Faire-part haut de gamme, finitions premium.", prix:75, prix_des:true, unite:"lot", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 75€."},
  {id:"pa_suite_coord", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Suite papeterie coordonnée", desc:"Ensemble papeterie assorti (invitations, menus, étiquettes).", prix:60, prix_des:true, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 60€."},
  {id:"pa_mariage",     categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Papeterie mariage", desc:"Papeterie complète dédiée mariage.", prix:75, prix_des:true, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 75€."},

  // ── DÉCORATION — Signature, scénographie, prestige ──
  {id:"de_signature",  categorie:"deco", sous:"deco", type:"prestation", nom:"Décoration signature", desc:"Décoration personnalisée à forte identité visuelle.", prix:150, prix_des:true, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 150€."},
  {id:"de_sceno_complete", categorie:"deco", sous:"deco", type:"prestation", nom:"Scénographie complète prestige", desc:"Mise en scène complète et immersive de l'événement.", prix:250, prix_des:true, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 250€."},
  {id:"de_prestige_mesure", categorie:"deco", sous:"deco", type:"prestation", nom:"Prestation prestige sur mesure", desc:"Création entièrement personnalisée haut de gamme.", prix:450, prix_des:true, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 450€."},

  // ── FORMULES COMBINÉES / OFFRES ──
  {id:"fo_gateau_deco",  categorie:"formules", sous:"formules", type:"pack", nom:"Formule Gâteau + Décoration", desc:"Combinaison gâteau personnalisé et décoration complète.", prix:120, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 120€."},
  {id:"fo_gateau_kits",  categorie:"formules", sous:"formules", type:"pack", nom:"Formule Gâteau + Kits invités", desc:"Combinaison gâteau personnalisé et kits invités.", prix:250, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 250€."},
  {id:"fo_deco_kits",    categorie:"formules", sous:"formules", type:"pack", nom:"Formule Décoration + Kits invités", desc:"Combinaison décoration complète et kits invités.", prix:300, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 300€."},
  {id:"fo_offre_complete", categorie:"formules", sous:"formules", type:"pack", nom:"Offre complète événement", desc:"Décoration, gâteau et kits invités réunis pour un événement clé en main.", prix:400, prix_max:800, sur_devis:false, unite:"formule", min_qte:1, acompte_pct:30, note:"De 400€ à 800€ selon l'ampleur du projet."},
  {id:"fo_bapteme_signature", categorie:"formules", sous:"formules", type:"pack", nom:"Baptême signature", desc:"Formule baptême avec décoration et papeterie assorties.", prix:300, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 300€."},
  {id:"fo_bapteme_prestige",  categorie:"formules", sous:"formules", type:"pack", nom:"Baptême prestige", desc:"Formule baptême haut de gamme, scénographie incluse.", prix:550, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 550€."},
  {id:"fo_welcome_favors", categorie:"formules", sous:"formules", type:"pack", nom:"Welcome favors invités", desc:"Cadeaux de bienvenue personnalisés pour les invités.", prix:120, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 120€."},
  {id:"fo_mariage_signature", categorie:"formules", sous:"formules", type:"pack", nom:"Pack mariage signature", desc:"Formule mariage avec décoration et papeterie coordonnées.", prix:500, prix_des:true, unite:"formule", min_qte:1, acompte_pct:30, sur_devis:false, note:"À partir de 500€."},

  // ── À L'UNITÉ — Options tarifées ajoutées ──
  {id:"u_tube_bulles",   categorie:"unite", sous:"goodies", type:"unite", nom:"Tube à bulles personnalisé", desc:"Tube à bulles de savon personnalisé.", prix:1.5, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_assiette",      categorie:"unite", sous:"contenants", type:"unite", nom:"Assiette personnalisée", desc:"Assiette jetable personnalisée.", prix:1.8, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_timbale",       categorie:"unite", sous:"contenants", type:"unite", nom:"Timbale personnalisée", desc:"Gobelet/timbale personnalisé.", prix:1.5, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_popcorn_unite", categorie:"unite", sous:"gourmandises", type:"unite", nom:"Pop-corn personnalisé", desc:"Pop-corn en contenant personnalisé, à l'unité.", prix:3, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_sac_invite",    categorie:"unite", sous:"contenants", type:"unite", nom:"Sac cadeau invité", desc:"Sac cadeau personnalisé pour invités.", prix:4, prix_max:8, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, note:"De 4€ à 8€ selon le format.", categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_cake_topper",   categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Cake topper personnalisé", desc:"Topper décoratif personnalisé pour gâteau.", prix:10, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false, categories:["anniv","baby","bapteme","commu","gender","mariage"]},
  {id:"u_etiquette_sticker", categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Étiquette bouteille / sticker", desc:"Étiquette ou sticker personnalisé.", prix:1, unite:"pièce", min_qte:1, acompte_pct:30, sur_devis:false},

  // ── Location vaisselle réutilisable (option complémentaire) ──
  {
    id:"loc_vaisselle",
    nom:"Location de vaisselle réutilisable",
    categorie:"location",
    sous:"materiel",
    type:"location",
    desc:"Vaisselle plastique rigide réutilisable pour événements, sous réserve de disponibilité. Inclut assiettes, verres, couverts selon formule. Nettoyage et transport selon conditions.",
    prix:null,
    prix_des:true,
    unite:"lot",
    sur_devis:true,
    note:"Caution obligatoire. Frais de casse/perte facturés. Retour le lendemain de l'événement.",
    categories:["anniversaire","mariage","bapteme","baby_shower","reception"],
    cout_revient:null,
    fournisseur:null,
    stock_lie:"vaisselle_reut",
  },
];

const sCo = s => ({
  "En cours":{bg:"rgba(124,58,237,0.2)",t:"#c4a8ff"},"En préparation":{bg:"rgba(201,168,76,0.2)",t:"#f0d080"},
  Idée:{bg:"rgba(139,127,168,0.18)",t:"#b8aed0"},"En pause":{bg:"rgba(180,80,80,0.2)",t:"#f4a0a0"},
  Terminé:{bg:"rgba(80,180,120,0.2)",t:"#80e0a0"},Archivé:{bg:"rgba(80,80,80,0.2)",t:"#888"},
  "À faire":{bg:"rgba(139,127,168,0.18)",t:"#b8aed0"},"En attente":{bg:"rgba(201,168,76,0.15)",t:"#f0d080"},
  "À valider":{bg:"rgba(200,120,40,0.2)",t:"#f4c080"},Actif:{bg:"rgba(80,180,120,0.15)",t:"#80e0a0"},
  Inactif:{bg:"rgba(80,80,80,0.2)",t:"#888"},Confirmée:{bg:"rgba(80,180,120,0.2)",t:"#80e0a0"},
  "Paiement complet reçu":{bg:"rgba(80,180,120,0.2)",t:"#80e0a0"},"Acompte reçu":{bg:"rgba(201,168,76,0.2)",t:"#f0d080"},
}[s] || {bg:"rgba(139,127,168,0.18)",t:"#b8aed0"});

// ═══════════════════════════════════════════════════════════
// DONNÉES INITIALES
// ═══════════════════════════════════════════════════════════
const PROJETS_INIT = [
  {id:"p1",titre:"Bella'Odyssée — Lancement",pole:"Bella'Odyssée",priorite:"Haute",statut:"En cours",avancement:45,dateCible:"2026-12-31",revenusEstimes:8000},
  {id:"p2",titre:"Bella'Secret Home V2",pole:"Bella'Secret Home",priorite:"Haute",statut:"En cours",avancement:70,dateCible:"2026-08-01",revenusEstimes:5000},
  {id:"p3",titre:"Alphabet Guyane",pole:"Mo Ti-Péyi",priorite:"Haute",statut:"En cours",avancement:60,dateCible:"2026-08-01",revenusEstimes:3000},
  {id:"p4",titre:"Bella'Events — Été 2026",pole:"Bella'Events",priorite:"Haute",statut:"En cours",avancement:30,dateCible:"2026-09-30",revenusEstimes:4000},
  {id:"p5",titre:"Bella'Food — Lancement",pole:"Bella'Food",priorite:"Moyenne",statut:"En préparation",avancement:15,dateCible:"2026-12-31",revenusEstimes:3500},
  {id:"p6",titre:"Maman Femme & Cheffe",pole:"Bella'Studio Éditions",priorite:"Moyenne",statut:"Idée",avancement:5,dateCible:"2027-01-01",revenusEstimes:2000},
  {id:"p7",titre:"Mon Grand Voyage à Travers la Bible",pole:"Pédagogique",priorite:"Moyenne",statut:"En cours",avancement:25,dateCible:"2026-12-31",revenusEstimes:1500},
  {id:"p8",titre:"Fiches pédagogiques Guyane",pole:"Pédagogique",priorite:"Moyenne",statut:"En cours",avancement:40,dateCible:"2026-09-01",revenusEstimes:1200},
  {id:"p9",titre:"Projet Métiers",pole:"Pédagogique",priorite:"Basse",statut:"En préparation",avancement:10,dateCible:"2026-12-31",revenusEstimes:800},
  {id:"p10",titre:"Vilo'Assistance — Offre",pole:"Vilo'Assistance",priorite:"Moyenne",statut:"En cours",avancement:50,dateCible:"2026-12-31",revenusEstimes:2500},
  {id:"p11",titre:"Bellaïa Enterprise",pole:"Numérique",priorite:"Haute",statut:"En cours",avancement:72,dateCible:"2026-07-15",revenusEstimes:0},
  {id:"p12",titre:"Ti-Panier App",pole:"Ti-Panier",priorite:"Basse",statut:"Idée",avancement:5,dateCible:"2027-06-01",revenusEstimes:1000},
  {id:"p13",titre:"Mo Ti-Péyi — Collection 2",pole:"Mo Ti-Péyi",priorite:"Moyenne",statut:"En préparation",avancement:10,dateCible:"2026-12-31",revenusEstimes:2000},
];
const PRODS_BSH_INIT = [
  {id:"p1",name:"Body Résille Noir",cat:"Résille",prix:22,promo:null,isNew:true,ico:"🖤",desc:"Corps résille grande maille noir. Toutes morphologies XS–6XL+.",stock:12,min:3,achat:9},
  {id:"p2",name:"Body Résille Rouge",cat:"Résille",prix:22,promo:null,isNew:false,ico:"❤️",desc:"Corps résille rouge passion. Grande maille extensible.",stock:10,min:3,achat:9},
  {id:"p3",name:"Body Résille Bordeaux",cat:"Résille",prix:24,promo:null,isNew:false,ico:"🍷",desc:"Corps résille bordeaux profond. XS–6XL+.",stock:8,min:3,achat:10},
  {id:"p4",name:"Body Résille Bleu Nuit",cat:"Résille",prix:24,promo:null,isNew:true,ico:"🌙",desc:"Corps résille bleu nuit mystérieux. XS–6XL+.",stock:8,min:3,achat:10},
  {id:"p5",name:"Body Transparence Noir",cat:"Transparence",prix:28,promo:null,isNew:false,ico:"🖤",desc:"Body transparent noir mat, voile sensuel et raffiné.",stock:7,min:3,achat:12},
  {id:"p6",name:"Body Transparence Nude",cat:"Transparence",prix:29,promo:22,isNew:false,ico:"🌸",desc:"Effet seconde peau exceptionnel. Toutes carnations.",stock:6,min:3,achat:12},
  {id:"p7",name:"Body Transparence Bordeaux",cat:"Transparence",prix:29,promo:null,isNew:false,ico:"🍷",desc:"Voile bordeaux sophistiqué. Pièce signature BSH.",stock:5,min:3,achat:12},
  {id:"p8",name:"Porte-Jarretelles Noir",cat:"Glamour",prix:25,promo:null,isNew:false,ico:"👠",desc:"Glamour classique. Fixations dorées. Toutes tailles.",stock:9,min:3,achat:10},
  {id:"p9",name:"Porte-Jarretelles Rouge",cat:"Glamour",prix:25,promo:null,isNew:false,ico:"🔴",desc:"Rouge passion. Fixations dorées premium.",stock:7,min:3,achat:10},
  {id:"p10",name:"Ensemble Dentelle Bleu Nuit",cat:"Premium",prix:45,promo:null,isNew:true,ico:"💎",desc:"2 pièces dentelle guipure bleu nuit. Finitions fil d'or.",stock:5,min:2,achat:20},
  {id:"p11",name:"Oeufs de Kegel Trio",cat:"Bien-être",prix:45,promo:null,isNew:false,ico:"🌹",desc:"Set 3 tailles. Silicone médical. Rééducation périnéale.",stock:6,min:2,achat:18},
  {id:"p12",name:"Masque Strass Boudoir",cat:"Boudoir",prix:29,promo:null,isNew:false,ico:"🎭",desc:"Strass cristal. Accessoire boudoir luxe.",stock:8,min:3,achat:11},
  {id:"p13",name:"Coffret Nuit de Velours",cat:"Coffrets",prix:79,promo:null,isNew:false,ico:"🎁",desc:"Lingerie + bougie massage + huile + carte personnalisée.",stock:8,min:3,achat:35},
  {id:"p14",name:"Coffret Lune de Miel",cat:"Mariage",prix:129,promo:null,isNew:false,ico:"💍",desc:"Collection mariage & nuit de noces premium.",stock:4,min:2,achat:55},
  {id:"p15",name:"Coffret Secret Couple",cat:"Coffrets",prix:89,promo:null,isNew:false,ico:"💑",desc:"Accessoires + bougie + huile + surprise couple.",stock:6,min:2,achat:40},
];
const EVTS_BSH_INIT = [
  {id:"e1",ico:"✨",nom:"Soirée Découverte",date:"2026-07-15",lieu:ENV.VILLE,cap:20,dispo:7,prix:25,desc:"2h30 d'univers BSH en petit comité."},
  {id:"e2",ico:"🌹",nom:"Secret Singles Femme",date:"2026-07-22",lieu:"Kourou",cap:15,dispo:3,prix:35,desc:"Soirée privée pour célibataires."},
  {id:"e3",ico:"📸",nom:"Boudoir Session",date:"2026-07-29",lieu:ENV.VILLE,cap:8,dispo:5,prix:89,desc:"Shooting photo privé. Tous niveaux."},
];
const CLIENTES_BSH_INIT = [
  {id:"CL001",nom:"Marie S.",ville:ENV.VILLE,canal:"WhatsApp",vip:"Or",total:287,tel:"+594690000001",notes:"Cliente fidèle",preferences:"Lingerie dentelle, taille M"},
  {id:"CL002",nom:"Kathy R.",ville:"Kourou",canal:"TikTok",vip:"Argent",total:78,tel:"+594690000002",notes:"",preferences:""},
  {id:"CL003",nom:"Aline B.",ville:"Matoury",canal:"Instagram",vip:"Diamant",total:589,tel:"+594690000004",notes:"Meilleure cliente 2025",preferences:"Coffrets premium"},

const BE_FILTRES = ["Tous","Anniversaire","Baptême","Baby Shower","Communion","Retraite","Réception privée","Gender Reveal","Événement pro"];
const BE_STATUTS_CMD = ["Demande reçue","Devis envoyé","Acompte reçu","En préparation","Livraison / Installation","Réalisé","Archivé","Annulé"];


const EV = {or:"#10b981",creme:"#e8f5ee",cremeD:"#a8d5be",line:"rgba(16,185,129,0.25)",verre:"rgba(16,185,129,0.06)",acc:"#34d399",night:"#0a1410"};

// ═══════════════════════════════════════════════════════════
// MOTEUR DEVIS INTELLIGENT — Analyse du message client
// Utilise uniquement les prix validés dans les catalogues.
// Aucun prix inventé : "À compléter" si non trouvé.
// ═══════════════════════════════════════════════════════════

// Mini-catalogue Bella'Food — prix validés uniquement
// (à enrichir quand le module Food sera intégré)
const FOOD_CATALOGUE_LIGHT = [
  {id:"food_gateau_ps", nom:"Gâteau pâte à sucre", pole:"FOOD", categorie:"pâtisserie", prix:45, unite:"prestation", note:"Prix de base, supplément selon décor et taille."},
  {id:"food_gateau_mou", nom:"Gâteau mousse", pole:"FOOD", categorie:"pâtisserie", prix:35, unite:"prestation"},
  {id:"food_cupcakes_d", nom:"Cupcakes décorés (12 pcs)", pole:"FOOD", categorie:"pâtisserie", prix:28, unite:"douzaine"},
  {id:"food_option_saveur", nom:"Option saveur spéciale (caramel, pralinée...)", pole:"FOOD", categorie:"option", prix:5, unite:"option"},
  {id:"food_buffet_s", nom:"Buffet sucré", pole:"FOOD", categorie:"traiteur", prix:8, unite:"par personne"},
  {id:"food_buffet_c", nom:"Buffet cocktail", pole:"FOOD", categorie:"traiteur", prix:15, unite:"par personne"},
  {id:"food_repas", nom:"Repas servi (plat + dessert)", pole:"FOOD", categorie:"traiteur", prix:22, unite:"par personne"},
];

// Mots-clés de détection → id dans les catalogues Events ou Food
const DETECTION_MAP = [
  // ── Gâteaux ──
  {mots:["pâte à sucre","pate a sucre","fondant"],      id:"food_gateau_ps",    catalogue:"food"},
  {mots:["gâteau","gateau","cake"],                       id:"ga_classique",      catalogue:"events"},
  {mots:["cupcake"],                                      id:"food_cupcakes_d",   catalogue:"food"},
  {mots:["cake design","cake art"],                       id:"ga_cakedesign",     catalogue:"events"},
  {mots:["cake topper","topper"],                         id:"u_cake_topper",     catalogue:"events"},
  // ── Options saveur ──
  {mots:["caramel","beurre salé","praliné","praline","chocolat caramel"],
                                                          id:"food_option_saveur",catalogue:"food"},
  // ── Traiteur / buffet ──
  {mots:["buffet","cocktail","apéritif","aperitif"],      id:"food_buffet_c",     catalogue:"food"},
  {mots:["traiteur","repas","déjeuner","dîner","diner"],  id:"food_repas",        catalogue:"food"},
  // ── Papeterie ──
  {mots:["invitation","invitations"],                     id:"pa_invit_num",      catalogue:"events"},
  {mots:["faire-part","faire part","fairpart"],           id:"pa_fp_digital",     catalogue:"events"},
  {mots:["menu"],                                         id:"pa_menus",          catalogue:"events"},
  {mots:["fanion"],                                       id:"pa_fanions",        catalogue:"events"},
  {mots:["marque-place","marque place"],                  id:"pa_marqueplace",    catalogue:"events"},
  // ── Décoration ──
  {mots:["décoration","decoration","décor"],              id:"ev_deco_std",       catalogue:"events"},
  {mots:["backdrop","toile de fond"],                     id:"de_backdrop",       catalogue:"events"},
  {mots:["arche","ballon","ballons","arche ballon"],       id:"ev_ballons",        catalogue:"events"},
  {mots:["sweet table","table sucrée"],                   id:"de_sweettable",     catalogue:"events"},
  // ── Packs anniversaire ──
  {mots:["pack rempli","pack personnalisé rempli","personnalisé rempli"],
                                                          id:"an_r_1",            catalogue:"events"},
  {mots:["pack non rempli","pack vide","non rempli"],     id:"an_nr_1",           catalogue:"events"},
  {mots:["kit invité","kit anniversaire","kit invites"],  id:"an_kit",            catalogue:"events"},
  // ── Tubes à bulles / options unité ──
  {mots:["tube","bulles","tube à bulles"],                id:"u_tube_bulles",     catalogue:"events"},
  {mots:["assiette personnalisée"],                       id:"u_assiette",        catalogue:"events"},
  {mots:["pop-corn","popcorn","pop corn"],                id:"u_popcorn_unite",   catalogue:"events"},
];

// Trouve une prestation dans EVENTS_PRESTATIONS par id

const ETAPES_SUIVI = [
  {statut:"nouvelle_demande",    ico:"✅", label:"Demande reçue"},
  {statut:"a_traiter",           ico:"⏳", label:"Étude de votre demande"},
  {statut:"devis_en_preparation",ico:"📄", label:"Devis en préparation"},
  {statut:"devis_envoye",        ico:"📩", label:"Devis envoyé"},
  {statut:"accepte",             ico:"🎉", label:"Réservation confirmée"},
];

// Normalise un statut brut (espaces, accents, casse) vers une des clés ci-dessus
