"use client";
// ═══════════════════════════════════════════════════════════
// Composants premium communs (portails, boutiques, espaces pro).
// • Bandeau informatif défilant (annonces courtes)
// • Carrousel promotionnel (auto + manuel, pause, réduction des
//   animations respectée), bannières datées / priorisées / ciblées
// • Surface, Bouton, Titre, Indicateur (KPI), Puce, Logo de marque
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import type { Marque } from "./marques";

export type Banniere = {
  id: string; type: "info" | "promo"; titre: string; texte?: string; cta?: string; destination?: string;
  image?: string | null; illustration?: React.ReactNode; debut?: string | null; fin?: string | null;
  priorite?: number; audience?: string[]; statut: "brouillon" | "programmee" | "publiee" | "archivee";
};

/** Bannières visibles maintenant pour une audience (publiées, dans leurs dates, triées par priorité). */
export function bannieresActives(liste: Banniere[], audience = "tous", maintenant = new Date()) {
  return liste.filter(b => b.statut === "publiee" && (!b.debut || new Date(b.debut) <= maintenant) && (!b.fin || new Date(b.fin) >= maintenant)
    && (!b.audience?.length || b.audience.includes("tous") || b.audience.includes(audience))).sort((a, b) => (b.priorite || 0) - (a.priorite || 0));
}

function useMouvementReduit() {
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => { const m = window.matchMedia?.("(prefers-reduced-motion: reduce)"); if (!m) return; setR(m.matches); const f = () => setR(m.matches); m.addEventListener?.("change", f); return () => m.removeEventListener?.("change", f); }, []);
  return r;
}

export function BandeauInfo({ messages, m, vitesse = 40 }: { messages: string[]; m: Marque; vitesse?: number }) {
  const reduit = useMouvementReduit(); const [pause, setPause] = useState(false); const [i, setI] = useState(0);
  useEffect(() => { if (!reduit || messages.length < 2 || pause) return; const t = setInterval(() => setI(x => (x + 1) % messages.length), 4500); return () => clearInterval(t); }, [reduit, messages.length, pause]);
  if (!messages.length) return null;
  const sombre = m.ambiance === "luxe_nuit";
  const style: React.CSSProperties = { background: sombre ? m.surface2 : m.principale, color: sombre ? m.accent : "#fff", fontSize: 12, fontWeight: 600, letterSpacing: 0.4, fontFamily: m.sans, overflow: "hidden", whiteSpace: "nowrap", position: "relative", height: 32, display: "flex", alignItems: "center" };
  return (
    <div style={style} role="marquee" aria-live="off" onClick={() => setPause(p => !p)} title={pause ? "Reprendre" : "Mettre en pause"}>
      {reduit ? <div style={{ width: "100%", textAlign: "center", padding: "0 12px" }}>{messages[i]}</div> : <>
        <style>{`@keyframes bandeauDefile{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
        <div style={{ display: "inline-flex", gap: 40, paddingLeft: 20, animation: `bandeauDefile ${Math.max(12, messages.join(" ").length * 60 / vitesse)}s linear infinite`, animationPlayState: pause ? "paused" : "running" }}>
          {[...messages, ...messages].map((t, k) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span style={{ width: 4, height: 4, borderRadius: 9, background: "currentColor", opacity: 0.6 }} />{t}</span>)}
        </div></>}
      {pause && <span style={{ position: "absolute", right: 8, fontSize: 10, opacity: 0.8 }}>⏸</span>}
    </div>
  );
}

export function Carrousel({ bannieres, m, onAller, intervalle = 5500, hauteur = 190 }: { bannieres: Banniere[]; m: Marque; onAller?: (b: Banniere) => void; intervalle?: number; hauteur?: number }) {
  const reduit = useMouvementReduit(); const [i, setI] = useState(0); const [pause, setPause] = useState(false); const ref = useRef<HTMLDivElement>(null);
  const aller = (k: number) => { const el = ref.current; if (!el) return; const n = (k + bannieres.length) % bannieres.length; el.scrollTo({ left: n * el.clientWidth, behavior: reduit ? "auto" : "smooth" }); setI(n); };
  useEffect(() => { if (reduit || pause || bannieres.length < 2) return; const t = setInterval(() => aller(i + 1), intervalle); return () => clearInterval(t); }, [i, pause, reduit, bannieres.length]);
  if (!bannieres.length) return null;
  const sombre = m.ambiance === "luxe_nuit";
  return (
    <div style={{ position: "relative" }} onTouchStart={() => setPause(true)}>
      <div ref={ref} onScroll={e => { const el = e.currentTarget; const n = Math.round(el.scrollLeft / el.clientWidth); if (n !== i) setI(n); }} style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", borderRadius: m.rayon + 4 }}>
        {bannieres.map(b => <div key={b.id} onClick={() => onAller?.(b)} style={{ flex: "0 0 100%", scrollSnapAlign: "start", height: hauteur, position: "relative", overflow: "hidden", cursor: b.destination ? "pointer" : "default", background: m.degrade }}>
          {b.image ? <img src={b.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : b.illustration && <div style={{ position: "absolute", right: -12, bottom: -12, opacity: 0.95 }}>{b.illustration}</div>}
          <div style={{ position: "absolute", inset: 0, background: b.image ? "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.05))" : "none" }} />
          <div style={{ position: "relative", padding: "20px 18px", maxWidth: "64%", color: "#fff" }}>
            <div style={{ fontFamily: m.serif, fontSize: 25, lineHeight: 1.08, fontWeight: 600, letterSpacing: 0.2 }}>{b.titre}</div>
            {b.texte && <div style={{ fontFamily: m.sans, fontSize: 13, marginTop: 7, opacity: 0.9, lineHeight: 1.35 }}>{b.texte}</div>}
            {b.cta && <span style={{ display: "inline-block", marginTop: 14, padding: "9px 16px", borderRadius: 999, background: sombre ? m.accent : "rgba(255,255,255,0.94)", color: sombre ? m.accentTexte : m.principale, fontFamily: m.sans, fontWeight: 700, fontSize: 13 }}>{b.cta}</span>}
          </div>
        </div>)}
      </div>
      {bannieres.length > 1 && <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        {bannieres.map((_, k) => <button key={k} aria-label={`Bannière ${k + 1}`} onClick={() => { setPause(true); aller(k); }} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 9, border: "none", padding: 0, background: k === i ? "#fff" : "rgba(255,255,255,0.5)", transition: reduit ? "none" : "width .3s" }} />)}
        <button aria-label={pause ? "Lecture" : "Pause"} onClick={() => setPause(p => !p)} style={{ marginLeft: 6, width: 22, height: 22, borderRadius: 99, border: "none", background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 10 }}>{pause || reduit ? "▶" : "⏸"}</button>
      </div>}
    </div>
  );
}

export const Surface = ({ m, children, style, onClick }: { m: Marque; children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) =>
  <div onClick={onClick} style={{ background: m.surface, border: `1px solid ${m.ligne}`, borderRadius: m.rayon, boxShadow: m.ombre, padding: 16, cursor: onClick ? "pointer" : undefined, ...style }}>{children}</div>;

export const Bouton = ({ m, children, onClick, variante = "plein", disabled, style }: { m: Marque; children: React.ReactNode; onClick?: () => void; variante?: "plein" | "contour" | "discret"; disabled?: boolean; style?: React.CSSProperties }) => {
  const sombre = m.ambiance === "luxe_nuit";
  const base: React.CSSProperties = { minHeight: 44, padding: "10px 18px", borderRadius: 999, fontFamily: m.sans, fontWeight: 700, fontSize: 14, letterSpacing: 0.2, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "transform .15s, box-shadow .15s" };
  const v = variante === "plein" ? { background: sombre ? `linear-gradient(135deg, ${m.accent}, ${m.accent}d0)` : m.principale, color: sombre ? m.accentTexte : "#fff", border: "none" }
    : variante === "contour" ? { background: "transparent", color: m.texte, border: `1px solid ${m.ligne}` } : { background: "transparent", color: m.accent, border: "none" };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...v, ...style }}>{children}</button>;
};

export const Titre = ({ m, children, sur, niveau = 2 }: { m: Marque; children: React.ReactNode; sur?: string; niveau?: 1 | 2 | 3 }) =>
  <div style={{ margin: "4px 0 10px" }}>{sur && <div style={{ fontFamily: m.sans, fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase", color: m.accent, fontWeight: 700 }}>{sur}</div>}
    <div style={{ fontFamily: m.serif, fontSize: niveau === 1 ? 32 : niveau === 2 ? 24 : 19, fontWeight: 600, lineHeight: 1.12, color: m.texte }}>{children}</div></div>;

export const Indicateur = ({ m, libelle, valeur, detail, tendance, onClick }: { m: Marque; libelle: string; valeur: string; detail?: string; tendance?: "haut" | "bas" | null; onClick?: () => void }) =>
  <Surface m={m} onClick={onClick} style={{ padding: 14 }}>
    <div style={{ fontFamily: m.sans, fontSize: 11.5, color: m.doux, letterSpacing: 0.3 }}>{libelle}</div>
    <div style={{ fontFamily: m.serif, fontSize: 26, fontWeight: 600, color: m.texte, marginTop: 2, lineHeight: 1.1 }}>{valeur}</div>
    {detail && <div style={{ fontFamily: m.sans, fontSize: 11.5, marginTop: 4, color: tendance === "haut" ? "#3f8f5f" : tendance === "bas" ? "#b4523f" : m.doux }}>{detail}</div>}
  </Surface>;

export const Puce = ({ m, children, ton = "neutre" }: { m: Marque; children: React.ReactNode; ton?: "neutre" | "ok" | "alerte" | "accent" }) => {
  const c = ton === "ok" ? "#3f8f5f" : ton === "alerte" ? "#c0703a" : ton === "accent" ? m.accent : m.doux;
  return <span style={{ display: "inline-flex", alignItems: "center", fontFamily: m.sans, fontSize: 11, fontWeight: 700, color: c, border: `1px solid ${c}55`, background: `${c}14`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>;
};

export const LogoMarque = ({ m, taille = 40 }: { m: Marque; taille?: number }) => m.logo
  ? <img src={m.logo} alt={m.nom} style={{ width: taille, height: taille, borderRadius: m.ambiance === "luxe_clair" && m.code === "ODYSSEE" ? 4 : 99, objectFit: "cover", border: `1px solid ${m.ligne}`, flex: "none" }} />
  : <div style={{ width: taille, height: taille, borderRadius: 99, flex: "none", display: "grid", placeItems: "center", background: m.degrade, color: "#fff", fontFamily: m.serif, fontSize: taille * 0.4, fontWeight: 700 }}>{m.monogramme}</div>;
