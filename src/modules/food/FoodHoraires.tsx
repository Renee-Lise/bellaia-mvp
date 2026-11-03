// ═══════════════════════════════════════════════════════════
// Horaires, jours fermés et quota — src/modules/food/FoodHoraires.tsx
// Tant que "actif" est décoché, /api/food/commandes/create n'applique
// aucune restriction (comportement par défaut, rien d'inventé).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { getHorairesConfig, sauvegarderHorairesConfig } from "./horairesApi";
import type { HorairesConfig } from "./horairesApi";

const SA = "system-ui, sans-serif";
const JOURS = [
  { id: 1, l: "Lundi" }, { id: 2, l: "Mardi" }, { id: 3, l: "Mercredi" }, { id: 4, l: "Jeudi" },
  { id: 5, l: "Vendredi" }, { id: 6, l: "Samedi" }, { id: 0, l: "Dimanche" },
];
const inpBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box",
};

export default function FoodHoraires() {
  const [config, setConfig] = useState<HorairesConfig>({ actif: false, joursFermes: [], commandesSuspendues: false });
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState<"idle"|"en_cours"|"ok"|"erreur">("idle");

  useEffect(() => {
    getHorairesConfig().then(c => { if (c) setConfig(c); setChargement(false); });
  }, []);

  const toggleJour = (id: number) => setConfig(c => ({
    ...c, joursFermes: c.joursFermes.includes(id) ? c.joursFermes.filter(j => j !== id) : [...c.joursFermes, id],
  }));

  const enregistrer = async () => {
    setSauvegarde("en_cours");
    const res = await sauvegarderHorairesConfig(config);
    setSauvegarde(res.ok ? "ok" : "erreur");
    if (res.ok) { setTimeout(() => setSauvegarde("idle"), 2500); getHorairesConfig().then(c => c && setConfig(c)); }
  };

  if (chargement) return <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chargement…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "#fff", fontFamily: SA }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
        Tant que c'est désactivé, les commandes en ligne sont acceptées à tout moment, tous les jours — rien n'est restreint par défaut. Une fois activé, toute commande hors jours/horaires/quota est refusée automatiquement, avant même d'arriver jusqu'à vous.
      </div>

      {/* Pause d'urgence — volontairement séparée du planning normal
          ci-dessous : elle bloque tout immédiatement, que les
          restrictions horaires soient activées ou non. */}
      <div style={{ background: config.commandesSuspendues ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${config.commandesSuspendues ? "#ef4444" : FC.line}`, borderRadius: 12, padding: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", color: config.commandesSuspendues ? "#f87171" : "#fff" }}>
          <input type="checkbox" checked={!!config.commandesSuspendues} onChange={e => setConfig(c => ({ ...c, commandesSuspendues: e.target.checked }))} />
          ⏸ Suspendre immédiatement les commandes en ligne
        </label>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
          Bloque toute nouvelle commande sur-le-champ, quels que soient les réglages ci-dessous — utile en cas d'imprévu (rupture, absence, surcharge). Pensez à la désactiver quand vous reprenez.
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        <input type="checkbox" checked={config.actif} onChange={e => setConfig(c => ({ ...c, actif: e.target.checked }))} />
        Activer le planning (jours fermés, horaires, quota)
      </label>

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, opacity: config.actif ? 1 : 0.5 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 10, letterSpacing: 1 }}>JOURS FERMÉS</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {JOURS.map(j => (
            <button key={j.id} disabled={!config.actif} onClick={() => toggleJour(j.id)}
              style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + (config.joursFermes.includes(j.id) ? "#ef4444" : "rgba(255,255,255,0.15)"),
                background: config.joursFermes.includes(j.id) ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                color: config.joursFermes.includes(j.id) ? "#f87171" : "rgba(255,255,255,0.6)",
                cursor: config.actif ? "pointer" : "not-allowed", fontSize: 11, fontWeight: 700, fontFamily: SA }}>
              {j.l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>S'applique à la date de livraison demandée.</div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, opacity: config.actif ? 1 : 0.5 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 10, letterSpacing: 1 }}>HORAIRES DE PRISE DE COMMANDE</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Heure de Guyane (America/Cayenne). Laissez vide pour ne pas restreindre. Pour une simple "heure limite" (ex. commandes jusqu'à midi), laissez Ouverture à 00:00 et mettez l'heure limite en Fermeture.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Ouverture</label>
            <input type="time" disabled={!config.actif} value={config.heureOuverture || ""} onChange={e => setConfig(c => ({ ...c, heureOuverture: e.target.value || null }))} style={inpBase} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Fermeture (= heure limite des commandes)</label>
            <input type="time" disabled={!config.actif} value={config.heureFermeture || ""} onChange={e => setConfig(c => ({ ...c, heureFermeture: e.target.value || null }))} style={inpBase} />
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, opacity: config.actif ? 1 : 0.5 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 10, letterSpacing: 1 }}>QUOTA QUOTIDIEN</div>
        <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Nombre maximum de commandes par date de livraison (laisser vide = illimité)</label>
        <input type="number" min={1} disabled={!config.actif} value={config.quotaCommandesJour ?? ""}
          onChange={e => setConfig(c => ({ ...c, quotaCommandesJour: e.target.value === "" ? null : parseInt(e.target.value, 10) }))}
          style={inpBase} />
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 10, letterSpacing: 1 }}>HEURE DE RETRAIT</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Informative uniquement — affichée à la cliente, ne bloque aucune commande.</div>
        <input type="time" value={config.heureRetrait || ""} onChange={e => setConfig(c => ({ ...c, heureRetrait: e.target.value || null }))} style={inpBase} />
      </div>

      <button onClick={enregistrer} disabled={sauvegarde === "en_cours"}
        style={{ padding: "11px", borderRadius: 10, border: "none", cursor: sauvegarde === "en_cours" ? "wait" : "pointer",
          fontSize: 12, fontWeight: 700, fontFamily: SA,
          background: sauvegarde === "ok" ? "rgba(21,128,61,0.3)" : `linear-gradient(135deg,${FC.vert},${FC.vertL})`, color: "#fff" }}>
        {sauvegarde === "en_cours" ? "Enregistrement…" : sauvegarde === "ok" ? "✓ Enregistré" : sauvegarde === "erreur" ? "Échec — réessayer" : "Enregistrer"}
      </button>
    </div>
  );
}
