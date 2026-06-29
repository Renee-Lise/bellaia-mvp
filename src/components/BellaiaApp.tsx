'use client';

import React, { useState, useEffect, useCallback } from "react";
// ═══════════════════════════════════════════════════════════
// MARQUEUR DE VERSION — sert à vérifier que Vercel sert le bon code
// Si ce texte apparaît sur l'écran de connexion, le build est à jour.
// ═══════════════════════════════════════════════════════════
const BUILD_VERSION = "BUILD 2026-06-23 · CrmF+Panier OK";
// ═══════════════════════════════════════════════════════════
// CONSTANTES — Variables d'environnement (aucune coordonnée en dur)
// Configurer dans Vercel → Settings → Environment Variables
// ═══════════════════════════════════════════════════════════
const ENV = {
  WA:      process.env.NEXT_PUBLIC_WA_NUMBER   || "",   // ex: 594694356037
  TEL:     process.env.NEXT_PUBLIC_TEL_DISPLAY || "",   // ex: ${ENV.TEL}
  EMAIL:   process.env.NEXT_PUBLIC_EMAIL       || "",   // ex: ${ENV.EMAIL}
  PAYPAL:  process.env.NEXT_PUBLIC_PAYPAL      || "",   // ex: ${ENV.PAYPAL}
  ADRESSE: process.env.NEXT_PUBLIC_ADRESSE     || "",   // ex: ${ENV.ADRESSE}...
  VILLE:   process.env.NEXT_PUBLIC_VILLE       || "",   // ex: Sinnamary
  PAYS:    process.env.NEXT_PUBLIC_PAYS        || "Guyane française",
  NOM_ENT: process.env.NEXT_PUBLIC_NOM_ENT     || "Bella'Studio",
  SQUARE_BOOKING: process.env.NEXT_PUBLIC_SQUARE_BOOKING_URL || "",  // planning Square (RDV Odyssée)
};
const WA = (msg="") => `https://wa.me/${ENV.WA}${msg ? "?text=" + encodeURIComponent(msg) : ""}`;


// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const B = {
  night:"#0d0b12", deep:"#13101e", surface:"#1a1628", card:"#201c30",
  violet:"#7c3aed", violetL:"#9d6ef5", violetG:"rgba(124,58,237,0.2)",
  gold:"#c9a84c", goldL:"#f0d080", goldG:"rgba(201,168,76,0.15)",
  cream:"#f5f0e8", muted:"#8b7fa8", mutedL:"#b8aed0",
  border:"rgba(124,58,237,0.22)", borderG:"rgba(201,168,76,0.28)",
  success:"#80e0a0", danger:"#f4a0a0", warning:"#f0d080",
};
const BSH = {
  fond:"#0e0914", prune:"#2a0d1e", bord:"#6B1A2B", bord2:"#8B2A3B",
  rose:"#C9637A", or:"#C9A96E", creme:"#F5EEE6",
  cremeF:"rgba(245,238,230,.75)", cremeD:"rgba(245,238,230,.4)",
  verre:"rgba(255,255,255,.04)", verre2:"rgba(255,255,255,.07)",
  line:"rgba(201,169,110,.15)", lineMed:"rgba(201,169,110,.3)",
  vert:"#5aaa7a", ora:"#e88c3a", rouge:"#e84444",
};
const BO = {
  fond:"#05040f", prune:"#0d1535", acc:"#3730a3", acc2:"#4f46e5",
  or:"#c9a84c", creme:"#f0eeff", cremeD:"rgba(240,238,255,.4)",
  line:"rgba(99,102,241,0.2)", lineMed:"rgba(99,102,241,0.4)",
  verre:"rgba(255,255,255,.03)", vert:"#5aaa7a", rouge:"#e84444",
};
const FS = "'Georgia',serif";
const SA = "Inter,system-ui,sans-serif";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().split("T")[0];
const fmt = d => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const prioC = p => p==="Haute"?B.danger:p==="Moyenne"?B.warning:B.mutedL;
const STATUTS_PROJ = ["Idée","En préparation","En cours","En pause","En attente","À valider","Terminé","Archivé"];
const STATUTS_TACHE = ["À faire","En cours","En attente","Terminé"];
const PRIOS = ["Basse","Moyenne","Haute"];
const POLES = ["Bella'Odyssée","Bella'Events","Bella'Food","Bella'Secret Home","Vilo'Assistance","Bella'Studio Éditions","Mo Ti-Péyi","Ti-Panier","Numérique","Pédagogique","Général"];
const STATUTS_CMD = ["Demande reçue","Validation fondatrice","Paiement en attente","Acompte reçu","Paiement complet reçu","Confirmée","Préparation","Expédiée","Terminée","Annulée"];
const VIP_C = {Bronze:"#8B6030",Argent:"#8a9ab0",Or:BSH.or,Diamant:"#90d0f0"};
const CMD_C = {"Paiement complet reçu":BSH.vert,Terminée:BSH.vert,Expédiée:BSH.rose,Préparation:BSH.bord,"Acompte reçu":BSH.or,"Paiement en attente":BSH.ora,Annulée:BSH.rouge,Confirmée:BSH.vert,"Demande reçue":BSH.or};
const PRESTATIONS_BO = ["Extensions de cils","Blanchiment dentaire","Strass dentaires","Browlift","Lashlift","Soin visage","Autre"];
// ── Prestations Bella'Odyssée détaillées (client + fondatrice)
// prix:null + affichage "Sur devis" tant que le tarif n'est pas validé
const PRESTATIONS_BO_DETAIL = [
  {ico:"👁",nom:"Extensions de cils",desc:"Cils à cils, volume russe, méga volume, pose brésilienne, doll, cat/fox, remplissages.",duree:"1h30–2h30",prix:null,affichage:"Sur devis",
    formules:[{l:"Cils à cils",p:null},{l:"Volume russe",p:null},{l:"Méga volume",p:null},{l:"Pose brésilienne",p:null},{l:"Doll effect",p:null},{l:"Cat / Fox effect",p:null},{l:"Remplissages",p:null}]},
  {ico:"🦷",nom:"Blanchiment dentaire",desc:"Technique LED professionnelle. Résultat visible dès la première séance.",duree:"45min–1h30",prix:190,affichage:"À partir de 190€",
    formules:[{l:"Formule 1",p:190},{l:"Formule 2",p:260},{l:"Formule 3",p:330},{l:"Formule 4",p:450}]},
  {ico:"💎",nom:"Strass dentaires",desc:"Pose de bijoux dentaires sans dommage sur l'émail. Tendance et élégant.",duree:"30min",prix:40,affichage:"À partir de 40€",
    formules:[{l:"Strass simple",p:40},{l:"Strass travaillé / spécial",p:50},{l:"Pack Duo",p:70},{l:"Pack Trio",p:95},{l:"Pack Mix",p:110}]},
  {ico:"✨",nom:"Contour dentaire esthétique",desc:"Mise en valeur esthétique du contour dentaire.",duree:"sur rendez-vous",prix:170,affichage:"À partir de 170€",
    formules:[{l:"Formule 1",p:170},{l:"Formule 2",p:300}]},
  {ico:"🌿",nom:"Browlift",desc:"Restructuration et mise en forme des sourcils. Regard expressif et défini.",duree:"45min",prix:null,affichage:"Sur devis",formules:[]},
  {ico:"🌟",nom:"Lashlift / Rehaussement de cils",desc:"Rehaussement permanent des cils naturels. Effet mascara sans mascara.",duree:"1h",prix:null,affichage:"Sur devis",formules:[]},
  {ico:"🎨",nom:"Teinture sourcils",desc:"Teinture professionnelle des sourcils pour un regard défini.",duree:"20min",prix:null,affichage:"Sur devis",formules:[]},
  {ico:"🖌",nom:"Teinture cils",desc:"Teinture des cils pour intensifier le regard sans maquillage.",duree:"20min",prix:null,affichage:"Sur devis",formules:[]},
  {ico:"🧵",nom:"Épilation au fil",desc:"Épilation précise au fil, technique douce et nette.",duree:"15–30min",prix:null,affichage:"Sur devis",formules:[]},
];

// ═══════════════════════════════════════════════════════════
// GESTION DES MINEURS — règles centralisées, réutilisables
// Modifiables par la fondatrice (params) sans toucher au reste
// ═══════════════════════════════════════════════════════════
const AGE_MAJORITE = 18;

// Calcule l'âge à partir d'une date de naissance (ISO "AAAA-MM-JJ")
const calcAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const n = new Date(dateNaissance);
  if (isNaN(n.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - n.getFullYear();
  const m = now.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) age--;
  return age;
};
const estMineur = (dateNaissance) => {
  const a = calcAge(dateNaissance);
  return a !== null && a < AGE_MAJORITE;
};

// Règles d'accès par prestation Odyssée pour les mineurs
// acces: "ok" (libre) | "parental" (accord représentant légal) | "interdit" (majeurs only)
const REGLES_PRESTA_MINEUR = {
  "Extensions de cils":            "parental",
  "Browlift":                      "parental",
  "Lashlift / Rehaussement de cils":"parental",
  "Épilation au fil":              "parental",
  "Strass dentaires":              "parental",
  "Teinture sourcils":             "parental",
  "Teinture cils":                 "parental",
  "Blanchiment dentaire":          "interdit",
  "Contour dentaire esthétique":   "interdit",
};
// Renvoie la règle applicable à une prestation pour un client donné
// → {bloque:bool, parental:bool, message:string}
const regleAcces = (nomPresta, dateNaissance) => {
  if (!estMineur(dateNaissance)) return {bloque:false, parental:false, message:""};
  const r = REGLES_PRESTA_MINEUR[nomPresta] || "ok";
  if (r === "interdit") return {bloque:true, parental:false, message:"Cette prestation est réservée aux personnes majeures."};
  if (r === "parental") return {bloque:false, parental:true, message:"Accord du représentant légal obligatoire."};
  return {bloque:false, parental:false, message:""};
};

// ═══════════════════════════════════════════════════════════
// RBAC CENTRALISÉ — contrôle d'accès aux modules par rôle/âge
// Règle : un mineur n'accède QU'À Mo Ti-Péyi + Bella'Food.
// Tous les autres modules (présents ET futurs) sont verrouillés.
// Centralisé : un nouveau module hérite automatiquement des règles.
// ═══════════════════════════════════════════════════════════
const MODULES_MINEUR_OK = ["mtp", "bfd"];  // seuls modules autorisés aux mineurs
const MSG_MODULE_MINEUR = "Ce service est réservé aux utilisateurs majeurs ou nécessite un représentant légal.";

// Détermine si un module est accessible pour un utilisateur donné
// roles fondatrice/assistante → accès total ; mineur → liste blanche ; majeur → tout
const moduleAutorise = (moduleId, user) => {
  const role = user?.role;
  if (role === "fondatrice" || role === "assistante") return true;  // accès complet
  if (estMineur(user?.date_naissance)) return MODULES_MINEUR_OK.includes(moduleId);
  return true;  // majeur : accès normal
};

// ═══════════════════════════════════════════════════════════
// BELLA'EVENS — Catalogue client (structuré pour future liaison ERP)
// Chaque prestation porte les champs ERP : id, categorie, prix,
// acompte_pct, cout_revient, fournisseur, stock_lie — prêts pour
// catalogue/achats/stock/compta même si non encore exploités.
// ═══════════════════════════════════════════════════════════
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

// Prestations (prix validés ou null = "Sur devis")
const EVENTS_PRESTATIONS = [
  {id:"ev_kit_anniv", categorie:"papeterie", sous:"anniv", nom:"Kit anniversaire personnalisé", desc:"Papeterie complète (invitations, étiquettes, déco de table).", prix:22, unite:"kit", min_qte:10, acompte_pct:30, sur_devis:false, cout_revient:null, fournisseur:null, stock_lie:null, note:"Minimum 10 kits."},
  {id:"ev_gateau",    categorie:"gateaux",   sous:"gateaux", nom:"Gâteau personnalisé", desc:"Création sucrée sur mesure, pâte à sucre possible.", prix:45, unite:"pièce", min_qte:1, acompte_pct:50, sur_devis:false, prix_des:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"À partir de 45€ · acompte 50% · délai 1 mois si pâte à sucre."},
  {id:"ev_deco_std",  categorie:"deco",      sous:"deco", nom:"Décoration complète", desc:"Mise en scène complète de votre événement.", prix:80, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, prix_des:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"À partir de 80€."},
  {id:"ev_deco_prem", categorie:"deco",      sous:"deco", nom:"Décoration premium", desc:"Décoration haut de gamme selon l'ampleur du projet.", prix:200, unite:"prestation", min_qte:1, acompte_pct:30, sur_devis:false, prix_jusqua:true, cout_revient:null, fournisseur:null, stock_lie:null, note:"Jusqu'à 200€ selon le projet."},
  // Sur devis (prix non validés)
  {id:"ev_baby",      categorie:"baby",      sous:"baby", nom:"Pack Baby Shower", desc:"Décoration et papeterie pour baby shower.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_bapteme",   categorie:"bapteme",   sous:"bapteme", nom:"Pack Baptême", desc:"Décoration et papeterie pour baptême.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_commu",     categorie:"commu",     sous:"commu", nom:"Pack Communion", desc:"Prestations pour communion.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_gender",    categorie:"gender",    sous:"gender", nom:"Pack Gender Reveal", desc:"Mise en scène révélation de genre.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_mariage",   categorie:"mariage",   sous:"mariage", nom:"Prestations Mariage", desc:"Décoration, papeterie et coordination mariage.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_location",  categorie:"location",  sous:"location", nom:"Location de matériel", desc:"Arches, mobilier, accessoires événementiels.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_ballons",   categorie:"ballons",   sous:"ballons", nom:"Arche de ballons", desc:"Compositions et arches de ballons sur mesure.", prix:null, acompte_pct:30, sur_devis:true},
  {id:"ev_cadeaux",   categorie:"cadeaux",   sous:"cadeaux", nom:"Cadeaux invités", desc:"Petites attentions personnalisées.", prix:null, acompte_pct:30, sur_devis:true},

  // ── ARTICLES À L'UNITÉ (commandables seuls) ──
  // Gourmandises personnalisées
  {id:"u_chips",     categorie:"unite", sous:"gourmandises", type:"unite", nom:"Chips personnalisés", desc:"Sachet de chips personnalisé.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_popcorn",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Popcorn personnalisé", desc:"Popcorn en contenant personnalisé.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_bonbons",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini bonbons", desc:"Sachets de mini bonbons personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_haribo",    categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini Haribo", desc:"Mini sachets Haribo personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_nutella",   categorie:"unite", sous:"gourmandises", type:"unite", nom:"Mini Nutella", desc:"Mini pots Nutella personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_kinder",    categorie:"unite", sous:"gourmandises", type:"unite", nom:"Kinder Bueno", desc:"Kinder Bueno personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_choco",     categorie:"unite", sous:"gourmandises", type:"unite", nom:"Chocolats", desc:"Chocolats personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_pringles",  categorie:"unite", sous:"gourmandises", type:"unite", nom:"Pringles", desc:"Pringles personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  // Boissons personnalisées
  {id:"u_eau",       categorie:"unite", sous:"boissons", type:"unite", nom:"Bouteille d'eau personnalisée", desc:"Étiquette personnalisée sur bouteille d'eau.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_caprisun",  categorie:"unite", sous:"boissons", type:"unite", nom:"Capri-Sun personnalisé", desc:"Capri-Sun avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_fruitshoot",categorie:"unite", sous:"boissons", type:"unite", nom:"Fruit Shoot personnalisé", desc:"Fruit Shoot personnalisé.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_champomy",  categorie:"unite", sous:"boissons", type:"unite", nom:"Champomy personnalisé", desc:"Champomy avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_jus",       categorie:"unite", sous:"boissons", type:"unite", nom:"Jus personnalisé", desc:"Jus avec étiquette personnalisée.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_minibouteille",categorie:"unite", sous:"boissons", type:"unite", nom:"Mini bouteilles", desc:"Mini bouteilles personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  // Contenants
  {id:"u_boitepop",  categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes popcorn", desc:"Boîtes à popcorn personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_boitecad",  categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes cadeaux", desc:"Boîtes cadeaux personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_gablebox",  categorie:"unite", sous:"contenants", type:"unite", nom:"Gable box", desc:"Boîtes gable box personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_sacs",      categorie:"unite", sous:"contenants", type:"unite", nom:"Sacs cadeaux", desc:"Sacs cadeaux personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_pyramides", categorie:"unite", sous:"contenants", type:"unite", nom:"Boîtes pyramides", desc:"Boîtes pyramides personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_sachets",   categorie:"unite", sous:"contenants", type:"unite", nom:"Sachets personnalisés", desc:"Sachets personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  // Goodies
  {id:"u_bulles",    categorie:"unite", sous:"goodies", type:"unite", nom:"Bulles de savon", desc:"Tubes à bulles personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_crayons",   categorie:"unite", sous:"goodies", type:"unite", nom:"Crayons", desc:"Crayons personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_coloriages",categorie:"unite", sous:"goodies", type:"unite", nom:"Coloriages", desc:"Livrets de coloriage personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_jeux",      categorie:"unite", sous:"goodies", type:"unite", nom:"Petits jeux", desc:"Petits jeux pour invités.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_cadeauxinv",categorie:"unite", sous:"goodies", type:"unite", nom:"Cadeaux invités", desc:"Cadeaux pour les invités.", prix:null, sur_devis:true, acompte_pct:30},
  // Papeterie simple
  {id:"u_stickers",  categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Stickers", desc:"Stickers personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_etiquettes",categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Étiquettes", desc:"Étiquettes personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"u_toppers",   categorie:"unite", sous:"papeterie_s", type:"unite", nom:"Toppers", desc:"Toppers personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  // Options décoratives
  {id:"u_minidecor", categorie:"unite", sous:"options_deco", type:"option", nom:"Mini décor", desc:"Petits éléments décoratifs.", prix:null, sur_devis:true, acompte_pct:30},

  // ── DÉTAIL DES CATÉGORIES (prestations spécifiques) ──
  // Anniversaires (détail)
  {id:"an_kit",      categorie:"anniv", sous:"anniv", type:"pack", nom:"Kit invité personnalisé", desc:"Kit complet pour chaque invité.", prix:22, unite:"kit", min_qte:10, acompte_pct:30, sur_devis:false, note:"Minimum 10 kits."},
  {id:"an_formule",  categorie:"anniv", sous:"anniv", type:"prestation", nom:"Formule complète anniversaire", desc:"Organisation complète sur devis.", prix:null, sur_devis:true, acompte_pct:30},
  // Papeterie (détail)
  {id:"pa_invit_num",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitations numériques", desc:"Invitations au format numérique.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_invit_imp",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Invitations imprimées", desc:"Invitations imprimées personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_remerc",   categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Cartes de remerciement", desc:"Cartes de remerciement personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_menus",    categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Menus buffet", desc:"Menus de buffet personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_affiches", categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Affiches", desc:"Affiches personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_fanions",  categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Fanions", desc:"Guirlandes de fanions personnalisées.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"pa_marqueplace",categorie:"papeterie", sous:"papeterie", type:"prestation", nom:"Marque-place", desc:"Marque-places personnalisés.", prix:null, sur_devis:true, acompte_pct:30},
  // Décoration (détail)
  {id:"de_minidecor",categorie:"deco", sous:"deco", type:"prestation", nom:"Mini décor", desc:"Décoration légère.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"de_table",    categorie:"deco", sous:"deco", type:"prestation", nom:"Décoration de table", desc:"Mise en scène de table.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"de_backdrop", categorie:"deco", sous:"deco", type:"prestation", nom:"Backdrop", desc:"Toile de fond décorative.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"de_sweettable",categorie:"deco", sous:"deco", type:"prestation", nom:"Sweet table", desc:"Table sucrée décorée.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"de_sceno",    categorie:"deco", sous:"deco", type:"prestation", nom:"Scénographie complète", desc:"Mise en scène complète de l'événement.", prix:null, sur_devis:true, acompte_pct:30},
  // Gâteaux (détail)
  {id:"ga_classique",categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Gâteau classique", desc:"Gâteau personnalisé classique.", prix:45, prix_des:true, sur_devis:false, acompte_pct:50, note:"À partir de 45€ · acompte 50%."},
  {id:"ga_cakedesign",categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Cake design thème", desc:"Gâteau cake design sur thème.", prix:null, sur_devis:true, acompte_pct:50},
  {id:"ga_sculpte",  categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Gâteau sculpté", desc:"Gâteau sculpté sur mesure.", prix:null, sur_devis:true, acompte_pct:50},
  {id:"ga_cupcakes", categorie:"gateaux", sous:"gateaux", type:"prestation", nom:"Cupcakes", desc:"Cupcakes personnalisés.", prix:null, sur_devis:true, acompte_pct:50},
  {id:"ga_toppers",  categorie:"gateaux", sous:"gateaux", type:"option", nom:"Toppers gâteau", desc:"Toppers décoratifs pour gâteau.", prix:null, sur_devis:true, acompte_pct:30},
  // Location (détail)
  {id:"lo_supports", categorie:"location", sous:"location", type:"prestation", nom:"Supports", desc:"Location de supports.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"lo_presentoirs",categorie:"location", sous:"location", type:"prestation", nom:"Présentoirs", desc:"Location de présentoirs.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"lo_arches",   categorie:"location", sous:"location", type:"prestation", nom:"Arches", desc:"Location d'arches.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"lo_table",    categorie:"location", sous:"location", type:"prestation", nom:"Matériel de table", desc:"Location de matériel de table.", prix:null, sur_devis:true, acompte_pct:30},
  {id:"lo_deco",     categorie:"location", sous:"location", type:"prestation", nom:"Éléments décoratifs", desc:"Location d'éléments décoratifs.", prix:null, sur_devis:true, acompte_pct:30},
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
];
const CMDS_BSH_INIT = [
  {id:"BSH-001",client:"Marie S.",produit:"Coffret Nuit de Velours",montant:79,acompte:0,statut:"Terminée",date:"2026-06-01",pmt:"Stripe"},
  {id:"BSH-002",client:"Kathy R.",produit:"Ensemble Dentelle Noir",montant:39,acompte:0,statut:"Paiement complet reçu",date:"2026-06-02",pmt:"PayPal"},
  {id:"BSH-003",client:"Aline B.",produit:"Coffret Secret Couple",montant:89,acompte:45,statut:"Acompte reçu",date:"2026-06-03",pmt:"SumUp",notes:"Solde à régler"},
];
const FAQ_BSH = [
  ["Comment commander ?","Via WhatsApp ("+ENV.TEL+"), le site ou lors d'un événement."],
  ["Les colis sont-ils discrets ?","Oui. Emballage neutre sans mention du contenu."],
  ["Livrez-vous en Guyane ?","Oui — et aux Antilles et en France métropolitaine."],
  ["Modes de paiement ?","CB, Espèces, PayPal, Revolut, SumUp, Stripe."],
  ["Puis-je venir seule à un événement ?","Oui, absolument. La plupart viennent seules."],
  ["Comment devenir VIP ?","Par fidélité, participation aux événements ou recommandation."],
];
const VIP_LEVELS = [
  {level:"Bronze",prix:"Gratuit",color:"#8B6030",avs:["Accès nouveautés en avant-première","Informations privées","Précommandes"]},
  {level:"Argent",prix:"5€/mois",color:"#8a9ab0",avs:["+ Remises exclusives","Invitations early access","Accès événements prioritaires"]},
  {level:"Or",prix:"15€/mois",color:BSH.or,avs:["+ Ventes privées","Coffrets surprise","Priorité absolue événements","Tarifs négociés"]},
  {level:"Diamant",prix:"29€/mois",color:"#90d0f0",avs:["+ VIP Night exclusif","Cadeaux premium","Collections limitées en avant-première","Suivi personnel fondatrice"]},
];

// ═══════════════════════════════════════════════════════════
// STORAGE HOOK — localStorage (compatible Next.js/Vercel)
// ═══════════════════════════════════════════════════════════
function useStore(key, init) {
  const [data, setData] = useState(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, [key]);
  const save = useCallback(async val => {
    const next = typeof val === "function" ? val(data) : val;
    setData(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {}
    return next;
  }, [key, data]);
  return [data, save, ready];
}

// ═══════════════════════════════════════════════════════════
// ATOMS BELLAÏA
// ═══════════════════════════════════════════════════════════
const Bdg = ({s}) => { const c = sCo(s); return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:99,background:c.bg,color:c.t,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{s}</span>; };
const PBar = ({v, col}) => <div style={{height:5,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(v||0,100)}%`,background:`linear-gradient(90deg,${col||B.violet},${B.violetL})`,borderRadius:99,transition:"width 0.5s"}}/></div>;
const SH = ({t, s}) => <div style={{marginBottom:16}}><h2 style={{margin:0,fontSize:20,fontWeight:800,color:B.cream,fontFamily:FS,letterSpacing:"-0.02em"}}>{t}</h2>{s&&<p style={{margin:"3px 0 0",fontSize:12,color:B.muted}}>{s}</p>}</div>;

const Btn = ({onClick, children, v="primary", sm, full, disabled}) => {
  const st = {
    primary:{background:`linear-gradient(135deg,${B.violet},#5b21b6)`,color:"#fff",border:"none"},
    gold:{background:`linear-gradient(135deg,${B.gold},#a07030)`,color:B.night,border:"none"},
    ghost:{background:"transparent",color:B.mutedL,border:"1px solid "+(B.border)},
    danger:{background:"rgba(180,80,80,0.2)",color:B.danger,border:"1px solid rgba(180,80,80,0.3)"},
    success:{background:"rgba(80,180,120,0.15)",color:B.success,border:"1px solid rgba(80,180,120,0.3)"},
  };
  return <button onClick={onClick} disabled={disabled} style={{...st[v],padding:sm?"6px 12px":"10px 18px",borderRadius:10,fontWeight:700,fontSize:sm?11:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,width:full?"100%":"auto",fontFamily:SA,transition:"opacity 0.2s"}}>{children}</button>;
};
const Inp = ({value, onChange, placeholder, type="text", rows}) => {
  const s = {width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"};
  return rows ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{...s,resize:"vertical"}}/> : <input value={value} onChange={onChange} placeholder={placeholder} type={type} style={s}/>;
};
const Sel = ({value, onChange, options}) => <select value={value} onChange={onChange} style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
const Fld = ({label, children}) => <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>{label}</label>{children}</div>;

function Mdl({title, onClose, children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:B.deep,borderRadius:"20px 20px 0 0",border:"1px solid "+(B.border),padding:"20px 16px 32px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:B.cream,fontFamily:FS}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:B.muted,fontSize:20,cursor:"pointer",padding:"0 4px"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ATOMS BSH
// ═══════════════════════════════════════════════════════════
const BTag = ({c=BSH.bord, children, sz=9}) => <span style={{background:`${c}22`,border:"1px solid "+(c)+("55"),color:c,borderRadius:3,padding:"2px 7px",fontSize:sz,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
const BBtn = ({children, v="ghost", sz="md", onClick, full=false, disabled=false}) => {
  const base = {cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontFamily:SA,fontWeight:600,transition:"all .2s",border:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4,opacity:disabled?0.5:1};
  const sizes = {sm:{padding:"6px 12px",fontSize:11},md:{padding:"10px 20px",fontSize:13},lg:{padding:"14px 28px",fontSize:15}};
  const vs = {gold:{background:`linear-gradient(135deg,${BSH.or},#a87a3e)`,color:BSH.fond},bord:{background:`linear-gradient(135deg,${BSH.bord},${BSH.bord2})`,color:BSH.creme},ghost:{background:"none",border:"1px solid "+(BSH.line),color:BSH.cremeF},danger:{background:`${BSH.rouge}22`,border:"1px solid "+(BSH.rouge)+("44"),color:BSH.rouge}};
  return <button onClick={onClick} disabled={disabled} style={{...base,...sizes[sz],...vs[v],width:full?"100%":"auto"}}>{children}</button>;
};
const BCard = ({children, accent=false, style:s={}}) => <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:14,padding:"14px 16px",borderTop:accent ? "3px solid "+(BSH.bord) : "1px solid "+(BSH.line),...s}}>{children}</div>;

// ═══════════════════════════════════════════════════════════
// ATOMS BO
// ═══════════════════════════════════════════════════════════
const OCard = ({children, accent=false, style:s={}}) => <div style={{background:BO.verre,border:"1px solid "+(BO.line),borderRadius:14,padding:"14px 16px",borderTop:accent ? "3px solid "+(BO.acc) : "1px solid "+(BO.line),...s}}>{children}</div>;
const OBtn = ({children, v="ghost", sz="md", onClick, full=false}) => {
  const base = {cursor:"pointer",borderRadius:8,fontFamily:SA,fontWeight:600,border:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4};
  const sizes = {sm:{padding:"6px 12px",fontSize:11},md:{padding:"10px 20px",fontSize:13}};
  const vs = {primary:{background:`linear-gradient(135deg,${BO.acc},${BO.acc2})`,color:"#fff"},gold:{background:`linear-gradient(135deg,${BO.or},#a87a3e)`,color:BO.fond||"#000"},ghost:{background:"none",border:"1px solid "+(BO.line),color:BO.cremeD}};
  return <button onClick={onClick} style={{...base,...sizes[sz],...vs[v],width:full?"100%":"auto"}}>{children}</button>;
};
const OTag = ({c=BO.acc, children, sz=9}) => <span style={{background:`${c}22`,border:"1px solid "+(c)+("55"),color:c,borderRadius:3,padding:"2px 7px",fontSize:sz,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;


// ═══════════════════════════════════════════════════════════
// ── HUB CLIENT
// ═══════════════════════════════════════════════════════════
const UNIVERS = [
  {id:"bsh",  nom:"Bella'Secret Home",   tag:"Lingerie & Désir",      ico:"✦",  bg:"#2a0d1e", acc:BSH.bord,  acc2:"#8B2A3B", or:BSH.or,  badge:"+18", gate:true},
  {id:"bo",   nom:"Bella'Odyssée",       tag:"Beauté & Soins",         ico:"💅", bg:"#0b0d1a", acc:BO.acc,    acc2:BO.acc2,   or:BO.or,   badge:"RDV"},
  {id:"bev",  nom:"Bella'Events",        tag:"Événements & Soirées",   ico:"✨", bg:"#0d1a14", acc:"#065f46", acc2:"#059669", or:"#c9a84c",badge:"Events"},
  {id:"bfd",  nom:"Bella'Food",          tag:"Traiteur & Menus",       ico:"🍃", bg:"#0f1a0d", acc:"#15803d", acc2:"#16a34a", or:"#c9a84c",badge:"Food"},
  {id:"vilo", nom:"Vilo'Assistance",     tag:"Assistance Administrative",ico:"📋",bg:"#0d1520", acc:"#1d4ed8", acc2:"#2563eb", or:"#c9a84c",badge:"Admin"},
  {id:"bse",  nom:"Bella'Studio Éditions",tag:"Ebooks & Formations",  ico:"📚", bg:"#12100d", acc:"#92400e", acc2:"#b45309", or:"#c9a84c",badge:"Digital"},
  {id:"mtp",  nom:"Mo Ti-Péyi",          tag:"Livres jeunesse Guyane", ico:"🌺", bg:"#1a0d18", acc:"#7e22ce", acc2:"#9333ea", or:"#c9a84c",badge:"Pédago"},
];


function FAQItem({q, r}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{width:"100%",background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:open?"10px 10px 0 0":10,padding:"11px 14px",color:BSH.creme,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontFamily:SA}}>
        <span style={{lineHeight:1.4,flex:1,paddingRight:8}}>{q}</span>
        <span style={{color:BSH.or,flexShrink:0}}>{open?"▲":"▼"}</span>
      </button>
      {open && <div style={{background:`${BSH.bord}0e`,border:"1px solid "+(BSH.bord)+("30"),borderTop:"none",borderRadius:"0 0 10px 10px",padding:"11px 14px",fontSize:12,color:BSH.cremeF,lineHeight:1.75}}>{r}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── ESPACE CLIENT BSH
// ═══════════════════════════════════════════════════════════
function ClientBSH({produits, evenements, onBack, onNewCommande}) {
  const [gate, setGate] = useState(false);
  const [page, setPage] = useState("accueil");
  const [cart, setCart] = useState([]);
  const [fav, setFav] = useState([]);
  const [modal, setModal] = useState(null);
  const [pmtChoisi, setPmtChoisi] = useState("SumUp");
  const [nomClient, setNomClient] = useState("");
  const cartN = cart.reduce((s,i) => s+i.qty, 0);
  const cartT = cart.reduce((s,i) => s+(i.promo||i.prix)*i.qty, 0);
  const addCart = p => setCart(c => { const e=c.find(x=>x.id===p.id); return e?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]; });
  const togFav = id => setFav(f => f.includes(id)?f.filter(x=>x!==id):[...f,id]);

  const genId = () => "BSH-" + Date.now().toString().slice(-6);

  const [sumupLoading, setSumupLoading] = useState(false);
  const [sumupErreur, setSumupErreur] = useState(null);
  const [cmdConfirmee, setCmdConfirmee] = useState(null);

  const confirmerCommande = async () => {
    // ── Uniquement les articles sélectionnés
    const selectionnes = cart.filter(i => i.selected !== false);
    if (selectionnes.length === 0) return;

    const id = genId();
    const produitStr = selectionnes.map(i=>`${i.name} ×${i.qty}`).join(", ");
    const totalSel   = selectionnes.reduce((s,i) => s+(i.promo||i.prix)*i.qty, 0);

    const cmd = {
      id,
      client:  nomClient || "Client web",
      produit: produitStr,
      montant: totalSel,
      acompte: 0,
      statut:  "Demande reçue",
      date:    today(),
      pmt:     pmtChoisi,
      notes:   `Commande web — ${new Date().toLocaleString("fr-FR")}`,
    };
    if (onNewCommande) await onNewCommande(cmd);

    // ── SumUp : paiement direct
    if (pmtChoisi === "SumUp") {
      setSumupLoading(true);
      setSumupErreur(null);
      try {
        const r = await fetch("/api/payments/sumup/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            montant:     totalSel,
            description: `Commande BSH ${id} — ${produitStr}`,
            univers:     "BSH",
            items:       selectionnes.map(i=>({nom:i.name,qty:i.qty,prix:(i.promo||i.prix)})),
          }),
        });
        const d = await r.json();
        if (d.url) {
          // Conserver les articles non sélectionnés dans le panier
          setCart(c => c.filter(i => i.selected === false));
          setNomClient(""); setModal(null);
          window.location.href = d.url;
        } else {
          setSumupErreur(d.error || "Erreur SumUp — réessayez ou choisissez un autre mode.");
          setSumupLoading(false);
        }
      } catch {
        setSumupErreur("Impossible de contacter SumUp. Vérifiez votre connexion.");
        setSumupLoading(false);
      }
      return;
    }

    // ── PayPal : afficher les instructions de paiement (PAS de WhatsApp auto)
    // Conserver les articles non sélectionnés
    setCart(c => c.filter(i => i.selected === false));
    setNomClient("");
    setCmdConfirmee({ id, produitStr, totalSel, pmt: pmtChoisi });
    setModal("confirmation");
  }

  // Gate +18
  if (!gate) return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${BSH.prune},${BSH.fond})`,alignItems:"center",justifyContent:"center",fontFamily:SA,padding:"20px"}}>
      <div style={{textAlign:"center",maxWidth:320,width:"100%"}}>
        <div style={{fontFamily:FS,fontSize:26,color:BSH.or,letterSpacing:3,marginBottom:4}}>✦ Bella'Secret Home</div>
        <div style={{fontSize:9,color:BSH.cremeD,letterSpacing:4,marginBottom:32}}>L'INTIMITÉ ÉLEVÉE AU RANG D'ART</div>
        <div style={{background:BSH.verre2,border:"1px solid "+(BSH.line),borderRadius:18,padding:"28px 22px"}}>
          <div style={{fontSize:40,marginBottom:12}}>🔞</div>
          <div style={{fontFamily:FS,fontSize:16,color:BSH.creme,marginBottom:8}}>Accès réservé aux adultes</div>
          <div style={{fontSize:12,color:BSH.cremeD,marginBottom:24,lineHeight:1.7}}>Ce site contient du contenu réservé aux personnes majeures. En entrant, vous certifiez avoir 18 ans ou plus.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <BBtn v="gold" sz="md" full onClick={() => setGate(true)}>✓ J'ai 18 ans ou plus — Entrer</BBtn>
            <BBtn v="ghost" sz="sm" full onClick={onBack}>✕ Retour au portail</BBtn>
          </div>
        </div>
      </div>
    </div>
  );

  const PAGES = [{id:"accueil",l:"🏠"},{id:"boutique",l:"🛍"},{id:"evenements",l:"✨"},{id:"vip",l:"💎"},{id:"faq",l:"❓"}];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 10% 0%,${BSH.prune},${BSH.fond} 60%)`,fontFamily:SA}}>
      {/* Header BSH */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+(BSH.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:BSH.or,letterSpacing:2}}>✦ Bella'Secret Home</div>
          <div style={{fontSize:8,color:BSH.cremeD,letterSpacing:3}}>INTIMITÉ · ÉLÉGANCE · DÉSIR</div>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {cartN > 0 && <button onClick={() => setModal("cart")} style={{background:`${BSH.bord}33`,border:"1px solid "+(BSH.bord),borderRadius:8,padding:"5px 10px",color:BSH.creme,cursor:"pointer",fontSize:11,fontFamily:SA}}>🛍 {cartN} · {cartT}€</button>}
          <button onClick={onBack} style={{background:"none",border:"1px solid "+(BSH.line),borderRadius:8,padding:"5px 9px",color:BSH.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Portail</button>
        </div>
      </div>

      {/* Nav BSH */}
      <div style={{display:"flex",justifyContent:"space-around",padding:"8px 12px",borderBottom:"1px solid "+(BSH.line),background:"rgba(0,0,0,0.2)",flexShrink:0}}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderBottom:page===p.id ? "2px solid "+(BSH.or) : "2px solid transparent"}}>
            <span style={{fontSize:18}}>{p.l}</span>
            <span style={{fontSize:8,color:page===p.id?BSH.or:BSH.cremeD,fontWeight:700,textTransform:"capitalize"}}>{p.id}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{flex:1,overflowY:"auto",padding:"14px",color:BSH.creme}}>

        {/* ── ACCUEIL ── */}
        {page === "accueil" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{textAlign:"center",padding:"16px 0 8px"}}>
              <div style={{fontFamily:FS,fontSize:24,color:BSH.or,letterSpacing:2,marginBottom:6}}>Bienvenue ✦</div>
              <div style={{fontSize:13,color:BSH.cremeD,lineHeight:1.8}}>L'intimité élevée au rang d'art.<br/>Lingerie premium · Coffrets sensuels · Soirées privées</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {produits.slice(0,4).map(p => (
                <BCard key={p.id} accent style={{padding:"12px",cursor:"pointer"}} onClick={() => setPage("boutique")}>
                  <div style={{fontSize:30,textAlign:"center",padding:"8px 0",background:`${BSH.bord}18`,borderRadius:9,marginBottom:7}}>{p.ico||"🌹"}</div>
                  <div style={{fontFamily:FS,fontSize:11,fontWeight:600,color:BSH.creme,marginBottom:3,lineHeight:1.3}}>{p.name}</div>
                  <div style={{fontSize:14,fontWeight:700,color:BSH.or,fontFamily:FS}}>{p.promo||p.prix}€</div>
                </BCard>
              ))}
            </div>
            <BCard accent style={{textAlign:"center",padding:"18px 16px"}}>
              <div style={{fontFamily:FS,fontSize:16,color:BSH.or,marginBottom:6}}>Commander facilement ✦</div>
              <div style={{fontSize:12,color:BSH.cremeD,marginBottom:14,lineHeight:1.7}}>Boutique en ligne · Livraison Guyane & DOM-TOM<br/>Emballage discret garanti</div>
              <BBtn v="bord" sz="md" full onClick={() => window.open(WA(),"_blank")}>💬 Commander via WhatsApp</BBtn>
            </BCard>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {[{ico:"✨",t:"Événements",sub:evenements.length+" à venir",p:"evenements"},{ico:"💎",t:"Club VIP",sub:"4 niveaux exclusifs",p:"vip"}].map(c => (
                <BCard key={c.t} style={{textAlign:"center",padding:"14px 10px",cursor:"pointer"}} onClick={() => setPage(c.p)}>
                  <div style={{fontSize:24,marginBottom:5}}>{c.ico}</div>
                  <div style={{fontFamily:FS,fontSize:12,fontWeight:700,color:BSH.creme}}>{c.t}</div>
                  <div style={{fontSize:10,color:BSH.cremeD,marginTop:2}}>{c.sub}</div>
                </BCard>
              ))}
            </div>
          </div>
        )}

        {/* ── BOUTIQUE ── */}
        {page === "boutique" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BSH.or,margin:0}}>Boutique</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {produits.map(p => (
                <BCard key={p.id} accent style={{padding:"11px",cursor:"pointer"}} onClick={() => setModal({type:"prod",p})}>
                  <div style={{position:"relative"}}>
                    <div style={{fontSize:30,textAlign:"center",padding:"7px 0",background:`${BSH.bord}18`,borderRadius:8,marginBottom:6}}>{p.ico||"🌹"}</div>
                    <button onClick={e=>{e.stopPropagation();togFav(p.id);}} style={{position:"absolute",top:2,right:2,background:"none",border:"none",cursor:"pointer",fontSize:13}}>{fav.includes(p.id)?"❤️":"🤍"}</button>
                  </div>
                  {p.isNew && <BTag c={BSH.vert} sz={8}>Nouveau</BTag>}
                  <div style={{fontFamily:FS,fontSize:11,fontWeight:600,color:BSH.creme,margin:"4px 0 3px",lineHeight:1.3}}>{p.name}</div>
                  <div style={{marginBottom:7}}>
                    {p.promo ? <><span style={{fontSize:14,fontWeight:700,color:BSH.or,fontFamily:FS}}>{p.promo}€</span><span style={{fontSize:10,color:BSH.cremeD,textDecoration:"line-through",marginLeft:4}}>{p.prix}€</span></> : <span style={{fontSize:14,fontWeight:700,color:BSH.or,fontFamily:FS}}>{p.prix}€</span>}
                  </div>
                  <BBtn v="bord" sz="sm" full onClick={e=>{e.stopPropagation();addCart(p);}}>+ Panier</BBtn>
                </BCard>
              ))}
            </div>
          </div>
        )}

        {/* ── ÉVÉNEMENTS ── */}
        {page === "evenements" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BSH.or,margin:0}}>Événements</h2>
            {evenements.map(e => {
              const pct = Math.round(((e.cap-e.dispo)/e.cap)*100)||0;
              return (
                <BCard key={e.id} accent style={{cursor:"pointer"}} onClick={() => setModal({type:"evt",e})}>
                  <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{fontSize:26,flexShrink:0,marginTop:2}}>{e.ico||"✨"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:FS,fontSize:14,fontWeight:700,color:BSH.creme,marginBottom:3}}>{e.nom}</div>
                      <div style={{fontSize:11,color:BSH.cremeD,marginBottom:8,lineHeight:1.5}}>{e.desc}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>
                        <BTag c={BSH.or} sz={9}>📅 {fmt(e.date)}</BTag>
                        <BTag c={BSH.bord} sz={9}>📍 {e.lieu}</BTag>
                        <BTag c={BSH.rose} sz={9}>🎟 {e.prix}€</BTag>
                      </div>
                      <div style={{background:"rgba(255,255,255,.05)",borderRadius:3,height:4,marginBottom:4}}><div style={{background:`linear-gradient(90deg,${BSH.bord},${BSH.rose})`,height:"100%",borderRadius:3,width:`${pct}%`}}/></div>
                      <div style={{fontSize:10,color:BSH.cremeD}}>{e.dispo} place{e.dispo!==1?"s":""} restante{e.dispo!==1?"s":""}</div>
                    </div>
                  </div>
                </BCard>
              );
            })}
          </div>
        )}

        {/* ── CLUB VIP ── */}
        {page === "vip" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BSH.or,margin:0,textAlign:"center"}}>Club VIP ✦</h2>
            <p style={{color:BSH.cremeD,textAlign:"center",fontSize:12,margin:0,lineHeight:1.7}}>Un cercle exclusif d'expériences et de privilèges.</p>
            {VIP_LEVELS.map(v => (
              <BCard key={v.level} style={{borderTop:`4px solid ${v.color}`,padding:"16px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontFamily:FS,fontSize:16,fontWeight:700,color:v.color}}>{v.level}</div>
                  <div style={{fontSize:14,color:BSH.or,fontWeight:700}}>{v.prix}</div>
                </div>
                {v.avs.map(a => <div key={a} style={{fontSize:11,color:BSH.cremeD,marginBottom:5,display:"flex",gap:7}}><span style={{color:v.color,flexShrink:0}}>✓</span>{a}</div>)}
                <div style={{marginTop:12}}>
                  <BBtn v="bord" sz="sm" full onClick={() => window.open(WA("Bonjour, je souhaite rejoindre le Club VIP "+(v.level)+" Bella'Secret Home"),"_blank")}>Rejoindre le Club {v.level} →</BBtn>
                </div>
              </BCard>
            ))}
          </div>
        )}

        {/* ── FAQ ── */}
        {page === "faq" && (
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BSH.or,margin:0}}>Questions fréquentes</h2>
            {FAQ_BSH.map(([q,r]) => <FAQItem key={q} q={q} r={r}/>)}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal === "cart" && (
        <Mdl title="Ma commande 🛍️" onClose={() => setModal(null)}>
          {cart.length === 0
            ? <p style={{color:B.muted,textAlign:"center",padding:"16px"}}>Votre panier est vide.</p>
            : <>
              {/* ── Légende */}
              <div style={{fontSize:10,color:B.muted,marginBottom:8,lineHeight:1.6}}>
                Cochez les articles à payer. Les autres restent dans le panier.
              </div>

              {/* ── Liste articles avec sélection + quantités */}
              {cart.map(i => {
                const prixU = i.promo || i.prix;
                const selected = i.selected !== false; // true par défaut
                return (
                  <div key={i.id} style={{display:"flex",gap:8,alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+(BSH.line)}}>
                    {/* Checkbox sélection */}
                    <input type="checkbox" checked={selected}
                      onChange={() => setCart(c => c.map(x => x.id===i.id ? {...x, selected:!selected} : x))}
                      style={{width:18,height:18,accentColor:BSH.or,flexShrink:0,cursor:"pointer"}}/>
                    {/* Icône + nom */}
                    <span style={{fontSize:20,flexShrink:0}}>{i.ico}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:selected?BSH.creme:B.muted,lineHeight:1.3}}>{i.name}</div>
                      <div style={{fontSize:11,color:B.gold}}>{prixU}€/u</div>
                    </div>
                    {/* Contrôles quantité */}
                    <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                      <button
                        onClick={() => {
                          if (i.qty <= 1) {
                            if (window.confirm("Supprimer \""+(i.name)+"\" du panier ?")) {
                              setCart(c => c.filter(x => x.id !== i.id));
                            }
                          } else {
                            setCart(c => c.map(x => x.id===i.id ? {...x, qty:x.qty-1} : x));
                          }
                        }}
                        style={{width:28,height:28,borderRadius:8,border:"1px solid "+(BSH.line),background:"rgba(255,255,255,0.07)",color:BSH.creme,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SA}}>
                        −
                      </button>
                      <span style={{minWidth:20,textAlign:"center",fontSize:13,fontWeight:700,color:selected?BSH.creme:B.muted}}>{i.qty}</span>
                      <button
                        onClick={() => setCart(c => c.map(x => x.id===i.id ? {...x, qty:x.qty+1} : x))}
                        style={{width:28,height:28,borderRadius:8,border:"1px solid "+(BSH.line),background:"rgba(255,255,255,0.07)",color:BSH.creme,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SA}}>
                        +
                      </button>
                    </div>
                    {/* Sous-total article */}
                    <div style={{textAlign:"right",flexShrink:0,minWidth:48}}>
                      <div style={{fontSize:13,fontWeight:700,color:selected?B.gold:B.muted}}>{prixU*i.qty}€</div>
                      <button onClick={() => setCart(c => c.filter(x => x.id !== i.id))}
                        style={{background:"none",border:"none",cursor:"pointer",color:B.muted,fontSize:11,marginTop:2,fontFamily:SA,padding:0}}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* ── Total sélectionnés */}
              <div style={{margin:"14px 0 6px",padding:"10px 12px",background:`${BSH.bord}15`,border:"1px solid "+(BSH.line),borderRadius:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:B.muted}}>
                    Total sélectionné ({cart.filter(i=>i.selected!==false).length} article{cart.filter(i=>i.selected!==false).length!==1?"s":""})
                  </span>
                  <span style={{fontSize:22,fontWeight:700,color:B.gold,fontFamily:FS}}>
                    {cart.filter(i=>i.selected!==false).reduce((s,i)=>(s+(i.promo||i.prix)*i.qty),0)}€
                  </span>
                </div>
                {cart.some(i=>i.selected===false) && (
                  <div style={{fontSize:10,color:B.muted,marginTop:4}}>
                    {cart.filter(i=>i.selected===false).length} article{cart.filter(i=>i.selected===false).length!==1?"s":""} non sélectionné{cart.filter(i=>i.selected===false).length!==1?"s":""} conservé{cart.filter(i=>i.selected===false).length!==1?"s":""} dans le panier.
                  </div>
                )}
              </div>

              {/* ── Nom client */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Votre prénom (facultatif)</label>
                <input value={nomClient} onChange={e=>setNomClient(e.target.value)} placeholder="Prénom" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(BSH.line),borderRadius:10,padding:"9px 12px",color:BSH.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
              </div>

              {/* ── Mode de paiement */}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:7}}>Mode de paiement</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {[
                    {id:"SumUp",ico:"💳",label:"SumUp"},
                    {id:"PayPal",ico:"🅿",label:"PayPal"},
                  ].map(p => (
                    <button key={p.id} onClick={() => setPmtChoisi(p.id)}
                      style={{padding:"7px 12px",borderRadius:9,border:"1px solid "+(pmtChoisi===p.id?BSH.or:BSH.line),background:pmtChoisi===p.id?(BSH.or+"22"):"transparent",color:pmtChoisi===p.id?BSH.or:BSH.cremeD,cursor:"pointer",fontSize:12,fontFamily:SA,fontWeight:pmtChoisi===p.id?700:400}}>
                      {p.ico} {p.label}
                    </button>
                  ))}
                </div>
                {pmtChoisi === "PayPal" && <div style={{fontSize:11,color:B.gold,marginTop:8}}>📧 {ENV.PAYPAL}</div>}
              </div>

              {/* ── Bouton payer */}
              {(() => {
                const selectionnes = cart.filter(i => i.selected !== false);
                const totalSel = selectionnes.reduce((s,i) => s+(i.promo||i.prix)*i.qty, 0);
                const disabled = selectionnes.length === 0 || totalSel <= 0;
                if (pmtChoisi === "SumUp") return (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <Btn v="gold" full onClick={confirmerCommande} disabled={sumupLoading||disabled}>
                      {sumupLoading ? "⏳ Redirection SumUp…" : `💳 Payer par SumUp — ${totalSel}€`}
                    </Btn>
                    {sumupErreur && (
                      <div style={{fontSize:11,color:"#ef4444",textAlign:"center",padding:"6px 8px",background:"rgba(239,68,68,0.1)",borderRadius:8}}>
                        {sumupErreur}
                      </div>
                    )}
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",textAlign:"center"}}>🔒 Paiement sécurisé SumUp · Aucune donnée bancaire stockée</div>
                  </div>
                );
                return (
                  <Btn v="gold" full onClick={confirmerCommande} disabled={disabled}>
                    {disabled
                      ? "Sélectionnez au moins un article"
                      : `🅿 Payer par PayPal — ${totalSel}€`}
                  </Btn>
                );
              })()}
              <p style={{textAlign:"center",fontSize:10,color:B.muted,marginTop:8,lineHeight:1.6}}>
                Un numéro de commande sera généré automatiquement.<br/>La fondatrice recevra votre commande en temps réel.
              </p>
            </>}
        </Mdl>
      )}
      {modal === "confirmation" && cmdConfirmee && (
        <Mdl title="Commande enregistrée ✓" onClose={() => {setModal(null); setCmdConfirmee(null);}}>
          <div style={{textAlign:"center",fontSize:48,marginBottom:12}}>🌹</div>
          <p style={{textAlign:"center",fontSize:14,color:BSH.creme,marginBottom:6,fontWeight:600}}>
            Merci ! Votre commande <span style={{color:BSH.or}}>{cmdConfirmee.id}</span> est enregistrée.
          </p>
          <p style={{textAlign:"center",fontSize:12,color:B.muted,marginBottom:16,lineHeight:1.6}}>
            {cmdConfirmee.produitStr}<br/>
            <span style={{fontSize:18,fontWeight:700,color:BSH.or,fontFamily:FS}}>{cmdConfirmee.totalSel}€</span>
          </p>
          {cmdConfirmee.pmt === "PayPal" && (
            <div style={{background:`${BSH.bord}15`,border:"1px solid "+(BSH.line),borderRadius:10,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:BSH.creme,marginBottom:6}}>🅿 Régler par PayPal</div>
              <div style={{fontSize:11,color:B.muted,lineHeight:1.7}}>
                Envoyez <span style={{color:BSH.or,fontWeight:700}}>{cmdConfirmee.totalSel}€</span> à l'adresse PayPal :
              </div>
              <div style={{fontSize:13,color:B.gold,fontWeight:700,marginTop:6,wordBreak:"break-all"}}>{ENV.PAYPAL}</div>
              <div style={{fontSize:10,color:B.muted,marginTop:8,lineHeight:1.6}}>
                Indiquez la référence <span style={{color:BSH.creme}}>{cmdConfirmee.id}</span> dans le message PayPal. La fondatrice validera votre commande dès réception.
              </div>
            </div>
          )}
          <Btn v="gold" full onClick={() => {setModal(null); setCmdConfirmee(null);}}>Terminé</Btn>
        </Mdl>
      )}
      {modal?.type === "prod" && (
        <Mdl title={modal.p.name} onClose={() => setModal(null)}>
          <div style={{textAlign:"center",fontSize:52,marginBottom:10}}>{modal.p.ico}</div>
          <p style={{color:B.muted,fontSize:13,textAlign:"center",marginBottom:14,lineHeight:1.6}}>{modal.p.desc}</p>
          <div style={{textAlign:"center",marginBottom:18}}>
            {modal.p.promo ? <><span style={{fontSize:26,fontWeight:700,color:B.gold,fontFamily:FS}}>{modal.p.promo}€</span><span style={{fontSize:14,color:B.muted,textDecoration:"line-through",marginLeft:8}}>{modal.p.prix}€</span></> : <span style={{fontSize:26,fontWeight:700,color:B.gold,fontFamily:FS}}>{modal.p.prix}€</span>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <Btn v="gold" full onClick={() => {addCart(modal.p); setModal(null);}}>🛒 Ajouter au panier</Btn>
            <Btn v="ghost" full onClick={() => window.open(WA("Bonjour, je voudrais commander : "+(modal.p.name)),"_blank")}>💬 Commander via WhatsApp</Btn>
          </div>
        </Mdl>
      )}
      {modal?.type === "evt" && (
        <Mdl title={modal.e.nom} onClose={() => setModal(null)}>
          <div style={{textAlign:"center",fontSize:40,marginBottom:10}}>{modal.e.ico}</div>
          <p style={{color:B.muted,fontSize:13,textAlign:"center",marginBottom:16,lineHeight:1.6}}>{modal.e.desc}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
            {[["📅 Date",fmt(modal.e.date)],["📍 Lieu",modal.e.lieu],["🎟 Prix",`${modal.e.prix}€/pers.`],["👥 Places",`${modal.e.dispo} restante${modal.e.dispo!==1?"s":""}`]].map(([l,v]) => (
              <div key={l} style={{background:B.surface,borderRadius:9,padding:"9px 11px",border:"1px solid "+(B.border)}}>
                <div style={{fontSize:9,color:B.gold,marginBottom:3,fontWeight:700}}>{l}</div>
                <div style={{fontSize:12,color:B.cream,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
          <Btn v="gold" full onClick={async () => {
            const id = genId();
            const cmd = {
              id,
              client: "Client web",
              produit: `Événement : ${modal.e.nom} — ${fmt(modal.e.date)}`,
              montant: modal.e.prix,
              acompte: 0,
              statut: "Demande reçue",
              date: today(),
              pmt: "À confirmer",
              notes: `Réservation événement web — ${new Date().toLocaleString("fr-FR")}`,
            };
            if (onNewCommande) await onNewCommande(cmd);
            const msg = `🌹 *RÉSERVATION ${id}*\n\nÉvénement : ${modal.e.nom}\nDate : ${fmt(modal.e.date)}\nLieu : ${modal.e.lieu}\nTarif : ${modal.e.prix}€/pers.\nDate réservation : ${new Date().toLocaleString("fr-FR")}\n\nMerci de confirmer ma réservation.`;
            setModal(null);
            window.open(WA(msg), "_blank");
          }}>Réserver via WhatsApp →</Btn>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── ESPACE CLIENT BELLA'ODYSSÉE
// ═══════════════════════════════════════════════════════════
function ClientOdyssee({user, rdvs, onBack}) {
  const mineur = estMineur(user?.date_naissance);
  const ageClient = calcAge(user?.date_naissance);
  const [page, setPage] = useState("accueil");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({prestation:PRESTATIONS_BO[0],date:today(),heure:"10h00",nom:"",tel:""});

  const PAGES = [{id:"accueil",l:"🏠"},{id:"prestations",l:"💅"},{id:"rdv",l:"📅"},{id:"galerie",l:"📸"},{id:"contact",l:"📞"}];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${BO.prune},${BO.fond} 65%)`,fontFamily:SA}}>
      {/* Header */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+(BO.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.35)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:BO.or,letterSpacing:2}}>💅 Bella'Odyssée</div>
          <div style={{fontSize:8,color:BO.cremeD,letterSpacing:3}}>BEAUTÉ · SOINS · ÉLÉGANCE</div>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid "+(BO.line),borderRadius:8,padding:"5px 9px",color:BO.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Portail</button>
      </div>

      {/* Nav */}
      <div style={{display:"flex",justifyContent:"space-around",padding:"8px 12px",borderBottom:"1px solid "+(BO.line),background:"rgba(0,0,0,0.2)",flexShrink:0}}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderBottom:page===p.id ? "2px solid "+(BO.or) : "2px solid transparent"}}>
            <span style={{fontSize:18}}>{p.l}</span>
            <span style={{fontSize:8,color:page===p.id?BO.or:BO.cremeD,fontWeight:700,textTransform:"capitalize"}}>{p.id==="rdv"?"RDV":p.id}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{flex:1,overflowY:"auto",padding:"14px",color:BO.creme}}>

        {/* ── ACCUEIL ── */}
        {page === "accueil" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{textAlign:"center",padding:"16px 0 8px"}}>
              <div style={{fontSize:52,marginBottom:10}}>💅</div>
              <div style={{fontFamily:FS,fontSize:22,color:BO.or,letterSpacing:2,marginBottom:6}}>Bella'Odyssée</div>
              <div style={{fontSize:13,color:BO.cremeD,lineHeight:1.8}}>Studio beauté & soins à {ENV.VILLE}.<br/>Extensions de cils · Browlift · Lashlift<br/>Blanchiment · Strass dentaires</div>
            </div>
            <OCard accent style={{textAlign:"center",padding:"18px 16px"}}>
              <div style={{fontFamily:FS,fontSize:14,color:BO.or,marginBottom:8}}>Prendre rendez-vous ✦</div>
              <div style={{fontSize:12,color:BO.cremeD,marginBottom:14,lineHeight:1.7}}>Réservez votre soin en quelques secondes.<br/>Confirmation immédiate par WhatsApp.</div>
              <OBtn v="primary" sz="md" full onClick={() => setPage("rdv")}>📅 Réserver un rendez-vous</OBtn>
            </OCard>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {[{ico:"💅",t:"Nos prestations",sub:"5 soins signature",p:"prestations"},{ico:"📸",t:"Galerie",sub:"Avant / Après",p:"galerie"}].map(c => (
                <OCard key={c.t} style={{textAlign:"center",padding:"14px 10px",cursor:"pointer"}} onClick={() => setPage(c.p)}>
                  <div style={{fontSize:26,marginBottom:5}}>{c.ico}</div>
                  <div style={{fontFamily:FS,fontSize:12,fontWeight:700,color:BO.creme}}>{c.t}</div>
                  <div style={{fontSize:10,color:BO.cremeD,marginTop:2}}>{c.sub}</div>
                </OCard>
              ))}
            </div>
          </div>
        )}

        {/* ── PRESTATIONS ── */}
        {page === "prestations" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BO.or,margin:0}}>Nos Prestations</h2>
            {PRESTATIONS_BO_DETAIL.map(p => (
              <OCard key={p.nom} accent>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{fontSize:28,flexShrink:0,marginTop:2}}>{p.ico}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:FS,fontSize:14,fontWeight:700,color:BO.creme,marginBottom:4}}>{p.nom}</div>
                    <div style={{fontSize:12,color:BO.cremeD,marginBottom:9,lineHeight:1.6}}>{p.desc}</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
                      <OTag c={BO.acc} sz={9}>⏱ {p.duree}</OTag>
                      <OTag c={BO.or} sz={9}>💰 {p.affichage}</OTag>
                    </div>
                    {p.formules && p.formules.length > 0 && (
                      <div style={{marginBottom:10,padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8}}>
                        {p.formules.map((f,idx) => (
                          <div key={idx} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:BO.cremeD,padding:"2px 0"}}>
                            <span>{f.l}</span>
                            <span style={{color:f.p?BO.or:BO.cremeD,fontWeight:f.p?700:400}}>{f.p  ? (f.p)+"€" : "Sur devis"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const r = regleAcces(p.nom, user?.date_naissance);
                      if (r.bloque) return (
                        <div>
                          <div style={{fontSize:11,color:"#e07a7a",background:"rgba(224,68,68,0.1)",border:"1px solid rgba(224,68,68,0.3)",borderRadius:8,padding:"8px 10px",marginBottom:6,textAlign:"center"}}>🔒 {r.message}</div>
                          <OBtn v="primary" sz="sm" full disabled={true}>Réservation indisponible</OBtn>
                        </div>
                      );
                      return (
                        <div>
                          {r.parental && <div style={{fontSize:10,color:BO.or,background:"rgba(212,175,100,0.1)",borderRadius:8,padding:"6px 9px",marginBottom:6,textAlign:"center"}}>⚠ {r.message}</div>}
                          <OBtn v="primary" sz="sm" full onClick={() => {setForm({...form,prestation:p.nom,parentalRequis:r.parental});setPage("rdv");}}>Réserver ce soin →</OBtn>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </OCard>
            ))}
          </div>
        )}

        {/* ── RÉSERVATION ── */}
        {page === "rdv" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BO.or,margin:0}}>Prendre rendez-vous</h2>
            <OCard accent>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:BO.cremeD,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Votre prénom</label>
                <input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Votre prénom" style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid "+(BO.line),borderRadius:10,padding:"9px 12px",color:BO.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:BO.cremeD,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Prestation souhaitée</label>
                <select value={form.prestation} onChange={e=>setForm({...form,prestation:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid "+(BO.line),borderRadius:10,padding:"9px 12px",color:BO.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}>
                  {PRESTATIONS_BO_DETAIL.map(p=><option key={p.nom} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:BO.cremeD,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Date souhaitée</label>
                  <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid "+(BO.line),borderRadius:10,padding:"9px 12px",color:BO.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:BO.cremeD,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Heure</label>
                  <select value={form.heure} onChange={e=>setForm({...form,heure:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid "+(BO.line),borderRadius:10,padding:"9px 12px",color:BO.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}>
                    {["8h00","9h00","10h00","11h00","13h00","14h00","15h00","16h00","17h00"].map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:BO.cremeD,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Téléphone / WhatsApp</label>
                <input value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="+594..." style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid "+(BO.line),borderRadius:10,padding:"9px 12px",color:BO.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
              </div>
              {ENV.SQUARE_BOOKING ? (
                <OBtn v="primary" sz="md" full onClick={() => window.open(ENV.SQUARE_BOOKING,"_blank")}>
                  📅 Réserver en ligne (planning)
                </OBtn>
              ) : (
                <OBtn v="primary" sz="md" full disabled={!form.nom.trim()} onClick={() => {
                  const msg=`Bonjour, je souhaite prendre rendez-vous pour : ${form.prestation}\nDate : ${fmt(form.date)} à ${form.heure}\nPrénom : ${form.nom}\nTél : ${form.tel||"À préciser"}`;
                  window.open(WA(msg),"_blank");
                }}>💬 Envoyer ma demande via WhatsApp</OBtn>
              )}
              <p style={{textAlign:"center",fontSize:10,color:BO.cremeD,marginTop:8}}>Confirmation rapide · Acompte possible</p>
            </OCard>
            <OCard style={{padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:BO.creme,marginBottom:6}}>📍 Nous trouver</div>
              <div style={{fontSize:11,color:BO.cremeD,lineHeight:1.8}}>{ENV.ADRESSE}<br/><br/>{ENV.VILLE}, {ENV.PAYS}</div>
            </OCard>
          </div>
        )}

        {/* ── GALERIE ── */}
        {page === "galerie" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BO.or,margin:0}}>Galerie Avant / Après</h2>
            <p style={{fontSize:12,color:BO.cremeD,margin:0,lineHeight:1.7}}>Découvrez les transformations réalisées par Bella'Odyssée.</p>
            {[
              {presta:"Extensions de cils",avant:"Cils courts et clairsemés",apres:"Volume russe — regard magnétique"},
              {presta:"Browlift",avant:"Sourcils non dessinés",apres:"Arc parfait et regard ouvert"},
              {presta:"Blanchiment dentaire",avant:"Dents jaunies par le café",apres:"Sourire 3 teintes plus clair"},
              {presta:"Lashlift",avant:"Cils naturels tombants",apres:"Cils recourbés et allongés"},
            ].map((g,i) => (
              <OCard key={i} accent style={{padding:"12px 14px"}}>
                <div style={{fontFamily:FS,fontSize:12,fontWeight:700,color:BO.or,marginBottom:9}}>💅 {g.presta}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{l:"Avant",v:g.avant,c:"rgba(180,80,80,0.2)"},{l:"Après",v:g.apres,c:"rgba(80,180,120,0.2)"}].map(x=>(
                    <div key={x.l} style={{background:x.c,borderRadius:9,padding:"10px",textAlign:"center",border:"1px solid "+(x.l==="Avant"?BO.rouge||"#e84444":"rgba(80,180,120,0.3)")}}>
                      <div style={{fontSize:9,fontWeight:800,color:x.l==="Avant"?"#f4a0a0":"#80e0a0",marginBottom:4,letterSpacing:"0.08em"}}>{x.l.toUpperCase()}</div>
                      <div style={{fontSize:11,color:BO.creme,lineHeight:1.5}}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </OCard>
            ))}
            <OBtn v="primary" sz="md" full onClick={() => setPage("rdv")}>📅 Réserver mon soin →</OBtn>
          </div>
        )}

        {/* ── CONTACT ── */}
        {page === "contact" && (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <h2 style={{fontFamily:FS,fontSize:18,color:BO.or,margin:0}}>Contact</h2>
            {[
              {ico:"💬",t:"WhatsApp",v:ENV.TEL,action:()=>window.open(WA(),"_blank"),cta:"Envoyer un message"},
              {ico:"📧",t:"E-mail",v:ENV.EMAIL,action:()=>window.open("mailto:"+(ENV.EMAIL),"_blank"),cta:"Envoyer un e-mail"},
              {ico:"📍",t:"Adresse",v:`${ENV.ADRESSE}\n${ENV.VILLE}, ${ENV.PAYS}`,action:null,cta:null},
            ].map(c => (
              <OCard key={c.t} style={{padding:"14px 16px"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{fontSize:24,flexShrink:0}}>{c.ico}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:FS,fontSize:12,fontWeight:700,color:BO.or,marginBottom:4}}>{c.t}</div>
                    <div style={{fontSize:12,color:BO.cremeD,lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:c.action?10:0}}>{c.v}</div>
                    {c.action && <OBtn v="primary" sz="sm" onClick={c.action}>{c.cta}</OBtn>}
                  </div>
                </div>
              </OCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── PLACEHOLDER UNIVERS (Events, Food, Vilo, Éditions, MTP)
// ═══════════════════════════════════════════════════════════
function PlaceholderUnivers({univers, onBack}) {
  const u = UNIVERS.find(x => x.id === univers);
  if (!u) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${u.bg},${B.night} 65%)`,fontFamily:SA,alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{textAlign:"center",maxWidth:320}}>
        <div style={{width:72,height:72,borderRadius:20,background:`${u.acc}30`,border:"1px solid "+(u.acc)+("50"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}}>{u.ico}</div>
        <div style={{fontFamily:FS,fontSize:22,color:"#fff",marginBottom:6}}>{u.nom}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginBottom:8}}>{u.tag}</div>
        <div style={{background:`${u.acc}20`,border:"1px solid "+(u.acc)+("40"),borderRadius:12,padding:"16px",marginBottom:24}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",lineHeight:1.8}}>
            ✦ Espace client en préparation<br/>
            <span style={{color:u.or,fontWeight:700}}>Prochainement disponible</span><br/>
            <br/>
            En attendant, contactez-nous<br/>directement via WhatsApp
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={() => window.open(WA("Bonjour, je suis intéressé(e) par "+(u.nom)),"_blank")} style={{background:`linear-gradient(135deg,${u.acc},${u.acc2})`,border:"none",borderRadius:12,padding:"12px 20px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:SA}}>
            💬 Nous contacter via WhatsApp
          </button>
          <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"10px 20px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:12,fontFamily:SA}}>
            ‹ Retour au portail
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── ESPACE FONDATRICE — DASHBOARD + PROJETS + TÂCHES + BSH + HUB + IA
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// HELPERS SUPABASE — Phase 1
// ═══════════════════════════════════════════════════════════
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getToken() {
  if (typeof window === "undefined") return SB_KEY;
  return localStorage.getItem("bellaia_token") || SB_KEY;
}

async function sbGet(table, params = {}) {
  const { select = "*", filters = {}, order = "created_at.desc", limit = 100 } = params;
  const token = getToken();
  let url = `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${encodeURIComponent(String(v))}`; });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const r = await fetch(url, { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

async function sbPost(table, data) {
  const token = getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify(data),
  });
  const d = await r.json();
  return { ok: r.ok, data: d };
}

async function sbPatch(table, id, data) {
  const token = getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify(data),
  });
  return { ok: r.ok };
}

async function sbDelete(table, id) {
  const token = getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${token}` },
  });
  return { ok: r.ok };
}

// ── Hook BSH Supabase avec fallback localStorage
function useBSHSupabase(table, localKey, init, mapRow = r => r) {
  const [data, setData] = useState(init);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Essayer Supabase d'abord
    const load = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = getToken();
      if (!url || !key) { setLoaded(true); return; }
      try {
        const r = await fetch(`${url}/rest/v1/${table}?order=created_at.desc&limit=200`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
        });
        if (r.ok) {
          const rows = await r.json();
          if (Array.isArray(rows) && rows.length > 0) {
            setData(rows.map(mapRow));
            setLoaded(true);
            return;
          }
        }
      } catch {}
      // Fallback localStorage
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
        if (s) setData(JSON.parse(s));
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  // Sauvegarder en localStorage à chaque changement (cache local)
  useEffect(() => {
    if (!loaded) return;
    try {
      if (typeof window !== "undefined") localStorage.setItem(localKey, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  return [data, setData];
}

function useP1Data(table, params, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const d = await sbGet(table, params);
    setData(d);
    setLoading(false);
  }, [table, JSON.stringify(params), ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load, setData };
}

// ═══════════════════════════════════════════════════════════
// TABLEAU DE BORD IA — Phase 1 Supabase
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// DASHBOARD FONDATRICE — Vue centrale professionnelle
// ═══════════════════════════════════════════════════════════
function DashF({ user, goto }) {
  const [kpis, setKpis] = useState({
    ca_mois:0, encaisse_mois:0, en_attente:0, nb_retard:0,
    nb_clientes:0, nb_prospects:0, nb_vip:0, depenses_mois:0
  });
  const [events, setEvents] = useState([]);
  const [invoicesRetard, setInvoicesRetard] = useState([]);
  const [briefs, setBriefs] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [fin, crm, cal, inv] = await Promise.all([
          sbGet("v_dashboard_finances", { select:"*", order:null, limit:1 }),
          sbGet("v_dashboard_crm", { select:"*", order:null, limit:1 }),
          sbGet("v_calendar_upcoming", { select:"*", order:"date_debut.asc", limit:5 }),
          sbGet("invoices", { select:"*", filters:{statut:"en_retard"}, order:"date_echeance.asc", limit:3 }),
        ]);
        if (fin[0]) setKpis(k=>({...k,...fin[0]}));
        if (crm[0]) setKpis(k=>({...k,...crm[0]}));
        setEvents(cal||[]);
        setInvoicesRetard(inv||[]);
      } catch {}
    };
    load();
  }, []);

  const genBrief = async () => {
    setBriefLoading(true);
    try {
      const ctx = `Tu es Bellaïa, assistante de Renée-Lise Vilosa, fondatrice de Bella'Studio.
Données temps réel :
- CA facturé ce mois : ${kpis.ca_mois||0}€ | Encaissé : ${kpis.encaisse_mois||0}€
- En attente paiement : ${kpis.en_attente||0}€ | Factures en retard : ${kpis.nb_retard||0}
- Clientes actives : ${kpis.nb_clientes||0} | Prospects : ${kpis.nb_prospects||0} | VIP : ${kpis.nb_vip||0}
- Événements à venir : ${events.length}
Génère un brief matinal motivant, élégant, direct. 5 lignes max. Priorités du jour.`;
      const r = await fetch("/api/chat", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:ctx,messages:[{role:"user",content:"Brief du matin"}]})});
      const d = await r.json();
      setBriefs(d.content?.[0]?.text||"");
    } catch { setBriefs("Connexion IA indisponible."); }
    setBriefLoading(false);
  };

  const countdown = (ds) => {
    const diff = new Date(ds) - now;
    if (diff <= 0) return "Jour J ✦";
    const j = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    if (j>1) return `J-${j}`;
    if (j===1) return "Demain";
    return `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
  };

  const POLES = [
    {id:"bsh",     ico:"✦",  nom:"BSH",          col:"#6B1A2B"},
    {id:"odyssee", ico:"💅", nom:"Odyssée",       col:"#3730a3"},
    {id:"events",  ico:"✨", nom:"Events",        col:"#065f46"},
    {id:"food",    ico:"🍃", nom:"Food",          col:"#15803d"},
    {id:"vilo",    ico:"📋", nom:"Vilo",          col:"#1d4ed8"},
    {id:"editions",ico:"📚", nom:"Éditions",      col:"#92400e"},
    {id:"mtp",     ico:"🌺", nom:"Mo Ti-Péyi",    col:"#7e22ce"},
    {id:"struct",  ico:"🏗", nom:"Structure",     col:"#0f766e"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* En-tête */}
      <div>
        <div style={{fontSize:11,color:B.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>{now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
        <h1 style={{margin:"4px 0 0",fontSize:22,fontWeight:900,color:B.cream,fontFamily:FS}}>Bonjour, {user?.prenom||"Renée-Lise"} ✦</h1>
        <div style={{fontSize:12,color:B.muted}}>Bellaïa prépare. Toi, tu décides.</div>
      </div>

      {/* Brief IA */}
      <div style={{background:`linear-gradient(135deg,${B.violet}20,${B.gold}10)`,border:"1px solid "+(B.border),borderRadius:14,padding:"13px 15px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:briefs?8:0}}>
          <span style={{fontSize:12,fontWeight:700,color:B.gold}}>✦ Brief Bellaïa</span>
          <Btn sm v="ghost" onClick={genBrief} disabled={briefLoading}>{briefLoading?"…":briefs?"Actualiser":"Générer"}</Btn>
        </div>
        {briefs && <p style={{margin:0,fontSize:12,color:B.cream,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{briefs}</p>}
        {!briefs && !briefLoading && <p style={{margin:0,fontSize:11,color:B.muted}}>Génère ton brief quotidien avec l'IA.</p>}
      </div>

      {/* KPIs Finances */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:800,color:B.cream}}>€ Finances</span>
          <span style={{fontSize:11,color:B.violetL,cursor:"pointer"}} onClick={()=>goto("finances")}>Voir tout →</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {l:"CA facturé",v:`${(kpis.ca_mois||0).toLocaleString("fr")}€`,acc:true},
            {l:"Encaissé",v:`${(kpis.encaisse_mois||0).toLocaleString("fr")}€`,acc:true},
            {l:"En attente",v:`${(kpis.en_attente||0).toLocaleString("fr")}€`},
            {l:"Retards",v:kpis.nb_retard||0,warn:(kpis.nb_retard||0)>0},
          ].map(s=>(
            <div key={s.l} style={{background:B.card,border:"1px solid "+(s.warn?"rgba(180,80,80,0.5)":s.acc?B.borderG:B.border),borderRadius:11,padding:"11px 12px"}}>
              <div style={{fontSize:20,fontWeight:900,color:s.warn?B.danger:s.acc?B.gold:B.violetL,fontFamily:FS}}>{s.v}</div>
              <div style={{fontSize:10,color:B.muted,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs CRM */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:800,color:B.cream}}>👥 CRM</span>
          <span style={{fontSize:11,color:B.violetL,cursor:"pointer"}} onClick={()=>goto("crm")}>Voir tout →</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
          {[{l:"Clientes",v:kpis.nb_clientes||0},{l:"Prospects",v:kpis.nb_prospects||0},{l:"VIP",v:kpis.nb_vip||0}].map(s=>(
            <div key={s.l} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:11,padding:"10px 9px",textAlign:"center"}}>
              <div style={{fontSize:19,fontWeight:900,color:B.violetL,fontFamily:FS}}>{s.v}</div>
              <div style={{fontSize:10,color:B.muted,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Événements + countdown */}
      {events.length>0&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:800,color:B.cream}}>📅 Agenda</span>
            <span style={{fontSize:11,color:B.violetL,cursor:"pointer"}} onClick={()=>goto("calendrier")}>Voir tout →</span>
          </div>
          {events.slice(0,3).map(e=>(
            <div key={e.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:11,padding:"10px 13px",marginBottom:6,borderLeft:`3px solid ${e.couleur||B.violet}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:B.cream}}>{e.titre}</div>
                  {e.lieu&&<div style={{fontSize:10,color:B.muted}}>📍 {e.lieu}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:e.compte_rebours?13:11,fontWeight:700,color:e.compte_rebours?B.gold:B.violetL,fontFamily:e.compte_rebours?FS:SA}}>{countdown(e.date_debut)}</div>
                  <div style={{fontSize:9,color:B.muted}}>{new Date(e.date_debut).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alertes */}
      {invoicesRetard.length>0&&(
        <div style={{background:"rgba(180,80,80,0.1)",border:"1px solid rgba(180,80,80,0.3)",borderRadius:12,padding:"11px 14px"}}>
          <div style={{fontSize:12,fontWeight:800,color:B.danger,marginBottom:6}}>⚠ {invoicesRetard.length} facture{invoicesRetard.length>1?"s":""} en retard</div>
          {invoicesRetard.map(i=><div key={i.id} style={{fontSize:11,color:B.danger,marginBottom:3}}>{i.client_nom} — {i.solde_restant}€</div>)}
          <div style={{marginTop:8}}><Btn sm v="danger" onClick={()=>goto("finances")}>Traiter →</Btn></div>
        </div>
      )}

      {/* Accès rapides pôles */}
      <div>
        <div style={{fontSize:12,fontWeight:800,color:B.cream,marginBottom:10}}>Pôles Bella'Studio</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {POLES.map(p=>(
            <div key={p.id} style={{background:B.card,border:"1px solid "+(p.col)+("30"),borderRadius:11,padding:"10px 12px",cursor:"pointer",borderLeft:`3px solid ${p.col}`}} onClick={()=>goto(p.id)}>
              <div style={{fontSize:18,marginBottom:4}}>{p.ico}</div>
              <div style={{fontSize:12,fontWeight:700,color:B.cream}}>{p.nom}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACTIVITÉS CLIENT — CRM Phase 1
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// FICHE CLIENT COMPLÈTE — Historique chronologique complet
// ═══════════════════════════════════════════════════════════
function FicheClientF({ client, onClose }) {
  const [ong, setOng] = useState("apercu");
  const [invoices, setInvoices]   = useState([]);
  const [quotes, setQuotes]       = useState([]);
  const [payments, setPayments]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [cmds, setCmds]           = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    const load = async () => {
      setLoading(true);
      const [inv, quo, pay, act, cmd] = await Promise.all([
        sbGet("invoices",          { select:"*", order:"date_emission.desc", limit:50 }).then(d=>(d||[]).filter(x=>x.client_id===client.id||x.client_nom===`${client.prenom||""} ${client.nom||""}`.trim())),
        sbGet("quotes",            { select:"*", order:"date_emission.desc", limit:50 }).then(d=>(d||[]).filter(x=>x.client_id===client.id||x.client_nom===`${client.prenom||""} ${client.nom||""}`.trim())),
        sbGet("payments",          { select:"*", order:"date_paiement.desc", limit:50 }).then(d=>(d||[]).filter(x=>x.client_id===client.id)),
        sbGet("client_activities", { select:"*", order:"date_activite.desc", limit:50 }).then(d=>(d||[]).filter(x=>x.client_id===client.id)),
        sbGet("events_commandes",  { select:"*", order:"created_at.desc",   limit:50 }).then(d=>(d||[]).filter(x=>x.client_email===client.email||x.client_nom===`${client.prenom||""} ${client.nom||""}`.trim())),
      ]);
      setInvoices(inv); setQuotes(quo); setPayments(pay);
      setActivities(act); setCmds(cmd);
      setLoading(false);
    };
    load();
  }, [client?.id]);

  const totalEncaisse = payments.filter(p=>p.statut==="reçu").reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
  const totalFacture  = invoices.reduce((s,i)=>s+(parseFloat(i.total_ttc)||0),0);

  const ONGS = [
    {id:"apercu",    l:"📊 Aperçu"},
    {id:"factures",  l:`💰 Factures (${invoices.length})`},
    {id:"devis",     l:`📋 Devis (${quotes.length})`},
    {id:"paiements", l:`💳 Paiements (${payments.length})`},
    {id:"commandes", l:`🛒 Commandes (${cmds.length})`},
    {id:"activites", l:`⚡ Activités (${activities.length})`},
  ];

  const nomComplet = `${client.prenom||""} ${client.nom||""}`.trim() || client.email || "—";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:B.deep,borderBottom:"1px solid "+(B.border),padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:B.cream,fontFamily:FS}}>{nomComplet}</div>
          <div style={{fontSize:11,color:B.muted,marginTop:2}}>{client.email||"—"} · {client.ville||"—"} · {client.vip_level||"Bronze"}</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"8px 14px",color:B.cream,cursor:"pointer",fontSize:14,fontFamily:SA}}>✕</button>
      </div>

      {/* Navigation onglets */}
      <div style={{display:"flex",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px",borderBottom:"1px solid "+(B.border),background:B.deep,flexShrink:0}}>
        {ONGS.map(o=>(
          <button key={o.id} onClick={()=>setOng(o.id)}
            style={{padding:"5px 11px",borderRadius:99,border:"1px solid "+(ong===o.id?B.gold:B.border),background:ong===o.id?(B.gold+"18"):"transparent",color:ong===o.id?B.gold:B.muted,cursor:"pointer",fontSize:10,fontWeight:ong===o.id?700:400,whiteSpace:"nowrap",fontFamily:SA}}>
            {o.l}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {loading && <div style={{textAlign:"center",color:B.muted,padding:30}}>Chargement…</div>}

        {/* Aperçu */}
        {!loading && ong==="apercu" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {l:"Total facturé",  v:`${totalFacture.toFixed(2)}€`,  c:B.gold},
                {l:"Total encaissé", v:`${totalEncaisse.toFixed(2)}€`, c:"#4ade80"},
                {l:"Devis",          v:quotes.length,                   c:B.violetL},
                {l:"Commandes",      v:cmds.length,                     c:"#0d9488"},
              ].map(k=>(
                <div key={k.l} style={{flex:1,minWidth:70,background:`${k.c}12`,border:"1px solid "+(k.c)+("30"),borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:700,color:k.c,fontFamily:FS}}>{k.v}</div>
                  <div style={{fontSize:9,color:B.muted,marginTop:2}}>{k.l}</div>
                </div>
              ))}
            </div>
            {/* Infos client */}
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:B.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Informations</div>
              {[
                ["Email",        client.email],
                ["Téléphone",    client.telephone],
                ["Ville",        client.ville],
                ["Canal",        client.canal_acquisition],
                ["Client depuis",client.created_at?.slice(0,10)],
                ["Notes",        client.notes_internes],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12}}>
                  <span style={{color:B.muted}}>{l}</span>
                  <span style={{color:B.cream,fontWeight:500,maxWidth:"60%",textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </div>
            {/* Chronologie récente */}
            <div style={{fontSize:11,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginTop:4}}>Activité récente</div>
            {[
              ...invoices.slice(0,3).map(i=>({date:i.date_emission,ico:"💰",txt:`Facture ${i.numero||i.id?.slice(0,8)||"—"} — ${parseFloat(i.total_ttc||0).toFixed(0)}€`,statut:i.statut})),
              ...quotes.slice(0,2).map(q=>({date:q.date_emission,ico:"📋",txt:`Devis ${q.numero||q.id?.slice(0,8)||"—"} — ${parseFloat(q.total_ttc||0).toFixed(0)}€`,statut:q.statut})),
              ...activities.slice(0,3).map(a=>({date:a.date_activite,ico:"⚡",txt:a.notes||a.type_activite,statut:""})),
            ].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6).map((item,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid "+(B.border)}}>
                <span style={{fontSize:16,flexShrink:0}}>{item.ico}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:B.cream}}>{item.txt}</div>
                  {item.statut&&<span style={{fontSize:9,color:B.muted}}>{item.statut}</span>}
                </div>
                <div style={{fontSize:10,color:B.muted,flexShrink:0}}>{item.date||"—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Factures */}
        {!loading && ong==="factures" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {invoices.length===0?<div style={{textAlign:"center",color:B.muted,padding:20}}>Aucune facture</div>:
            invoices.map(inv=>(
              <div key={inv.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:B.cream}}>{inv.numero||inv.id?.slice(0,8)||"—"}</div><div style={{fontSize:10,color:B.muted}}>{inv.objet||"—"} · {inv.date_emission||"—"}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:B.gold}}>{parseFloat(inv.total_ttc||0).toFixed(2)}€</div><div style={{fontSize:10,color:B.muted}}>{inv.statut}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Devis */}
        {!loading && ong==="devis" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {quotes.length===0?<div style={{textAlign:"center",color:B.muted,padding:20}}>Aucun devis</div>:
            quotes.map(q=>(
              <div key={q.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:B.cream}}>{q.numero||q.id?.slice(0,8)||"—"}</div><div style={{fontSize:10,color:B.muted}}>{q.objet||"—"} · {q.date_emission||"—"}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:B.gold}}>{parseFloat(q.total_ttc||0).toFixed(2)}€</div><div style={{fontSize:10,color:B.muted}}>{q.statut}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paiements */}
        {!loading && ong==="paiements" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {payments.length===0?<div style={{textAlign:"center",color:B.muted,padding:20}}>Aucun paiement</div>:
            payments.map(p=>(
              <div key={p.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:B.cream}}>{p.mode_paiement||p.provider||"—"}</div><div style={{fontSize:10,color:B.muted}}>{p.date_paiement||"—"} · {p.reference||"—"}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:p.statut==="reçu"?"#4ade80":B.gold}}>{parseFloat(p.montant||0).toFixed(2)}€</div><div style={{fontSize:10,color:B.muted}}>{p.statut}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Commandes */}
        {!loading && ong==="commandes" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {cmds.length===0?<div style={{textAlign:"center",color:B.muted,padding:20}}>Aucune commande</div>:
            cmds.map(cmd=>(
              <div key={cmd.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:B.cream}}>{cmd.type_evenement||"Commande"}</div><div style={{fontSize:10,color:B.muted}}>{cmd.date_evenement||"—"}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:B.gold}}>{parseFloat(cmd.montant_total||0).toFixed(2)}€</div><div style={{fontSize:10,color:B.muted}}>{cmd.statut}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activités */}
        {!loading && ong==="activites" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {activities.length===0?<div style={{textAlign:"center",color:B.muted,padding:20}}>Aucune activité enregistrée</div>:
            activities.map(a=>(
              <div key={a.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px",borderLeft:`3px solid ${B.violetL}`}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:B.cream,textTransform:"capitalize"}}>{a.type_activite}</div><div style={{fontSize:10,color:B.muted}}>{a.notes||"—"}</div></div>
                  <div style={{fontSize:10,color:B.muted}}>{a.date_activite||"—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivitesCrmF() {
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  const TYPES_ACT = ["appel","email","rdv","devis","commande","paiement","relance","note","autre"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sbGet("client_activities", {
          select: "*, clients(nom,prenom)",
          order: "date_activite.desc",
          limit: 100,
        });
        setActivites(data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!form.type_activite) return;
    await sbPost("client_activities", {
      ...form,
      date_activite: form.date_activite || new Date().toISOString().split("T")[0],
    });
    setModal(false);
    setForm({});
    // Recharger
    const data = await sbGet("client_activities", { select: "*, clients(nom,prenom)", order: "date_activite.desc", limit: 100 });
    setActivites(data || []);
  };

  const TYPE_ICO = {appel:"📞",email:"📧",rdv:"📅",devis:"📋",commande:"🛒",paiement:"💳",relance:"🔔",note:"📝",autre:"⚡"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:B.cream,fontFamily:FS}}>⚡ Activités clients</div>
          <div style={{fontSize:10,color:B.muted}}>{activites.length} activité{activites.length>1?"s":""} enregistrée{activites.length>1?"s":""}</div>
        </div>
        <Btn v="gold" onClick={()=>{setForm({type_activite:"note",date_activite:new Date().toISOString().split("T")[0]});setModal(true);}}>
          + Activité
        </Btn>
      </div>

      {loading && <div style={{textAlign:"center",color:B.muted,padding:20}}>Chargement…</div>}

      {!loading && activites.length === 0 && (
        <div style={{textAlign:"center",color:B.muted,padding:24,fontSize:13}}>
          Aucune activité enregistrée.<br/>
          <span style={{fontSize:11}}>Enregistrez vos appels, emails, rdv et notes clients ici.</span>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {activites.map(a => (
          <div key={a.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"10px 13px",borderLeft:`3px solid ${B.violetL}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:14}}>{TYPE_ICO[a.type_activite]||"⚡"}</span>
                  <span style={{fontSize:11,fontWeight:700,color:B.cream,textTransform:"capitalize"}}>{a.type_activite}</span>
                  {a.clients?.nom&&<span style={{fontSize:10,color:B.muted}}>· {a.clients.prenom||""} {a.clients.nom}</span>}
                </div>
                {a.notes&&<div style={{fontSize:11,color:B.muted,lineHeight:1.5}}>{a.notes}</div>}
              </div>
              <div style={{fontSize:10,color:B.muted,flexShrink:0,marginLeft:8}}>{a.date_activite||"—"}</div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <Mdl title="Nouvelle activité" onClose={()=>setModal(false)}>
          <Fld label="Type *">
            <Sel value={form.type_activite||"note"} onChange={e=>setForm({...form,type_activite:e.target.value})} options={TYPES_ACT}/>
          </Fld>
          <Fld label="Date"><Inp type="date" value={form.date_activite||""} onChange={e=>setForm({...form,date_activite:e.target.value})}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Description de l'activité" rows={3}/></Fld>
          <Fld label="Résultat"><Inp value={form.resultat||""} onChange={e=>setForm({...form,resultat:e.target.value})} placeholder="Ex : devis envoyé, RDV confirmé…"/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={save} full v="gold">Enregistrer</Btn>
            <Btn onClick={()=>setModal(false)} v="ghost">Annuler</Btn>
          </div>
        </Mdl>
      )}
    </div>
  );
}

function CrmF({ user }) {
  const [ong, setOng] = useState("clients");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [ficheClient, setFicheClient] = useState(null); // FicheClientF ouverte
  const [search, setSearch] = useState("");
  const [poles, setPoles] = useState([]);

  const { data: clients, loading: lCli, reload: rCli } = useP1Data("clients", { select: "*", order: "nom.asc", limit: 200 }, []);
  const { data: prospects, loading: lPro, reload: rPro } = useP1Data("prospects", { select: "*", order: "date_relance.asc", limit: 200 }, []);

  useEffect(() => { sbGet("business_units", { select: "code,nom", order: "ordre.asc" }).then(setPoles); }, []);

  const getFondId = () => user?.id || "";

  // Clients filtrés
  const clientsFiltres = clients.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email} ${c.tel}`.toLowerCase().includes(search.toLowerCase())
  );
  const prospectsFiltres = prospects.filter(p =>
    !search || `${p.nom} ${p.prenom} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const saveClient = async () => {
    if (!form.nom?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit; delete d._type;
    if (form._edit) await sbPatch("clients", form._edit, d);
    else await sbPost("clients", d);
    rCli(); setModal(null);
  };

  const convertirProspect = async (prospect) => {
    if (!confirm("Convertir "+(prospect.prenom||"")+" "+(prospect.nom)+" en client ?")) return;
    // 1. Créer le client depuis le prospect
    const clientData = {
      nom:               prospect.nom,
      prenom:            prospect.prenom || "",
      email:             prospect.email  || "",
      telephone:         prospect.telephone || "",
      ville:             prospect.ville  || "",
      type_client:       "cliente",
      statut:            "actif",
      canal_acquisition: prospect.source || "WhatsApp",
      notes_internes:    prospect.notes  || "",
      fondatrice_id:     getFondId(),
    };
    await sbPost("clients", clientData);
    // 2. Marquer le prospect comme converti
    await sbPatch("prospects", prospect.id, { statut: "converti", updated_at: new Date().toISOString() });
    // 3. Enregistrer l'activité
    await sbPost("client_activities", {
      type_activite: "note",
      notes:         `Converti depuis prospect le ${today()}`,
      date_activite: today(),
      fondatrice_id: getFondId(),
    });
    rPro();
    alert("✅ "+(prospect.prenom||"")+" "+(prospect.nom)+" converti en client !");
  };

  const saveProspect = async () => {
    if (!form.nom?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit; delete d._type;
    if (form._edit) await sbPatch("prospects", form._edit, d);
    else await sbPost("prospects", d);
    rPro(); setModal(null);
  };

  const delClient = async (id) => { if (confirm("Supprimer cette cliente ?")) { await sbDelete("clients", id); rCli(); } };
  const delProspect = async (id) => { if (confirm("Supprimer ce prospect ?")) { await sbDelete("prospects", id); rPro(); } };

  const STATUTS_CLI = ["actif","inactif","archivé"];
  const TYPES_CLI = ["cliente","prospect","vip","prestataire","partenaire"];
  const SOURCES = ["WhatsApp","Instagram","TikTok","Événement","Recommandation","Web","Autre"];
  const FIDELITES = ["standard","Bronze","Argent","Or","Diamant"];
  const STATUTS_PRO = ["nouveau","contacté","en discussion","devis envoyé","converti","perdu"];
  const fideliteColor = f => ({Or:B.gold,Diamant:"#90d0f0",Argent:"#8a9ab0",Bronze:"#8B6030"}[f]||B.muted);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SH t="CRM" s={`${clients.length} cliente${clients.length!==1?"s":""} · ${prospects.length} prospect${prospects.length!==1?"s":""}`}/>

      {/* Onglets */}
      <div style={{display:"flex",gap:6}}>
        {[["clients","👥 Clientes"],["prospects","🎯 Prospects"],["relances","🔔 Relances"],["activites","⚡ Activités"]].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)} style={{padding:"6px 12px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===id?B.violet:B.card,color:ong===id?"#fff":B.muted,fontFamily:SA}}>{l}</button>
        ))}
      </div>

      {/* Recherche */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>

      {/* ── CLIENTES ── */}
      {ong==="clients"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn sm onClick={()=>{setForm({type_client:"cliente",statut:"actif",pays:"France",fondatrice_id:getFondId()});setModal("cli");}}>+ Nouvelle cliente</Btn>
          </div>
          {lCli&&<div style={{textAlign:"center",padding:"20px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {!lCli&&clientsFiltres.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucune cliente</div>}
          {clientsFiltres.map(c=>(
            <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:800,color:B.cream,fontFamily:FS}}>{c.nom}{c.prenom ? " "+(c.prenom) : ""}</span>
                    {c.niveau_fidelite&&c.niveau_fidelite!=="standard"&&<span style={{fontSize:9,fontWeight:700,color:fideliteColor(c.niveau_fidelite),background:`${fideliteColor(c.niveau_fidelite)}22`,borderRadius:4,padding:"1px 6px"}}>{c.niveau_fidelite}</span>}
                  </div>
                  {c.tel&&<div style={{fontSize:11,color:B.muted}}>{c.tel}</div>}
                  {c.ville&&<div style={{fontSize:11,color:B.muted}}>📍 {c.ville}{c.pole ? " · "+(c.pole) : ""}</div>}
                  {c.preferences&&<div style={{fontSize:11,color:B.muted,marginTop:2}}>💫 {c.preferences}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {(c.ca_total||0)>0&&<div style={{fontSize:14,fontWeight:700,color:B.gold,marginBottom:4}}>{c.ca_total}€</div>}
                  <Bdg s={c.statut||"actif"}/>
                  <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                    <Btn sm v="ghost" onClick={()=>setFicheClient(c)}>📋 Fiche</Btn>
                    <Btn sm v="ghost" onClick={()=>{setForm({...c,_edit:c.id});setModal("cli");}}>✏</Btn>
                    <Btn sm v="danger" onClick={()=>delClient(c.id)}>✕</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROSPECTS ── */}
      {ong==="prospects"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn sm onClick={()=>{setForm({statut:"nouveau",probabilite:50,date_contact:today(),fondatrice_id:getFondId()});setModal("pro");}}>+ Nouveau prospect</Btn>
          </div>
          {lPro&&<div style={{textAlign:"center",padding:"20px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {!lPro&&prospectsFiltres.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucun prospect</div>}
          {prospectsFiltres.map(p=>(
            <div key={p.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS,marginBottom:3}}>{p.nom}{p.prenom ? " "+(p.prenom) : ""}</div>
                  {p.tel&&<div style={{fontSize:11,color:B.muted}}>{p.tel}</div>}
                  {p.interet&&<div style={{fontSize:11,color:B.muted,marginTop:2}}>💡 {p.interet}</div>}
                  {p.date_relance&&<div style={{fontSize:11,color:new Date(p.date_relance)<new Date()?B.warning:B.muted,marginTop:2}}>🔔 Relance : {fmt(p.date_relance)}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <Bdg s={p.statut||"nouveau"}/>
                  {p.probabilite&&<div style={{fontSize:10,color:B.muted,marginTop:3}}>{p.probabilite}% conv.</div>}
                  <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                    {p.statut!=="converti"&&<Btn sm v="gold" onClick={()=>convertirProspect(p)}>→ Client</Btn>}
                    <Btn sm v="ghost" onClick={()=>{setForm({...p,_edit:p.id});setModal("pro");}}>✏</Btn>
                    <Btn sm v="danger" onClick={()=>delProspect(p.id)}>✕</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RELANCES ── */}
      {ong==="relances"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:11,color:B.muted,marginBottom:4}}>Prospects à relancer aujourd'hui ou en retard</div>
          {prospects.filter(p=>p.statut!=="converti"&&p.statut!=="perdu"&&(!p.date_relance||new Date(p.date_relance)<=new Date())).length===0&&(
            <div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>✅ Aucune relance en attente</div>
          )}
          {prospects.filter(p=>p.statut!=="converti"&&p.statut!=="perdu"&&(!p.date_relance||new Date(p.date_relance)<=new Date())).map(p=>(
            <div key={p.id} style={{background:B.card,border:"1px solid rgba(201,168,76,0.4)",borderRadius:13,padding:"12px 14px",borderLeft:`3px solid ${B.gold}`}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{p.nom}{p.prenom ? " "+(p.prenom) : ""}</div>
                  {p.tel&&<div style={{fontSize:11,color:B.muted}}>{p.tel}</div>}
                  {p.interet&&<div style={{fontSize:11,color:B.muted,marginTop:2}}>{p.interet}</div>}
                </div>
                <Btn sm v="gold" onClick={()=>window.open("https://wa.me/"+((p.tel||ENV.WA).replace(/\D/g,""))+"?text=Bonjour "+(p.prenom||p.nom)+", suite à notre échange...","_blank")}>💬 Relancer</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CLIENT */}
      {modal==="cli"&&(
        <Mdl title={form._edit?"Modifier cliente":"Nouvelle cliente"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom de famille"/></Fld>
          <Fld label="Prénom"><Inp value={form.prenom||""} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Prénom"/></Fld>
          <Fld label="Téléphone"><Inp value={form.tel||""} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="+594..."/></Fld>
          <Fld label="Email"><Inp type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@..."/></Fld>
          <Fld label="Ville"><Inp value={form.ville||""} onChange={e=>setForm({...form,ville:e.target.value})} placeholder={ENV.VILLE||"Ville"}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Pôle"><Sel value={form.pole||""} onChange={e=>setForm({...form,pole:e.target.value})} options={["", ...poles.map(p=>p.code)]}/></Fld>
            <Fld label="Fidélité"><Sel value={form.niveau_fidelite||"standard"} onChange={e=>setForm({...form,niveau_fidelite:e.target.value})} options={FIDELITES}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Source"><Sel value={form.source||"WhatsApp"} onChange={e=>setForm({...form,source:e.target.value})} options={SOURCES}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"actif"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_CLI}/></Fld>
          </div>
          <Fld label="Préférences"><Inp value={form.preferences||""} onChange={e=>setForm({...form,preferences:e.target.value})} placeholder="Style, taille, goûts..." rows={2}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes internes" rows={2}/></Fld>
          <Fld label="CA total (€)"><Inp type="number" value={form.ca_total||0} onChange={e=>setForm({...form,ca_total:parseFloat(e.target.value)||0})}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveClient} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}

      {/* MODAL PROSPECT */}
      {modal==="pro"&&(
        <Mdl title={form._edit?"Modifier prospect":"Nouveau prospect"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom"/></Fld>
          <Fld label="Prénom"><Inp value={form.prenom||""} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Prénom"/></Fld>
          <Fld label="Téléphone"><Inp value={form.tel||""} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="+594..."/></Fld>
          <Fld label="Intérêt"><Inp value={form.interet||""} onChange={e=>setForm({...form,interet:e.target.value})} placeholder="Ce qu'il/elle recherche" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Statut"><Sel value={form.statut||"nouveau"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_PRO}/></Fld>
            <Fld label="Pôle"><Sel value={form.pole||""} onChange={e=>setForm({...form,pole:e.target.value})} options={["", ...poles.map(p=>p.code)]}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Source"><Sel value={form.source||"WhatsApp"} onChange={e=>setForm({...form,source:e.target.value})} options={SOURCES}/></Fld>
            <Fld label="Relance"><Inp type="date" value={form.date_relance||""} onChange={e=>setForm({...form,date_relance:e.target.value})}/></Fld>
          </div>
          <Fld label={`Probabilité : ${form.probabilite||50}%`}><input type="range" min={0} max={100} value={form.probabilite||50} onChange={e=>setForm({...form,probabilite:parseInt(e.target.value)})} style={{width:"100%",accentColor:B.violet}}/></Fld>
          <Fld label="Budget estimé (€)"><Inp type="number" value={form.budget_estime||""} onChange={e=>setForm({...form,budget_estime:parseFloat(e.target.value)||null})}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveProspect} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {ong==="activites"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <ActivitesCrmF/>
        </div>
      )}
      {ficheClient && (
        <FicheClientF
          client={ficheClient}
          onClose={() => setFicheClient(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FINANCES — Phase 1 Supabase
// ═══════════════════════════════════════════════════════════
function FinancesP1({ user }) {
  const [ong, setOng] = useState("factures");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [clients, setClients] = useState([]);

  const { data: invoices, loading: lInv, reload: rInv } = useP1Data("invoices", { select: "*", order: "date_emission.desc", limit: 100 }, []);
  const { data: quotes, loading: lQuo, reload: rQuo } = useP1Data("quotes", { select: "*", order: "date_emission.desc", limit: 100 }, []);
  const { data: payments, loading: lPay, reload: rPay } = useP1Data("payments", { select: "*", order: "date_paiement.desc", limit: 100 }, []);
  const { data: expenses, loading: lExp, reload: rExp } = useP1Data("expenses", { select: "*", order: "date_depense.desc", limit: 100 }, []);

  useEffect(() => { sbGet("clients", { select: "id,nom,prenom", order: "nom.asc", limit: 200 }).then(setClients); }, []);

  const getFondId = () => user?.id || "";

  const caTotal = invoices.filter(i=>i.statut==="payée").reduce((s,i)=>s+(parseFloat(i.total_ttc)||0),0);
  const enAttente = invoices.filter(i=>["envoyée","partiellement_payée"].includes(i.statut)).reduce((s,i)=>s+(parseFloat(i.solde_restant)||0),0);
  const depTotal = expenses.reduce((s,e)=>s+(parseFloat(e.montant)||0),0);

  const STATUTS_INV = ["brouillon","envoyée","partiellement_payée","payée","annulée","en_retard"];
  const STATUTS_DEV = ["brouillon","envoyé","accepté","refusé","expiré","converti"];
  const MODES_PMT = ["WhatsApp","SumUp","PayPal","Virement","Revolut","Espèces","Stripe"];
  const CATS_DEP = ["achat_stock","prestataire","transport","marketing","logiciel","bureau","formation","autre"];
  const POLES_CODES = ["BSH","ODYSSEE","EVENTS","FOOD","VILO","INVEST","STRUCTURE","GENERAL"];

  const statutInvColor = s => ({payée:"rgba(80,180,120,0.2)",partiellement_payée:"rgba(201,168,76,0.2)",envoyée:"rgba(124,58,237,0.2)",en_retard:"rgba(180,80,80,0.2)",annulée:"rgba(80,80,80,0.2)",brouillon:"rgba(139,127,168,0.15)"}[s]||"rgba(139,127,168,0.15)");
  const statutInvText = s => ({payée:B.success,partiellement_payée:B.warning,envoyée:B.violetL,en_retard:B.danger,annulée:B.muted,brouillon:B.muted}[s]||B.muted);

  // ── Items multi-lignes (état partagé pour devis et factures)
  const [formItems, setFormItems] = useState([]);

  const addItem = () => setFormItems(it => [...it, {desc:"",qte:1,pu:0,tva:20}]);
  const removeItem = (i) => setFormItems(it => it.filter((_,j)=>j!==i));
  const updateItem = (i, k, v) => setFormItems(it => it.map((x,j)=>j===i?{...x,[k]:v}:x));
  const calcTotalHT = () => formItems.reduce((s,i)=>(parseFloat(i.qte)||0)*(parseFloat(i.pu)||0)+s,0);
  const calcTotalTTC = () => formItems.reduce((s,i)=>{
    const ht=(parseFloat(i.qte)||0)*(parseFloat(i.pu)||0);
    const tva=ht*(parseFloat(i.tva)||20)/100;
    return s+ht+tva;
  },0);

  // ── Ouvrir modal avec items vides
  const ouvrirModalInv = (doc=null) => {
    setForm(doc||{});
    setFormItems(doc?[{desc:doc.objet||"",qte:1,pu:parseFloat(doc.total_ttc)||0,tva:20}]:[{desc:"",qte:1,pu:0,tva:20}]);
    setModal("inv");
  };
  const ouvrirModalDev = (doc=null) => {
    setForm(doc||{});
    setFormItems(doc?[{desc:doc.objet||"",qte:1,pu:parseFloat(doc.total_ttc)||0,tva:20}]:[{desc:"",qte:1,pu:0,tva:20}]);
    setModal("dev");
  };

  const createInvoice = async () => {
    if (!form.client_nom?.trim()) return;
    const totalTTC = formItems.length > 0 ? calcTotalTTC() : parseFloat(form.total_ttc)||0;
    const totalHT  = formItems.length > 0 ? calcTotalHT()  : totalTTC/1.2;
    const inv = await sbPost("invoices", {
      ...form,
      fondatrice_id: getFondId(),
      total_ht:      parseFloat(totalHT.toFixed(2)),
      total_ttc:     parseFloat(totalTTC.toFixed(2)),
      solde_restant: parseFloat(totalTTC.toFixed(2)),
      objet:         formItems.map(i=>i.desc).filter(Boolean).join(", ") || form.objet || "",
    });
    // Sauvegarder les items
    if (inv?.id && formItems.length > 0) {
      for (const [idx, item] of formItems.entries()) {
        if (!item.desc) continue;
        await sbPost("invoice_items", {
          invoice_id:   inv.id,
          designation:  item.desc,
          quantite:     parseFloat(item.qte)||1,
          prix_unitaire:parseFloat(item.pu)||0,
          taux_tva:     parseFloat(item.tva)||20,
          montant_ht:   (parseFloat(item.qte)||1)*(parseFloat(item.pu)||0),
          montant_ttc:  (parseFloat(item.qte)||1)*(parseFloat(item.pu)||0)*(1+(parseFloat(item.tva)||20)/100),
          ordre:        idx+1,
        });
      }
    }
    rInv(); setModal(null); setFormItems([]);
  };

  const createQuote = async () => {
    if (!form.client_nom?.trim()) return;
    const totalTTC = formItems.length > 0 ? calcTotalTTC() : parseFloat(form.total_ttc)||0;
    const totalHT  = formItems.length > 0 ? calcTotalHT()  : totalTTC/1.2;
    const q = await sbPost("quotes", {
      ...form,
      fondatrice_id: getFondId(),
      total_ht:      parseFloat(totalHT.toFixed(2)),
      total_ttc:     parseFloat(totalTTC.toFixed(2)),
      objet:         formItems.map(i=>i.desc).filter(Boolean).join(", ") || form.objet || "",
    });
    if (q?.id && formItems.length > 0) {
      for (const [idx, item] of formItems.entries()) {
        if (!item.desc) continue;
        await sbPost("quote_items", {
          quote_id:     q.id,
          designation:  item.desc,
          quantite:     parseFloat(item.qte)||1,
          prix_unitaire:parseFloat(item.pu)||0,
          taux_tva:     parseFloat(item.tva)||20,
          montant_ht:   (parseFloat(item.qte)||1)*(parseFloat(item.pu)||0),
          montant_ttc:  (parseFloat(item.qte)||1)*(parseFloat(item.pu)||0)*(1+(parseFloat(item.tva)||20)/100),
          ordre:        idx+1,
        });
      }
    }
    rQuo(); setModal(null); setFormItems([]);
  };

  // ── Export PDF (window.print avec mise en forme)
  const exportPDF = (doc, type) => {
    const lignes = formItems.length > 0 ? formItems : [{desc:doc.objet||"—",qte:1,pu:parseFloat(doc.total_ttc)||0,tva:20}];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${type} ${doc.numero||doc.id?.slice(0,8)||""}</title>
<style>
  body{font-family:Georgia,serif;padding:40px;color:#1a1a1a;max-width:700px;margin:auto}
  h1{font-size:24px;color:#7c3aed;margin-bottom:4px}
  .meta{font-size:12px;color:#666;margin-bottom:24px}
  .client{background:#f5f5f5;padding:12px 16px;border-radius:8px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:12px}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px}
  .total{text-align:right;font-size:14px;font-weight:700;margin-top:8px}
  .footer{margin-top:40px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}
</style></head><body>
<h1>Bella'Studio — ${type}</h1>
<div class="meta">N° ${doc.numero||doc.id?.slice(0,8)||"—"} · ${doc.date_emission||new Date().toLocaleDateString("fr-FR")} · Pôle : ${doc.pole||"—"}</div>
<div class="client"><strong>Client :</strong> ${doc.client_nom||"—"}<br/><strong>Objet :</strong> ${doc.objet||"—"}</div>
<table>
<thead><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>TVA</th><th>Total TTC</th></tr></thead>
<tbody>${lignes.map(i=>`<tr><td>${i.desc||"—"}</td><td>${i.qte||1}</td><td>${parseFloat(i.pu||0).toFixed(2)}€</td><td>${i.tva||20}%</td><td>${((parseFloat(i.qte)||1)*(parseFloat(i.pu)||0)*(1+(parseFloat(i.tva)||20)/100)).toFixed(2)}€</td></tr>`).join("")}</tbody>
</table>
<div class="total">Total TTC : <span style="color:#7c3aed">${parseFloat(doc.total_ttc||0).toFixed(2)} €</span></div>
${doc.conditions ? "<p style=\"font-size:11px;color:#666;margin-top:16px\">Conditions : "+(doc.conditions)+"</p>" : ""}
<div class="footer">Bella'Studio · Sinnamary, Guyane française · bella.studio973@hotmail.com</div>
</body></html>`;
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const createPayment = async () => {
    if (!form.montant) return;
    await sbPost("payments", { ...form, fondatrice_id: getFondId() });
    rPay(); rInv(); setModal(null);
  };

  const createExpense = async () => {
    if (!form.designation?.trim() || !form.montant) return;
    await sbPost("expenses", { ...form, fondatrice_id: getFondId() });
    rExp(); setModal(null);
  };

  const patchInvoiceStatut = async (id, statut) => { await sbPatch("invoices", id, { statut, updated_at: new Date().toISOString() }); rInv(); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SH t="Finances" s="Devis · Factures · Paiements · Dépenses"/>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        {[{l:"CA encaissé",v:`${caTotal.toLocaleString("fr")}€`,acc:true},{l:"En attente",v:`${enAttente.toLocaleString("fr")}€`},{l:"Dépenses",v:`${depTotal.toLocaleString("fr")}€`},{l:"Factures",v:invoices.length}].map(s=>(
          <div key={s.l} style={{background:B.card,border:"1px solid "+(s.acc?B.borderG:B.border),borderRadius:12,padding:"12px 11px"}}>
            <div style={{fontSize:20,fontWeight:900,color:s.acc?B.gold:B.violetL,fontFamily:FS}}>{s.v}</div>
            <div style={{fontSize:10,color:B.muted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
        {[["factures","🧾 Factures"],["devis","📋 Devis"],["paiements","💳 Paiements"],["depenses","💸 Dépenses"]].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)} style={{padding:"5px 11px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===id?B.violet:B.card,color:ong===id?"#fff":B.muted,fontFamily:SA,flexShrink:0}}>{l}</button>
        ))}
      </div>

      {/* ── FACTURES ── */}
      {ong==="factures"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn sm onClick={()=>{setForm({statut:"brouillon",date_emission:today(),total_ht:0,total_ttc:0,tva_pct:0,remise_pct:0});setouvrirModalInv();}}>+ Facture</Btn></div>
          {lInv&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {invoices.map(inv=>(
            <div key={inv.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                    <span style={{fontSize:11,color:B.gold,fontWeight:700}}>{inv.numero||"—"}</span>
                    <span style={{background:statutInvColor(inv.statut),color:statutInvText(inv.statut),borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:700}}>{inv.statut}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{inv.client_nom}</div>
                  {inv.objet&&<div style={{fontSize:11,color:B.muted}}>{inv.objet}</div>}
                  <div style={{fontSize:10,color:B.muted,marginTop:2}}>📅 {fmt(inv.date_emission)}{inv.date_echeance ? " · Échéance "+(fmt(inv.date_echeance)) : ""}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:B.gold,fontFamily:FS}}>{(inv.total_ttc||0).toLocaleString("fr")}€</div>
                  {(inv.solde_restant||0)>0&&<div style={{fontSize:10,color:B.warning}}>Reste : {inv.solde_restant}€</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {inv.statut==="envoyée"&&<Btn sm v="gold" onClick={()=>{setForm({invoice_id:inv.id,client_id:inv.client_id,montant:inv.solde_restant,type_paiement:"paiement",date_paiement:today(),statut:"reçu"});setModal("pay");}}>+ Paiement</Btn>}
                {inv.statut==="brouillon"&&<Btn sm v="ghost" onClick={()=>patchInvoiceStatut(inv.id,"envoyée")}>Marquer envoyée</Btn>}
                <Btn sm v="ghost" onClick={()=>exportPDF(inv,"Facture")}>📄 PDF</Btn>
                <Btn sm v="ghost" onClick={()=>{setForm({...inv,_edit:inv.id});setModal("inv");}}>✏</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("invoices",inv.id).then(rInv);}}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DEVIS ── */}
      {ong==="devis"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn sm onClick={()=>{setForm({statut:"brouillon",date_emission:today(),total_ht:0,total_ttc:0,tva_pct:0,remise_pct:0});setouvrirModalDev();}}>+ Devis</Btn></div>
          {lQuo&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {quotes.map(q=>(
            <div key={q.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                    <span style={{fontSize:11,color:B.gold,fontWeight:700}}>{q.numero||"—"}</span>
                    <Bdg s={q.statut}/>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{q.client_nom}</div>
                  {q.objet&&<div style={{fontSize:11,color:B.muted}}>{q.objet}</div>}
                  <div style={{fontSize:10,color:B.muted}}>📅 {fmt(q.date_emission)}{q.date_validite ? " · Valide jusqu'au "+(fmt(q.date_validite)) : ""}</div>
                </div>
                <div style={{fontSize:16,fontWeight:900,color:B.gold,fontFamily:FS}}>{(q.total_ttc||0).toLocaleString("fr")}€</div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <Btn sm v="ghost" onClick={()=>exportPDF(q,"Devis")}>📄 PDF</Btn>
                <Btn sm v="ghost" onClick={()=>{setForm({...q,_edit:q.id});setModal("dev");}}>✏</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("quotes",q.id).then(rQuo);}}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {ong==="paiements"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn sm onClick={()=>{setForm({type_paiement:"paiement",statut:"reçu",date_paiement:today()});setModal("pay");}}>+ Paiement</Btn></div>
          {lPay&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {payments.map(p=>(
            <div key={p.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:B.cream}}>{p.type_paiement} · {p.mode_paiement}</div>
                <div style={{fontSize:10,color:B.muted}}>📅 {fmt(p.date_paiement)}{p.reference ? " · Réf: "+(p.reference) : ""}</div>
                {p.notes&&<div style={{fontSize:10,color:B.muted}}>{p.notes}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:B.gold}}>{(p.montant||0).toLocaleString("fr")}€</div>
                <Bdg s={p.statut}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DÉPENSES ── */}
      {ong==="depenses"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn sm onClick={()=>{setForm({categorie:"autre",date_depense:today(),mode_paiement:"Espèces"});setModal("dep");}}>+ Dépense</Btn></div>
          {lExp&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {expenses.map(e=>(
            <div key={e.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:B.cream}}>{e.designation}</div>
                <div style={{fontSize:10,color:B.muted}}>{e.categorie}{e.pole ? " · "+(e.pole) : ""} · {fmt(e.date_depense)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:B.danger}}>-{(e.montant||0).toLocaleString("fr")}€</div>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("expenses",e.id).then(rExp);}}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {modal==="inv"&&(
        <Mdl title={form._edit?"Modifier facture":"Nouvelle facture"} onClose={()=>{setModal(null);setFormItems([])}}>
          <Fld label="Client *"><Inp value={form.client_nom||""} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom du client"/></Fld>
          <Fld label="Objet (résumé)"><Inp value={form.objet||""} onChange={e=>setForm({...form,objet:e.target.value})} placeholder="Objet global"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Pôle"><Sel value={form.pole||"GENERAL"} onChange={e=>setForm({...form,pole:e.target.value})} options={POLES_CODES}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_INV}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Date émission"><Inp type="date" value={form.date_emission||today()} onChange={e=>setForm({...form,date_emission:e.target.value})}/></Fld>
            <Fld label="Date échéance"><Inp type="date" value={form.date_echeance||""} onChange={e=>setForm({...form,date_echeance:e.target.value})}/></Fld>
          </div>
          {/* Lignes multi-produits */}
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Lignes de facturation</div>
              <button onClick={addItem} style={{fontSize:11,padding:"3px 10px",borderRadius:8,border:"1px solid "+(B.gold),background:`${B.gold}18`,color:B.gold,cursor:"pointer",fontFamily:SA}}>+ Ligne</button>
            </div>
            {formItems.map((it,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr 1fr auto",gap:5,marginBottom:5,alignItems:"center"}}>
                <Inp value={it.desc} onChange={e=>updateItem(i,"desc",e.target.value)} placeholder="Désignation"/>
                <Inp type="number" value={it.qte} onChange={e=>updateItem(i,"qte",e.target.value)} placeholder="Qté"/>
                <Inp type="number" value={it.pu} onChange={e=>updateItem(i,"pu",e.target.value)} placeholder="PU HT"/>
                <Inp type="number" value={it.tva} onChange={e=>updateItem(i,"tva",e.target.value)} placeholder="TVA%"/>
                <button onClick={()=>removeItem(i)} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:6,padding:"4px 7px",color:"#ef4444",cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            ))}
            {formItems.length===0&&<div style={{fontSize:11,color:B.muted,padding:"8px 0"}}>Aucune ligne — cliquez "+ Ligne" ou saisissez un total manuel ci-dessous.</div>}
            {formItems.length>0&&(
              <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:B.gold,marginTop:6}}>
                Total TTC calculé : {calcTotalTTC().toFixed(2)}€
              </div>
            )}
          </div>
          {formItems.length===0&&<Fld label="Total TTC (€) — manuel"><Inp type="number" value={form.total_ttc||0} onChange={e=>setForm({...form,total_ttc:parseFloat(e.target.value)||0})}/></Fld>}
          <Fld label="Conditions"><Inp value={form.conditions||"Paiement à réception."} onChange={e=>setForm({...form,conditions:e.target.value})}/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={createInvoice} full v="gold">Enregistrer</Btn>
            <Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn>
          </div>
        </Mdl>
      )}
      {modal==="dev"&&(
        <Mdl title={form._edit?"Modifier devis":"Nouveau devis"} onClose={()=>{setModal(null);setFormItems([])}}>
          <Fld label="Client *"><Inp value={form.client_nom||""} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom du client"/></Fld>
          <Fld label="Objet (résumé)"><Inp value={form.objet||""} onChange={e=>setForm({...form,objet:e.target.value})} placeholder="Objet global"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Pôle"><Sel value={form.pole||"GENERAL"} onChange={e=>setForm({...form,pole:e.target.value})} options={POLES_CODES}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_DEV}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Date émission"><Inp type="date" value={form.date_emission||today()} onChange={e=>setForm({...form,date_emission:e.target.value})}/></Fld>
            <Fld label="Validité"><Inp type="date" value={form.date_validite||""} onChange={e=>setForm({...form,date_validite:e.target.value})}/></Fld>
          </div>
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Lignes du devis</div>
              <button onClick={addItem} style={{fontSize:11,padding:"3px 10px",borderRadius:8,border:"1px solid "+(B.gold),background:`${B.gold}18`,color:B.gold,cursor:"pointer",fontFamily:SA}}>+ Ligne</button>
            </div>
            {formItems.map((it,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr 1fr auto",gap:5,marginBottom:5,alignItems:"center"}}>
                <Inp value={it.desc} onChange={e=>updateItem(i,"desc",e.target.value)} placeholder="Désignation"/>
                <Inp type="number" value={it.qte} onChange={e=>updateItem(i,"qte",e.target.value)} placeholder="Qté"/>
                <Inp type="number" value={it.pu} onChange={e=>updateItem(i,"pu",e.target.value)} placeholder="PU HT"/>
                <Inp type="number" value={it.tva} onChange={e=>updateItem(i,"tva",e.target.value)} placeholder="TVA%"/>
                <button onClick={()=>removeItem(i)} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:6,padding:"4px 7px",color:"#ef4444",cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            ))}
            {formItems.length===0&&<div style={{fontSize:11,color:B.muted,padding:"8px 0"}}>Aucune ligne — cliquez "+ Ligne" ou saisissez un total manuel.</div>}
            {formItems.length>0&&<div style={{textAlign:"right",fontSize:13,fontWeight:700,color:B.gold,marginTop:6}}>Total TTC : {calcTotalTTC().toFixed(2)}€</div>}
          </div>
          {formItems.length===0&&<Fld label="Total TTC (€) — manuel"><Inp type="number" value={form.total_ttc||0} onChange={e=>setForm({...form,total_ttc:parseFloat(e.target.value)||0})}/></Fld>}
          <Fld label="Conditions"><Inp value={form.conditions||"30% d\'acompte à la signature."} onChange={e=>setForm({...form,conditions:e.target.value})}/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={createQuote} full v="gold">Enregistrer</Btn>
            <Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn>
          </div>
        </Mdl>
      )}
      {modal==="pay"&&(
        <Mdl title="Enregistrer un paiement" onClose={()=>setModal(null)}>
          <Fld label="Montant (€) *"><Inp type="number" value={form.montant||0} onChange={e=>setForm({...form,montant:parseFloat(e.target.value)||0})}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Type"><Sel value={form.type_paiement||"paiement"} onChange={e=>setForm({...form,type_paiement:e.target.value})} options={["acompte","paiement","solde","remboursement"]}/></Fld>
            <Fld label="Mode"><Sel value={form.mode_paiement||"WhatsApp"} onChange={e=>setForm({...form,mode_paiement:e.target.value})} options={MODES_PMT}/></Fld>
          </div>
          <Fld label="Date"><Inp type="date" value={form.date_paiement||today()} onChange={e=>setForm({...form,date_paiement:e.target.value})}/></Fld>
          <Fld label="Référence"><Inp value={form.reference||""} onChange={e=>setForm({...form,reference:e.target.value})} placeholder="N° transaction"/></Fld>
          <Fld label="Facture liée (ID)"><Inp value={form.invoice_id||""} onChange={e=>setForm({...form,invoice_id:e.target.value})} placeholder="UUID de la facture (optionnel)"/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={createPayment} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {modal==="dep"&&(
        <Mdl title="Nouvelle dépense" onClose={()=>setModal(null)}>
          <Fld label="Désignation *"><Inp value={form.designation||""} onChange={e=>setForm({...form,designation:e.target.value})} placeholder="Nom de la dépense"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Montant (€) *"><Inp type="number" value={form.montant||0} onChange={e=>setForm({...form,montant:parseFloat(e.target.value)||0})}/></Fld>
            <Fld label="Catégorie"><Sel value={form.categorie||"autre"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS_DEP}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Pôle"><Sel value={form.pole||"GENERAL"} onChange={e=>setForm({...form,pole:e.target.value})} options={POLES_CODES}/></Fld>
            <Fld label="Mode"><Sel value={form.mode_paiement||"Espèces"} onChange={e=>setForm({...form,mode_paiement:e.target.value})} options={MODES_PMT}/></Fld>
          </div>
          <Fld label="Date"><Inp type="date" value={form.date_depense||today()} onChange={e=>setForm({...form,date_depense:e.target.value})}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={createExpense} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CALENDRIER — Phase 1 Supabase + compte à rebours
// ═══════════════════════════════════════════════════════════
function CalendrierP1({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const { data: events, loading, reload } = useP1Data("calendar_events", { select: "*", order: "date_debut.asc", limit: 200 }, []);
  const aVenir = events.filter(e => new Date(e.date_debut) >= new Date(now.toDateString()) && e.statut !== "annulé");
  const passes = events.filter(e => new Date(e.date_debut) < new Date(now.toDateString()) || e.statut === "annulé");

  const TYPES = ["rdv","evenement","tache","echeance","rappel","autre"];
  const STATUTS = ["planifié","confirmé","annulé","terminé"];
  const COULEURS = [B.violet,"#065f46","#6B1A2B","#1d4ed8","#92400e","#0d9488","#7e22ce"];
  const POLES_CODES = ["BSH","ODYSSEE","EVENTS","FOOD","VILO","INVEST","STRUCTURE","GENERAL"];

  const countdown = (dateStr) => {
    const target = new Date(dateStr);
    const diff = target - now;
    if (diff <= 0) return { label: "Jour J ✦", urgent: true };
    const j = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (j === 0) return { label: `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`, urgent: true };
    if (j <= 7)  return { label: `J-${j}`, urgent: true };
    if (j <= 30) return { label: `J-${j}`, urgent: false };
    return { label: `J-${j}`, urgent: false };
  };

  const save = async () => {
    if (!form.titre?.trim() || !form.date_debut) return;
    const d = { ...form, fondatrice_id: user?.id, updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("calendar_events", form._edit, d);
    else await sbPost("calendar_events", d);
    reload(); setModal(null);
  };

  const TYPE_ICO = { rdv:"📋", evenement:"✨", tache:"◫", echeance:"⏰", rappel:"🔔", autre:"◈" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SH t="Calendrier" s={`${aVenir.length} événement${aVenir.length!==1?"s":""} à venir`}/>
        <Btn sm onClick={()=>{setForm({type_event:"evenement",statut:"planifié",couleur:B.violet,toute_journee:false,compte_rebours:false,alertes_jours:[30,15,7,3,1],date_debut:today()});setModal("evt");}}>+ Événement</Btn>
      </div>

      {/* Heure actuelle */}
      <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:900,color:B.cream,fontFamily:FS,letterSpacing:"0.05em"}}>{now.toLocaleTimeString("fr-FR")}</div>
        <div style={{fontSize:11,color:B.muted}}>{now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>

      {loading&&<div style={{textAlign:"center",padding:"20px",color:B.muted,fontSize:12}}>Chargement…</div>}

      {/* Événements à venir */}
      {aVenir.length===0&&!loading&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucun événement planifié</div>}
      {aVenir.map(e => {
        const cd = countdown(e.date_debut);
        return (
          <div key={e.id} style={{background:B.card,border:"1px solid "+(cd.urgent?"rgba(201,168,76,0.4)":B.border),borderRadius:13,padding:"13px 14px",borderLeft:`3px solid ${e.couleur||B.violet}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:16}}>{TYPE_ICO[e.type_event]||"◈"}</span>
                  <span style={{fontSize:13,fontWeight:700,color:B.cream}}>{e.titre}</span>
                </div>
                {e.lieu&&<div style={{fontSize:10,color:B.muted}}>📍 {e.lieu}</div>}
                <div style={{fontSize:10,color:B.muted,marginTop:1}}>
                  {new Date(e.date_debut).toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"})} {!e.toute_journee&&new Date(e.date_debut).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{marginTop:4}}><Bdg s={e.statut}/></div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:cd.urgent?16:13,fontWeight:800,color:cd.urgent?B.gold:B.violetL,fontFamily:cd.urgent&&FS}}>{cd.label}</div>
                <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                  <Btn sm v="ghost" onClick={()=>{setForm({...e,_edit:e.id});setModal("evt");}}>✏</Btn>
                  <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("calendar_events",e.id).then(reload);}}>✕</Btn>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Événements passés / terminés */}
      {passes.length > 0 && (
        <div>
          <div style={{fontSize:11,fontWeight:700,color:B.muted,marginBottom:7,letterSpacing:"0.06em",textTransform:"uppercase"}}>Terminés / Annulés</div>
          {passes.slice(0,5).map(e=>(
            <div key={e.id} style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:11,padding:"10px 13px",marginBottom:6,opacity:0.6}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{TYPE_ICO[e.type_event]||"◈"} {e.titre}</div>
                  <div style={{fontSize:10,color:B.muted}}>{fmt(e.date_debut)}</div>
                </div>
                <Bdg s={e.statut}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modal==="evt"&&(
        <Mdl title={form._edit?"Modifier":"Nouvel événement"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre de l'événement"/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Type"><Sel value={form.type_event||"evenement"} onChange={e=>setForm({...form,type_event:e.target.value})} options={TYPES}/></Fld>
            <Fld label="Pôle"><Sel value={form.pole||""} onChange={e=>setForm({...form,pole:e.target.value})} options={["", ...POLES_CODES]}/></Fld>
          </div>
          <Fld label="Date et heure de début *"><Inp type="datetime-local" value={form.date_debut||""} onChange={e=>setForm({...form,date_debut:e.target.value})}/></Fld>
          <Fld label="Date et heure de fin"><Inp type="datetime-local" value={form.date_fin||""} onChange={e=>setForm({...form,date_fin:e.target.value})}/></Fld>
          <Fld label="Lieu"><Inp value={form.lieu||""} onChange={e=>setForm({...form,lieu:e.target.value})} placeholder="Lieu"/></Fld>
          <Fld label="Statut"><Sel value={form.statut||"planifié"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS}/></Fld>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.compte_rebours} onChange={e=>setForm({...form,compte_rebours:e.target.checked})} id="cr" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="cr" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Afficher le compte à rebours sur le dashboard</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTS — Phase 1 Supabase
// ═══════════════════════════════════════════════════════════
function DocumentsP1({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filtre, setFiltre] = useState("tous");
  const [search, setSearch] = useState("");

  const { data: docs, loading, reload } = useP1Data("documents", { select: "*", order: "created_at.desc", limit: 200 }, []);
  const { data: templates } = useP1Data("document_templates", { select: "*", order: "nom.asc", limit: 50 }, []);

  const TYPES = ["devis","facture","contrat","reçu","courrier","attestation","checklist","rapport","bon_commande","autre"];
  const STATUTS = ["actif","brouillon","archivé"];
  const POLES = ["BSH","ODYSSEE","EVENTS","FOOD","VILO","INVEST","STRUCTURE","GENERAL"];
  const TYPE_ICO = { devis:"📋", facture:"💰", contrat:"📝", reçu:"🧾", courrier:"✉️", attestation:"📜", checklist:"✅", rapport:"📊", bon_commande:"📦", autre:"📄" };

  const docsFiltres = docs.filter(d => {
    const matchFiltre = filtre === "tous" || d.type_doc === filtre;
    const matchSearch = !search || d.titre.toLowerCase().includes(search.toLowerCase());
    return matchFiltre && matchSearch;
  });

  const save = async () => {
    if (!form.titre?.trim() || !form.type_doc) return;
    const d = { ...form, fondatrice_id: user?.id, updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("documents", form._edit, d);
    else await sbPost("documents", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SH t="Documents" s={`${docs.length} document${docs.length!==1?"s":""}`}/>
        <Btn sm onClick={()=>{setForm({type_doc:"autre",statut:"actif",partage_client:false});setModal("doc");}}>+ Document</Btn>
      </div>

      {/* Recherche */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un document..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>

      {/* Filtres type */}
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
        {["tous",...TYPES].map(t=>(
          <button key={t} onClick={()=>setFiltre(t)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:10,fontWeight:700,background:filtre===t?B.surface:"transparent",color:filtre===t?B.cream:B.muted,flexShrink:0,whiteSpace:"nowrap",fontFamily:SA}}>
            {t==="tous"?"Tous":`${TYPE_ICO[t]||"📄"} ${t}`}
          </button>
        ))}
      </div>

      {/* Modèles disponibles */}
      {templates.length > 0 && (
        <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:B.mutedL,marginBottom:8,letterSpacing:"0.06em",textTransform:"uppercase"}}>Modèles disponibles</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {templates.map(t=>(
              <button key={t.id} onClick={()=>{setForm({titre:(t.nom)+" — "+(new Date().toLocaleDateString("fr-FR")),type_doc:t.type_doc,pole:t.pole,statut:"brouillon",contenu:t.contenu,notes:"Créé depuis le modèle : "+(t.nom)});setModal("doc");}}
                style={{background:`${B.violet}18`,border:"1px solid "+(B.border),borderRadius:8,padding:"5px 10px",color:B.violetL,cursor:"pointer",fontSize:11,fontFamily:SA}}>
                {TYPE_ICO[t.type_doc]||"📄"} {t.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste documents */}
      {loading&&<div style={{textAlign:"center",padding:"20px",color:B.muted,fontSize:12}}>Chargement…</div>}
      {!loading&&docsFiltres.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucun document</div>}
      {docsFiltres.map(d=>(
        <div key={d.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:18}}>{TYPE_ICO[d.type_doc]||"📄"}</span>
                <span style={{fontSize:13,fontWeight:700,color:B.cream}}>{d.titre}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Bdg s={d.statut}/>
                {d.pole&&<span style={{fontSize:9,background:`${B.violet}18`,color:B.violetL,borderRadius:4,padding:"2px 6px",fontWeight:700}}>{d.pole}</span>}
                {d.partage_client&&<span style={{fontSize:9,background:"rgba(80,180,120,0.15)",color:B.success,borderRadius:4,padding:"2px 6px",fontWeight:700}}>Partagé</span>}
                {d.signe&&<span style={{fontSize:9,background:"rgba(201,168,76,0.15)",color:B.gold,borderRadius:4,padding:"2px 6px",fontWeight:700}}>Signé</span>}
              </div>
              {d.notes&&<div style={{fontSize:10,color:B.muted,marginTop:4}}>{d.notes}</div>}
              <div style={{fontSize:9,color:B.muted,marginTop:3}}>Créé le {fmt(d.created_at?.split("T")[0])}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <Btn sm v="ghost" onClick={()=>{setForm({...d,_edit:d.id});setModal("doc");}}>✏</Btn>
              <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("documents",d.id).then(reload);}}>✕</Btn>
            </div>
          </div>
        </div>
      ))}

      {/* MODAL */}
      {modal==="doc"&&(
        <Mdl title={form._edit?"Modifier document":"Nouveau document"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du document"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Type *"><Sel value={form.type_doc||"autre"} onChange={e=>setForm({...form,type_doc:e.target.value})} options={TYPES}/></Fld>
            <Fld label="Pôle"><Sel value={form.pole||""} onChange={e=>setForm({...form,pole:e.target.value})} options={["", ...POLES]}/></Fld>
          </div>
          <Fld label="Statut"><Sel value={form.statut||"actif"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes ou description" rows={3}/></Fld>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.partage_client} onChange={e=>setForm({...form,partage_client:e.target.checked})} id="pc" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="pc" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Visible par la cliente concernée</label>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.signe} onChange={e=>setForm({...form,signe:e.target.checked})} id="sg" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="sg" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Document signé</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODULES EXISTANTS — conservés intégralement
// ═══════════════════════════════════════════════════════════

function BSHF({produits,setProduits,commandes,setCommandes,clientes,setClientes,evenements,setEvenements}) {
  const[sec,setSec]=useState("dash");const[modal,setModal]=useState(null);const[form,setForm]=useState({});
  const[detailCmd,setDetailCmd]=useState(null);
  const majStatut=(id,nouveauStatut)=>{
    setCommandes(p=>p.map(x=>x.id===id?{...x,statut:nouveauStatut}:x));
    setDetailCmd(d=>d&&d.id===id?{...d,statut:nouveauStatut}:d);
  };
  const ca=commandes.filter(c=>c.statut==="Paiement complet reçu"||c.statut==="Terminée").reduce((s,c)=>s+(parseFloat(c.montant)||0),0);
  const crit=produits.filter(p=>p.stock<=p.min);
  const SECS=[{id:"dash",l:"🏠"},{id:"cmds",l:"🧾"},{id:"crm",l:"👥"},{id:"stock",l:"📦"},{id:"evts",l:"📅"},{id:"fin",l:"€"},{id:"params",l:"⚙"}];

  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100%",background:`radial-gradient(ellipse at 10% 0%,${BSH.prune},${BSH.fond} 60%)`}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+(BSH.line),display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontFamily:FS,fontSize:13,color:BSH.or,letterSpacing:2}}>✦ Bella'Secret Home</span>
        <span style={{fontSize:8,color:BSH.cremeD,letterSpacing:2}}>BACK-OFFICE</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-around",padding:"7px",borderBottom:"1px solid "+(BSH.line),background:"rgba(0,0,0,0.2)"}}>
        {SECS.map(s=><button key={s.id} onClick={()=>setSec(s.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderBottom:sec===s.id ? "2px solid "+(BSH.or) : "2px solid transparent"}}><span style={{fontSize:17}}>{s.l}</span></button>)}
      </div>
      <div style={{padding:"12px",color:BSH.creme,fontFamily:SA}}>
        {sec==="dash"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[{ico:"€",v:`${ca}€`,l:"CA",c:BSH.or},{ico:"📦",v:commandes.length,l:"Commandes",c:BSH.rose},{ico:"👥",v:clientes.length,l:"Clientes",c:BSH.vert},{ico:"⚠",v:crit.length,l:"Critique",c:crit.length>0?BSH.rouge:BSH.vert}].map(s=>(
              <div key={s.l} style={{flex:1,minWidth:70,background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:11,padding:"10px 8px",textAlign:"center",borderTop:`3px solid ${s.c}`}}>
                <div style={{fontSize:16,marginBottom:2}}>{s.ico}</div><div style={{fontSize:18,fontWeight:700,color:BSH.creme,fontFamily:FS}}>{s.v}</div><div style={{fontSize:9,color:BSH.cremeD,marginTop:1}}>{s.l}</div>
              </div>
            ))}
          </div>
          {crit.length>0&&<div style={{background:`${BSH.rouge}15`,border:"1px solid "+(BSH.rouge)+("40"),borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:11,fontWeight:700,color:BSH.rouge,marginBottom:6}}>⚠ Stock critique</div>{crit.map(p=><div key={p.id} style={{fontSize:11,color:BSH.creme,marginBottom:3}}>{p.name} — <span style={{color:BSH.rouge}}>{p.stock} restants</span></div>)}</div>}
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:11,padding:"12px"}}><div style={{fontSize:12,fontWeight:700,color:BSH.or,marginBottom:8}}>Dernières commandes</div>{commandes.slice(0,4).map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+(BSH.line)}}><div><div style={{fontSize:11,color:BSH.creme}}>{c.client}</div><div style={{fontSize:10,color:BSH.cremeD}}>{c.produit}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,color:BSH.or,fontWeight:700}}>{c.montant}€</div><BTag c={CMD_C[c.statut]||BSH.bord} sz={8}>{c.statut}</BTag></div></div>)}</div>
        </div>}
        {sec==="cmds"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><BBtn v="gold" sz="sm" onClick={()=>{setForm({statut:"Demande reçue",date:today(),montant:0,acompte:0,pmt:"WhatsApp"});setModal("cmd");}}>+ Nouvelle</BBtn></div>
          {commandes.map(c=><div key={c.id} onClick={()=>setDetailCmd(c)} style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:12,padding:"12px 14px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{display:"flex",gap:5,marginBottom:2}}><span style={{fontSize:10,color:BSH.or,fontWeight:700}}>{c.id}</span><BTag c={CMD_C[c.statut]||BSH.bord} sz={8}>{c.statut}</BTag></div><div style={{fontSize:12,fontWeight:600}}>{c.client}</div><div style={{fontSize:10,color:BSH.cremeD}}>{c.produit} · {c.pmt}</div><div style={{fontSize:9,color:BSH.bord,marginTop:3}}>Toucher pour le détail →</div></div><div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:BSH.or,fontFamily:FS}}>{c.montant}€</div>{c.acompte>0&&<div style={{fontSize:9,color:BSH.cremeD}}>Acompte {c.acompte}€</div>}<div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}><BBtn v="ghost" sz="sm" onClick={(e)=>{e.stopPropagation();setForm({...c,_edit:c.id});setModal("cmd");}}>✏</BBtn><BBtn v="danger" sz="sm" onClick={(e)=>{e.stopPropagation();if(confirm("Supprimer ?"))setCommandes(p=>p.filter(x=>x.id!==c.id));}}>✕</BBtn></div></div></div>
          </div>)}
        </div>}
        {sec==="crm"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><BBtn v="gold" sz="sm" onClick={()=>{setForm({vip:"Bronze",canal:"WhatsApp"});setModal("cli");}}>+ Cliente</BBtn></div>
          {clientes.map(c=><div key={c.id} style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:12,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:13,fontWeight:600}}>{c.nom}</div><div style={{fontSize:10,color:BSH.cremeD}}>{c.ville} · {c.canal}</div>{c.preferences&&<div style={{fontSize:10,color:BSH.cremeD,marginTop:2}}>💫 {c.preferences}</div>}</div><div style={{textAlign:"right"}}><BTag c={VIP_C[c.vip]||BSH.or} sz={9}>{c.vip}</BTag><div style={{fontSize:13,color:BSH.or,fontWeight:700,marginTop:4}}>{c.total||0}€</div><div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}><BBtn v="ghost" sz="sm" onClick={()=>{setForm({...c,_edit:c.id});setModal("cli");}}>✏</BBtn><BBtn v="danger" sz="sm" onClick={()=>{if(confirm("Supprimer ?"))setClientes(p=>p.filter(x=>x.id!==c.id));}}>✕</BBtn></div></div></div>
          </div>)}
        </div>}
        {sec==="stock"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><BBtn v="gold" sz="sm" onClick={()=>{setForm({cat:"Lingerie",prix:0,achat:0,stock:0,min:3,ico:"✨"});setModal("prod");}}>+ Produit</BBtn></div>
          {produits.map(p=><div key={p.id} style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:12,padding:"12px 14px",borderLeft:`3px solid ${p.stock<=p.min?BSH.rouge:BSH.vert}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:BSH.cremeD}}>{p.cat}</div><div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}><BTag c={BSH.or} sz={8}>Vente {p.prix}€</BTag><BTag c={BSH.vert} sz={8}>Marge {p.prix>0?Math.round((p.prix-p.achat)/p.prix*100):0}%</BTag></div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:22,fontWeight:700,color:p.stock<=p.min?BSH.rouge:BSH.vert,fontFamily:FS}}>{p.stock}</div><div style={{fontSize:9,color:BSH.cremeD}}>en stock</div><div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}><BBtn v="ghost" sz="sm" onClick={()=>{setForm({...p,_edit:p.id});setModal("prod");}}>✏</BBtn><BBtn v="danger" sz="sm" onClick={()=>{if(confirm("Supprimer ?"))setProduits(p=>p.filter(x=>x.id!==p.id));}}>✕</BBtn></div></div></div>
          </div>)}
        </div>}
        {sec==="evts"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><BBtn v="gold" sz="sm" onClick={()=>{setForm({ico:"✨",cap:20,dispo:20,prix:25,lieu:ENV.VILLE});setModal("evt");}}>+ Événement</BBtn></div>
          {evenements.map(e=>{const v=e.cap-e.dispo;const pct=e.cap>0?Math.round((v/e.cap)*100):0;return(<div key={e.id} style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:12,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><div><div style={{fontSize:13,fontWeight:700}}>{e.ico} {e.nom}</div><div style={{fontSize:10,color:BSH.cremeD}}>{fmt(e.date)} · {e.lieu}</div></div><BTag c={BSH.or}>{e.prix}€</BTag></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:7}}>{[["Cap.",e.cap],["Vendus",v],["CA",`${v*e.prix}€`]].map(([l,val])=><div key={l} style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"5px 7px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:BSH.creme,fontFamily:FS}}>{val}</div><div style={{fontSize:9,color:BSH.cremeD}}>{l}</div></div>)}</div>
            <div style={{background:"rgba(255,255,255,.04)",borderRadius:3,height:4,marginBottom:5}}><div style={{background:`linear-gradient(90deg,${BSH.bord},${BSH.rose})`,height:"100%",borderRadius:3,width:`${pct}%`}}/></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:BSH.cremeD}}>{pct}% · {e.dispo} restantes</span><div style={{display:"flex",gap:4}}><BBtn v="ghost" sz="sm" onClick={()=>{setForm({...e,_edit:e.id});setModal("evt");}}>✏</BBtn><BBtn v="danger" sz="sm" onClick={()=>{if(confirm("Supprimer ?"))setEvenements(p=>p.filter(x=>x.id!==e.id));}}>✕</BBtn></div></div>
          </div>);})}
        </div>}
        {sec==="fin"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[{v:`${ca}€`,l:"CA encaissé",c:BSH.or},{v:commandes.length>0 ? (Math.round(ca/Math.max(commandes.filter(c=>c.statut==="Paiement complet reçu"||c.statut==="Terminée").length,1)))+"€" : "—",l:"Panier moyen",c:BSH.rose}].map(s=><div key={s.l} style={{flex:1,background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:11,padding:"12px",borderTop:`3px solid ${s.c}`}}><div style={{fontSize:22,fontWeight:700,color:BSH.creme,fontFamily:FS}}>{s.v}</div><div style={{fontSize:10,color:BSH.cremeD,marginTop:2}}>{s.l}</div></div>)}
          </div>
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:11,padding:"12px"}}><div style={{fontSize:12,fontWeight:700,color:BSH.or,marginBottom:8}}>Toutes les commandes</div>{commandes.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+(BSH.line)}}><div><div style={{fontSize:11}}>{c.client}</div><div style={{fontSize:9,color:BSH.cremeD}}>{c.produit}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,color:BSH.or,fontWeight:700}}>{c.montant}€</div><BTag c={CMD_C[c.statut]||BSH.bord} sz={7}>{c.statut}</BTag></div></div>)}</div>
        </div>}
        {sec==="params"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
          {[{t:"Coordonnées",items:[["Nom","Bella'Secret Home"],["Adresse",ENV.ADRESSE],["Ville",`${ENV.VILLE} — ${ENV.PAYS}`],["E-mail",ENV.EMAIL],["WhatsApp",ENV.TEL]]},{t:"Paiements",items:[["SumUp","Principal — Phase 2"],["Stripe","À configurer"],["PayPal",ENV.PAYPAL]]},{t:"Données",items:[["Stockage","Artifact persistant"],["Supabase","Phase 2"],["Sécurité","Fondatrice uniquement"]]}].map(s=>(
            <div key={s.t} style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:12,fontWeight:700,color:BSH.or,marginBottom:8,fontFamily:FS}}>{s.t}</div>{s.items.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${BSH.line}22`,gap:8}}><span style={{fontSize:10,color:BSH.cremeD,flexShrink:0}}>{l}</span><span style={{fontSize:10,color:BSH.creme,textAlign:"right",wordBreak:"break-all"}}>{v}</span></div>)}</div>
          ))}
        </div>}
      </div>

      {/* Modals BSH */}
      {detailCmd&&(()=>{
        const c=detailCmd;
        const montant=parseFloat(c.montant)||0;
        const acompte=parseFloat(c.acompte)||0;
        const solde=Math.max(montant-acompte,0);
        const paye=c.statut==="Paiement complet reçu"||c.statut==="Terminée";
        return(
        <Mdl title={`Commande ${c.id}`} onClose={()=>setDetailCmd(null)}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:BSH.cremeD,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Statut</div>
            <select value={c.statut} onChange={e=>majStatut(c.id,e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid "+(BSH.line),borderRadius:10,padding:"10px 12px",color:BSH.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}>
              {STATUTS_CMD.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:10,padding:"11px 13px",marginBottom:10}}>
            <div style={{fontSize:10,color:BSH.cremeD,marginBottom:3}}>👤 CLIENTE</div>
            <div style={{fontSize:14,fontWeight:700,color:BSH.creme}}>{c.client}</div>
          </div>
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:10,padding:"11px 13px",marginBottom:10}}>
            <div style={{fontSize:10,color:BSH.cremeD,marginBottom:3}}>🛍 PRODUITS</div>
            <div style={{fontSize:13,color:BSH.creme}}>{c.produit}</div>
          </div>
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:10,padding:"11px 13px",marginBottom:10}}>
            <div style={{fontSize:10,color:BSH.cremeD,marginBottom:7}}>💳 PAIEMENT · {c.pmt||"—"}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}><span style={{color:BSH.cremeD}}>Montant total</span><span style={{color:BSH.creme,fontWeight:700}}>{montant.toFixed(2)}€</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}><span style={{color:BSH.cremeD}}>Acompte reçu</span><span style={{color:BSH.or,fontWeight:700}}>{acompte.toFixed(2)}€</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"6px 0 0",borderTop:"1px solid "+(BSH.line),marginTop:5}}><span style={{color:BSH.cremeD}}>Solde restant</span><span style={{color:solde>0?BSH.rouge:BSH.vert,fontWeight:700}}>{solde.toFixed(2)}€</span></div>
          </div>
          <div style={{background:BSH.verre,border:"1px solid "+(BSH.line),borderRadius:10,padding:"11px 13px",marginBottom:10}}>
            <div style={{fontSize:10,color:BSH.cremeD,marginBottom:3}}>🧾 FACTURE</div>
            <div style={{fontSize:12,color:BSH.creme}}>Réf. {c.id} · {c.date||"—"}</div>
            <div style={{fontSize:10,color:BSH.cremeD,marginTop:2}}>{paye?"Facture acquittée":"En attente de règlement"}</div>
          </div>
          <div style={{background:`${BSH.bord}12`,border:"1px solid "+(BSH.line),borderRadius:10,padding:"11px 13px",marginBottom:14}}>
            <div style={{fontSize:10,color:BSH.or,marginBottom:6,fontWeight:700}}>📒 TRACE PRÉ-COMPTABLE</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}><span style={{color:BSH.cremeD}}>Journal</span><span style={{color:BSH.creme}}>Ventes BSH</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}><span style={{color:BSH.cremeD}}>Écriture</span><span style={{color:BSH.creme}}>{paye?"CA encaissé":acompte>0?"Acompte encaissé":"À encaisser"}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}><span style={{color:BSH.cremeD}}>Statut compta</span><span style={{color:paye?BSH.vert:BSH.or}}>{paye?"auto_validé":"brouillon"}</span></div>
            <div style={{fontSize:9,color:BSH.cremeD,marginTop:6,lineHeight:1.5}}>Cette commande alimentera le journal des ventes de la pré-comptabilité Bellaïa.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <BBtn v="ghost" sz="md" onClick={()=>{setForm({...c,_edit:c.id});setDetailCmd(null);setModal("cmd");}}>✏ Modifier</BBtn>
            <BBtn v="gold" sz="md" onClick={()=>setDetailCmd(null)}>Fermer</BBtn>
          </div>
        </Mdl>
      );})()}
      {modal==="cmd"&&<Mdl title={form._edit?"Modifier":"Nouvelle commande"} onClose={()=>setModal(null)}>
        <Fld label="Cliente"><Inp value={form.client||""} onChange={e=>setForm({...form,client:e.target.value})} placeholder="Nom"/></Fld>
        <Fld label="Produit"><Inp value={form.produit||""} onChange={e=>setForm({...form,produit:e.target.value})} placeholder="Produit"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Montant €"><Inp type="number" value={form.montant||0} onChange={e=>setForm({...form,montant:parseFloat(e.target.value)||0})}/></Fld>
          <Fld label="Acompte €"><Inp type="number" value={form.acompte||0} onChange={e=>setForm({...form,acompte:parseFloat(e.target.value)||0})}/></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Statut"><Sel value={form.statut||"Demande reçue"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_CMD}/></Fld>
          <Fld label="Paiement"><Sel value={form.pmt||"WhatsApp"} onChange={e=>setForm({...form,pmt:e.target.value})} options={["WhatsApp","SumUp","Stripe","PayPal","Revolut","Espèces"]}/></Fld>
        </div>
        <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
        <div style={{display:"flex",gap:8}}><Btn onClick={async()=>{if(!form.client?.trim())return;const id=form._edit||"BSH-"+Date.now().toString().slice(-6);if(form._edit)await setCommandes(p=>p.map(x=>x.id===form._edit?{...form,id:form._edit}:x));else await setCommandes(p=>[...p,{...form,id}]);setModal(null);}} full v="gold">Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
      </Mdl>}
      {modal==="cli"&&<Mdl title={form._edit?"Modifier":"Nouvelle cliente"} onClose={()=>setModal(null)}>
        <Fld label="Nom"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom complet"/></Fld>
        <Fld label="Ville"><Inp value={form.ville||""} onChange={e=>setForm({...form,ville:e.target.value})} placeholder="Ville"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Canal"><Sel value={form.canal||"WhatsApp"} onChange={e=>setForm({...form,canal:e.target.value})} options={["WhatsApp","Instagram","TikTok","Événement","Recommandation"]}/></Fld>
          <Fld label="VIP"><Sel value={form.vip||"Bronze"} onChange={e=>setForm({...form,vip:e.target.value})} options={["Bronze","Argent","Or","Diamant"]}/></Fld>
        </div>
        <Fld label="Préférences"><Inp value={form.preferences||""} onChange={e=>setForm({...form,preferences:e.target.value})} placeholder="Style, taille..." rows={2}/></Fld>
        <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes internes" rows={2}/></Fld>
        <div style={{display:"flex",gap:8}}><Btn onClick={async()=>{if(!form.nom?.trim())return;if(form._edit)await setClientes(p=>p.map(x=>x.id===form._edit?{...form,id:form._edit}:x));else await setClientes(p=>[...p,{...form,id:uid(),total:0}]);setModal(null);}} full v="gold">Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
      </Mdl>}
      {modal==="prod"&&<Mdl title={form._edit?"Modifier produit":"Nouveau produit"} onClose={()=>setModal(null)}>
        <Fld label="Nom"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nom"/></Fld>
        <Fld label="Catégorie"><Sel value={form.cat||"Lingerie"} onChange={e=>setForm({...form,cat:e.target.value})} options={["Lingerie","Coffrets","Bougies","Huiles","Parfums","Accessoires","Couples","Mariage","Solo"]}/></Fld>
        <Fld label="Icône emoji"><Inp value={form.ico||"✨"} onChange={e=>setForm({...form,ico:e.target.value})} placeholder="✨"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <Fld label="Prix vente €"><Inp type="number" value={form.prix||0} onChange={e=>setForm({...form,prix:parseFloat(e.target.value)||0})}/></Fld>
          <Fld label="Prix achat €"><Inp type="number" value={form.achat||0} onChange={e=>setForm({...form,achat:parseFloat(e.target.value)||0})}/></Fld>
          <Fld label="Stock"><Inp type="number" value={form.stock||0} onChange={e=>setForm({...form,stock:parseInt(e.target.value)||0})}/></Fld>
        </div>
        <div style={{display:"flex",gap:8}}><Btn onClick={async()=>{if(!form.name?.trim())return;if(form._edit)await setProduits(p=>p.map(x=>x.id===form._edit?{...form,id:form._edit}:x));else await setProduits(p=>[...p,{...form,id:uid()}]);setModal(null);}} full v="gold">Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
      </Mdl>}
      {modal==="evt"&&<Mdl title={form._edit?"Modifier":"Nouvel événement"} onClose={()=>setModal(null)}>
        <Fld label="Nom"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Date"><Inp type="date" value={form.date||""} onChange={e=>setForm({...form,date:e.target.value})}/></Fld>
          <Fld label="Lieu"><Inp value={form.lieu||ENV.VILLE} onChange={e=>setForm({...form,lieu:e.target.value})} placeholder="Lieu"/></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <Fld label="Places"><Inp type="number" value={form.cap||20} onChange={e=>setForm({...form,cap:parseInt(e.target.value)||20})}/></Fld>
          <Fld label="Restantes"><Inp type="number" value={form.dispo||20} onChange={e=>setForm({...form,dispo:parseInt(e.target.value)||20})}/></Fld>
          <Fld label="Prix €"><Inp type="number" value={form.prix||25} onChange={e=>setForm({...form,prix:parseInt(e.target.value)||25})}/></Fld>
        </div>
        <div style={{display:"flex",gap:8}}><Btn onClick={async()=>{if(!form.nom?.trim())return;if(form._edit)await setEvenements(p=>p.map(x=>x.id===form._edit?{...form,id:form._edit}:x));else await setEvenements(p=>[...p,{...form,id:uid(),ico:"✨"}]);setModal(null);}} full v="gold">Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
      </Mdl>}
    </div>
  );
}



function IAF({ user, bshCmds, bshProduits }) {
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: "Bonjour Renée-Lise ✦ Je suis Bellaïa, votre assistante. Je peux analyser vos données, résumer votre activité, rédiger des messages, préparer des devis et détecter les urgences. Comment puis-je vous aider ?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [projets, setProjets] = useState([]);
  const [taches, setTaches] = useState([]);
  const [tab, setTab] = useState("chat");

  // Charger données Supabase pour contexte IA
  useEffect(() => {
    const load = async () => {
      try {
        const [fin, proj, tach] = await Promise.all([
          sbGet("v_dashboard_finances", { select:"*", order:null, limit:1 }),
          sbGet("erp_projets", { select:"id,titre,statut,priorite,avancement,univers", order:"updated_at.desc", limit:10 }),
          sbGet("erp_taches", { select:"id,titre,statut,priorite,echeance,univers", order:"echeance.asc", limit:10 }),
        ]);
        if (fin?.[0]) setKpis(fin[0]);
        if (proj) setProjets(proj);
        if (tach) setTaches(tach);
      } catch {}
    };
    load();
  }, []);

  const ACTIONS_RAPIDES = [
    { label: "📊 Brief du jour", prompt: "Génère un brief de ma journée avec les priorités et urgences en cours." },
    { label: "💰 Résumé finances", prompt: "Résume ma situation financière actuelle et les paiements en attente." },
    { label: "🎯 Projets urgents", prompt: "Quels projets et tâches sont urgents ou en retard ? Propose un plan d'action." },
    { label: "📝 Rédiger un message", prompt: "Aide-moi à rédiger un message professionnel pour un client." },
    { label: "📋 Résumé commandes", prompt: "Résume les dernières commandes BSH et leur statut." },
    { label: "⚡ Actions prioritaires", prompt: "Liste les 5 actions prioritaires que je dois faire aujourd'hui pour Bella'Studio." },
  ];

  const envoyer = async (texte) => {
    const msg = texte || input.trim();
    if (!msg) return;
    setInput("");
    setLoading(true);

    const contexte = `Tu es Bellaïa, assistante IA de Renée-Lise Vilosa, fondatrice de Bella'Studio (Sinnamary, Guyane française).
Tu connais son écosystème : Bella'Secret Home (lingerie), Bella'Odyssée (beauté), Bella'Events (événementiel), Bella'Food (traiteur), Vilo'Assistance (admin), Bella'Structure (modèles numériques), Mo Ti-Péyi (livres jeunesse).
Principe : "Bellaïa prépare. Renée-Lise décide."
Tu ne prends jamais de décision seule. Tu proposes, résumes, rédiges, analyses.

Données actuelles :
${kpis  ? "- CA mois : "+(kpis.ca_mois||0)+"€ | Encaissé : "+(kpis.encaisse_mois||0)+"€ | En attente : "+(kpis.en_attente_pmt||0)+"€" : "- Finances : données en chargement"}
- Projets en cours : ${projets.filter(p=>p.statut==="en_cours").length}/${projets.length}
- Tâches urgentes : ${taches.filter(t=>t.priorite==="urgente"&&t.statut!=="terminé").length}
- Commandes BSH récentes : ${bshCmds?.length||0}
- Produits BSH : ${bshProduits?.length||0}

Projets actifs : ${projets.filter(p=>p.statut==="en_cours").map(p=>`${p.titre} (${p.avancement||0}%)`).join(", ")||"aucun"}
Tâches urgentes : ${taches.filter(t=>t.priorite==="urgente"&&t.statut!=="terminé").map(t=>t.titre).join(", ")||"aucune"}`;

    const nouvellesMsgs = [...msgs, { role: "user", content: msg }];
    setMsgs(nouvellesMsgs);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nouvellesMsgs,
          system: contexte,
          max_tokens: 1000,
        }),
      });
      const d = await r.json();
      const rep = d.content?.[0]?.text || "Désolée, je n'ai pas pu répondre.";
      setMsgs(m => [...m, { role: "assistant", content: rep }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", content: "Connexion IA indisponible. Vérifiez ANTHROPIC_API_KEY dans Vercel." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)",fontFamily:SA}}>
      {/* Header IA */}
      <div style={{padding:"12px 14px 8px",borderBottom:"1px solid "+(B.border)}}>
        <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>◎ IA Bellaïa</div>
        <div style={{fontSize:10,color:B.muted}}>Votre assistante intelligente · Données temps réel</div>
        {/* KPIs rapides */}
        {kpis && (
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            {[
              {l:"CA mois",v:`${kpis.ca_mois||0}€`,c:B.gold},
              {l:"En attente",v:`${kpis.en_attente_pmt||0}€`,c:"#f59e0b"},
              {l:"Projets actifs",v:projets.filter(p=>p.statut==="en_cours").length,c:B.violetL},
              {l:"Tâches urgentes",v:taches.filter(t=>t.priorite==="urgente"&&t.statut!=="terminé").length,c:"#ef4444"},
            ].map(k=>(
              <div key={k.l} style={{background:`${k.c}15`,border:"1px solid "+(k.c)+("40"),borderRadius:8,padding:"5px 10px",textAlign:"center",minWidth:70}}>
                <div style={{fontSize:14,fontWeight:700,color:k.c,fontFamily:FS}}>{k.v}</div>
                <div style={{fontSize:8,color:B.muted,marginTop:1}}>{k.l}</div>
              </div>
            ))}
          </div>
        )}
        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {[{id:"chat",l:"💬 Chat"},
            {id:"urgences",l:`⚡ Urgences (${taches.filter(t=>t.priorite==="urgente"&&t.statut!=="terminé").length})`},
            {id:"projets",l:`🎯 Projets (${projets.filter(p=>p.statut==="en_cours").length})`},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(tab===t.id?B.gold:B.border),background:tab===t.id?(B.gold+"18"):"transparent",color:tab===t.id?B.gold:B.muted,cursor:"pointer",fontSize:10,fontWeight:tab===t.id?700:400,fontFamily:SA}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab : Chat */}
      {tab === "chat" && (<>
        {/* Actions rapides */}
        <div style={{padding:"10px 12px",borderBottom:"1px solid "+(B.border),display:"flex",gap:7,overflowX:"auto",flexShrink:0,WebkitOverflowScrolling:"touch"}}>
          {ACTIONS_RAPIDES.map(a=>(
            <button key={a.label} onClick={()=>envoyer(a.prompt)} disabled={loading}
              style={{padding:"6px 11px",borderRadius:20,border:"1px solid "+(B.border),background:"rgba(124,58,237,0.1)",color:B.violetL,cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:SA,whiteSpace:"nowrap",flexShrink:0}}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"82%",padding:"10px 13px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?"linear-gradient(135deg,"+(B.violet)+",#9333ea)":"rgba(255,255,255,0.06)",border:m.role==="assistant"?"1px solid "+(B.border):"none",fontSize:12,lineHeight:1.65,color:B.cream,whiteSpace:"pre-wrap"}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{padding:"10px 14px",borderRadius:14,background:`rgba(255,255,255,0.06)`,border:"1px solid "+(B.border),fontSize:12,color:B.muted}}>
                ◎ Bellaïa réfléchit…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{padding:"10px 12px",borderTop:"1px solid "+(B.border),display:"flex",gap:8,flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();envoyer();}}}
            placeholder="Message à Bellaïa…"
            style={{flex:1,background:`rgba(255,255,255,0.05)`,border:"1px solid "+(B.border),borderRadius:12,padding:"9px 13px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA}}/>
          <button onClick={()=>envoyer()} disabled={loading||!input.trim()}
            style={{background:`linear-gradient(135deg,${B.violet},#9333ea)`,border:"none",borderRadius:12,padding:"9px 14px",color:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer",fontSize:14,opacity:loading||!input.trim()?0.5:1}}>
            ➤
          </button>
        </div>
      </>)}

      {/* Tab : Urgences */}
      {tab === "urgences" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
          {taches.filter(t=>t.statut!=="terminé").sort((a,b)=>{
            const p={urgente:0,haute:1,normale:2,basse:3};
            return (p[a.priorite]||2)-(p[b.priorite]||2);
          }).map(t=>(
            <div key={t.id} style={{background:`rgba(255,255,255,0.04)`,border:"1px solid "+(t.priorite==="urgente"?"#ef4444":t.priorite==="haute"?"#f59e0b":B.border),borderRadius:12,padding:"10px 13px",borderLeft:`3px solid ${t.priorite==="urgente"?"#ef4444":t.priorite==="haute"?"#f59e0b":B.violetL}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{t.titre}</div>
                <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:t.priorite==="urgente"?"rgba(239,68,68,0.2)":t.priorite==="haute"?"rgba(245,158,11,0.2)":"rgba(124,58,237,0.2)",color:t.priorite==="urgente"?"#ef4444":t.priorite==="haute"?"#f59e0b":B.violetL,fontWeight:700}}>
                  {t.priorite}
                </span>
              </div>
              <div style={{fontSize:10,color:B.muted,marginTop:3}}>{t.univers} · {t.echeance||"sans échéance"}</div>
            </div>
          ))}
          {taches.filter(t=>t.statut!=="terminé").length===0 && (
            <div style={{textAlign:"center",color:B.muted,fontSize:13,marginTop:40}}>✅ Aucune tâche urgente en cours</div>
          )}
        </div>
      )}

      {/* Tab : Projets */}
      {tab === "projets" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
          {projets.filter(p=>p.statut==="en_cours").map(p=>(
            <div key={p.id} style={{background:`rgba(255,255,255,0.04)`,border:"1px solid "+(B.border),borderRadius:12,padding:"10px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{p.titre}</div>
                <span style={{fontSize:10,color:B.gold,fontWeight:700}}>{p.avancement||0}%</span>
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${p.avancement||0}%`,background:`linear-gradient(90deg,${B.violet},${B.gold})`,borderRadius:99}}/>
              </div>
              <div style={{fontSize:10,color:B.muted,marginTop:5}}>{p.univers} · {p.priorite}</div>
            </div>
          ))}
          {projets.filter(p=>p.statut==="en_cours").length===0 && (
            <div style={{textAlign:"center",color:B.muted,fontSize:13,marginTop:40}}>Aucun projet en cours</div>
          )}
        </div>
      )}
    </div>
  );
}


function EcranConnexion({ onConnecte }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const connexion = async () => {
    if (!email.trim() || !password.trim()) { setErreur("Renseignez votre email et mot de passe."); return; }
    setLoading(true); setErreur("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await r.json();
      if (!r.ok) { setErreur(d.error || "Connexion échouée."); setLoading(false); return; }
      if (typeof window !== "undefined") {
        localStorage.setItem("bellaia_user", JSON.stringify(d.user));
        if (d.session?.access_token) localStorage.setItem("bellaia_token", d.session.access_token);
      }
      onConnecte(d.user);
    } catch { setErreur("Erreur réseau. Réessayez."); }
    setLoading(false);
  };

  const inscription = async () => {
    if (!email.trim() || !password.trim()) { setErreur("Email et mot de passe requis."); return; }
    if (!dateNaissance) { setErreur("La date de naissance est obligatoire."); return; }
    if (password.length < 6) { setErreur("Le mot de passe doit faire au moins 6 caractères."); return; }
    setLoading(true); setErreur(""); setSucces("");
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), password,
          prenom: prenom.trim(), nom: nom.trim(),
          telephone: telephone.trim(), date_naissance: dateNaissance,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErreur(d.error || "Inscription échouée."); setLoading(false); return; }
      if (d.besoinConfirmation) {
        setSucces("Compte créé ! Vérifiez votre boîte mail et cliquez sur le lien de confirmation, puis connectez-vous.");
        setMode("login");
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem("bellaia_user", JSON.stringify(d.user));
          if (d.session?.access_token) localStorage.setItem("bellaia_token", d.session.access_token);
        }
        onConnecte(d.user);
      }
    } catch { setErreur("Erreur réseau. Réessayez."); }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 30% 0%,rgba(124,58,237,0.3),${B.night} 65%)`,fontFamily:SA,alignItems:"center",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{textAlign:"center",maxWidth:340,width:"100%"}}>
        {/* Logo */}
        <div style={{width:64,height:64,borderRadius:18,background:`linear-gradient(135deg,${B.violet},${B.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 16px",boxShadow:`0 8px 32px rgba(124,58,237,0.3)`}}>◎</div>
        <div style={{fontFamily:FS,fontSize:28,fontWeight:900,color:B.cream,letterSpacing:"-0.03em",marginBottom:4}}>Bellaïa</div>
        <div style={{fontSize:10,color:B.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:32}}>Bella'Studio Hub</div>

        {/* Formulaire */}
        <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:18,padding:"24px 20px",textAlign:"left"}}>
          <div style={{fontSize:14,fontWeight:800,color:B.cream,fontFamily:FS,marginBottom:18,textAlign:"center"}}>{mode==="login"?"Connexion":"Créer un compte"}</div>

          {erreur && <div style={{background:"rgba(180,80,80,0.2)",border:"1px solid rgba(180,80,80,0.4)",borderRadius:10,padding:"9px 12px",color:B.danger,fontSize:12,marginBottom:14,lineHeight:1.5}}>{erreur}</div>}
          {succes && <div style={{background:"rgba(80,180,120,0.15)",border:"1px solid rgba(80,180,120,0.4)",borderRadius:10,padding:"9px 12px",color:"#7dd6a0",fontSize:12,marginBottom:14,lineHeight:1.5}}>{succes}</div>}

          {mode==="signup" && (
            <>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Prénom</label>
                  <input value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Prénom" style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Nom</label>
                  <input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Nom" style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Téléphone</label>
                <input type="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="+594 ..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Date de naissance *</label>
                <input type="date" value={dateNaissance} onChange={e=>setDateNaissance(e.target.value)} style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
                <div style={{fontSize:10,color:B.muted,marginTop:4}}>Obligatoire pour vérifier votre âge (certains espaces sont réservés aux majeurs).</div>
              </div>
            </>
          )}

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Email</label>
            <input
              type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(mode==="login"?connexion():inscription())}
              placeholder="votre@email.com"
              style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}
            />
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(mode==="login"?connexion():inscription())}
              placeholder="••••••••"
              style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"10px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}
            />
          </div>

          <button onClick={mode==="login"?connexion:inscription} disabled={loading} style={{width:"100%",background:`linear-gradient(135deg,${B.violet},#5b21b6)`,border:"none",borderRadius:10,padding:"12px",color:"#fff",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:SA}}>
            {loading ? (mode==="login"?"Connexion…":"Création…") : (mode==="login"?"Se connecter":"Créer mon compte")}
          </button>

          <div style={{textAlign:"center",marginTop:16,fontSize:12,color:B.muted}}>
            {mode==="login" ? (
              <>Pas encore de compte ? <span onClick={()=>{setMode("signup");setErreur("");setSucces("");}} style={{color:B.gold,fontWeight:700,cursor:"pointer"}}>Créer un compte</span></>
            ) : (
              <>Déjà inscrite ? <span onClick={()=>{setMode("login");setErreur("");setSucces("");}} style={{color:B.gold,fontWeight:700,cursor:"pointer"}}>Se connecter</span></>
            )}
          </div>
        </div>

        {/* Demande d'accès */}
        <div style={{marginTop:20,background:"rgba(255,255,255,0.03)",border:"1px solid "+(B.border),borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:12,color:B.muted,marginBottom:10,lineHeight:1.6}}>Pas encore de compte ?<br/>Contactez la fondatrice pour un accès.</div>
          <button onClick={()=>window.open(WA("Bonjour, je souhaite accéder à la plateforme Bellaïa / Bella'Studio."),"_blank")}
            style={{width:"100%",background:"transparent",border:"1px solid rgba(201,168,76,0.4)",borderRadius:10,padding:"10px",color:B.gold,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:SA}}>
            💬 Demander un accès via WhatsApp
          </button>
        </div>

        <div style={{marginTop:20,fontSize:10,color:B.muted}}>Bella'Studio · {ENV.VILLE}, {ENV.PAYS}</div>
        <div style={{marginTop:8,fontSize:9,color:B.gold,letterSpacing:"0.1em",fontWeight:700}}>{BUILD_VERSION}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT CONNECTÉ — données isolées par user_id
// ═══════════════════════════════════════════════════════════
function PortailClient({ user, produits, evenements, onLogout, onNewCommande }) {
  const [activeUnivers, setActiveUnivers] = useState(null);
  const [mesCommandes, setMesCommandes] = useState([]);
  const [mesReservations, setMesReservations] = useState([]);

  // Charger les données du client connecté
  useEffect(() => {
    const charger = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bellaia_token") : null;
        if (!token) return;
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
        // Commandes du client
        const r1 = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/commandes_client?user_id=eq.${user.id}&order=created_at.desc`, { headers: { ...headers, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
        if (r1.ok) { const d = await r1.json(); setMesCommandes(d); }
        // Réservations du client
        const r2 = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations_client?user_id=eq.${user.id}&order=created_at.desc`, { headers: { ...headers, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
        if (r2.ok) { const d = await r2.json(); setMesReservations(d); }
      } catch {}
    };
    charger();
  }, [user.id]);

  // ── Garde RBAC : bloque TOUT module non autorisé (mineur, accès direct URL inclus)
  if (activeUnivers && !moduleAutorise(activeUnivers, user)) {
    const uObj = UNIVERS_CLIENT.find(u => u.id === activeUnivers);
    return (
      <div style={{minHeight:"100vh",background:"#0d0b12",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:"#e8dcc8",marginBottom:8,fontFamily:"Georgia,serif"}}>Accès restreint</div>
        <div style={{fontSize:13,color:"#9a8fa5",marginBottom:8,maxWidth:320,lineHeight:1.6}}>{MSG_MODULE_MINEUR}</div>
        {uObj && <div style={{fontSize:12,color:"#7a7088",marginBottom:24}}>{uObj.ico} {uObj.nom}</div>}
        <button onClick={() => setActiveUnivers(null)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 20px",color:"#e8dcc8",fontSize:13,cursor:"pointer"}}>← Retour au portail</button>
      </div>
    );
  }
  if (activeUnivers === "bsh") return <ClientBSH produits={produits} evenements={evenements} onBack={() => setActiveUnivers(null)} onNewCommande={onNewCommande}/>;
  if (activeUnivers === "bo")  return <ClientOdyssee user={user} rdvs={mesReservations} onBack={() => setActiveUnivers(null)}/>;
  if (activeUnivers === "bev") return <ClientEvents onBack={() => setActiveUnivers(null)} onNewCommande={onNewCommande}/>;
  if (activeUnivers)           return <PlaceholderUnivers univers={activeUnivers} onBack={() => setActiveUnivers(null)}/>;

  const UNIVERS_CLIENT = [
    {id:"bsh",  nom:"Bella'Secret Home",   tag:"Lingerie & Boutique",    ico:"✦",  acc:"#6B1A2B"},
    {id:"bo",   nom:"Bella'Odyssée",       tag:"Beauté & Rendez-vous",    ico:"💅", acc:"#3730a3"},
    {id:"bev",  nom:"Bella'Events",        tag:"Événements & Soirées",    ico:"✨", acc:"#065f46"},
    {id:"bfd",  nom:"Bella'Food",          tag:"Traiteur & Menus",        ico:"🍃", acc:"#15803d"},
    {id:"vilo", nom:"Vilo'Assistance",     tag:"Assistance Administrative",ico:"📋", acc:"#1d4ed8"},
    {id:"bse",  nom:"Bella'Studio Éditions",tag:"Ebooks & Formations",   ico:"📚", acc:"#92400e"},
    {id:"mtp",  nom:"Mo Ti-Péyi",          tag:"Livres jeunesse Guyane",  ico:"🌺", acc:"#7e22ce"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:B.night,fontFamily:SA,color:B.cream}}>
      {/* Header client — aucun bouton back-office */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+(B.border),display:"flex",justifyContent:"space-between",alignItems:"center",background:B.deep,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${B.violet},${B.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◎</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS}}>Bella'Studio</div>
            <div style={{fontSize:9,color:B.muted,letterSpacing:"0.08em"}}>{[user.prenom,user.nom].filter(Boolean).join(" ")||user.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"1px solid "+(B.border),borderRadius:8,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>Déconnexion</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 24px"}}>
        {/* Bonjour */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:FS,fontSize:20,fontWeight:800,color:B.cream,marginBottom:4}}>Bonjour{user.prenom ? ", "+(user.prenom) : user.nom ? ", "+(user.nom.split(" ")[0]) : ""} ✦</div>
          <div style={{fontSize:12,color:B.muted}}>Bienvenue dans votre espace Bella'Studio</div>
        </div>

        {/* Mes commandes récentes */}
        {mesCommandes.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:800,color:B.cream,marginBottom:10}}>Mes commandes récentes</div>
            {mesCommandes.slice(0,3).map(c => (
              <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"10px 13px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:B.gold,fontWeight:700,marginBottom:2}}>{c.id}</div>
                    <div style={{fontSize:12,color:B.cream}}>{c.produit}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:B.gold}}>{c.montant}€</div>
                    <Bdg s={c.statut}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Univers */}
        <div style={{fontSize:13,fontWeight:800,color:B.cream,marginBottom:12}}>Nos univers</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {UNIVERS_CLIENT.map(u => {
            const verrou = !moduleAutorise(u.id, user);
            return (
            <button key={u.id} onClick={() => verrou ? alert(MSG_MODULE_MINEUR) : setActiveUnivers(u.id)} style={{background:verrou?"rgba(255,255,255,0.03)":`linear-gradient(135deg,${u.acc}18,${u.acc}08)`,border:verrou?"1px solid rgba(255,255,255,0.08)":`1px solid ${u.acc}40`,borderRadius:14,padding:"14px 16px",cursor:"pointer",textAlign:"left",fontFamily:SA,width:"100%",opacity:verrou?0.5:1}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:11,background:verrou?"rgba(255,255,255,0.06)":`${u.acc}25`,border:verrou?"1px solid rgba(255,255,255,0.1)":`1px solid ${u.acc}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,filter:verrou?"grayscale(1)":"none"}}>{verrou?"🔒":u.ico}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:verrou?"rgba(255,255,255,0.6)":"#fff",fontFamily:FS,marginBottom:2}}>{u.nom}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{verrou?"Réservé aux majeurs":u.tag}</div>
                </div>
                <span style={{color:verrou?"rgba(255,255,255,0.3)":`${u.acc}88`,fontSize:18}}>{verrou?"🔒":"›"}</span>
              </div>
            </button>
          );})}
        </div>

        {/* Contact */}
        <div style={{marginTop:16,background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:B.muted,marginBottom:8}}>Une question ? Contactez-nous</div>
          <button onClick={()=>window.open(WA(),"_blank")} style={{background:"transparent",border:"1px solid rgba(201,168,76,0.4)",borderRadius:9,padding:"8px 16px",color:B.gold,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:SA}}>💬 WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ESPACE HÔTE — données isolées par user_id
// ═══════════════════════════════════════════════════════════
function EspaceHote({ user, onLogout }) {
  const [ong, setOng] = useState("planning");
  const [missions, setMissions] = useState([]);
  const [contrats, setContrats] = useState([]);
  const ONGS = [{id:"planning",l:"📅 Planning"},{id:"missions",l:"🎯 Missions"},{id:"contrats",l:"📝 Contrats"},{id:"docs",l:"📄 Documents"},{id:"messages",l:"💬 Contact"},{id:"profil",l:"👤 Profil"}];

  useEffect(() => {
    const charger = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bellaia_token") : null;
        if (!token) return;
        const h = { "Authorization": `Bearer ${token}`, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "Content-Type": "application/json" };
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const r1 = await fetch(`${base}/rest/v1/missions_hote?user_id=eq.${user.id}&order=date.asc`, { headers: h });
        if (r1.ok) setMissions(await r1.json());
        const r2 = await fetch(`${base}/rest/v1/contrats?user_id=eq.${user.id}&order=created_at.desc`, { headers: h });
        if (r2.ok) setContrats(await r2.json());
      } catch {}
    };
    charger();
  }, [user.id]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,#0d2420,${B.night} 65%)`,fontFamily:SA,color:B.cream}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(13,148,136,0.3)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🎭</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS}}>Espace Hôte / Talent</div>
            <div style={{fontSize:9,color:"rgba(13,148,136,0.8)"}}>{[user.prenom,user.nom].filter(Boolean).join(" ")||user.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>Déconnexion</button>
      </div>
      <div style={{display:"flex",gap:0,overflowX:"auto",padding:"7px 12px",borderBottom:"1px solid rgba(13,148,136,0.2)",background:"rgba(0,0,0,0.15)",flexShrink:0}}>
        {ONGS.map(o=><button key={o.id} onClick={()=>setOng(o.id)} style={{padding:"5px 11px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===o.id?"#0d9488":"transparent",color:ong===o.id?"#fff":"rgba(255,255,255,0.4)",whiteSpace:"nowrap",fontFamily:SA,marginRight:4}}>{o.l}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 24px"}}>

        {ong==="planning"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mon Planning" s="Missions confirmées"/>
            {missions.filter(m=>m.statut==="Confirmée"||m.statut==="Acceptée").length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucune mission planifiée pour l'instant.</div>}
            {missions.filter(m=>m.statut==="Confirmée"||m.statut==="Acceptée").map(m=>(
              <div key={m.id} style={{background:"rgba(13,148,136,0.1)",border:"1px solid rgba(13,148,136,0.3)",borderRadius:13,padding:"13px 15px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{fontSize:13,fontWeight:700,color:B.cream}}>{m.titre}</div><Bdg s={m.statut}/></div>
                <div style={{fontSize:11,color:B.muted}}>{m.date&&`📅 ${fmt(m.date)}`}{m.lieu&&` · 📍 ${m.lieu}`}</div>
                {m.cachet>0&&<div style={{fontSize:13,fontWeight:700,color:"#0d9488",marginTop:5}}>💰 {m.cachet}€</div>}
              </div>
            ))}
          </div>
        )}

        {ong==="missions"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mes Missions" s="Toutes les propositions"/>
            {missions.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucune mission reçue pour l'instant.</div>}
            {missions.map(m=>(
              <div key={m.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 15px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontSize:13,fontWeight:700,color:B.cream}}>{m.titre}</div><Bdg s={m.statut}/></div>
                {m.description&&<div style={{fontSize:11,color:B.muted,marginBottom:6,lineHeight:1.5}}>{m.description}</div>}
                <div style={{fontSize:11,color:B.muted,marginBottom:6}}>{m.date&&`📅 ${fmt(m.date)}`}{m.lieu&&` · 📍 ${m.lieu}`}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {m.cachet>0&&<span style={{fontSize:13,fontWeight:700,color:B.gold}}>💰 {m.cachet}€</span>}
                  {m.statut==="Proposée"&&<Btn sm v="success" onClick={()=>window.open(WA("Bonjour, j'accepte la mission : "+(m.titre)),"_blank")}>Accepter →</Btn>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ong==="contrats"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mes Contrats"/>
            {contrats.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucun contrat pour l'instant.</div>}
            {contrats.map(c=>(
              <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:B.cream,fontWeight:600}}>{c.titre}</span><span style={{background:c.statut==="Signé"?"rgba(80,180,120,0.2)":"rgba(201,168,76,0.2)",color:c.statut==="Signé"?B.success:B.warning,borderRadius:99,padding:"3px 9px",fontSize:10,fontWeight:700}}>{c.statut}</span></div>
                {c.date_creation&&<div style={{fontSize:11,color:B.muted,marginBottom:6}}>📅 {fmt(c.date_creation)}</div>}
                {c.statut==="À signer"&&<Btn sm v="gold" onClick={()=>window.open(WA("Bonjour, je souhaite signer le contrat : "+(c.titre)),"_blank")}>Signer via WhatsApp →</Btn>}
              </div>
            ))}
          </div>
        )}

        {ong==="docs"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <SH t="Documents"/>
            {["Manuel Hôtesse BSH","Charte Éthique","Guide Tenues & Style","Politique Confidentialité"].map(d=>(
              <div key={d} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:11,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:B.cream}}>📄 {d}</span>
                <Btn sm v="ghost" onClick={()=>window.open(WA(),"_blank")}>Demander</Btn>
              </div>
            ))}
          </div>
        )}

        {ong==="messages"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Contact"/>
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"14px"}}>
              <div style={{fontSize:12,color:B.muted,marginBottom:12,lineHeight:1.7}}>Pour toute communication avec Bella'Studio, contactez directement la fondatrice via WhatsApp.</div>
              <Btn v="gold" full onClick={()=>window.open(WA(),"_blank")}>💬 Contacter la fondatrice</Btn>
            </div>
          </div>
        )}

        {ong==="profil"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mon Profil"/>
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:44,marginBottom:10}}>🎭</div>
              <div style={{fontSize:15,fontWeight:700,color:B.cream,marginBottom:3}}>{[user.prenom,user.nom].filter(Boolean).join(" ")||"Hôte / Talent"}</div>
              <div style={{fontSize:12,color:B.muted,marginBottom:14}}>{user.email}</div>
              <Btn v="ghost" full onClick={()=>window.open(WA("Bonjour, je souhaite mettre à jour mon profil."),"_blank")}>Modifier mon profil →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ESPACE PARTENAIRE — données isolées par user_id
// ═══════════════════════════════════════════════════════════
function EspacePartenaire({ user, onLogout }) {
  const [ong, setOng] = useState("collaborations");
  const [collabs, setCollabs] = useState([]);
  const [factures, setFactures] = useState([]);
  const [contrats, setContrats] = useState([]);
  const ONGS = [{id:"collaborations",l:"🤝 Collaborations"},{id:"factures",l:"💰 Factures"},{id:"contrats",l:"📝 Contrats"},{id:"docs",l:"📄 Documents"},{id:"messages",l:"💬 Contact"},{id:"profil",l:"👤 Profil"}];

  useEffect(() => {
    const charger = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bellaia_token") : null;
        if (!token) return;
        const h = { "Authorization": `Bearer ${token}`, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "Content-Type": "application/json" };
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const r1 = await fetch(`${base}/rest/v1/collaborations_partenaire?user_id=eq.${user.id}&order=created_at.desc`, { headers: h });
        if (r1.ok) setCollabs(await r1.json());
        const r2 = await fetch(`${base}/rest/v1/factures_partenaire?user_id=eq.${user.id}&order=created_at.desc`, { headers: h });
        if (r2.ok) setFactures(await r2.json());
        const r3 = await fetch(`${base}/rest/v1/contrats?user_id=eq.${user.id}&order=created_at.desc`, { headers: h });
        if (r3.ok) setContrats(await r3.json());
      } catch {}
    };
    charger();
  }, [user.id]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,#2d1a04,${B.night} 65%)`,fontFamily:SA,color:B.cream}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(180,83,9,0.3)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🤝</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS}}>Espace Partenaire</div>
            <div style={{fontSize:9,color:"rgba(180,83,9,0.8)"}}>{[user.prenom,user.nom].filter(Boolean).join(" ")||user.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>Déconnexion</button>
      </div>
      <div style={{display:"flex",gap:0,overflowX:"auto",padding:"7px 12px",borderBottom:"1px solid rgba(180,83,9,0.2)",background:"rgba(0,0,0,0.15)",flexShrink:0}}>
        {ONGS.map(o=><button key={o.id} onClick={()=>setOng(o.id)} style={{padding:"5px 11px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===o.id?"#b45309":"transparent",color:ong===o.id?"#fff":"rgba(255,255,255,0.4)",whiteSpace:"nowrap",fontFamily:SA,marginRight:4}}>{o.l}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 24px"}}>

        {ong==="collaborations"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mes Collaborations"/>
            {collabs.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucune collaboration active pour l'instant.</div>}
            {collabs.map(c=>(
              <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 15px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontSize:13,fontWeight:700,color:B.cream}}>{c.titre}</div><Bdg s={c.statut}/></div>
                {c.type&&<div style={{fontSize:11,color:B.muted,marginBottom:5}}>🏷 {c.type}</div>}
                {c.montant>0&&<div style={{fontSize:14,fontWeight:700,color:B.gold}}>{c.montant}€</div>}
              </div>
            ))}
            <button onClick={()=>window.open(WA("Bonjour, je souhaite proposer une nouvelle collaboration"),"_blank")} style={{background:"transparent",border:"1px solid rgba(180,83,9,0.4)",borderRadius:10,padding:"10px",color:"#b45309",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:SA,marginTop:6}}>+ Proposer une collaboration</button>
          </div>
        )}

        {ong==="factures"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mes Factures"/>
            {factures.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucune facture pour l'instant.</div>}
            {factures.map(f=>(
              <div key={f.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:B.cream,fontWeight:600}}>{f.titre}</span><span style={{background:f.statut==="Payée"?"rgba(80,180,120,0.2)":"rgba(201,168,76,0.2)",color:f.statut==="Payée"?B.success:B.warning,borderRadius:99,padding:"3px 8px",fontSize:10,fontWeight:700}}>{f.statut}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:14,fontWeight:700,color:B.gold}}>{f.montant}€</span>{f.date_emission&&<span style={{fontSize:11,color:B.muted}}>📅 {fmt(f.date_emission)}</span>}</div>
              </div>
            ))}
          </div>
        )}

        {ong==="contrats"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mes Contrats"/>
            {contrats.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Aucun contrat pour l'instant.</div>}
            {contrats.map(c=>(
              <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:B.cream,fontWeight:600}}>{c.titre}</span><span style={{background:c.statut==="Signé"?"rgba(80,180,120,0.2)":"rgba(201,168,76,0.2)",color:c.statut==="Signé"?B.success:B.warning,borderRadius:99,padding:"3px 8px",fontSize:10,fontWeight:700}}>{c.statut}</span></div>
                {c.date_creation&&<div style={{fontSize:11,color:B.muted,marginBottom:6}}>📅 {fmt(c.date_creation)}</div>}
                {c.statut==="À signer"&&<Btn sm v="gold" onClick={()=>window.open(WA("Bonjour, je souhaite signer : "+(c.titre)),"_blank")}>Signer →</Btn>}
              </div>
            ))}
          </div>
        )}

        {ong==="docs"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <SH t="Documents Partenaires"/>
            {["Charte Partenariat BSH","Guide Événements","Politique Image & Communication","Tarifs Collaboration 2026"].map(d=>(
              <div key={d} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:11,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:B.cream}}>📄 {d}</span>
                <Btn sm v="ghost" onClick={()=>window.open(WA(),"_blank")}>Demander</Btn>
              </div>
            ))}
          </div>
        )}

        {ong==="messages"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Contact"/>
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"14px"}}>
              <div style={{fontSize:12,color:B.muted,marginBottom:12,lineHeight:1.7}}>Contactez directement la fondatrice pour toute question relative à votre partenariat.</div>
              <Btn v="gold" full onClick={()=>window.open(WA("Bonjour, je suis partenaire Bella'Studio"),"_blank")}>💬 Contacter la fondatrice</Btn>
            </div>
          </div>
        )}

        {ong==="profil"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SH t="Mon Profil"/>
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:44,marginBottom:10}}>🤝</div>
              <div style={{fontSize:15,fontWeight:700,color:B.cream,marginBottom:3}}>{[user.prenom,user.nom].filter(Boolean).join(" ")||"Partenaire"}</div>
              <div style={{fontSize:12,color:B.muted,marginBottom:14}}>{user.email}</div>
              <Btn v="ghost" full onClick={()=>window.open(WA("Bonjour, je souhaite mettre à jour mon profil partenaire."),"_blank")}>Modifier mon profil →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// BIBLIOTHÈQUE ÉDITORIALE — Module complet Phase éditoriale
// ═══════════════════════════════════════════════════════════
function BibliothequeF({ user }) {
  const [ong, setOng] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [projetActif, setProjetActif] = useState(null);
  const [tomeActif, setTomeActif] = useState(null);
  const [iaAction, setIaAction] = useState("");
  const [iaResult, setIaResult] = useState("");
  const [iaLoading, setIaLoading] = useState(false);

  const { data: collections, reload: rCol } = useP1Data("collections", { select: "*", order: "ordre.asc" }, []);
  const { data: projets, reload: rPro }     = useP1Data("projets_editoriaux", { select: "*", order: "updated_at.desc" }, []);
  const { data: tomes, reload: rTom }       = useP1Data("tomes", { select: "*", order: "numero.asc" }, []);
  const { data: chapitres, reload: rChap }  = useP1Data("chapitres", { select: "*", order: "numero.asc" }, []);
  const { data: kpis }                      = useP1Data("v_bibliotheque_dashboard", { select: "*", order: null, limit: 1 }, []);

  const getFondId = () => user?.id || "";

  // Filtres contextuels
  const tomesProjet  = tomes.filter(t => t.projet_id === projetActif?.id);
  const chapTome     = chapitres.filter(c => c.tome_id === tomeActif?.id);

  // Couleurs statut
  const sCol = s => ({
    en_cours:"rgba(124,58,237,0.2)", validé:"rgba(80,180,120,0.2)",
    publié:"rgba(201,168,76,0.2)", idée:"rgba(139,127,168,0.18)",
    en_revision:"rgba(200,120,40,0.2)", archivé:"rgba(80,80,80,0.2)",
    brouillon:"rgba(139,127,168,0.15)"
  }[s]||"rgba(139,127,168,0.18)");
  const sTxt = s => ({
    en_cours:B.violetL, validé:B.success, publié:B.gold,
    idée:B.mutedL, en_revision:B.warning, archivé:B.muted, brouillon:B.muted
  }[s]||B.muted);

  const STATUTS_PROJ = ["idée","en_cours","en_revision","validé","publié","archivé"];
  const TYPES_PROJ   = ["livre","album","cahier","ebook","formation","fiche_pedagogique","affiche","kit","autre"];
  const STATUTS_CHAP = ["brouillon","en_cours","en_revision","validé"];
  const TYPES_CHAP   = ["texte","exercice","activite","coloriage","imagier","puzzle","evaluation","fiche_pedagogique"];
  const PLATEFORMES  = ["Ko-fi","Amazon KDP","Gumroad","Direct","Multiple"];
  const NIVEAUX      = ["Maternelle","CP","CE1","CE2","CM1","CM2","Collège","Tous niveaux"];
  const PUBLICS      = ["Enfants 2-4 ans","Enfants 3-6 ans","Enfants 5-8 ans","Enfants 6-12 ans","Ados","Adultes","Familles","Enseignants","Parents"];

  // ── ACTIONS IA
  const IA_ACTIONS = [
    { id:"terminer_chapitre",    label:"✍ Terminer ce chapitre",         need:"chapitre" },
    { id:"reecrire_chapitre",    label:"🔄 Réécrire ce chapitre",         need:"chapitre" },
    { id:"exercices",            label:"📝 Créer les exercices",           need:"chapitre" },
    { id:"fiche_pedagogique",    label:"🎓 Créer la fiche pédagogique",   need:"chapitre" },
    { id:"evaluation",           label:"📊 Créer l'évaluation",           need:"chapitre" },
    { id:"activites_manuelles",  label:"🎨 Créer les activités manuelles",need:"chapitre" },
    { id:"coloriage",            label:"🖍 Décrire le coloriage associé", need:"chapitre" },
    { id:"quatrieme",            label:"📖 4ème de couverture",           need:"projet"   },
    { id:"fiche_kofi",           label:"🛍 Fiche produit Ko-fi",          need:"projet"   },
    { id:"description_kdp",      label:"📦 Description Amazon KDP",       need:"projet"   },
    { id:"resume_commercial",    label:"💼 Résumé commercial",            need:"projet"   },
    { id:"terminer_tome",        label:"📚 Plan de fin de tome",           need:"tome"     },
  ];

  const lancerIA = async (action, contexte) => {
    setIaLoading(true); setIaResult("");
    const projInfo = projetActif ? "Projet : \""+(projetActif.titre)+"\" | Public : "+(projetActif.public_cible||"—")+" | Type : "+(projetActif.type_projet) : "";
    const tomeInfo = tomeActif ? "Tome "+(tomeActif.numero)+" : \""+(tomeActif.titre)+"\" | Résumé : "+(tomeActif.resume||"—") : "";
    const chapInfo = contexte?.contenu ? "Chapitre "+(contexte.numero)+" : \""+(contexte.titre)+"\"\nContenu actuel :\n"+(contexte.contenu.slice(0,1500)) : "";

    const PROMPTS = {
      terminer_chapitre: `Tu es Bellaïa, assistante éditoriale de Renée-Lise Vilosa. ${projInfo}. ${tomeInfo}. ${chapInfo}. Termine ce chapitre de manière cohérente avec le ton et le public cible. Réponds directement avec le texte à ajouter, sans explication.`,
      reecrire_chapitre: `Tu es Bellaïa, assistante éditoriale. ${projInfo}. ${tomeInfo}. ${chapInfo}. Réécris ce chapitre en améliorant la clarté, le rythme et l'adaptation au public cible. Réponds avec le texte réécrit complet.`,
      exercices: `Tu es Bellaïa, assistante pédagogique. ${projInfo}. ${chapInfo}. Crée 5 exercices variés adaptés au public cible (QCM, vrai/faux, compléter, relier, créer). Format clair et structuré.`,
      fiche_pedagogique: `Tu es Bellaïa. ${projInfo}. ${chapInfo}. Crée une fiche pédagogique complète : objectifs, compétences, matériel, déroulement, prolongements. Format Markdown.`,
      evaluation: `Tu es Bellaïa. ${projInfo}. ${chapInfo}. Crée une évaluation formative : 10 questions progressives avec corrigé. Adaptée au public cible.`,
      activites_manuelles: `Tu es Bellaïa. ${projInfo}. ${chapInfo}. Propose 3 activités manuelles créatives liées à ce chapitre. Matériel simple, réalisable à la maison. Format étapes claires.`,
      coloriage: `Tu es Bellaïa. ${projInfo}. ${chapInfo}. Décris précisément une scène de coloriage à illustrer pour ce chapitre. Description détaillée pour un illustrateur : personnages, décor, ambiance, style.`,
      quatrieme: `Tu es Bellaïa, éditrice. ${projInfo}. Rédige une 4ème de couverture accrocheuse et commerciale (150 mots max). Ton adapté au public cible.`,
      fiche_kofi: `Tu es Bellaïa. ${projInfo}. Rédige une fiche produit Ko-fi complète : titre accrocheur, description, contenu inclus, public cible, bénéfices, appel à l'action. Prête à copier-coller.`,
      description_kdp: `Tu es Bellaïa. ${projInfo}. Rédige une description Amazon KDP optimisée SEO (500 mots) : hook, présentation, contenu, bénéfices, public cible, mots-clés. Format HTML basique.`,
      resume_commercial: `Tu es Bellaïa. ${projInfo}. Rédige un résumé commercial court (100 mots) pour réseaux sociaux et catalogue. Percutant et adapté au public.`,
      terminer_tome: `Tu es Bellaïa, éditrice. ${projInfo}. ${tomeInfo}. Propose un plan détaillé pour terminer ce tome : chapitres restants, arcs narratifs, progression logique, conclusion. Format structuré.`,
    };

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "Tu es Bellaïa, assistante éditoriale de Renée-Lise Vilosa. Tu connais l'ensemble des projets éditoriaux de Bella'Studio. Tu rédiges en français, avec élégance et précision, toujours adapté au public cible spécifié.",
          messages: [{ role: "user", content: PROMPTS[action] || action }]
        })
      });
      const d = await r.json();
      setIaResult(d.content?.[0]?.text || "Impossible de générer.");
    } catch { setIaResult("Erreur de connexion."); }
    setIaLoading(false);
  };

  // CRUD helpers
  const saveCollection = async () => {
    if (!form.nom?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId() };
    delete d._edit;
    if (form._edit) await sbPatch("collections", form._edit, d);
    else await sbPost("collections", d);
    rCol(); setModal(null);
  };

  const saveProjet = async () => {
    if (!form.titre?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("projets_editoriaux", form._edit, d);
    else await sbPost("projets_editoriaux", d);
    rPro(); setModal(null);
  };

  const saveTome = async () => {
    if (!form.titre?.trim() || !form.projet_id) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("tomes", form._edit, d);
    else await sbPost("tomes", d);
    rTom(); setModal(null);
  };

  const saveChapitre = async () => {
    if (!form.titre?.trim() || !form.tome_id) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("chapitres", form._edit, d);
    else await sbPost("chapitres", d);
    rChap(); setModal(null);
  };

  const ONGS = [
    {id:"dashboard",l:"◈ Vue"},
    {id:"collections",l:"📚 Collections"},
    {id:"projets",l:"📖 Projets"},
    {id:"redaction",l:"✍ Rédaction"},
    {id:"ia",l:"◎ IA"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SH t="Bibliothèque Éditoriale" s="Projets · Tomes · Chapitres · IA"/>

      {/* Onglets */}
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
        {ONGS.map(o=>(
          <button key={o.id} onClick={()=>setOng(o.id)} style={{padding:"5px 11px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===o.id?B.violet:B.card,color:ong===o.id?"#fff":B.muted,fontFamily:SA,flexShrink:0}}>{o.l}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {ong==="dashboard"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {[
              {l:"Projets",v:kpis[0]?.nb_projets_total||projets.length,acc:true},
              {l:"En cours",v:kpis[0]?.nb_en_cours||projets.filter(p=>p.statut==="en_cours").length},
              {l:"Chapitres",v:kpis[0]?.nb_chapitres_total||chapitres.length},
              {l:"Mots écrits",v:(kpis[0]?.nb_mots_total||0).toLocaleString("fr"),acc:true},
            ].map(s=>(
              <div key={s.l} style={{background:B.card,border:"1px solid "+(s.acc?B.borderG:B.border),borderRadius:12,padding:"12px 11px"}}>
                <div style={{fontSize:20,fontWeight:900,color:s.acc?B.gold:B.violetL,fontFamily:FS}}>{s.v}</div>
                <div style={{fontSize:10,color:B.muted,marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Projets récents */}
          <div style={{fontSize:12,fontWeight:800,color:B.cream,marginBottom:4}}>Projets récents</div>
          {projets.slice(0,5).map(p=>(
            <div key={p.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px",cursor:"pointer"}} onClick={()=>{setProjetActif(p);setOng("redaction");}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:700,color:B.cream,fontFamily:FS}}>{p.titre}</span>
                <span style={{background:sCol(p.statut),color:sTxt(p.statut),borderRadius:99,padding:"2px 8px",fontSize:9,fontWeight:700}}>{p.statut}</span>
              </div>
              <PBar v={p.avancement||0}/>
              <div style={{fontSize:10,color:B.muted,marginTop:3}}>{p.avancement||0}% · {p.type_projet} · {p.public_cible||"—"}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── COLLECTIONS ── */}
      {ong==="collections"&&(
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn sm onClick={()=>{setForm({actif:true,ordre:collections.length,couleur:B.violet,icone:"📚",pole:"STRUCTURE"});setModal("col");}}>+ Collection</Btn>
          </div>
          {collections.map(c=>{
            const pp = projets.filter(p=>p.collection_id===c.id);
            return (
              <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px",borderLeft:`3px solid ${c.couleur||B.violet}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:22}}>{c.icone||"📚"}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS}}>{c.nom}</div>
                      {c.public_cible&&<div style={{fontSize:10,color:B.muted}}>{c.public_cible}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:B.violetL,fontWeight:700}}>{pp.length} projet{pp.length!==1?"s":""}</div>
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <Btn sm v="ghost" onClick={()=>{setForm({...c,_edit:c.id});setModal("col");}}>✏</Btn>
                      <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("collections",c.id).then(rCol);}}>✕</Btn>
                    </div>
                  </div>
                </div>
                {c.description&&<div style={{fontSize:11,color:B.muted,lineHeight:1.5}}>{c.description}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PROJETS ── */}
      {ong==="projets"&&(
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn sm onClick={()=>{setForm({statut:"idée",avancement:0,type_projet:"livre",langue:"Français"});setModal("pro");}}>+ Projet</Btn>
          </div>
          {projets.map(p=>{
            const col = collections.find(c=>c.id===p.collection_id);
            return (
              <div key={p.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:B.cream,fontFamily:FS,marginBottom:2}}>{p.titre}</div>
                    {col&&<div style={{fontSize:10,color:B.violetL}}>{col.icone} {col.nom}</div>}
                    <div style={{fontSize:10,color:B.muted}}>{p.type_projet} · {p.public_cible||"—"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <span style={{background:sCol(p.statut),color:sTxt(p.statut),borderRadius:99,padding:"2px 8px",fontSize:9,fontWeight:700,display:"block",marginBottom:4}}>{p.statut}</span>
                    {p.prix_vente&&<span style={{fontSize:11,color:B.gold,fontWeight:700}}>{p.prix_vente}€</span>}
                  </div>
                </div>
                <PBar v={p.avancement||0}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:8}}>
                  <span style={{fontSize:10,color:B.violetL,fontWeight:700}}>{p.avancement||0}%</span>
                  {p.plateforme&&<span style={{fontSize:9,color:B.muted}}>{p.plateforme}</span>}
                </div>
                <div style={{display:"flex",gap:5}}>
                  <Btn sm v="primary" onClick={()=>{setProjetActif(p);setOng("redaction");}}>✍ Ouvrir</Btn>
                  <Btn sm v="ghost" onClick={()=>{setForm({...p,_edit:p.id});setModal("pro");}}>✏</Btn>
                  <Btn sm v="ghost" onClick={()=>{setIaAction("");setProjetActif(p);setOng("ia");}}>◎ IA</Btn>
                  <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("projets_editoriaux",p.id).then(rPro);}}>✕</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RÉDACTION ── */}
      {ong==="redaction"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Sélecteur projet */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:5}}>Projet actif</label>
            <select value={projetActif?.id||""} onChange={e=>{const p=projets.find(x=>x.id===e.target.value);setProjetActif(p||null);setTomeActif(null);}} style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA}}>
              <option value="">— Sélectionner un projet —</option>
              {projets.map(p=><option key={p.id} value={p.id}>{p.titre}</option>)}
            </select>
          </div>

          {projetActif&&(
            <>
              {/* Header projet */}
              <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:14,fontWeight:800,color:B.cream,fontFamily:FS,marginBottom:3}}>{projetActif.titre}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{background:sCol(projetActif.statut),color:sTxt(projetActif.statut),borderRadius:99,padding:"2px 8px",fontSize:9,fontWeight:700}}>{projetActif.statut}</span>
                  <span style={{fontSize:10,color:B.muted}}>{projetActif.avancement||0}% · {projetActif.type_projet}</span>
                </div>
              </div>

              {/* Tomes */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:800,color:B.cream}}>Tomes ({tomesProjet.length})</span>
                <Btn sm onClick={()=>{setForm({projet_id:projetActif.id,statut:"en_cours",avancement:0,numero:(tomesProjet.length||0)+1,titre:"Tome "+((tomesProjet.length||0)+1)});setModal("tome");}}>+ Tome</Btn>
              </div>

              {tomesProjet.map(t=>(
                <div key={t.id} style={{background:B.card,border:"1px solid "+(tomeActif?.id===t.id?"rgba(124,58,237,0.5)":B.border),borderRadius:12,padding:"11px 13px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{cursor:"pointer"}} onClick={()=>setTomeActif(tomeActif?.id===t.id?null:t)}>
                      <div style={{fontSize:12,fontWeight:700,color:B.cream}}>Tome {t.numero} — {t.titre}</div>
                      {t.resume&&<div style={{fontSize:10,color:B.muted,lineHeight:1.4}}>{t.resume.slice(0,80)}…</div>}
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <Btn sm v="ghost" onClick={()=>{setForm({...t,_edit:t.id});setModal("tome");}}>✏</Btn>
                      <Btn sm v="ghost" onClick={()=>{setTomeActif(t);setIaAction("terminer_tome");setOng("ia");}}>◎</Btn>
                    </div>
                  </div>
                  <PBar v={t.avancement||0}/>

                  {/* Chapitres du tome actif */}
                  {tomeActif?.id===t.id&&(
                    <div style={{marginTop:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                        <span style={{fontSize:11,fontWeight:700,color:B.violetL}}>Chapitres ({chapTome.length})</span>
                        <Btn sm onClick={()=>{setForm({tome_id:t.id,statut:"brouillon",type_contenu:"texte",numero:(chapTome.length||0)+1,titre:"Chapitre "+((chapTome.length||0)+1)});setModal("chap");}}>+ Chapitre</Btn>
                      </div>
                      {chapTome.map(ch=>(
                        <div key={ch.id} style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 11px",marginBottom:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:700,color:B.cream}}>Ch.{ch.numero} — {ch.titre}</div>
                              <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                                <span style={{background:sCol(ch.statut),color:sTxt(ch.statut),borderRadius:99,padding:"1px 6px",fontSize:8,fontWeight:700}}>{ch.statut}</span>
                                {ch.nb_mots&&<span style={{fontSize:9,color:B.muted}}>{ch.nb_mots} mots</span>}
                                <span style={{fontSize:9,color:B.muted}}>{ch.type_contenu}</span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              <Btn sm v="ghost" onClick={()=>{setForm({...ch,_edit:ch.id});setModal("chap");}}>✏</Btn>
                              <Btn sm v="ghost" onClick={()=>{setTomeActif(t);setIaAction(ch.statut==="validé"?"reecrire_chapitre":"terminer_chapitre");setModal({type:"ia_chap",ch});setOng("ia");}}>◎</Btn>
                              <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("chapitres",ch.id).then(rChap);}}>✕</Btn>
                            </div>
                          </div>
                          {ch.contenu&&<div style={{fontSize:10,color:B.muted,lineHeight:1.5,marginTop:4,borderTop:"1px solid "+(B.border),paddingTop:5}}>{ch.contenu.slice(0,150)}{ch.contenu.length>150?"…":""}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── IA BELLAÏA ÉDITORIALE ── */}
      {ong==="ia"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <SH t="Bellaïa Éditoriale" s="Génération de contenu assistée par IA"/>

          {/* Contexte actif */}
          <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 14px"}}>
            <div style={{fontSize:11,fontWeight:700,color:B.mutedL,marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>Contexte actif</div>
            {projetActif ? (
              <div style={{fontSize:12,color:B.cream}}>📖 {projetActif.titre}{tomeActif ? " · Tome "+(tomeActif.numero)+" : "+(tomeActif.titre) : ""}</div>
            ) : (
              <div style={{fontSize:12,color:B.muted}}>Aucun projet sélectionné — va dans Rédaction pour sélectionner un projet</div>
            )}
          </div>

          {/* Actions IA */}
          <div style={{fontSize:11,fontWeight:700,color:B.mutedL,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>Actions disponibles</div>
          {["projet","tome","chapitre"].map(cat=>{
            const actions = IA_ACTIONS.filter(a=>a.need===cat);
            const catLabel = {projet:"📖 Projet",tome:"📚 Tome",chapitre:"✍ Chapitre"}[cat];
            return (
              <div key={cat} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
                <div style={{fontSize:10,fontWeight:700,color:B.mutedL,marginBottom:8,letterSpacing:"0.06em",textTransform:"uppercase"}}>{catLabel}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {actions.map(a=>(
                    <button key={a.id} onClick={()=>lancerIA(a.id, null)} disabled={iaLoading||!projetActif}
                      style={{padding:"6px 11px",borderRadius:8,border:"1px solid "+(B.border),background:B.surface,color:projetActif?B.cream:B.muted,cursor:projetActif?"pointer":"not-allowed",fontSize:11,fontFamily:SA,fontWeight:600}}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Résultat IA */}
          {iaLoading&&(
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:13,color:B.gold}}>✦ Bellaïa rédige…</div>
            </div>
          )}
          {iaResult&&(
            <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:12,fontWeight:700,color:B.gold}}>✦ Résultat Bellaïa</span>
                <div style={{display:"flex",gap:6}}>
                  <Btn sm v="ghost" onClick={()=>{navigator.clipboard?.writeText(iaResult);}}>📋 Copier</Btn>
                  <Btn sm v="danger" onClick={()=>setIaResult("")}>✕</Btn>
                </div>
              </div>
              <div style={{fontSize:12,color:B.cream,lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:400,overflowY:"auto"}}>{iaResult}</div>
            </div>
          )}

          {/* Requête libre */}
          <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:11,fontWeight:700,color:B.mutedL,marginBottom:8,letterSpacing:"0.06em",textTransform:"uppercase"}}>Requête libre</div>
            <textarea value={iaAction} onChange={e=>setIaAction(e.target.value)} placeholder="Ex : Crée le plan du chapitre 3 sur les animaux de Guyane..." rows={3} style={{width:"100%",background:B.card,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,resize:"vertical",boxSizing:"border-box",marginBottom:8}}/>
            <Btn v="primary" full disabled={!iaAction.trim()||iaLoading||!projetActif} onClick={()=>lancerIA(iaAction, null)}>◎ Demander à Bellaïa</Btn>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal==="col"&&(
        <Mdl title={form._edit?"Modifier collection":"Nouvelle collection"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom de la collection"/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Icône emoji"><Inp value={form.icone||"📚"} onChange={e=>setForm({...form,icone:e.target.value})}/></Fld>
            <Fld label="Couleur hex"><Inp value={form.couleur||B.violet} onChange={e=>setForm({...form,couleur:e.target.value})}/></Fld>
          </div>
          <Fld label="Public cible"><Inp value={form.public_cible||""} onChange={e=>setForm({...form,public_cible:e.target.value})} placeholder="Ex: Enfants 3-6 ans"/></Fld>
          <Fld label="Pôle"><Sel value={form.pole||"STRUCTURE"} onChange={e=>setForm({...form,pole:e.target.value})} options={["STRUCTURE","EVENTS","GENERAL"]}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveCollection} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {modal==="pro"&&(
        <Mdl title={form._edit?"Modifier projet":"Nouveau projet éditorial"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du projet"/></Fld>
          <Fld label="Sous-titre"><Inp value={form.sous_titre||""} onChange={e=>setForm({...form,sous_titre:e.target.value})} placeholder="Sous-titre (optionnel)"/></Fld>
          <Fld label="Collection"><select value={form.collection_id||""} onChange={e=>setForm({...form,collection_id:e.target.value})} style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA}}><option value="">— Aucune —</option>{collections.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}</select></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Type"><Sel value={form.type_projet||"livre"} onChange={e=>setForm({...form,type_projet:e.target.value})} options={TYPES_PROJ}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"idée"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_PROJ}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Niveau"><Sel value={form.niveau||""} onChange={e=>setForm({...form,niveau:e.target.value})} options={["", ...NIVEAUX]}/></Fld>
            <Fld label="Public cible"><Sel value={form.public_cible||""} onChange={e=>setForm({...form,public_cible:e.target.value})} options={["", ...PUBLICS]}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Plateforme"><Sel value={form.plateforme||""} onChange={e=>setForm({...form,plateforme:e.target.value})} options={["", ...PLATEFORMES]}/></Fld>
            <Fld label="Prix vente €"><Inp type="number" value={form.prix_vente||""} onChange={e=>setForm({...form,prix_vente:parseFloat(e.target.value)||null})}/></Fld>
          </div>
          <Fld label={`Avancement : ${form.avancement||0}%`}><input type="range" min={0} max={100} value={form.avancement||0} onChange={e=>setForm({...form,avancement:parseInt(e.target.value)})} style={{width:"100%",accentColor:B.violet}}/></Fld>
          <Fld label="Description / Notes"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description du projet" rows={3}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveProjet} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {modal==="tome"&&(
        <Mdl title={form._edit?"Modifier tome":"Nouveau tome"} onClose={()=>setModal(null)}>
          <Fld label="Numéro"><Inp type="number" value={form.numero||1} onChange={e=>setForm({...form,numero:parseInt(e.target.value)||1})}/></Fld>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du tome"/></Fld>
          <Fld label="Résumé"><Inp value={form.resume||""} onChange={e=>setForm({...form,resume:e.target.value})} placeholder="Résumé du tome" rows={3}/></Fld>
          <Fld label="Statut"><Sel value={form.statut||"en_cours"} onChange={e=>setForm({...form,statut:e.target.value})} options={["en_cours","en_revision","validé","publié"]}/></Fld>
          <Fld label={`Avancement : ${form.avancement||0}%`}><input type="range" min={0} max={100} value={form.avancement||0} onChange={e=>setForm({...form,avancement:parseInt(e.target.value)})} style={{width:"100%",accentColor:B.violet}}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveTome} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {modal==="chap"&&(
        <Mdl title={form._edit?"Modifier chapitre":"Nouveau chapitre"} onClose={()=>setModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 3fr",gap:10}}>
            <Fld label="N°"><Inp type="number" value={form.numero||1} onChange={e=>setForm({...form,numero:parseInt(e.target.value)||1})}/></Fld>
            <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du chapitre"/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Type"><Sel value={form.type_contenu||"texte"} onChange={e=>setForm({...form,type_contenu:e.target.value})} options={TYPES_CHAP}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS_CHAP}/></Fld>
          </div>
          <Fld label="Contenu (Markdown)"><Inp value={form.contenu||""} onChange={e=>setForm({...form,contenu:e.target.value})} placeholder="Contenu du chapitre..." rows={8}/></Fld>
          <Fld label="Notes auteur (internes)"><Inp value={form.notes_auteur||""} onChange={e=>setForm({...form,notes_auteur:e.target.value})} placeholder="Notes non publiées" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveChapitre} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ── Placeholder pôle fondatrice (modules Phase 2+)

// ═══════════════════════════════════════════════════════════
// BELLA'STRUCTURE — Bibliothèque de modèles numériques
// ═══════════════════════════════════════════════════════════
function BellaStructureF({ user }) {
  const [ong, setOng] = useState("bibliotheque");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [filtCat, setFiltCat] = useState("tous");

  const { data: modeles, reload: rMod } = useP1Data("structure_modeles", { select:"*", order:"categorie.asc,ordre.asc", limit:200 }, []);
  const { data: backlog, reload: rBack } = useP1Data("structure_backlog", { select:"*", order:"created_at.desc", limit:100 }, []);

  const CATS = ["tous","Flyers","Catalogues","Tarifs","Devis","Contrats","Checklists","Organisation","Fiches client","Planning","Cahiers des charges","Packs numériques","Autres"];
  const STATUTS = ["brouillon","actif","publié"];

  const getFondId = () => user?.id || "";

  const modelesFiltres = modeles.filter(m => {
    const matchCat = filtCat === "tous" || m.categorie === filtCat;
    const matchSearch = !search || m.nom.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const save = async () => {
    if (!form.nom?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("structure_modeles", form._edit, d);
    else await sbPost("structure_modeles", d);
    rMod(); setModal(null);
  };

  const saveBacklog = async () => {
    if (!form.titre?.trim()) return;
    await sbPost("structure_backlog", { ...form, fondatrice_id: getFondId(), statut: "backlog" });
    rBack(); setModal(null);
  };

  const STATUT_COL = {brouillon:"rgba(139,127,168,0.25)",actif:`${B.violet}25`,publié:"rgba(80,180,120,0.2)"};
  const STATUT_TXT = {brouillon:B.mutedL,actif:B.violetL,publié:B.success};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header animé */}
      <div style={{background:`linear-gradient(135deg,#0f766e22,#0d948822)`,border:"1px solid rgba(13,148,136,0.3)",borderRadius:16,padding:"16px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:6}}>🏗</div>
        <div style={{fontFamily:FS,fontSize:18,fontWeight:900,color:B.cream,marginBottom:3}}>Bella'Structure</div>
        <div style={{fontSize:12,color:B.muted}}>Modèles professionnels · Templates · Documents</div>
        <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10}}>
          <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:9,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#0d9488"}}>{modeles.length}</div>
            <div style={{fontSize:9,color:B.muted}}>modèles</div>
          </div>
          <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:9,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:B.gold}}>{modeles.filter(m=>m.statut==="publié").length}</div>
            <div style={{fontSize:9,color:B.muted}}>publiés</div>
          </div>
          <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:9,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:B.violetL}}>{backlog.length}</div>
            <div style={{fontSize:9,color:B.muted}}>backlog</div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:5}}>
        {[["bibliotheque","📚 Bibliothèque"],["backlog","📋 Backlog"],["ajouter","+ Nouveau"]].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)} style={{padding:"6px 12px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===id?B.violet:B.card,color:ong===id?"#fff":B.muted,fontFamily:SA,flex:1}}>{l}</button>
        ))}
      </div>

      {/* ── BIBLIOTHÈQUE ── */}
      {ong==="bibliotheque"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un modèle..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
            {CATS.slice(0,8).map(c=>(
              <button key={c} onClick={()=>setFiltCat(c)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:9,fontWeight:700,background:filtCat===c?B.surface:"transparent",color:filtCat===c?B.cream:B.muted,flexShrink:0,fontFamily:SA}}>{c}</button>
            ))}
          </div>
          {modelesFiltres.length===0&&(
            <div style={{textAlign:"center",padding:"28px",color:B.muted}}>
              <div style={{fontSize:36,marginBottom:8}}>📄</div>
              <div style={{fontSize:13}}>Aucun modèle — exécute d'abord le SQL Bella'Structure</div>
            </div>
          )}
          {modelesFiltres.map(m=>(
            <div key={m.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:700,color:B.cream}}>{m.nom}</span>
                    {m.prix_vente&&<span style={{fontSize:11,fontWeight:700,color:B.gold}}>{m.prix_vente}€</span>}
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    <span style={{background:STATUT_COL[m.statut]||B.surface,color:STATUT_TXT[m.statut]||B.muted,borderRadius:99,padding:"2px 8px",fontSize:9,fontWeight:700}}>{m.statut}</span>
                    {m.categorie&&<span style={{fontSize:9,background:`${B.violet}15`,color:B.violetL,borderRadius:4,padding:"2px 6px",fontWeight:700}}>{m.categorie}</span>}
                    {m.visible_client&&<span style={{fontSize:9,background:"rgba(80,180,120,0.15)",color:B.success,borderRadius:4,padding:"2px 6px",fontWeight:700}}>👁 Client</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <Btn sm v="ghost" onClick={()=>{setForm({...m,_edit:m.id});setModal("mod");}}>✏</Btn>
                  <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("structure_modeles",m.id).then(rMod);}}>✕</Btn>
                </div>
              </div>
              {m.description&&<div style={{fontSize:11,color:B.muted,lineHeight:1.5}}>{m.description}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── BACKLOG ── */}
      {ong==="backlog"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:`${B.violet}10`,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 14px",marginBottom:4}}>
            <div style={{fontSize:11,color:B.muted,lineHeight:1.7}}>💡 Le backlog contient les projets ChatGPT et idées à intégrer dans Bellaïa. Chaque entrée peut être convertie en modèle actif.</div>
          </div>
          <Btn sm onClick={()=>{setForm({priorite:"normale"});setModal("back");}}>+ Ajouter au backlog</Btn>
          {backlog.length===0&&<div style={{textAlign:"center",padding:"28px",color:B.muted,fontSize:13}}>Backlog vide</div>}
          {backlog.map(b=>(
            <div key={b.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:700,color:B.cream}}>{b.titre}</span>
                <span style={{fontSize:9,background:b.priorite==="haute"?"rgba(180,80,80,0.2)":b.priorite==="normale"?(B.violet+"20"):"rgba(80,80,80,0.2)",color:b.priorite==="haute"?B.danger:b.priorite==="normale"?B.violetL:B.muted,borderRadius:4,padding:"2px 6px",fontWeight:700}}>{b.priorite}</span>
              </div>
              {b.description&&<div style={{fontSize:11,color:B.muted,marginBottom:6,lineHeight:1.5}}>{b.description}</div>}
              {b.source&&<div style={{fontSize:10,color:B.muted}}>📎 Source : {b.source}</div>}
              <div style={{display:"flex",gap:5,marginTop:7}}>
                <Btn sm v="primary" onClick={()=>{setForm({nom:b.titre,description:b.description,categorie:"Autres",statut:"brouillon",visible_client:false});setModal("mod");setOng("bibliotheque");}}>→ Créer modèle</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("structure_backlog",b.id).then(rBack);}}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AJOUTER ── */}
      {ong==="ajouter"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:14,padding:"14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:12}}>Nouveau modèle</div>
            <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom du modèle"/></Fld>
            <Fld label="Catégorie"><Sel value={form.categorie||"Autres"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS.slice(1)}/></Fld>
            <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description du modèle" rows={2}/></Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Prix vente €"><Inp type="number" value={form.prix_vente||""} onChange={e=>setForm({...form,prix_vente:parseFloat(e.target.value)||null})}/></Fld>
              <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS}/></Fld>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <input type="checkbox" checked={!!form.visible_client} onChange={e=>setForm({...form,visible_client:e.target.checked})} id="vc_s" style={{accentColor:B.violet,width:16,height:16}}/>
              <label htmlFor="vc_s" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Visible par les clients</label>
            </div>
            <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Créer le modèle</Btn><Btn v="ghost" onClick={()=>setForm({})}>Effacer</Btn></div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal==="mod"&&(
        <Mdl title={form._edit?"Modifier modèle":"Nouveau modèle"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom du modèle"/></Fld>
          <Fld label="Catégorie"><Sel value={form.categorie||"Autres"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS.slice(1)}/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={3}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Prix €"><Inp type="number" value={form.prix_vente||""} onChange={e=>setForm({...form,prix_vente:parseFloat(e.target.value)||null})}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS}/></Fld>
          </div>
          <Fld label="Note prix"><Inp value={form.prix_note||""} onChange={e=>setForm({...form,prix_note:e.target.value})} placeholder="ex: À partir de 5€"/></Fld>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.visible_client} onChange={e=>setForm({...form,visible_client:e.target.checked})} id="vc_m" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="vc_m" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Visible par les clients</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
      {modal==="back"&&(
        <Mdl title="Ajouter au backlog" onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du projet ou idée"/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description, contexte, source ChatGPT..." rows={3}/></Fld>
          <Fld label="Source"><Inp value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})} placeholder="ex: ChatGPT, idée, client..."/></Fld>
          <Fld label="Priorité"><Sel value={form.priorite||"normale"} onChange={e=>setForm({...form,priorite:e.target.value})} options={["basse","normale","haute"]}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveBacklog} full>Ajouter</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BELLA'EVENTS — Module complet (Catalogue + Commandes + Documents)
// ═══════════════════════════════════════════════════════════
const BE_FILTRES = ["Tous","Anniversaire","Baptême","Baby Shower","Communion","Retraite","Réception privée","Gender Reveal","Événement pro"];
const BE_STATUTS_CMD = ["Demande reçue","Devis envoyé","Acompte reçu","En préparation","Livraison / Installation","Réalisé","Archivé","Annulé"];

function BellaEventsF({ user, commandes=[] }) {
  const [ong, setOng] = useState("demandes");
  // Demandes venant du formulaire client (pole:"Events")
  const demandesEvents = commandes.filter(c => c.pole === "Events" || c.statut === "Nouvelle demande" && c.notes?.includes("Events"));
  const nbNouvelles = demandesEvents.filter(c => c.statut === "Nouvelle demande").length;

  const STATUTS_EV = ["Nouvelle demande","À traiter","Devis envoyé","Accepté","Refusé","Converti en commande"];
  const COL_STATUT = {
    "Nouvelle demande":"rgba(201,168,76,0.2)","À traiter":"rgba(124,58,237,0.2)",
    "Devis envoyé":"rgba(59,130,246,0.2)","Accepté":"rgba(16,185,129,0.2)",
    "Refusé":"rgba(180,80,80,0.2)","Converti en commande":"rgba(80,180,120,0.2)"
  };
  const TXT_STATUT = {
    "Nouvelle demande":B.warning,"À traiter":B.violetL,"Devis envoyé":"#3b82f6",
    "Accepté":B.success,"Refusé":B.danger,"Converti en commande":B.success
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,95,70,0.3),rgba(16,185,129,0.1))",border:"1px solid rgba(6,95,70,0.4)",borderRadius:16,padding:"14px 16px",textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:4}}>✨</div>
        <div style={{fontFamily:FS,fontSize:17,fontWeight:900,color:B.cream,marginBottom:2}}>Bella'Events</div>
        <div style={{fontSize:11,color:B.muted}}>Papeterie · Décoration · Location · Coordination légère</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:5,overflowX:"auto"}}>
        {[["demandes",`📋 Demandes${nbNouvelles>0 ? " ("+(nbNouvelles)+")" : ""}"],["catalogue","🛍 Catalogue"],["commandes","📦 Commandes"],["documents","📄 Documents"]].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)} style={{padding:"6px 12px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===id?"#065f46":B.card,color:ong===id?"#fff":B.muted,fontFamily:SA,flexShrink:0,position:"relative"}}>{l}</button>
        ))}
      </div>

      {/* Onglet Demandes */}
      {ong==="demandes" && (
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div style={{fontSize:13,fontWeight:800,color:B.cream,marginBottom:4}}>Demandes de devis & réservations ({demandesEvents.length})</div>
          {demandesEvents.length===0 && <div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucune demande reçue — elles apparaîtront ici dès qu'un client utilisera le formulaire Bella'Events.</div>}
          {demandesEvents.map(c=>(
            <div key={c.id} style={{background:B.card,border:"1px solid "+B.border,borderRadius:13,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <span style={{fontSize:10,color:B.gold,fontWeight:700,marginRight:6}}>{c.id}</span>
                  <span style={{background:COL_STATUT[c.statut]||"rgba(255,255,255,0.05)",color:TXT_STATUT[c.statut]||B.muted,fontSize:9,fontWeight:700,borderRadius:4,padding:"2px 7px"}}>{c.statut}</span>
                </div>
                <span style={{fontSize:11,color:B.muted}}>{c.date}</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>{c.client}</div>
              <div style={{fontSize:11,color:B.muted,marginBottom:4}}>{c.produit}</div>
              {c.tel && <div style={{fontSize:10,color:B.muted}}>📞 {c.tel}</div>}
              {c.typeEvt && <div style={{fontSize:10,color:B.muted}}>{"🎉 "+c.typeEvt+(c.invites?" · "+c.invites+" invités":"")}</div>}
              {c.theme && <div style={{fontSize:10,color:B.muted}}>🎨 Thème : {c.theme}</div>}
              {c.budget && <div style={{fontSize:10,color:B.muted}}>💰 Budget : {c.budget}€</div>}
              {c.message && <div style={{fontSize:10,color:B.muted,marginTop:4,fontStyle:"italic"}}>"{c.message}"</div>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {STATUTS_EV.map(s=>(
                  <button key={s} onClick={()=>{}} style={{fontSize:9,padding:"3px 7px",borderRadius:4,border:"1px solid "+(s===c.statut?"#10b981":"rgba(255,255,255,0.1)"),background:s===c.statut?"rgba(16,185,129,0.15)":"transparent",color:s===c.statut?"#10b981":B.muted,cursor:"pointer",fontFamily:SA}}>{s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {ong==="catalogue" && <BellaEventsCatalogue user={user}/>}
      {ong==="commandes" && <BellaEventsCommandes user={user}/>}
      {ong==="documents" && <BellaEventsDocuments user={user}/>}
    </div>
  );
}

function BellaEventsCatalogue({ user }) {
  const [filtre, setFiltre] = useState("Tous");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: items, reload } = useP1Data("events_catalogue", { select:"*", order:"ordre.asc", limit:200 }, []);

  const itemsFiltres = items.filter(i => {
    const matchF = filtre==="Tous" || i.sous_categorie===filtre || i.categorie===filtre;
    const matchS = !search || i.nom.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const TYPES = ["prestation","location","creation","pack"];
  const CATS = ["Papeterie personnalisée","Créations personnalisées","Décoration événementielle","Location de matériel","Packs","Coordination légère"];
  const TYPE_ICO = {prestation:"⚡",location:"🔑",creation:"✨",pack:"📦"};
  const TYPE_COL = {prestation:"rgba(124,58,237,0.2)",location:"rgba(13,148,136,0.2)",creation:"rgba(201,168,76,0.2)",pack:"rgba(6,95,70,0.2)"};
  const TYPE_TXT = {prestation:B.violetL,location:"#0d9488",creation:B.gold,pack:"#10b981"};

  const save = async () => {
    if (!form.nom?.trim()) return;
    const d = {...form, fondatrice_id:user?.id, updated_at:new Date().toISOString()};
    delete d._edit;
    if (form._edit) await sbPatch("events_catalogue", form._edit, d);
    else await sbPost("events_catalogue", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn sm onClick={()=>{setForm({type_item:"creation",statut:"actif",visible_client:true,categorie:"Papeterie personnalisée"});setModal("item");}}>+ Prestation</Btn>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
        {BE_FILTRES.map(f=>(
          <button key={f} onClick={()=>setFiltre(f)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:9,fontWeight:700,background:filtre===f?B.surface:"transparent",color:filtre===f?B.cream:B.muted,flexShrink:0,fontFamily:SA}}>{f}</button>
        ))}
      </div>

      {itemsFiltres.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucun article — exécute le SQL bellaia-events-catalogue.sql</div>}
      {itemsFiltres.map(i=>(
        <div key={i.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:B.cream}}>{i.nom}</span>
                <span style={{background:TYPE_COL[i.type_item],color:TYPE_TXT[i.type_item],borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>{TYPE_ICO[i.type_item]} {i.type_item}</span>
              </div>
              <div style={{fontSize:10,color:B.muted,marginBottom:3}}>{i.sous_categorie||i.categorie}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:B.gold,marginBottom:3}}>{i.prix_unitaire?(i.prix_unitaire+"€"):(i.prix_note||"Sur devis")}</div>
              <div style={{display:"flex",gap:3}}>
                <Btn sm v="ghost" onClick={()=>{setForm({...i,_edit:i.id});setModal("item");}}>✏</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("events_catalogue",i.id).then(reload);}}>✕</Btn>
              </div>
            </div>
          </div>
          {i.description&&<div style={{fontSize:10,color:B.muted,lineHeight:1.5}}>{i.description.slice(0,100)}{i.description.length>100?"…":""}</div>}
        </div>
      ))}

      {modal==="item"&&(
        <Mdl title={form._edit?"Modifier":"Nouvelle prestation"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom"/></Fld>
          <Fld label="Catégorie"><Sel value={form.categorie||"Papeterie personnalisée"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS}/></Fld>
          <Fld label="Sous-catégorie"><Inp value={form.sous_categorie||""} onChange={e=>setForm({...form,sous_categorie:e.target.value})} placeholder="Sous-catégorie"/></Fld>
          <Fld label="Type"><Sel value={form.type_item||"creation"} onChange={e=>setForm({...form,type_item:e.target.value})} options={TYPES}/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Prix €"><Inp type="number" value={form.prix_unitaire||""} onChange={e=>setForm({...form,prix_unitaire:parseFloat(e.target.value)||null})}/></Fld>
            <Fld label="Note prix"><Inp value={form.prix_note||""} onChange={e=>setForm({...form,prix_note:e.target.value})} placeholder="À partir de..."/></Fld>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.visible_client} onChange={e=>setForm({...form,visible_client:e.target.checked})} id="vc_ev" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="vc_ev" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Visible par les clients</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

function BellaEventsCommandes({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: cmds, reload } = useP1Data("events_commandes", { select:"*", order:"created_at.desc", limit:100 }, []);

  const CMD_COL = {
    "Demande reçue":"rgba(201,168,76,0.2)","Devis envoyé":"rgba(124,58,237,0.2)",
    "Acompte reçu":"rgba(13,148,136,0.2)","En préparation":"rgba(59,130,246,0.2)",
    "Livraison / Installation":"rgba(16,185,129,0.2)","Réalisé":"rgba(80,180,120,0.2)",
    "Archivé":"rgba(80,80,80,0.2)","Annulé":"rgba(180,80,80,0.2)"
  };
  const CMD_TXT = {
    "Demande reçue":B.warning,"Devis envoyé":B.violetL,"Acompte reçu":"#0d9488",
    "En préparation":"#3b82f6","Livraison / Installation":"#10b981","Réalisé":B.success,
    "Archivé":B.muted,"Annulé":B.danger
  };

  const save = async () => {
    if (!form.client_nom?.trim()) return;
    const d = {...form, fondatrice_id:user?.id};
    delete d._edit;
    if (form._edit) await sbPatch("events_commandes", form._edit, d);
    else await sbPost("events_commandes", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:B.cream}}>Commandes Events ({cmds.length})</span>
        <Btn sm onClick={()=>{setForm({statut:"Demande reçue",date_creation:today()});setModal("cmd");}}>+ Commande</Btn>
      </div>
      {cmds.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucune commande</div>}
      {cmds.map(c=>(
        <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>{c.client_nom}</div>
              <div style={{fontSize:10,color:B.muted}}>{c.type_evenement} · {c.date_evenement?fmt(c.date_evenement):"Date à définir"}</div>
              {c.nb_invites&&<div style={{fontSize:10,color:B.muted}}>👥 {c.nb_invites} invités</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{background:CMD_COL[c.statut],color:CMD_TXT[c.statut],borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,display:"block",marginBottom:4}}>{c.statut}</span>
              {c.montant_total&&<div style={{fontSize:13,fontWeight:700,color:B.gold}}>{c.montant_total}€</div>}
            </div>
          </div>
          {c.detail_besoin&&<div style={{fontSize:11,color:B.muted,marginBottom:6,lineHeight:1.5}}>{c.detail_besoin.slice(0,80)}{c.detail_besoin.length>80?"…":""}</div>}
          <div style={{display:"flex",gap:5}}>
            <Btn sm v="ghost" onClick={()=>{setForm({...c,_edit:c.id});setModal("cmd");}}>✏</Btn>
            <Btn sm v="gold" onClick={()=>window.open(WA("Bonjour "+(c.client_nom)+", suite à votre commande Events..."),"_blank")}>💬</Btn>
            <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("events_commandes",c.id).then(reload);}}>✕</Btn>
          </div>
        </div>
      ))}

      {modal==="cmd"&&(
        <Mdl title={form._edit?"Modifier commande":"Nouvelle commande Events"} onClose={()=>setModal(null)}>
          <Fld label="Nom client *"><Inp value={form.client_nom||""} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom du client"/></Fld>
          <Fld label="Téléphone"><Inp value={form.client_tel||""} onChange={e=>setForm({...form,client_tel:e.target.value})} placeholder="+594..."/></Fld>
          <Fld label="Type d'événement"><Sel value={form.type_evenement||"Anniversaire"} onChange={e=>setForm({...form,type_evenement:e.target.value})} options={BE_FILTRES.slice(1)}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Date événement"><Inp type="date" value={form.date_evenement||""} onChange={e=>setForm({...form,date_evenement:e.target.value})}/></Fld>
            <Fld label="Nb invités"><Inp type="number" value={form.nb_invites||""} onChange={e=>setForm({...form,nb_invites:parseInt(e.target.value)||null})}/></Fld>
          </div>
          <Fld label="Détail du besoin"><Inp value={form.detail_besoin||""} onChange={e=>setForm({...form,detail_besoin:e.target.value})} placeholder="Décrivez les besoins du client" rows={3}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Montant total €"><Inp type="number" value={form.montant_total||""} onChange={e=>setForm({...form,montant_total:parseFloat(e.target.value)||null})}/></Fld>
            <Fld label="Acompte €"><Inp type="number" value={form.acompte||""} onChange={e=>setForm({...form,acompte:parseFloat(e.target.value)||null})}/></Fld>
          </div>
          <Fld label="Statut"><Sel value={form.statut||"Demande reçue"} onChange={e=>setForm({...form,statut:e.target.value})} options={BE_STATUTS_CMD}/></Fld>
          <Fld label="Notes internes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

function BellaEventsDocuments({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: docs, reload } = useP1Data("documents", { select:"*", filters:{pole:"EVENTS"}, order:"created_at.desc", limit:100 }, []);

  const TYPES_DOC = ["devis","contrat_location","contrat_prestation","facture","checklist","planning","fiche_client","cahier_charges","autre"];
  const TYPE_ICO = {devis:"📋",contrat_location:"🔑",contrat_prestation:"📝",facture:"💰",checklist:"✅",planning:"📅",fiche_client:"👤",cahier_charges:"📑",autre:"📄"};

  const save = async () => {
    if (!form.titre?.trim()) return;
    const d = {...form, fondatrice_id:user?.id, pole:"EVENTS", updated_at:new Date().toISOString()};
    delete d._edit;
    if (form._edit) await sbPatch("documents", form._edit, d);
    else await sbPost("documents", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:13,fontWeight:800,color:B.cream}}>Documents Events ({docs.length})</span>
        <Btn sm onClick={()=>{setForm({type_doc:"devis",statut:"brouillon",pole:"EVENTS",partage_client:false});setModal("doc");}}>+ Document</Btn>
      </div>
      {docs.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucun document</div>}
      {docs.map(d=>(
        <div key={d.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:16}}>{TYPE_ICO[d.type_doc]||"📄"}</span>
                <span style={{fontSize:12,fontWeight:700,color:B.cream}}>{d.titre}</span>
              </div>
              <div style={{display:"flex",gap:5}}>
                <Bdg s={d.statut}/>
                {d.signe&&<span style={{fontSize:9,background:"rgba(201,168,76,0.2)",color:B.gold,borderRadius:4,padding:"2px 5px",fontWeight:700}}>Signé</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <Btn sm v="ghost" onClick={()=>{setForm({...d,_edit:d.id});setModal("doc");}}>✏</Btn>
              <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("documents",d.id).then(reload);}}>✕</Btn>
            </div>
          </div>
        </div>
      ))}

      {modal==="doc"&&(
        <Mdl title={form._edit?"Modifier document":"Nouveau document"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du document"/></Fld>
          <Fld label="Type"><Sel value={form.type_doc||"devis"} onChange={e=>setForm({...form,type_doc:e.target.value})} options={TYPES_DOC}/></Fld>
          <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={["brouillon","actif","archivé"]}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Contenu ou notes" rows={3}/></Fld>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.signe} onChange={e=>setForm({...form,signe:e.target.checked})} id="sg_ev" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="sg_ev" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Document signé</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT BELLA'EVENTS — Catalogue commercial
// ═══════════════════════════════════════════════════════════
// Couleurs Events (vert émeraude)
const EV = {or:"#10b981",creme:"#e8f5ee",cremeD:"#a8d5be",line:"rgba(16,185,129,0.25)",verre:"rgba(16,185,129,0.06)",acc:"#34d399",night:"#0a1410"};

function ClientEvents({ onBack, onNewCommande }) {
  const [cat, setCat] = useState(null);
  const [modal, setModal] = useState(null);   // {prestation, type} → ouvre le formulaire
  const [succes, setSucces] = useState(null); // référence après soumission
  const FORM_INIT = {prenom:"",nom:"",tel:"",email:"",date:"",heure:"",typeEvt:"",invites:"",theme:"",couleurs:"",budget:"",message:""};
  const [form, setForm] = useState(FORM_INIT);
  const [envoi, setEnvoi] = useState(false);

  // Prix d'affichage
  const prixAff = (p) => {
    if (p.sur_devis || p.prix == null) return "Sur devis";
    if (p.prix_des) return `À partir de ${p.prix}€`;
    if (p.prix_jusqua) return `Jusqu'à ${p.prix}€`;
    return `${p.prix}€${p.unite ? " / "+p.unite : ""}`;
  };

  // Soumettre le formulaire devis/réservation
  const soumettre = () => {
    if (!form.prenom.trim() || !form.tel.trim()) { alert("Prénom et téléphone requis."); return; }
    setEnvoi(true);
    const p = modal.prestation;
    const type = modal.type;
    const ref = "EV" + Date.now().toString().slice(-6);
    const montant = p.prix || 0;
    const acompte = Math.round(montant * (p.acompte_pct||30) / 100);
    const cmd = {
      id: ref,
      client: `${form.prenom} ${form.nom}`.trim(),
      tel: form.tel, email: form.email,
      produit: p.nom,
      categorie: p.categorie, sous: p.sous, type: p.type||"prestation",
      prix: prixAff(p), montant, acompte_pct: p.acompte_pct||30, acompte,
      solde: montant - acompte,
      statut: "Nouvelle demande",
      date: form.date || today(),
      heure: form.heure,
      typeEvt: form.typeEvt,
      invites: form.invites,
      theme: form.theme,
      couleurs: form.couleurs,
      budget: form.budget,
      message: form.message,
      pmt: "À confirmer",
      pole: "Events",
      notes: `${type} — ${p.nom} — ${new Date().toLocaleString("fr-FR")}`,
      delai: p.delai_minimum || "",
    };
    if (onNewCommande) onNewCommande(cmd);
    setSucces(ref);
    setModal(null);
    setForm(FORM_INIT);
    setEnvoi(false);
  };

  // Ouvrir le formulaire
  const ouvrir = (p, type) => { setModal({prestation:p, type}); setForm(FORM_INIT); setSucces(null); };

  // Vue détail catégorie
  if (cat) {
    const catObj = EVENTS_CATEGORIES.find(c => c.id === cat);
    const prestas = EVENTS_PRESTATIONS.filter(p => p.categorie === cat || p.sous === cat);
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${EV.night},#070d0a 65%)`,fontFamily:SA,color:EV.creme}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>{catObj?.ico}</span>
            <div><div style={{fontFamily:FS,fontSize:14,color:EV.or}}>{catObj?.nom}</div></div>
          </div>
          <button onClick={()=>setCat(null)} style={{background:"none",border:"1px solid "+(EV.line),borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Catégories</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {/* Bannière catégorie */}
          <div style={{background:`linear-gradient(135deg,${EV.or}22,transparent)`,border:"1px solid "+(EV.line),borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontSize:13,color:EV.cremeD,lineHeight:1.6}}>{catObj?.desc}</div>
          </div>
          {prestas.length === 0 && <div style={{textAlign:"center",color:EV.cremeD,fontSize:13,padding:20}}>Prestations bientôt disponibles · contactez-nous pour un devis.</div>}
          {prestas.map((p, idx) => {
            const fam = cat === "unite" && p.sous !== prestas[idx-1]?.sous
              ? EVENTS_UNITE_FAMILLES.find(f => f.id === p.sous)
              : null;
            return (
            <React.Fragment key={p.id}>
              {fam && <div style={{fontSize:12,fontWeight:700,color:EV.or,marginTop:idx>0?8:0,paddingLeft:2}}>{fam.ico} {fam.nom}</div>}
            <div style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontFamily:FS,fontSize:14,fontWeight:700,color:EV.creme,flex:1}}>{p.nom}</div>
                <span style={{background:`${EV.or}22`,border:"1px solid "+(EV.or)+("55"),color:EV.or,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",marginLeft:8}}>{prixAff(p)}</span>
              </div>
              <div style={{fontSize:12,color:EV.cremeD,marginBottom:8,lineHeight:1.5}}>{p.desc}</div>
              {p.note && <div style={{fontSize:10,color:EV.acc,marginBottom:10,fontStyle:"italic"}}>ℹ️ {p.note}</div>}
              {p.acompte_pct && <div style={{fontSize:10,color:EV.cremeD,marginBottom:10}}>Acompte {p.acompte_pct}%</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>ouvrir(p,"Demande de devis")} style={{flex:1,background:"transparent",border:"1px solid "+(EV.or),borderRadius:9,padding:"9px",color:EV.or,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:SA}}>📋 Demander un devis</button>
                {!p.sur_devis && <button onClick={()=>ouvrir(p,"Réservation")} style={{flex:1,background:EV.or,border:"none",borderRadius:9,padding:"9px",color:"#062b1d",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:SA}}>✓ Réserver</button>}
              </div>
            </div>
            </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Modale formulaire devis / réservation
  if (modal) {
    const p = modal.prestation;
    const type = modal.type;
    const inp = (label, key, opts={}) => (
      <div style={{marginBottom:12}}>
        <label style={{fontSize:10,fontWeight:700,color:EV.cremeD,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>{label}{opts.req?" *":""}</label>
        {opts.textarea
          ? <textarea value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} rows={3} placeholder={opts.ph||""} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(EV.line),borderRadius:10,padding:"10px 12px",color:EV.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box",resize:"vertical"}}/>
          : <input type={opts.type||"text"} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={opts.ph||""} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(EV.line),borderRadius:10,padding:"10px 12px",color:EV.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
        }
      </div>
    );
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${EV.night},#070d0a 65%)`,fontFamily:SA,color:EV.creme}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
          <div style={{fontFamily:FS,fontSize:13,color:EV.or}}>✨ {type}</div>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"1px solid "+(EV.line),borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>✕ Annuler</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {/* Récap prestation */}
          <div style={{background:`${EV.or}15`,border:"1px solid "+(EV.line),borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:11,color:EV.cremeD,marginBottom:3}}>Prestation sélectionnée</div>
            <div style={{fontSize:14,fontWeight:700,color:EV.creme}}>{p.nom}</div>
            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:EV.or,background:`${EV.or}20`,borderRadius:4,padding:"2px 7px"}}>{prixAff(p)}</span>
              <span style={{fontSize:10,color:EV.cremeD,background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"2px 7px"}}>Acompte {p.acompte_pct||30}%</span>
              <span style={{fontSize:10,color:EV.cremeD,background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"2px 7px"}}>Pôle Events</span>
            </div>
          </div>
          {/* Coordonnées */}
          <div style={{fontSize:11,fontWeight:700,color:EV.or,marginBottom:10}}>VOS COORDONNÉES</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>{inp("Prénom","prenom",{req:true})}</div>
            <div style={{flex:1}}>{inp("Nom","nom")}</div>
          </div>
          {inp("Téléphone","tel",{req:true,type:"tel",ph:"+594..."})}
          {inp("Email","email",{type:"email",ph:"votre@email.com"})}
          {/* Détails événement */}
          <div style={{fontSize:11,fontWeight:700,color:EV.or,marginBottom:10,marginTop:4}}>VOTRE ÉVÉNEMENT</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>{inp("Date souhaitée","date",{type:"date"})}</div>
            <div style={{flex:1}}>{inp("Heure","heure",{ph:"14h00"})}</div>
          </div>
          {inp("Type d'événement","typeEvt",{ph:"Anniversaire, baptême..."})}
          {inp("Nombre d'invités","invites",{type:"number",ph:"20"})}
          {inp("Thème","theme",{ph:"Jungle, princesse, tropical..."})}
          {inp("Couleurs","couleurs",{ph:"Rose, or, blanc..."})}
          {inp("Budget estimé (€)","budget",{type:"number",ph:"Optionnel"})}
          {inp("Message / précisions","message",{textarea:true,ph:"Décrivez votre projet, vos envies..."})}
          {/* Boutons */}
          <button onClick={soumettre} disabled={envoi} style={{width:"100%",background:EV.or,border:"none",borderRadius:10,padding:"13px",color:"#062b1d",fontWeight:700,fontSize:14,cursor:envoi?"not-allowed":"pointer",fontFamily:SA,marginBottom:10,opacity:envoi?0.7:1}}>
            {envoi?"Envoi en cours…":`✓ Envoyer ma ${type.toLowerCase()}`}
          </button>
          <button onClick={()=>{
            const msg=`✨ *${type.toUpperCase()} BELLA'EVENTS*\n\nPrestation : ${p.nom}\nTarif : ${prixAff(p)}\nPrénom : ${form.prenom}\nTél : ${form.tel}\nDate : ${form.date||"À définir"}\nThème : ${form.theme||"À définir"}`;
            window.open(WA(msg),"_blank");
          }} style={{width:"100%",background:"transparent",border:"1px solid "+(EV.line),borderRadius:10,padding:"11px",color:EV.cremeD,fontSize:12,cursor:"pointer",fontFamily:SA}}>
            💬 Contacter sur WhatsApp (optionnel)
          </button>
        </div>
      </div>
    );
  }

  // Écran de succès
  if (succes) return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 0%,${EV.night},#070d0a 65%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",fontFamily:SA}}>
      <div style={{fontSize:48,marginBottom:16}}>✨</div>
      <div style={{fontFamily:FS,fontSize:20,color:EV.or,marginBottom:8}}>Demande envoyée !</div>
      <div style={{fontSize:13,color:EV.cremeD,marginBottom:8,lineHeight:1.6}}>Votre demande a bien été reçue.</div>
      <div style={{fontSize:12,color:EV.or,fontWeight:700,marginBottom:20}}>Réf. {succes}</div>
      <div style={{fontSize:11,color:EV.cremeD,marginBottom:24}}>La fondatrice reviendra vers vous rapidement.</div>
      <button onClick={()=>setSucces(null)} style={{background:EV.or,border:"none",borderRadius:10,padding:"12px 24px",color:"#062b1d",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:SA}}>← Retour à Bella'Events</button>
    </div>
  );

  // Vue liste des catégories
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,${EV.night},#070d0a 65%)`,fontFamily:SA,color:EV.creme}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:EV.or,letterSpacing:2}}>✨ Bella'Events</div>
          <div style={{fontSize:9,color:EV.cremeD,letterSpacing:2}}>ÉVÉNEMENTS · DÉCORATION · PAPETERIE</div>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid "+(EV.line),borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Portail</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {/* Bannière principale */}
        <div style={{background:`linear-gradient(135deg,${EV.or}33,transparent)`,border:"1px solid "+(EV.line),borderRadius:16,padding:"20px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>✨</div>
          <div style={{fontFamily:FS,fontSize:18,color:EV.or,marginBottom:6}}>Vos événements sur mesure</div>
          <div style={{fontSize:12,color:EV.cremeD,lineHeight:1.6}}>Décoration, papeterie, gâteaux et coordination. Demandez votre devis personnalisé.</div>
        </div>
        {/* Conditions clés */}
        <div style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:12,padding:"12px 14px",marginBottom:16}}>
          <div style={{fontSize:10,color:EV.or,fontWeight:700,marginBottom:6}}>📋 CONDITIONS</div>
          <div style={{fontSize:11,color:EV.cremeD,lineHeight:1.7}}>
            Acompte {EVENTS_CONDITIONS.acompte_evenement}% (événementiel) · {EVENTS_CONDITIONS.acompte_gateau}% (gâteaux)<br/>
            Kit anniversaire : minimum {EVENTS_CONDITIONS.kit_min} exemplaires<br/>
            Livraison {EVENTS_CONDITIONS.livraison_km}€/km · forfait {EVENTS_CONDITIONS.livraison_forfait}€ au-delà de {EVENTS_CONDITIONS.livraison_seuil}km<br/>
            Délais : {EVENTS_CONDITIONS.delai_sucre} (pâte à sucre) · {EVENTS_CONDITIONS.delai_autre} (autres)
          </div>
        </div>
        {/* Grille catégories */}
        <div style={{fontSize:11,color:EV.cremeD,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>NOS CATÉGORIES</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {EVENTS_CATEGORIES.map(c => {
            const nb = EVENTS_PRESTATIONS.filter(p => p.categorie===c.id || p.sous===c.id).length;
            return (
              <div key={c.id} onClick={()=>setCat(c.id)} style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:14,padding:"16px 12px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>{c.ico}</div>
                <div style={{fontSize:12,fontWeight:700,color:EV.creme,marginBottom:3}}>{c.nom}</div>
                <div style={{fontSize:9,color:EV.cremeD}}>{nb>0 ? (nb)+" prestation"+(nb>1?"s":"") : "Sur devis"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT BELLA'EVENTS — Catalogue commercial (legacy Supabase)
// ═══════════════════════════════════════════════════════════
function ClientEventsPortail({ onBack }) {
  const [filtre, setFiltre] = useState("Tous");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const { data: items } = useP1Data("events_catalogue", { select:"*", filters:{statut:"actif",visible_client:true}, order:"ordre.asc", limit:200 }, []);

  const itemsFiltres = items.filter(i => {
    const matchF = filtre==="Tous" || i.sous_categorie===filtre || i.categorie===filtre;
    const matchS = !search || i.nom.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const TYPE_COL = {prestation:"#065f46",location:"#0d9488",creation:"#92400e",pack:"#1d4ed8"};
  const TYPE_ICO = {prestation:"⚡",location:"🔑",creation:"✨",pack:"📦"};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,#0d1a14,${B.night} 65%)`,fontFamily:SA,color:B.cream}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(6,95,70,0.3)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:"#10b981",letterSpacing:2}}>✨ Bella'Events</div>
          <div style={{fontSize:9,color:"rgba(16,185,129,0.7)",letterSpacing:3}}>PAPETERIE · DÉCORATION · COORDINATION</div>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Retour</button>
      </div>

      {/* Hero */}
      <div style={{padding:"16px 14px 10px",background:"linear-gradient(180deg,rgba(6,95,70,0.2) 0%,transparent 100%)"}}>
        <div style={{fontFamily:FS,fontSize:20,fontWeight:900,color:B.cream,marginBottom:4}}>Nos prestations ✨</div>
        <div style={{fontSize:12,color:B.muted,marginBottom:12}}>Papeterie · Créations · Décoration · Location · Packs</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher une prestation..." style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(6,95,70,0.3)",borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:5,overflowX:"auto",padding:"6px 14px",borderBottom:"1px solid rgba(6,95,70,0.2)",flexShrink:0}}>
        {BE_FILTRES.map(f=>(
          <button key={f} onClick={()=>setFiltre(f)} style={{padding:"4px 10px",borderRadius:99,border:"1px solid "+(filtre===f?"#065f46":"rgba(255,255,255,0.1)"),background:filtre===f?"#065f46":"transparent",color:filtre===f?"#fff":"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0,fontFamily:SA}}>{f}</button>
        ))}
      </div>

      {/* Catalogue */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px 24px"}}>
        {itemsFiltres.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:B.muted}}>
            <div style={{fontSize:40,marginBottom:12}}>✨</div>
            <div style={{fontSize:14,color:B.mutedL,marginBottom:8}}>Prestations bientôt disponibles</div>
            <button onClick={()=>window.open(WA("Bonjour, je souhaite en savoir plus sur les prestations Bella'Events"),"_blank")} style={{background:"#065f46",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:SA}}>💬 Nous contacter</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {itemsFiltres.map(i=>(
            <div key={i.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(6,95,70,0.25)",borderRadius:13,padding:"13px 14px",cursor:"pointer"}} onClick={()=>setModal(i)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                    <span style={{background:`${TYPE_COL[i.type_item]}33`,color:TYPE_COL[i.type_item],borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>{TYPE_ICO[i.type_item]} {i.type_item}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>{i.nom}</div>
                  {i.description&&<div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{i.description.slice(0,90)}{i.description.length>90?"…":""}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#10b981"}}>{i.prix_unitaire ? (i.prix_unitaire)+"€" : i.prix_note||"Sur devis"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA WhatsApp */}
        <div style={{marginTop:20,background:"rgba(6,95,70,0.15)",border:"1px solid rgba(6,95,70,0.3)",borderRadius:14,padding:"16px",textAlign:"center"}}>
          <div style={{fontFamily:FS,fontSize:14,color:"#10b981",marginBottom:6}}>Une question ? Un projet ? ✨</div>
          <div style={{fontSize:12,color:B.muted,marginBottom:12}}>Contactez-nous pour un devis personnalisé.</div>
          <button onClick={()=>window.open(WA("Bonjour, je souhaite un devis pour Bella'Events"),"_blank")} style={{background:"linear-gradient(135deg,#065f46,#0d9488)",border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:SA}}>💬 Demander un devis</button>
        </div>
      </div>

      {/* Modal détail prestation */}
      {modal&&(
        <Mdl title={modal.nom} onClose={()=>setModal(null)}>
          <div style={{textAlign:"center",marginBottom:14}}>
            <span style={{background:`${TYPE_COL[modal.type_item]}33`,color:TYPE_COL[modal.type_item],borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700}}>{TYPE_ICO[modal.type_item]} {modal.type_item}</span>
          </div>
          {modal.description&&<p style={{color:B.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>{modal.description}</p>}
          <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px",marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#10b981",fontFamily:FS}}>{modal.prix_unitaire ? (modal.prix_unitaire)+"€" : modal.prix_note||"Sur devis"}</div>
            {modal.unite&&modal.prix_unitaire&&<div style={{fontSize:11,color:B.muted}}>par {modal.unite}</div>}
          </div>
          <button onClick={()=>{setModal(null);window.open(WA("Bonjour, je suis intéressée par : "+(modal.nom)+". Pouvez-vous me faire un devis ?"),"_blank");}} style={{width:"100%",background:"linear-gradient(135deg,#065f46,#0d9488)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:SA}}>💬 Demander ce service →</button>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT BELLA'STRUCTURE — Modèles numériques
// ═══════════════════════════════════════════════════════════
function ClientStructurePortail({ onBack }) {
  const [modal, setModal] = useState(null);
  const { data: modeles } = useP1Data("structure_modeles", { select:"*", filters:{statut:"publié",visible_client:true}, order:"categorie.asc,ordre.asc", limit:100 }, []);

  const CATS = [...new Set(modeles.map(m=>m.categorie))];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:`radial-gradient(ellipse at 20% 0%,#12100d,${B.night} 65%)`,fontFamily:SA,color:B.cream}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(146,64,14,0.3)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:"#d97706",letterSpacing:2}}>🏗 Bella'Structure</div>
          <div style={{fontSize:9,color:"rgba(217,119,6,0.7)",letterSpacing:3}}>MODÈLES · TEMPLATES · DOCUMENTS PRO</div>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Retour</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 24px"}}>
        <div style={{fontFamily:FS,fontSize:18,fontWeight:900,color:B.cream,marginBottom:4}}>Modèles professionnels</div>
        <div style={{fontSize:12,color:B.muted,marginBottom:16}}>Templates événementiels · Documents pro · Checklists</div>

        {modeles.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:B.muted}}>
            <div style={{fontSize:40,marginBottom:12}}>📄</div>
            <div style={{fontSize:13,marginBottom:12}}>Catalogue de modèles bientôt disponible</div>
            <button onClick={()=>window.open(WA("Bonjour, je voudrais des informations sur les modèles Bella'Structure"),"_blank")} style={{background:"linear-gradient(135deg,#92400e,#b45309)",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:SA}}>💬 Nous contacter</button>
          </div>
        )}

        {CATS.map(cat=>{
          const items = modeles.filter(m=>m.categorie===cat);
          return (
            <div key={cat} style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:800,color:"#d97706",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>{cat}</div>
              {items.map(m=>(
                <div key={m.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(146,64,14,0.25)",borderRadius:12,padding:"12px 14px",marginBottom:7,cursor:"pointer"}} onClick={()=>setModal(m)}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>📄 {m.nom}</div>
                      {m.description&&<div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{m.description.slice(0,70)}{m.description.length>70?"…":""}</div>}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:"#d97706",flexShrink:0,marginLeft:8}}>{m.prix_vente ? (m.prix_vente)+"€" : m.prix_note||"Gratuit"}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div style={{background:"rgba(146,64,14,0.15)",border:"1px solid rgba(146,64,14,0.3)",borderRadius:14,padding:"16px",textAlign:"center",marginTop:8}}>
          <div style={{fontFamily:FS,fontSize:14,color:"#d97706",marginBottom:6}}>Modèle sur mesure ? 🏗</div>
          <div style={{fontSize:12,color:B.muted,marginBottom:12}}>Je peux créer un modèle adapté à votre activité.</div>
          <button onClick={()=>window.open(WA("Bonjour, je souhaite un modèle personnalisé Bella'Structure"),"_blank")} style={{background:"linear-gradient(135deg,#92400e,#b45309)",border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:SA}}>💬 Demander un modèle</button>
        </div>
      </div>

      {modal&&(
        <Mdl title={modal.nom} onClose={()=>setModal(null)}>
          {modal.description&&<p style={{color:B.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>{modal.description}</p>}
          <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:12,padding:"12px",marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#d97706",fontFamily:FS}}>{modal.prix_vente ? (modal.prix_vente)+"€" : modal.prix_note||"Gratuit"}</div>
          </div>
          <button onClick={()=>{setModal(null);window.open(WA("Bonjour, je souhaite obtenir le modèle : "+(modal.nom)),"_blank");}} style={{width:"100%",background:"linear-gradient(135deg,#92400e,#b45309)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:SA}}>💬 Obtenir ce modèle →</button>
        </Mdl>
      )}
    </div>
  );
}

// ── PlaceholderModule → défini dans APP ROOT



// ═══════════════════════════════════════════════════════════
// CATALOGUE IA — Photo → Fiche produit automatique
// ═══════════════════════════════════════════════════════════
function CatalogueIAF({ user, gotoEvents }) {
  const [etape, setEtape] = useState("accueil");
  const [imgB64, setImgB64] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgType, setImgType] = useState("image/jpeg");
  const [analyse, setAnalyse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  const CATS = ["Papeterie personnalisée","Créations personnalisées","Décoration événementielle",
    "Location de matériel","Vaisselle","Mobilier","Fleurs artificielles",
    "Accessoires photo","Bougies","Lingerie & BSH","Beauté","Alimentaire","Autre"];
  const TYPES = ["prestation","location","creation","pack","vente","stock_interne"];

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mtype = file.type || "image/jpeg";
    setImgType(mtype);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      setImgPreview(result);
      setImgB64(result.split(",")[1]);
      setEtape("analyse");
      setAnalyse(null); setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const analyser = async () => {
    if (!imgB64) return;
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `Tu es Bellaïa, assistante commerciale de Bella'Studio en Guyane française.
Analyse la photo et retourne UNIQUEMENT un JSON valide (pas de markdown, pas de backticks) :
{"nom_commercial":"...","categorie":"...","type_item":"prestation|location|creation|pack|vente|stock_interne","description_client":"2-3 phrases vendeuses","usages":["..."],"mots_cles":["...","..."],"prix_suggestion":"À définir","visible_client":false,"statut":"brouillon","notes_fondatrice":"..."}`,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imgType, data: imgB64 } },
              { type: "text", text: "Analyse cet article et génère la fiche produit JSON pour Bella'Studio." }
            ]
          }]
        })
      });
      const d = await r.json();
      const txt = d.content?.[0]?.text || "{}";
      const clean = txt.replace(/```json|```/g,"").trim();
      const p = JSON.parse(clean);
      setAnalyse(p);
      setForm({
        nom: p.nom_commercial || "",
        categorie: p.categorie || "Autre",
        type_item: p.type_item || "vente",
        description: p.description_client || "",
        prix_note: p.prix_suggestion || "À définir",
        visible_client: false,
        statut: "brouillon",
        notes: p.notes_fondatrice || "",
        mots_cles: (p.mots_cles||[]).join(", "),
      });
      setEtape("validation");
    } catch {
      setAnalyse({ erreur: "Analyse impossible. Photo trop sombre ou connexion IA indisponible." });
      setEtape("validation");
    }
    setLoading(false);
  };

  const sauvegarder = async () => {
    if (!form.nom?.trim()) return;
    setLoading(true);
    await sbPost("events_catalogue", {
      fondatrice_id: user?.id,
      nom: form.nom,
      categorie: form.categorie || "Autre",
      sous_categorie: form.type_item,
      description: form.description,
      type_item: form.type_item || "vente",
      prix_note: form.prix_note || "À définir",
      visible_client: !!form.visible_client,
      statut: form.statut || "brouillon",
      ordre: 999,
    });
    setSaved(true);
    setEtape("done");
    setLoading(false);
  };

  const reset = () => { setEtape("accueil"); setImgPreview(null); setImgB64(null); setAnalyse(null); setForm({}); setSaved(false); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${B.violet}22,${B.gold}10)`,border:"1px solid "+(B.border),borderRadius:16,padding:"14px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:5}}>📸</div>
        <div style={{fontFamily:FS,fontSize:17,fontWeight:900,color:B.cream,marginBottom:2}}>Catalogue IA</div>
        <div style={{fontSize:11,color:B.muted}}>Photo → Fiche produit · Validation obligatoire avant publication</div>
      </div>

      {/* ACCUEIL */}
      {etape==="accueil"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <label style={{display:"block",background:`linear-gradient(135deg,${B.violet},#5b21b6)`,borderRadius:13,padding:"16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:SA,textAlign:"center"}}>
            📷 Prendre une photo
            <input type="file" accept="image/*" capture="environment" onChange={handleImage} style={{display:"none"}}/>
          </label>
          <label style={{display:"block",background:"transparent",border:"1px solid "+(B.border),borderRadius:13,padding:"14px",color:B.mutedL,cursor:"pointer",fontSize:13,fontFamily:SA,textAlign:"center"}}>
            🖼 Choisir depuis la galerie
            <input type="file" accept="image/*" onChange={handleImage} style={{display:"none"}}/>
          </label>

          {/* Fonctions Phase 3 — interface prévue */}
          <div style={{background:B.surface,border:"1px solid "+(B.border),borderRadius:13,padding:"13px 14px",marginTop:4}}>
            <div style={{fontSize:10,fontWeight:700,color:B.mutedL,marginBottom:10,letterSpacing:"0.06em",textTransform:"uppercase"}}>Fonctions prévues — Phase 3</div>
            {[
              {ico:"🧹",l:"Nettoyer le fond",d:"Suppression fond automatique via API image"},
              {ico:"📐",l:"Format carré catalogue",d:"Recadrage auto pour catalogue et boutique"},
              {ico:"📱",l:"Format Story / WhatsApp",d:"Export vertical pour réseaux sociaux"},
              {ico:"✨",l:"Valorisation photo",d:"Rendu catalogue professionnel"},
            ].map(f=>(
              <div key={f.l} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid "+(B.border),alignItems:"center",opacity:0.55}}>
                <span style={{fontSize:20,flexShrink:0}}>{f.ico}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{f.l}</div>
                  <div style={{fontSize:10,color:B.muted}}>{f.d}</div>
                </div>
                <span style={{fontSize:8,background:`${B.violet}22`,color:B.violetL,borderRadius:4,padding:"2px 6px",fontWeight:700,flexShrink:0}}>Phase 3</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYSE */}
      {etape==="analyse"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {imgPreview&&<img src={imgPreview} alt="Article" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:13,border:"1px solid "+(B.border)}}/>}
          <div style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"16px",textAlign:"center"}}>
            {!loading ? (
              <>
                <div style={{fontSize:13,color:B.cream,marginBottom:14,lineHeight:1.6}}>Photo chargée.<br/>Bellaïa va identifier l'article et créer la fiche produit.</div>
                <Btn v="primary" full onClick={analyser}>◎ Analyser avec Bellaïa</Btn>
                <button onClick={reset} style={{marginTop:10,background:"none",border:"none",color:B.muted,cursor:"pointer",fontSize:12,fontFamily:SA}}>← Changer de photo</button>
              </>
            ) : (
              <div>
                <div style={{fontSize:28,marginBottom:8,color:B.gold}}>◎</div>
                <div style={{fontSize:13,color:B.gold,marginBottom:4}}>Bellaïa analyse…</div>
                <div style={{fontSize:11,color:B.muted}}>Identification · Catégorisation · Description</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VALIDATION */}
      {etape==="validation"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {imgPreview&&<img src={imgPreview} alt="Article" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:12,border:"1px solid "+(B.border)}}/>}

          {analyse?.erreur ? (
            <div style={{background:"rgba(180,80,80,0.1)",border:"1px solid rgba(180,80,80,0.3)",borderRadius:12,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:13,color:B.danger,marginBottom:10}}>{analyse.erreur}</div>
              <Btn v="ghost" onClick={()=>setEtape("analyse")}>← Réessayer</Btn>
            </div>
          ) : (
            <>
              <div style={{background:`${B.gold}10`,border:"1px solid "+(B.borderG),borderRadius:11,padding:"10px 13px"}}>
                <div style={{fontSize:11,fontWeight:700,color:B.gold,marginBottom:3}}>✦ Suggestion Bellaïa — à valider</div>
                <div style={{fontSize:10,color:B.muted}}>Statut <strong style={{color:B.warning}}>brouillon</strong> par défaut. Coche "Visible client" uniquement après validation.</div>
              </div>
              <Fld label="Nom commercial *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom du produit"/></Fld>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Fld label="Catégorie"><Sel value={form.categorie||"Autre"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS}/></Fld>
                <Fld label="Type"><Sel value={form.type_item||"vente"} onChange={e=>setForm({...form,type_item:e.target.value})} options={TYPES}/></Fld>
              </div>
              <Fld label="Description client"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description vendeuse" rows={3}/></Fld>
              <Fld label="Prix / note tarif"><Inp value={form.prix_note||""} onChange={e=>setForm({...form,prix_note:e.target.value})} placeholder="ex: À partir de 5€"/></Fld>
              <Fld label="Notes internes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Remarques" rows={2}/></Fld>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:6}}>
                <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={["brouillon","actif"]}/></Fld>
                <div style={{display:"flex",alignItems:"flex-end",paddingBottom:14}}>
                  <label style={{display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}>
                    <input type="checkbox" checked={!!form.visible_client} onChange={e=>setForm({...form,visible_client:e.target.checked})} style={{accentColor:B.violet,width:16,height:16}}/>
                    <span style={{fontSize:12,color:B.cream}}>Visible client</span>
                  </label>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn v="gold" full onClick={sauvegarder} disabled={loading}>{loading?"Sauvegarde…":"✅ Valider et sauvegarder"}</Btn>
                <Btn v="ghost" onClick={reset}>Annuler</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {/* DONE */}
      {etape==="done"&&(
        <div style={{textAlign:"center",padding:"28px 16px"}}>
          <div style={{fontSize:52,marginBottom:10}}>✅</div>
          <div style={{fontFamily:FS,fontSize:18,fontWeight:800,color:B.success,marginBottom:6}}>Fiche sauvegardée</div>
          <div style={{fontSize:12,color:B.muted,marginBottom:20,lineHeight:1.7}}>
            La fiche est en <strong style={{color:B.warning}}>brouillon</strong>.<br/>
            Publie-la depuis le catalogue Events quand tu es prête.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <Btn v="primary" full onClick={reset}>📸 Analyser un autre article</Btn>
            {gotoEvents&&<Btn v="ghost" full onClick={gotoEvents}>→ Voir le catalogue Events</Btn>}
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// NAVIGATION + APP ROOT
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// BOUTON PAIEMENT SUMUP — Composant principal
// Toute logique sensible côté serveur (/api/payments/sumup)
// ═══════════════════════════════════════════════════════════
function BoutonSumup({ montant, description, commande_id, client_id, univers, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const payer = async () => {
    if (!montant || montant <= 0) { setErreur("Montant invalide."); return; }
    setLoading(true); setErreur(null);
    try {
      const r = await fetch("/api/payments/sumup/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant, description, commande_id, client_id, univers }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setErreur(d.error || "Erreur SumUp");
    } catch (e) {
      setErreur("Impossible de contacter SumUp. Vérifiez votre connexion.");
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <button onClick={payer} disabled={loading||disabled}
        style={{
          background: loading ? "rgba(0,180,216,0.5)" : "linear-gradient(135deg,#00b4d8,#0077b6)",
          border:"none",borderRadius:10,padding:"12px",color:"#fff",
          cursor:loading||disabled?"not-allowed":"pointer",
          fontWeight:700,fontSize:13,fontFamily:"Inter,system-ui,sans-serif",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          opacity:disabled?0.5:1,
        }}>
        {loading ? "⏳ Redirection…" : `💳 Payer avec SumUp — ${montant}€`}
      </button>
      {erreur&&<div style={{fontSize:11,color:"#ef4444",textAlign:"center"}}>{erreur}</div>}
      <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",textAlign:"center"}}>🔒 Paiement sécurisé SumUp · Aucune donnée bancaire stockée</div>
    </div>
  );
}

// Bouton WhatsApp paiement (fallback toujours disponible)
function BoutonPaymentWhatsApp({ montant, description }) {
  return (
    <button onClick={()=>window.open(WA("Bonjour, je souhaite régler "+(montant)+"€ pour : "+(description)+". Merci de me communiquer les modalités de paiement."),"_blank")}
      style={{width:"100%",background:"linear-gradient(135deg,#25d366,#128c7e)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"Inter,system-ui,sans-serif"}}>
      💬 Régler via WhatsApp
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// ERP PROJETS — Vue fondatrice
// ═══════════════════════════════════════════════════════════
function ErpProjetsF({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [filtreUnivers, setFiltreUnivers] = useState("tous");

  const { data: projets, loading, reload } = useP1Data("erp_projets", { select:"*", order:"priorite.asc,echeance.asc", limit:200 }, []);
  const { data: kpis } = useP1Data("v_erp_projets_dashboard", { select:"*", order:null, limit:1 }, []);

  const STATUTS = ["tous","backlog","en_cours","en_attente","en_validation","validé","archivé"];
  const UNIVERS = ["tous","BSH","EVENTS","ODYSSEE","FOOD","VILO","STRUCTURE","GENERAL"];
  const PRIORITES = ["basse","normale","haute","urgente"];
  const SOURCES = ["Interne","ChatGPT","Client","IA Bellaïa","Brainstorm"];

  const getFondId = () => user?.id || "";

  const projetsFiltres = projets.filter(p => {
    const s = filtreStatut  === "tous" || p.statut  === filtreStatut;
    const u = filtreUnivers === "tous" || p.univers === filtreUnivers;
    return s && u;
  });

  const prioriteColor = p => ({ urgente:"#ef4444",haute:B.warning,normale:B.violetL,basse:B.muted })[p]||B.muted;
  const statutColor   = s => ({ en_cours:`${B.violet}25`,validé:"rgba(80,180,120,0.2)",backlog:"rgba(80,80,80,0.2)",en_attente:"rgba(201,168,76,0.2)",en_validation:"rgba(59,130,246,0.2)",archivé:"rgba(80,80,80,0.15)" })[s]||"transparent";
  const statutTxt     = s => ({ en_cours:B.violetL,validé:B.success,backlog:B.muted,en_attente:B.warning,en_validation:"#60a5fa",archivé:B.muted })[s]||B.muted;

  const save = async () => {
    if (!form.titre?.trim()) return;
    const d = { ...form, fondatrice_id: getFondId(), updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("erp_projets", form._edit, d);
    else await sbPost("erp_projets", d);
    reload(); setModal(null);
  };

  const k = kpis[0] || {};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:B.cream,fontFamily:"'Cormorant Garamond',serif"}}>Projets ERP</div>
          <div style={{fontSize:11,color:B.muted}}>{projets.length} projets · {k.en_cours||0} en cours</div>
        </div>
        <Btn sm onClick={()=>{setForm({statut:"backlog",priorite:"normale",avancement:0,source:"Interne"});setModal("proj");}}>+ Projet</Btn>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
        {[{l:"En cours",v:k.en_cours||0,c:B.violetL},{l:"Urgents",v:k.urgents||0,c:"#ef4444"},{l:"En retard",v:k.en_retard||0,c:B.warning},{l:"Backlog",v:k.backlog||0},{l:"ChatGPT",v:k.depuis_chatgpt||0},{l:"Avancement",v:`${k.avancement_moyen||0}%`,c:B.gold}].map(s=>(
          <div key={s.l} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
            <div style={{fontSize:17,fontWeight:900,color:s.c||B.cream,fontFamily:"'Cormorant Garamond',serif"}}>{s.v}</div>
            <div style={{fontSize:9,color:B.muted}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
        {STATUTS.map(s=>(
          <button key={s} onClick={()=>setFiltreStatut(s)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:9,fontWeight:700,background:filtreStatut===s?B.surface:"transparent",color:filtreStatut===s?B.cream:B.muted,flexShrink:0,fontFamily:"Inter,system-ui,sans-serif"}}>{s}</button>
        ))}
      </div>

      {loading&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
      {!loading&&projetsFiltres.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucun projet</div>}

      {projetsFiltres.map(p=>(
        <div key={p.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"12px 14px",borderLeft:`3px solid ${prioriteColor(p.priorite)}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:3}}>{p.titre}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                <span style={{background:statutColor(p.statut),color:statutTxt(p.statut),borderRadius:99,padding:"2px 7px",fontSize:9,fontWeight:700}}>{p.statut}</span>
                {p.univers&&<span style={{background:`${B.violet}18`,color:B.violetL,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>{p.univers}</span>}
                {p.source&&p.source!=="Interne"&&<span style={{background:"rgba(201,168,76,0.15)",color:B.gold,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>📎 {p.source}</span>}
              </div>
              {p.echeance&&<div style={{fontSize:10,color:new Date(p.echeance)<new Date()?B.danger:B.muted}}>📅 {fmt(p.echeance)}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:prioriteColor(p.priorite),marginBottom:4}}>{p.priorite}</div>
              <div style={{display:"flex",gap:4}}>
                <Btn sm v="ghost" onClick={()=>{setForm({...p,_edit:p.id});setModal("proj");}}>✏</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("erp_projets",p.id).then(reload);}}>✕</Btn>
              </div>
            </div>
          </div>
          {/* Barre d'avancement */}
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:4,height:5,overflow:"hidden"}}>
            <div style={{background:`linear-gradient(90deg,${B.violet},${B.gold})`,height:"100%",width:`${p.avancement||0}%`,borderRadius:4,transition:"width 0.3s"}}/>
          </div>
          <div style={{fontSize:9,color:B.muted,marginTop:3}}>{p.avancement||0}% complété</div>
        </div>
      ))}

      {/* MODAL */}
      {modal==="proj"&&(
        <Mdl title={form._edit?"Modifier projet":"Nouveau projet"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du projet"/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Univers"><Sel value={form.univers||"GENERAL"} onChange={e=>setForm({...form,univers:e.target.value})} options={UNIVERS.slice(1)}/></Fld>
            <Fld label="Source"><Sel value={form.source||"Interne"} onChange={e=>setForm({...form,source:e.target.value})} options={SOURCES}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Statut"><Sel value={form.statut||"backlog"} onChange={e=>setForm({...form,statut:e.target.value})} options={STATUTS.slice(1)}/></Fld>
            <Fld label="Priorité"><Sel value={form.priorite||"normale"} onChange={e=>setForm({...form,priorite:e.target.value})} options={PRIORITES}/></Fld>
          </div>
          <Fld label="Échéance"><Inp type="date" value={form.echeance||""} onChange={e=>setForm({...form,echeance:e.target.value})}/></Fld>
          <Fld label={`Avancement : ${form.avancement||0}%`}>
            <input type="range" min={0} max={100} value={form.avancement||0} onChange={e=>setForm({...form,avancement:parseInt(e.target.value)})} style={{width:"100%",accentColor:B.violet}}/>
          </Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ERP TÂCHES — Vue fondatrice
// ═══════════════════════════════════════════════════════════
function ErpTachesF({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filtre, setFiltre] = useState("tous");

  const { data: taches, loading, reload } = useP1Data("v_erp_taches_urgentes", { select:"*", order:null, limit:100 }, []);
  const { data: projets } = useP1Data("erp_projets", { select:"id,titre", order:"titre.asc", limit:100 }, []);

  const tachesFiltres = taches.filter(t => filtre==="tous" || t.niveau_urgence===filtre);

  const urgenceColor = n => ({ en_retard:"#ef4444",aujourd_hui:B.warning,urgent:"#f97316",normal:B.muted })[n]||B.muted;
  const prioriteIco  = p => ({ urgente:"🔴",haute:"🟠",normale:"🟡",basse:"🟢" })[p]||"⚪";

  const save = async () => {
    if (!form.titre?.trim()) return;
    const d = { ...form, fondatrice_id: user?.id, updated_at: new Date().toISOString() };
    delete d._edit;
    if (form._edit) await sbPatch("erp_taches", form._edit, d);
    else await sbPost("erp_taches", d);
    reload(); setModal(null);
  };

  const terminer = async (id) => {
    await sbPatch("erp_taches", id, { statut: "terminé", updated_at: new Date().toISOString() });
    reload();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:B.cream,fontFamily:"'Cormorant Garamond',serif"}}>Tâches</div>
          <div style={{fontSize:11,color:B.muted}}>{taches.filter(t=>t.statut!=="terminé").length} actives</div>
        </div>
        <Btn sm onClick={()=>{setForm({statut:"à_faire",priorite:"normale",type_tache:"action"});setModal("task");}}>+ Tâche</Btn>
      </div>

      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
        {["tous","en_retard","aujourd_hui","urgent","normal"].map(f=>(
          <button key={f} onClick={()=>setFiltre(f)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:9,fontWeight:700,background:filtre===f?B.surface:"transparent",color:filtre===f?B.cream:B.muted,flexShrink:0,fontFamily:"Inter,system-ui,sans-serif"}}>{f}</button>
        ))}
      </div>

      {loading&&<div style={{textAlign:"center",padding:"16px",color:B.muted,fontSize:12}}>Chargement…</div>}
      {!loading&&tachesFiltres.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>✅ Aucune tâche en attente</div>}

      {tachesFiltres.map(t=>(
        <div key={t.id} style={{background:B.card,border:"1px solid "+(urgenceColor(t.niveau_urgence))+("33"),borderRadius:12,padding:"11px 13px",borderLeft:`3px solid ${urgenceColor(t.niveau_urgence)}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:B.cream,marginBottom:2}}>{prioriteIco(t.priorite)} {t.titre}</div>
              {t.echeance&&<div style={{fontSize:10,color:urgenceColor(t.niveau_urgence)}}>📅 {fmt(t.echeance)} · {t.niveau_urgence}</div>}
              {t.univers&&<div style={{fontSize:9,color:B.violetL,marginTop:2}}>{t.univers}</div>}
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <Btn sm v="gold" onClick={()=>terminer(t.id)}>✓</Btn>
              <Btn sm v="ghost" onClick={()=>{setForm({...t,_edit:t.id});setModal("task");}}>✏</Btn>
            </div>
          </div>
        </div>
      ))}

      {modal==="task"&&(
        <Mdl title={form._edit?"Modifier tâche":"Nouvelle tâche"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre de la tâche"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Priorité"><Sel value={form.priorite||"normale"} onChange={e=>setForm({...form,priorite:e.target.value})} options={["basse","normale","haute","urgente"]}/></Fld>
            <Fld label="Statut"><Sel value={form.statut||"à_faire"} onChange={e=>setForm({...form,statut:e.target.value})} options={["à_faire","en_cours","bloqué","terminé"]}/></Fld>
          </div>
          <Fld label="Univers"><Sel value={form.univers||"GENERAL"} onChange={e=>setForm({...form,univers:e.target.value})} options={["BSH","EVENTS","ODYSSEE","FOOD","VILO","STRUCTURE","GENERAL"]}/></Fld>
          <Fld label="Échéance"><Inp type="date" value={form.echeance||""} onChange={e=>setForm({...form,echeance:e.target.value})}/></Fld>
          <Fld label="Projet lié"><select value={form.projet_id||""} onChange={e=>setForm({...form,projet_id:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid "+(B.border),borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:"Inter,system-ui,sans-serif"}}>
            <option value="">— Aucun —</option>
            {projets.map(p=><option key={p.id} value={p.id}>{p.titre}</option>)}
          </select></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STOCKS — Vue fondatrice tous pôles
// ═══════════════════════════════════════════════════════════
function StocksF({ user }) {
  const [stocks, setStocks] = useState([]);
  const [filtreUnivers, setFiltreUnivers] = useState("tous");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const UNIVERS_STOCK = ["tous","BSH","EVENTS","ODYSSEE","FOOD","GENERAL"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sbGet("stocks", {
          select: "*",
          order: "quantite.asc",
          limit: 200,
        });
        setStocks(data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const stocksFiltres = filtreUnivers === "tous"
    ? stocks
    : stocks.filter(s => s.univers === filtreUnivers);

  const critiques = stocks.filter(s => parseFloat(s.quantite) <= parseFloat(s.quantite_min) && s.statut === "actif");
  const valeurTotale = stocks.reduce((sum, s) => sum + (parseFloat(s.quantite)||0) * (parseFloat(s.prix_vente)||0), 0);

  const sauvegarder = async () => {
    if (!form.nom?.trim()) return;
    try {
      const payload = {
        nom: form.nom, categorie: form.categorie || "Général",
        univers: form.univers || "GENERAL",
        quantite: parseFloat(form.quantite) || 0,
        quantite_min: parseFloat(form.quantite_min) || 1,
        prix_vente: parseFloat(form.prix_vente) || 0,
        prix_achat: parseFloat(form.prix_achat) || 0,
        unite: form.unite || "unité",
        statut: "actif", notes: form.notes || "",
      };
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const token = getToken();
      if (form._edit) {
        await fetch(`${SB_URL}/rest/v1/stocks?id=eq.${form._edit}`, {
          method: "PATCH",
          headers: { apikey: token, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({...payload, updated_at: new Date().toISOString()}),
        });
        setStocks(s => s.map(x => x.id === form._edit ? {...x,...payload,id:form._edit} : x));
      } else {
        const r = await fetch(`${SB_URL}/rest/v1/stocks`, {
          method: "POST",
          headers: { apikey: token, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify(payload),
        });
        const [created] = await r.json();
        if (created) setStocks(s => [created, ...s]);
      }
      setModal(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>📦 Stocks</div>
          <div style={{fontSize:10,color:B.muted}}>{stocks.length} articles · {critiques.length} critiques · {Math.round(valeurTotale)}€ valeur</div>
        </div>
        <button onClick={()=>{setForm({univers:"BSH",unite:"unité",quantite:0,quantite_min:1,statut:"actif"});setModal("edit");}}
          style={{background:`linear-gradient(135deg,${B.violet},#9333ea)`,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:SA}}>
          + Stock
        </button>
      </div>

      {/* Alertes critiques */}
      {critiques.length > 0 && (
        <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"10px 13px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:6}}>⚠ {critiques.length} article{critiques.length>1?"s":""} en rupture ou critique</div>
          {critiques.slice(0,5).map(s=>(
            <div key={s.id} style={{fontSize:11,color:B.cream,marginBottom:3,display:"flex",justifyContent:"space-between"}}>
              <span>{s.nom}</span>
              <span style={{color:"#ef4444",fontWeight:700}}>{s.quantite} / min {s.quantite_min} {s.unite}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {l:"Total articles",v:stocks.length,c:B.violetL},
          {l:"Critiques",v:critiques.length,c:"#ef4444"},
          {l:"Valeur stock",v:`${Math.round(valeurTotale)}€`,c:B.gold},
          {l:"Pôles",v:new Set(stocks.map(s=>s.univers)).size,c:"#0d9488"},
        ].map(k=>(
          <div key={k.l} style={{flex:1,minWidth:70,background:`${k.c}12`,border:"1px solid "+(k.c)+("30"),borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:17,fontWeight:700,color:k.c,fontFamily:FS}}>{k.v}</div>
            <div style={{fontSize:9,color:B.muted,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filtre univers */}
      <div style={{display:"flex",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
        {UNIVERS_STOCK.map(u=>(
          <button key={u} onClick={()=>setFiltreUnivers(u)}
            style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(filtreUnivers===u?B.gold:B.border),background:filtreUnivers===u?(B.gold+"18"):"transparent",color:filtreUnivers===u?B.gold:B.muted,cursor:"pointer",fontSize:10,fontWeight:filtreUnivers===u?700:400,whiteSpace:"nowrap",fontFamily:SA}}>
            {u}
          </button>
        ))}
      </div>

      {/* Liste stocks */}
      {loading ? (
        <div style={{textAlign:"center",color:B.muted,padding:20}}>Chargement…</div>
      ) : stocksFiltres.length === 0 ? (
        <div style={{textAlign:"center",color:B.muted,padding:20,fontSize:13}}>
          Aucun article{filtreUnivers!=="tous" ? " pour "+(filtreUnivers) : ""}.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {stocksFiltres.map(s => {
            const critique = parseFloat(s.quantite) <= parseFloat(s.quantite_min);
            return (
              <div key={s.id} style={{background:`rgba(255,255,255,0.04)`,border:"1px solid "+(critique?"rgba(239,68,68,0.4)":B.border),borderRadius:12,padding:"11px 13px",borderLeft:`3px solid ${critique?"#ef4444":B.violetL}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{s.nom}</div>
                    <div style={{fontSize:10,color:B.muted,marginTop:2}}>{s.univers} · {s.categorie||"—"}</div>
                    <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                      {s.prix_vente>0&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:`${B.gold}15`,color:B.gold,fontWeight:700}}>Vente {s.prix_vente}€</span>}
                      {s.prix_achat>0&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:"rgba(255,255,255,0.07)",color:B.muted}}>Achat {s.prix_achat}€</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                    <div style={{fontSize:22,fontWeight:700,color:critique?"#ef4444":B.success,fontFamily:FS}}>{s.quantite}</div>
                    <div style={{fontSize:9,color:B.muted}}>{s.unite} · min {s.quantite_min}</div>
                    <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                      <button onClick={()=>{setForm({...s,_edit:s.id});setModal("edit");}}
                        style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+(B.border),borderRadius:7,padding:"3px 8px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>✏</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal édition */}
      {modal === "edit" && (
        <Mdl title={form._edit ? "Modifier stock" : "Nouveau stock"} onClose={()=>setModal(null)}>
          <Fld label="Nom article"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Univers"><Sel value={form.univers||"GENERAL"} onChange={e=>setForm({...form,univers:e.target.value})} options={["BSH","EVENTS","ODYSSEE","FOOD","GENERAL"]}/></Fld>
            <Fld label="Catégorie"><Inp value={form.categorie||""} onChange={e=>setForm({...form,categorie:e.target.value})} placeholder="Ex : Lingerie"/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <Fld label="Quantité"><Inp type="number" value={form.quantite||0} onChange={e=>setForm({...form,quantite:parseFloat(e.target.value)||0})}/></Fld>
            <Fld label="Min seuil"><Inp type="number" value={form.quantite_min||1} onChange={e=>setForm({...form,quantite_min:parseFloat(e.target.value)||1})}/></Fld>
            <Fld label="Unité"><Inp value={form.unite||"unité"} onChange={e=>setForm({...form,unite:e.target.value})} placeholder="unité"/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Prix vente €"><Inp type="number" value={form.prix_vente||0} onChange={e=>setForm({...form,prix_vente:parseFloat(e.target.value)||0})}/></Fld>
            <Fld label="Prix achat €"><Inp type="number" value={form.prix_achat||0} onChange={e=>setForm({...form,prix_achat:parseFloat(e.target.value)||0})}/></Fld>
          </div>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={sauvegarder} full v="gold">Enregistrer</Btn>
            <Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn>
          </div>
        </Mdl>
      )}
    </div>
  );
}

// Navigation principale fondatrice — scrollable horizontalement
const NAV_F = [
  {id:"dashboard",   ico:"◈",  l:"Accueil"},
  {id:"crm",         ico:"👥", l:"CRM"},
  {id:"finances",    ico:"€",  l:"Finances"},
  {id:"compta",      ico:"📒", l:"Compta"},
  {id:"events",      ico:"✨", l:"Events"},
  {id:"bsh",         ico:"✦",  l:"BSH"},
  {id:"struct",      ico:"🗂",  l:"Structure"},
  {id:"erp_projets", ico:"🎯", l:"Projets"},
  {id:"erp_taches",  ico:"✔",  l:"Tâches"},
  {id:"stocks",      ico:"📦", l:"Stocks"},
  {id:"biblio",      ico:"📚", l:"Éditions"},
  {id:"odyssee",     ico:"💅", l:"Odyssée"},
  {id:"apercu_ux",   ico:"👁",  l:"Aperçu"},
  {id:"studio",      ico:"✦",  l:"Studio IA"},
  {id:"editorial",   ico:"📖", l:"Éditorial"},
  {id:"food",        ico:"🍃", l:"Food"},
  {id:"ia",          ico:"◎",  l:"IA"},
];

// Placeholder pôle fondatrice
function PlaceholderModule({ ico, nom, desc }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:14,padding:"20px"}}>
      <div style={{fontSize:52}}>{ico}</div>
      <div style={{fontFamily:FS,fontSize:18,fontWeight:800,color:B.cream,textAlign:"center"}}>{nom}</div>
      <div style={{fontSize:13,color:B.muted,textAlign:"center",lineHeight:1.6}}>{desc}</div>
      <div style={{background:`${B.violet}18`,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
        <div style={{fontSize:11,color:B.mutedL}}>Module en préparation</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODE APERÇU UTILISATEUR — Dashboard fondatrice
// Visualiser Bellaïa comme si on était un utilisateur final
// Sans modifier les vraies données
// ═══════════════════════════════════════════════════════════
function ApercuUXF({ user, setPreview, setActiveUnivers }) {
  const [deviceMode, setDeviceMode] = useState("iphone");   // iphone | android | desktop
  const [contextActif, setContextActif] = useState(null);   // null = liste, sinon config aperçu

  // Contextes disponibles
  const CONTEXTES = [
    {
      id: "cliente_portail",
      ico: "👤", label: "Portail client",
      desc: "Vue générale espace client — commandes, factures, réservations",
      couleur: B.violetL,
      preview: "client", univers: null,
    },
    {
      id: "cliente_bsh",
      ico: "✦", label: "Cliente BSH",
      desc: "Boutique Bella'Secret Home avec contrôle +18",
      couleur: "#be185d",
      preview: "client", univers: "bsh",
      note: "⚠️ Le contrôle +18 s'affiche côté client uniquement",
    },
    {
      id: "cliente_odyssee",
      ico: "💅", label: "Cliente Odyssée",
      desc: "Réservations prestations beauté et catalogue produits",
      couleur: "#7c3aed",
      preview: "client", univers: "bo",
    },
    {
      id: "cliente_events",
      ico: "✨", label: "Cliente Bella'Even's",
      desc: "Catalogue événementiel, demande de devis, commandes",
      couleur: "#0d9488",
      preview: "client", univers: "events",
    },
    {
      id: "cliente_structure",
      ico: "🗂", label: "Cliente Bella'Structure",
      desc: "Modèles numériques, téléchargements, commandes graphiques",
      couleur: "#d97706",
      preview: "client", univers: "struct",
    },
    {
      id: "cliente_mtp",
      ico: "🌺", label: "Cliente Mo Ti-Péyi",
      desc: "Livres et produits pédagogiques jeunesse",
      couleur: "#b45309",
      preview: "client", univers: "mtp",
    },
    {
      id: "cliente_vilo",
      ico: "📋", label: "Cliente Vilo'Assistance",
      desc: "Services administratifs, devis, dossiers",
      couleur: "#0369a1",
      preview: "client", univers: "vilo",
    },
    {
      id: "prospect",
      ico: "🎯", label: "Prospect",
      desc: "Vue publique sans compte — formulaire de contact",
      couleur: B.gold,
      preview: "client", univers: null,
      note: "Navigation sans login actif",
    },
    {
      id: "hote",
      ico: "🏠", label: "Espace hôte",
      desc: "Vue partenaire hébergeur ou prestataire",
      couleur: "#059669",
      preview: "hote", univers: null,
    },
    {
      id: "partenaire",
      ico: "🤝", label: "Espace partenaire",
      desc: "Vue partenaire / fournisseur",
      couleur: "#6b7280",
      preview: "partenaire", univers: null,
    },
  ];

  // Devices
  const DEVICES = [
    { id:"iphone",  ico:"📱", label:"iPhone",  w:390,  h:844 },
    { id:"android", ico:"📱", label:"Android", w:412,  h:917 },
    { id:"desktop", ico:"🖥", label:"Desktop", w:"100%", h:600 },
  ];

  const device = DEVICES.find(d=>d.id===deviceMode) || DEVICES[0];

  // Lancer l'aperçu — ne modifie aucune donnée réelle
  const lancerApercu = (ctx) => {
    setPreview(ctx.preview);
    if (ctx.univers !== undefined) setActiveUnivers(ctx.univers);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>👁 Mode aperçu utilisateur</div>
          <div style={{fontSize:10,color:B.muted}}>Visualisez Bellaïa depuis la perspective de chaque utilisateur · Aucune donnée modifiée</div>
        </div>
      </div>

      {/* Avertissement */}
      <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:12,padding:"10px 13px",display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
        <div style={{fontSize:11,color:B.muted,lineHeight:1.6}}>
          Le mode aperçu vous permet de visualiser exactement ce que voient vos utilisateurs. Vos données réelles ne sont pas modifiées. Vous retournez au Dashboard en appuyant sur <strong style={{color:B.gold}}>← Retour fondatrice</strong> dans l'aperçu.
        </div>
      </div>

      {/* Sélecteur device */}
      <div>
        <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Appareil simulé</div>
        <div style={{display:"flex",gap:6}}>
          {DEVICES.map(d=>(
            <button key={d.id} onClick={()=>setDeviceMode(d.id)}
              style={{flex:1,padding:"8px 6px",borderRadius:10,border:"2px solid "+(deviceMode===d.id?B.gold:B.border),background:deviceMode===d.id?(B.gold+"15"):"transparent",color:deviceMode===d.id?B.gold:B.muted,cursor:"pointer",fontSize:11,fontWeight:deviceMode===d.id?700:400,fontFamily:SA,textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:3}}>{d.ico}</div>
              <div>{d.label}</div>
              {d.id!=="desktop"&&<div style={{fontSize:9,color:B.muted,marginTop:1}}>{d.w}×{d.h}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des contextes */}
      <div>
        <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Choisir un contexte utilisateur</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CONTEXTES.map(ctx=>(
            <div key={ctx.id}
              style={{background:B.card,border:"1px solid "+(ctx.couleur)+("25"),borderRadius:12,padding:"12px 14px",borderLeft:`3px solid ${ctx.couleur}`,cursor:"pointer",transition:"all 0.15s"}}
              onClick={()=>setContextActif(ctx)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span style={{fontSize:18}}>{ctx.ico}</span>
                    <span style={{fontSize:13,fontWeight:700,color:B.cream}}>{ctx.label}</span>
                  </div>
                  <div style={{fontSize:11,color:B.muted,lineHeight:1.5}}>{ctx.desc}</div>
                  {ctx.note&&(
                    <div style={{fontSize:10,color:"#f59e0b",marginTop:4,fontWeight:600}}>{ctx.note}</div>
                  )}
                </div>
                <div style={{flexShrink:0,marginLeft:12}}>
                  <div style={{background:`${ctx.couleur}20`,border:"1px solid "+(ctx.couleur)+("40"),borderRadius:8,padding:"5px 12px",color:ctx.couleur,fontSize:11,fontWeight:700,fontFamily:SA,textAlign:"center"}}>
                    Aperçu →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal confirmation aperçu */}
      {contextActif && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"#13111a",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"20px 16px 32px"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:8}}>{contextActif.ico}</div>
              <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>{contextActif.label}</div>
              <div style={{fontSize:11,color:B.muted,marginTop:4}}>{contextActif.desc}</div>
            </div>

            {/* Info device */}
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid "+(B.border),borderRadius:12,padding:"10px 14px",marginBottom:14}}>
              <div style={{fontSize:11,color:B.muted}}>
                {device.ico} Aperçu en mode <strong style={{color:B.cream}}>{device.label}</strong>
                {device.id!=="desktop"&&<span> ({device.w}×{device.h}px)</span>}
              </div>
            </div>

            {/* Rappels */}
            <div style={{background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:"10px 13px",marginBottom:16}}>
              <div style={{fontSize:10,color:B.gold,fontWeight:700,marginBottom:4}}>Rappels mode aperçu</div>
              <div style={{fontSize:10,color:B.muted,lineHeight:1.7}}>
                ✅ Aucune donnée réelle ne sera modifiée<br/>
                ✅ Les commandes passées en aperçu sont simulées<br/>
                ✅ Retour Dashboard via ← Retour fondatrice<br/>
                {contextActif.id==="cliente_bsh"&&"✅ Le contrôle +18 s'affichera comme pour une vraie cliente"}
              </div>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>lancerApercu(contextActif)}
                style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${contextActif.couleur},${B.violet})`,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:SA}}>
                🚀 Lancer l'aperçu
              </button>
              <button onClick={()=>setContextActif(null)}
                style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid "+(B.border),background:"transparent",color:B.muted,cursor:"pointer",fontSize:13,fontFamily:SA}}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wrapper Pré-comptabilité
function ComptaWrapper({ user }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/compta/ComptaF").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:40}}>Chargement Pré-comptabilité…</div>;
  return <Comp user={user}/>;
}

// ── Wrapper Studio IA (chargement dynamique)
function StudioIAWrapper({ user }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/core/StudioIAF").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:40}}>Chargement Studio IA…</div>;
  return <Comp user={user}/>;
}

// ── Wrapper Calculateur
function CalculateurWrapper({ pole, onPrixRetenu }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/core/CalculateurUI").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:20}}>Chargement calculateur…</div>;
  return <Comp pole={pole} onPrixRetenu={onPrixRetenu}/>;
}

// ── Wrapper Bella'Food
function FoodWrapper({ user }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/food/FoodF").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:40}}>Chargement Bella\'Food…</div>;
  return <Comp user={user}/>;
}

// ── Wrapper Générateur éditorial
function EditorialWrapper({ user }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/editorial/GenerateurEditorial").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:40}}>Chargement Éditorial…</div>;
  return <Comp user={user}/>;
}

// ── Wrapper Odyssée (chargement dynamique du module)
function OdysseeWrapper({ user }: any) {
  const [Comp, setComp] = React.useState<any>(null);
  React.useEffect(() => {
    import("../modules/odyssee/OdysseeF").then(m => setComp(()=>m.default));
  }, []);
  if (!Comp) return <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:40}}>Chargement Bella'Odyssée…</div>;
  return <Comp user={user}/>;
}

export default function BellaiaApp() {
  const [user, setUser] = useState(null);
  const [activeF, setActiveF] = useState("dashboard");
  const [preview, setPreview] = useState(null);
  const [activeUnivers, setActiveUnivers] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // BSH — Supabase avec fallback localStorage
  const [bshProd, setBshProd] = useBSHSupabase("stocks", "b5:bsh:prod", PRODS_BSH_INIT,
    r => ({
      id: r.id, name: r.nom, cat: r.categorie || "Lingerie",
      ico: "✨", prix: parseFloat(r.prix_vente) || 0,
      achat: parseFloat(r.prix_achat) || 0,
      stock: parseFloat(r.quantite) || 0,
      min: parseFloat(r.quantite_min) || 3,
      desc: r.notes || "",
    })
  );
  const [bshCmds, setBshCmds] = useBSHSupabase("invoices", "b5:bsh:cmds", CMDS_BSH_INIT,
    r => ({
      id: r.numero || r.id?.slice(0,8), client: r.client_nom || "Client",
      produit: r.objet || "Commande BSH",
      montant: parseFloat(r.total_ttc) || 0,
      acompte: parseFloat(r.acompte_recu) || 0,
      statut: r.statut === "payée" ? "Paiement complet reçu" : r.statut || "Demande reçue",
      date: r.date_emission || new Date().toISOString().split("T")[0],
      pmt: "SumUp", notes: r.notes || "",
    })
  );
  const [bshCli, setBshCli] = useBSHSupabase("clients", "b5:bsh:cli", CLIENTES_BSH_INIT,
    r => ({
      id: r.id, nom: r.prenom ? (r.prenom)+" "+(r.nom || "").trim() : r.nom || "Client",
      ville: r.ville || "", canal: r.canal_acquisition || "WhatsApp",
      vip: r.vip_level || "Bronze",
      total: parseFloat(r.total_achats) || 0,
      preferences: r.notes || "", notes: r.notes_internes || "",
    })
  );
  const [bshEvts, setBshEvts] = useStore("b5:bsh:evts", EVTS_BSH_INIT);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("bellaia_user");
        if (s) setUser(JSON.parse(s));
        // PWA : lien direct espace client (?espace=client)
        const params = new URLSearchParams(window.location.search);
        if (params.get("espace") === "client") {
          // On laisse le routage par rôle gérer — prévu pour Phase 2
        }
      } catch {}
    }
    setHydrated(true);
  }, []);

  const deconnexion = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("bellaia_user");
      localStorage.removeItem("bellaia_token");
    }
    setUser(null); setPreview(null); setActiveUnivers(null);
  };

  if (!hydrated) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:B.night}}>
      <div style={{fontSize:28,color:B.violet,animation:"pulse 1.5s infinite"}}>◎</div>
    </div>
  );

  if (!user) return <EcranConnexion onConnecte={setUser}/>;

  const role = user.role;
  const espaceEffectif =
    (role === "assistante")                   ? "fondatrice"
    : (role === "cliente" || role === "client") ? "client"
    : (role === "prestataire" || role === "hote") ? "hote"
    : (role === "partenaire")                   ? "partenaire"
    : role; // "fondatrice" → passe directement

  // ── Prévisualisations fondatrice
  // ── Bandeau retour fondatrice en mode aperçu
  const BandeauApercu = () => (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:999,background:"linear-gradient(90deg,#7c3aed,#c9a84c)",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>👁 Mode aperçu utilisateur</div>
      <button onClick={()=>{setPreview(null);setActiveUnivers(null);}}
        style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 12px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Inter,system-ui,sans-serif"}}>
        ← Retour fondatrice
      </button>
    </div>
  );

  if (preview === "client") {
    if (!activeUnivers) return <><BandeauApercu/><div style={{paddingTop:36}}><PortailClient user={{...user,role:"cliente"}} produits={bshProd} evenements={bshEvts}
      onLogout={()=>{setPreview(null);setActiveUnivers(null);}}
      onNewCommande={async cmd=>setBshCmds(p=>[cmd,...p])}/></div></>;
    if (activeUnivers==="bsh")    return <><BandeauApercu/><div style={{paddingTop:36}}><ClientBSH produits={bshProd} evenements={bshEvts} onBack={()=>setActiveUnivers(null)} onNewCommande={async cmd=>setBshCmds(p=>[cmd,...p])}/></div></>;
    if (activeUnivers==="bo")     return <ClientOdyssee rdvs={[]} onBack={()=>setActiveUnivers(null)}/>;
    if (activeUnivers==="events") return <ClientEventsPortail onBack={()=>setActiveUnivers(null)}/>;
    if (activeUnivers==="struct") return <ClientStructurePortail onBack={()=>setActiveUnivers(null)}/>;
    return <PlaceholderUnivers univers={activeUnivers} onBack={()=>setActiveUnivers(null)}/>;
  }
  if (preview === "hote")       return <><BandeauApercu/><div style={{paddingTop:36}}><EspaceHote user={user} onLogout={()=>setPreview(null)}/></div></>;
  if (preview === "partenaire") return <><BandeauApercu/><div style={{paddingTop:36}}><EspacePartenaire user={user} onLogout={()=>setPreview(null)}/></div></>;

  // ── Routage par rôle
  if (espaceEffectif === "client")
    return <PortailClient user={user} produits={bshProd} evenements={bshEvts}
      onLogout={deconnexion} onNewCommande={async cmd=>setBshCmds(p=>[cmd,...p])}/>;
  if (espaceEffectif === "hote")
    return <EspaceHote user={user} onLogout={deconnexion}/>;
  if (espaceEffectif === "partenaire")
    return <EspacePartenaire user={user} onLogout={deconnexion}/>;

  // ── Espace Fondatrice
  const views = {
    dashboard:   <DashF user={user} goto={setActiveF}/>,
    crm:         <CrmF user={user}/>,
    finances:    <FinancesP1 user={user}/>,
    compta:      <ComptaWrapper user={user}/>,
    calendrier:  <CalendrierP1 user={user}/>,
    documents:   <DocumentsP1 user={user}/>,
    biblio:      <BibliothequeF user={user}/>,
    bsh:         <BSHF produits={bshProd} setProduits={setBshProd} commandes={bshCmds} setCommandes={setBshCmds} clientes={bshCli} setClientes={setBshCli} evenements={bshEvts} setEvenements={setBshEvts}/>,
    ia:          <IAF user={user} bshCmds={bshCmds} bshProduits={bshProd}/>,
    // Pôles opérationnels
    events:      <BellaEventsF user={user} commandes={bshCmds}/>,
    struct:      <BellaStructureF user={user}/>,
    catalogue_ia:<CatalogueIAF user={user} gotoEvents={()=>setActiveF("events")}/>,
    erp_projets:<ErpProjetsF user={user}/>,
    erp_taches: <ErpTachesF user={user}/>,
    // Stocks (vue Supabase v_stocks_critiques)
    stocks:      <StocksF user={user}/>,
    // Bella'Odyssée — module complet
    odyssee:     <OdysseeWrapper user={user}/>,
    // Mode aperçu utilisateur
    apercu_ux:   <ApercuUXF user={user} setPreview={setPreview} setActiveUnivers={setActiveUnivers}/>,
    // Studio IA — module central
    studio:      <StudioIAWrapper user={user}/>,
    // Pôles Phase 2
    food:        <FoodWrapper user={user}/>,
    editorial:   <EditorialWrapper user={user}/>,
    vilo:        <PlaceholderModule ico="📋" nom="Vilo'Assistance" desc="Assistance administrative — Phase 2"/>,
    mtp:         <PlaceholderModule ico="🌺" nom="Mo Ti-Péyi" desc="Livres jeunesse — Bibliothèque Éditoriale"/>,
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:B.night,fontFamily:SA,color:B.cream,maxWidth:430,margin:"0 auto",overflowX:"hidden"}}>

      {/* Header Fondatrice */}
      <div style={{padding:"10px 14px 8px",borderBottom:"1px solid "+(B.border),display:"flex",justifyContent:"space-between",alignItems:"center",background:B.deep,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${B.violet},${B.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◎</div>
          <div>
            <div style={{fontSize:13,fontWeight:900,color:B.cream,fontFamily:FS}}>Bellaïa</div>
            <div style={{fontSize:7,color:B.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
              {role==="assistante"?"Assistante":"Fondatrice"} · {user.prenom||user.nom||user.email}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:3}}>
          <button onClick={()=>{setPreview("client");setActiveUnivers(null);}} title="Prévisualiser espace client"
            style={{background:"rgba(107,26,43,0.2)",border:"1px solid rgba(107,26,43,0.4)",borderRadius:6,padding:"4px 7px",color:B.gold,cursor:"pointer",fontSize:9,fontFamily:SA,fontWeight:700}}>👁 Client</button>
          <button onClick={()=>setPreview("hote")} title="Prévisualiser espace hôte"
            style={{background:"rgba(13,148,136,0.15)",border:"1px solid rgba(13,148,136,0.35)",borderRadius:6,padding:"4px 7px",color:"#0d9488",cursor:"pointer",fontSize:9,fontFamily:SA,fontWeight:700}}>Hôte</button>
          <button onClick={deconnexion} title="Déconnexion"
            style={{background:"none",border:"1px solid "+(B.border),borderRadius:6,padding:"4px 7px",color:B.muted,cursor:"pointer",fontSize:9,fontFamily:SA}}>✕</button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{flex:1,overflowY:"auto",padding:activeF==="bsh"?"0":"14px 12px 84px"}}>
        {views[activeF] ?? <PlaceholderModule ico="🔧" nom={activeF} desc="Module en construction"/>}
      </div>

      {/* Bottom nav fixe — scrollable horizontalement pour 10 modules */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,borderTop:"1px solid "+(B.border),background:B.deep,padding:"5px 0 calc(5px + env(safe-area-inset-bottom))",zIndex:100,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",minWidth:"max-content",padding:"0 4px"}}>
          {NAV_F.map(m=>(
            <button key={m.id} onClick={()=>setActiveF(m.id)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"3px 10px",minWidth:52,WebkitTapHighlightColor:"transparent",borderBottom:activeF===m.id?"2px solid "+(B.gold):"2px solid transparent"}}>
              <span style={{fontSize:16,color:activeF===m.id?B.gold:B.muted,transition:"color 0.15s"}}>{m.ico}</span>
              <span style={{fontSize:8,color:activeF===m.id?B.gold:B.muted,fontWeight:700,letterSpacing:"0.02em",whiteSpace:"nowrap"}}>{m.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
