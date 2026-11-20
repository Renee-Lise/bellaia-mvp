"use client";
// Diagnostic du flux Concorde Pro — fondatrice uniquement, lecture seule.
// Appelle /api/bsh/concorde/diagnostic : l'adresse d'export (jeton) reste
// côté serveur et n'est jamais affichée. Aucune image n'est enregistrée.
import React, { useState } from "react";
import { jeton } from "../events/eventsAtelierLib";
import ValidationPhotosBSH from "./ValidationPhotosBSH";

export default function DiagnosticConcorde({ couleur = "#c9a96e", doux = "rgba(241,236,224,0.65)" }: { couleur?: string; doux?: string }) {
  const [etat, setEtat] = useState<"" | "cours" | "fini">("");
  const [r, setR] = useState<any>(null);
  const [validation, setValidation] = useState(false);
  const lancer = async () => {
    setEtat("cours"); setR(null);
    try {
      const res = await fetch("/api/bsh/concorde/diagnostic", { headers: { Authorization: `Bearer ${await jeton()}` }, cache: "no-store" });
      setR(await res.json().catch(() => ({ ok: false, message: `Réponse illisible (HTTP ${res.status}).` })));
    } catch (e: any) { setR({ ok: false, message: String(e?.message || e) }); }
    setEtat("fini");
  };
  const ligne = (l: string, v: any) => <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "2px 0" }}><span style={{ color: doux }}>{l}</span><strong>{v}</strong></div>;
  const imgOk = r?.test_images ? r.test_images.filter((t: any) => t.depuis_bellaia?.http === 200).length : 0;
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={lancer} disabled={etat === "cours"} style={{ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${couleur}`, background: `${couleur}22`, color: couleur, fontWeight: 700, fontSize: 12 }}>
        {etat === "cours" ? "Analyse du flux…" : "🔎 Diagnostiquer le flux et les photos (lecture seule)"}
      </button>
      <button onClick={() => setValidation(v => !v)} style={{ minHeight: 40, padding: "8px 12px", marginLeft: 8, marginTop: 8, borderRadius: 10, border: `1px solid ${couleur}`, background: validation ? `${couleur}33` : "transparent", color: couleur, fontWeight: 700, fontSize: 12 }}>
        🖼 {validation ? "Fermer la validation des photos" : "Valider les photos produit par produit"}
      </button>
      {validation && <div style={{ marginTop: 10 }}><ValidationPhotosBSH /></div>}
      {r && <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5 }}>
        {!r.ok ? <div style={{ color: "#fb923c" }}>{r.error || r.message}</div> : <>
          {ligne("Format", r.format)}
          {ligne("Références dans le flux", r.references)}
          {ligne("Avec image principale", r.avec_image)}
          {ligne("Avec images secondaires", r.avec_images_secondaires)}
          {ligne("Avec stock / prix / code-barres", `${r.avec_stock} / ${r.avec_prix} / ${r.avec_ean}`)}
          {ligne("Produits BSH rapprochés", `${r.bsh.rapproches} / ${r.bsh.produits} (dont ${r.bsh.rapproches_avec_images} avec images)`)}
          {ligne("Images testées accessibles depuis Bellaïa", `${imgOk} / ${r.test_images.length}`)}
          <div style={{ color: doux, marginTop: 4 }}>{r.note}</div>
        </>}
      </div>}
    </div>
  );
}
