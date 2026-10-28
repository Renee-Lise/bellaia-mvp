"use client";
// ═══════════════════════════════════════════════════════════
// SalonsClient.tsx — src/app/bsh/secret-salons/SalonsClient.tsx
//
// Créer/rejoindre un salon, puis tirage de carte synchronisé en
// direct entre tous les participants (Supabase Realtime, table
// bsh_salons — voir migration 0046 pour la portée de cette v1).
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import type { JeuBSH } from "../secret-games/getJeux";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Créé à la demande (pas au chargement du module) : un appel à
// createClient() au niveau module échoue pendant le build Next.js
// (prérendu), les variables d'environnement n'étant pas garanties
// disponibles à ce moment-là — même piège que useBshEspace.ts, qui
// crée son client à l'intérieur d'un useEffect pour la même raison.
let sbInstance: ReturnType<typeof createClient> | null = null;
function getSb() {
  if (!sbInstance) sbInstance = createClient(SB_URL, SB_KEY);
  return sbInstance;
}

interface Carte { id: string; emoji: string; nom: string; question: string; }
interface Salon { id: string; code: string; jeu_id: string; pseudo_hote: string | null; carte_actuelle_id: string | null; statut: string; }

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px",
  color: C.cream, fontSize: 13, fontFamily: BODY, outline: "none",
};

function genererCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export default function SalonsClient({ jeux, diagnostic }: { jeux: JeuBSH[]; diagnostic: string | null }) {
  const [vue, setVue] = useState<"accueil" | "salon">("accueil");
  const [sousVue, setSousVue] = useState<"creer" | "rejoindre">("creer");
  const [pseudo, setPseudo] = useState("");
  const [jeuChoisi, setJeuChoisi] = useState<string>(jeux[0]?.id || "");
  const [codeSaisi, setCodeSaisi] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [cartesDuJeu, setCartesDuJeu] = useState<Carte[]>([]);
  const [carteActuelle, setCarteActuelle] = useState<Carte | null>(null);
  const [nbParticipants, setNbParticipants] = useState(1);
  const canalRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    return () => { if (canalRef.current) getSb().removeChannel(canalRef.current); };
  }, []);

  const chargerCartes = async (jeuId: string) => {
    const r = await fetch(`${SB_URL}/rest/v1/bsh_jeux_cartes?jeu_id=eq.${jeuId}&statut=eq.active&select=id,emoji,nom,question`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: "no-store",
    });
    return r.ok ? await r.json() : [];
  };

  const sAbonner = (salonId: string) => {
    const canal = getSb().channel(`salon-${salonId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bsh_salons", filter: `id=eq.${salonId}` },
        (payload) => { setSalon(payload.new as Salon); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bsh_salon_participants", filter: `salon_id=eq.${salonId}` },
        () => { setNbParticipants((n) => n + 1); })
      .subscribe();
    canalRef.current = canal;
  };

  const rejoindreSalon = async (s: Salon) => {
    setSalon(s);
    const cartes = await chargerCartes(s.jeu_id);
    setCartesDuJeu(cartes);
    if (s.carte_actuelle_id) {
      setCarteActuelle(cartes.find((c: Carte) => c.id === s.carte_actuelle_id) || null);
    }
    await fetch(`${SB_URL}/rest/v1/bsh_salon_participants`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ salon_id: s.id, pseudo: pseudo.trim() || "Invité·e" }),
    }).catch(() => {});
    const rCount = await fetch(`${SB_URL}/rest/v1/bsh_salon_participants?salon_id=eq.${s.id}&select=id`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (rCount.ok) setNbParticipants((await rCount.json()).length);
    sAbonner(s.id);
    setVue("salon");
  };

  const creerSalon = async () => {
    if (!jeuChoisi) { setErreur("Choisissez un jeu."); return; }
    setErreur(""); setChargement(true);
    try {
      const code = genererCode();
      const r = await fetch(`${SB_URL}/rest/v1/bsh_salons`, {
        method: "POST",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ code, jeu_id: jeuChoisi, pseudo_hote: pseudo.trim() || null }),
      });
      if (!r.ok) { setErreur("Impossible de créer le salon — réessayez."); setChargement(false); return; }
      const data = await r.json();
      await rejoindreSalon(data[0]);
    } catch {
      setErreur("Erreur réseau.");
    }
    setChargement(false);
  };

  const rejoindreParCode = async () => {
    const code = codeSaisi.trim().toUpperCase();
    if (code.length < 4) { setErreur("Entrez le code du salon."); return; }
    setErreur(""); setChargement(true);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/bsh_salons?code=eq.${encodeURIComponent(code)}&limit=1`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      });
      const data = r.ok ? await r.json() : [];
      if (!data[0]) { setErreur("Aucun salon avec ce code."); setChargement(false); return; }
      await rejoindreSalon(data[0]);
    } catch {
      setErreur("Erreur réseau.");
    }
    setChargement(false);
  };

  const tirerCarte = async () => {
    if (!salon || cartesDuJeu.length === 0) return;
    const c = cartesDuJeu[Math.floor(Math.random() * cartesDuJeu.length)];
    setCarteActuelle(c); // affichage immédiat local, synchronisé pour les autres via Realtime
    await fetch(`${SB_URL}/rest/v1/bsh_salons?id=eq.${salon.id}`, {
      method: "PATCH",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ carte_actuelle_id: c.id, updated_at: new Date().toISOString() }),
    }).catch(() => {});
  };

  // Quand le salon change via Realtime (un autre participant a tiré une
  // carte), on met à jour la carte affichée à partir des cartes déjà en
  // mémoire — pas besoin de refaire une requête à chaque tirage.
  useEffect(() => {
    if (salon?.carte_actuelle_id) {
      setCarteActuelle(cartesDuJeu.find((c) => c.id === salon.carte_actuelle_id) || null);
    }
  }, [salon?.carte_actuelle_id, cartesDuJeu]);

  const lienPartage = salon ? `${typeof window !== "undefined" ? window.location.origin : ""}/bsh/secret-salons?code=${salon.code}` : "";

  if (vue === "salon" && salon) {
    const jeu = jeux.find((j) => j.id === salon.jeu_id);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, color: C.cream, fontFamily: BODY, fontWeight: 300, maxWidth: 560, margin: "0 auto" }}>
        <div style={{ background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 45%, ${C.night} 100%)`, padding: "32px 22px 26px" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            Salon en direct · {jeu?.nom || ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: C.goldL, letterSpacing: 4 }}>{salon.code}</div>
            <span style={{ fontSize: 11, color: C.muted }}>👥 {nbParticipants} participant{nbParticipants > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div style={{ background: C.plumD, padding: "28px 22px 36px", minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {!carteActuelle && (
            <button onClick={tirerCarte} style={{
              width: 200, height: 260, borderRadius: 14, border: `1px solid ${C.borderM}`,
              background: `linear-gradient(160deg, ${C.plum}, ${C.night})`, color: C.goldL,
              fontFamily: DISPLAY, fontSize: 16, cursor: "pointer", display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <span style={{ fontSize: 36 }}>✦</span>
              Tirer la première carte
            </button>
          )}
          {carteActuelle && (
            <div style={{
              width: 220, borderRadius: 14, border: `1px solid ${C.gold}`,
              background: `linear-gradient(160deg, ${C.plum}, ${C.night})`,
              padding: "28px 20px", textAlign: "center", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 40 }}>{carteActuelle.emoji}</span>
              <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.goldL, letterSpacing: 2 }}>{carteActuelle.nom}</div>
              <p style={{ fontSize: 13, color: C.cream, lineHeight: 1.6, margin: "6px 0 0" }}>{carteActuelle.question}</p>
            </div>
          )}
          {carteActuelle && (
            <button onClick={tirerCarte} style={{ fontSize: 11, color: C.goldL, background: "none", border: `1px solid ${C.borderM}`, borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: BODY }}>
              ↻ Carte suivante (pour tout le salon)
            </button>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Rejoins mon salon BSH Secret Games avec le code ${salon.code} → ${lienPartage}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#25d366", border: "1px solid rgba(37,211,102,0.4)", borderRadius: 20, padding: "7px 14px", textDecoration: "none" }}>
              💬 Inviter des ami·e·s
            </a>
          </div>
          <p style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", textAlign: "center", margin: "10px 0 0", maxWidth: 320 }}>
            Partagez le code <strong>{salon.code}</strong> — n&apos;importe qui dans le salon peut tirer la carte suivante, pour tout le monde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, color: C.cream, fontFamily: BODY, fontWeight: 300, maxWidth: 560, margin: "0 auto" }}>
      <div style={{ background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 45%, ${C.night} 100%)`, padding: "36px 22px 32px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
          Jouer à plusieurs
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 24, lineHeight: 1.25, margin: "0 0 12px", color: C.cream }}>
          BSH Secret Salons
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.75, color: C.muted, margin: 0, maxWidth: 340 }}>
          Créez un salon, partagez le code — tout le monde voit la même carte, en direct.
        </p>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.night }}>
        {[{ id: "creer" as const, l: "✦ Créer un salon" }, { id: "rejoindre" as const, l: "🔑 Rejoindre" }].map((t) => (
          <button key={t.id} onClick={() => { setSousVue(t.id); setErreur(""); }}
            style={{ flex: 1, padding: "12px 10px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: BODY, color: sousVue === t.id ? C.goldL : C.muted,
              borderBottom: sousVue === t.id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ background: C.plumD, padding: "28px 22px 36px", minHeight: 280 }}>
        {diagnostic && jeux.length === 0 && (
          <p style={{ fontSize: 10, color: "#e07070", fontFamily: "monospace", textAlign: "center" }}>{diagnostic}</p>
        )}
        <input placeholder="Votre pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} style={{ ...inp, marginBottom: 10 }} />

        {sousVue === "creer" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select value={jeuChoisi} onChange={(e) => setJeuChoisi(e.target.value)} style={{ ...inp, background: "#1a1020" }}>
              {jeux.map((j) => <option key={j.id} value={j.id}>{j.icone} {j.nom}</option>)}
            </select>
            {erreur && <p style={{ fontSize: 11, color: "#f87171", margin: 0 }}>{erreur}</p>}
            <button onClick={creerSalon} disabled={chargement || jeux.length === 0}
              style={{ background: C.gold, border: "none", borderRadius: 2, padding: "11px 22px", color: C.night, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer", fontFamily: BODY, opacity: chargement || jeux.length === 0 ? 0.6 : 1 }}>
              {chargement ? "Création…" : "Créer le salon"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Code du salon (ex. AB12CD)" value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())} style={inp} />
            {erreur && <p style={{ fontSize: 11, color: "#f87171", margin: 0 }}>{erreur}</p>}
            <button onClick={rejoindreParCode} disabled={chargement}
              style={{ background: C.gold, border: "none", borderRadius: 2, padding: "11px 22px", color: C.night, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer", fontFamily: BODY, opacity: chargement ? 0.6 : 1 }}>
              {chargement ? "Connexion…" : "Rejoindre"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
