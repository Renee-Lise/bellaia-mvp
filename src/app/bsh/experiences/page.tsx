// ═══════════════════════════════════════════════════════════
// BSH Secret Circle & Experiences — page d'accueil publique
// src/app/bsh/experiences/page.tsx (route réelle /bsh/experiences)
//
// Construite à partir de la consigne complète de Renée-Lise (identité
// BSH Secret Circle, catalogue d'expériences, préinscription). Aucune
// date/adresse/tarif n'est inventée ici — chaque événement affiché
// vient réellement de bsh_evenements (publie=true), avec repli clair
// ("à déterminer") quand un champ n'est pas encore renseigné.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { bshWaLink } from "../bshWa";
import BshFooter from "../BshFooter";
import { getEvenementsBSHPublics } from "./getEvenementsPublics";
import PreinscriptionForm from "./PreinscriptionForm";
import AchatBilletForm from "./AchatBilletForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BSH Secret Circle & Experiences",
  description: "Plaisir · Élégance · Intimité — les expériences événementielles Bella'Secret Home : Boudoir Sessions, Wolf Night, Secret Wolf Ball, Private Experiences.",
};

const CATEGORIES = [
  { id: "boudoir_session", ico: "🕯", titre: "BSH Boudoir Sessions", desc: "Présentations privées en petit comité — découverte de produits et animations, non explicite." },
  { id: "wolf_night", ico: "🐺", titre: "Wolf Night — Diamond B Edition", desc: "Événements musicaux caribéens, sélection de morceaux Diamond B, univers artistique de La Louve." },
  { id: "secret_wolf_ball", ico: "🎭", titre: "The Secret Wolf Ball", desc: "Événements premium — bals masqués et soirées thématiques." },
  { id: "private_experience", ico: "🔑", titre: "BSH Private Experiences", desc: "Prestations événementielles privées, sur demande." },
];

const MSG_REJOINDRE = "Bonjour, je souhaite en savoir plus sur BSH Secret Circle & Experiences.";

function fmtDate(d: string | null): string {
  if (!d) return "Date à déterminer";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return d; }
}

export default async function BshExperiencesPage() {
  const { evenements } = await getEvenementsBSHPublics();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, color: C.cream, fontFamily: BODY, fontWeight: 300, maxWidth: 560, margin: "0 auto" }}>
      {/* ── Hero immersif ── */}
      <div style={{ background: `radial-gradient(ellipse at 50% 0%, ${C.plum}, ${C.night} 75%)`, padding: "48px 22px 36px", textAlign: "center", borderBottom: `1px solid ${C.borderL}` }}>
        <style>{`
          @keyframes bshCercleRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes bshCerclePulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
          .bsh-cercle-emblem { animation: bshCercleRotate 40s linear infinite; }
          .bsh-cercle-emblem-inner { animation: bshCerclePulse 3.5s ease-in-out infinite; }
        `}</style>
        <div style={{ width: 84, height: 84, margin: "0 auto 20px", position: "relative" }}>
          <svg className="bsh-cercle-emblem" viewBox="0 0 100 100" width="84" height="84">
            <circle cx="50" cy="50" r="46" fill="none" stroke={C.gold} strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
            <circle cx="50" cy="50" r="36" fill="none" stroke={C.gold} strokeWidth="1" opacity="0.4" />
          </svg>
          <div className="bsh-cercle-emblem-inner" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
            🔑
          </div>
        </div>
        <span style={{ fontSize: 9, letterSpacing: "0.22em", color: C.fuchsia, textTransform: "uppercase", display: "block", marginBottom: 14 }}>
          Plaisir · Élégance · Intimité
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, margin: "0 0 14px", color: C.cream }}>
          BSH Secret Circle
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: C.muted, margin: "0 auto 26px", maxWidth: 320 }}>
          L&apos;identité fédératrice des expériences Bella&apos;Secret Home — des soirées pensées, élégantes, confidentielles.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#experiences" style={{ display: "inline-block", background: C.gold, border: "none", borderRadius: 2, padding: "11px 20px", color: C.night, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: BODY, textDecoration: "none" }}>
            Découvrir les expériences
          </a>
          <a href="#preinscription" style={{ display: "inline-block", background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 2, padding: "11px 20px", color: C.goldL, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: BODY, textDecoration: "none" }}>
            Rejoindre la communauté
          </a>
        </div>
      </div>

      {/* ── Catalogue d'expériences ── */}
      <div id="experiences" style={{ background: C.plumD, padding: "32px 22px", borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 20, margin: "0 0 18px", color: C.cream }}>
          Les expériences BSH
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CATEGORIES.map((c) => (
            <div key={c.id} style={{ background: "rgba(46,26,46,0.4)", border: `1px solid ${C.borderM}`, borderRadius: 4, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>{c.ico}</div>
              <div>
                <h3 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 14, margin: "0 0 5px", color: C.goldL }}>{c.titre}</h3>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prochains événements ── */}
      <div style={{ background: C.night, padding: "32px 22px", borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 20, margin: "0 0 16px", color: C.cream }}>
          Prochains événements
        </h2>
        {evenements.length === 0 ? (
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, margin: 0 }}>
            Aucun événement publié pour l&apos;instant — la première BSH Boudoir Session se prépare. Préinscrivez-vous ci-dessous pour être informée dès que la ville et la date sont fixées.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {evenements.map((e) => (
              <div key={e.id} style={{ border: `1px solid ${C.borderM}`, borderRadius: 4, padding: "14px 16px" }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 15, color: C.cream, marginBottom: 4 }}>{e.ico || "✨"} {e.nom}</div>
                {e.description && <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.6 }}>{e.description}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: C.muted }}>
                  <span>📅 {fmtDate(e.dateEvenement)}</span>
                  <span>📍 {e.ville || "Ville à déterminer"}</span>
                  <span>👥 {e.placesRestantes} place{e.placesRestantes > 1 ? "s" : ""} restante{e.placesRestantes > 1 ? "s" : ""}</span>
                  {e.dureeMinutes && <span>⏱ {e.dureeMinutes} min</span>}
                  {e.prix > 0 && <span>💶 {e.prix.toFixed(2)} €</span>}
                </div>
                {e.prix > 0 && e.statut === "actif" && e.placesRestantes > 0 && (
                  <AchatBilletForm evenementId={e.id} prix={e.prix} placesRestantes={e.placesRestantes} />
                )}
                {e.placesRestantes <= 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.fuchsia }}>Complet — préinscrivez-vous pour la liste d&apos;attente.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Préinscription ── */}
      <div id="preinscription" style={{ background: C.plumD, padding: "32px 22px", borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 20, margin: "0 0 8px", color: C.cream }}>
          Préinscription
        </h2>
        <p style={{ fontSize: 11, color: C.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
          Gratuite, sans engagement — manifestez votre intérêt pour être prévenue dès l&apos;ouverture des places.
        </p>
        <PreinscriptionForm evenements={evenements.map((e) => ({ id: e.id, nom: e.nom }))} />
      </div>

      {/* ── CTA communauté / Members ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.plum}, ${C.plumD} 70%)`, padding: "28px 22px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px", lineHeight: 1.7 }}>
          BSH Secret Circle s&apos;articule avec les communautés existantes — Le Cercle, BSH Lounge — et le programme <strong style={{ color: C.goldL }}>BSH Members</strong>.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={bshWaLink(MSG_REJOINDRE)} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: C.gold, border: "none", borderRadius: 2, padding: "11px 20px", color: C.night, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BODY, textDecoration: "none" }}>
            Nous écrire
          </a>
          <a href="/bsh/members" style={{ display: "inline-block", background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 2, padding: "11px 20px", color: C.goldL, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BODY, textDecoration: "none" }}>
            Espace Members
          </a>
        </div>
      </div>

      <BshFooter />
    </div>
  );
}
