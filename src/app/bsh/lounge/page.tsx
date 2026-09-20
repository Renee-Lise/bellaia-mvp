// ═══════════════════════════════════════════════════════════
// BSH Lounge — src/app/bsh/lounge/page.tsx (route réelle /bsh/lounge)
//
// N'existait nulle part dans ClientBSH : page entièrement nouvelle.
// Même structure et mêmes jetons de palette/typographie que Le
// Cercle, mais un ton différent — communauté ouverte et conviviale,
// pas complice/sensuelle. Même logique de demande manuelle que Le
// Cercle et BSH Members : DM WhatsApp pré-rempli, message qui dit
// explicitement que c'est une demande, validation par la fondatrice
// ensuite. Pas de questionnaire automatisé, pas d'ajout automatique.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { bshWaLink } from "../bshWa";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Lounge",
  description:
    "BSH Lounge — communauté libre WhatsApp : discussions, retours produits, partages, événements. Distincte du Cercle et de BSH Members.",
};

const ATOUTS = [
  {
    titre: "Discussions ouvertes",
    desc: "Posez vos questions, partagez vos avis, sans filtre ni jugement.",
  },
  {
    titre: "Retours produits",
    desc: "Donnez votre avis sur vos achats, aidez les autres à choisir.",
  },
  {
    titre: "Avant-premières",
    desc: "Soyez informée des nouveautés et des événements BSH.",
  },
  {
    titre: "Bonne ambiance",
    desc: "Un espace convivial, ouvert à toutes, sans complicité de rigueur.",
  },
];

const MSG_REJOINDRE_LOUNGE =
  "Bonjour, je souhaite faire une demande pour rejoindre BSH Lounge.";

export default function BshLoungePage() {
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
      {/* ── Hero ── */}
      <div
        style={{
          background: C.plumD,
          padding: "40px 22px 32px",
          textAlign: "center",
          borderBottom: `1px solid ${C.borderL}`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.plum}, ${C.plumD})`,
            border: `1px solid rgba(198,161,91,0.4)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            margin: "0 auto 16px",
          }}
        >
          💛
        </div>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            color: C.goldL,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 12,
          }}
        >
          Communauté libre · Discussions & Partages
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 28,
            margin: "0 0 16px",
            color: C.cream,
          }}
        >
          BSH Lounge
        </h1>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            color: C.muted,
            margin: "0 auto",
            maxWidth: 320,
          }}
        >
          Ici, on parle, on teste, on partage. Un espace ouvert où chacune
          peut donner son avis, poser ses questions et suivre la vie de BSH
          — sans engagement, sans jugement.
        </p>
      </div>

      {/* ── Ce qu'est le Lounge ── */}
      <div
        style={{
          background: C.plumD,
          padding: "28px 22px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 20,
            margin: "0 0 16px",
            color: C.cream,
          }}
        >
          Ce qu&apos;est BSH Lounge
        </h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: "0 0 14px" }}>
          BSH Lounge est une communauté{" "}
          <strong style={{ color: C.cream }}>libre sur WhatsApp</strong>,
          ouverte à toutes celles qui veulent échanger autour de l&apos;univers
          BSH : discussions, retours d&apos;expérience, tests produits,
          partages et annonces d&apos;événements.
        </p>
        <div
          style={{
            background: "rgba(198,161,91,0.06)",
            border: "1px solid rgba(198,161,91,0.2)",
            borderRadius: 4,
            padding: "12px 16px",
            margin: "16px 0",
          }}
        >
          <p
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 14,
              color: C.goldL,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            &quot;Vous avez testé le Coffret Nuit de Velours ? Dites-nous
            tout 👀&quot;
          </p>
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: 0 }}>
          Pas de complicité de rigueur, pas de statut à obtenir — juste
          l&apos;envie d&apos;échanger. On peut observer, participer, ou
          simplement rester informée.
        </p>
      </div>

      {/* ── Ce que vous y trouverez ── */}
      <div style={{ background: C.night, padding: "28px 22px", borderBottom: `1px solid ${C.border}` }}>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 20,
            margin: "0 0 16px",
            color: C.cream,
          }}
        >
          Ce que vous y trouverez
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {ATOUTS.map((a) => (
            <div
              key={a.titre}
              style={{
                background: "rgba(46,26,46,0.4)",
                border: `1px solid ${C.borderM}`,
                borderRadius: 4,
                padding: "13px 11px",
              }}
            >
              <h3
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 500,
                  fontSize: 13,
                  margin: "0 0 6px",
                  color: C.goldL,
                }}
              >
                {a.titre}
              </h3>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.plum}, ${C.plumD} 70%)`,
          padding: "28px 22px",
          textAlign: "center",
        }}
      >
        <a
          href={bshWaLink(MSG_REJOINDRE_LOUNGE)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            background: C.gold,
            border: "none",
            borderRadius: 2,
            padding: "12px 24px",
            color: C.night,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
            fontFamily: BODY,
            textDecoration: "none",
            marginBottom: 14,
          }}
        >
          Rejoindre BSH Lounge
        </a>
        <p
          style={{
            fontSize: 11,
            color: "rgba(203,185,185,0.6)",
            margin: "0 0 14px",
            lineHeight: 1.6,
          }}
        >
          Ce bouton ouvre un message WhatsApp — c&apos;est une demande, pas
          une inscription automatique. La fondatrice vous ajoute
          personnellement au Lounge après l&apos;avoir lu.
        </p>
        <p style={{ fontSize: 11, color: "rgba(203,185,185,0.5)", margin: 0, lineHeight: 1.6 }}>
          BSH Lounge est une communauté à part entière — distincte du{" "}
          <strong style={{ color: "rgba(198,161,91,0.6)" }}>Cercle BSH</strong>{" "}
          (complicité, sensualité) et de{" "}
          <strong style={{ color: "rgba(198,161,91,0.6)" }}>BSH Members</strong>{" "}
          (programme officiel d&apos;adhésion).
        </p>
      </div>

      <BshFooter />
    </div>
  );
}
