// ═══════════════════════════════════════════════════════════
// MOTEUR CENTRAL DE CALCUL — Réutilisable par tous les pôles
// ═══════════════════════════════════════════════════════════

export interface EntreeCalcul {
  prix_fournisseur:   number;
  quantite?:          number;
  frais_livraison?:   number;
  frais_bancaires?:   number;  // en %
  frais_douane?:      number;
  frais_emballage?:   number;
  autres_frais?:      number;
  marge_souhaitee:    number;  // en %
  tva?:               number;  // en % (défaut 20)
}

export interface ResultatCalcul {
  cout_unitaire:      number;
  cout_total:         number;
  prix_minimum:       number;
  prix_conseille:     number;
  prix_premium:       number;
  benefice_unitaire:  number;
  benefice_total:     number;
  taux_marge_reel:    number;
  prix_ttc:           number;
  resume: {
    label: string;
    valeur: string;
    couleur: string;
  }[];
}

export function calculerPrix(e: EntreeCalcul): ResultatCalcul {
  const qte       = e.quantite || 1;
  const tva       = (e.tva ?? 20) / 100;
  const marge     = e.marge_souhaitee / 100;
  const bancaires = (e.frais_bancaires || 0) / 100;

  // Coût total d'achat
  const cout_total_achat =
    e.prix_fournisseur * qte
    + (e.frais_livraison || 0)
    + (e.frais_douane    || 0)
    + (e.frais_emballage || 0)
    + (e.autres_frais    || 0);

  const cout_unitaire = cout_total_achat / qte;

  // Frais bancaires (appliqués au prix de vente — calculés à rebours)
  // Prix HT minimum pour couvrir les coûts
  const prix_minimum_ht = bancaires > 0
    ? cout_unitaire / (1 - bancaires)
    : cout_unitaire;

  // Prix conseillé avec marge
  const prix_conseille_ht = marge > 0
    ? cout_unitaire / (1 - marge) / (1 - bancaires)
    : prix_minimum_ht * 1.3;

  // Prix premium = marge + 20%
  const prix_premium_ht = prix_conseille_ht * 1.2;

  // TTC
  const prix_minimum  = parseFloat((prix_minimum_ht  * (1 + tva)).toFixed(2));
  const prix_conseille = parseFloat((prix_conseille_ht * (1 + tva)).toFixed(2));
  const prix_premium   = parseFloat((prix_premium_ht  * (1 + tva)).toFixed(2));

  const benefice_unitaire = parseFloat((prix_conseille_ht - cout_unitaire).toFixed(2));
  const benefice_total    = parseFloat((benefice_unitaire * qte).toFixed(2));
  const taux_marge_reel   = parseFloat(((benefice_unitaire / prix_conseille_ht) * 100).toFixed(1));

  return {
    cout_unitaire:     parseFloat(cout_unitaire.toFixed(2)),
    cout_total:        parseFloat(cout_total_achat.toFixed(2)),
    prix_minimum,
    prix_conseille,
    prix_premium,
    prix_ttc:          prix_conseille,
    benefice_unitaire,
    benefice_total,
    taux_marge_reel,
    resume: [
      { label: "Coût unitaire",     valeur: `${cout_unitaire.toFixed(2)}€`,   couleur: "#ef4444" },
      { label: "Prix minimum TTC",  valeur: `${prix_minimum}€`,              couleur: "#f59e0b" },
      { label: "Prix conseillé TTC",valeur: `${prix_conseille}€`,            couleur: "#c9a84c" },
      { label: "Prix premium TTC",  valeur: `${prix_premium}€`,              couleur: "#a78bfa" },
      { label: "Bénéfice unitaire", valeur: `${benefice_unitaire}€`,         couleur: "#4ade80" },
      { label: "Bénéfice total",    valeur: `${benefice_total}€ (×${qte})`,  couleur: "#4ade80" },
      { label: "Taux de marge",     valeur: `${taux_marge_reel}%`,           couleur: "#0d9488" },
    ],
  };
}

// Arrondi aux 0.05 ou 0.99 les plus proches pour prix psychologique
export function prixPsychologique(prix: number): number {
  const entier = Math.floor(prix);
  const decimal = prix - entier;
  if (decimal < 0.25) return entier + 0.05;
  if (decimal < 0.75) return entier + 0.50;
  return entier + 0.99;
}
