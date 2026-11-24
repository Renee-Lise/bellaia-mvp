"use client";
// ═══════════════════════════════════════════════════════════
// BSH Private Club — hub des huit univers et THE RED ROOM jouable.
//
// État actuel (honnête) : MODE LOCAL. La session tourne sur cet appareil avec le moteur
// narratif (src/modules/bshClub) ; elle est sauvegardée sur l'appareil et reprend après
// une fermeture ou une mise à jour. Le multijoueur en ligne (codes de salle, invitations,
// liste des participants autorisés, synchronisation des actes) repose sur la migration
// 0144, préparée mais NON appliquée : il n'est pas présenté comme disponible.
// Aucun texte n'est envoyé : l'annonce WhatsApp se copie, sans publication automatique.
// ═══════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import {
  appliquer, controlerReponse, depouiller, dupliquer, importerScenario, nouvelleSession, restaurer, sauvegarder, scores, secondesRestantes,
  type Action, type EtatSession, type Reponse, type Scenario,
} from "@/modules/bshClub/moteurNarratif";
import { DISTINCTIONS_RED_ROOM, PROGRAMME_PREMIERE_SESSION, RED_ROOM, REGLES_CLUB, UNIVERS_CLUB, programmeDate, texteAnnonce } from "@/modules/bshClub/redRoom";
import { memoriserEcran, ecranMemorise } from "@/lib/versionApp";

const CLE = "bsh-club-local";
const ROUGE = "#5a0f1c", BORDEAUX = "#3d0b1b", VIEUX_ROSE = "#c48b9f";
const carte: React.CSSProperties = { background: "linear-gradient(160deg, rgba(90,15,28,0.35), rgba(11,7,9,0.9))", border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
const bouton = (principal = false): React.CSSProperties => ({ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${principal ? C.gold : C.border}`, background: principal ? "rgba(198,161,91,0.18)" : "rgba(255,255,255,0.03)", color: principal ? C.goldL : C.cream, fontFamily: BODY, fontSize: 14, fontWeight: 600, cursor: "pointer" });
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.cream, fontSize: 16, fontFamily: BODY };
const fr = (t: string) => String(t || "").replace(/\s+([?!:;»])/g, " $1").replace(/«\s+/g, "« ");

type Onglet = "club" | "redroom" | "jouer" | "atelier";

function lireSauvegarde(s: Scenario): EtatSession | null {
  try { const t = localStorage.getItem(CLE); if (!t) return null; const r = restaurer(t, s); return r.ok ? r.etat : null; } catch { return null; }
}

export default function PrivateClubClient() {
  const [onglet, setOngletBrut] = useState<Onglet>("club");
  useEffect(() => { const m = ecranMemorise("onglet:bsh-club") as Onglet | null; if (m) setOngletBrut(m); }, []);
  const setOnglet = (o: Onglet) => { setOngletBrut(o); memoriserEcran("onglet:bsh-club", o); };

  return (
    <main style={{ minHeight: "100vh", background: `radial-gradient(ellipse at top, ${BORDEAUX}, ${C.night} 60%)`, color: C.cream, fontFamily: BODY, padding: "calc(16px + env(safe-area-inset-top,0px)) 16px 48px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase" }}>Bella’Secret Home · BSH Secret Games</div>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 500, margin: "6px 0 4px", color: C.goldL }}>BSH Private Club</h1>
        <p style={{ color: C.muted, margin: "0 0 12px", fontSize: 14 }}>{fr("Jeux narratifs immersifs, réservés aux adultes. Fictifs, suggestifs, jamais explicites : le consentement prime.")}</p>
        <div data-testid="statut-club" style={{ ...carte, padding: 12, fontSize: 12.5, lineHeight: 1.5, borderColor: "rgba(198,161,91,0.35)", marginBottom: 14 }}>
          <b style={{ color: C.goldL }}>État : mode local sur cet appareil.</b> {fr("Une session se joue ici, à tour de rôle sur un même téléphone, et reprend après une fermeture. Le multijoueur en ligne (codes de salle, invitations, synchronisation des actes) n’est pas encore activé : il attend une mise à jour de la base, soumise à votre autorisation.")}
        </div>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {([["club", "Les 8 univers"], ["redroom", "THE RED ROOM"], ["jouer", "Jouer"], ["atelier", "Atelier"]] as [Onglet, string][]).map(([o, l]) => (
            <button key={o} data-testid={`onglet-${o}`} onClick={() => setOnglet(o)} style={{ ...bouton(onglet === o), flex: "1 1 40%" }}>{l}</button>
          ))}
        </nav>
        {onglet === "club" && <Univers ouvrirRedRoom={() => setOnglet("redroom")} />}
        {onglet === "redroom" && <PresentationRedRoom jouer={() => setOnglet("jouer")} />}
        {onglet === "jouer" && <Partie />}
        {onglet === "atelier" && <Atelier />}
        <div style={{ marginTop: 28, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/bsh/secret-games" style={{ color: C.gold }}>← BSH Secret Games</Link>
          <Link href="/bsh/secret-world" style={{ color: C.gold }}>BSH Secret World (maquette)</Link>
        </div>
      </div>
    </main>
  );
}

function Univers({ ouvrirRedRoom }: { ouvrirRedRoom: () => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
      {UNIVERS_CLUB.map(u => (
        <div key={u.id} data-testid={`univers-${u.id}`} style={{ ...carte, background: `linear-gradient(150deg, ${u.couleurs[0]}, ${C.night})`, minHeight: 150, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, color: u.couleurs[1], letterSpacing: 1 }}>{u.nom}</div>
          <div style={{ fontSize: 13, color: C.cream, fontStyle: "italic" }}>{fr(u.accroche)}</div>
          <div style={{ fontSize: 12, color: C.muted, flex: 1 }}>{fr(u.ambiance)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Accès : {u.acces === "duo_prive" ? "duo privé" : u.acces === "membres_autorises" ? "membres autorisés" : "membres adultes"}</div>
          {u.statut === "jouable" && <button style={bouton(true)} onClick={ouvrirRedRoom}>Entrer</button>}
          {u.statut === "existant" && u.lienExistant && <Link href={u.lienExistant} style={{ ...bouton(true), textAlign: "center", textDecoration: "none" }}>Ouvrir Secret Duo</Link>}
          {u.statut === "en_preparation" && <div style={{ fontSize: 12, color: VIEUX_ROSE }}>Épisodes en préparation</div>}
        </div>
      ))}
    </div>
  );
}

function PresentationRedRoom({ jouer }: { jouer: () => void }) {
  const [date, setDate] = useState("");
  const [copie, setCopie] = useState("");
  const prog = useMemo(() => { try { return date ? programmeDate(date) : null; } catch { return null; } }, [date]);
  const passee = !!prog && prog.every(p => p.passee);
  const annonce = date ? texteAnnonce(new Date(`${date}T12:00:00-03:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Cayenne" }), (typeof window !== "undefined" ? window.location.origin : "") + "/bsh/private-club") : "";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={carte}>
        <div style={{ fontFamily: DISPLAY, fontSize: 28, color: C.goldL }}>THE RED ROOM</div>
        <div style={{ fontStyle: "italic", color: VIEUX_ROSE, marginBottom: 8 }}>Le club des tentations</div>
        <div style={{ fontSize: 13, color: C.muted }}>60 à 90 minutes · intensité {"🌶️".repeat(RED_ROOM.intensite)} (audace narrative, difficulté, répartie, ambiance) · 6 actes · 10 personnages · 7 distinctions</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>Maîtresse de cérémonie : le personnage officiel BSH (visuel affiché après validation de ses images de référence dans le Studio).</div>
        <ol style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
          {RED_ROOM.actes.filter(a => a.id !== "acte_6_refus").map(a => <li key={a.id}><b>{fr(a.titre)}</b> <span style={{ color: C.muted }}>— {a.decor}</span></li>)}
        </ol>
        <button data-testid="jouer-red-room" style={{ ...bouton(true), marginTop: 12, width: "100%" }} onClick={jouer}>Jouer THE RED ROOM</button>
      </div>
      <div style={carte}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Règles du club</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: C.muted }}>{REGLES_CLUB.map(r => <li key={r}>{fr(r)}</li>)}</ul>
      </div>
      <div style={carte}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Programme de la session (heure de Guyane)</div>
        <label style={{ fontSize: 12, color: C.muted }}>Date de la session<input data-testid="date-session" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...champ, marginTop: 4 }} /></label>
        <table style={{ width: "100%", fontSize: 13, marginTop: 10, borderCollapse: "collapse" }}><tbody>
          {(prog || PROGRAMME_PREMIERE_SESSION.map(p => ({ ...p, passee: false, debut: "" }))).map(p => (
            <tr key={p.heure} style={{ borderTop: `1px solid ${C.borderL}`, opacity: p.passee ? 0.55 : 1 }}>
              <td style={{ padding: "6px 4px", color: C.goldL, whiteSpace: "nowrap" }}>{p.heure.replace(":", " h ")}</td>
              <td style={{ padding: "6px 4px" }}>{p.etape}</td>
              <td style={{ padding: "6px 4px", fontSize: 11, color: C.muted }}>{p.passee ? "passée (historique)" : ""}</td>
            </tr>))}
        </tbody></table>
        {passee && <div data-testid="session-passee" style={{ fontSize: 12, color: VIEUX_ROSE, marginTop: 8 }}>{fr("Cette date est passée : elle reste en historique. Choisissez une nouvelle date pour reprogrammer. Aucune participation n’est inventée.")}</div>}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Horaires modifiables par la fondatrice ou l’hôte (programmation enregistrée en base après mise à jour).</div>
        {date && !passee && <>
          <pre data-testid="texte-annonce" style={{ whiteSpace: "pre-wrap", fontFamily: BODY, fontSize: 12.5, background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8, marginTop: 10 }}>{annonce}</pre>
          <button data-testid="copier-annonce" style={bouton()} onClick={async () => { try { await navigator.clipboard.writeText(annonce); setCopie("Texte copié. Collez-le vous-même dans WhatsApp : rien n’est envoyé automatiquement."); } catch { setCopie("Copie impossible sur cet appareil : sélectionnez le texte ci-dessus."); } }}>Copier l’annonce pour WhatsApp</button>
          {copie && <div style={{ fontSize: 12, marginTop: 6 }}>{copie}</div>}
        </>}
      </div>
    </div>
  );
}

// ── Partie en mode local ─────────────────────────────────────
const HOTE = "animation";

function Partie() {
  const S = RED_ROOM;
  const [etat, setEtat] = useState<EtatSession | null>(null);
  const [repris, setRepris] = useState(false);
  const [message, setMessage] = useState("");
  const [actif, setActif] = useState<string>("");
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => { const e = lireSauvegarde(S); if (e) { setEtat(e); setRepris(true); } }, [S]);
  useEffect(() => { const t = setInterval(() => setMaintenant(Date.now()), 1000); return () => clearInterval(t); }, []);

  const agir = (a: Action) => {
    if (!etat) return false;
    const r = appliquer(S, etat, a);
    if ("erreur" in r) { setMessage(r.erreur); return false; }
    setEtat(r.etat); setMessage("");
    try { localStorage.setItem(CLE, sauvegarder(r.etat)); } catch {}
    return true;
  };

  if (!etat) return <Preparation demarrer={(pseudos) => {
    let e = nouvelleSession(S);
    const ajouter = (id: string, pseudo: string, role: "hote" | "joueur") => { const r = appliquer(S, e, { type: "rejoindre", joueur: { id, pseudo, role } }); if (r.ok) e = r.etat; return r; };
    ajouter(HOTE, "Animation", "hote");
    for (const [i, p] of pseudos.entries()) { const r = ajouter(`j${i + 1}`, p, "joueur"); if ("erreur" in r) { setMessage(`${p} : ${r.erreur}`); return; } }
    const r = appliquer(S, e, { type: "lancer", par: HOTE });
    if ("erreur" in r) { setMessage(r.erreur); return; }
    setEtat(r.etat); setActif("j1"); try { localStorage.setItem(CLE, sauvegarder(r.etat)); } catch {}
  }} message={message} />;

  const joueurs = Object.values(etat.joueurs).filter(j => j.role === "joueur");
  const acte = S.actes.find(a => a.id === etat.acteCourant) || null;
  // Joueur au tour par défaut (après une reprise ou un changement d'acte) : le premier qui n'a pas encore répondu.
  if (acte && (!actif || !etat.joueurs[actif] || etat.joueurs[actif].exclu)) {
    const d = joueurs.find(j => !j.exclu && !etat.reponses[acte.id]?.[j.id]) || joueurs.find(j => !j.exclu);
    if (d && d.id !== actif) setTimeout(() => setActif(d.id), 0);
  }
  const reste = secondesRestantes(S, etat, new Date(maintenant));
  const recommencer = () => { if (confirm("Effacer cette partie de l’appareil et recommencer ?")) { try { localStorage.removeItem(CLE); } catch {} setEtat(null); setRepris(false); } };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {repris && <div data-testid="partie-reprise" style={{ ...carte, padding: 10, fontSize: 13 }}>Partie reprise là où elle s’était arrêtée (sauvegarde de cet appareil).</div>}
      {message && <div role="alert" data-testid="message-jeu" style={{ ...carte, padding: 10, fontSize: 13, borderColor: VIEUX_ROSE }}>{message}</div>}
      {etat.statut === "pause" && <div data-testid="pause" style={{ ...carte, padding: 10, textAlign: "center", color: C.goldL }}>Session en pause — le chronomètre est arrêté.</div>}

      {acte && etat.statut !== "votes" && etat.statut !== "terminee" && (
        <div data-testid="acte-courant" style={{ ...carte, background: `linear-gradient(160deg, ${ROUGE}, ${C.night})`, animation: "bshFondu .6s ease" }}>
          <style>{`@keyframes bshFondu{from{opacity:0;transform:translateY(6px)}to{opacity:1}}`}</style>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>Acte {acte.numero} · {acte.decor}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.goldL, margin: "4px 0 8px" }}>{fr(acte.titre)}</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{fr(acte.situation)}</div>
          {acte.replique && <blockquote data-testid="replique" style={{ margin: "10px 0", padding: "8px 12px", borderLeft: `3px solid ${C.gold}`, fontFamily: DISPLAY, fontSize: 20, fontStyle: "italic" }}>{fr(`« ${acte.replique} »`)}</blockquote>}
          {reste !== null && <div data-testid="chrono" style={{ fontSize: 13, color: reste < 30 ? VIEUX_ROSE : C.muted }}>Temps indicatif : {Math.floor(reste / 60)} min {String(reste % 60).padStart(2, "0")} s</div>}
          {(acte.indices || []).slice(0, etat.indicesEnvoyes[acte.id] || 0).map(i => <div key={i} data-testid="indice" style={{ fontSize: 13, color: C.goldL, marginTop: 6 }}>💡 {fr(i)}</div>)}
          {etat.evenementsTires.map(id => acte.evenements?.find(c => c.id === id)).filter(Boolean).map(c => <div key={c!.id} style={{ fontSize: 13, color: VIEUX_ROSE, marginTop: 6 }}>🃏 {c!.titre} — {fr(c!.texte)}</div>)}
        </div>
      )}

      {acte && etat.statut === "en_cours" && (
        <div style={carte}>
          <label style={{ fontSize: 12, color: C.muted }}>Au tour de
            <select data-testid="joueur-actif" value={actif} onChange={e => setActif(e.target.value)} style={{ ...champ, marginTop: 4 }}>
              {joueurs.filter(j => !j.exclu).map(j => <option key={j.id} value={j.id}>{j.pseudo}{etat.reponses[acte.id]?.[j.id] ? " ✓" : ""}</option>)}
            </select>
          </label>
          {actif && <Formulaire key={`${acte.id}-${actif}`} acte={acte} deja={etat.reponses[acte.id]?.[actif]} pris={Object.entries(etat.reponses[acte.id] || {}).filter(([k]) => k !== actif).map(([, v]) => v.personnage || "").filter(Boolean)}
            envoyer={(r) => { if (agir({ type: "repondre", par: actif, reponse: r })) { const suivant = joueurs.find(j => !j.exclu && j.id !== actif && !etat.reponses[acte.id]?.[j.id]); if (suivant) setActif(suivant.id); setMessage("Réponse enregistrée."); } }}
            passer={() => { if (agir({ type: "passer", par: actif })) setMessage("Épreuve passée, sans pénalité."); }} />}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{Object.keys(etat.reponses[acte.id] || {}).length}/{joueurs.filter(j => !j.exclu).length} réponse(s) pour cet acte.</div>
        </div>
      )}

      {(etat.statut === "votes" || etat.statut === "terminee") && <Votes S={S} etat={etat} agir={agir} />}

      {etat.statut !== "terminee" && <Console S={S} etat={etat} agir={agir} />}

      {etat.statut === "terminee" && (
        <div data-testid="session-terminee" style={carte}>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, color: C.goldL }}>Rideau.</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Fin : {etat.fin === "acte_6_refus" ? "« le balcon » (le refus du bal a été respecté)" : "« la grande salle »"}.</div>
          <CompteRendu S={S} etat={etat} />
        </div>
      )}
      <button style={bouton()} onClick={recommencer}>Recommencer une partie</button>
    </div>
  );
}

function Preparation({ demarrer, message }: { demarrer: (p: string[]) => void; message: string }) {
  const [pseudos, setPseudos] = useState<string[]>(["", ""]);
  const [regles, setRegles] = useState(false);
  return (
    <div style={carte}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Préparer la partie (un seul appareil)</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>{fr("Pseudonymes uniquement. Le téléphone passe de main en main ; l’animatrice ou l’hôte pilote la console en bas de page.")}</div>
      {pseudos.map((p, i) => (
        <input key={i} data-testid={`pseudo-${i + 1}`} aria-label={`Pseudonyme ${i + 1}`} placeholder={`Pseudonyme ${i + 1}`} value={p} maxLength={30}
          onChange={e => setPseudos(pseudos.map((x, k) => k === i ? e.target.value : x))} style={{ ...champ, marginBottom: 8 }} />
      ))}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button style={bouton()} data-testid="ajouter-joueur" onClick={() => pseudos.length < 12 && setPseudos([...pseudos, ""])}>+ Joueur</button>
        {pseudos.length > 2 && <button style={bouton()} onClick={() => setPseudos(pseudos.slice(0, -1))}>− Joueur</button>}
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 10 }}>
        <input data-testid="accepter-regles" type="checkbox" checked={regles} onChange={e => setRegles(e.target.checked)} style={{ width: 22, height: 22 }} />
        <span>{fr("Tous les participants sont majeurs et acceptent les règles du club : jeu fictif et non explicite, aucune confidence ni coordonnée demandée, chacun peut passer ou quitter.")}</span>
      </label>
      {message && <div role="alert" style={{ fontSize: 13, color: VIEUX_ROSE, marginBottom: 8 }}>{message}</div>}
      <button data-testid="lancer-partie" style={{ ...bouton(true), width: "100%" }} disabled={!regles || pseudos.filter(p => p.trim()).length < 2}
        onClick={() => demarrer(pseudos.map(p => p.trim()).filter(Boolean))}>Ouvrir les portes de la Red Room</button>
    </div>
  );
}

function Formulaire({ acte, deja, pris, envoyer, passer }: { acte: Scenario["actes"][number]; deja?: Reponse; pris: string[]; envoyer: (r: Omit<Reponse, "quand">) => void; passer: () => void }) {
  const ep = acte.epreuve;
  const [choix, setChoix] = useState(deja?.choix || deja?.personnage || "");
  const [pseudo, setPseudo] = useState(deja?.pseudo || "");
  const [texte, setTexte] = useState(deja?.texte || "");
  const r: Omit<Reponse, "quand"> = ep.type === "choix_personnage" ? { personnage: choix, pseudo, texte } : ep.type === "reponse_libre" ? { texte } : { choix, texte: texte || undefined };
  const erreurs = (texte || choix) ? controlerReponse(ep, r, pris) : [];
  const options = "options" in ep ? ep.options : [];
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13.5 }}>{fr("consigne" in ep ? ep.consigne : "Choisissez votre pseudonyme et votre personnage, puis présentez-le.")}</div>
      {ep.type === "choix_personnage" && <input data-testid="pseudo-acte" placeholder="Pseudonyme de jeu" value={pseudo} onChange={e => setPseudo(e.target.value)} maxLength={30} style={champ} />}
      {options.length > 0 && (
        <div role="radiogroup" style={{ display: "grid", gap: 6 }}>
          {options.map(o => (
            <button key={o.id} role="radio" aria-checked={choix === o.id} data-testid={`option-${o.id}`} disabled={ep.type === "choix_personnage" && pris.includes(o.id)}
              onClick={() => setChoix(o.id)} style={{ ...bouton(choix === o.id), textAlign: "left", opacity: ep.type === "choix_personnage" && pris.includes(o.id) ? 0.4 : 1 }}>{fr(o.libelle)}</button>
          ))}
        </div>
      )}
      <textarea data-testid="texte-reponse" rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder={ep.type === "choix_personnage" ? "Présentation originale du personnage" : ep.type === "decision" ? "Votre réplique (facultative)" : "Votre réponse"} style={{ ...champ, resize: "vertical" }} />
      {erreurs.length > 0 && <div data-testid="erreurs-reponse" style={{ fontSize: 12.5, color: VIEUX_ROSE }}>{erreurs.join(" ")}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button data-testid="envoyer-reponse" style={{ ...bouton(true), flex: 1 }} onClick={() => envoyer(r)}>Valider</button>
        <button data-testid="passer" style={bouton()} onClick={passer}>Passer</button>
      </div>
    </div>
  );
}

function Console({ S, etat, agir }: { S: Scenario; etat: EtatSession; agir: (a: Action) => boolean }) {
  const [exclu, setExclu] = useState(""); const [motif, setMotif] = useState("");
  const p = { par: HOTE };
  const joueurs = Object.values(etat.joueurs).filter(j => j.role === "joueur" && !j.exclu);
  return (
    <div data-testid="console" style={{ ...carte, borderColor: "rgba(198,161,91,0.4)" }}>
      <div style={{ fontWeight: 700, color: C.goldL, marginBottom: 8 }}>Console de l’animation</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {etat.statut === "en_cours" && <button data-testid="acte-suivant" style={bouton(true)} onClick={() => agir({ type: "acte_suivant", ...p })}>Acte suivant →</button>}
        {(etat.statut === "en_cours" || etat.statut === "votes") && <button data-testid="mettre-pause" style={bouton()} onClick={() => agir({ type: "pause", ...p })}>Pause</button>}
        {etat.statut === "pause" && <button data-testid="reprendre" style={bouton(true)} onClick={() => agir({ type: "reprendre", ...p })}>Reprendre</button>}
        {etat.statut === "en_cours" && <button data-testid="envoyer-indice" style={bouton()} onClick={() => agir({ type: "indice", ...p })}>Envoyer un indice</button>}
        {etat.statut === "en_cours" && S.actes.find(a => a.id === etat.acteCourant)?.evenements?.length ? <button style={bouton()} onClick={() => agir({ type: "evenement", ...p })}>Carte d’événement</button> : null}
        {etat.statut === "votes" && !etat.votesOuverts && <button data-testid="ouvrir-votes" style={bouton(true)} onClick={() => agir({ type: "ouvrir_votes", ...p })}>Ouvrir les votes</button>}
        {etat.votesOuverts && <button data-testid="fermer-votes" style={bouton(true)} onClick={() => agir({ type: "fermer_votes", ...p })}>Fermer les votes</button>}
        <button data-testid="terminer" style={bouton()} onClick={() => confirm("Terminer la session ?") && agir({ type: "terminer", ...p })}>Terminer</button>
      </div>
      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: 13, cursor: "pointer" }}>Modération</summary>
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <select aria-label="Participant à exclure" value={exclu} onChange={e => setExclu(e.target.value)} style={champ}><option value="">Participant…</option>{joueurs.map(j => <option key={j.id} value={j.id}>{j.pseudo}</option>)}</select>
          <input aria-label="Motif" placeholder="Motif (obligatoire)" value={motif} onChange={e => setMotif(e.target.value)} style={champ} />
          <button style={bouton()} onClick={() => exclu && agir({ type: "exclure", par: HOTE, joueur: exclu, motif }) && (setExclu(""), setMotif(""))}>Exclure pour non-respect des règles</button>
          {etat.acteCourant && Object.entries(etat.reponses[etat.acteCourant] || {}).filter(([, r]) => !r.masquee && r.texte).map(([jid, r]) => (
            <div key={jid} style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ flex: 1 }}><b>{etat.joueurs[jid]?.pseudo}</b> : {r.texte}</span>
              <button style={{ ...bouton(), minHeight: 36, padding: "4px 10px" }} onClick={() => agir({ type: "moderer", par: HOTE, joueur: jid, acte: etat.acteCourant! })}>Masquer</button>
            </div>))}
        </div>
      </details>
    </div>
  );
}

function Votes({ S, etat, agir }: { S: Scenario; etat: EtatSession; agir: (a: Action) => boolean }) {
  const joueurs = Object.values(etat.joueurs).filter(j => j.role === "joueur" && !j.exclu);
  const [votant, setVotant] = useState(joueurs[0]?.id || "");
  return (
    <div data-testid="votes" style={carte}>
      <div style={{ fontFamily: DISPLAY, fontSize: 24, color: C.goldL }}>Red Room Awards</div>
      {etat.votesOuverts ? <>
        <label style={{ fontSize: 12, color: C.muted }}>Votant (un vote par distinction, jamais pour soi)
          <select data-testid="votant" value={votant} onChange={e => setVotant(e.target.value)} style={{ ...champ, marginTop: 4 }}>{joueurs.map(j => <option key={j.id} value={j.id}>{j.pseudo}</option>)}</select>
        </label>
        {S.distinctions.map(d => (
          <div key={d.id} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 14 }}>{d.badge} {d.nom}{etat.votes[d.id]?.[votant] ? <span style={{ color: C.muted }}> · voté</span> : null}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {joueurs.filter(j => j.id !== votant).map(j => <button key={j.id} data-testid={`voter-${d.id}-${j.id}`} disabled={!!etat.votes[d.id]?.[votant]} style={{ ...bouton(), minHeight: 40 }} onClick={() => agir({ type: "voter", par: votant, distinction: d.id, cible: j.id })}>{j.pseudo}</button>)}
            </div>
          </div>))}
      </> : <div style={{ fontSize: 13, color: C.muted }}>{etat.statut === "terminee" ? "Votes clos." : "Les votes ne sont pas ouverts. L’animation les ouvre depuis la console."}</div>}
      {!etat.votesOuverts && Object.keys(etat.votes).length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {DISTINCTIONS_RED_ROOM.map(d => { const { voix, gagnants } = depouiller(etat, d.id); if (!Object.keys(voix).length) return null; return (
            <div key={d.id} data-testid={`resultat-${d.id}`} style={{ fontSize: 13.5 }}>
              {d.badge} <b>{d.nom}</b> : {gagnants.map(g => etat.joueurs[g]?.pseudo).join(" et ")} ({Math.max(...Object.values(voix))} voix{gagnants.length > 1 ? ", ex æquo" : ""})
              {etat.statut !== "terminee" && gagnants.map(g => (etat.titres[d.id] || []).includes(g) ? <span key={g} style={{ color: C.goldL }}> · titre remis</span> :
                <button key={g} data-testid={`attribuer-${d.id}`} style={{ ...bouton(true), minHeight: 34, padding: "2px 10px", marginLeft: 6 }} onClick={() => agir({ type: "attribuer_titre", par: HOTE, distinction: d.id, joueur: g })}>Remettre le titre</button>)}
            </div>); })}
        </div>
      )}
    </div>
  );
}

function CompteRendu({ S, etat }: { S: Scenario; etat: EtatSession }) {
  const sc = scores(S, etat);
  const titres = Object.entries(etat.titres).map(([d, ids]) => `${S.distinctions.find(x => x.id === d)?.nom} : ${ids.map(i => etat.joueurs[i]?.pseudo).join(", ")}`);
  const texte = [`Compte rendu — ${S.titre}`, `Participants : ${Object.values(etat.joueurs).filter(j => j.role === "joueur").length} (exclusions : ${Object.values(etat.joueurs).filter(j => j.exclu).length})`,
    `Parcours : ${etat.parcours.join(" → ")}`, "Titres :", ...(titres.length ? titres : ["aucun"]), "Classement :", ...sc.map((s, i) => `${i + 1}. ${s.pseudo} — ${s.points} pts`)].join("\n");
  const [copie, setCopie] = useState("");
  return <>
    <ol data-testid="classement" style={{ margin: "0 0 10px", paddingLeft: 20, fontSize: 14 }}>{sc.map(s => <li key={s.joueur}>{s.pseudo} — {s.points} pts</li>)}</ol>
    <pre data-testid="compte-rendu" style={{ whiteSpace: "pre-wrap", fontFamily: BODY, fontSize: 12, background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8 }}>{texte}</pre>
    <button style={bouton()} onClick={async () => { try { await navigator.clipboard.writeText(texte); setCopie("Compte rendu copié."); } catch { setCopie("Copie impossible : sélectionnez le texte."); } }}>Copier le compte rendu</button>
    {copie && <div style={{ fontSize: 12, marginTop: 6 }}>{copie}</div>}
  </>;
}

// ── Atelier : import, duplication, export (aperçu local) ─────
function Atelier() {
  const [texte, setTexte] = useState("");
  const [resultat, setResultat] = useState<ReturnType<typeof importerScenario> | null>(null);
  const exporter = (s: Scenario) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${s.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...carte, fontSize: 12.5, color: C.muted }}>{fr("Atelier de création sans code. Ici : import, contrôle, duplication et export, sur cet appareil. L’enregistrement des scénarios, leur relecture et leur publication (validation humaine obligatoire) passent par la base après la mise à jour soumise à votre autorisation. Assistant IA : non activé (aucune consommation tant que quotas et budget ne sont pas validés).")}</div>
      <div style={carte}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Importer un scénario (TXT, Markdown ou JSON)</div>
        <label style={{ ...bouton(), display: "inline-block", position: "relative", overflow: "hidden" }}>Choisir un fichier
          <input data-testid="importer-scenario" type="file" accept=".txt,.md,.markdown,.json,text/plain,text/markdown,application/json" style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 100, cursor: "pointer" }}
            onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const t = await f.text(); setTexte(t); setResultat(importerScenario(t, `import_${Date.now()}`)); e.target.value = ""; }} />
        </label>
        <textarea aria-label="Texte du scénario" rows={6} value={texte} onChange={e => setTexte(e.target.value)} placeholder={"# Titre\nUnivers : Wild Saloon · Intensité : 3 · Durée : 30-45 · Participants : 2-8\n## Acte I — Le comptoir\n> « Réplique »\nConsigne : …"} style={{ ...champ, marginTop: 8, fontSize: 13 }} />
        <button data-testid="controler-scenario" style={{ ...bouton(true), marginTop: 8 }} onClick={() => setResultat(importerScenario(texte, `import_${Date.now()}`))}>Contrôler</button>
        {resultat && (!("erreurs" in resultat) ? (
          <div data-testid="apercu-import" style={{ marginTop: 10, fontSize: 13 }}>
            ✓ <b>{resultat.scenario.titre || "(sans titre)"}</b> — {resultat.scenario.actes.length} acte(s), intensité {resultat.scenario.intensite}, statut : brouillon.
            {resultat.avertissements.map(a => <div key={a} style={{ color: VIEUX_ROSE }}>{a}</div>)}
            <ol style={{ paddingLeft: 18 }}>{resultat.scenario.actes.map(a => <li key={a.id}>{a.titre}{a.replique ? ` — « ${a.replique} »` : ""}</li>)}</ol>
            <button style={bouton()} onClick={() => exporter(resultat.scenario)}>Exporter en JSON</button>
          </div>) : <div data-testid="erreurs-import" role="alert" style={{ marginTop: 10, fontSize: 13, color: VIEUX_ROSE }}>{"erreurs" in resultat ? resultat.erreurs.join(" ") : ""}</div>)}
      </div>
      <div style={carte}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Dupliquer THE RED ROOM</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Crée une copie en brouillon (nouvel identifiant, validation effacée) à modifier puis réimporter.</div>
        <button data-testid="dupliquer-red-room" style={bouton()} onClick={() => exporter(dupliquer(RED_ROOM, `the_red_room_copie_${Date.now()}`))}>Télécharger la copie (JSON)</button>
      </div>
    </div>
  );
}
