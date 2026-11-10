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
import { useState, useEffect, useCallback } from "react";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { useBshEspace, espaceFetch } from "../espace/useBshEspace";
import { bshWaLink } from "../bshWa";
import type { CarteBSH } from "../secret-games/getCartes";
import type { JeuBSH } from "../secret-games/getJeux";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px",
  color: C.cream, fontSize: 13, fontFamily: BODY, outline: "none",
};

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
  // migration 0047 : pour les jeux à choix (ex. Les Trois Portes du
  // Désir), la catégorie actuellement choisie.
  const [categorieActive, setCategorieActive] = useState<string | null>(null);

  const choisirJeu = async (j: JeuBSH) => {
    if (j.id === jeuActif?.id) return;
    setJeuActif(j);
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

  const enregistrerTirage = async (c: CarteBSH) => {
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

  const tirer = async () => {
    if (cartes.length === 0) return;
    await enregistrerTirage(cartes[Math.floor(Math.random() * cartes.length)]);
  };

  const tirerCategorie = async (cat: string) => {
    const pool = cartes.filter((c) => c.nom === cat);
    if (pool.length === 0) return;
    setCategorieActive(cat);
    await enregistrerTirage(pool[Math.floor(Math.random() * pool.length)]);
  };

  // ── Vraies parties multijoueurs (migration 0082) — même backend que
  // Secret Games (bsh_parties est commun aux deux, voir cette
  // migration), ici pour jouer à deux depuis deux téléphones au lieu
  // d'un seul passé de main en main.
  const [partie, setPartie] = useState<{ code: string; participantId: string; jeuId: string } | null>(null);
  const [partieEtat, setPartieEtat] = useState<any>(null);
  const [partiePanel, setPartiePanel] = useState<"off" | "menu" | "rejoindre">("off");
  const [partiePseudo, setPartiePseudo] = useState("");
  const [partieCodeSaisi, setPartieCodeSaisi] = useState("");
  const [partieErreur, setPartieErreur] = useState("");
  const [partieCharge, setPartieCharge] = useState(false);

  useEffect(() => {
    try {
      const brut = localStorage.getItem("bsh_duo_partie_active");
      if (brut) setPartie(JSON.parse(brut));
    } catch {}
  }, []);

  const rafraichirPartie = useCallback(async (p: { code: string; participantId: string } | null) => {
    if (!p) return;
    try {
      const res = await fetch(`/api/bsh/parties/etat?code=${encodeURIComponent(p.code)}&participantId=${encodeURIComponent(p.participantId)}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok) setPartieEtat(d);
    } catch {}
  }, []);

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
      localStorage.setItem("bsh_duo_partie_active", JSON.stringify(p));
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
      localStorage.setItem("bsh_duo_partie_active", JSON.stringify(p));
      setPartiePanel("off");
      const j = jeux.find((x) => x.id === d.jeuId);
      if (j) await choisirJeu(j);
    } catch (e: any) { setPartieErreur(e?.message || "Erreur réseau."); }
    setPartieCharge(false);
  };

  const quitterPartie = () => {
    setPartie(null); setPartieEtat(null); setPartieErreur("");
    localStorage.removeItem("bsh_duo_partie_active");
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
          {/* ── Jouer à deux, depuis deux téléphones ── */}
          {!partie ? (
            <div style={{ width: "100%", maxWidth: 340 }}>
              {partiePanel === "off" && (
                <button onClick={() => setPartiePanel("menu")} style={{
                  width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.borderM}`,
                  borderRadius: 20, padding: "9px 14px", color: C.goldL, fontSize: 12, fontFamily: BODY, cursor: "pointer",
                }}>
                  📱📱 Jouer à deux téléphones
                </button>
              )}
              {partiePanel !== "off" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ id: "menu" as const, l: "Créer" }, { id: "rejoindre" as const, l: "Rejoindre" }].map((o) => (
                      <button key={o.id} onClick={() => setPartiePanel(o.id)} style={{
                        flex: 1, padding: "6px", borderRadius: 8, fontSize: 11, fontFamily: BODY, cursor: "pointer",
                        background: partiePanel === o.id ? C.gold : "transparent", color: partiePanel === o.id ? C.night : C.muted,
                        border: `1px solid ${partiePanel === o.id ? C.gold : C.borderM}`,
                      }}>{o.l}</button>
                    ))}
                  </div>
                  {etat.statut !== "connectee" && (
                    <input placeholder="Votre pseudo" value={partiePseudo} onChange={(e) => setPartiePseudo(e.target.value)} style={inp} />
                  )}
                  {partiePanel === "rejoindre" && (
                    <input placeholder="Code reçu de votre partenaire" value={partieCodeSaisi}
                      onChange={(e) => setPartieCodeSaisi(e.target.value.toUpperCase())} style={{ ...inp, textTransform: "uppercase", letterSpacing: 2 }} />
                  )}
                  {partieErreur && <p style={{ fontSize: 10, color: "#f87171", margin: 0 }}>{partieErreur}</p>}
                  <button onClick={partiePanel === "menu" ? creerPartie : rejoindrePartie} disabled={partieCharge}
                    style={{ background: C.gold, border: "none", borderRadius: 8, padding: "9px", color: C.night, fontSize: 12, fontWeight: 600, fontFamily: BODY, cursor: partieCharge ? "wait" : "pointer", opacity: partieCharge ? 0.6 : 1 }}>
                    {partieCharge ? "…" : partiePanel === "menu" ? "Créer la partie" : "Rejoindre"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10, background: "rgba(201,168,76,0.08)", border: `1px solid ${C.gold}55`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.goldL }}>Partie {partie.code}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{(partieEtat?.participants || []).length} participant{(partieEtat?.participants || []).length > 1 ? "s" : ""} · tour {partieEtat?.partie?.tourActuel || 0}</div>
                </div>
                <button onClick={quitterPartie} style={{ fontSize: 10, color: C.muted, background: "none", border: `1px solid ${C.borderM}`, borderRadius: 20, padding: "5px 10px", cursor: "pointer", fontFamily: BODY }}>Quitter</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(partieEtat?.participants || []).map((p: any) => (
                  <span key={p.id} style={{ fontSize: 9, color: p.estMoi ? C.night : C.cream, background: p.estMoi ? C.gold : "rgba(255,255,255,0.08)", borderRadius: 20, padding: "3px 9px" }}>
                    {p.estMoi ? "Vous" : p.nom}
                  </span>
                ))}
              </div>
              <a href={bshWaLink(`Rejoins notre partie BSH Secret Duo avec le code ${partie.code} !`)} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: "#25d366", textAlign: "center", textDecoration: "none" }}>
                💬 Envoyer le code à mon/ma partenaire
              </a>
              {partieErreur && <p style={{ fontSize: 10, color: "#f87171", margin: 0, textAlign: "center" }}>{partieErreur}</p>}
              {partieEtat?.dernierTirage?.carte ? (
                <div style={{
                  borderRadius: 14, border: `1px solid ${C.gold}`,
                  background: `linear-gradient(160deg, ${C.plum}, ${C.night})`,
                  padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 34 }}>{partieEtat.dernierTirage.carte.emoji}</span>
                  <div style={{ fontFamily: DISPLAY, fontSize: 16, color: C.goldL, letterSpacing: 2 }}>{partieEtat.dernierTirage.carte.nom}</div>
                  <p style={{ fontSize: 12, color: C.cream, lineHeight: 1.6, margin: "4px 0 0" }}>{partieEtat.dernierTirage.carte.question}</p>
                  <p style={{ fontSize: 9, color: C.muted, margin: 0, fontStyle: "italic" }}>{partieEtat.dernierTirage.parMoi ? "Tirée par vous" : "Tirée par votre partenaire"} · tour {partieEtat.dernierTirage.tour}</p>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center", margin: 0 }}>Aucune carte tirée pour l'instant.</p>
              )}
              {jeuActif?.choix_categories?.length ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {jeuActif.choix_categories.map((cat) => (
                    <button key={cat} onClick={() => tirerPartie(cat)} style={{
                      flex: 1, minWidth: 110, padding: "12px", borderRadius: 10, border: `1px solid ${C.borderM}`,
                      background: "rgba(255,255,255,0.06)", color: C.goldL, fontFamily: DISPLAY, fontSize: 13, cursor: "pointer",
                    }}>{cat}</button>
                  ))}
                </div>
              ) : (
                <button onClick={() => tirerPartie()} style={{
                  background: C.gold, border: "none", borderRadius: 10, padding: "10px", color: C.night, fontSize: 12, fontWeight: 700, fontFamily: BODY, cursor: "pointer",
                }}>
                  🎲 Tirer la carte suivante
                </button>
              )}
            </div>
          )}

          {!partie && diagnostic && cartes.length === 0 && (
            <p style={{ fontSize: 10, color: "#e07070", fontFamily: "monospace", textAlign: "center", margin: 0 }}>
              {diagnostic}
            </p>
          )}
          {!partie && chargementCartes && (
            <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center" }}>Chargement du jeu…</p>
          )}
          {!partie && !chargementCartes && cartes.length === 0 && !diagnostic && (
            <p style={{ fontSize: 13, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
              BSH Secret Duo se prépare — les premiers jeux arrivent bientôt.
            </p>
          )}
          {!partie && !chargementCartes && cartes.length > 0 && jeuActif?.choix_categories?.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {!carte && (
                <p style={{ fontSize: 12, color: C.muted, margin: 0, fontStyle: "italic" }}>Choisissez :</p>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {jeuActif.choix_categories.map((cat) => (
                  <button key={cat} onClick={() => tirerCategorie(cat)} style={{
                    minWidth: 140, padding: "20px 18px", borderRadius: 12,
                    border: `1px solid ${categorieActive === cat ? C.gold : C.borderM}`,
                    background: categorieActive === cat ? `linear-gradient(160deg, ${C.plum}, ${C.night})` : "rgba(255,255,255,0.06)",
                    color: C.goldL, fontFamily: DISPLAY, fontSize: 15, letterSpacing: 1, cursor: "pointer",
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            !partie && !chargementCartes && cartes.length > 0 && !carte && (
              <button onClick={tirer} style={{
                width: 200, height: 260, borderRadius: 14, border: `1px solid ${C.borderM}`,
                background: `linear-gradient(160deg, ${C.plum}, ${C.night})`, color: C.goldL,
                fontFamily: DISPLAY, fontSize: 16, cursor: "pointer", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <span style={{ fontSize: 36 }}>✦</span>
                Tirer une carte
              </button>
            )
          )}
          {!partie && carte && (
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
          {!partie && carte && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a href={bshWaLink(`${carte.emoji} ${carte.nom} — ${carte.question} (via BSH Secret Duo)`)} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#25d366", border: "1px solid rgba(37,211,102,0.4)", borderRadius: 20, padding: "7px 14px", textDecoration: "none" }}>
                💬 Partager
              </a>
              {!jeuActif?.choix_categories?.length && (
                <button onClick={tirer} style={{ fontSize: 11, color: C.goldL, background: "none", border: `1px solid ${C.borderM}`, borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: BODY }}>
                  ↻ Tirer une autre carte
                </button>
              )}
            </div>
          )}
          {!partie && carte && etat.statut !== "connectee" && (
            <p style={{ fontSize: 10, color: C.muted, fontStyle: "italic", textAlign: "center", margin: 0 }}>
              Connectez-vous depuis votre espace BSH pour conserver l&apos;historique de vos tirages.
            </p>
          )}
          {!partie && carte && tirageEnregistre && (
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
