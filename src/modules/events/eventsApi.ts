// ═══════════════════════════════════════════════════════════
// API — Module Bella'Events
// Sanitisation du payload avant écriture Supabase
// Colonnes validées depuis information_schema.columns
// ═══════════════════════════════════════════════════════════

function sanitizeEventsDemandePayload(p) {
  // Convertisseurs
  const toInt = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
  const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const toHeure = (v) => {
    if (!v) return null;
    const s = String(v).replace("h", ":").trim();
    return /^\d{1,2}:\d{2}$/.test(s) ? (s.length === 4 ? "0"+s : s) : null;
  };
  const toDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

  return {
    reference:        p.reference        || null,
    statut:           p.statut           || "nouvelle_demande",
    client_prenom:    p.client_prenom    || null,
    client_nom:       p.client_nom       || null,
    client_tel:       p.client_tel       || null,
    client_email:     p.client_email     || null,
    date_souhaitee:   toDate(p.date_souhaitee),
    heure_souhaitee:  toHeure(p.heure_souhaitee),
    type_evenement:   p.type_evenement   || null,
    nb_invites:       toInt(p.nb_invites),
    theme:            p.theme            || null,
    couleurs:         p.couleurs         || null,
    budget:           toNum(p.budget),
    message:          p.message          || null,
    pole:             p.pole             || "Bella'Events",
    categorie:        p.categorie        || null,
    prestation:       p.prestation       || null,
    prix:             p.prix             || null,
    acompte:          p.acompte          || null,
    delai:            p.delai            || null,
    type_prestation:  p.type_prestation  || null,
    numero_devis:     p.numero_devis     || null,
    montant_estime:   toNum(p.montant_estime),
    montant_acompte:  toNum(p.montant_acompte),
    montant_solde:    toNum(p.montant_solde),
    mode_paiement:    p.mode_paiement    || null,
    statut_paiement:  p.statut_paiement  || "non_paye",
    liaison_comptable:p.liaison_comptable|| null,
    // commande_id et planning_event_id : uuid, non envoyés à la création initiale
  };
}

