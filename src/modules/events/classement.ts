// ═══════════════════════════════════════════════════════════
// Bella'Event — Classement hiérarchique (support → thème → couleur)
// et proposition automatique de pack à partir d'une demande client.
// Tout est déterministe et fonctionne sans IA : dictionnaires de
// mots-clés, palettes par thème, analyse des couleurs des images.
// ═══════════════════════════════════════════════════════════

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const contient = (texte: string, mots: string[]) => { const t = " " + norm(texte) + " "; return mots.some(m => t.includes(" " + norm(m) + " ") || (norm(m).length > 5 && t.includes(norm(m)))); };

// ── Niveau 1 : supports ──────────────────────────────────────
export const SUPPORTS: { id: string; libelle: string; ico: string; mots: string[]; patrons?: string[] }[] = [
  { id: "popcorn", libelle: "Popcorn", ico: "🍿", mots: ["popcorn", "pop corn"], patrons: ["popcorn", "patron_popcorn"] },
  { id: "chips", libelle: "Chips", ico: "🥔", mots: ["chips", "lays", "chip bag", "chips wrapper"], patrons: ["chips_wrapper"] },
  { id: "tube_chips", libelle: "Tube chips", ico: "🥫", mots: ["pringles", "pringle", "chipcan", "chip can"] },
  { id: "capri_sun", libelle: "Capri-Sun / boisson poche", ico: "🧃", mots: ["capri sun", "caprisun", "caprison", "capri"], patrons: ["capri_sun"] },
  { id: "eau", libelle: "Bouteille d'eau", ico: "💧", mots: ["eau", "water", "bouteille", "cristaline", "fruit shoot"], patrons: ["etiquette_bouteille"] },
  { id: "soda", libelle: "Soda / canette", ico: "🥤", mots: ["soda", "canette", "coca", "can"] },
  { id: "compote", libelle: "Compote", ico: "🍏", mots: ["compote", "pom potes", "pompote", "pom pote"], patrons: ["compote"] },
  { id: "bonbons", libelle: "Bonbons", ico: "🍬", mots: ["haribo", "haribot", "bonbon", "bonbons", "smarties", "m&m", "mms", "dragibus", "tagada"], patrons: ["mini_bonbons"] },
  { id: "chocolat", libelle: "Chocolat", ico: "🍫", mots: ["kinder", "bueno", "kitkat", "kit kat", "snickers", "twix", "chocolat", "nutella", "maxi"] },
  { id: "boite", libelle: "Boîtes", ico: "📦", mots: ["boite", "box", "gable", "lunch", "pyramide", "cube", "mallette", "malette", "brique", "sushi", "burger", "pizza", "hexagonale", "favor"], patrons: ["patron_gable", "favor_box", "gable_box", "boite_cadeau"] },
  { id: "sac", libelle: "Sacs & sachets", ico: "🛍️", mots: ["sac", "sachet", "gift bag", "pochette"], patrons: ["topper_sachet", "sac_cadeau"] },
  { id: "invitation", libelle: "Invitations & cartes", ico: "💌", mots: ["invitation", "faire part", "carte", "thank you", "remerciement", "rsvp", "save the date"], patrons: ["invitation", "invitation_digitale", "thank_you"] },
  { id: "topper", libelle: "Toppers", ico: "🎂", mots: ["topper", "cake topper", "cupcake"], patrons: ["cake_topper", "cupcake_topper"] },
  { id: "banderole", libelle: "Banderoles & décor", ico: "🎉", mots: ["banderole", "banner", "fanion", "guirlande", "welcome", "panneau", "affiche"], patrons: ["banderole", "panneau_welcome"] },
  { id: "etiquette", libelle: "Étiquettes & stickers", ico: "🏷️", mots: ["etiquette", "label", "sticker", "stickers", "tag", "ecusson"], patrons: ["stickers_ronds", "etiquette", "etiquette_cadeau"] },
  { id: "table", libelle: "Art de la table", ico: "🍽️", mots: ["assiette", "gobelet", "timbale", "menu", "marque place", "food tent", "chevalet", "serviette"], patrons: ["assiette", "timbale", "food_tent"] },
  { id: "goodies", libelle: "Goodies", ico: "🫧", mots: ["bulles", "tube a bulles", "gourde", "mug", "t shirt", "tshirt"], patrons: ["tube_bulles", "textile"] },
  { id: "coloriage", libelle: "Coloriages & activités", ico: "🖍️", mots: ["coloriage", "coloriages", "memory", "activite", "jeu"] },
  { id: "fond", libelle: "Fonds & textures", ico: "🎨", mots: ["unicolor", "glacage", "holographique", "marbre", "texture", "fond", "paillette", "glitter", "background"] },
];
export const supportDe = (id?: string | null) => SUPPORTS.find(s => s.id === id);
/** Support d'un patron de l'atelier d'après son type_support. */
export function supportDuPatron(type?: string | null) { return SUPPORTS.find(s => s.patrons?.includes(type || ""))?.id || null; }

// ── Niveau 2 : thèmes ────────────────────────────────────────
export type Theme = { id: string; libelle: string; mots: string[]; couleurs: { fond: string; principale: string; accent: string; texte: string }; police: string; motif: "confettis" | "etoiles" | "vagues" | "pois" | "coeurs" | "triangles"; titre?: string };
export const THEMES: Theme[] = [
  { id: "licorne", libelle: "Licorne", mots: ["licorne", "unicorn", "arc en ciel", "rainbow"], couleurs: { fond: "#fdf2fa", principale: "#c084fc", accent: "#f9a8d4", texte: "#6b21a8" }, police: "Pacifico", motif: "etoiles" },
  { id: "sirene", libelle: "Sirène", mots: ["sirene", "mermaid", "ariel", "ocean", "coquillage"], couleurs: { fond: "#ecfeff", principale: "#14b8a6", accent: "#c084fc", texte: "#134e4a" }, police: "Dancing Script", motif: "vagues" },
  { id: "dinosaure", libelle: "Dinosaures", mots: ["dinosaure", "dinosaures", "dino", "dinos", "trex", "t rex", "jurassic"], couleurs: { fond: "#f7fee7", principale: "#65a30d", accent: "#f59e0b", texte: "#365314" }, police: "Fredoka", motif: "triangles" },
  { id: "super_heros", libelle: "Super-héros", mots: ["super heros", "superheros", "super hero", "marvel", "spiderman", "spider man", "batman", "avengers", "hulk"], couleurs: { fond: "#eff6ff", principale: "#dc2626", accent: "#2563eb", texte: "#111827" }, police: "Fredoka", motif: "etoiles" },
  { id: "safari", libelle: "Safari / jungle", mots: ["safari", "jungle", "savane", "lion", "girafe", "zebre", "animaux sauvages", "roi lion"], couleurs: { fond: "#fefce8", principale: "#a16207", accent: "#65a30d", texte: "#422006" }, police: "Amatic SC", motif: "pois" },
  { id: "ourson", libelle: "Ourson", mots: ["ourson", "ours", "nounours", "teddy", "bear"], couleurs: { fond: "#fdf8f3", principale: "#b08968", accent: "#a5c8e4", texte: "#5c4033" }, police: "Fredoka", motif: "pois" },
  { id: "mer", libelle: "Mer / marin", mots: ["mer", "marin", "plage", "bateau", "ancre", "pirate", "pirates", "one piece", "nautique"], couleurs: { fond: "#f0f9ff", principale: "#1e40af", accent: "#f59e0b", texte: "#0c4a6e" }, police: "Poppins", motif: "vagues" },
  { id: "barbie", libelle: "Barbie", mots: ["barbie", "poupee"], couleurs: { fond: "#fff0f7", principale: "#ec4899", accent: "#f9a8d4", texte: "#831843" }, police: "Pacifico", motif: "coeurs" },
  { id: "peppa_pig", libelle: "Peppa Pig", mots: ["peppa", "peppa pig", "pepapig", "pepa"], couleurs: { fond: "#fff1f2", principale: "#f472b6", accent: "#ef4444", texte: "#7f1d1d" }, police: "Fredoka", motif: "pois" },
  { id: "marsupilami", libelle: "Marsupilami", mots: ["marsupilami", "marsu"], couleurs: { fond: "#fefce8", principale: "#eab308", accent: "#111827", texte: "#422006" }, police: "Fredoka", motif: "pois" },
  { id: "foot", libelle: "Foot de rue / football", mots: ["foot", "football", "foot de rue", "ballon", "psg", "soccer", "street"], couleurs: { fond: "#f0fdf4", principale: "#15803d", accent: "#111827", texte: "#052e16" }, police: "Poppins", motif: "triangles" },
  { id: "kpop", libelle: "K-pop", mots: ["kpop", "k pop", "bts", "blackpink", "korean", "coree"], couleurs: { fond: "#faf5ff", principale: "#a855f7", accent: "#ec4899", texte: "#1e1b4b" }, police: "Poppins", motif: "etoiles" },
  { id: "princesse", libelle: "Princesse", mots: ["princesse", "princess", "reine des neiges", "frozen", "chateau", "couronne"], couleurs: { fond: "#fdf4ff", principale: "#d946ef", accent: "#c9a84c", texte: "#701a75" }, police: "Great Vibes", motif: "etoiles" },
  { id: "pat_patrouille", libelle: "Pat'Patrouille", mots: ["pat patrouille", "patpatrouille", "paw patrol", "chase", "stella"], couleurs: { fond: "#eff6ff", principale: "#1d4ed8", accent: "#dc2626", texte: "#172554" }, police: "Fredoka", motif: "pois" },
  { id: "stitch", libelle: "Stitch", mots: ["stitch", "lilo"], couleurs: { fond: "#eff6ff", principale: "#3b82f6", accent: "#ec4899", texte: "#1e3a8a" }, police: "Fredoka", motif: "etoiles" },
  { id: "espace", libelle: "Espace / astronaute", mots: ["espace", "astronaute", "fusee", "planete", "galaxie", "cosmos"], couleurs: { fond: "#0f172a", principale: "#6366f1", accent: "#facc15", texte: "#f8fafc" }, police: "Poppins", motif: "etoiles" },
  { id: "papillon", libelle: "Papillons & fleurs", mots: ["papillon", "papillons", "fleur", "fleurs", "fleuri", "jardin", "boheme", "boho", "champetre"], couleurs: { fond: "#fdf6f0", principale: "#c084fc", accent: "#86efac", texte: "#4a044e" }, police: "Dancing Script", motif: "coeurs" },
  { id: "chic", libelle: "Chic doré", mots: ["chic", "elegant", "elegance", "dore", "gold", "luxe", "glamour", "gatsby", "hennessy", "whisky", "cognac"], couleurs: { fond: "#0b0709", principale: "#c6a15b", accent: "#e3b9bd", texte: "#f1e7e2" }, police: "Playfair Display", motif: "triangles" },
  { id: "moto", libelle: "Moto / voitures", mots: ["moto", "motos", "voiture", "voitures", "cars", "course", "circuit"], couleurs: { fond: "#f8fafc", principale: "#111827", accent: "#ef4444", texte: "#111827" }, police: "Poppins", motif: "triangles" },
  { id: "noel", libelle: "Noël", mots: ["noel", "christmas", "pere noel", "sapin", "renne"], couleurs: { fond: "#fffbeb", principale: "#b91c1c", accent: "#15803d", texte: "#450a0a" }, police: "Great Vibes", motif: "etoiles" },
  { id: "halloween", libelle: "Halloween", mots: ["halloween", "citrouille", "sorciere", "fantome"], couleurs: { fond: "#1c1917", principale: "#f97316", accent: "#a855f7", texte: "#fafaf9" }, police: "Amatic SC", motif: "triangles" },
];
export const themeDe = (id?: string | null) => THEMES.find(t => t.id === id);

// ── Niveau 3 : couleurs nommées ──────────────────────────────
export const COULEURS: { id: string; libelle: string; hex: string }[] = [
  { id: "rose", libelle: "Rose", hex: "#f472b6" }, { id: "rouge", libelle: "Rouge", hex: "#dc2626" }, { id: "orange", libelle: "Orange", hex: "#f97316" },
  { id: "jaune", libelle: "Jaune", hex: "#facc15" }, { id: "vert", libelle: "Vert", hex: "#16a34a" }, { id: "bleu_ciel", libelle: "Bleu ciel", hex: "#7dd3fc" },
  { id: "bleu", libelle: "Bleu", hex: "#2563eb" }, { id: "violet", libelle: "Violet", hex: "#9333ea" }, { id: "dore", libelle: "Doré", hex: "#c9a84c" },
  { id: "argent", libelle: "Argenté / gris", hex: "#a8a29e" }, { id: "noir", libelle: "Noir", hex: "#111111" }, { id: "blanc", libelle: "Blanc", hex: "#f8f8f8" },
  { id: "beige", libelle: "Beige / nude", hex: "#e7d3bf" }, { id: "marron", libelle: "Marron", hex: "#8b5a2b" }, { id: "multicolore", libelle: "Multicolore", hex: "linear-gradient(90deg,#f472b6,#facc15,#16a34a,#2563eb)" },
];
const MOTS_COULEURS: Record<string, string[]> = { rose: ["rose", "pink", "fuchsia", "poudre"], rouge: ["rouge", "red", "bordeaux"], orange: ["orange", "corail"], jaune: ["jaune", "yellow"], vert: ["vert", "green", "sauge", "emeraude"], bleu_ciel: ["bleu ciel", "turquoise", "pastel bleu"], bleu: ["bleu", "blue", "marine"], violet: ["violet", "lilas", "lavande", "mauve", "purple"], dore: ["dore", "or", "gold", "doree"], argent: ["argent", "argente", "silver", "gris"], noir: ["noir", "black"], blanc: ["blanc", "white", "ivoire"], beige: ["beige", "nude", "creme", "champagne", "taupe"], marron: ["marron", "chocolat", "brun", "caramel"], multicolore: ["multicolore", "arc en ciel", "rainbow", "holographique"] };

/** Couleur nommée la plus proche d'un pixel (r,g,b). */
export function nommerCouleur(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2 / 255, s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
  let h = 0;
  if (max !== min) { const d = max - min; h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  if (l < 0.13) return "noir";
  if (l > 0.93 && s < 0.5) return "blanc";
  if (s < 0.14) return l > 0.75 ? "blanc" : "argent";
  if (h >= 25 && h < 50 && s < 0.55 && l > 0.55) return l > 0.78 ? "beige" : "dore";
  if (h >= 15 && h < 45 && l < 0.45) return "marron";
  if (h >= 38 && h < 56 && s >= 0.35 && l <= 0.6) return "dore";
  if (h < 12 || h >= 345) return l > 0.7 ? "rose" : "rouge";
  if (h < 38) return l > 0.75 ? "beige" : "orange";
  if (h < 66) return "jaune";
  if (h < 165) return "vert";
  if (h < 200) return l > 0.6 ? "bleu_ciel" : "bleu";
  if (h < 250) return l > 0.72 ? "bleu_ciel" : "bleu";
  if (h < 290) return "violet";
  return l > 0.45 ? "rose" : "violet";
}

/** Couleurs dominantes d'une image (≤ 3), analyse d'une miniature 48×48. */
export async function couleursImage(url: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ko(new Error("image")); i.src = url; });
  const c = document.createElement("canvas"); c.width = 48; c.height = 48;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  const compte = new Map<string, number>(); let total = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 120) continue; const n = nommerCouleur(d[i], d[i + 1], d[i + 2]); compte.set(n, (compte.get(n) || 0) + 1); total++; }
  if (!total) return [];
  const tri = [...compte.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n / total >= 0.12).map(([k]) => k);
  if (tri.filter(k => !["blanc", "noir", "argent"].includes(k)).length >= 4) return ["multicolore"];
  return tri.slice(0, 3);
}

// ── Classement d'un fichier d'après son nom / dossier ────────
export function classerParNom(nom: string, dossier = "") {
  const t = `${dossier} ${nom}`;
  const support = SUPPORTS.find(s => contient(t, s.mots))?.id || null;
  const theme = THEMES.find(th => contient(t, th.mots))?.id || null;
  const couleurs = Object.entries(MOTS_COULEURS).filter(([, m]) => contient(t, m)).map(([k]) => k);
  const nature = support === "fond" ? "fond" : /template|patron|gabarit|vierge|modele/i.test(norm(t)) ? "gabarit" : null;
  return { support, theme, couleurs, nature };
}

// ── Proposition de pack à partir d'une demande client ────────
export const PRESTATIONS: { id: string; libelle: string; mots: string[]; supports: string[]; titre: (p: string, a?: string) => string; police?: string }[] = [
  { id: "anniv_enfant", libelle: "Anniversaire enfant", mots: ["anniversaire", "anniv", "birthday"], supports: ["invitation", "chips", "capri_sun", "eau", "compote", "bonbons", "popcorn", "boite", "topper", "banderole", "table", "goodies", "etiquette", "sac"], titre: () => "Joyeux anniversaire" },
  { id: "anniv_adulte", libelle: "Anniversaire adulte", mots: ["30 ans", "40 ans", "50 ans", "anniversaire adulte"], supports: ["invitation", "eau", "bonbons", "chocolat", "chips", "topper", "banderole", "table", "etiquette"], titre: () => "Joyeux anniversaire" },
  { id: "mariage", libelle: "Mariage", mots: ["mariage", "wedding", "noces", "mariee", "maries"], supports: ["invitation", "table", "etiquette", "eau", "chocolat", "banderole", "boite", "sac"], titre: (p) => p ? `Mariage de ${p}` : "Notre mariage", police: "Great Vibes" },
  { id: "bapteme", libelle: "Baptême", mots: ["bapteme", "christening"], supports: ["invitation", "etiquette", "boite", "chocolat", "bonbons", "table", "banderole", "eau"], titre: (p) => p ? `Baptême de ${p}` : "Mon baptême", police: "Dancing Script" },
  { id: "communion", libelle: "Communion", mots: ["communion"], supports: ["invitation", "etiquette", "boite", "bonbons", "table", "eau"], titre: (p) => p ? `Communion de ${p}` : "Ma communion", police: "Dancing Script" },
  { id: "baby_shower", libelle: "Baby shower / gender reveal", mots: ["baby shower", "babyshower", "gender reveal", "naissance", "bebe"], supports: ["invitation", "eau", "bonbons", "chocolat", "etiquette", "banderole", "table", "boite"], titre: () => "Baby shower" },
  { id: "cremaillere", libelle: "Crémaillère", mots: ["cremaillere", "pendaison"], supports: ["invitation", "eau", "chips", "bonbons", "etiquette", "table"], titre: () => "Bienvenue chez nous" },
  { id: "fete", libelle: "Autre fête", mots: [], supports: ["invitation", "eau", "chips", "bonbons", "etiquette", "banderole", "table"], titre: () => "C'est la fête" },
];

export type Proposition = {
  theme: Theme | null; prestation: typeof PRESTATIONS[number]; couleurs: Theme["couleurs"]; couleursDemandees: string[]; police: string; motif: Theme["motif"];
  supports: string[]; titre: string; message: string; fond: any | null; personnage: any | null; imagesTheme: any[]; notes: string[];
};

/** Analyse la demande et propose un pack complet (même sans image du thème). */
export function proposerPack(entree: { demande: string; prenom?: string; age?: string; prestation?: string }, medias: any[]): Proposition {
  const t = entree.demande || "";
  const theme = THEMES.find(th => contient(t, th.mots)) || null;
  const ageNum = parseInt(entree.age || (t.match(/(\d{1,2})\s*ans/)?.[1] || ""), 10);
  let prestation = PRESTATIONS.find(p => p.id === entree.prestation) || PRESTATIONS.find(p => p.id !== "anniv_enfant" && p.id !== "anniv_adulte" && contient(t, p.mots));
  if (!prestation) prestation = PRESTATIONS.find(p => p.id === (Number.isFinite(ageNum) && ageNum >= 16 ? "anniv_adulte" : "anniv_enfant"))!;
  const couleursDemandees = Object.entries(MOTS_COULEURS).filter(([, m]) => contient(t, m)).map(([k]) => k);
  const hex = (id: string) => COULEURS.find(c => c.id === id)?.hex || "#b5838d";
  let couleurs = theme ? { ...theme.couleurs } : { fond: "#fdf6f0", principale: "#b5838d", accent: "#c9a84c", texte: "#2d2424" };
  const pleines = couleursDemandees.filter(c => c !== "multicolore");
  if (pleines[0]) couleurs.principale = hex(pleines[0]);
  if (pleines[1]) couleurs.accent = hex(pleines[1]);
  // Lisibilité : la couleur principale (titres) doit contraster avec le fond
  if (contraste(couleurs.principale, couleurs.fond) < 2.2) {
    if (contraste(couleurs.accent, couleurs.fond) >= 2.2) [couleurs.principale, couleurs.accent] = [couleurs.accent, couleurs.principale];
    else couleurs.fond = luminance(couleurs.principale) < 0.4 ? "#fdf6f0" : "#1c1917";
  }
  if (contraste(couleurs.accent, couleurs.fond) < 1.6) couleurs.accent = theme && contraste(theme.couleurs.accent, couleurs.fond) >= 1.6 ? theme.couleurs.accent : (luminance(couleurs.fond) > 0.5 ? "#b5838d" : "#e3b9bd");
  if (contraste(couleurs.texte, couleurs.fond) < 4) couleurs.texte = luminance(couleurs.fond) > 0.5 ? "#2d2424" : "#f8f4ee";
  const notes: string[] = [];
  // Images de la médiathèque : d'abord le thème, sinon des fonds dans les bonnes couleurs
  const imagesTheme = theme ? medias.filter(m => m.theme === theme.id) : [];
  const cibles = pleines.length ? pleines : theme ? [nommerDepuisHex(couleurs.principale)] : [];
  const fonds = medias.filter(m => (m.type_support === "fond" || m.nature === "fond") && (m.couleurs || []).some((c: string) => cibles.includes(c)));
  const fond = imagesTheme.find(m => m.nature === "fond") || fonds[0] || null;
  const personnage = imagesTheme.find(m => m.nature !== "fond" && m.nature !== "gabarit") || null;
  if (theme && !imagesTheme.length) notes.push(`Aucune image « ${theme.libelle} » dans ta médiathèque : le pack utilise la palette et un décor ${libelleMotif(theme.motif)} générés automatiquement. Ajoute une image du thème pour l'enrichir.`);
  if (!theme) notes.push("Thème non reconnu dans la demande : palette élégante par défaut. Précise le thème (ex. licorne, safari, super-héros…) pour l'adapter.");
  if (fond) notes.push("Fond suggéré depuis ta médiathèque, dans les couleurs de la demande.");
  const ado = Number.isFinite(ageNum) && ageNum >= 12 && ageNum < 18;
  let supports = [...prestation.supports];
  if (Number.isFinite(ageNum) && ageNum >= 16) supports = supports.filter(s => !["goodies", "compote", "capri_sun", "coloriage"].includes(s));
  if (Number.isFinite(ageNum) && ageNum <= 10 && prestation.id.startsWith("anniv")) supports = Array.from(new Set([...supports, "coloriage"]));
  const police = prestation.police && !theme ? prestation.police : theme?.police || prestation.police || "Playfair Display";
  return {
    theme, prestation, couleurs, couleursDemandees, police: ado && police === "Fredoka" ? "Poppins" : police, motif: theme?.motif || "confettis",
    supports, titre: prestation.titre(entree.prenom || "", entree.age), message: "Merci d'être venu·e !", fond, personnage, imagesTheme, notes,
  };
}
function luminance(h: string) { const n = parseInt(h.slice(1, 7), 16); const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
function contraste(a: string, b: string) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
function nommerDepuisHex(h: string) { const n = parseInt(h.slice(1), 16); return nommerCouleur((n >> 16) & 255, (n >> 8) & 255, n & 255); }
function libelleMotif(m: string) { return ({ confettis: "de confettis", etoiles: "d'étoiles", vagues: "de vagues", pois: "à pois", coeurs: "de cœurs", triangles: "géométrique" } as any)[m] || ""; }
