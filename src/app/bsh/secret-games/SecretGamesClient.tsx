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
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_BODY as BODY } from "../bshTokens";
import { MARQUES } from "@/design/marques";

// Identité premium Bella'Secret Home (mêmes jetons que la boutique premium)
const M = MARQUES.BSH;
import { useBshEspace, espaceFetch } from "../espace/useBshEspace";
import { bshWaLink } from "../bshWa";
import type { CarteBSH } from "./getCartes";
import type { JeuBSH } from "./getJeux";

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
const INTENSITES = [
  { v: "douceur", ico: "🌹", l: "Douceur" },
  { v: "mystere", ico: "🖤", l: "Mystère" },
  { v: "audace", ico: "🔥", l: "Audace" },
  { v: "piment", ico: "🌶️", l: "Piment" },
  { v: "surprise", ico: "🎲", l: "Surprise" },
] as const;

// Typographie française : espace insécable avant ? ! : ; (évite un « ? » seul en fin de ligne sur iPhone)
const fr = (t: string) => String(t || "").replace(/\s+([?!:;»])/g, "\u00a0$1").replace(/«\s+/g, "«\u00a0");

// Retour : vers l'application si le jeu y a été ouvert, sinon page précédente, sinon accueil BSH.
function retour() {
  try {
    const depuisApp = new URLSearchParams(window.location.search).get("depuis") === "app";
    if (depuisApp) { window.location.href = "/"; return; }
    const memeSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (memeSite && window.history.length > 1) { window.history.back(); return; }
  } catch { /* navigation par défaut ci-dessous */ }
  window.location.href = "/bsh";
}

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px",
  color: C.cream, fontSize: 13, fontFamily: BODY, outline: "none",
};

export default function SecretGamesClient({
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
  const zoneCarte = useRef<HTMLDivElement | null>(null);
  // Bouton « Retour » flottant dès que celui de l'en-tête n'est plus visible (iPhone).
  const [retourFlottant, setRetourFlottant] = useState(false);
  useEffect(() => {
    const maj = () => setRetourFlottant(window.scrollY > 140);
    maj(); window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);
  const [tab, setTab] = useState<"jouer" | "theme">("jouer");
  const [jeuActif, setJeuActif] = useState<JeuBSH | null>(jeuInitial);
  const [cartes, setCartes] = useState<CarteBSH[]>(cartesInitiales);
  const [chargementCartes, setChargementCartes] = useState(false);
  const [carte, setCarte] = useState<CarteBSH | null>(null);
  const [tirageEnregistre, setTirageEnregistre] = useState(false);
  // migration 0047 : pour les jeux à choix (ex. Action ou Vérité), la
  // catégorie actuellement choisie — sert à "retirer dans la même
  // catégorie" et à surligner le bouton choisi.
  const [categorieActive, setCategorieActive] = useState<string | null>(null);
  const [form, setForm] = useState({ pseudo: "", titre: "", espace: "secret_games", type_jeu: "cartes_defis", description: "" });
  const [envoi, setEnvoi] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");
  // Phase 2 : filtre d'intensité — null = "Tous". Ne filtre que la
  // liste des jeux proposés (un jeu = une intensité pour l'instant) ;
  // bsh_jeux_cartes.intensite existe déjà (migration 0044) pour le
  // jour où un même jeu mélangera plusieurs niveaux.
  const [intensiteFiltre, setIntensiteFiltre] = useState<string | null>(null);
  const jeuxFiltres = intensiteFiltre ? jeux.filter((j) => j.intensite === intensiteFiltre) : jeux;

  // ── Vraies parties multijoueurs (migration 0082) — tour par tour
  // pour cette première démo, compte Bellaïa OU pseudo acceptés.
  // Le participantId reçu au create/join vaut jeton de session léger,
  // conservé en localStorage pour survivre à un rafraîchissement de
  // page (pas d'authentification complète côté partie).
  const [partie, setPartie] = useState<{ code: string; participantId: string; jeuId: string } | null>(null);
  const [partieEtat, setPartieEtat] = useState<any>(null);
  const [partiePanel, setPartiePanel] = useState<"off" | "menu" | "rejoindre">("off");
  const [partiePseudo, setPartiePseudo] = useState("");
  const [partieCodeSaisi, setPartieCodeSaisi] = useState("");
  const [partieErreur, setPartieErreur] = useState("");
  const [partieCharge, setPartieCharge] = useState(false);

  useEffect(() => {
    try {
      const brut = localStorage.getItem("bsh_partie_active");
      if (brut) setPartie(JSON.parse(brut));
    } catch {}
  }, []);

  // Robustesse : coupure réseau signalée (sans perdre la partie), resynchronisation
  // immédiate au retour du réseau, sortie propre si la partie n'existe plus.
  const [horsLigne, setHorsLigne] = useState(false);
  const rafraichirPartie = useCallback(async (p: { code: string; participantId: string } | null) => {
    if (!p) return;
    try {
      const res = await fetch(`/api/bsh/parties/etat?code=${encodeURIComponent(p.code)}&participantId=${encodeURIComponent(p.participantId)}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      setHorsLigne(false);
      if (res.ok) setPartieEtat(d);
      else if (res.status === 404 || res.status === 403) {
        setPartie(null); setPartieEtat(null);
        try { localStorage.removeItem("bsh_partie_active"); } catch {}
        setPartieErreur(res.status === 404 ? "Cette partie n'existe plus ou a été fermée." : "Vous ne faites plus partie de cette partie.");
      }
    } catch { setHorsLigne(true); }
  }, []);

  useEffect(() => {
    if (!partie) return;
    const retour = () => rafraichirPartie(partie);
    window.addEventListener("online", retour); document.addEventListener("visibilitychange", retour);
    return () => { window.removeEventListener("online", retour); document.removeEventListener("visibilitychange", retour); };
  }, [partie?.code, partie?.participantId, rafraichirPartie]);

  useEffect(() => {
    if (!partie) return;
    rafraichirPartie(partie);
    const id = setInterval(() => rafraichirPartie(partie), 6000);
    return () => clearInterval(id);
  }, [partie?.code, partie?.participantId, rafraichirPartie]);

  const identiteJoueuse = () => (etat.statut === "connectee" ? { clientId: etat.profil.id } : { pseudo: partiePseudo.trim() });

  const creerPartie = async () => {
    if (!jeuActif) return;
    const id = identiteJoueuse();
    if (!("clientId" in id) && !id.pseudo) { setPartieErreur("Choisissez un pseudo pour jouer."); return; }
    setPartieErreur(""); setPartieCharge(true);
    try {
      const res = await fetch("/api/bsh/parties/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jeuId: jeuActif.id, ...id }),
      });
      const d = await res.json();
      if (!res.ok) { setPartieErreur(d.error || "Erreur."); setPartieCharge(false); return; }
      const p = { code: d.code, participantId: d.participantId, jeuId: jeuActif.id };
      setPartie(p);
      localStorage.setItem("bsh_partie_active", JSON.stringify(p));
      setPartiePanel("off");
    } catch (e: any) { setPartieErreur(e?.message || "Erreur réseau."); }
    setPartieCharge(false);
  };

  const rejoindrePartie = async () => {
    if (!partieCodeSaisi.trim()) return;
    const id = identiteJoueuse();
    if (!("clientId" in id) && !id.pseudo) { setPartieErreur("Choisissez un pseudo pour jouer."); return; }
    setPartieErreur(""); setPartieCharge(true);
    try {
      const res = await fetch("/api/bsh/parties/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partieCodeSaisi.trim(), ...id }),
      });
      const d = await res.json();
      if (!res.ok) { setPartieErreur(d.error || "Erreur."); setPartieCharge(false); return; }
      const p = { code: d.code, participantId: d.participantId, jeuId: d.jeuId };
      setPartie(p);
      localStorage.setItem("bsh_partie_active", JSON.stringify(p));
      setPartiePanel("off");
      const j = jeux.find((x) => x.id === d.jeuId);
      if (j) await choisirJeu(j);
    } catch (e: any) { setPartieErreur(e?.message || "Erreur réseau."); }
    setPartieCharge(false);
  };

  const quitterPartie = () => {
    const p = partie;
    setPartie(null); setPartieEtat(null); setPartieErreur("");
    localStorage.removeItem("bsh_partie_active");
    // Libère sa place côté serveur (les autres ne vous voient plus) ; sans effet bloquant si le réseau est coupé.
    if (p) fetch("/api/bsh/parties/quitter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: p.code, participantId: p.participantId }), keepalive: true }).catch(() => {});
  };

  const tirerPartie = async (cat?: string) => {
    if (!partie) return;
    setPartieErreur("");
    try {
      const res = await fetch("/api/bsh/parties/tirer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: partie.code, participantId: partie.participantId, categorie: cat }),
      });
      const d = await res.json();
      if (!res.ok) { setPartieErreur(d.error || "Erreur."); return; }
      await rafraichirPartie(partie);
    } catch (e: any) { setPartieErreur(e?.message || "Erreur réseau."); }
  };

  const chargerCartes = async (j: JeuBSH) => {
    setCarte(null);
    setCategorieActive(null);
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

  const choisirJeu = async (j: JeuBSH) => {
    if (j.id === jeuActif?.id) return;
    setJeuActif(j);
    await chargerCartes(j);
  };

  const choisirIntensite = async (v: string | null) => {
    setIntensiteFiltre(v);
    const liste = v ? jeux.filter((j) => j.intensite === v) : jeux;
    if (jeuActif && liste.some((j) => j.id === jeuActif.id)) return;
    const premier = liste[0] ?? null;
    setJeuActif(premier);
    if (premier) await chargerCartes(premier);
    else { setCartes([]); setCarte(null); }
  };

  const enregistrerTirage = async (c: CarteBSH) => {
    setCarte(c);
    // Sur iPhone, la carte tirée apparaît sous les sélecteurs : on l'amène au centre de l'écran.
    setTimeout(() => zoneCarte.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    setTirageEnregistre(false);
    if (etat.statut === "connectee") {
      const res = await espaceFetch(etat.token, "bsh_jeux_tirages", {
        method: "POST",
        body: JSON.stringify({ client_id: etat.profil.id, carte_id: c.id }),
      });
      if (res.ok) setTirageEnregistre(true);
    }
  };

  const tirer = async () => {
    if (cartes.length === 0) return;
    await enregistrerTirage(cartes[Math.floor(Math.random() * cartes.length)]);
  };

  // migration 0047 : tirage au sein d'une catégorie choisie par la
  // joueuse (ex. "Action" ou "Vérité") plutôt qu'au hasard dans tout
  // le jeu — nécessaire pour les jeux listés dans choix_categories.
  const tirerCategorie = async (cat: string) => {
    const pool = cartes.filter((c) => c.nom === cat);
    if (pool.length === 0) return;
    setCategorieActive(cat);
    await enregistrerTirage(pool[Math.floor(Math.random() * pool.length)]);
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

  const enJeu = tab === "jouer" && (!!carte || !!partie);
  const nbJoueurs = (partieEtat?.participants || []).length;

  // ── Pièces de présentation (identité premium Bella'Secret Home, mêmes jetons que la boutique) ──
  const pastille = (actif: boolean, rose = false): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, flex: "none", minHeight: 38, padding: "8px 15px", borderRadius: 999,
    border: `1px solid ${actif ? (rose ? M.secondaire : M.accent) : M.ligne}`,
    background: actif ? (rose ? M.secondaire : M.accent) : "rgba(255,255,255,0.04)",
    color: actif ? M.accentTexte : M.texte, fontFamily: M.sans, fontSize: 13, fontWeight: actif ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
  });
  const boutonRose: React.CSSProperties = { minHeight: 46, padding: "12px 22px", borderRadius: 999, border: "none", background: M.secondaire, color: M.accentTexte, fontFamily: M.sans, fontWeight: 800, fontSize: 14, cursor: "pointer" };
  const boutonFin: React.CSSProperties = { minHeight: 42, padding: "10px 16px", borderRadius: 999, border: `1px solid ${M.ligne}`, background: "rgba(255,255,255,0.04)", color: M.texte, fontFamily: M.sans, fontWeight: 600, fontSize: 13, cursor: "pointer" };
  const titreSection = (t: string) => <div style={{ fontFamily: M.serif, fontWeight: 700, fontSize: 21, color: M.texte, margin: "0 0 10px" }}>{t}</div>;
  const champ: React.CSSProperties = { ...inp, background: "rgba(255,255,255,0.05)", border: `1px solid ${M.ligne}`, borderRadius: 14, padding: "12px 14px", fontSize: 16, color: M.texte };

  const dosCarte = (libelle: string, onClick: () => void) => (
    <button onClick={onClick} className="sg-carte" style={{
      position: "relative", width: "100%", maxWidth: 270, aspectRatio: "5 / 7", borderRadius: 22, cursor: "pointer", padding: 0, overflow: "hidden",
      border: `1px solid ${M.accent}88`, boxShadow: "0 18px 40px rgba(0,0,0,0.55), inset 0 0 0 6px rgba(11,7,9,0.55)",
      background: `repeating-linear-gradient(45deg, rgba(198,161,91,0.07) 0 2px, transparent 2px 14px), ${M.degrade}`,
    }}>
      <span style={{ position: "absolute", inset: 14, borderRadius: 16, border: `1px solid ${M.accent}55` }} />
      <span style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <img src={M.logo} alt="" width={74} height={74} style={{ borderRadius: "50%", border: `1px solid ${M.accent}66`, objectFit: "cover" }} />
        <span style={{ fontFamily: M.serif, fontSize: 22, color: M.accent, letterSpacing: 1 }}>{libelle}</span>
        <span style={{ fontFamily: M.sans, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: M.doux }}>Toucher pour tirer</span>
      </span>
    </button>
  );
  const faceCarte = (c: CarteBSH, pied?: React.ReactNode) => (
    <div key={c.id} className="sg-face" style={{
      width: "100%", maxWidth: 330, boxSizing: "border-box", borderRadius: 22, padding: "30px 22px 26px", textAlign: "center",
      border: `1px solid ${M.accent}`, boxShadow: "0 22px 48px rgba(0,0,0,0.6)", background: `radial-gradient(90% 60% at 50% 0%, rgba(211,154,168,0.22), transparent 60%), linear-gradient(170deg, ${M.surface2}, ${M.fond})`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontSize: 46, lineHeight: 1 }}>{c.emoji}</span>
      <div style={{ fontFamily: M.serif, fontSize: 24, fontWeight: 700, color: M.accent, letterSpacing: 3 }}>{c.nom}</div>
      <div style={{ width: 46, height: 1, background: `${M.accent}88` }} />
      <p style={{ fontFamily: M.serif, fontSize: 21, lineHeight: 1.4, color: M.texte, margin: 0 }}>{fr(c.question)}</p>
      {pied}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", color: M.texte, fontFamily: M.sans, maxWidth: 560, margin: "0 auto", background: M.fond, minHeight: "100vh" }}>
      <style>{`
        @keyframes sgRetourne { from { transform: perspective(900px) rotateY(90deg); opacity: .2 } to { transform: perspective(900px) rotateY(0); opacity: 1 } }
        .sg-face { animation: sgRetourne .45s cubic-bezier(.2,.7,.2,1) both }
        .sg-carte { transition: transform .2s ease } .sg-carte:active { transform: scale(.98) }
        .sg-defile { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding: 2px 16px 6px; margin: 0 -16px }
        .sg-defile::-webkit-scrollbar { display: none }
        @media (prefers-reduced-motion: reduce) { .sg-face { animation: none } }
      `}</style>

      {retourFlottant && (
        <button onClick={retour} aria-label="Retour (flottant)"
          style={{ position: "fixed", left: 14, bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 60, display: "inline-flex", alignItems: "center", gap: 6,
            minHeight: 44, padding: "10px 16px 10px 12px", borderRadius: 22, border: `1px solid ${M.accent}88`, background: "rgba(11,7,9,0.92)",
            color: M.texte, fontSize: 13, fontFamily: M.sans, boxShadow: "0 6px 20px rgba(0,0,0,0.45)", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>←</span> Retour
        </button>
      )}

      {/* ── En-tête de marque (comme la boutique premium) ── */}
      <header style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${M.ligne}` }}>
        <button onClick={retour} aria-label="Retour" style={{ ...boutonFin, minHeight: 40, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>←</span> Retour
        </button>
        <img src={M.logo} alt="Bella'Secret Home" width={40} height={40} style={{ borderRadius: "50%", border: `1px solid ${M.ligne}`, objectFit: "cover", flex: "none" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: M.serif, fontWeight: 700, fontSize: 20, color: M.accent, lineHeight: 1.1 }}>Secret Games</div>
          <div style={{ fontSize: 12, color: M.doux, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Cartes · Défis · Confidences</div>
        </div>
      </header>

      {/* ── Bandeau (masqué pendant la partie pour laisser la place à la carte) ── */}
      {!enJeu && (
        <div style={{ padding: "16px 16px 4px" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 24, padding: "24px 20px", background: M.degrade, border: `1px solid ${M.ligne}`, boxShadow: M.ombre }}>
            <div aria-hidden style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(211,154,168,0.35), transparent 70%)" }} />
            <div style={{ position: "relative", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: M.secondaire, marginBottom: 8 }}>Le jeu du soir</div>
            <h1 style={{ position: "relative", fontFamily: M.serif, fontWeight: 700, fontSize: 30, lineHeight: 1.1, margin: "0 0 10px", color: M.texte }}>Une carte, une confidence.</h1>
            <p style={{ position: "relative", fontSize: 14, lineHeight: 1.55, color: M.doux, margin: 0, maxWidth: 300 }}>
              Des questions et des défis à partager à deux ou entre amies — avec élégance et discrétion.
            </p>
          </div>
        </div>
      )}

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 8, padding: "14px 16px 4px" }}>
        {[{ id: "jouer" as const, l: "Jouer" }, { id: "theme" as const, l: "Proposer un thème" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...pastille(tab === t.id), flex: 1, justifyContent: "center" }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding: "14px 16px 40px" }}>
        {tab === "jouer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {jeux.length > 1 && !enJeu && (
              <div>
                {titreSection("Choisir un jeu")}
                <div className="sg-defile" style={{ marginBottom: 10 }}>
                  <button onClick={() => choisirIntensite(null)} style={pastille(intensiteFiltre === null, true)}>Toutes les intensités</button>
                  {INTENSITES.filter((i) => jeux.some((j) => j.intensite === i.v)).map((i) => (
                    <button key={i.v} onClick={() => choisirIntensite(i.v)} style={pastille(intensiteFiltre === i.v, true)}><span>{i.ico}</span>{i.l}</button>
                  ))}
                </div>
                <div className="sg-defile">
                  {jeuxFiltres.length === 0 && <p style={{ fontSize: 13, color: M.doux, fontStyle: "italic", margin: 0 }}>Aucun jeu à cette intensité pour l'instant.</p>}
                  {jeuxFiltres.map((j) => {
                    const actif = j.id === jeuActif?.id; const int = INTENSITES.find((i) => i.v === j.intensite);
                    return (
                      <button key={j.id} onClick={() => choisirJeu(j)} style={{
                        flex: "none", width: 168, minHeight: 150, textAlign: "left", padding: "16px 14px", borderRadius: 20, cursor: "pointer",
                        border: `1px solid ${actif ? M.accent : M.ligne}`, background: actif ? M.degrade : M.surface, color: M.texte,
                        boxShadow: actif ? "0 10px 26px rgba(0,0,0,0.5)" : "none", display: "flex", flexDirection: "column", gap: 8,
                      }}>
                        <span style={{ fontSize: 30, lineHeight: 1 }}>{j.icone}</span>
                        <span style={{ fontFamily: M.serif, fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>{j.nom}</span>
                        {int && <span style={{ marginTop: "auto", fontSize: 11, color: actif ? M.accent : M.doux }}>{int.ico} {int.l}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {jeuActif && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: M.serif, fontWeight: 700, fontSize: enJeu ? 22 : 18, color: M.texte }}>{jeuActif.icone} {jeuActif.nom}</div>
                  {jeuActif.description && !enJeu && <div style={{ fontSize: 13, color: M.doux, lineHeight: 1.5, marginTop: 4 }}>{jeuActif.description}</div>}
                </div>
                {enJeu && !partie && (
                  <button onClick={() => { setCarte(null); setCategorieActive(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ ...boutonFin, flex: "none" }}>Changer de jeu</button>
                )}
              </div>
            )}

            {/* ── Jouer à plusieurs ── */}
            {!partie ? (
              <div>
                {partiePanel === "off" && partieErreur && <p role="status" style={{ fontSize: 13, color: "#f5c27a", margin: "0 0 8px", textAlign: "center" }}>{partieErreur}</p>}
                {partiePanel === "off" && !carte && (
                  <button onClick={() => setPartiePanel("menu")} style={{ ...boutonFin, width: "100%", color: M.accent }}>👥 Jouer à plusieurs</button>
                )}
                {partiePanel !== "off" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: M.surface, border: `1px solid ${M.ligne}`, borderRadius: 20, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontFamily: M.serif, fontWeight: 700, fontSize: 18 }}>Partie à plusieurs</div>
                      <button onClick={() => { setPartiePanel("off"); setPartieErreur(""); }} aria-label="Fermer" style={{ ...boutonFin, minHeight: 34, padding: "4px 12px" }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[{ id: "menu" as const, l: "Créer" }, { id: "rejoindre" as const, l: "Rejoindre" }].map((o) => (
                        <button key={o.id} onClick={() => setPartiePanel(o.id)} style={{ ...pastille(partiePanel === o.id), flex: 1, justifyContent: "center" }}>{o.l}</button>
                      ))}
                    </div>
                    {etat.statut !== "connectee" && (
                      <input placeholder="Votre pseudo" value={partiePseudo} onChange={(e) => setPartiePseudo(e.target.value)} style={champ} maxLength={30} />
                    )}
                    {partiePanel === "rejoindre" && (
                      <input placeholder="Code de la partie (ex. AB3K9P)" value={partieCodeSaisi}
                        onChange={(e) => setPartieCodeSaisi(e.target.value.toUpperCase())} style={{ ...champ, textTransform: "uppercase", letterSpacing: 3 }} maxLength={8} />
                    )}
                    {partieErreur && <p style={{ fontSize: 13, color: "#f19a9a", margin: 0 }}>{partieErreur}</p>}
                    <button onClick={partiePanel === "menu" ? creerPartie : rejoindrePartie} disabled={partieCharge}
                      style={{ ...boutonRose, cursor: partieCharge ? "wait" : "pointer", opacity: partieCharge ? 0.6 : 1 }}>
                      {partieCharge ? "…" : partiePanel === "menu" ? "Créer la partie" : "Rejoindre la partie"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", background: M.surface, border: `1px solid ${M.accent}55`, borderRadius: 22, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: M.doux }}>Code de la partie</div>
                    <div style={{ fontFamily: M.serif, fontWeight: 700, fontSize: 26, color: M.accent, letterSpacing: 4 }}>{partie.code}</div>
                    <div style={{ fontSize: 12, color: M.doux }}>{nbJoueurs} participant{nbJoueurs > 1 ? "s" : ""} · tour {partieEtat?.partie?.tourActuel || 0}</div>
                  </div>
                  <button onClick={quitterPartie} style={boutonFin}>Quitter</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, width: "100%" }}>
                  {(partieEtat?.participants || []).map((p: any) => (
                    <span key={p.id} style={{ fontSize: 12, color: p.estMoi ? M.accentTexte : M.texte, background: p.estMoi ? M.accent : "rgba(255,255,255,0.07)", borderRadius: 999, padding: "5px 11px" }}>
                      {p.estMoi ? "Vous" : p.nom}
                    </span>
                  ))}
                </div>
                {horsLigne && <p role="status" style={{ fontSize: 13, color: "#f5c27a", margin: 0, textAlign: "center" }}>Connexion interrompue — la partie est conservée, reconnexion automatique…</p>}
                <a href={bshWaLink(`Rejoins ma partie BSH Secret Games avec le code ${partie.code} !`)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "#25d366", textDecoration: "none" }}>💬 Inviter par WhatsApp</a>
                {partieErreur && <p style={{ fontSize: 13, color: "#f19a9a", margin: 0, textAlign: "center" }}>{partieErreur}</p>}
                {partieEtat?.dernierTirage?.carte ? (
                  faceCarte(partieEtat.dernierTirage.carte,
                    <p style={{ fontSize: 12, color: M.doux, margin: "4px 0 0", fontStyle: "italic" }}>{partieEtat.dernierTirage.parMoi ? "Tirée par vous" : "Tirée par un·e autre participant·e"} · tour {partieEtat.dernierTirage.tour}</p>
                  )
                ) : (
                  <p style={{ fontSize: 13, color: M.doux, fontStyle: "italic", textAlign: "center", margin: 0 }}>Aucune carte tirée pour l'instant.</p>
                )}
                {jeuActif?.choix_categories?.length ? (
                  <div style={{ display: "flex", gap: 10, width: "100%" }}>
                    {jeuActif.choix_categories.map((cat) => (
                      <button key={cat} onClick={() => tirerPartie(cat)} style={{ ...boutonFin, flex: 1, minHeight: 56, fontFamily: M.serif, fontSize: 18, color: M.accent }}>{cat}</button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => tirerPartie()} style={{ ...boutonRose, width: "100%" }}>Tirer la carte suivante</button>
                )}
              </div>
            )}

            {!partie && diagnostic && cartes.length === 0 && (
              <p style={{ fontSize: 12, color: "#f19a9a", textAlign: "center", margin: 0 }}>{diagnostic}</p>
            )}
            {!partie && chargementCartes && <p style={{ fontSize: 13, color: M.doux, fontStyle: "italic", textAlign: "center" }}>Préparation du jeu…</p>}
            {!partie && !chargementCartes && cartes.length === 0 && !diagnostic && (
              <p style={{ fontSize: 14, color: M.doux, fontStyle: "italic", textAlign: "center" }}>Le jeu se prépare — les premières cartes arrivent bientôt.</p>
            )}

            {/* ── Table de jeu ── */}
            {!partie && !chargementCartes && cartes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 4 }}>
                {jeuActif?.choix_categories?.length ? (
                  <>
                    {!carte && <p style={{ fontFamily: M.serif, fontSize: 19, color: M.doux, margin: 0, fontStyle: "italic" }}>Que choisissez-vous ?</p>}
                    <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 360 }}>
                      {jeuActif.choix_categories.map((cat) => (
                        <button key={cat} onClick={() => tirerCategorie(cat)} style={{
                          flex: 1, minHeight: carte ? 52 : 150, borderRadius: 20, cursor: "pointer", fontFamily: M.serif, fontWeight: 700, fontSize: carte ? 17 : 24, letterSpacing: 1,
                          border: `1px solid ${categorieActive === cat ? M.accent : M.ligne}`, color: M.accent,
                          background: categorieActive === cat ? M.degrade : `repeating-linear-gradient(45deg, rgba(198,161,91,0.06) 0 2px, transparent 2px 14px), ${M.surface}`,
                        }}>{cat}</button>
                      ))}
                    </div>
                  </>
                ) : (
                  !carte && dosCarte("Tirer une carte", tirer)
                )}
                {carte && (
                  <div ref={zoneCarte} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    {faceCarte(carte)}
                  </div>
                )}
                {carte && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    {!jeuActif?.choix_categories?.length && <button onClick={tirer} style={boutonRose}>Tirer une autre carte</button>}
                    <a href={bshWaLink(`${carte.emoji} ${carte.nom} — ${carte.question} (via BSH Secret Games)`)} target="_blank" rel="noopener noreferrer"
                      style={{ ...boutonFin, display: "inline-flex", alignItems: "center", textDecoration: "none", color: "#25d366" }}>💬 Partager</a>
                  </div>
                )}
                {carte && etat.statut !== "connectee" && (
                  <p style={{ fontSize: 12, color: M.doux, fontStyle: "italic", textAlign: "center", margin: 0 }}>Connectez-vous depuis votre espace BSH pour conserver l'historique de vos tirages.</p>
                )}
                {carte && tirageEnregistre && <p style={{ fontSize: 12, color: "#86efac", textAlign: "center", margin: 0 }}>✓ Ajouté à votre historique</p>}
              </div>
            )}
          </div>
        )}

        {tab === "theme" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, background: M.surface, border: `1px solid ${M.ligne}`, borderRadius: 22, padding: 18 }}>
            {titreSection("Proposer un thème")}
            <p style={{ fontSize: 14, color: M.doux, lineHeight: 1.6, margin: "-4px 0 4px" }}>
              Une idée de jeu, de défi ou de thème pour Le Cercle, la Lounge ou Secret Games ? La fondatrice relit chaque proposition avant toute publication.
            </p>
            <input placeholder="Votre pseudo (optionnel)" value={form.pseudo} onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))} style={champ} />
            <input placeholder="Titre de votre idée *" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} style={champ} />
            <select value={form.espace} onChange={(e) => setForm((f) => ({ ...f, espace: e.target.value }))} style={{ ...champ, background: M.surface2 }}>
              {ESPACES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={form.type_jeu} onChange={(e) => setForm((f) => ({ ...f, type_jeu: e.target.value }))} style={{ ...champ, background: M.surface2 }}>
              {TYPES_JEU.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <textarea placeholder="Décrivez votre idée" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} style={{ ...champ, resize: "vertical" }} />
            <button onClick={proposerTheme} disabled={envoi === "envoi" || !form.titre.trim()} style={{ ...boutonRose, opacity: !form.titre.trim() ? 0.55 : 1 }}>
              {envoi === "envoi" ? "Envoi…" : "Envoyer la proposition"}
            </button>
            {envoi === "ok" && <p style={{ fontSize: 13, color: "#86efac", margin: 0 }}>✓ Proposition envoyée — merci !</p>}
            {envoi === "erreur" && <p style={{ fontSize: 13, color: "#f19a9a", margin: 0 }}>Échec de l'envoi — réessayez dans un instant.</p>}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 22px 24px", textAlign: "center", borderTop: `1px solid ${M.ligne}` }}>
        <Link href="https://renee-lise.github.io/bsh-secret-games/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: M.doux, textDecoration: "none", opacity: 0.6 }}>
          Version précédente (démo) ↗
        </Link>
      </div>
    </div>
  );
}
