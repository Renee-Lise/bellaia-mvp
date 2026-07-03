// ═══════════════════════════════════════════════════════════
// UTILS — Module Bella'Events
// Moteur d'analyse automatique du message client
// Helpers prix, statuts, lignes de devis
// ═══════════════════════════════════════════════════════════
import type { LigneDevis, EtapeSuivi, DemandeAnalyseParams } from "./eventsTypes";
import {
  EVENTS_PRESTATIONS, FOOD_CATALOGUE_LIGHT,
  DETECTION_MAP, ETAPES_SUIVI,
} from "./eventsConsts";

function trouverPrestaEvents(id) {
  return EVENTS_PRESTATIONS.find(p => p.id === id) || null;
}

// Trouve une prestation dans FOOD_CATALOGUE_LIGHT par id
function trouverPrestaFood(id) {
  return FOOD_CATALOGUE_LIGHT.find(p => p.id === id) || null;
}

// Construit une ligne de devis depuis une prestation et un contexte
function construireLigne(presta, source, qte, notesSup) {
  const prixBase = presta.prix || null;
  const prixUnitaire = prixBase;
  const total = (prixUnitaire && qte) ? prixUnitaire * qte : null;
  return {
    id: presta.id,
    libelle: presta.nom,
    pole: presta.pole || "EVENTS",
    categorie: presta.categorie || presta.sous || "",
    qte: qte || 1,
    prixUnitaire,
    total,
    statut: prixUnitaire ? "automatique" : "a_completer",
    source,
    note: notesSup || presta.note || null,
  };
}

// Moteur principal : analyse le contexte client et retourne des lignes de devis
function analyserDemandeClient({ prestation, message, theme, couleurs, nbInvites, typeEvt, budget }) {
  const lignes = [];
  const dejaAjoutes = new Set();

  const texteComplet = [
    prestation || "", message || "", theme || "", typeEvt || ""
  ].join(" ").toLowerCase();

  const qteInvites = parseInt(nbInvites) || 0;

  // Parcourir la carte de détection
  for (const regle of DETECTION_MAP) {
    const detecte = regle.mots.some(m => texteComplet.includes(m));
    if (!detecte || dejaAjoutes.has(regle.id)) continue;

    let p = null;
    if (regle.catalogue === "food") p = trouverPrestaFood(regle.id);
    else p = trouverPrestaEvents(regle.id);

    if (!p) continue;

    // Calcul de quantité contextuelle
    let qte = 1;
    if (p.unite === "par personne" && qteInvites > 0) qte = qteInvites;
    if (p.unite === "douzaine" && qteInvites > 0) qte = Math.ceil(qteInvites / 12);

    // Cas spécial pack rempli : choisir le palier selon nb_invités
    if (regle.id === "an_r_1" && qteInvites > 0) {
      const paliers = [
        {min:1, max:9,  id:"an_r_1"},  {min:10,max:19, id:"an_r_2"},
        {min:20,max:29, id:"an_r_3"},  {min:30,max:39, id:"an_r_4"},
        {min:40,max:49, id:"an_r_5"},  {min:50,max:59, id:"an_r_6"},
        {min:60,max:69, id:"an_r_7"},  {min:70,max:79, id:"an_r_8"},
        {min:80,max:89, id:"an_r_9"},  {min:90,max:999,id:"an_r_10"},
      ];
      const palier = paliers.find(p => qteInvites >= p.min && qteInvites <= p.max);
      if (palier) {
        const pp = trouverPrestaEvents(palier.id);
        if (pp) { p = pp; dejaAjoutes.add(palier.id); }
      }
    }

    dejaAjoutes.add(regle.id);
    lignes.push(construireLigne(p, "Détecté dans message client", qte, null));
  }

  // Si budget annoncé et aucune ligne → note suggestion
  const budgetNum = parseFloat(budget) || 0;
  if (lignes.length === 0 && budgetNum > 0) {
    lignes.push({
      id:"suggestion_budget", libelle:"Budget client annoncé : "+budgetNum+"€",
      pole:"EVENTS", categorie:"", qte:1, prixUnitaire:null, total:null,
      statut:"suggestion", source:"Budget annoncé", note:"À décomposer par la fondatrice."
    });
  }

  return lignes;
}

// ─── Composant d'affichage de l'estimation automatique ───

function normaliserStatut(s) {
  if (!s) return "nouvelle_demande";
  const map = {
    "nouvelle demande":     "nouvelle_demande",
    "nouvelle_demande":     "nouvelle_demande",
    "à traiter":            "a_traiter",
    "a_traiter":            "a_traiter",
    "devis en preparation": "devis_en_preparation",
    "devis en préparation": "devis_en_preparation",
    "devis_en_preparation": "devis_en_preparation",
    "devis envoyé":         "devis_envoye",
    "devis envoye":         "devis_envoye",
    "devis_envoye":         "devis_envoye",
    "accepté":              "accepte",
    "accepte":              "accepte",
    "réservation confirmée":"accepte",
    "converti en commande": "accepte",
  };
  return map[s.toLowerCase().trim()] || "nouvelle_demande";
}

// ─── Timeline de suivi partagée (utilisée dans la confirmation et le portail) ─
