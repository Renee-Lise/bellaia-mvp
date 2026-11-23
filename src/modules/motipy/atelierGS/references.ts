// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — 12 fiches de RÉFÉRENCE (Grande Section) : index documentaire
// Les photographies restent PRIVÉES (stockage equipe-prive/motipy/…, fondatrice
// uniquement). Ce fichier ne contient que leur classement et leur empreinte
// SHA-256, qui sert à reconnaître chaque page à l'import et à éviter les doublons.
// Références documentaires : pas des modèles libres de droits à commercialiser.
// ═══════════════════════════════════════════════════════════
export type Reference = { page: number; sha256: string; domaine: string; competence: string; titre: string; consigne: string; source: string; remarques: string };

export const COLLECTION_GS = "mo-ti-peyi-gs";
export const NIVEAUX_ATELIER = ["TPS", "PS", "MS", "GS", "CP", "CE1"] as const;   // l'atelier ne propose aujourd'hui que la GS
export const PDF_REFERENCES = { nom: "Fiches_GS_References_Mo_Ti_Peyi.pdf", sha256: "47c69907d4a078cc12f48794208a9a1d5c99f9e50a955798f60ade8192e3081f", pages: 12 };

export const REFERENCES_GS: Reference[] = [
  { page: 1, sha256: "79a00db47465bc70fed8ae357d19c903946f6f44509cd69c911743fbccb08a58", domaine: "Graphisme", competence: "Repasser sur des motifs en pointillés", titre: "Graphisme — motifs en pointillés", consigne: "Repasse sur les pointillés pour t'entraîner au graphisme.", source: "", remarques: "En-tête « GSB » (classe d'origine). Fiche complète." },
  { page: 2, sha256: "67e74d9cd0fa16b06650480b28561d051d7f59cb4938d931c6f9e2b599197a8b", domaine: "Logique", competence: "Prolonger des suites de formes", titre: "Suites de formes", consigne: "Je continue comme le modèle.", source: "colorise (logo)", remarques: "Capture d'écran de tablette ; seul l'exercice 1 est visible ; dernière suite peu explicite." },
  { page: 3, sha256: "fbdc713afc3834bb5acd3a7fd743f8ac61610a27688954b188f6b3b018194b21", domaine: "Langage écrit", competence: "Relier les voyelles capitales aux minuscules script", titre: "Capitales et minuscules (voyelles)", consigne: "Relie chaque lettre majuscule à la minuscule correspondante.", source: "numéro « 20 »", remarques: "Capture d'écran de téléphone ; pas d'en-tête prénom/date ; Y compté parmi les voyelles." },
  { page: 4, sha256: "54ae0910bce647c3d3e1bac2d94f1dc9db7ff2bee4306a96275e2d0afde80d45", domaine: "Langage écrit", competence: "Reconnaître et colorier les voyelles", titre: "Colorie les voyelles", consigne: "Colorie les voyelles et les dessins.", source: "", remarques: "Incohérences : « i » minuscule parmi les capitales ; caractères illisibles sur l'illustration USINE." },
  { page: 5, sha256: "0fe103b1f7bce6f5feb83c00f15c980dee7806a44ef1925fb6b7fd4fcdbd2f23", domaine: "Écriture", competence: "Repasser sur A et a, puis colorier", titre: "Trace la lettre A, a", consigne: "Trace la lettre (A, a) et colorie le dessin.", source: "mention en arabe « رؤية »", remarques: "" },
  { page: 6, sha256: "ea233f74bc598dfee7d5f44af0e4f1a76e4e0f1828e85e63362a0923e2267a91", domaine: "Prénom", competence: "Reconnaître les lettres de son prénom et l'écrire", titre: "Les lettres de mon prénom", consigne: "Entoure les lettres de ton prénom. Écris ton prénom.", source: "www.pass-education.fr", remarques: "La lettre E figure deux fois ; ordre non alphabétique." },
  { page: 7, sha256: "b31e7a05f1ce32b2deaaceb6eace15fd566714f0f707a383cfec80e622915a68", domaine: "Langage écrit", competence: "Retrouver les lettres nécessaires pour écrire un mot", titre: "Les lettres des mots", consigne: "Entoure les lettres nécessaires à l'écriture de chaque mot.", source: "educatifenfants.com", remarques: "Répétitions vérifiées (COCHON, FOURCHETTE) : cohérent." },
  { page: 8, sha256: "4fc3ac4bc90bd6917824bf8bb0fc6efe7425213970e3c0136943d0c33d614d7f", domaine: "Écriture", competence: "Recopier des mots en capitales", titre: "Recopie les mots", consigne: "Recopie les mots.", source: "", remarques: "Page coupée en bas sur l'original ; icône ciseaux sans rapport avec la consigne." },
  { page: 9, sha256: "d97beb9d713ccaf0d78bfce13b76aafb67180f22e25f2d88afd4e5d057f27f4b", domaine: "Quantités", competence: "Colorier autant de ronds que de points sur le dé", titre: "Autant que le dé", consigne: "Colorie autant de ronds qu'indiqué par le dé.", source: "", remarques: "Premier rond colorié en exemple ; le dé de 4 est absent ; bas du tableau coupé." },
  { page: 10, sha256: "21ee6161b1df58dc551d096313f9ba1c84e5c9384091659cea7a6e0559a8a6bb", domaine: "Numération", competence: "Compléter une bande numérique de 1 à 5", titre: "Bandes numériques 1 à 5", consigne: "Complète les bandes numériques en écrivant les nombres qui manquent dans les ronds.", source: "", remarques: "Bord supérieur de la première bande rogné sur l'original." },
  { page: 11, sha256: "244fc46da154c1af3834f7f283cf87f9b8ce5f3a2e6ac184303220178c39b411", domaine: "Graphisme", competence: "Repasser sur les pointillés d'un dessin et le colorier", titre: "Dessin en pointillés", consigne: "Repasse sur les pointillés et colorie le dessin.", source: "", remarques: "Pas d'en-tête prénom/date." },
  { page: 12, sha256: "af06fecf541abfb61a9c18a9e20ecb77cf5cd76a81a310f0cbfbd74b2ef76c4f", domaine: "Écriture des chiffres", competence: "Repasser sur les chiffres de 1 à 5", titre: "Écrire les chiffres 1 à 5", consigne: "Entraîne-toi à écrire les chiffres en repassant sur les pointillés.", source: "", remarques: "" },
];
export const referenceParEmpreinte = (sha: string) => REFERENCES_GS.find(r => r.sha256 === sha) || null;
