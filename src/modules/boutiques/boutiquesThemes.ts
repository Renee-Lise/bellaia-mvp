// ═══════════════════════════════════════════════════════════
// Identités des boutiques clientes + configuration de merchandising
// PAR DÉFAUT (bannières, collections, catégories). Le studio de
// merchandising enregistrera une version modifiée (brouillon → publiée)
// qui remplace ces valeurs, sans intervention dans le code.
// ═══════════════════════════════════════════════════════════
import type { Motif } from "./illustrations";

export type Banniere = { titre: string; sous: string; cta: string; motif: Motif; filtre?: string; palette: [string, string, string] };
export type Collection = { titre: string; filtre: { categorie?: string; mot?: string; prixMax?: number; nouveautes?: boolean } };
export type Theme = {
  code: "BSH" | "FOOD" | "EVENTS" | "ODYSSEE"; nom: string; accroche: string; logo: string;
  fond: string; surface: string; texte: string; doux: string; accent: string; accent2: string; prixCouleur: string; ligne: string;
  titres: string; corps: string; rayon: number; densite: "dense" | "aere"; colonnes: number;
  ctaAjout: string; ctaPanier: string; promoLibelle: string;
  bannieres: Banniere[]; collections: Collection[];
  categories: Record<string, { libelle: string; motif: Motif; palette: [string, string, string] }>;
  motifDefaut: Motif; paletteDefaut: [string, string, string];
  bandeau: string[];
};

const SERIF = "Georgia, 'Times New Roman', serif", SANS = "system-ui, -apple-system, 'Helvetica Neue', sans-serif";

export const THEMES: Record<string, Theme> = {
  BSH: {
    code: "BSH", nom: "Bella'Secret Home", accroche: "Boudoir · Plaisirs · Bien-être intime", logo: "/branding/bella-secret-home.jpg",
    fond: "#0b0709", surface: "#17090e", texte: "#f6ece6", doux: "rgba(246,236,230,0.6)", accent: "#d39aa8", accent2: "#c6a15b", prixCouleur: "#f1d3da", ligne: "rgba(211,154,168,0.2)",
    titres: SERIF, corps: SANS, rayon: 14, densite: "dense", colonnes: 2, ctaAjout: "+", ctaPanier: "Passer commande en toute discrétion", promoLibelle: "Offre",
    bandeau: ["Commande confidentielle", "Paiement sécurisé", "Conseils personnalisés"],
    bannieres: [
      { titre: "Nouveautés du boudoir", sous: "Les dernières arrivées, choisies pour vous", cta: "Découvrir", motif: "coeur", filtre: "nouveautes", palette: ["#3a0f1c", "#7a2a44", "#d39aa8"] },
      { titre: "Soirées à deux", sous: "Coffrets & jeux pour pimenter vos soirées", cta: "Voir les coffrets", motif: "coffret", filtre: "Coffrets & Expériences", palette: ["#1b0a10", "#5b1e33", "#c6a15b"] },
      { titre: "Rituel bien-être", sous: "Huiles, gels et soins intimes", cta: "Explorer", motif: "flacon", filtre: "Aphrodisiaques & Bien-être", palette: ["#2a0d18", "#9b4a63", "#f1d3da"] },
    ],
    collections: [{ titre: "Nouveautés", filtre: { nouveautes: true } }, { titre: "Petits prix · moins de 10 €", filtre: { prixMax: 10 } }, { titre: "Massage & sensualité", filtre: { mot: "massage" } }, { titre: "Jeux coquins", filtre: { mot: "game|jeu" } }],
    categories: {
      "Aphrodisiaques & Bien-être": { libelle: "Bien-être", motif: "flacon", palette: ["#4a1426", "#b06079", "#f1d3da"] },
      "Sextoys & Accessoires": { libelle: "Accessoires", motif: "coeur", palette: ["#2b0b16", "#8f3352", "#d39aa8"] },
      "Coffrets & Expériences": { libelle: "Coffrets", motif: "coffret", palette: ["#1d0a10", "#6b2a3f", "#c6a15b"] },
      "Lingerie & Tenues": { libelle: "Lingerie", motif: "dentelle", palette: ["#120609", "#5a1a2b", "#e6c98f"] },
      "BDSM & Contraintes": { libelle: "Audace", motif: "plume", palette: ["#0b0709", "#3a0f1c", "#c6a15b"] },
    },
    motifDefaut: "coeur", paletteDefaut: ["#2b0b16", "#8f3352", "#d39aa8"],
  },
  FOOD: {
    code: "FOOD", nom: "Bella'Food", accroche: "Cuisine créole maison · Traiteur · Douceurs", logo: "/branding/bellafood-logo.png",
    fond: "#f7f1e3", surface: "#fffdf8", texte: "#2b2a1c", doux: "rgba(43,42,28,0.6)", accent: "#55632d", accent2: "#c9a54e", prixCouleur: "#55632d", ligne: "rgba(85,99,45,0.14)",
    titres: SERIF, corps: SANS, rayon: 18, densite: "aere", colonnes: 2, ctaAjout: "Ajouter", ctaPanier: "Commander", promoLibelle: "Offre",
    bandeau: ["Fait maison", "Cuisine créole", "Paiement sécurisé"],
    bannieres: [
      { titre: "Barquettes de la maison", sous: "Frites maison, poulet boucané, tenders, brochettes", cta: "Je commande", motif: "frites", filtre: "street_food", palette: ["#3f4a20", "#55632d", "#c9a54e"] },
      { titre: "Burgers signature", sous: "Pain doré, sauce secrète Bella'Food", cta: "Découvrir", motif: "burger", filtre: "burger", palette: ["#6b4a2a", "#a0703f", "#e9d9b4"] },
      { titre: "Douceurs & pâtisseries", sous: "Cakes, cookies, layer cups", cta: "Craquer", motif: "gateau", filtre: "patisserie", palette: ["#8a7a3c", "#c9a54e", "#fffdf8"] },
    ],
    collections: [{ titre: "Les incontournables", filtre: { categorie: "street_food" } }, { titre: "Boissons fraîches", filtre: { categorie: "boisson" } }, { titre: "Petites faims · moins de 5 €", filtre: { prixMax: 5 } }],
    categories: {
      street_food: { libelle: "Barquettes", motif: "frites", palette: ["#55632d", "#7d8c45", "#e9d9b4"] }, burger: { libelle: "Burgers", motif: "burger", palette: ["#6b4a2a", "#a0703f", "#e9d9b4"] },
      crepe: { libelle: "Crêpes", motif: "crepe", palette: ["#c9a54e", "#e2c886", "#6b4a2a"] }, poulet: { libelle: "Poulet", motif: "poulet", palette: ["#8a5a2b", "#b9824a", "#e9d9b4"] },
      boisson: { libelle: "Boissons", motif: "boisson", palette: ["#4f6f6a", "#86a8a0", "#e9d9b4"] }, jus: { libelle: "Jus maison", motif: "boisson", palette: ["#b5653c", "#d99a6c", "#fffdf8"] },
      cocktail: { libelle: "Cocktails", motif: "boisson", palette: ["#8a3f4f", "#c27a86", "#e9d9b4"] }, the_glace: { libelle: "Thés glacés", motif: "boisson", palette: ["#55632d", "#93a35e", "#fffdf8"] },
      dessert: { libelle: "Desserts", motif: "gateau", palette: ["#b77d8c", "#dcb2bc", "#55632d"] }, patisserie: { libelle: "Pâtisseries", motif: "gateau", palette: ["#c9a54e", "#e2c886", "#6b4a2a"] },
      cake: { libelle: "Cakes", motif: "gateau", palette: ["#a0703f", "#cfa070", "#fffdf8"] }, cupcake: { libelle: "Cupcakes", motif: "gateau", palette: ["#b77d8c", "#e3c2ca", "#55632d"] }, entremet: { libelle: "Layer cups", motif: "gateau", palette: ["#6e5a86", "#a893bd", "#e9d9b4"] },
      accompagnement: { libelle: "À côté", motif: "frites", palette: ["#8a7a3c", "#c9a54e", "#fffdf8"] }, sauce: { libelle: "Sauces", motif: "bol", palette: ["#b5653c", "#d99a6c", "#fffdf8"] },
      riz: { libelle: "Riz", motif: "bol", palette: ["#55632d", "#93a35e", "#fffdf8"] }, pates: { libelle: "Gratins", motif: "bol", palette: ["#c9a54e", "#e2c886", "#55632d"] }, soupe: { libelle: "Soupes", motif: "bol", palette: ["#b5653c", "#d99a6c", "#e9d9b4"] }, entree: { libelle: "Entrées", motif: "bol", palette: ["#7d8c45", "#b3c07a", "#fffdf8"] },
    },
    motifDefaut: "bol", paletteDefaut: ["#55632d", "#93a35e", "#e9d9b4"],
  },
  EVENTS: {
    code: "EVENTS", nom: "Bella'Even's", accroche: "Papeterie · Décoration · Événements sur mesure", logo: "/branding/bella-evenes.jpg",
    fond: "#fbf7f4", surface: "#ffffff", texte: "#2d2430", doux: "rgba(45,36,48,0.58)", accent: "#7a4a5c", accent2: "#8a9a7b", prixCouleur: "#2d2430", ligne: "rgba(45,36,48,0.1)",
    titres: SERIF, corps: SANS, rayon: 12, densite: "aere", colonnes: 2, ctaAjout: "Personnaliser", ctaPanier: "Demander mon devis", promoLibelle: "Offre",
    bandeau: ["Création sur mesure", "Devis personnalisé", "Conseils déco"],
    bannieres: [
      { titre: "Vos invitations, à votre image", sous: "Faire-part et cartons imprimés, design unique", cta: "Personnaliser", motif: "invitation", filtre: "Papeterie personnalisée", palette: ["#7a4a5c", "#b07a8e", "#f3e1e7"] },
      { titre: "Une table qui raconte votre fête", sous: "Centres de table, menus, marque-places", cta: "Voir la décoration", motif: "fleur", filtre: "Décoration événementielle", palette: ["#8a9a7b", "#b9c6ab", "#7a4a5c"] },
      { titre: "Coffrets & dragées", sous: "Boîtes, urnes et contenants personnalisés", cta: "Découvrir", motif: "ruban", filtre: "Créations personnalisées", palette: ["#c9a96e", "#e6d3a8", "#7a4a5c"] },
    ],
    collections: [{ titre: "Faire-part", filtre: { mot: "faire-part" } }, { titre: "Décorer la salle", filtre: { categorie: "Décoration événementielle" } }, { titre: "Location de matériel", filtre: { categorie: "Location de matériel" } }],
    categories: {
      "Papeterie personnalisée": { libelle: "Papeterie", motif: "invitation", palette: ["#7a4a5c", "#b07a8e", "#f3e1e7"] },
      "Créations personnalisées": { libelle: "Créations", motif: "ruban", palette: ["#c9a96e", "#e6d3a8", "#7a4a5c"] },
      "Décoration événementielle": { libelle: "Décoration", motif: "fleur", palette: ["#8a9a7b", "#b9c6ab", "#7a4a5c"] },
      "Location de matériel": { libelle: "Location", motif: "fanion", palette: ["#5b6f8a", "#9bb0c9", "#f3e1e7"] },
    },
    motifDefaut: "etoile", paletteDefaut: ["#7a4a5c", "#b07a8e", "#f3e1e7"],
  },
  ODYSSEE: {
    code: "ODYSSEE", nom: "Bella'Odyssée", accroche: "Parfums · Beauté · Rituels", logo: "/branding/bella-odyssee-logo.png",
    fond: "#ffffff", surface: "#faf6f8", texte: "#151014", doux: "rgba(21,16,20,0.55)", accent: "#151014", accent2: "#c46a8e", prixCouleur: "#151014", ligne: "rgba(21,16,20,0.1)",
    titres: SERIF, corps: SANS, rayon: 4, densite: "aere", colonnes: 2, ctaAjout: "Ajouter au panier", ctaPanier: "Valider mon panier", promoLibelle: "Offre",
    bandeau: ["Conseil beauté personnalisé", "Paiement sécurisé"],
    bannieres: [
      { titre: "L'art du sillage", sous: "Parfums d'Orient, notes rares et envoûtantes", cta: "Découvrir", motif: "parfum", filtre: "Parfums", palette: ["#151014", "#5b1e4a", "#c46a8e"] },
      { titre: "Rose poudrée", sous: "La douceur signature de la saison", cta: "Shopper", motif: "parfum", filtre: "rose", palette: ["#f7d9e3", "#e7a9c0", "#5b1e4a"] },
    ],
    collections: [{ titre: "Parfums", filtre: { categorie: "Parfums" } }],
    categories: { Parfums: { libelle: "Parfums", motif: "parfum", palette: ["#151014", "#5b1e4a", "#c46a8e"] }, Maquillage: { libelle: "Maquillage", motif: "rouge", palette: ["#5b1e4a", "#c46a8e", "#f7d9e3"] } },
    motifDefaut: "parfum", paletteDefaut: ["#f7d9e3", "#e7a9c0", "#5b1e4a"],
  },
};
