"use client";
// Alerte explicite de changement de version + panneau de diagnostic (anomalie P0 du 24/11/2026).
// Remplace l'ancien rechargement silencieux qui ramenait la fondatrice à l'accueil.
import { useEffect, useState } from "react";
import { EVT_VERSION, VERSION_APP, VERSION_DATE, journal, journaliser, mettreAJour, resumeAppareil, versionServeur, type DetailVersion } from "@/lib/versionApp";

export const EVT_DIAGNOSTIC = "bellaia-ouvrir-diagnostic";
const INTERVALLE_MS = 10 * 60e3;

const NOMS_MODULES: Record<string, string> = { bshAgenda: "BSH Secret Agenda" };

export default function AlerteVersion() {
  const [alerte, setAlerte] = useState<DetailVersion | null>(null);
  const [diag, setDiag] = useState(false);
  const [copie, setCopie] = useState("");

  useEffect(() => {
    const surEchec = (e: Event) => setAlerte((e as CustomEvent<DetailVersion>).detail || { cause: "chargement" });
    const ouvrirDiag = () => setDiag(true);
    let dernier = 0;
    const verifier = async () => {
      if (VERSION_APP === "locale" || Date.now() - dernier < 30e3) return;
      dernier = Date.now();
      const v = await versionServeur();
      if (v && v !== "locale" && v !== VERSION_APP) {
        setAlerte(a => a || { cause: "nouvelle_version", serveur: v });
        journaliser("nouvelle_version_detectee", { detail: `en ligne : ${v}` });
      }
    };
    const surVisible = () => { if (document.visibilityState === "visible") verifier(); };
    window.addEventListener(EVT_VERSION, surEchec);
    window.addEventListener(EVT_DIAGNOSTIC, ouvrirDiag);
    document.addEventListener("visibilitychange", surVisible);
    window.addEventListener("pageshow", surVisible);
    const minuterie = setInterval(verifier, INTERVALLE_MS);
    verifier();
    return () => {
      window.removeEventListener(EVT_VERSION, surEchec);
      window.removeEventListener(EVT_DIAGNOSTIC, ouvrirDiag);
      document.removeEventListener("visibilitychange", surVisible);
      window.removeEventListener("pageshow", surVisible);
      clearInterval(minuterie);
    };
  }, []);

  const carte: React.CSSProperties = { position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom,0px))", zIndex: 2000, background: "#17131f", border: "1px solid rgba(201,168,76,0.5)", borderRadius: 14, padding: "14px 16px", color: "#f4f0e8", fontFamily: "-apple-system,system-ui,sans-serif", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", maxWidth: 520, margin: "0 auto" };
  const bouton = (principal: boolean): React.CSSProperties => ({ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: "1px solid " + (principal ? "#c9a84c" : "rgba(255,255,255,0.2)"), background: principal ? "rgba(201,168,76,0.2)" : "transparent", color: principal ? "#f5c76a" : "#f4f0e8", fontWeight: 700, fontSize: 14, cursor: "pointer" });

  return <>
    {alerte && (
      <div role="alertdialog" aria-labelledby="alerte-version-titre" data-testid="alerte-version" style={carte}>
        <div id="alerte-version-titre" style={{ fontWeight: 800, fontSize: 15, color: "#f5c76a", marginBottom: 6 }}>
          {alerte.cause === "chargement" ? "Cet écran n'a pas pu s'ouvrir" : "Une nouvelle version de Bellaïa est disponible"}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(244,240,232,0.85)" }}>
          {alerte.cause === "chargement"
            ? <>Le module {alerte.module ? `« ${NOMS_MODULES[alerte.module] || alerte.module} » ` : ""}appartient à une version plus ancienne que celle aujourd'hui en ligne : son fichier n'est plus disponible. Rien n'est perdu.</>
            : <>Une mise à jour a été publiée pendant que l'application était ouverte. Mettre à jour maintenant évite qu'un écran ne puisse pas s'ouvrir.</>}
          <br />Après la mise à jour, Bellaïa rouvre <b>l'écran où vous étiez</b>.
        </div>
        <div style={{ fontSize: 11, color: "rgba(244,240,232,0.55)", marginTop: 6 }}>Version de cet écran : {VERSION_APP}{alerte.serveur ? ` · en ligne : ${alerte.serveur}` : ""}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button data-testid="alerte-version-maj" style={bouton(true)} onClick={mettreAJour}>Mettre à jour et rouvrir cet écran</button>
          <button style={bouton(false)} onClick={() => setAlerte(null)}>Plus tard</button>
        </div>
      </div>
    )}
    {diag && (
      <div role="dialog" aria-label="Diagnostic" data-testid="panneau-diagnostic" style={{ ...carte, bottom: "auto", top: "calc(60px + env(safe-area-inset-top,0px))", maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#f5c76a", marginBottom: 6 }}>Diagnostic de l'application</div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          Version : <b>{VERSION_APP}</b>{VERSION_DATE ? ` (compilée le ${new Date(VERSION_DATE).toLocaleString("fr-FR")})` : ""}<br />
          Appareil : {resumeAppareil()}<br />
          Adresse : {typeof window !== "undefined" ? window.location.host : ""}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 10 }}>Derniers incidents (sur cet appareil)</div>
        {journal().length === 0 ? <div style={{ fontSize: 12, color: "rgba(244,240,232,0.6)" }}>Aucun incident enregistré.</div> :
          <ul style={{ fontSize: 11, paddingLeft: 16, margin: "4px 0" }}>{journal().slice(-12).reverse().map((i, k) => <li key={k}>{new Date(i.quand).toLocaleString("fr-FR")} — {i.type}{i.module ? ` (${i.module})` : ""} · v{i.version}{i.detail ? ` — ${i.detail}` : ""}</li>)}</ul>}
        <div style={{ fontSize: 11, color: "rgba(244,240,232,0.55)", margin: "6px 0" }}>Ce journal ne contient ni nom, ni courriel, ni contenu : uniquement des types d'incident, des écrans et des versions.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={bouton(true)} onClick={async () => {
            const texte = [`Version ${VERSION_APP}`, resumeAppareil(), ...journal().map(i => `${i.quand} ${i.type} ${i.module || ""} v${i.version} ${i.detail || ""}`)].join("\n");
            try { await navigator.clipboard.writeText(texte); setCopie("Copié."); } catch { setCopie("Copie impossible sur cet appareil."); }
          }}>Copier le diagnostic</button>
          <button style={bouton(false)} onClick={() => { setDiag(false); setCopie(""); }}>Fermer</button>
        </div>
        {copie && <div style={{ fontSize: 12, marginTop: 6 }}>{copie}</div>}
      </div>
    )}
  </>;
}
