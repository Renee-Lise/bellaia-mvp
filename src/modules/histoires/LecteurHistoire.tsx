"use client";
// ═══════════════════════════════════════════════════════════
// Lecteur d'une histoire — pensé pour l'iPhone, le soir.
// 📖 Lire : taille du texte, mode nuit, sommaire, parties, reprise.
// 🎧 Écouter : lecteur natif (lecture, pause, avance), reprise au dernier
//    point ; choix de la partie SEULEMENT si un minutage réel existe.
// 🎬 Regarder : lecture à la demande, plein écran, sous-titres français
//    activables. Rien ne démarre seul. Pas de média validé → « en
//    préparation », sans lecteur factice. Le texte reste toujours lisible.
// Les titres techniques des scènes ne sont jamais montrés aux familles.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import { lireProgression, ecrireProgression, type TomeLecture } from "./histoiresLib";

type Mode = "lire" | "ecouter" | "regarder";
const SA = "-apple-system, system-ui, sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const THEMES = {
  nuit: { fond: "#0d1024", carte: "rgba(255,255,255,0.05)", texte: "#ece4cf", doux: "rgba(236,228,207,0.6)", ligne: "rgba(236,228,207,0.14)", acc: "#e8b24a" },
  jour: { fond: "#fbf5e8", carte: "rgba(80,50,10,0.05)", texte: "#2b2116", doux: "rgba(43,33,22,0.6)", ligne: "rgba(43,33,22,0.14)", acc: "#a8640c" },
};

function lirePref<T>(k: string, def: T): T { try { const v = localStorage.getItem(k); return v === null ? def : (JSON.parse(v) as T); } catch { return def; } }
function ecrirePref(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export default function LecteurHistoire({ tome, modeInitial = "lire", onRetour, apercu = false }: { tome: TomeLecture; modeInitial?: Mode; onRetour: () => void; apercu?: boolean }) {
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [taille, setTaille] = useState<number>(() => lirePref("bellaia.histoires.taille", 20));
  const [nuit, setNuit] = useState<boolean>(() => lirePref("bellaia.histoires.nuit", true));
  const [sommaire, setSommaire] = useState(false);
  const n = tome.scenes.length;
  const [partie, setPartie] = useState<number>(() => Math.min(lireProgression(tome, "lire"), Math.max(0, n - 1)));
  const [reprise, setReprise] = useState<number>(() => Math.min(lireProgression(tome, "lire"), Math.max(0, n - 1)));
  const haut = useRef<HTMLDivElement>(null);
  const th = nuit ? THEMES.nuit : THEMES.jour;

  useEffect(() => { ecrirePref("bellaia.histoires.taille", taille); }, [taille]);
  useEffect(() => { ecrirePref("bellaia.histoires.nuit", nuit); }, [nuit]);
  const allerA = (i: number) => {
    const j = Math.max(0, Math.min(n - 1, i));
    setPartie(j); setSommaire(false); setReprise(0);
    ecrireProgression(tome, "lire", j);
    haut.current?.scrollIntoView({ block: "start" });
  };

  const bouton = (actif = false): React.CSSProperties => ({ minHeight: 44, padding: "8px 14px", borderRadius: 12, border: `1px solid ${actif ? th.acc : th.ligne}`, background: actif ? `${th.acc}22` : th.carte, color: actif ? th.acc : th.texte, fontSize: 15, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
  const scene = tome.scenes[partie];
  const debut = (t: string) => { const p = t.split("\n\n")[0] || ""; return p.length > 70 ? p.slice(0, 68).trimEnd() + "…" : p; };

  return (
    <div style={{ background: th.fond, color: th.texte, minHeight: "100%", borderRadius: 16, fontFamily: SA, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div ref={haut} />
      {apercu && <div style={{ background: "#7c2d12", color: "#ffedd5", fontSize: 13, padding: "8px 14px", borderRadius: "16px 16px 0 0", fontWeight: 700 }}>👁 Aperçu fondatrice — ce que verra une famille. Non publié tant que tu ne le publies pas.</div>}
      {/* En-tête */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: th.fond, borderBottom: `1px solid ${th.ligne}`, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ ...bouton(), padding: "8px 12px" }} onClick={onRetour} aria-label="Retour aux histoires">‹ Retour</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: th.doux, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{tome.collection_titre} · Tome {tome.numero}</div>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{tome.titre}</div>
          </div>
        </div>
        <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {([["lire", "📖 Lire"], ["ecouter", "🎧 Écouter"], ["regarder", "🎬 Regarder"]] as const).map(([m, l]) => (
            <button key={m} role="tab" aria-selected={mode === m} style={{ ...bouton(mode === m), padding: "8px 4px", fontSize: 14, whiteSpace: "nowrap" }} onClick={() => setMode(m)}>{l}</button>
          ))}
        </div>
        {mode === "lire" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button style={bouton()} aria-label="Réduire le texte" onClick={() => setTaille(t => Math.max(15, t - 2))}>A−</button>
            <button style={bouton()} aria-label="Agrandir le texte" onClick={() => setTaille(t => Math.min(32, t + 2))}>A+</button>
            <button style={bouton(nuit)} onClick={() => setNuit(v => !v)}>{nuit ? "🌙 Nuit" : "☀️ Jour"}</button>
            <button style={bouton(sommaire)} onClick={() => setSommaire(v => !v)}>☰ Sommaire</button>
            <span style={{ marginLeft: "auto", fontSize: 13, color: th.doux }}>Partie {partie + 1}/{n}</span>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 18px 28px", maxWidth: 680, margin: "0 auto", boxSizing: "border-box" }}>
        {mode === "lire" && (n === 0 ? <div style={{ color: th.doux, fontSize: 15 }}>Le texte de cette histoire n'est pas encore disponible.</div> : <>
          {sommaire && (
            <nav aria-label="Sommaire" style={{ background: th.carte, border: `1px solid ${th.ligne}`, borderRadius: 14, padding: 10, marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {tome.scenes.map((s, i) => (
                <button key={s.identifiant} onClick={() => allerA(i)} style={{ ...bouton(i === partie), textAlign: "left", fontWeight: 600, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>Partie {i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: th.doux, fontFamily: SERIF }}>{debut(s.texte)}</span>
                </button>
              ))}
            </nav>
          )}
          {reprise > 0 && partie === reprise && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: th.carte, border: `1px solid ${th.ligne}`, borderRadius: 12, padding: "8px 12px", marginBottom: 14, fontSize: 14 }}>
              <span style={{ flex: 1 }}>Reprise à la partie {reprise + 1}.</span>
              <button style={bouton()} onClick={() => allerA(0)}>Recommencer</button>
            </div>
          )}
          {scene.image_url && <figure style={{ margin: "0 0 16px" }}><img src={scene.image_url} alt={scene.image_alt || ""} style={{ width: "100%", borderRadius: 14, display: "block" }} />{scene.image_alt && <figcaption style={{ fontSize: 13, color: th.doux, marginTop: 6 }}>{scene.image_alt}</figcaption>}</figure>}
          <article lang="fr" style={{ fontFamily: SERIF, fontSize: taille, lineHeight: 1.7, userSelect: "text", WebkitUserSelect: "text", hyphens: "auto", WebkitHyphens: "auto" } as React.CSSProperties}>
            {scene.texte.split("\n\n").map((p, i) => <p key={i} style={{ margin: "0 0 0.85em", whiteSpace: "pre-line" }}>{p}</p>)}
          </article>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 22 }}>
            <button style={{ ...bouton(), visibility: partie > 0 ? "visible" : "hidden" }} onClick={() => allerA(partie - 1)}>← Partie précédente</button>
            {partie < n - 1
              ? <button style={bouton(true)} onClick={() => allerA(partie + 1)}>Partie suivante →</button>
              : <button style={bouton(true)} onClick={() => { ecrireProgression(tome, "lire", 0); onRetour(); }}>Fin · Retour aux histoires</button>}
          </div>
        </>)}

        {mode === "ecouter" && <Ecouter tome={tome} th={th} bouton={bouton} versLire={() => setMode("lire")} />}
        {mode === "regarder" && <Regarder tome={tome} th={th} bouton={bouton} versLire={() => setMode("lire")} />}
      </div>
    </div>
  );
}

function EnPreparation({ titre, th, bouton, versLire }: any) {
  return (
    <div style={{ background: th.carte, border: `1px dashed ${th.ligne}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{titre}</div>
      <div style={{ fontSize: 15, color: th.doux, lineHeight: 1.5 }}>Cette version sera bientôt disponible. En attendant, l'histoire peut être lue.</div>
      <button style={bouton(true)} onClick={versLire}>📖 Lire l'histoire</button>
    </div>
  );
}

function Ecouter({ tome, th, bouton, versLire }: any) {
  const a = tome.medias.audio;
  const ref = useRef<HTMLAudioElement>(null);
  const dernier = useRef(0);
  if (!a) return <EnPreparation titre="🎧 Audio en préparation" th={th} bouton={bouton} versLire={versLire} />;
  const reperes = (a.reperes || []).filter((r: any) => Number.isFinite(r.debut_s));
  const minutage = reperes.length > 0 && reperes.length === tome.scenes.length;
  const reprendre = () => { const t = lireProgression(tome, "ecouter"); if (ref.current && t > 0 && t < (ref.current.duration || Infinity) - 3) ref.current.currentTime = t; };
  const memo = () => { const el = ref.current; if (!el) return; const now = Date.now(); if (now - dernier.current > 4000 || el.paused) { dernier.current = now; ecrireProgression(tome, "ecouter", el.ended ? 0 : el.currentTime); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {tome.medias.couverture && <img src={tome.medias.couverture.url} alt={tome.medias.couverture.alt} style={{ width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: 16 }} />}
      {/* Lecteur natif : lecture, pause, déplacement dans le temps (durée réelle du fichier). Pas d'autoplay. */}
      <audio ref={ref} src={a.url} controls preload="metadata" onLoadedMetadata={reprendre} onTimeUpdate={memo} onPause={memo} onEnded={memo} style={{ width: "100%" }} />
      <div style={{ fontSize: 13, color: th.doux }}>La lecture reprend là où elle s'était arrêtée.</div>
      {minutage && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: th.doux }}>Aller à une partie</div>
          {reperes.map((r: any, i: number) => <button key={i} style={{ ...bouton(), textAlign: "left" }} onClick={() => { if (ref.current) { ref.current.currentTime = r.debut_s; ref.current.play().catch(() => {}); } }}>Partie {i + 1}</button>)}
        </div>
      )}
    </div>
  );
}

function Regarder({ tome, th, bouton, versLire }: any) {
  const v = tome.medias.video;
  const ref = useRef<HTMLVideoElement>(null);
  const dernier = useRef(0);
  if (!v) return <EnPreparation titre="🎬 Vidéo en préparation" th={th} bouton={bouton} versLire={versLire} />;
  const reprendre = () => { const t = lireProgression(tome, "regarder"); if (ref.current && t > 0 && t < (ref.current.duration || Infinity) - 3) ref.current.currentTime = t; };
  const memo = () => { const el = ref.current; if (!el) return; const now = Date.now(); if (now - dernier.current > 4000 || el.paused) { dernier.current = now; ecrireProgression(tome, "regarder", el.ended ? 0 : el.currentTime); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* playsInline : reste dans la page ; le plein écran est dans les contrôles. Sous-titres FR activables, désactivés par défaut. */}
      <video ref={ref} controls playsInline preload="none" poster={v.affiche} crossOrigin="anonymous" onLoadedMetadata={reprendre} onTimeUpdate={memo} onPause={memo} onEnded={memo} style={{ width: "100%", borderRadius: 14, background: "#000" }}>
        <source src={v.url} type="video/mp4" />
        <track kind="subtitles" srcLang="fr" label="Français" src={v.vtt} />
      </video>
      <div style={{ fontSize: 13, color: th.doux }}>Sous-titres : bouton « CC » ou « bulle » du lecteur. Plein écran : bouton du lecteur.</div>
    </div>
  );
}
