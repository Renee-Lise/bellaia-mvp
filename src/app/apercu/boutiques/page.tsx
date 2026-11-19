"use client";
// Aperçu des boutiques refondues — PRÉVISUALISATION uniquement (désactivé en production).
import { useEffect, useState } from "react";
import BoutiqueVitrine from "../../../modules/boutiques/BoutiqueVitrine";
const UNIVERS: [string, string][] = [["BSH", "Bella'Secret Home"], ["FOOD", "Bella'Food"], ["EVENTS", "Bella'Even's"], ["ODYSSEE", "Bella'Odyssée"]];
export default function ApercuBoutiques() {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => setU(new URLSearchParams(location.search).get("u") || "BSH"), []);
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  if (!u) return null;
  return <div>
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 10px", background: "#111", position: "relative", zIndex: 40 }}>
      {UNIVERS.map(([k, l]) => <a key={k} href={`?u=${k}`} style={{ flex: "none", padding: "6px 11px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: "system-ui", textDecoration: "none", color: u === k ? "#111" : "#eee", background: u === k ? "#c6a15b" : "#222" }}>{l}</a>)}
      <span style={{ flex: "none", alignSelf: "center", fontSize: 11, color: "#f0a35e", fontFamily: "system-ui" }}>Aperçu — non publié</span>
    </div>
    <BoutiqueVitrine key={u} univers={u} />
  </div>;
}
