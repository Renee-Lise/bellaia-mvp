// ═══════════════════════════════════════════════════════════
// L'Univers BSH — src/app/bsh/univers/page.tsx (route réelle /bsh/univers)
//
// N'existait nulle part dans ClientBSH : page "à propos" entièrement
// nouvelle, qui raconte la marque (mystère, élégance, promesse de
// non-jugement — cf. conception §2 "L'Univers BSH"). Construite à
// partir de la direction de la maquette fournie, mêmes jetons de
// palette/typographie que les pages déjà livrées. Pas de CTA
// communautaire ici : juste un renvoi vers la boutique en fin de page.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "L'Univers BSH",
  description:
    "L'Univers BSH — le mystère, l'élégance et la promesse de non-jugement de Bella'Secret Home.",
};

const VALEURS = [
  {
    titre: "Confidentialité",
    desc: "Personne n'a besoin de raconter sa vie intime pour appartenir à l'univers BSH. On peut regarder, participer ou simplement profiter — à son rythme.",
  },
  {
    titre: "Élégance",
    desc: "Textures réelles, lumière tamisée, tension plutôt qu'exposition. Le désir se suggère, il ne s'affiche jamais frontalement.",
  },
  {
    titre: "Sans jugement",
    desc: "BSH s'adresse aux femmes, aux hommes et aux couples, dans un cadre où chaque curiosité est légitime.",
  },
];

export default function BshUniversPage() {
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
          background: `radial-gradient(ellipse 60% 50% at 75% 30%, rgba(92,21,34,0.35), transparent 70%), linear-gradient(180deg, ${C.night} 0%, ${C.plumD} 100%)`,
          padding: "40px 22px 36px",
          position: "relative",
          overflow: "hidden",
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
          L&apos;Univers BSH
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 26,
            lineHeight: 1.2,
            margin: "0 0 16px",
            color: C.cream,
          }}
        >
          Une porte que tout le monde ne connaît pas.
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: C.muted, margin: 0, maxWidth: 320 }}>
          Bella&apos;Secret Home n&apos;est pas une boutique de plus.
          C&apos;est un univers complet, confidentiel et immersif, pensé pour
          que chacune puisse découvrir, explorer et vivre sa sensualité sans
          jamais être jugée.
        </p>
      </div>

      {/* ── Le secret, avant tout ── */}
      <div
        style={{
          background: C.plumD,
          padding: "28px 22px",
          borderTop: `1px solid ${C.border}`,
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
          Le secret, avant tout
        </h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: "0 0 14px" }}>
          Entrer dans BSH doit donner l&apos;impression d&apos;ouvrir une
          porte que tout le monde ne connaît pas. Il y a une dimension
          secrète, presque clandestine — mais jamais glauque. Ici, on peut
          être curieuse, joueuse, audacieuse, ou simplement découvrir
          quelque chose de nouveau.
        </p>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: "0 0 14px" }}>
          BSH reste toujours adulte, assumé et séduisant, mais jamais
          pornographique. Nous ne cultivons pas les codes vulgaires souvent
          associés aux sex-shops : notre ambition est une image élégante,
          féminine et premium.
        </p>
        <div
          style={{
            borderLeft: `2px solid rgba(198,161,91,0.4)`,
            paddingLeft: 16,
            margin: "20px 0",
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
            &quot;Il y a les choses que l&apos;on montre… et celles que
            l&apos;on réserve à BSH.&quot;
          </p>
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: 0 }}>
          Si Bella&apos;Secret Home était une personne, ce serait une femme
          élégante qui entre dans une pièce sans avoir besoin de parler fort
          pour être remarquée. Elle connaît son pouvoir de séduction mais
          n&apos;a pas besoin de l&apos;exhiber. Douce un jour, mystérieuse
          le lendemain, joueuse le mardi — elle ne cherche pas à choquer,
          elle préfère créer une tension.
        </p>
      </div>

      {/* ── Trois valeurs ── */}
      <div
        style={{
          background: C.night,
          padding: "28px 22px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VALEURS.map((v) => (
            <div
              key={v.titre}
              style={{
                background: "rgba(46,26,46,0.4)",
                border: `1px solid ${C.borderM}`,
                borderRadius: 4,
                padding: "16px 14px",
              }}
            >
              <h3
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 500,
                  fontSize: 15,
                  margin: "0 0 8px",
                  color: C.goldL,
                }}
              >
                {v.titre}
              </h3>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Principe ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.plum}, ${C.plumD} 70%)`,
          padding: "28px 22px",
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: DISPLAY,
            fontSize: 15,
            fontStyle: "italic",
            color: C.muted,
            lineHeight: 1.8,
            margin: "0 0 20px",
          }}
        >
          BSH ne vend pas seulement des produits adultes. BSH vend
          l&apos;autorisation d&apos;explorer ses envies, dans un univers
          élégant, confidentiel, libre et sans jugement.
        </p>
        <Link
          href="/bsh/boutique"
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
          }}
        >
          Découvrir la boutique
        </Link>
      </div>

      <BshFooter />
    </div>
  );
}
