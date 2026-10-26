"use client";
// ═══════════════════════════════════════════════════════════
// SecretGamesClient.tsx — src/app/bsh/secret-games/SecretGamesClient.tsx
//
// Tirage de carte + historique (clientes connectées) + proposition de
// thème (ouverte à tout le monde, modérée par la fondatrice depuis
// BSHF → onglet 🎲). Même mécanisme de session que le reste de
// "Mon espace BSH" (useBshEspace) — une visiteuse non connectée peut
// tirer une carte et proposer un thème, mais n'a pas d'historique
// conservé (comme favoris/panier ailleurs dans BSH).
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { useBshEspace, espaceFetch } from "../espace/useBshEspace";
import { bshWaLink } from "../bshWa";
import type { CarteBSH } from "./getCartes";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const ESPACES = [
  { v: "le_cercle", l: "Le Cercle BSH" },
  { v: "bsh_lounge", l: "BSH Lounge" },
  { v: "secret_games", l: "Secret Games" },
  { v: "tous_espaces", l: "Tous les espaces" },
];
const TYPES_JEU = [
  { v: "cartes_defis", l: "Cartes et défis" },
  { v: "jeu_de_role", l: "Jeu de rôle" },
  { v: "quiz_sondage", l: "Quiz-sondage" },
  { v: "enigme_mystere", l: "Énigme-mystère" },
  { v: "autre", l: "Autre" },
];

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px",
  color: C.cream, fontSize: 13, fontFamily: BODY, outline: "none",
};

export default function SecretGamesClient({
  cartesInitiales,
  diagnostic,
}: {
  cartesInitiales: CarteBSH[];
  diagnostic: string | null;
}) {
  const etat = useBshEspace();
  const [tab, setTab] = useState<"jouer" | "theme">("jouer");
  const [carte, setCarte] = useState<CarteBSH | null>(null);
  const [tirageEnregistre, setTirageEnregistre] = useState(false);
  const [form, setForm] = useState({ pseudo: "", titre: "", espace: "secret_games", type_jeu: "cartes_defis", description: "" });
  const [envoi, setEnvoi] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  const tirer = async () => {
    if (cartesInitiales.length === 0) return;
    const c = cartesInitiales[Math.floor(Math.random() * cartesInitiales.length)];
    setCarte(c);
    setTirageEnregistre(false);
    if (etat.statut === "connectee") {
      const res = await espaceFetch(etat.token, "bsh_jeux_tirages", {
        method: "POST",
        body: JSON.stringify({ client_id: etat.profil.id, carte_id: c.id }),
      });
      if (res.ok) setTirageEnregistre(true);
    }
  };

  const proposerTheme = async () => {
    if (!form.titre.trim()) return;
    setEnvoi("envoi");
    try {
      const res = await fetch(`${SB_URL}/rest/v1/bsh_jeux_themes`, {
        method: "POST",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: form.pseudo || null,
          titre: form.titre,
          espace: form.espace,
          type_jeu: form.type_jeu,
          description: form.description || null,
        }),
      });
      setEnvoi(res.ok ? "ok" : "erreur");
      if (res.ok) setForm({ pseudo: "", titre: "", espace: "secret_games", type_jeu: "cartes_defis", description: "" });
    } catch {
      setEnvoi("erreur");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, color: C.cream, fontFamily: BODY, fontWeight: 300, maxWidth: 560, margin: "0 auto" }}>
      {/* ── Hero ── */}
      <div style={{ background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 45%, ${C.night} 100%)`, padding: "36px 22px 32px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
          Jouer
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 24, lineHeight: 1.25, margin: "0 0 12px", color: C.cream }}>
          BSH Secret Games
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.75, color: C.muted, margin: 0, maxWidth: 340 }}>
          Un tirage de carte, une question à partager à deux — avec élégance et discrétion.
        </p>
      </div>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.night }}>
        {[{ id: "jouer" as const, l: "🎴 Jouer" }, { id: "theme" as const, l: "✦ Proposer un thème" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "12px 10px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: BODY, color: tab === t.id ? C.goldL : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ background: C.plumD, padding: "28px 22px 36px", minHeight: 320 }}>
        {tab === "jouer" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {diagnostic && cartesInitiales.length === 0 && (
              <p style={{ fontSize: 10, color: "#e07070", fontFamily: "monospace", textAlign: "center", margin: 0 }}>
                {diagnostic}
              </p>
            )}
            {cartesInitiales.length === 0 && !diagnostic && (
              <p style={{ fontSize: 13, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
                Le jeu se prépare — les premières cartes arrivent bientôt.
              </p>
            )}
            {cartesInitiales.length > 0 && !carte && (
              <button onClick={tirer} style={{
                width: 200, height: 260, borderRadius: 14, border: `1px solid ${C.borderM}`,
                background: `linear-gradient(160deg, ${C.plum}, ${C.night})`, color: C.goldL,
                fontFamily: DISPLAY, fontSize: 16, cursor: "pointer", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <span style={{ fontSize: 36 }}>✦</span>
                Tirer une carte
              </button>
            )}
            {carte && (
              <div style={{
                width: 220, borderRadius: 14, border: `1px solid ${C.gold}`,
                background: `linear-gradient(160deg, ${C.plum}, ${C.night})`,
                padding: "28px 20px", textAlign: "center", display: "flex",
                flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 40 }}>{carte.emoji}</span>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.goldL, letterSpacing: 2 }}>{carte.nom}</div>
                <p style={{ fontSize: 13, color: C.cream, lineHeight: 1.6, margin: "6px 0 0" }}>{carte.question}</p>
              </div>
            )}
            {carte && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <a href={bshWaLink(`${carte.emoji} ${carte.nom} — ${carte.question} (via BSH Secret Games)`)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#25d366", border: "1px solid rgba(37,211,102,0.4)", borderRadius: 20, padding: "7px 14px", textDecoration: "none" }}>
                  💬 Partager
                </a>
                <button onClick={tirer} style={{ fontSize: 11, color: C.goldL, background: "none", border: `1px solid ${C.borderM}`, borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: BODY }}>
                  ↻ Tirer une autre carte
                </button>
              </div>
            )}
            {carte && etat.statut !== "connectee" && (
              <p style={{ fontSize: 10, color: C.muted, fontStyle: "italic", textAlign: "center", margin: 0 }}>
                Connectez-vous depuis votre espace BSH pour conserver l'historique de vos tirages.
              </p>
            )}
            {carte && tirageEnregistre && (
              <p style={{ fontSize: 10, color: "#4ade80", textAlign: "center", margin: 0 }}>✓ Ajouté à votre historique</p>
            )}
          </div>
        )}

        {tab === "theme" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: "0 0 6px" }}>
              Une idée de jeu, de défi ou de thème pour Le Cercle, la Lounge ou Secret Games ? Proposez-la ici — la fondatrice relit chaque proposition avant toute publication.
            </p>
            <input placeholder="Votre pseudo (optionnel)" value={form.pseudo} onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))} style={inp} />
            <input placeholder="Titre de votre idée *" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} style={inp} />
            <select value={form.espace} onChange={(e) => setForm((f) => ({ ...f, espace: e.target.value }))} style={{ ...inp, background: "#1a1020" }}>
              {ESPACES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={form.type_jeu} onChange={(e) => setForm((f) => ({ ...f, type_jeu: e.target.value }))} style={{ ...inp, background: "#1a1020" }}>
              {TYPES_JEU.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <textarea placeholder="Décrivez votre idée" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
            <button onClick={proposerTheme} disabled={envoi === "envoi" || !form.titre.trim()}
              style={{ background: C.gold, border: "none", borderRadius: 2, padding: "11px 22px", color: C.night, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer", fontFamily: BODY, opacity: envoi === "envoi" || !form.titre.trim() ? 0.6 : 1 }}>
              {envoi === "envoi" ? "Envoi…" : "Envoyer la proposition"}
            </button>
            {envoi === "ok" && <p style={{ fontSize: 11, color: "#4ade80", margin: 0 }}>✓ Proposition envoyée — merci !</p>}
            {envoi === "erreur" && <p style={{ fontSize: 11, color: "#f87171", margin: 0 }}>Échec de l'envoi — réessayez dans un instant.</p>}
          </div>
        )}
      </div>

      <div style={{ background: C.night, padding: "16px 22px", textAlign: "center", borderTop: `1px solid ${C.borderL}` }}>
        <Link href="https://renee-lise.github.io/bsh-secret-games/" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", textDecoration: "none" }}>
          Version précédente (démo) ↗
        </Link>
      </div>
    </div>
  );
}
