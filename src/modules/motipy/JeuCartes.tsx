"use client";
// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — jeu de cartes pédagogique (PROTOTYPE, espace fondatrice uniquement).
// L'enfant compose un programme avec des cartes puis le lance : Ti-Colibri se déplace sur le plateau.
// Moteur : src/lib/motipyJeu.ts. Visuels provisoires (emoji) en attendant les illustrations validées.
// Aucune donnée enregistrée ; rien n'est visible des familles.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DEFIS, executer, compterCartes, premiereCarteFautive, type Carte, type Defi, type Dir, type Niveau, type Etat } from "../../lib/motipyJeu";

const SA = "system-ui, -apple-system, sans-serif";
const V = { fond: "#0b1505", carte: "rgba(34,197,94,0.08)", ligne: "rgba(34,197,94,0.25)", vert: "#22c55e", or: "#f59e0b", texte: "#f5f0e8", doux: "rgba(245,240,232,0.6)", rouge: "#ef4444" };
const FLECHE: Record<Dir, string> = { N: "⬆️", E: "➡️", S: "⬇️", O: "⬅️" };
const ROT: Record<Dir, number> = { N: -90, E: 0, S: 90, O: 180 };
const gros: React.CSSProperties = { minWidth: 56, minHeight: 56, borderRadius: 14, border: `2px solid ${V.ligne}`, background: V.carte, color: V.texte, fontSize: 24, fontFamily: SA, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px 10px", gap: 4 };

function rendreCarte(c: Carte): string {
  switch (c.t) {
    case "fleche": return FLECHE[c.d];
    case "avancer": return "🦶";
    case "gauche": return "↺";
    case "droite": return "↻";
    case "ramasser": return "🧺";
    case "repeter": return `🔁${c.n}×(${c.corps.map(rendreCarte).join(" ")})`;
    case "si_obstacle": return `🔀 si obstacle : ${c.alors.map(rendreCarte).join(" ")} sinon ${c.sinon.map(rendreCarte).join(" ")}`;
  }
}

export default function JeuCartes() {
  const [niveau, setNiveau] = useState<Niveau>("PS");
  const [defi, setDefi] = useState<Defi>(DEFIS[0]);
  const [prog, setProg] = useState<Carte[]>([]);
  const [boucle, setBoucle] = useState<{ n: number; corps: Carte[] } | null>(null);
  const [anim, setAnim] = useState<Etat | null>(null);
  const [resultat, setResultat] = useState<{ statut: string; message: string } | null>(null);
  const [aRemplacer, setARemplacer] = useState<number | null>(null);
  const minuteur = useRef<any>(null);

  const choisir = (d: Defi) => { clearInterval(minuteur.current); setDefi(d); setProg(d.debogage ? [...d.debogage] : []); setBoucle(null); setAnim(null); setResultat(null); setARemplacer(null); };
  useEffect(() => () => clearInterval(minuteur.current), []);
  const defisNiveau = useMemo(() => DEFIS.filter(d => d.niveau === niveau), [niveau]);
  const total = compterCartes(prog) + (boucle ? 1 + compterCartes(boucle.corps) : 0);

  const ajouter = (c: Carte) => {
    setResultat(null); setAnim(null);
    if (aRemplacer !== null) { setProg(p => p.map((x, i) => i === aRemplacer ? c : x)); setARemplacer(null); return; }
    if (total + 1 > defi.maxCartes) { setResultat({ statut: "trop_long", message: `${defi.maxCartes} cartes au maximum pour ce défi.` }); return; }
    if (boucle) setBoucle({ ...boucle, corps: [...boucle.corps, c] }); else setProg(p => [...p, c]);
  };
  const fermerBoucle = () => { if (boucle && boucle.corps.length) setProg(p => [...p, { t: "repeter", n: boucle.n, corps: boucle.corps }]); setBoucle(null); };
  const lancer = () => {
    if (boucle) fermerBoucle();
    const programme = boucle && boucle.corps.length ? [...prog, { t: "repeter", n: boucle.n, corps: boucle.corps } as Carte] : prog;
    const r = executer(defi, programme); let i = 0; setResultat(null); clearInterval(minuteur.current);
    minuteur.current = setInterval(() => { setAnim(r.trace[i]); i++; if (i >= r.trace.length) { clearInterval(minuteur.current); setResultat({ statut: r.statut, message: r.message }); } }, 420);
  };
  const etat = anim || { pos: defi.depart, dir: defi.dir, fruits: [], pas: 0 };
  const cle = (x: number, y: number) => `${x},${y}`;
  const obst = new Set((defi.obstacles || []).map(p => cle(p.x, p.y)));
  const fruits = new Set((defi.fruits || []).map(p => cle(p.x, p.y)));
  const cellule = Math.min(64, Math.floor(320 / Math.max(defi.taille.l, defi.taille.h)));

  return (
    <div style={{ fontFamily: SA, color: V.texte }}>
      <div style={{ background: "rgba(245,158,11,0.12)", border: `1px solid ${V.or}`, borderRadius: 12, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>
        Prototype : défis, consignes et visuels provisoires, à valider. Non visible des familles ; aucune donnée enregistrée.
      </div>
      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["PS", "MS", "GS", "CP"] as Niveau[]).map(n => <button key={n} role="tab" aria-selected={niveau === n} style={{ ...gros, fontSize: 16, fontWeight: 800, background: niveau === n ? V.vert : V.carte }} onClick={() => { setNiveau(n); choisir(DEFIS.find(d => d.niveau === n)!); }}>{n}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {defisNiveau.map((d, i) => <button key={d.id} style={{ ...gros, fontSize: 13, background: defi.id === d.id ? "rgba(34,197,94,0.3)" : V.carte }} onClick={() => choisir(d)}>{i + 1}. {d.titre}</button>)}
      </div>
      <div style={{ fontSize: 15, marginBottom: 8 }}>{defi.consigne}</div>

      <div aria-label="Plateau" style={{ display: "grid", gridTemplateColumns: `repeat(${defi.taille.l}, ${cellule}px)`, gap: 3, marginBottom: 12, justifyContent: "center" }}>
        {Array.from({ length: defi.taille.h }).flatMap((_, y) => Array.from({ length: defi.taille.l }).map((__, x) => {
          const ici = etat.pos.x === x && etat.pos.y === y; const k = cle(x, y);
          const fruitPris = etat.fruits.includes(k);
          return <div key={k} data-case={k} style={{ width: cellule, height: cellule, borderRadius: 10, background: obst.has(k) ? "rgba(120,72,30,0.55)" : "rgba(34,197,94,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: cellule * 0.5, position: "relative" }}>
            {obst.has(k) ? "🪵" : ici ? <span data-colibri style={{ display: "inline-block", transform: defi.niveau === "CP" ? `rotate(${ROT[etat.dir]}deg)` : undefined, transition: "transform .2s" }}>🐦</span>
              : defi.arrivee.x === x && defi.arrivee.y === y ? "🛖" : fruits.has(k) && !fruitPris ? "🥭" : ""}
          </div>;
        }))}
      </div>

      <div style={{ fontSize: 12.5, color: V.doux, marginBottom: 4 }}>Mon programme ({total}/{defi.maxCartes} cartes){defi.debogage ? " — touche la carte fausse, puis sa remplaçante" : " — touche une carte pour la retirer"}</div>
      <div aria-label="Programme" style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 64, padding: 6, borderRadius: 12, border: `1px dashed ${V.ligne}`, marginBottom: 10 }}>
        {prog.map((c, i) => <button key={i} data-carte-programme={i} style={{ ...gros, borderColor: aRemplacer === i ? V.or : V.ligne, fontSize: c.t === "repeter" || c.t === "si_obstacle" ? 14 : 24 }}
          onClick={() => { setResultat(null); setAnim(null); if (defi.debogage) setARemplacer(aRemplacer === i ? null : i); else setProg(p => p.filter((_, j) => j !== i)); }}>{rendreCarte(c)}</button>)}
        {boucle && <span style={{ ...gros, borderColor: "#a855f7", fontSize: 14 }}>🔁{boucle.n}× ( {boucle.corps.map(rendreCarte).join(" ")} … )</span>}
      </div>

      <div aria-label="Cartes disponibles" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {defi.cartes.includes("fleche") && (["N", "E", "S", "O"] as Dir[]).map(d => <button key={d} aria-label={`Flèche ${d}`} style={gros} onClick={() => ajouter({ t: "fleche", d })}>{FLECHE[d]}</button>)}
        {defi.cartes.includes("avancer") && <button aria-label="Avancer" style={gros} onClick={() => ajouter({ t: "avancer" })}>🦶 <span style={{ fontSize: 13 }}>Avancer</span></button>}
        {defi.cartes.includes("gauche") && <button aria-label="Tourner à gauche" style={gros} onClick={() => ajouter({ t: "gauche" })}>↺</button>}
        {defi.cartes.includes("droite") && <button aria-label="Tourner à droite" style={gros} onClick={() => ajouter({ t: "droite" })}>↻</button>}
        {defi.cartes.includes("ramasser") && <button aria-label="Ramasser" style={gros} onClick={() => ajouter({ t: "ramasser" })}>🧺</button>}
        {defi.cartes.includes("repeter") && !boucle && aRemplacer === null && [2, 3, 4, 7].map(n => <button key={n} aria-label={`Répéter ${n} fois`} style={{ ...gros, fontSize: 15, borderColor: "#a855f7" }} onClick={() => { if (total + 1 > defi.maxCartes) return; setBoucle({ n, corps: [] }); }}>🔁 {n}×</button>)}
        {boucle && <button style={{ ...gros, fontSize: 14, borderColor: "#a855f7" }} onClick={fermerBoucle}>Fermer la boucle</button>}
        {defi.cartes.includes("si_obstacle") && <button aria-label="Si obstacle tourner à droite sinon avancer" style={{ ...gros, fontSize: 13, borderColor: "#60a5fa" }} onClick={() => { if (total + 3 > defi.maxCartes) return; const c: Carte = { t: "si_obstacle", alors: [{ t: "droite" }], sinon: [{ t: "avancer" }] }; if (boucle) setBoucle({ ...boucle, corps: [...boucle.corps, c] }); else setProg(p => [...p, c]); }}>🔀 si obstacle ↻ sinon 🦶</button>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={{ ...gros, background: V.vert, fontSize: 16, fontWeight: 800, padding: "4px 20px" }} onClick={lancer}>▶ Jouer</button>
        <button style={{ ...gros, fontSize: 15 }} onClick={() => choisir(defi)}>Recommencer</button>
        {defi.debogage && <button style={{ ...gros, fontSize: 13 }} onClick={() => { const i = premiereCarteFautive(defi, prog); setResultat({ statut: "aide", message: i === null ? "Le programme fonctionne." : `Indice pour l'adulte : regardez la carte n° ${i + 1}.` }); }}>Indice</button>}
      </div>
      {resultat && <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 12, fontSize: 16, background: resultat.statut === "reussi" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.15)", color: resultat.statut === "reussi" ? "#4ade80" : V.texte }}>{resultat.statut === "reussi" ? "🏆 " : ""}{resultat.message}</div>}
    </div>
  );
}
