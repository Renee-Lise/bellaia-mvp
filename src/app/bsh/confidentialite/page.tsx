// ═══════════════════════════════════════════════════════════
// Confidentialité & Livraison — src/app/bsh/confidentialite/page.tsx
// (route réelle /bsh/confidentialite)
//
// N'existait nulle part dans ClientBSH : page entièrement nouvelle,
// construite à partir de la direction de la maquette fournie. Page
// purement informative — pas de CTA communautaire ni commercial,
// juste le renvoi standard en pied de page.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "Confidentialité & Livraison",
  description:
    "Emballage neutre, livraison discrète, protection des données — la confidentialité chez Bella'Secret Home, de la commande à la livraison.",
};

const BLOCS = [
  {
    ico: "📦",
    titre: "Emballage neutre",
    texte:
      "Chaque commande BSH voyage dans un emballage neutre, sans logo ni mention du contenu. Rien ne permet à un tiers — voisin, livreur, colocataire — de deviner ce qu'il contient.",
    items: [
      "Carton ou pochette sans marquage extérieur",
      "Nom d'expéditeur discret",
      "Facture glissée à l'intérieur, jamais visible de l'extérieur",
    ],
  },
  {
    ico: "🚚",
    titre: "Livraison discrète",
    texte:
      "Le suivi de commande est disponible depuis Mon espace BSH, avec les mêmes étapes que n'importe quel achat en ligne.",
    items: [
      "Aucune mention du contenu sur le bordereau",
      "Créneaux et points de retrait selon les zones desservies",
      "Notifications de suivi via Mon espace BSH",
    ],
  },
  {
    ico: "🔒",
    titre: "Protection des données",
    texte:
      "Vos informations personnelles et vos commandes ne sont jamais partagées avec un tiers, ni exposées à d'autres clientes.",
    items: [
      "Un seul compte, un seul accès, strictement personnel",
      "Aucune liste de clientes rendue publique",
      "Historique visible uniquement par vous et la Fondatrice",
    ],
  },
  {
    ico: "🤝",
    titre: "Sans jugement",
    texte:
      "Personne n'a besoin de justifier ses envies pour commander chez BSH. Notre service client reste discret, professionnel et bienveillant, à chaque étape.",
    items: [] as string[],
  },
];

export default function BshConfidentialitePage() {
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
          padding: "36px 22px 32px",
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
            marginBottom: 12,
          }}
        >
          Confidentialité & Livraison
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 24,
            margin: "0 0 12px",
            color: C.cream,
            lineHeight: 1.2,
          }}
        >
          Ce qui se passe chez BSH reste chez BSH.
        </h1>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, margin: 0 }}>
          De la commande à la livraison, tout est pensé pour que votre
          intimité reste la vôtre.
        </p>
      </div>

      {/* ── Blocs ── */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {BLOCS.map((b) => (
          <div
            key={b.titre}
            style={{
              background: "rgba(46,26,46,0.4)",
              border: `1px solid ${C.borderM}`,
              borderRadius: 6,
              padding: "16px 14px",
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 500,
                fontSize: 16,
                margin: "0 0 8px",
                color: C.cream,
              }}
            >
              {b.ico} {b.titre}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: "0 0 10px" }}>
              {b.texte}
            </p>
            {b.items.length > 0 && (
              <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                {b.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 12,
                      color: "rgba(203,185,185,0.65)",
                      lineHeight: 1.7,
                      marginBottom: 3,
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* ── Citation ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.plum}, ${C.plumD} 70%)`,
          padding: "24px 22px",
          textAlign: "center",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <p
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 16,
            color: C.goldL,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          &quot;Il y a ce que l&apos;on montre. Et ce que l&apos;on garde
          pour soi.&quot;
        </p>
      </div>

      <BshFooter />
    </div>
  );
}
