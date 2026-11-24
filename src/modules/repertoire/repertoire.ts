// ═══════════════════════════════════════════════════════════
// Répertoire central Bellaïa et permissions par pôle — règles pures (sans réseau).
// Utilisé par le sélecteur de contacts (tous modules), « Accès & permissions » et le répertoire.
// Aucune donnée personnelle n'est écrite ici : seulement des règles et des catalogues.
// ═══════════════════════════════════════════════════════════

export type Contact = {
  id: string;                    // identifiant unique (compte Bellaïa : id du profil ; contact externe : id du répertoire)
  compte: boolean;               // true = compte Bellaïa ; false = contact externe (aucun compte créé)
  prenom?: string | null;
  nom?: string | null;
  pseudo?: string | null;
  email?: string | null;         // présent seulement si la personne qui consulte est autorisée à le voir
  telephone?: string | null;
  entreprise?: string | null;
  categories: string[];
  poles: string[];
  statut?: string | null;        // statut du compte ou de la fiche
  role_profil?: string | null;
};

export const CATEGORIES_INITIALES: [string, string][] = [
  ["clients", "Clients"], ["prospects", "Prospects"], ["assistants", "Assistants et assistantes"], ["hotes", "Hôtes et hôtesses"],
  ["collaborateurs", "Collaborateurs"], ["prestataires", "Prestataires"], ["fournisseurs", "Fournisseurs"], ["partenaires", "Partenaires"],
  ["responsables_poles", "Responsables de pôles"], ["candidats", "Candidats"], ["membres_bsh", "Membres BSH"], ["moderateurs", "Modérateurs"],
  ["contacts_pro", "Contacts professionnels"], ["archives", "Contacts archivés"],
];

/** Pôles Bellaïa. `univers` = code utilisé par la base pour les permissions (a_permission(p, univers)). */
export const POLES: { id: string; nom: string; univers: string | null }[] = [
  { id: "BSH", nom: "Bella’Secret Home", univers: "BSH" },
  { id: "FOOD", nom: "Bella’Food", univers: "FOOD" },
  { id: "VILDOR", nom: "Vil’Dor Pâtisse", univers: null },   // organisation partenaire : accès par fonctions rattachées (RLS 0112)
  { id: "EVENTS", nom: "Bella’Events", univers: "EVENTS" },
  { id: "ODYSSEE", nom: "Bella’Odyssée", univers: "ODYSSEE" },
  { id: "VILO", nom: "Vilo’Assistance", univers: "VILO" },
  { id: "MOTIPY", nom: "Mo Ti-Péyi", univers: "MOTIPY" },
  { id: "EDITIONS", nom: "Bella’Studio Éditions", univers: "EDITIONS" },
  { id: "DIAMONDB", nom: "Diamond B", univers: "DIAMONDB" },
];

export const FONCTIONS: [string, string][] = [["assistante", "Assistante"], ["collaborateur", "Collaboratrice / collaborateur"], ["hote", "Hôte / hôtesse"], ["prestataire", "Prestataire"], ["fournisseur", "Fournisseur"], ["qualite", "Responsable qualité"], ["autre", "Autre"]];

export type Sensibilite = "standard" | "sensible" | "critique";
export type DefPermission = { code: string; libelle: string; univers: string; domaine: string; sensibilite: Sensibilite; portee: string };

/** Catalogue des permissions réellement vérifiées par la base. `univers` « * » = transversal (tous les pôles). */
export const PERMISSIONS: DefPermission[] = [
  { code: "food.consulter", libelle: "Découvrir les plats et recettes (sans coûts ni marges)", univers: "FOOD", domaine: "Recettes", sensibilite: "standard", portee: "Bella’Food uniquement" },
  { code: "food.commandes", libelle: "Prendre une commande pour une cliente", univers: "FOOD", domaine: "Commandes", sensibilite: "standard", portee: "Bella’Food uniquement" },
  { code: "food.recettes.proposer", libelle: "Proposer une fiche recette (validée par la fondatrice)", univers: "FOOD", domaine: "Recettes", sensibilite: "standard", portee: "Bella’Food uniquement" },
  { code: "bibliotheque.gerer", libelle: "Bibliothèque et atelier d’import", univers: "FOOD", domaine: "Catalogue", sensibilite: "standard", portee: "Bella’Food uniquement" },
  { code: "food.revente.gerer", libelle: "Gérer la collection de revente (sans les marges)", univers: "FOOD", domaine: "Catalogue", sensibilite: "sensible", portee: "Bella’Food uniquement" },
  { code: "food.revente.marges", libelle: "Voir prix d’achat et marges de revente", univers: "FOOD", domaine: "Comptabilité", sensibilite: "critique", portee: "Bella’Food — coûts et marges" },
  { code: "bsh.membres_emails", libelle: "Voir les e-mails des membres BSH", univers: "BSH", domaine: "Coordonnées personnelles", sensibilite: "critique", portee: "Bella’Secret Home — données personnelles" },
  { code: "missions.gerer", libelle: "Créer et attribuer des missions", univers: "*", domaine: "Missions", sensibilite: "sensible", portee: "TOUS LES PÔLES : toutes les missions de l’équipe" },
  { code: "notifications.commandes", libelle: "Recevoir les alertes de nouvelles commandes", univers: "*", domaine: "Commandes", sensibilite: "standard", portee: "Tous les pôles (alertes)" },
  { code: "ia.utiliser", libelle: "Utiliser l’IA Bellaïa (consomme vos crédits)", univers: "*", domaine: "Intelligence artificielle", sensibilite: "critique", portee: "Tous les pôles — crédits IA" },
  { code: "paiements.creer_lien", libelle: "Créer des liens de paiement", univers: "*", domaine: "Paiements", sensibilite: "critique", portee: "Tous les pôles — paiements" },
  { code: "acces_complet", libelle: "Accès complet (équivalent fondatrice)", univers: "*", domaine: "Administration", sensibilite: "critique", portee: "TOUT Bellaïa, y compris finances et données clientes" },
];

export const DOMAINES = ["Commandes", "Catalogue", "Recettes", "Stocks", "Fournisseurs", "Événements", "Missions", "Communication", "Comptabilité", "Paiements", "Intelligence artificielle", "Administration", "Coordonnées personnelles", "Jeux et animation communautaire"];

export function groupeDePermission(p: DefPermission): string {
  return p.univers === "*" ? "Transversal (tous les pôles)" : (POLES.find(x => x.univers === p.univers)?.nom || p.univers);
}

/** Modèles de permissions : appliqués sur le brouillon, jamais enregistrés sans clic sur « Enregistrer ». */
export const MODELES: { id: string; nom: string; fonctions: string[]; permissions: string[] }[] = [
  { id: "assistant_standard", nom: "Assistant standard", fonctions: ["assistante"], permissions: ["notifications.commandes"] },
  { id: "assistant_administratif", nom: "Assistant administratif", fonctions: ["assistante"], permissions: ["notifications.commandes", "missions.gerer"] },
  { id: "assistant_commercial", nom: "Assistant commercial", fonctions: ["assistante"], permissions: ["food.consulter", "food.commandes", "notifications.commandes"] },
  { id: "assistant_cuisine", nom: "Assistant cuisine", fonctions: ["assistante"], permissions: ["food.consulter", "food.recettes.proposer"] },
  { id: "collaborateur_patisserie", nom: "Collaborateur pâtisserie", fonctions: ["collaborateur"], permissions: [] },
  { id: "hote_bsh", nom: "Hôte BSH", fonctions: ["hote"], permissions: [] },
  { id: "hote_evenementiel", nom: "Hôte événementiel", fonctions: ["hote"], permissions: [] },
  { id: "prestataire_externe", nom: "Prestataire externe", fonctions: ["prestataire"], permissions: [] },
  { id: "responsable_pole", nom: "Responsable de pôle", fonctions: ["collaborateur"], permissions: ["notifications.commandes", "missions.gerer"] },
  { id: "moderateur", nom: "Modérateur", fonctions: ["autre"], permissions: [] },
];

/** Application d'un modèle : AJOUTE les permissions du modèle au brouillon, ne retire rien (aucune autorisation
 *  d'un autre pôle n'est écrasée). Les permissions critiques ne sont jamais ajoutées par un modèle. */
export function appliquerModele(brouillon: string[], modeleId: string): { permissions: string[]; ajoutees: string[]; ignorees: string[] } {
  const m = MODELES.find(x => x.id === modeleId);
  if (!m) return { permissions: brouillon, ajoutees: [], ignorees: [] };
  const ajoutees: string[] = [], ignorees: string[] = [];
  const res = new Set(brouillon);
  for (const code of m.permissions) {
    const d = PERMISSIONS.find(p => p.code === code);
    if (!d || d.sensibilite === "critique") { ignorees.push(code); continue; }
    if (!res.has(code)) { res.add(code); ajoutees.push(code); }
  }
  return { permissions: [...res], ajoutees, ignorees };
}

// ── Recherche, homonymes, doublons ───────────────────────────
export function normaliser(t?: string | null): string {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
const chiffres = (t?: string | null) => String(t || "").replace(/\D/g, "");

/** Score de correspondance (0 = aucune). Recherche par nom, prénom, e-mail (partiel), pseudonyme, téléphone, entreprise. */
export function score(c: Contact, requete: string): number {
  const q = normaliser(requete); if (!q) return 1;
  // Numéro de téléphone saisi (chiffres, espaces, +) : comparaison sur les chiffres seuls.
  if (/^[\d\s+().-]+$/.test(requete.trim()) && chiffres(requete).length >= 4) return chiffres(c.telephone).includes(chiffres(requete)) ? 50 : 0;
  const termes = q.split(" ");
  const champs = [c.prenom, c.nom, c.pseudo, c.email, c.entreprise].map(normaliser);
  const complet = normaliser(`${c.prenom || ""} ${c.nom || ""}`); const inverse = normaliser(`${c.nom || ""} ${c.prenom || ""}`);
  let s = 0;
  if (complet === q || inverse === q) s += 100;
  else if (complet.startsWith(q) || inverse.startsWith(q)) s += 60;
  for (const t of termes) {
    if (champs.some(v => v.split(/[\s@.\-_]/).some(m => m.startsWith(t)))) s += 20;
    else if (champs.some(v => v.includes(t))) s += 8;
    else if (t.replace(/\D/g, "").length >= 4 && chiffres(c.telephone).includes(t.replace(/\D/g, ""))) s += 20;
    else return 0;   // chaque terme doit correspondre à quelque chose
  }
  return s;
}

export function rechercher(contacts: Contact[], requete: string, filtre?: { categorie?: string; pole?: string; comptesSeulement?: boolean }): Contact[] {
  return contacts
    .filter(c => (!filtre?.categorie || c.categories.includes(filtre.categorie)) && (!filtre?.pole || c.poles.includes(filtre.pole)) && (!filtre?.comptesSeulement || c.compte))
    .map(c => ({ c, s: score(c, requete) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || normaliser(`${a.c.nom} ${a.c.prenom}`).localeCompare(normaliser(`${b.c.nom} ${b.c.prenom}`)))
    .map(x => x.c);
}

/** Homonymes : même prénom et nom. Le sélecteur affiche alors un élément distinctif (e-mail masqué, entreprise, identifiant court). */
export function homonymes(contacts: Contact[]): Set<string> {
  const vus = new Map<string, string[]>();
  for (const c of contacts) { const k = normaliser(`${c.prenom} ${c.nom}`); if (!k) continue; vus.set(k, [...(vus.get(k) || []), c.id]); }
  return new Set([...vus.values()].filter(l => l.length > 1).flat());
}

export function emailMasque(e?: string | null): string {
  const m = String(e || "").match(/^(.)([^@]*)@(.+)$/); if (!m) return "";
  return `${m[1]}${"•".repeat(Math.min(4, m[2].length))}@${m[3]}`;
}

export function libelleContact(c: Contact, distinguer = false): string {
  const nom = [c.prenom, c.nom].filter(Boolean).join(" ") || c.pseudo || "Sans nom";
  if (!distinguer) return nom;
  const d = c.entreprise || (c.email ? emailMasque(c.email) : "") || `réf. ${c.id.slice(-6)}`;
  return `${nom} (${d})`;
}

export type Doublon = { a: string; b: string; raison: "email" | "telephone" | "nom_entreprise" };
/** Doublons probables : même e-mail, même téléphone (8 chiffres ou plus), ou même nom + prénom + entreprise. */
export function detecterDoublons(contacts: Contact[]): Doublon[] {
  const res: Doublon[] = [];
  for (let i = 0; i < contacts.length; i++) for (let j = i + 1; j < contacts.length; j++) {
    const a = contacts[i], b = contacts[j];
    if (a.email && b.email && normaliser(a.email) === normaliser(b.email)) res.push({ a: a.id, b: b.id, raison: "email" });
    else if (chiffres(a.telephone).length >= 8 && chiffres(a.telephone).slice(-9) === chiffres(b.telephone).slice(-9)) res.push({ a: a.id, b: b.id, raison: "telephone" });
    else if (normaliser(`${a.prenom} ${a.nom}`) && normaliser(`${a.prenom} ${a.nom}`) === normaliser(`${b.prenom} ${b.nom}`) && normaliser(a.entreprise) === normaliser(b.entreprise) && normaliser(a.entreprise)) res.push({ a: a.id, b: b.id, raison: "nom_entreprise" });
  }
  return res;
}

/** Fusion contrôlée : la fiche conservée garde ses valeurs ; les champs vides sont complétés par l'autre fiche ; les catégories et pôles s'additionnent. */
export function fusionner(garde: Contact, autre: Contact): Contact {
  const r: Contact = { ...garde, categories: [...new Set([...garde.categories, ...autre.categories])], poles: [...new Set([...garde.poles, ...autre.poles])] };
  for (const k of ["prenom", "nom", "pseudo", "email", "telephone", "entreprise"] as const) if (!r[k] && autre[k]) r[k] = autre[k];
  r.compte = garde.compte || autre.compte;
  return r;
}

// ── Import / export CSV et VCF ───────────────────────────────
const ENTETES_CSV = ["prenom", "nom", "pseudo", "email", "telephone", "entreprise", "categories", "poles"] as const;
const csvCase = (v: string) => /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
export function versCSV(contacts: Contact[]): string {
  return [ENTETES_CSV.join(";"), ...contacts.map(c => ENTETES_CSV.map(k => csvCase(Array.isArray(c[k]) ? (c[k] as string[]).join("|") : String(c[k] ?? ""))).join(";"))].join("\n");
}
function lignesCSV(texte: string, sep: string): string[][] {
  const out: string[][] = []; let ligne: string[] = [], cell = "", guill = false;
  for (let i = 0; i < texte.length; i++) {
    const ch = texte[i];
    if (guill) { if (ch === '"' && texte[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') guill = false; else cell += ch; }
    else if (ch === '"') guill = true;
    else if (ch === sep) { ligne.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texte[i + 1] === "\n") i++; ligne.push(cell); out.push(ligne); ligne = []; cell = ""; }
    else cell += ch;
  }
  if (cell || ligne.length) { ligne.push(cell); out.push(ligne); }
  return out;   // lignes vides conservées pour que les numéros de ligne signalés correspondent au fichier
}
const ALIAS: Record<string, keyof Contact> = { prenom: "prenom", "prénom": "prenom", "first name": "prenom", nom: "nom", "last name": "nom", pseudo: "pseudo", pseudonyme: "pseudo", email: "email", "e-mail": "email", courriel: "email", telephone: "telephone", "téléphone": "telephone", tel: "telephone", phone: "telephone", mobile: "telephone", entreprise: "entreprise", societe: "entreprise", "société": "entreprise", company: "entreprise", categories: "categories", "catégories": "categories", poles: "poles", "pôles": "poles" };
export function depuisCSV(texte: string, idPrefixe = "imp"): { contacts: Contact[]; erreurs: string[] } {
  const t = String(texte || "").replace(/^\uFEFF/, "");
  const premiere = t.split(/\r?\n/)[0] || ""; const sep = (premiere.match(/;/g) || []).length >= (premiere.match(/,/g) || []).length ? ";" : ",";
  const lignes = lignesCSV(t, sep); if (lignes.filter(l => l.some(x => x.trim())).length < 2) return { contacts: [], erreurs: ["Fichier vide ou sans ligne de données."] };
  const cols = lignes[0].map(h => ALIAS[normaliser(h)] || null);
  if (!cols.some(c => c === "nom" || c === "prenom" || c === "email")) return { contacts: [], erreurs: ["Colonnes non reconnues : il faut au moins nom, prénom ou e-mail."] };
  const erreurs: string[] = []; const contacts: Contact[] = [];
  lignes.slice(1).forEach((l, i) => {
    const c: Contact = { id: `${idPrefixe}-${i + 1}`, compte: false, categories: [], poles: [] };
    cols.forEach((k, j) => { if (!k) return; const v = (l[j] || "").trim(); if (k === "categories" || k === "poles") (c as any)[k] = v ? v.split(/[|,]/).map(x => x.trim()).filter(Boolean) : []; else (c as any)[k] = v || null; });
    if (!l.some(x => x.trim())) return;   // ligne vide : ignorée sans message
    if (!c.nom && !c.prenom && !c.email) { erreurs.push(`Ligne ${i + 2} : ni nom, ni prénom, ni e-mail — ignorée.`); return; }
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { erreurs.push(`Ligne ${i + 2} : e-mail invalide (${c.email}), champ vidé.`); c.email = null; }
    contacts.push(c);
  });
  return { contacts, erreurs };
}
const vcfEchapper = (v: string) => v.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
export function versVCF(contacts: Contact[]): string {
  return contacts.map(c => ["BEGIN:VCARD", "VERSION:3.0", `N:${vcfEchapper(c.nom || "")};${vcfEchapper(c.prenom || "")};;;`, `FN:${vcfEchapper([c.prenom, c.nom].filter(Boolean).join(" ") || c.pseudo || "")}`,
    c.entreprise ? `ORG:${vcfEchapper(c.entreprise)}` : "", c.email ? `EMAIL;TYPE=INTERNET:${c.email}` : "", c.telephone ? `TEL;TYPE=CELL:${c.telephone}` : "",
    c.categories.length ? `CATEGORIES:${c.categories.map(vcfEchapper).join(",")}` : "", "END:VCARD"].filter(Boolean).join("\r\n")).join("\r\n");
}
export function depuisVCF(texte: string, idPrefixe = "vcf"): Contact[] {
  const deplie = String(texte || "").replace(/\r?\n[ \t]/g, "");
  return (deplie.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || []).map((bloc, i) => {
    const val = (cle: RegExp) => (bloc.match(cle)?.[1] || "").replace(/\\([,;\\])/g, "$1").replace(/\\n/gi, " ").trim();
    const n = val(/^N(?:;[^:\n]*)?:(.*)$/mi).split(";");
    const c: Contact = { id: `${idPrefixe}-${i + 1}`, compte: false, nom: n[0] || null, prenom: n[1] || null, email: val(/^EMAIL[^:\n]*:(.*)$/mi) || null, telephone: val(/^TEL[^:\n]*:(.*)$/mi) || null, entreprise: val(/^ORG[^:\n]*:(.*)$/mi).split(";")[0] || null, categories: (val(/^CATEGORIES[^:\n]*:(.*)$/mi) || "").split(",").map(x => x.trim()).filter(Boolean), poles: [] };
    if (!c.nom && !c.prenom) { const fn = val(/^FN[^:\n]*:(.*)$/mi).split(" "); c.prenom = fn[0] || null; c.nom = fn.slice(1).join(" ") || null; }
    return c;
  });
}

// ── Affectations : plan d'enregistrement (brouillon → écritures) ──
export type Affectation = { id?: string; role: string; organisation_id: string | null; statut: "actif" | "suspendu" | "revoque" | "invite" };
export type PlanAffectations = { ajouter: Affectation[]; modifier: { id: string; statut: Affectation["statut"] }[]; retirer: string[] };

/** Calcule les écritures minimales entre l'état enregistré et le brouillon. Aucun doublon : une fonction
 *  (rôle + organisation) n'existe qu'une fois ; une fonction déjà présente n'est jamais recréée. */
export function planAffectations(enregistre: Affectation[], brouillon: Affectation[]): PlanAffectations {
  const cle = (a: Affectation) => `${a.role}|${a.organisation_id || ""}`;
  const parCle = new Map(enregistre.map(a => [cle(a), a]));
  const plan: PlanAffectations = { ajouter: [], modifier: [], retirer: [] };
  const vus = new Set<string>();
  for (const b of brouillon) {
    const k = cle(b); if (vus.has(k)) continue; vus.add(k);
    const e = parCle.get(k);
    if (!e) plan.ajouter.push({ role: b.role, organisation_id: b.organisation_id, statut: b.statut });
    else if (e.statut !== b.statut && e.id) plan.modifier.push({ id: e.id, statut: b.statut });
  }
  // Retirer = passer au statut « révoqué » (l'historique est conservé ; la fonction peut être rétablie sans doublon).
  for (const e of enregistre) if (!vus.has(cle(e)) && e.id && e.statut !== "revoque") plan.retirer.push(e.id);
  return plan;
}

export type PlanPermissions = { accorder: { permission: string; univers: string }[]; retirer: string[] };
/** Écritures de permissions entre l'état enregistré (avec id) et le brouillon (codes). */
export function planPermissions(enregistre: { id: string; permission: string; univers: string }[], brouillon: string[]): PlanPermissions {
  const accorder = brouillon.filter(code => !enregistre.some(e => e.permission === code)).map(code => ({ permission: code, univers: PERMISSIONS.find(p => p.code === code)?.univers || "*" }));
  const retirer = enregistre.filter(e => !brouillon.includes(e.permission)).map(e => e.id);
  return { accorder, retirer };
}
