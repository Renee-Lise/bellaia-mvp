"use client";
// ═══════════════════════════════════════════════════════════
// SecretDuoClient.tsx — src/app/bsh/secret-duo/SecretDuoClient.tsx
//
// Même mécanique de tirage que SecretGamesClient (communautaire),
// mais sans l'onglet "proposer un thème" (pas pertinent pour un
// espace privé à deux) et avec un cadrage explicite "un seul
// téléphone, à tour de rôle" — pas de synchronisation deux
// téléphones pour l'instant (V1, voir migration 0045).
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { useBshEspace, espaceFetch } from "../espace/useBshEspace";
import { bshWaLink } from "../bshWa";
import type { CarteBSH } from "../secret-games/getCartes";
import type { JeuBSH } from "../secret-games/getJeux";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function SecretDuoClient({
  jeux,
  jeuInitial,
  cartesInitiales,
  diagnostic,
}: {
  jeux: JeuBSH[];
  jeuInitial: JeuBSH | null;
  cartesInitiales: CarteBSH[];
  diagnostic: string | null;
}) {
  const etat = useBshEspace();
  const [jeuActif, setJeuActif] = useState<JeuBSH | null>(jeuInitial);
  const [cartes, setCartes] = useState<CarteBSH[]>(cartesInitiales);
  const [chargementCartes, setChargementCartes] = useState(false);
  const [carte, setCarte] = useState<CarteBSH | null>(null);
  const [tirageEnregistre, setTirageEnregistre] = useState(false);

  const choisirJeu = async (j: JeuBSH) => {
    if (j.id === jeuActif?.id) return;
    setJeuActif(j);
    setCarte(null);
    setTirageEnregistre(false);
    setChargementCartes(true);
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/bsh_jeux_cartes?jeu_id=eq.${j.id}&statut=eq.active&select=id,emoji,nom,question&order=ordre.asc&limit=100`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: "no-store" }
      );
      if (res.ok) setCartes(await res.json());
    } catch {}
    setChargementCartes(false);
  };

  const tirer = async () => {
    if (cartes.length === 0) return;
    const c = cartes[Math.floor(Math.random() * cartes.length)];
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, color: C.cream, fontFamily: BODY, fontWeight: 300, maxWidth: 560, margin: "0 auto" }}>
      {/* ── Hero ── */}
      <div style={{ background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 45%, ${C.night} 100%)`, padding: "36px 22px 32px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
          L&apos;univers des couples
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 24, lineHeight: 1.25, margin: "0 0 12px", color: C.cream }}>
          BSH Secret Duo
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.75, color: C.muted, margin: 0, maxWidth: 340 }}>
          Un espace privé, pensé pour deux. Un seul téléphone, passé de main en main — à vous de jouer, à tour de rôle.
        </p>
      </div>

      <div style={{ background: C.plumD, padding: "28px 22px 36px", minHeight: 320 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {jeux.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {jeux.map((j) => (
                <button key={j.id} onClick={() => choisirJeu(j)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: j.id === jeuActif?.id ? C.gold : "rgba(255,255,255,0.06)",
                    color: j.id === jeuActif?.id ? C.night : C.cream,
                    border: `1px solid ${j.id === jeuActif?.id ? C.gold : C.borderM}`,
                    borderRadius: 20, padding: "7px 14px", fontSize: 12, fontFamily: BODY, cursor: "pointer",
                  }}>
                  <span>{j.icone}</span>
                  <span>{j.nom}</span>
                </button>
              ))}
            </div>
          )}
          {jeuActif?.description && (
            <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: 0, maxWidth: 320 }}>
              {jeuActif.description}
            </p>
          )}
          {diagnostic && cartes.length === 0 && (
            <p style={{ fontSize: 10, color: "#e07070", fontFamily: "monospace", textAlign: "center", margin: 0 }}>
              {diagnostic}
            </p>
          )}
          {chargementCartes && (
            <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center" }}>Chargement du jeu…</p>
          )}
          {!chargementCartes && cartes.length === 0 && !diagnostic && (
            <p style={{ fontSize: 13, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
              BSH Secret Duo se prépare — les premiers jeux arrivent bientôt.
            </p>
          )}
          {!chargementCartes && cartes.length > 0 && !carte && (
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
              <a href={bshWaLink(`${carte.emoji} ${carte.nom} — ${carte.question} (via BSH Secret Duo)`)} target="_blank" rel="noopener noreferrer"
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
              Connectez-vous depuis votre espace BSH pour conserver l&apos;historique de vos tirages.
            </p>
          )}
          {carte && tirageEnregistre && (
            <p style={{ fontSize: 10, color: "#4ade80", textAlign: "center", margin: 0 }}>✓ Ajouté à votre historique</p>
          )}
        </div>
      </div>

      <div style={{ background: C.night, padding: "16px 22px", textAlign: "center", borderTop: `1px solid ${C.borderL}` }}>
        <p style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", margin: 0, lineHeight: 1.6 }}>
          Aucune réponse n&apos;est jamais enregistrée — seul le fait d&apos;avoir tiré une carte reste dans votre historique, si vous êtes connecté(e).
        </p>
      </div>
    </div>
  );
}
