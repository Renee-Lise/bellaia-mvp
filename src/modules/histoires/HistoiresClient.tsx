"use client";
// ═══════════════════════════════════════════════════════════
// Histoires du soir — espace familles (Mo Ti-Péyi)
// Collection → volume → tomes publiés → Lire / Écouter / Regarder.
// N'affiche que ce que le serveur renvoie (tomes publiés uniquement).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import LecteurHistoire from "./LecteurHistoire";
import { catalogueFamilles, lectureFamille, urlSignee, type TomeLecture } from "./histoiresLib";

const SA = "-apple-system, system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export default function HistoiresClient() {
  const [liste, setListe] = useState<any[] | null>(null);
  const [couvertures, setCouvertures] = useState<Record<string, string>>({});
  const [ouvert, setOuvert] = useState<{ tome: TomeLecture; mode: any } | null>(null);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState("");

  useEffect(() => {
    catalogueFamilles().then(async l => {
      setListe(l);
      const c: Record<string, string> = {};
      await Promise.all(l.filter(t => t.couverture).map(async t => { const u = await urlSignee(t.couverture.chemin); if (u) c[t.identifiant] = u; }));
      setCouvertures(c);
    }).catch(() => { setListe([]); setErreur("Les histoires ne sont pas disponibles pour le moment."); });
  }, []);

  const ouvrir = async (t: any, mode: string) => {
    setCharge(t.identifiant);
    try { const d = await lectureFamille(t); if (d) setOuvert({ tome: d, mode }); else setErreur("Cette histoire n'est pas disponible."); }
    catch { setErreur("Impossible d'ouvrir l'histoire. Vérifie ta connexion."); }
    setCharge("");
  };

  if (ouvert) return <LecteurHistoire tome={ouvert.tome} modeInitial={ouvert.mode} onRetour={() => setOuvert(null)} />;

  const collections = [...new Set((liste || []).map(t => t.collection_titre))];
  const btn: React.CSSProperties = { minHeight: 44, padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(232,178,74,0.4)", background: "rgba(232,178,74,0.1)", color: "#f3d7a0", fontSize: 14, fontWeight: 700, fontFamily: SA, cursor: "pointer" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: SA, color: "#ece4cf" }}>
      <div style={{ background: "linear-gradient(160deg,#1b1640,#0d1024 70%)", borderRadius: 18, padding: "18px 16px", border: "1px solid rgba(232,178,74,0.25)" }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>🌙 Histoires du soir</div>
        <div style={{ fontSize: 14, color: "rgba(236,228,207,0.7)", marginTop: 4, lineHeight: 1.5 }}>Des contes doux à lire, écouter ou regarder avant de dormir.</div>
      </div>
      {liste === null && <div style={{ fontSize: 14, color: "rgba(236,228,207,0.6)", textAlign: "center", padding: 20 }}>Chargement…</div>}
      {erreur && <div style={{ fontSize: 14, color: "#fca5a5" }}>{erreur}</div>}
      {liste && liste.length === 0 && !erreur && <div style={{ fontSize: 15, color: "rgba(236,228,207,0.7)", textAlign: "center", padding: 24, lineHeight: 1.6 }}>Les premières histoires arrivent bientôt. ✨</div>}
      {collections.map(col => {
        const tomes = (liste || []).filter(t => t.collection_titre === col);
        const volumes = [...new Set(tomes.map(t => t.volume))];
        return (
          <section key={col} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 20, margin: 0, color: "#f3d7a0" }}>🦁 {col}</h2>
            {volumes.map(v => (
              <div key={v} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(236,228,207,0.6)" }}>Volume {v} · {tomes.filter(t => t.volume === v).length} tome(s)</div>
                {tomes.filter(t => t.volume === v).map(t => (
                  <article key={t.identifiant} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(236,228,207,0.12)", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {couvertures[t.identifiant]
                        ? <img src={couvertures[t.identifiant]} alt={t.couverture.alt} style={{ width: 72, height: 96, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                        : <div aria-hidden style={{ width: 72, height: 96, borderRadius: 10, flexShrink: 0, background: "linear-gradient(180deg,#e8b24a,#7a4a12 55%,#1b1640)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🦁</div>}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "rgba(236,228,207,0.6)", fontWeight: 700 }}>Tome {t.numero}</div>
                        <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{t.titre}</div>
                        {t.synopsis && <div style={{ fontSize: 13, color: "rgba(236,228,207,0.7)", marginTop: 4, lineHeight: 1.45 }}>{t.synopsis}</div>}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      <button style={btn} disabled={!!charge} onClick={() => ouvrir(t, "lire")}>📖 Lire</button>
                      <button style={btn} disabled={!!charge} onClick={() => ouvrir(t, "ecouter")}>🎧 Écouter</button>
                      <button style={btn} disabled={!!charge} onClick={() => ouvrir(t, "regarder")}>🎬 Regarder</button>
                    </div>
                    {charge === t.identifiant && <div style={{ fontSize: 13, color: "rgba(236,228,207,0.6)" }}>Ouverture…</div>}
                  </article>
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
