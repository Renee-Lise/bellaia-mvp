// ═══════════════════════════════════════════════════════════
// Identité de l'éditeur pour les pages légales : lue au moment de l'affichage dans la fiche « Émetteur »
// GÉNÉRAL saisie par la fondatrice (Administratif › Mes informations légales). Rien n'est inscrit dans
// le code ni dans le dépôt public, et rien n'est inventé : un champ vide reste « à compléter ».
// formaterEditeur est pure (tests/unit/t_editeur_legal.js) ; lireEditeur s'exécute côté serveur uniquement.
// ═══════════════════════════════════════════════════════════
export type FicheEmetteur = { raison_sociale?: string | null; forme_juridique?: string | null; siret?: string | null; adresse?: string | null; code_postal?: string | null; ville?: string | null; pays?: string | null; telephone?: string | null; email?: string | null; rcs_rm?: string | null; mention_tva?: string | null; tva_defaut?: number | null };
export type Editeur = { champs: { libelle: string; valeur: string | null }[]; aValider: string[] };

export function siretValide(s: string): boolean {
  const c = (s || "").replace(/\s/g, "");
  if (!/^\d{14}$/.test(c)) return false;
  let t = 0;
  for (let i = 0; i < 14; i++) { let n = Number(c[13 - i]); if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; } t += n; }
  return t % 10 === 0;
}

export function formaterEditeur(f: FicheEmetteur | null): Editeur {
  const aValider: string[] = [];
  const v = (x?: string | null) => (x || "").trim() || null;
  if (!f) return { champs: [], aValider: ["Fiche « Émetteur Général » introuvable : compléter Administratif › Mes informations légales."] };
  const forme = v(f.forme_juridique);
  const siret = v(f.siret)?.replace(/\s/g, "") || null;
  if (!siret) aValider.push("SIRET manquant.");
  else if (!siretValide(siret)) aValider.push("SIRET : la clé de contrôle ne correspond pas, à vérifier.");
  else aValider.push("SIRET : clé de contrôle correcte ; correspondance avec le registre (INSEE / annuaire des entreprises) à confirmer.");
  const adresse = [v(f.adresse), [v(f.code_postal), v(f.ville)].filter(Boolean).join(" "), v(f.pays)].filter(Boolean).join(", ") || null;
  if (!adresse) aValider.push("Adresse manquante.");
  else {
    if (/apparemment/i.test(f.adresse || "")) aValider.push("Adresse : « Apparemment » semble être une faute de frappe pour « Appartement », à corriger dans la fiche.");
    aValider.push("Adresse : elle sera publique. Une adresse de domiciliation est possible si vous ne souhaitez pas publier votre adresse personnelle.");
  }
  const rcs = v(f.rcs_rm);
  if (!rcs || /^(rcs|rm|rne)$/i.test(rcs)) aValider.push("Immatriculation incomplète (ville du RCS et numéro, ou mention RNE) : à préciser.");
  if (/^ei\b/i.test(forme || "")) aValider.push("Entrepreneur individuel : les nom et prénom de l'entrepreneur doivent figurer, suivis ou précédés de « EI » ; à confirmer.");
  const tva = v(f.mention_tva);
  if (!tva) aValider.push(Number(f.tva_defaut) === 0 ? "TVA : taux par défaut à 0 % sans mention. Si vous êtes en franchise, la mention « TVA non applicable, art. 293 B du CGI » est à confirmer par votre comptable." : "Mention de TVA à compléter.");
  if (!v(f.email)) aValider.push("Adresse e-mail de contact manquante.");
  if (!v(f.telephone)) aValider.push("Téléphone manquant.");
  aValider.push("Médiateur de la consommation : obligatoire (C. conso L612-1), à désigner.");
  return {
    champs: [
      { libelle: "Dénomination", valeur: v(f.raison_sociale) },
      { libelle: "Forme juridique", valeur: forme },
      { libelle: "SIRET", valeur: siret },
      { libelle: "Immatriculation", valeur: rcs },
      { libelle: "Adresse", valeur: adresse },
      { libelle: "Téléphone", valeur: v(f.telephone) },
      { libelle: "E-mail", valeur: v(f.email) },
      { libelle: "TVA", valeur: tva },
    ],
    aValider,
  };
}

/** Lecture côté serveur (clé de service, jamais envoyée au navigateur). */
export async function lireEditeur(): Promise<FicheEmetteur | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  try {
    const r = await fetch(`${url}/rest/v1/bellaia_emetteurs?bu=eq.GENERAL&select=raison_sociale,forme_juridique,siret,adresse,code_postal,ville,pays,telephone,email,rcs_rm,mention_tva,tva_defaut&limit=1`, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}` }, next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const l = await r.json();
    return Array.isArray(l) && l[0] ? l[0] : null;
  } catch { return null; }
}
