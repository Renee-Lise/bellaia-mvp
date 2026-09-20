// ═══════════════════════════════════════════════════════════
// Accueil public Bella'Secret Home — src/app/bsh/page.tsx (route réelle /bsh)
//
// Contenu repris tel quel de l'accueil déjà en place dans ClientBSH
// (src/components/BellaiaApp.tsx, page === "accueil") : même hero,
// même manifeste, même bloc "Quatre univers", même bloc Le Cercle,
// même footer. Seul changement : la navigation interne (setPage)
// devient de vrais liens Next.js vers /bsh/*, et le lien "Rejoindre
// Le Cercle" pointe maintenant vers la page Cercle plutôt que vers
// BSH Members (l'un ne doit jamais se substituer à l'autre).
//
// Les pages /bsh/boutique, /bsh/univers, /bsh/cercle, /bsh/lounge,
// /bsh/confidentialite, /bsh/mentions n'existent pas encore : elles
// arrivent dans cet ordre, une par une. Les liens ci-dessous pointent
// déjà vers leur destination finale.
// ═══════════════════════════════════════════════════════════
import Link from "next/link";
import AgeGate from "./AgeGate";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "./bshTokens";

const UNIVERS = [
  { ico: "🌸", titre: "Lingerie", desc: "Dentelle, satin et velours — des pièces pensées pour se sentir désirable, pas déguisée.", href: "/bsh/boutique" },
  { ico: "🎲", titre: "Jeux de couple", desc: "Accessoires choisis pour la complicité, jamais pour choquer.", href: "/bsh/boutique" },
  { ico: "🕯", titre: "Sensoriel", desc: "Huiles, produits et petites attentions pour prolonger la soirée.", href: "/bsh/boutique" },
  { ico: "🎁", titre: "Coffrets & Exp.", desc: "Des moments à vivre plutôt que de simples produits.", href: "/bsh/boutique" },
];

const FOOTER_LINKS = [
  { l: "Boutique", href: "/bsh/boutique" },
  { l: "Univers BSH", href: "/bsh/univers" },
  { l: "Cercle", href: "/bsh/cercle" },
  { l: "Lounge", href: "/bsh/lounge" },
];

export default function BshAccueilPage() {
  return (
    <AgeGate>
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
            background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 45%, ${C.night} 100%)`,
            padding: "36px 22px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-60px",
              right: "-60px",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${C.halo}, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: C.gold,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 16,
            }}
          >
            L&apos;intimité élevée au rang d&apos;art
          </span>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 26,
              lineHeight: 1.25,
              margin: "0 0 14px",
              color: C.cream,
              letterSpacing: "0.01em",
            }}
          >
            Il y a ce que l&apos;on montre.
            <br />
            Et ce que l&apos;on{" "}
            <em style={{ color: C.goldL, fontStyle: "italic" }}>réserve</em> à
            BSH.
          </h1>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              color: C.muted,
              margin: "0 0 24px",
              maxWidth: 320,
            }}
          >
            Un univers pensé pour la découverte, le désir et la complicité —
            lingerie, jeux de couple, coffrets et expériences, loin des codes
            habituels du genre.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/bsh/boutique"
              style={{
                background: C.gold,
                border: "none",
                borderRadius: 2,
                padding: "11px 22px",
                color: C.night,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: BODY,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Découvrir BSH
            </Link>
            <Link
              href="/bsh/cercle"
              style={{
                background: "transparent",
                border: `1px solid rgba(198,161,91,0.5)`,
                borderRadius: 2,
                padding: "11px 22px",
                color: C.goldL,
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: BODY,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Rejoindre Le Cercle
            </Link>
          </div>
        </div>

        {/* ── Manifeste ── */}
        <div
          style={{
            background: C.night,
            padding: "28px 22px",
            borderTop: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: DISPLAY,
              fontSize: 18,
              fontStyle: "italic",
              color: C.goldL,
              margin: 0,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
            }}
          >
            &quot;Certains secrets méritent d&apos;être découverts.&quot;
          </p>
        </div>

        {/* ── Quatre univers ── */}
        <div style={{ background: C.plumD, padding: "32px 22px" }}>
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              color: C.gold,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8,
            }}
          >
            La boutique
          </span>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 22,
              margin: "0 0 24px",
              color: C.cream,
              letterSpacing: "0.01em",
            }}
          >
            Quatre univers à explorer
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {UNIVERS.map((u) => (
              <Link
                key={u.titre}
                href={u.href}
                style={{
                  background: "rgba(46,26,46,0.5)",
                  border: `1px solid ${C.borderM}`,
                  borderRadius: 4,
                  padding: "16px 14px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{u.ico}</div>
                <h3
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 500,
                    fontSize: 14,
                    margin: "0 0 6px",
                    color: C.cream,
                    letterSpacing: "0.01em",
                  }}
                >
                  {u.titre}
                </h3>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                  {u.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Le Cercle BSH ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.plum} 0%, ${C.plumD} 100%)`,
            padding: "32px 22px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 9,
              letterSpacing: "0.14em",
              color: C.night,
              background: C.gold,
              padding: "3px 10px",
              borderRadius: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Communauté privée
          </span>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 22,
              margin: "0 0 12px",
              color: C.cream,
            }}
          >
            Le Cercle BSH
          </h2>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, margin: "0 0 20px" }}>
            Hello Sweety&apos;s 🫦 — un espace confidentiel où l&apos;on peut
            être curieuse, joueuse ou simplement observer, sans jamais être
            jugée. Sondages, questions, découvertes en avant-première.
          </p>
          <Link
            href="/bsh/cercle"
            style={{
              background: C.gold,
              border: "none",
              borderRadius: 2,
              padding: "11px 22px",
              color: C.night,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              cursor: "pointer",
              fontFamily: BODY,
              width: "100%",
              textDecoration: "none",
              display: "block",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            Rejoindre Le Cercle
          </Link>
          <p
            style={{
              fontSize: 11,
              fontStyle: "italic",
              color: "rgba(203,185,185,0.5)",
              textAlign: "center",
              marginTop: 16,
              marginBottom: 0,
              letterSpacing: "0.02em",
            }}
          >
            &quot;Ce qui appartient au Cercle reste dans le Cercle.&quot;
          </p>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            background: C.night,
            padding: "20px 22px",
            textAlign: "center",
            borderTop: `1px solid ${C.borderL}`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 14,
              color: C.gold,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            ✦ Bella&apos;Secret Home
          </div>
          <div style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", letterSpacing: "0.1em" }}>
            INTIMITÉ · ÉLÉGANCE · DÉSIR
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.l}
                href={l.href}
                style={{
                  color: "rgba(203,185,185,0.5)",
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  fontFamily: BODY,
                  textDecoration: "none",
                }}
              >
                {l.l}
              </Link>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${C.borderL}`,
              flexWrap: "wrap",
            }}
          >
            {[
              { l: "Confidentialité & Livraison", href: "/bsh/confidentialite" },
              { l: "Mentions légales", href: "/bsh/mentions" },
            ].map((l) => (
              <Link
                key={l.l}
                href={l.href}
                style={{
                  color: "rgba(203,185,185,0.3)",
                  fontSize: 9,
                  letterSpacing: "0.03em",
                  fontFamily: BODY,
                  textDecoration: "none",
                }}
              >
                {l.l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AgeGate>
  );
}
