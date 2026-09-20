// ═══════════════════════════════════════════════════════════
// Le Cercle BSH — src/app/bsh/cercle/page.tsx (route réelle /bsh/cercle)
//
// Cette page n'existait pas dans ClientBSH : le bouton "Rejoindre
// Le Cercle" ouvrait en réalité BSH Members (bug signalé et corrigé
// ici en construisant cette vraie page Cercle, distincte).
//
// Contenu construit à partir de la direction de la maquette fournie
// (hero, "Ce qu'est Le Cercle", "Les règles du Cercle", CTA), avec
// les mêmes jetons de palette/typographie que l'accueil — rien de
// nouveau inventé sur le plan visuel, seulement le texte de cette
// page qui n'avait pas encore de version live.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { bshWaLink } from "../bshWa";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "Le Cercle",
  description:
    "Le Cercle BSH — communauté privée WhatsApp, complicité et sensualité. Distincte de BSH Members.",
};

const REGLES = [
  {
    titre: "Respect",
    desc: "Aucun jugement sur les préférences ou orientations de chacune.",
  },
  {
    titre: "Consentement",
    desc: "Aucune sollicitation insistante, aucun message privé non désiré.",
  },
  {
    titre: "Discrétion",
    desc: "Aucune capture d'écran ni information personnelle partagée hors du groupe.",
  },
  {
    titre: "Rien d'explicite",
    desc: "Le Cercle suggère, il ne montre jamais frontalement.",
  },
];

const MSG_REJOINDRE_CERCLE =
  "Bonjour, je souhaite rejoindre Le Cercle BSH.";

export default function BshCerclePage() {
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
            background: `linear-gradient(135deg, ${C.plum}, #5c1522)`,
            border: `1px solid rgba(198,161,91,0.4)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            margin: "0 auto 16px",
          }}
        >
          💬
        </div>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            color: C.roseD,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 12,
          }}
        >
          Communauté privée · Complicité · Sensualité
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
          Hello Sweety&apos;s 🫦
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
          Il y a ce que l&apos;on montre. Et il y a Le Cercle — l&apos;espace
          où l&apos;on peut être curieuse, joueuse, un peu plus audacieuse,
          sans jamais être jugée.
        </p>
      </div>

      {/* ── Ce qu'est Le Cercle ── */}
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
          Ce qu&apos;est Le Cercle
        </h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: "0 0 14px" }}>
          Le Cercle BSH est une communauté{" "}
          <strong style={{ color: C.cream }}>privée sur WhatsApp</strong>,
          pensée pour aller plus loin que la boutique. On y parle envies,
          préférences, découvertes — à travers des jeux, des sondages, des
          questions et des animations régulières.
        </p>
        <div
          style={{
            background: "rgba(92,21,34,0.12)",
            border: "1px solid rgba(92,21,34,0.25)",
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
              color: C.roseD,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            &quot;Bon… petite question entre nous 👀 Team douceur ou team
            audace ce soir ?&quot;
          </p>
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: 0 }}>
          Ce n&apos;est pas un fil de promotions. C&apos;est un espace de
          conversation, de jeu et de complicité — on peut observer sans
          intervenir, participer quand on en a envie, ou simplement profiter
          de l&apos;ambiance.
        </p>
      </div>

      {/* ── Les règles du Cercle ── */}
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
          Les règles du Cercle
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {REGLES.map((r) => (
            <div
              key={r.titre}
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
                {r.titre}
              </h3>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                {r.desc}
              </p>
            </div>
          ))}
        </div>
        <div
          style={{
            textAlign: "center",
            padding: 16,
            border: `1px solid rgba(198,161,91,0.25)`,
            borderRadius: 4,
          }}
        >
          <p
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 16,
              color: C.goldL,
              margin: 0,
            }}
          >
            &quot;Ce qui appartient au Cercle reste dans le Cercle.&quot;
          </p>
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
          href={bshWaLink(MSG_REJOINDRE_CERCLE)}
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
          Rejoindre Le Cercle
        </a>
        <p style={{ fontSize: 11, color: "rgba(203,185,185,0.5)", margin: 0, lineHeight: 1.6 }}>
          Le Cercle BSH est une communauté à part entière — distincte de{" "}
          <strong style={{ color: "rgba(198,161,91,0.6)" }}>BSH Members</strong>,
          le programme officiel d&apos;adhésion de la marque.
        </p>
      </div>

      <BshFooter />
    </div>
  );
}
