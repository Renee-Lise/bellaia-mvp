// Composants de base complémentaires (boutique) — s'appuient sur les jetons de tokens.ts ; à fusionner avec composants.tsx (existant).
import React from "react";
import { couleurs, espace, police, rayon, taille } from "./tokens";
import { Icone } from "./Icone";

type Variante = "principal" | "secondaire" | "discret";
export function Bouton({ variante = "principal", icone, enCours, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: string; enCours?: boolean }) {
  const s: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: espace[2], minHeight: 44, padding: `0 ${espace[5]}px`,
    borderRadius: rayon.pilule, fontFamily: police.texte, fontSize: taille.s, fontWeight: 600, letterSpacing: ".01em", cursor: p.disabled ? "default" : "pointer",
    border: variante === "secondaire" ? `1px solid ${couleurs.nuit}` : "1px solid transparent",
    background: variante === "principal" ? couleurs.nuit : "transparent",
    color: variante === "principal" ? couleurs.ivoire : couleurs.nuit, opacity: p.disabled ? 0.45 : 1, transition: "opacity .15s",
  };
  return <button {...p} style={{ ...s, ...(p.style || {}) }} aria-busy={enCours || undefined}>{icone ? <Icone nom={icone} taille={18} /> : null}{enCours ? "Un instant…" : children}</button>;
}

export function Section({ titre, action, children }: { titre?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ padding: `${espace[5]}px 0`, borderTop: `1px solid ${couleurs.trait}` }}>
      {titre || action ? <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: espace[3], marginBottom: espace[3] }}>
        {titre ? <h2 style={{ margin: 0, fontFamily: police.texte, fontSize: taille.xs, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: couleurs.texte2 }}>{titre}</h2> : <span />}
        {action}
      </div> : null}
      {children}
    </section>
  );
}

export function EtatVide({ icone = "livre", titre, texte, action }: { icone?: string; titre: string; texte?: string; action?: React.ReactNode }) {
  return (
    <div role="status" style={{ textAlign: "center", padding: `${espace[7]}px ${espace[4]}px`, color: couleurs.texte2 }}>
      <div style={{ display: "inline-flex", padding: espace[3], borderRadius: rayon.pilule, background: couleurs.rosePoudre, color: couleurs.prune }}><Icone nom={icone} taille={22} /></div>
      <p style={{ margin: `${espace[3]}px 0 ${espace[1]}px`, fontFamily: police.titre, fontSize: taille.xl, color: couleurs.nuit }}>{titre}</p>
      {texte ? <p style={{ margin: "0 auto", maxWidth: 420, fontSize: taille.s, lineHeight: 1.55 }}>{texte}</p> : null}
      {action ? <div style={{ marginTop: espace[4] }}>{action}</div> : null}
    </div>
  );
}

export function Message({ ton = "info", children }: { ton?: "info" | "succes" | "alerte"; children: React.ReactNode }) {
  const c = ton === "succes" ? couleurs.succes : ton === "alerte" ? couleurs.alerte : couleurs.nuitDouce;
  return <p role={ton === "alerte" ? "alert" : "status"} style={{ margin: `${espace[3]}px 0`, padding: `${espace[3]}px ${espace[4]}px`, borderLeft: `3px solid ${c}`, background: couleurs.blanc, color: c, fontSize: taille.s, lineHeight: 1.5 }}>{children}</p>;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: rayon.pilule, background: couleurs.rosePoudre, color: couleurs.prune, fontSize: taille.xs, fontWeight: 600 }}>{children}</span>;
}
