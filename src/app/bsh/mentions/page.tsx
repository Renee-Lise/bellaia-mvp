// ═══════════════════════════════════════════════════════════
// Mentions légales & CGV — src/app/bsh/mentions/page.tsx
// (route réelle /bsh/mentions)
//
// IMPORTANT : brouillon de structure, pas un texte juridique validé.
// Le bandeau d'avertissement en haut de page est volontairement
// visible sur la page rendue (pas seulement en commentaire de code)
// — demande explicite de Renée-Lise : ce texte ne doit jamais être
// pris pour un contenu juridique définitif avant relecture par un
// professionnel du droit. Les champs qui la concernent (SIRET,
// adresse, hébergeur, contacts...) sont des espaces réservés
// visuellement identifiables, pas des valeurs réelles inventées.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "Mentions légales & CGV",
  description:
    "Mentions légales et conditions générales de vente de Bella'Secret Home — document de travail.",
  robots: { index: false, follow: true },
};

const AMBRE = "#fbbf24";

// Espace réservé visuellement identifiable — pas une valeur réelle.
function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: AMBRE,
        fontStyle: "italic",
        borderBottom: `1px dashed ${AMBRE}`,
      }}
    >
      [{children}]
    </span>
  );
}

function AvertissementJuridique({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        background: "rgba(251,191,36,0.08)",
        border: `1px solid rgba(251,191,36,0.3)`,
        borderRadius: 4,
        padding: compact ? "8px 10px" : "12px 14px",
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: compact ? 12 : 14, flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: compact ? 10 : 11, color: AMBRE, lineHeight: 1.6 }}>
        {compact
          ? "Formulation à vérifier avec un professionnel du droit avant publication."
          : "Document de travail — pas encore valide juridiquement. Les champs entre crochets doivent être complétés et l'ensemble du texte relu par un professionnel du droit avant toute publication réelle."}
      </span>
    </div>
  );
}

const SECTIONS: { titre: string; contenu: React.ReactNode; avertissementSpecifique?: boolean }[] = [
  {
    titre: "Éditeur du site",
    contenu: (
      <>
        Le site Bella&apos;Secret Home est édité par <Todo>nom de la structure / auto-entreprise / société</Todo>,
        immatriculée sous le numéro SIRET <Todo>SIRET à compléter</Todo>, dont le siège est situé à{" "}
        <Todo>adresse complète à compléter</Todo>, Sinnamary, Guyane française. Directrice de la
        publication : <Todo>nom de la Fondatrice</Todo>. Contact : <Todo>email de contact à compléter</Todo>.
      </>
    ),
  },
  {
    titre: "Hébergement",
    contenu: (
      <>
        Le site est hébergé par <Todo>nom de l&apos;hébergeur, ex. Vercel Inc.</Todo>,{" "}
        <Todo>adresse de l&apos;hébergeur à compléter</Todo>.
      </>
    ),
  },
  {
    titre: "Accès réservé aux personnes majeures",
    contenu:
      "Le contenu de ce site est réservé exclusivement aux personnes majeures (18 ans ou plus). En accédant au site, vous confirmez avoir l'âge requis dans votre pays de résidence.",
  },
  {
    titre: "Produits et descriptions",
    contenu:
      "BSH s'efforce de décrire ses produits avec exactitude. Les visuels et textes restent non contractuels et peuvent différer légèrement du produit livré.",
  },
  {
    titre: "Commandes et paiement",
    contenu: (
      <>
        Les commandes sont validées après confirmation du paiement. Moyens de paiement acceptés :{" "}
        <Todo>moyens de paiement à confirmer selon ce qui est activé</Todo>.
      </>
    ),
  },
  {
    titre: "Droit de rétractation",
    contenu:
      "Les produits intimes ou d'hygiène une fois descellés ne peuvent faire l'objet d'aucun retour ni remboursement. Le droit de rétractation ne s'applique qu'aux produits encore scellés, renvoyés dans leur état d'origine.",
    avertissementSpecifique: true,
  },
  {
    titre: "Livraison",
    contenu: (
      <>
        Toutes les commandes sont expédiées dans un emballage neutre, sans mention du contenu.
        Délais et zones de livraison : <Todo>délais et zones de livraison à préciser</Todo>.
      </>
    ),
  },
  {
    titre: "Données personnelles",
    contenu: (
      <>
        Les données collectées sont utilisées uniquement pour le fonctionnement du site et ne
        sont jamais revendues à des tiers. Conformément au RGPD, vous disposez d&apos;un droit
        d&apos;accès, de rectification et de suppression de vos données, à exercer auprès de{" "}
        <Todo>email de contact RGPD à compléter</Todo>.
      </>
    ),
  },
  {
    titre: "BSH Members, Le Cercle, BSH Lounge",
    contenu:
      "L'adhésion est soumise à l'acceptation d'une charte spécifique, disponible sur leurs pages de présentation. Ces espaces sont strictement réservés aux personnes majeures.",
  },
  {
    titre: "Propriété intellectuelle",
    contenu:
      "L'ensemble des visuels, logos et contenus du site Bella'Secret Home sont protégés et ne peuvent être reproduits sans autorisation.",
  },
  {
    titre: "Droit applicable",
    contenu: (
      <>
        Les présentes conditions sont soumises au droit français. En cas de litige,{" "}
        <Todo>juridiction compétente à préciser avec un professionnel</Todo>.
      </>
    ),
  },
];

export default function BshMentionsPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        color: C.cream,
        fontFamily: BODY,
        fontWeight: 300,
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: C.plumD,
          padding: "32px 22px 24px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 10,
          }}
        >
          Informations légales
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 22,
            margin: "0 0 14px",
            color: C.cream,
          }}
        >
          Mentions légales & CGV
        </h1>
        <AvertissementJuridique />
      </div>

      {/* ── Sections numérotées ── */}
      <div style={{ padding: "16px 20px 32px", display: "flex", flexDirection: "column" }}>
        {SECTIONS.map((s, i) => (
          <div
            key={s.titre}
            style={{
              paddingBottom: i < SECTIONS.length - 1 ? 16 : 0,
              borderBottom: i < SECTIONS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              marginBottom: i < SECTIONS.length - 1 ? 16 : 0,
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 500,
                fontSize: 15,
                margin: "0 0 7px",
                color: C.goldL,
              }}
            >
              {i + 1}. {s.titre}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: s.avertissementSpecifique ? "0 0 8px" : 0 }}>
              {s.contenu}
            </p>
            {s.avertissementSpecifique && <AvertissementJuridique compact />}
          </div>
        ))}
      </div>

      {/* ── Note de bas de page ── */}
      <div
        style={{
          padding: "12px 20px 24px",
          borderTop: `1px solid ${C.border}`,
          fontSize: 10,
          color: "rgba(203,185,185,0.3)",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        Bella&apos;Secret Home — Sinnamary, Guyane. Document de travail, non
        définitif.
      </div>

      <BshFooter />
    </div>
  );
}
