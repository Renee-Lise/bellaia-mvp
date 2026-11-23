"use client";
// ═══════════════════════════════════════════════════════════
// « Sécurité du compte » (Mon compte) et page d'arrivée du lien « mot de passe oublié ».
// Logique et protections : src/lib/securiteCompte.ts.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { evaluerMotDePasse, limiteur, lireJeton, verifierMotDePasseActuel, changerMotDePasse, revoquerSessions, lireUtilisateur, demanderReinitialisation } from "../../lib/securiteCompte";

const T = { carte: "#ffffff", texte: "#1c2246", doux: "rgba(28,34,70,0.62)", ligne: "rgba(28,34,70,0.12)", rouge: "#b4523f", vert: "#3f7d5b", or: "#8a5a00" };
const SA = "-apple-system, system-ui, sans-serif";
const carte: React.CSSProperties = { background: T.carte, border: `1px solid ${T.ligne}`, borderRadius: 16, padding: 16, marginBottom: 12 };
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, borderRadius: 12, border: `1px solid ${T.ligne}`, padding: "10px 12px", fontSize: 16, fontFamily: SA, background: "#fff", color: T.texte };
const bouton = (plein = true, c = T.texte): React.CSSProperties => ({ minHeight: 44, padding: "10px 16px", borderRadius: 22, border: plein ? "none" : `1px solid ${c}55`, background: plein ? c : "transparent", color: plein ? "#fff" : c, fontSize: 15, fontWeight: 600, fontFamily: SA, cursor: "pointer" });
const lbl: React.CSSProperties = { fontSize: 13, color: T.doux, marginBottom: 4, display: "block" };
const FORCE = ["Très faible", "Faible", "Correct", "Robuste"];
const lire = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const CLE_ECHECS = "bellaia_mdp_echecs";

function Msg({ m }: { m: { ok: boolean; t: string } | null }) {
  if (!m) return null;
  return <div role={m.ok ? "status" : "alert"} style={{ background: m.ok ? "#e8f3ec" : "#f8e9e5", color: m.ok ? T.vert : T.rouge, borderRadius: 12, padding: "10px 12px", fontSize: 14, marginBottom: 12 }}>{m.t}</div>;
}

function ChampMdp({ id, libelle, valeur, onChange, auto }: { id: string; libelle: string; valeur: string; onChange: (v: string) => void; auto: string }) {
  const [voir, setVoir] = useState(false);
  return <div style={{ marginBottom: 10 }}>
    <label htmlFor={id} style={lbl}>{libelle}</label>
    <div style={{ display: "flex", gap: 6 }}>
      <input id={id} type={voir ? "text" : "password"} autoComplete={auto} value={valeur} onChange={e => onChange(e.target.value)} style={champ} />
      <button type="button" onClick={() => setVoir(!voir)} style={{ ...bouton(false), padding: "0 12px", fontSize: 13 }} aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{voir ? "Masquer" : "Afficher"}</button>
    </div>
  </div>;
}

export default function SecuriteCompte({ user, onDeconnecte }: { user: any; onDeconnecte?: () => void }) {
  const [actuel, setActuel] = useState(""); const [nouveau, setNouveau] = useState(""); const [conf, setConf] = useState("");
  const [autres, setAutres] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [msgS, setMsgS] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [infos, setInfos] = useState<{ email?: string; derniereConnexion?: string } | null>(null);
  const jeton = lire("bellaia_token"); const j = lireJeton(jeton);
  const email = infos?.email || user?.email || j?.email || "";
  useEffect(() => { if (jeton) lireUtilisateur(jeton).then(setInfos); }, [jeton]);
  const verdict = evaluerMotDePasse(nouveau, { email, ancien: actuel, confirmation: conf });

  const changer = async () => {
    setMsg(null);
    const echecs: number[] = (() => { try { return JSON.parse(lire(CLE_ECHECS) || "[]"); } catch { return []; } })();
    const lim = limiteur(echecs);
    if (lim.bloque) { setMsg({ ok: false, t: `Trop d'essais. Réessayez dans ${Math.ceil(lim.attenteS / 60)} min.` }); return; }
    if (!actuel) { setMsg({ ok: false, t: "Saisissez votre mot de passe actuel." }); return; }
    if (!verdict.ok) { setMsg({ ok: false, t: verdict.erreurs.join(" ") }); return; }
    if (!email) { setMsg({ ok: false, t: "Adresse e-mail du compte introuvable : reconnectez-vous." }); return; }
    setOccupe(true);
    try {
      const v = await verifierMotDePasseActuel(email, actuel);
      if (!v.ok || !v.session?.access_token) {
        try { localStorage.setItem(CLE_ECHECS, JSON.stringify([...lim.recents, Date.now()])); } catch {}
        setMsg({ ok: false, t: "Mot de passe actuel incorrect." }); return;
      }
      try { localStorage.removeItem(CLE_ECHECS); } catch {}
      const s = v.session;
      const r = await changerMotDePasse(s.access_token, nouveau);
      if (!r.ok) { await revoquerSessions(s.access_token, "local"); setMsg({ ok: false, t: r.erreur || "Modification impossible." }); return; }
      // La session de vérification devient la session de cet appareil ; l'ancienne est révoquée.
      const ancienne = jeton;
      try { localStorage.setItem("bellaia_token", s.access_token); if (s.refresh_token) localStorage.setItem("bellaia_refresh", s.refresh_token); if (s.expires_at) localStorage.setItem("bellaia_expiry", String(s.expires_at)); } catch {}
      if (ancienne && ancienne !== s.access_token) await revoquerSessions(ancienne, "local");
      if (autres) await revoquerSessions(s.access_token, "others");
      setActuel(""); setNouveau(""); setConf("");
      setMsg({ ok: true, t: autres ? "Mot de passe modifié. Vos autres appareils ont été déconnectés." : "Mot de passe modifié." });
    } catch { setMsg({ ok: false, t: "Connexion impossible : réessayez." }); }
    finally { setOccupe(false); }
  };

  const deconnecter = async (scope: "others" | "global") => {
    if (!jeton) return;
    if (scope === "global" && !window.confirm("Se déconnecter de tous les appareils, y compris celui-ci ?")) return;
    const ok = await revoquerSessions(jeton, scope);
    if (scope === "global" && ok) { onDeconnecte?.(); return; }
    setMsgS({ ok, t: ok ? "Vos autres appareils ont été déconnectés." : "Action impossible pour le moment." });
  };

  return <>
    <div style={carte}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Changer mon mot de passe</h2>
      <Msg m={msg} />
      <ChampMdp id="mdp-actuel" libelle="Mot de passe actuel" valeur={actuel} onChange={setActuel} auto="current-password" />
      <ChampMdp id="mdp-nouveau" libelle="Nouveau mot de passe" valeur={nouveau} onChange={setNouveau} auto="new-password" />
      {nouveau && <div aria-live="polite" style={{ fontSize: 13, margin: "-4px 0 10px", color: verdict.force >= 2 ? T.vert : T.or }}>Robustesse : {FORCE[verdict.force]}{verdict.erreurs.filter(e => !/confirmation/.test(e)).length ? " — " + verdict.erreurs.filter(e => !/confirmation/.test(e)).join(" ") : ""}</div>}
      <ChampMdp id="mdp-conf" libelle="Confirmer le nouveau mot de passe" valeur={conf} onChange={setConf} auto="new-password" />
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14.5, margin: "6px 0 12px" }}><input type="checkbox" checked={autres} onChange={e => setAutres(e.target.checked)} style={{ width: 20, height: 20 }} />Déconnecter mes autres appareils</label>
      <button style={bouton()} disabled={occupe} onClick={changer}>{occupe ? "Vérification…" : "Changer le mot de passe"}</button>
      <div style={{ fontSize: 12.5, color: T.doux, marginTop: 10 }}>12 caractères au minimum, avec des lettres et des chiffres. Votre mot de passe actuel est vérifié avant tout changement.</div>
    </div>
    <div style={carte}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Mes connexions</h2>
      <Msg m={msgS} />
      <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>
        <div>Compte : <strong>{email || "—"}</strong></div>
        {infos?.derniereConnexion && <div>Dernière connexion : {new Date(infos.derniereConnexion).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</div>}
        {j?.debut && <div>Session de cet appareil ouverte le {j.debut.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}{j.methode ? ` (${j.methode})` : ""}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={bouton(false)} onClick={() => deconnecter("others")}>Déconnecter mes autres appareils</button>
        <button style={bouton(false, T.rouge)} onClick={() => deconnecter("global")}>Me déconnecter partout</button>
      </div>
      <div style={{ fontSize: 12.5, color: T.doux, marginTop: 10 }}>La liste détaillée des appareils connectés n'est pas encore disponible ; ces boutons révoquent réellement les sessions côté serveur.</div>
    </div>
    <div style={{ ...carte, fontSize: 13.5, color: T.doux, lineHeight: 1.55 }}>
      Protections en place : vérification du mot de passe actuel, limitation des essais, révocation des sessions à la déconnexion. Votre rôle et vos accès ne peuvent être modifiés que par la fondatrice. Un message inhabituel au nom de Bellaïa ? Ne communiquez jamais votre mot de passe : nous ne le demandons jamais.
    </div>
  </>;
}

/** Formulaire « mot de passe oublié » (écran de connexion). */
export function MotDePasseOublie({ onFermer }: { onFermer: () => void }) {
  const [email, setEmail] = useState(""); const [envoye, setEnvoye] = useState(false); const [occupe, setOccupe] = useState(false);
  const valide = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  return <div style={{ ...carte, color: T.texte, fontFamily: SA }}>
    {envoye ? <>
      <div role="status" style={{ fontSize: 15, lineHeight: 1.5 }}>Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé. Pensez à vérifier les courriers indésirables. Le lien n'est valable qu'une fois.</div>
      <button style={{ ...bouton(), marginTop: 12 }} onClick={onFermer}>Retour à la connexion</button>
    </> : <>
      <label htmlFor="mdp-oubli" style={lbl}>Adresse e-mail du compte</label>
      <input id="mdp-oubli" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={champ} />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button style={bouton()} disabled={!valide || occupe} onClick={async () => { setOccupe(true); await demanderReinitialisation(email, `${window.location.origin}/`); setOccupe(false); setEnvoye(true); }}>Recevoir un lien</button>
        <button style={bouton(false)} onClick={onFermer}>Annuler</button>
      </div>
    </>}
  </div>;
}

/** Page d'arrivée du lien reçu par e-mail : choisir un nouveau mot de passe. */
export function NouveauMotDePasse({ jeton, onTermine }: { jeton: string; onTermine: () => void }) {
  const [nouveau, setNouveau] = useState(""); const [conf, setConf] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [fini, setFini] = useState(false); const [occupe, setOccupe] = useState(false);
  const j = lireJeton(jeton); const expire = !!j?.expiration && j.expiration.getTime() < Date.now();
  const v = evaluerMotDePasse(nouveau, { email: j?.email, confirmation: conf });
  return <div style={{ minHeight: "100dvh", background: "#faf6ef", color: T.texte, fontFamily: SA, padding: "calc(env(safe-area-inset-top,0px) + 24px) 16px 40px" }}>
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24 }}>Nouveau mot de passe</h1>
      <Msg m={msg} />
      {expire ? <><p>Ce lien a expiré. Demandez-en un nouveau depuis l'écran de connexion.</p><button style={bouton()} onClick={onTermine}>Retour à la connexion</button></>
        : fini ? <button style={bouton()} onClick={onTermine}>Se connecter</button>
        : <div style={carte}>
          <ChampMdp id="rec-nouveau" libelle="Nouveau mot de passe" valeur={nouveau} onChange={setNouveau} auto="new-password" />
          {nouveau && <div style={{ fontSize: 13, margin: "-4px 0 10px", color: v.force >= 2 ? T.vert : T.or }}>Robustesse : {FORCE[v.force]}</div>}
          <ChampMdp id="rec-conf" libelle="Confirmer" valeur={conf} onChange={setConf} auto="new-password" />
          <button style={bouton()} disabled={occupe} onClick={async () => {
            if (!v.ok) { setMsg({ ok: false, t: v.erreurs.join(" ") }); return; }
            setOccupe(true); const r = await changerMotDePasse(jeton, nouveau);
            if (r.ok) { await revoquerSessions(jeton, "global"); setFini(true); setMsg({ ok: true, t: "Mot de passe enregistré. Par sécurité, toutes les sessions ont été fermées : connectez-vous avec le nouveau mot de passe." }); }
            else setMsg({ ok: false, t: r.erreur || "Lien invalide ou expiré." });
            setOccupe(false);
          }}>Enregistrer</button>
        </div>}
    </div>
  </div>;
}
