// ═══════════════════════════════════════════════════════════
// Identité visuelle — logo principal Bellaïa (migration 0076)
// src/modules/identite/IdentiteVisuelleF.tsx
//
// Réservé à la fondatrice par RLS (is_fondatrice() sur le bucket
// storage et sur bellaia_identite_visuelle) — ce module n'ajoute pas
// sa propre vérification de rôle, il affiche simplement ce que les
// policies autorisent : une assistante qui ouvrirait cet onglet
// verrait les actions échouer côté serveur plutôt que de pouvoir
// réellement changer le logo.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import {
  getLogoActif, getHistoriqueLogos, importerLogo, activerVersionLogo, annulerVersionLogo,
} from "./identiteApi";
import type { VersionLogo } from "./identiteApi";

const C = {
  night: "#0b0709", card: "rgba(255,255,255,0.04)", line: "rgba(198,161,91,0.18)",
  gold: "#c6a15b", goldL: "#e0c17e", cream: "#f1e7e2", muted: "#cbb9b9",
};
const SA = "'Inter',system-ui,sans-serif";
const btnP: React.CSSProperties = { background: `linear-gradient(135deg,${C.gold},${C.goldL})`, border: "none", borderRadius: 9, padding: "9px 14px", color: "#1a1428", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: SA };
const btnS: React.CSSProperties = { background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 12px", color: C.muted, cursor: "pointer", fontSize: 11, fontFamily: SA };
const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" };

export default function IdentiteVisuelleF() {
  const [actif, setActif] = useState<VersionLogo | null>(null);
  const [historique, setHistorique] = useState<VersionLogo[]>([]);
  const [chargement, setChargement] = useState(true);
  const [importEnCours, setImportEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const charger = async () => {
    setChargement(true);
    const [a, h] = await Promise.all([getLogoActif(), getHistoriqueLogos()]);
    setActif(a);
    setHistorique(h);
    setChargement(false);
  };
  useEffect(() => { charger(); }, []);

  const onFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErreur(null);
    setImportEnCours(true);
    const res = await importerLogo(file);
    setImportEnCours(false);
    if (!res.ok) { setErreur(res.error || "Échec de l'import."); return; }
    await charger();
  };

  const confirmer = async (v: VersionLogo) => {
    setActionEnCours(v.id);
    const res = await activerVersionLogo(v.id);
    setActionEnCours(null);
    if (!res.ok) { alert("Échec : " + res.error); return; }
    await charger();
  };

  const annuler = async (v: VersionLogo) => {
    if (!confirm("Supprimer cette version importée, non confirmée ?")) return;
    setActionEnCours(v.id);
    const res = await annulerVersionLogo(v);
    setActionEnCours(null);
    if (!res.ok) { alert("Échec : " + res.error); return; }
    await charger();
  };

  if (chargement) return <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 12 }}>Chargement…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: SA, color: C.cream }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.goldL }}>Identité visuelle — Logo Bellaïa</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
          Le logo utilisé sur l'écran de connexion, les en-têtes et la page d'accueil. Importez une nouvelle version, prévisualisez-la, puis confirmez pour la mettre en ligne — sans toucher au code. L'historique reste disponible pour restaurer une version précédente à tout moment.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Logo actuel</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={actif?.url || "/branding/bellaia-logo-400.webp"}
            alt="Logo Bellaïa actif"
            style={{ width: 90, height: 90, objectFit: "contain", borderRadius: "50%", flexShrink: 0 }}
          />
          <div style={{ fontSize: 11, color: C.muted }}>
            {actif ? <>Version active depuis le {new Date(actif.createdAt).toLocaleDateString("fr-FR")}.</> : <>Logo officiel par défaut (aucun remplacement importé pour l'instant).</>}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Importer une nouvelle version</div>
        <label style={{ ...btnP, display: "inline-block", opacity: importEnCours ? 0.6 : 1, cursor: importEnCours ? "wait" : "pointer" }}>
          {importEnCours ? "Import en cours…" : "Choisir un fichier (PNG, JPEG, WebP — 8 Mo max)"}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFichier} disabled={importEnCours} style={{ display: "none" }} />
        </label>
        {erreur && <div style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>⚠️ {erreur}</div>}
      </div>

      {historique.filter(v => !v.actif).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Historique des versions</div>
          {historique.filter(v => !v.actif).map(v => (
            <div key={v.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
              <img src={v.url} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, color: C.muted }}>
                Importée le {new Date(v.createdAt).toLocaleDateString("fr-FR")} à {new Date(v.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => confirmer(v)} disabled={actionEnCours === v.id} style={btnP}>
                  {actionEnCours === v.id ? "…" : "Confirmer / Restaurer"}
                </button>
                <button onClick={() => annuler(v)} disabled={actionEnCours === v.id} style={{ ...btnS, color: "#f87171" }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
