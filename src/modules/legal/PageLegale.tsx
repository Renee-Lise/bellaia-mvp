// ═══════════════════════════════════════════════════════════
// Pages légales communes à Bellaïa : mentions légales, confidentialité, conditions générales.
// DOCUMENTS DE TRAVAIL : les champs entre crochets sont à compléter par la fondatrice et l'ensemble
// doit être relu par un professionnel du droit avant publication (bandeau visible sur la page).
// Aucune valeur n'est inventée (SIRET, adresse, médiateur, régime de TVA…).
// Sources : LCEN art. 1-1 et 6-III ; RGPD art. 12 à 22 et 28 ; loi Informatique et Libertés art. 82 ;
// Code de la consommation L111-1, L221-5, L221-18, L221-28, L612-1 ; recommandations CNIL.
// ═══════════════════════════════════════════════════════════
import React from "react";

const C = { fond: "#faf6ef", texte: "#1c2246", doux: "#4a4f6b", ligne: "rgba(28,34,70,0.14)", ambre: "#8a5a00", ambreFond: "#fff4dc" };
const SA = "-apple-system, system-ui, sans-serif";

export function ACompleter({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.ambre, background: C.ambreFond, borderBottom: `1px dashed ${C.ambre}`, padding: "0 3px" }}>[{children}]</span>;
}

export type Section = { titre: string; contenu: React.ReactNode };

export const SOUS_TRAITANTS: [string, string, string][] = [
  ["Supabase", "Base de données, comptes, stockage des fichiers", "Union européenne (Francfort, Allemagne)"],
  ["Vercel Inc.", "Hébergement de l'application", "États-Unis — garanties de transfert à vérifier (cadre UE–États-Unis ou clauses types)"],
  ["Anthropic", "Assistant IA (uniquement les fonctions IA utilisées par l'équipe)", "États-Unis — idem"],
  ["SumUp", "Paiement par carte", "Union européenne"],
  ["Stripe / PayPal", "Paiement en ligne, s'ils sont activés", "À confirmer selon l'activation"],
  ["Meta (WhatsApp)", "Échanges que vous choisissez d'avoir par WhatsApp", "États-Unis — idem"],
  ["Google Fonts", "Polices des outils de création (espace fondatrice)", "États-Unis — hébergement local prévu"],
];

export const RETRACTATION: [string, string][] = [
  ["Bella'Food, Vil'Dor Pâtisse", "Pas de droit de rétractation pour les denrées périssables et les préparations sur mesure (C. conso L221-28, 3° et 4°). Annulation : [conditions et délai à préciser]."],
  ["Bella'Secret Home", "Rétractation de 14 jours pour les produits encore scellés ; exclue pour les produits d'hygiène ou intimes descellés (L221-28, 5°). Retour : [modalités et frais à préciser]."],
  ["Bella'Events (location, décoration, papeterie)", "Papeterie et créations personnalisées : pas de rétractation (L221-28, 3°). Prestations à une date fixée : pas de rétractation (L221-28, 12°). Sommes versées d'avance : [acompte ou arrhes — à qualifier, L214-1], barème d'annulation : [à préciser]."],
  ["Bella'Odyssée (soins)", "Rendez-vous : annulation sans frais jusqu'à [délai] avant ; au-delà : [conditions]. Prestation commencée à votre demande avant 14 jours : [L221-25]."],
  ["Éditions numériques (ebooks)", "Pas de rétractation après le début du téléchargement, si vous l'avez expressément demandé et renoncé à ce droit (L221-28, 13°)."],
];

export default function PageLegale({ titre, sousTitre, sections }: { titre: string; sousTitre: string; sections: Section[] }) {
  return (
    <main style={{ minHeight: "100dvh", background: C.fond, color: C.texte, fontFamily: SA, padding: "calc(env(safe-area-inset-top,0px) + 20px) 16px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", lineHeight: 1.6, fontSize: 16 }}>
        <a href="/" style={{ color: C.texte, fontSize: 15, display: "inline-block", minHeight: 44, lineHeight: "44px" }}>‹ Retour à Bellaïa</a>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "8px 0 4px" }}>{titre}</h1>
        <p style={{ color: C.doux, marginTop: 0 }}>{sousTitre}</p>
        <div role="note" style={{ background: C.ambreFond, border: `1px solid ${C.ambre}`, color: C.ambre, borderRadius: 10, padding: "10px 12px", fontSize: 14.5, margin: "12px 0 20px" }}>
          Document de travail : il n'a pas encore de valeur juridique. Les éléments entre crochets doivent être complétés et l'ensemble relu par un professionnel du droit avant publication.
        </div>
        {sections.map((s, i) => (
          <section key={i} style={{ borderTop: `1px solid ${C.ligne}`, padding: "14px 0" }}>
            <h2 style={{ fontSize: 19, margin: "0 0 6px" }}>{i + 1}. {s.titre}</h2>
            <div style={{ color: C.texte }}>{s.contenu}</div>
          </section>
        ))}
        <nav aria-label="Pages légales" style={{ borderTop: `1px solid ${C.ligne}`, paddingTop: 14, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 15 }}>
          <a href="/mentions-legales" style={{ color: C.texte }}>Mentions légales</a>
          <a href="/confidentialite" style={{ color: C.texte }}>Confidentialité</a>
          <a href="/conditions-generales" style={{ color: C.texte }}>Conditions générales</a>
        </nav>
      </div>
    </main>
  );
}
